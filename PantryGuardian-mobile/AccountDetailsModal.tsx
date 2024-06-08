import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IconButton, TextInput as PaperTextInput, Button, Avatar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import GlobalStyles from './GlobalStyles';
import { colors } from './theme';

const AccountDetailsScreen = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    console.log('Profile information saved:', { email, username, firstName, lastName, profileImage });
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Avatar.Icon size={100} icon="account" />
          )}
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>

        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
        />
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Username"
          value={username}
          onChangeText={setUsername}
        />
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />

        <Button mode="contained" theme={{ colors: { primary: colors.primary } }} style={styles.button} onPress={handleSave}>
          Save
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
    padding: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
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

export default AccountDetailsScreen;
