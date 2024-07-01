import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Button, List, Divider, Avatar, TextInput } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalStyles from './GlobalStyles';
import { colors, theme } from './theme';
import Requests from './Requests';

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [daysBefore, setDaysBefore] = useState('5');
  const displayName = Requests.displayName;

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      const savedNotificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      const savedDaysBefore = await AsyncStorage.getItem('daysBefore');

      if (savedNotificationsEnabled !== null) {
        setNotificationsEnabled(JSON.parse(savedNotificationsEnabled));
      }

      if (savedDaysBefore !== null) {
        setDaysBefore(savedDaysBefore);
      }
    };

    loadSettings();
  }, []);

  const toggleNotifications = async () => {
    setNotificationsEnabled(!notificationsEnabled);
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(!notificationsEnabled));
  };

  const handleDaysBeforeChange = async (days: string) => {
    setDaysBefore(days);
    await AsyncStorage.setItem('daysBefore', days);
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
              <TextInput
                mode="outlined"
                keyboardType="number-pad"
                value={daysBefore}
                onChangeText={handleDaysBeforeChange}
                style={GlobalStyles.input}
                theme={{ colors: { primary: colors.primary } }}
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

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
});

export default SettingsScreen;
