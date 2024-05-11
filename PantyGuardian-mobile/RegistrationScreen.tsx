import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput } from 'react-native-paper';
import GlobalStyles from './GlobalStyles';

const RegistrationScreen = () => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');


  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // TODO Registration logic

  };

  return (
    <View style={styles.container}>
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
      <PaperTextInput
        style={GlobalStyles.input}
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={text => setPassword(text)}
        secureTextEntry={true}
      />
      <PaperTextInput
        style={GlobalStyles.input}
        mode="outlined"
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={text => setConfirmPassword(text)}
        secureTextEntry={true}
      />
      <Button mode="contained" style={GlobalStyles.button} onPress={handleRegister}>Register</Button>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});

export default RegistrationScreen;
