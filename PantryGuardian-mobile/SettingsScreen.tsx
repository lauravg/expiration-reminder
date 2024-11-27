import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Button, Divider, Avatar, IconButton, TextInput as PaperTextInput } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SessionData } from './SessionData';
import { Household, HouseholdManager } from './HouseholdManager';
import { scheduleDailyNotification } from './Notifications';
import * as Notifications from 'expo-notifications';

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
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
  });

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
        const response = await requests.getLocationsAndCategories();
        setLocations(response.locations);
        setCategories(response.categories);
      } catch (error) {
        Alert.alert('Error', 'Failed to load locations and categories.');
        console.error('Failed to load locations and categories', error);
      }

      try {
        setHouseholds(await householdManager.getHouseholds());
      } catch (error) {
        Alert.alert('Error', 'Failed to load households.');
        console.error('Failed to load households', error);
      }
    };

    loadSettings();
  }, []);

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
      const success = await requests.addLocation(newLocation);
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
      const success = await requests.deleteLocation(locationToDelete);
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
      const success = await requests.addCategory(newCategory);
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
      const success = await requests.deleteCategory(categoryToDelete);
      if (success) {
        setCategories(categories.filter(category => category !== categoryToDelete));
      }
    } catch (error) {
      console.error('Failed to delete category', error);
    }
  };

  const handleActivateHousehold = async (id: string) => {
    householdManager.setActiveHousehold(id);
  };

  return (
    <ScrollView style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.sectionHeader]}>Account</Text>
        <TouchableOpacity onPress={() => navigation.navigate({ name: 'Profile', params: {} })}>
          <View style={GlobalStyles.accountContainer}>
            <Avatar.Icon size={48} icon="account" theme={{ colors: { primary: colors.primary } }} />
            <View style={GlobalStyles.accountInfo}>
              <Text style={GlobalStyles.accountText}>{sessionData.userDisplayName}</Text>
              <Text style={GlobalStyles.accountEmail}>{sessionData.userEmail}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <TouchableOpacity onPress={() => toggleSection('notifications')} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <IconButton
            icon={collapsedSections.notifications ? "chevron-down" : "chevron-up"}
            size={20}
            iconColor={colors.primary}
          />
        </TouchableOpacity>
        {!collapsedSections.notifications && (
          <View style={styles.sectionContent}>
            <View style={GlobalStyles.preference}>
              <Text>Enable Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                thumbColor={colors.onPrimary}
                trackColor={{ false: colors.secondary, true: colors.primaryLight }}
              />
            </View>
            <Divider />
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
                <Divider />
                <View style={GlobalStyles.preference}>
                  <Text>Notification Time</Text>
                  {showTimePicker ? (
                    <View>
                      <DateTimePicker
                        value={tempNotificationTime}
                        mode="time"
                        display="default"
                        onChange={handleTimeChange}
                      />
                      <View style={styles.textButtonContainer}>
                        <Button
                          onPress={async () => {
                            setNotificationTime(tempNotificationTime); // Save the selected time
                            setShowTimePicker(false); // Close the picker

                            // Save the updated time to the backend
                            const success = await requests.saveNotificationSettings({
                              notificationsEnabled,
                              daysBefore: parseInt(daysBefore, 10),
                              hour: notificationTime.getHours(),
                              minute: notificationTime.getMinutes(),
                            });
                            await handleNotificationSchedule(success);

                          }}
                        >
                          <Text style={styles.textButton}>Save</Text>
                        </Button>
                        <Button
                          onPress={() => setShowTimePicker(false)}
                          theme={{ colors: { primary: colors.primary } }}
                        >
                          Cancel
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setShowTimePicker(true)}>
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
      </View>

      {/* Locations Section */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => toggleSection('locations')} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manage Locations</Text>
          <IconButton icon={collapsedSections.locations ? "chevron-down" : "chevron-up"} size={20} iconColor={colors.primary} />
        </TouchableOpacity>
        {!collapsedSections.locations && (
          <View style={styles.sectionContent}>
            {locations.map(location => (
              <View key={location} style={styles.listItem}>
                <Text>{location}</Text>
                <Button
                  onPress={() => handleDeleteLocation(location)}
                  theme={{ colors: { primary: colors.primary } }}>
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
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => toggleSection('categories')} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manage Categories</Text>
          <IconButton icon={collapsedSections.categories ? "chevron-down" : "chevron-up"} size={20} iconColor={colors.primary} />
        </TouchableOpacity>
        {!collapsedSections.categories && (
          <View style={styles.sectionContent}>
            {categories.map(category => (
              <View key={category} style={styles.listItem}>
                <Text>{category}</Text>
                <Button
                  onPress={() => handleDeleteCategory(category)}
                  theme={{ colors: { primary: colors.primary } }}>
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
      </View>

      {/* Households Section */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => toggleSection('households')} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manage Households</Text>
          <IconButton icon={collapsedSections.households ? "chevron-down" : "chevron-up"} size={20} iconColor={colors.primary} />
        </TouchableOpacity>
        {!collapsedSections.households && (
          <View style={styles.sectionContent}>
            {households.map(household => (
              <View key={household.id} style={styles.listItem}>
                <Text>{household.name}</Text>
                <Button
                  onPress={() => handleActivateHousehold(household.id)}
                  theme={{ colors: { primary: colors.primary } }}>
                  Activate
                </Button>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
    alignItems: 'center',
    paddingVertical: 10,
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
});

export default SettingsScreen;