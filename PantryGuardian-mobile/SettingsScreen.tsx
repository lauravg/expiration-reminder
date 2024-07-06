import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Button, List, Divider, Avatar } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import Requests from './Requests';
import axios from 'axios';
import RNPickerSelect from 'react-native-picker-select';

const BASE_URL = "http://127.0.0.1:8081";

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [daysBefore, setDaysBefore] = useState('5');
  const displayName = Requests.displayName;

  useEffect(() => {
    // Load saved settings from the database
    const loadSettings = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/get_notification_settings`, {
          headers: { 'idToken': Requests.idToken }
        });
        if (response.status === 200) {
          setNotificationsEnabled(response.data.notificationsEnabled);
          setDaysBefore(response.data.daysBefore.toString());
        }
      } catch (error) {
        console.error('Failed to load notification settings', error);
      }
    };

    loadSettings();
  }, []);

  const toggleNotifications = async () => {
    const newStatus = !notificationsEnabled;
    setNotificationsEnabled(newStatus);

    try {
      await axios.post(`${BASE_URL}/save_notification_settings`, {
        notificationsEnabled: newStatus,
        daysBefore: parseInt(daysBefore, 10)
      }, {
        headers: { 'idToken': Requests.idToken }
      });
    } catch (error) {
      console.error('Failed to save notification settings', error);
    }
  };

  const handleDaysBeforeChange = async (value: string) => {
    setDaysBefore(value);

    try {
      await axios.post(`${BASE_URL}/save_notification_settings`, {
        notificationsEnabled,
        daysBefore: parseInt(value, 10)
      }, {
        headers: { 'idToken': Requests.idToken }
      });
    } catch (error) {
      console.error('Failed to save notification settings', error);
    }
  };

  return (
    <View style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      <View style={[GlobalStyles.content, styles.settingsContainer]}>
        <List.Section>
          <TouchableOpacity onPress={() => navigation.navigate({ name: 'Profile', params: {} })}>
            <View style={GlobalStyles.accountContainer}>
              <Avatar.Icon size={48} icon="account" theme={{ colors: { primary: colors.primary } }} />
              <View style={GlobalStyles.accountInfo}>
                <Text style={GlobalStyles.accountText}>{displayName}</Text>
                <Text style={GlobalStyles.accountEmail}>Email TBD</Text>
              </View>
            </View>
          </TouchableOpacity>
        </List.Section>

        <List.Section>
          <List.Subheader style={GlobalStyles.sectionHeader}>Preferences</List.Subheader>
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
                  { label: '14', value: '14' },
                  { label: '30', value: '30' },
                ]}
                style={pickerSelectStyles}
              />
            </View>
          )}
        </List.Section>

        <Button
          mode="contained"
          theme={{ colors: { primary: colors.primary } }}
          style={GlobalStyles.button}
          onPress={() => navigation.navigate({ name: 'Login', params: {} })}
        >
          Log Out
        </Button>
      </View>
    </View>
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
});

export default SettingsScreen;
