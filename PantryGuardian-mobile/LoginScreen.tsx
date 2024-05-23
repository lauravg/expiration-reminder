import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native'; // Add TouchableOpacity for the registration link
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput} from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import axios from 'axios';
import qs from 'qs';
import Requests from './Requests'

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to manage password visibility
  const requests = new Requests();

  const handleLogin = async () => {
    requests.handleLogin(email, password).then((success) => {
      if (success) {
        navigation.navigate({ name: 'Main', params: {} });
      } else {
          setError('Login failed.');
      }
    }).catch((err) => {
      setError('Login failed. Please check your credentials');
    })
  };


  return (
    <View style={[GlobalStyles.container, styles.LoginContainer]}>
      <Image style={styles.logo} source={require('./assets/PantryGuardian-logo.png')} />
      <View style={styles.formContainer}>
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
        <Button mode="contained" style={GlobalStyles.button} onPress={handleLogin}>Login</Button>
        {error ? <Text style={GlobalStyles.errorMessage}>{error}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => navigation.navigate({ name: 'Registration', params: {} })}>
        <Text style={styles.registerLink}>Don't have an account? Register here.</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  LoginContainer: {
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 20,
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

  formContainer: {
    marginBottom: 20,
  },

  registerLink: {
    textAlign: 'center',
    marginTop: 20,
    color: '#423F8C',
  },
});

export default LoginScreen;
