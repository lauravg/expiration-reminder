import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { TextInput as PaperTextInput, Button, IconButton, Avatar, TextInput } from 'react-native-paper';
import { colors } from './theme';
import * as ImagePicker from 'expo-image-picker';
import { SessionData } from './SessionData';
import Requests from './Requests';
import { useNavigation, NavigationProp } from '@react-navigation/native';

const ProfileScreen = () => {
  const sessionData = new SessionData();
  const [profileImage, setProfileImage] = useState<string | null>(sessionData.userPhotoUrl || null);
  const [displayName, setDisplayName] = useState(sessionData.userDisplayName);
  const [email, setEmail] = useState(sessionData.userEmail);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  type RootStackParamList = {
    Profile: undefined;
    Login: undefined;
    Settings: { refresh?: boolean } | undefined;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      setProfileImage(selectedImage);
      sessionData.setUserPhotoUrl(selectedImage); // Save to session
    }
  };

  const handleSave = async () => {
    try {
      const requests = new Requests();
      
      // Update display name in the database
      const success = await requests.updateProfile(displayName);
      
      if (success) {
        // Update local session data
        sessionData.setUserDisplayName(displayName);
        sessionData.setUserEmail(email);
        
        Alert.alert('Success', 'Profile updated successfully!');
        
        // Go back with a refresh parameter to trigger household list refresh
        navigation.navigate({
          name: 'Settings',
          params: { refresh: true },
          merge: true,
        });
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred while updating your profile.');
    }
  };

  const handleChangePassword = async () => {
    //TBD

  };

  const handleLogout = async () => {
    try {
      const requests = new Requests();
      await requests.logout(); // Notify the server
      sessionData.eraseAllData(); // Clear client-side session data
      // Reset navigation state and navigate to Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Show password verification dialog
            Alert.alert(
              'Verify Password',
              'Please enter your password to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Verify',
                  style: 'destructive',
                  onPress: () => {
                    // Show password input modal
                    setShowDeletePassword(true);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleDeleteWithPassword = async () => {
    if (!deleteAccountPassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      const requests = new Requests();
      const result = await requests.deleteAccount(deleteAccountPassword);
      
      if (result.success) {
        sessionData.eraseAllData();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
      } else {
        Alert.alert('Error', result.error || 'Failed to delete account. Please check your password and try again.');
      }
    } catch (error) {
      console.error('Delete account failed:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleteAccountPassword('');
      setShowDeletePassword(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <Avatar.Icon size={100} icon="account" style={styles.avatar} />
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{displayName || 'Your Name'}</Text>
          <Text style={styles.email}>{email || 'youremail@example.com'}</Text>
        </View>

        {/* Personal Info Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <PaperTextInput
            label="Display Name"
            mode="outlined"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            theme={{ colors: { primary: colors.primary } }}
          />
          <PaperTextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            theme={{ colors: { primary: colors.primary } }}
          />
        </View>

        {/* Change Password Section */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setIsChangePasswordVisible(!isChangePasswordVisible)}
            style={styles.sectionHeader}
          >
            <Text style={styles.cardTitle}>Change Password</Text>
            <IconButton
              icon={isChangePasswordVisible ? 'chevron-up' : 'chevron-down'}
              size={20}
              iconColor={colors.secondary}
            />
          </TouchableOpacity>
          {isChangePasswordVisible && (
            <>
              <PaperTextInput
                label="Current Password"
                mode="outlined"
                secureTextEntry={!showPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={styles.input}
                theme={{ colors: { primary: colors.primary } }}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              <PaperTextInput
                label="New Password"
                mode="outlined"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.input}
                theme={{ colors: { primary: colors.primary } }}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  />
                }
              />
              <PaperTextInput
                label="Confirm New Password"
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                theme={{ colors: { primary: colors.primary } }}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />
              <Button
                mode="contained"
                onPress={handleChangePassword}
                style={styles.saveButton}
                theme={{ colors: { primary: colors.primary } }}
              >
                <Text>Update Password</Text>
              </Button>
            </>
          )}
        </View>
        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            theme={{ colors: { primary: colors.primary } }}
          >
            <Text>Save Changes</Text>
          </Button>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            theme={{ colors: { primary: colors.error } }}
          >
            <Text>Logout</Text>
          </Button>
          <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteLink}>
            <Text style={styles.deleteLinkText}>Delete account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Account Password Modal */}
      {showDeletePassword && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Password</Text>
            <Text style={styles.modalSubtitle}>Enter your password to confirm account deletion</Text>
            <PaperTextInput
              label="Password"
              mode="outlined"
              secureTextEntry={true}
              value={deleteAccountPassword}
              onChangeText={setDeleteAccountPassword}
              style={styles.modalInput}
              theme={{ colors: { primary: colors.primary } }}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setDeleteAccountPassword('');
                  setShowDeletePassword(false);
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleDeleteWithPassword}
                style={[styles.modalButton, styles.deleteButton]}
                theme={{ colors: { primary: colors.error } }}
              >
                Delete Account
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: colors.primary,
  },
  email: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.input,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  input: {
    marginBottom: 15,
    backgroundColor: colors.input,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    marginTop: 20,
  },
  saveButton: {
    marginBottom: 10,
  },
  logoutButton: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  deleteLink: {
    alignSelf: 'center',
    marginTop: 16,
  },
  deleteLinkText: {
    color: colors.error,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 20,
    backgroundColor: colors.input,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
});

export default ProfileScreen;
