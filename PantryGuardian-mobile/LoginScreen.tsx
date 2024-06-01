import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native'; // Add TouchableOpacity for the registration link
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput } from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests'
import { colors } from './theme';

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to manage password visibility
  const requests = new Requests();

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await requests.handleLogin(email, password);
      if (response) {
        console.info('Login successful');
        navigation.navigate({ name: 'Main', params: {} });
      } else {
        setError('Login failed.');
      }
    } catch (error) {
      setError('Login failed. Please check your credentials');
    }
  };



  return (
    <View style={[GlobalStyles.container, GlobalStyles.loginContainer]}>
      <Image style={GlobalStyles.loginLogo} source={require('./assets/green-logo.png')} />
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
        <Button mode="contained" theme={{ colors: { primary: colors.primary } }} style={GlobalStyles.button} onPress={(e) => handleLogin(email, password)}> Login </Button>
        {error ? <Text style={GlobalStyles.errorMessage}>{error}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => navigation.navigate({ name: 'Registration', params: {} })}>
        <Text style={GlobalStyles.registerLink}>Don't have an account? Register here.</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 20,
  },
});

export default LoginScreen;
