import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput} from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { colors } from './theme';

const RegistrationScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const requests = new Requests();

  const handleRegistration = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const success = await requests.register(name, email, password);
      if (success) {
        console.info('Registration successful');
        navigation.navigate({name: 'Login', params:{}});
      } else {
        setError('Registration failed.');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <View style={[GlobalStyles.container, GlobalStyles.loginContainer]}>
      <Image style={GlobalStyles.loginLogo} source={require('./assets/green-logo.png')} />
      <PaperTextInput
          style={GlobalStyles.input}
          mode="outlined"
          label="Name"
          value={name}
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
          value={confirmPassword}
          onChangeText={text => setConfirmPassword(text)}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <Button mode="contained" theme={{ colors: {primary: colors.primary} }} style={GlobalStyles.button} onPress={handleRegistration}>Register</Button>
        {error ? <Text style={GlobalStyles.errorMessage}>{error}</Text> : null}
      </View>
  );
};

export default RegistrationScreen;
