import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native'; // Add TouchableOpacity for the registration link
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput} from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests'

const RegistrationScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to manage password visibility
  const requests = new Requests();

  const handleRegistration = async () => {
    // TBD
  };


  return (
    <View style={[GlobalStyles.container, styles.RegistrationContainer]}>
      <Image style={styles.logo} source={require('./assets/PantryGuardian-logo.png')} />
      <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Name"
          value={email}
          onChangeText={text => setName(text)}
        />
        <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={text => setEmail(text)}
        />
        <TextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={text => setPassword(text)}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <TextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Confirm Password"
          value={password}
          onChangeText={text => setPassword(text)}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <Button mode="contained" style={GlobalStyles.button} onPress={handleRegistration}>Submit</Button>
        {error ? <Text style={GlobalStyles.errorMessage}>{error}</Text> : null}
      </View>
  );
};

const styles = StyleSheet.create({
  RegistrationContainer: {
    flex: 1,
    margin: 20,
    ...(Platform.OS === 'web' && {
      width: 600,
      alignSelf: 'center',
    }),
  },

  logo: {
    borderRadius: 100,
    width: 200,
    height: 200,
    marginBottom: 40,
    alignSelf: 'center',
  },


});

export default RegistrationScreen;
