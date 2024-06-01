import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Button, List, Divider, Avatar } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import GlobalStyles from './GlobalStyles';
import { colors, theme } from './theme';

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [somethingElse, setDarkMode] = useState(false);

  const toggleNotifications = () => setNotificationsEnabled(!notificationsEnabled);
  const toggleDarkMode = () => setDarkMode(!somethingElse);

  return (
    <View style={GlobalStyles.containerWithHeader}>
      <View style={styles.settingsContainer}>
        <List.Section>
          <TouchableOpacity onPress={() => navigation.navigate({ name: 'AccountDetails', params: {} })}>
            <View style={GlobalStyles.accountContainer}>
              <Avatar.Icon size={48} icon="account"         theme={{ colors: { primary: colors.primary } }} />
              <View style={GlobalStyles.accountInfo}>
                <Text style={GlobalStyles.accountText}>Laura Greiner</Text>
                <Text style={GlobalStyles.accountEmail}>lauravgreiner@gmail.com</Text>
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
          <View style={GlobalStyles.preference}>
            <Text>Something Else</Text>
            <Switch
              value={somethingElse}
              onValueChange={toggleDarkMode}
              thumbColor={colors.onPrimary}
              trackColor={{ false: colors.secondary, true: colors.primaryLight }}
            />
          </View>
        </List.Section>
      </View>

      <Button
        mode="contained"
        theme={{ colors: { primary: colors.primary } }}
        style={[GlobalStyles.button, styles.button]}
        onPress={() => navigation.navigate({ name: 'Login', params: {} })}
      >
        Log Out
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
  },
  button: {
    marginBottom: 20,
  },
});

export default SettingsScreen;
