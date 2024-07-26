import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { IconButton, TextInput as PaperTextInput, Button, Avatar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';
import {SessionData} from './SessionData'

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const sessionData = new SessionData();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    // Add your save logic here (e.g., API call to save profile details)
    // console.log('Profile information saved:', { sessionData, displayName, profileImage });
    // TODO
  };

  const handleLogout = () => {
    sessionData.eraseAllData();
    navigation.navigate({ name: 'Login', params: { } });
  };
  return (
    <View style={[GlobalStyles.containerWithHeader, GlobalStyles.background]}>
      <View style={[GlobalStyles.content, styles.content]}>
        <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Avatar.Icon size={100} icon="account" theme={{ colors: { primary: colors.primary } }}/>
          )}
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>

        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Email"
          value={sessionData.userEmail}
          onChangeText={sessionData.setUserEmail}
        />
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Display Name"
          value={sessionData.userDisplayName}
          onChangeText={sessionData.setUserDisplayName}
        />


        <Button mode="contained" theme={{ colors: { primary: colors.primary } }} style={styles.button} onPress={handleSave}>
          Save
        </Button>
        <Button mode="contained" theme={{ colors: { primary: colors.error } }} style={styles.button} onPress={handleLogout}>
          Logout
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 10,
  },
  content: {
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  changePhotoText: {
    marginTop: 10,
    color: colors.primary,
  },
  button: {
    marginTop: 20,
  },
});

export default ProfileScreen;
