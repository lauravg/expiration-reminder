import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Button, Divider, Avatar, IconButton, List } from 'react-native-paper';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests, { BASE_URL } from './Requests';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SessionData } from './SessionData';
import { Household, HouseholdManager } from './HouseholdManager';


const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [daysBefore, setDaysBefore] = useState('5');
  const [notificationTime, setNotificationTime] = useState(new Date(0, 0, 0, 12, 0)); // Default to noon
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const sessionData = new SessionData();
  const requests = new Requests();
  const householdManager = new HouseholdManager(requests);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    notifications: true,
    locations: true,
    categories: true,
    households: true,
  });

  useEffect(() => {
    // Load saved settings from the database
    const loadSettings = async () => {
      if (!sessionData.idToken) return;

      try {
        const response = await requests.getNotificationSettings()
        setNotificationsEnabled(response.notificationsEnabled);
        setDaysBefore(response.daysBefore.toString());
        setNotificationTime(new Date(0, 0, 0, response.hour, response.minute));
      } catch (error) {
        console.error('Failed to load notification settings', error);
      }

      try {
        const response = await requests.getLocationsAndCategories();
        setLocations(response.locations);
        setCategories(response.categories);
      } catch (error) {
        console.error('Failed to load locations and categories', error);
      }

      setHouseholds(await householdManager.getHouseholds());
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

    // Logs an error, if one occurs.
    requests.saveNotificationSettings({
      notificationsEnabled: newStatus,
      daysBefore: parseInt(daysBefore, 10),
      hour: notificationTime.getHours(),
      minute: notificationTime.getMinutes(),
    });

    // TODO: What to do when request failed?
  };

  const handleDaysBeforeChange = async (value: string) => {
    setDaysBefore(value);

      // Logs an error, if one occurs.
      requests.saveNotificationSettings({
        notificationsEnabled,
        daysBefore: parseInt(value, 10),
        hour: notificationTime.getHours(),
        minute: notificationTime.getMinutes(),
      });
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setNotificationTime(selectedDate);

      // Logs an error, if one occurs.
      requests.saveNotificationSettings({
        notificationsEnabled,
        daysBefore: parseInt(daysBefore, 10),
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      });
    }
  };

  const handleAddLocation = async () => {
    if (newLocation.trim() === '') {
      Alert.alert('Error', 'Location cannot be empty');
      return;
    }

    try {
      const success = await requests.addLocation(newLocation)
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
  }

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
          <IconButton icon={collapsedSections.notifications ? "chevron-down" : "chevron-up"} size={20} iconColor={colors.primary} />
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
                  <RNPickerSelect
                    onValueChange={handleDaysBeforeChange}
                    value={daysBefore}
                    items={[
                      { label: '1', value: '1' },
                      { label: '2', value: '2' },
                      { label: '3', value: '3' },
                      { label: '4', value: '4' },
                      { label: '5', value: '5' },
                      { label: '6', value: '6' },
                      { label: '7', value: '7' },
                      { label: '2 Weeks', value: '14' },
                      { label: '1 month', value: '30' },
                    ]}
                    style={pickerSelectStyles}
                  />
                </View>
                <Divider />
                <View style={GlobalStyles.preference}>
                  <Text>Notification Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <Text>{notificationTime.getHours().toString().padStart(2, '0')}:{notificationTime.getMinutes().toString().padStart(2, '0')}</Text>
                  </TouchableOpacity>
                </View>
                {showTimePicker && (
                  <DateTimePicker
                    value={notificationTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </View>
        )}
      </View>

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
            <View>
              <PaperTextInput
                placeholder="Add new location"
                value={newLocation}
                onChangeText={setNewLocation}
                style={GlobalStyles.simpleInput}
                theme={{ colors: { primary: colors.primary } }}
              />
              <Button onPress={handleAddLocation}
                theme={{ colors: { primary: colors.primary } }}>
                Add Location
              </Button>
            </View>
          </View>
        )}
      </View>

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
            <View>
              <PaperTextInput
                placeholder="Add new category"
                value={newCategory}
                onChangeText={setNewCategory}
                style={GlobalStyles.simpleInput}
                theme={{ colors: { primary: colors.primary } }}

              />
              <Button
                onPress={handleAddCategory}
                theme={{ colors: { primary: colors.primary } }}>
                Add Category
              </Button>
            </View>
          </View>
        )}
      </View>

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

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    color: colors.onBackground,
    textAlign: 'center',
    paddingRight: 30,
    paddingLeft: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.onBackground,
    paddingRight: 30,
    paddingLeft: 30,
  },
});

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
});

export default SettingsScreen;
