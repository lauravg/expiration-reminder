import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, FlatList, StatusBar } from 'react-native';
import { Button, Avatar, IconButton, TextInput as PaperTextInput } from 'react-native-paper';
import { useNavigation, NavigationProp, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SessionData } from './SessionData';
import { Household, HouseholdManager } from './HouseholdManager';
import { scheduleDailyNotification } from './Notifications';
import * as Notifications from 'expo-notifications';

// Add a type definition for the route params
type SettingsScreenParams = {
  refresh?: boolean;
};

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const route = useRoute<RouteProp<Record<string, SettingsScreenParams>, string>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [daysBefore, setDaysBefore] = useState<string>('5'); // Default to '5'
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date()); // Notification time
  const [tempNotificationTime, setTempNotificationTime] = useState(notificationTime); // Temporary notification time
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const sessionData = new SessionData();
  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    notifications: true,
    locations: true,
    categories: true,
    households: true,
    subscription: true,
  });

  const [collapsedHouseholds, setCollapsedHouseholds] = useState<Record<string, boolean>>(() => {
    const initialCollapsed: Record<string, boolean> = {};
    households.forEach(household => {
      initialCollapsed[household.id] = true;
    });
    return initialCollapsed;
  });

  const settingsData = [
    {
      key: 'account',
      title: 'Account',
      icon: 'account',
      onPress: () => navigation.navigate({ name: 'Profile', params: {} }),
    },
    {
      key: 'shopping-list',
      title: 'Shopping List',
      icon: 'cart',
      onPress: () => navigation.navigate({ name: 'ShoppingList', params: {} }),
    },
    {
      key: 'used-products',
      title: 'Used Products',
      icon: 'check-circle',
      onPress: () => navigation.navigate({ name: 'UsedProducts', params: {} }),
    },
    {
      key: 'notifications',
      title: 'Notifications',
      icon: 'bell',
      onPress: () => toggleSection('notifications'),
      extra: (
        <IconButton
          icon={collapsedSections.notifications ? 'chevron-down' : 'chevron-up'}
          size={20}
          iconColor={colors.secondary}
        />
      ),
    },
    {
      key: 'locations',
      title: 'Product Locations',
      icon: 'map-marker',
      onPress: () => toggleSection('locations'),
      extra: (
        <IconButton
          icon={collapsedSections.locations ? 'chevron-down' : 'chevron-up'}
          size={20}
          iconColor={colors.secondary}
        />
      ),
    },
    {
      key: 'categories',
      title: 'Product Categories',
      icon: 'folder',
      onPress: () => toggleSection('categories'),
      extra: (
        <IconButton
          icon={collapsedSections.categories ? 'chevron-down' : 'chevron-up'}
          size={20}
          iconColor={colors.secondary}
        />
      ),
    },
    {
      key: 'households',
      title: 'Manage Households',
      icon: 'home',
      onPress: () => toggleSection('households'),
      extra: (
        <IconButton
          icon={collapsedSections.households ? 'chevron-down' : 'chevron-up'}
          size={20}
          iconColor={colors.secondary}
        />
      ),
    },
    {
      key: 'subscription',
      title: 'Subscription',
      icon: 'card-account-details',
      onPress: () => toggleSection('subscription'),
      extra: (
        <IconButton
          icon={collapsedSections.subscription ? 'chevron-down' : 'chevron-up'}
          size={20}
          iconColor={colors.secondary}
        />
      ),
    },
    {
      key: 'wasted-products',
      title: 'Wasted Products',
      icon: 'trash-can-outline',
      onPress: () => navigation.navigate({ name: 'WastedProducts', params: {} }),
    },
  ];

  const pickerItems = [
    { label: '1 Day', value: '1' },
    { label: '2 Days', value: '2' },
    { label: '3 Days', value: '3' },
    { label: '4 Days', value: '4' },
    { label: '5 Days', value: '5' },
    { label: '6 Days', value: '6' },
    { label: '1 Week', value: '7' },
    { label: '2 Weeks', value: '14' },
    { label: '1 Month', value: '30' },
  ];

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        const response = await requests.getNotificationSettings();
        setNotificationsEnabled(response.notificationsEnabled);
        setDaysBefore(response.daysBefore.toString());
        setNotificationTime(new Date(0, 0, 0, response.hour, response.minute));
      } catch (error) {
        Alert.alert('Error', 'Failed to load notification settings.');
        console.error('Failed to load notification settings', error);
      }

      try {
        const activeHouseholdId = await householdManager.getActiveHouseholdId();
        const householdsList = await householdManager.getHouseholds();
        const activeHousehold = await householdManager.getActiveHouseholdId();
        const householdsWithActive = householdsList.map(h => ({
          ...h,
          active: h.id === activeHousehold
        }));
        setHouseholds(householdsWithActive);

        if (activeHouseholdId) {
          const response = await requests.getLocationsAndCategories(activeHouseholdId);
          setLocations(response.locations || []);
          setCategories(response.categories || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadSettings();
  }, []);

  // Listen for navigation events with refresh parameter
  useEffect(() => {
    const refreshHouseholds = async () => {
      try {
        const householdsList = await householdManager.getHouseholds();
        const activeHousehold = await householdManager.getActiveHouseholdId();
        const householdsWithActive = householdsList.map(h => ({
          ...h,
          active: h.id === activeHousehold
        }));
        setHouseholds(householdsWithActive);
      } catch (error) {
        console.error("Error refreshing households:", error);
      }
    };

    if (route.params?.refresh) {
      refreshHouseholds();
      // Reset the parameter to avoid unnecessary refreshes
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  useEffect(() => {
    // Update collapsed state when households change
    setCollapsedHouseholds(prev => {
      const updated: Record<string, boolean> = { ...prev };
      households.forEach(household => {
        if (!(household.id in updated)) {
          updated[household.id] = true; // New households start collapsed
        }
      });
      return updated;
    });
  }, [households]);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleNotifications = async () => {
    const newStatus = !notificationsEnabled;
    setNotificationsEnabled(newStatus);

    const success = await requests.saveNotificationSettings({
      notificationsEnabled: newStatus,
      daysBefore: parseInt(daysBefore, 10),
      hour: notificationTime.getHours(),
      minute: notificationTime.getMinutes(),
    });

    if (success) {
      if (newStatus) {
        // Only schedule notifications if they are enabled
        await handleNotificationSchedule(true);
      } else {
        // Cancel notifications if they are disabled
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    }
  };
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const handleDaysBeforeChange = debounce(async (value: string | null) => {
    if (!value) return;
    setDaysBefore(value);

    try {
      const success = await requests.saveNotificationSettings({
        notificationsEnabled,
        daysBefore: parseInt(value, 10),
        hour: notificationTime.getHours(),
        minute: notificationTime.getMinutes(),
      });

      if (success) {
        console.log('Notification settings saved, scheduling notification...');
        await scheduleDailyNotification(sessionData.idToken, requests, householdManager);
      }
    } catch (error) {
      console.error('Failed to save notification settings or schedule notifications', error);
    }
  }, 500); // Adjust the debounce delay as needed

  let isScheduling = false;

  const handleNotificationSchedule = async (success: boolean) => {
    if (isScheduling) return;
    isScheduling = true;
    try {
      console.log('Attempting to schedule notification...');
      await scheduleDailyNotification(sessionData.idToken, requests, householdManager);
      console.log('Notification scheduled successfully.');
    } catch (error) {
      console.error('Failed to schedule notification', error);
    } finally {
      isScheduling = false;
    }
  };

  const handleTimeChange = async (_event: any, selectedDate?: Date) => {
    if (!selectedDate) return;

    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();

    // Update the temporary and main notification time
    setTempNotificationTime(selectedDate);
    setNotificationTime(selectedDate);

    // Save the updated time to the backend
    try {
      const success = await requests.saveNotificationSettings({
        notificationsEnabled,
        daysBefore: parseInt(daysBefore, 10),
        hour,
        minute,
      });
      await handleNotificationSchedule(success);
    } catch (error) {
      console.error('Failed to save notification time', error);
      Alert.alert('Error', 'Failed to save notification time.');
    }
  };

  const handleAddLocation = async () => {
    if (newLocation.trim() === '') {
      Alert.alert('Error', 'Location cannot be empty');
      return;
    }

    try {
      const activeHouseholdId = await householdManager.getActiveHouseholdId();
      if (!activeHouseholdId) {
        Alert.alert('Error', 'No active household');
        return;
      }

      const success = await requests.addLocation(newLocation, activeHouseholdId);
      if (success) {
        setLocations([...locations, newLocation]);
        setNewLocation('');
      }
    } catch (error) {
      console.error('Failed to add location', error);
    }
  };

  const handleDeleteLocation = async (locationToDelete: string) => {
    try {
      const activeHouseholdId = await householdManager.getActiveHouseholdId();
      if (!activeHouseholdId) {
        Alert.alert('Error', 'No active household');
        return;
      }

      const success = await requests.deleteLocation(locationToDelete, activeHouseholdId);
      if (success) {
        setLocations(locations.filter(location => location !== locationToDelete));
      }
    } catch (error) {
      console.error('Failed to delete location', error);
    }
  };

  const handleAddCategory = async () => {
    if (newCategory.trim() === '') {
      Alert.alert('Error', 'Category cannot be empty');
      return;
    }

    try {
      const activeHouseholdId = await householdManager.getActiveHouseholdId();
      if (!activeHouseholdId) {
        Alert.alert('Error', 'No active household');
        return;
      }

      const success = await requests.addCategory(newCategory, activeHouseholdId);
      if (success) {
        setCategories([...categories, newCategory]);
        setNewCategory('');
      }
    } catch (error) {
      console.error('Failed to add category', error);
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    try {
      const activeHouseholdId = await householdManager.getActiveHouseholdId();
      if (!activeHouseholdId) {
        Alert.alert('Error', 'No active household');
        return;
      }

      const success = await requests.deleteCategory(categoryToDelete, activeHouseholdId);
      if (success) {
        setCategories(categories.filter(category => category !== categoryToDelete));
      }
    } catch (error) {
      console.error('Failed to delete category', error);
    }
  };

  const handleActivateHousehold = async (id: string) => {
    try {
      // Set the new active household
      await householdManager.setActiveHousehold(id);

      // Update the households list to reflect the change
      const updatedHouseholds = households.map(household => ({
        ...household,
        active: household.id === id
      }));
      setHouseholds(updatedHouseholds);

      // Show success message
      Alert.alert(
        'Success',
        'Household activated successfully',
        [{ text: 'OK' }]
      );

      // Refresh locations and categories for the new active household
      const response = await requests.getLocationsAndCategories(id);
      setLocations(response.locations || []);
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to activate household:', error);
      Alert.alert(
        'Error',
        'Failed to activate household. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleHousehold = (id: string) => {
    setCollapsedHouseholds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteHousehold = async (household: Household) => {
    // Double check ownership before proceeding
    if (!household.owner) {
      Alert.alert('Error', 'Only the owner can delete a household');
      return;
    }

    Alert.alert(
      'Delete Household',
      `Are you sure you want to delete "${household.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await requests.deleteHousehold(household.id);
              if (success) {
                // Remove the household from the list
                setHouseholds(households.filter(h => h.id !== household.id));

                // If this was the active household, set another one as active
                if (household.active) {
                  const remainingHouseholds = households.filter(h => h.id !== household.id);
                  if (remainingHouseholds.length > 0) {
                    await householdManager.setActiveHousehold(remainingHouseholds[0].id);
                    // Update the active status of remaining households
                    setHouseholds(remainingHouseholds.map(h => ({
                      ...h,
                      active: h.id === remainingHouseholds[0].id
                    })));
                  }
                }

                Alert.alert('Success', 'Household deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete household');
              }
            } catch (error) {
              console.error('Error deleting household:', error);
              Alert.alert('Error', 'Failed to delete household');
            }
          }
        }
      ]
    );
  };

  // Function to handle inviting a user to a household
  const handleInviteUser = (householdId: string) => {
    Alert.prompt(
      'Invite to Household',
      'Enter the email address of the person you want to invite:',
      async (email) => {
        if (!email) return;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
          return;
        }

        try {
          // Display loading indicator
          Alert.alert('Sending Invitation', 'Please wait...');

          const result = await requests.inviteToHousehold(householdId, email);

          if (result.success) {
            if (result.email_sent) {
              Alert.alert(
                'Invitation Sent',
                `An invitation has been sent to ${email}. They'll need to accept it to join your household.`
              );
            } else {
              Alert.alert(
                'Invitation Created',
                `An invitation has been created for ${email}, but we couldn't send them an email. Please notify them manually.`
              );
            }
          } else {
            Alert.alert('Error', result.error || 'Failed to send invitation');
          }
        } catch (error) {
          console.error('Error inviting user:', error);
          Alert.alert('Error', 'An unexpected error occurred while sending the invitation');
        }
      },
      'plain-text'
    );
  };

  useEffect(() => {
    // Check for pending invitations whenever the settings screen is viewed
    const checkPendingInvitations = async () => {
      try {
        const pendingInvitations = await requests.getPendingInvitations();
        if (pendingInvitations.length > 0) {
          // Show alert for each pending invitation
          pendingInvitations.forEach(invitation => {
            Alert.alert(
              'Household Invitation',
              `You've been invited to join "${invitation.household_name}" by ${invitation.inviter_name}`,
              [
                { text: 'Decline', style: 'cancel', onPress: () => handleRejectInvitation(invitation.id) },
                { text: 'Accept', onPress: () => handleAcceptInvitation(invitation.id) }
              ]
            );
          });
        }
      } catch (error) {
        console.error('Error checking pending invitations:', error);
      }
    };

    checkPendingInvitations();
  }, []);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const result = await requests.acceptInvitation(invitationId);
      if (result.success) {
        Alert.alert('Success', 'You have successfully joined the household!');

        // Refresh households list
        const householdsList = await householdManager.getHouseholds();
        setHouseholds(householdsList);
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const result = await requests.rejectInvitation(invitationId);
      if (result.success) {
        Alert.alert('Invitation Declined', 'You have declined the household invitation.');
      } else {
        Alert.alert('Error', result.error || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  // Add StatusBar effect
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      return () => {
        StatusBar.setBarStyle('light-content');
      };
    }, [])
  );

  return (
    <View style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      {/* Settings List */}
      <FlatList
        data={settingsData}
        style={styles.header}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View>
            {/* Section Header */}
            <TouchableOpacity style={styles.itemContainer} onPress={item.onPress}>
              <View style={styles.itemContent}>
                <Avatar.Icon size={36} icon={item.icon} style={styles.itemIcon} />
                <Text style={styles.itemTitle}>{item.title}</Text>
              </View>
              {/* Chevron or Additional Icon */}
              {item.extra || <IconButton icon="chevron-down" size={20} iconColor={colors.secondary} />}
            </TouchableOpacity>

            {/* Expandable Section for Notifications */}
            {item.key === 'notifications' && !collapsedSections.notifications && (
              <View style={styles.sectionContent}>
                <View style={GlobalStyles.preference}>
                  <Text>Enable Notifications</Text>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={toggleNotifications}
                    thumbColor={colors.textInverse}
                    trackColor={{ false: colors.secondary, true: colors.primaryLight }}
                  />
                </View>
                {notificationsEnabled && (
                  <>
                    <View style={GlobalStyles.preference}>
                      <Text>Days Before Expiration</Text>
                      <DropDownPicker
                        open={isPickerOpen}
                        value={daysBefore}
                        items={pickerItems}
                        setOpen={setIsPickerOpen}
                        setValue={(value) => setDaysBefore(value)}
                        onChangeValue={handleDaysBeforeChange}
                        style={GlobalStyles.dropdown}
                        textStyle={{ fontSize: 16 }}
                        containerStyle={GlobalStyles.dropdown}
                      />
                    </View>
                    <View style={GlobalStyles.preference}>
                      <Text>Notification Time</Text>
                      {showTimePicker ? (
                        <DateTimePicker
                          value={tempNotificationTime}
                          mode="time"
                          display="default"
                          onChange={handleTimeChange}
                        />
                      ) : (
                        <TouchableOpacity onPress={() => {
                          setTempNotificationTime(notificationTime);
                          setShowTimePicker(true);
                        }}>
                          <Text>
                            {notificationTime.getHours().toString().padStart(2, '0')}:
                            {notificationTime.getMinutes().toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Expandable Section for Locations */}
            {item.key === 'locations' && !collapsedSections.locations && (
              <View style={styles.sectionContent}>
                {locations.map((location) => (
                  <View key={location} style={styles.listItem}>
                    <Text>{location}</Text>
                    <Button
                      onPress={() => handleDeleteLocation(location)}
                      theme={{ colors: { primary: colors.primary } }}
                    >
                      Delete
                    </Button>
                  </View>
                ))}
                <PaperTextInput
                  placeholder="Add new location"
                  value={newLocation}
                  onChangeText={setNewLocation}
                  style={GlobalStyles.simpleInput}
                  theme={{ colors: { primary: colors.primary } }}
                />
                <Button onPress={handleAddLocation} theme={{ colors: { primary: colors.primary } }}>
                  Add Location
                </Button>
              </View>
            )}

            {/* Expandable Section for Categories */}
            {item.key === 'categories' && !collapsedSections.categories && (
              <View style={styles.sectionContent}>
                {categories.map((category) => (
                  <View key={category} style={styles.listItem}>
                    <Text>{category}</Text>
                    <Button
                      onPress={() => handleDeleteCategory(category)}
                      theme={{ colors: { primary: colors.primary } }}
                    >
                      Delete
                    </Button>
                  </View>
                ))}
                <PaperTextInput
                  placeholder="Add new category"
                  value={newCategory}
                  onChangeText={setNewCategory}
                  style={GlobalStyles.simpleInput}
                  theme={{ colors: { primary: colors.primary } }}
                />
                <Button onPress={handleAddCategory} theme={{ colors: { primary: colors.primary } }}>
                  Add Category
                </Button>
              </View>
            )}

            {/* Expandable Section for Households */}
            {item.key === 'households' && !collapsedSections.households && (
              <View style={styles.sectionContent}>
                <Button
                  mode="contained"
                  onPress={() => {
                    Alert.prompt(
                      'Create New Household',
                      'Enter a name for your new household:',
                      async (name) => {
                        if (name) {
                          try {
                            const success = await requests.createHousehold(name);
                            if (success) {
                              // Refresh households list
                              const householdsList = await householdManager.getHouseholds();
                              setHouseholds(householdsList);
                              Alert.alert('Success', 'Household created successfully!');
                            } else {
                              Alert.alert('Error', 'Failed to create household');
                            }
                          } catch (error) {
                            console.error('Error creating household:', error);
                            Alert.alert('Error', 'Failed to create household');
                          }
                        }
                      }
                    );
                  }}
                  style={styles.createHouseholdButton}
                  theme={{ colors: { primary: colors.primary } }}
                >
                  Create New Household
                </Button>
                {households.map((household) => (
                  <View key={household.id} style={styles.householdCard}>
                    <View style={styles.householdHeader}>
                      <TouchableOpacity
                        style={styles.householdTitleContainer}
                        onPress={() => toggleHousehold(household.id)}
                      >
                        <Text style={styles.householdName}>{household.name}</Text>
                        {household.active && (
                          <View style={styles.activeHouseholdBadge}>
                            <Text style={styles.activeHouseholdText}>Active</Text>
                          </View>
                        )}
                        <IconButton
                          icon={collapsedHouseholds[household.id] ? 'chevron-down' : 'chevron-up'}
                          size={16}
                          iconColor={colors.secondary}
                          style={styles.collapseIcon}
                        />
                      </TouchableOpacity>
                    </View>

                    {!collapsedHouseholds[household.id] && (
                      <>
                        <View style={styles.divider} />

                        <View style={styles.participantsContainer}>
                          <View style={styles.participantsHeaderRow}>
                            <IconButton
                              icon="account-group"
                              size={16}
                              iconColor={colors.primary}
                              style={styles.participantsIcon}
                            />
                            <Text style={styles.participantsLabel}>Household Members</Text>
                          </View>

                          <View style={styles.participantsList}>
                            {household.participant_emails.map((email, index) => {
                              // Use display name if available, otherwise use email
                              const displayName = household.display_names[index] || email;

                              // Only show email separately if it's different from the display name
                              const showEmail = displayName !== email;

                              return (
                                <View key={index} style={styles.participantRow}>
                                  <IconButton
                                    icon="account"
                                    size={14}
                                    iconColor={household.owner && index === 0 ? colors.primary : colors.textSecondary}
                                    style={styles.participantIcon}
                                  />
                                  <View style={styles.participantInfo}>
                                    <Text style={[
                                      styles.participantName,
                                      household.owner && index === 0 && styles.ownerName
                                    ]}>
                                      {displayName}
                                      {household.owner && index === 0 && ' (Owner)'}
                                    </Text>
                                    {showEmail && (
                                      <Text style={styles.participantEmail}>{email}</Text>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          <View style={styles.householdActions}>
                            {household.owner && !household.active && (
                              <Button
                                mode="outlined"
                                onPress={() => handleDeleteHousehold(household)}
                                theme={{ colors: { primary: colors.error } }}
                                style={styles.deleteButton}
                                labelStyle={styles.deleteButtonLabel}
                              >
                                Delete
                              </Button>
                            )}
                            <Button
                              mode={household.active ? "outlined" : "contained"}
                              onPress={() => handleActivateHousehold(household.id)}
                              theme={{ colors: { primary: colors.primary } }}
                              style={styles.activateButton}
                              labelStyle={styles.activateButtonLabel}
                              disabled={household.active}
                            >
                              {household.active ? "Current" : "Activate"}
                            </Button>
                            <Button
                              mode="outlined"
                              onPress={() => handleInviteUser(household.id)}
                              theme={{ colors: { primary: colors.primary } }}
                              style={styles.inviteButton}
                              labelStyle={styles.inviteButtonLabel}
                              icon="account-plus"
                            >
                              Invite
                            </Button>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Expandable Section for Subscription */}
            {item.key === 'subscription' && !collapsedSections.subscription && (
              <View style={styles.sectionContent}>
                <Text style={styles.subscriptionText}>You are currently on a Free Plan.</Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate({ name: 'SubscriptionScreen', params: { }})}
                  theme={{ colors: { primary: colors.primary } }}
                  style={styles.subscriptionButton}
                >
                  Upgrade Plan
                </Button>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  section: {
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  textButtonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  timePicker: {
    alignSelf: 'flex-end',
  },
  textButton: {
    fontSize: 14,
    color: colors.primary,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.input,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    backgroundColor: colors.primary,
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  header: {
    marginTop: 20,
  },
  subscriptionText: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 10,
  },
  subscriptionButton: {
    marginTop: 10,
  },
  householdCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    padding: 0,
    shadowColor: colors.card.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  householdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  householdTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  householdName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginRight: 8,
  },
  activeHouseholdBadge: {
    backgroundColor: colors.success + '20', // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  activeHouseholdText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  activateButton: {
    minWidth: 80,
    marginRight: 10,
  },
  activateButtonLabel: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
  participantsContainer: {
    padding: 16,
  },
  participantsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantsIcon: {
    margin: 0,
    padding: 0,
    marginRight: -4,
  },
  participantsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  participantsList: {
    marginLeft: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  participantIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
    marginTop: 2,
  },
  participantInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  participantEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  ownerName: {
    color: colors.primary,
    fontWeight: '700',
  },
  collapseIcon: {
    margin: 0,
    padding: 0,
  },
  createHouseholdButton: {
    marginBottom: 16,
  },
  householdActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  deleteButton: {
    borderColor: colors.error,
    marginRight: 10,
    minWidth: 80,
  },
  deleteButtonLabel: {
    color: colors.error,
    fontSize: 12,
  },
  inviteButton: {
    minWidth: 80,
    borderColor: colors.primary,
  },
  inviteButtonLabel: {
    fontSize: 12,
    color: colors.primary,
  },
});

export default SettingsScreen;