import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput } from 'react-native-paper';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { colors } from './theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('lauravgreiner@gmail.com');
  const [password, setPassword] = useState('4S9rE%3Wp');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const requests = new Requests();

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await requests.handleLogin(email, password);
      if (response) {
        console.info('Login successful');
        console.log('idToken after login:', Requests.idToken); // Debug log
        // Save the idToken to AsyncStorage
        await AsyncStorage.setItem('idToken', Requests.idToken);
        // Notify app of successful login
        onLoginSuccess();
        // Pass the username to the main screen
        navigation.navigate({ name: 'Main', params: { displayName: Requests.displayName } });
      } else {
        setError('Login failed.');
      }
    } catch (error) {
      console.error('Login failed', error);
      setError('Login failed. Please check your credentials');
    }
  };

  return (
    <View style={[GlobalStyles.container, GlobalStyles.loginContainer, GlobalStyles.background]}>
      <View style={GlobalStyles.content}>
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
              <TextInput.Icon 
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <Button 
            mode="contained" 
            theme={{ colors: { primary: colors.primary } }} 
            style={GlobalStyles.button} 
            onPress={() => handleLogin(email, password)}
          > 
            Login 
          </Button>
          {error ? <Text style={GlobalStyles.errorMessage}>{error}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate({ name: 'Registration', params: {} })}>
          <Text style={GlobalStyles.registerLink}>Don't have an account? Register here.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 20,
  },
});

export default LoginScreen;
