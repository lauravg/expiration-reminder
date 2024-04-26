import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import axios, { AxiosError } from 'axios';
import qs from 'qs';  // Ensure qs is installed using npm or yarn
import { useNavigation, NavigationProp } from '@react-navigation/native';

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios({
        method: 'post',
        url: 'http://127.0.0.1:8025/login',
        data: qs.stringify({ email, password }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0 // Prevent axios from following redirects
      });

      if (response.status >= 200 && response.status < 300) {
        navigation.navigate({name: 'Homepage', params: {}});
      } else {
        setError('Login failed. Please check your credentials.');
        console.log('Login failed. Please check your credentials.');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        setError(`An error occurred: ${axiosError.response.data}`);
        console.error('Login error:', axiosError.response.data);
      } else {
        setError('An error occurred. Please try again later.');
        console.error('Login error:', axiosError.message);
      }
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
};

export default LoginScreen;
