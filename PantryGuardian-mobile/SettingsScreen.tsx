import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Button, TextInput as PaperTextInput, List, Divider } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors, theme } from './theme';

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleNotifications = () => setNotificationsEnabled(!notificationsEnabled);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <View style={GlobalStyles.container}>
      <List.Section>
        <List.Subheader style={styles.sectionHeader}>Preferences</List.Subheader>
        <View style={styles.preference}>
          <Text>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            thumbColor={notificationsEnabled ? colors.primary : '#f4f3f4'}
            trackColor={{ false: '#767577', true: colors.primaryLight }}
          />
        </View>
        <Divider />
        <View style={styles.preference}>
          <Text>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            thumbColor={darkMode ? colors.primary : '#f4f3f4'}
            trackColor={{ false: '#767577', true: colors.primaryLight }}
          />
        </View>
      </List.Section>

      <List.Section>
        <List.Subheader style={styles.sectionHeader}>Account</List.Subheader>
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Email"
          value="lauravgreiner@gmail.com"
          disabled
        />
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Username"
          value="LauraGreiner"
          disabled
        />
      </List.Section>

      <Button
        mode="contained"
        theme={{ colors: { primary: colors.primary } }}
        style={GlobalStyles.button}
        onPress={() => navigation.navigate({name: 'Login', params: {}})}
      >
        Log Out
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    ...GlobalStyles.sectionHeader,
    color: colors.primary,
  },
  preference: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

export default SettingsScreen;
