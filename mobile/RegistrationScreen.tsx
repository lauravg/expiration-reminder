import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [isLoading, setIsLoading] = useState(false);
  const requests = new Requests();

  const handleRegistration = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setIsLoading(true);
      const success = await requests.register(name, email, password);
      if (success) {
        console.info('Registration successful');
        navigation.navigate({name: 'Login', params:{}});
      } else {
        setError('Registration failed.');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[GlobalStyles.container, styles.container]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons 
                name="food-apple" 
                size={64} 
                color={colors.primary} 
                style={styles.icon}
              />
              <Text style={styles.appName}>Create Account</Text>
              <Text style={styles.tagline}>Join PantryGuardian today</Text>
            </View>

            <View style={styles.formContainer}>
              <PaperTextInput
                style={styles.input}
                mode="flat"
                label="Name"
                value={name}
                onChangeText={text => setName(text)}
                left={<TextInput.Icon icon="account" color={colors.primary} />}
                theme={{ colors: { primary: colors.primary } }}
              />

              <PaperTextInput
                style={styles.input}
                mode="flat"
                label="Email"
                value={email}
                onChangeText={text => setEmail(text)}
                left={<TextInput.Icon icon="email" color={colors.primary} />}
                theme={{ colors: { primary: colors.primary } }}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <PaperTextInput
                style={styles.input}
                mode="flat"
                label="Password"
                value={password}
                onChangeText={text => setPassword(text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                left={<TextInput.Icon icon="lock" color={colors.primary} />}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                    color={colors.primary}
                  />
                }
                theme={{ colors: { primary: colors.primary } }}
              />

              <PaperTextInput
                style={styles.input}
                mode="flat"
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={text => setConfirmPassword(text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                left={<TextInput.Icon icon="lock-check" color={colors.primary} />}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                    color={colors.primary}
                  />
                }
                theme={{ colors: { primary: colors.primary } }}
              />

              {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

              <Button 
                mode="contained" 
                onPress={handleRegistration}
                style={styles.registerButton}
                contentStyle={styles.registerButtonContent}
                labelStyle={styles.registerButtonLabel}
              >
                Create Account
              </Button>

              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.loginContainer}
              >
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  registerButton: {
    width: '100%',
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  registerButtonContent: {
    height: 48,
  },
  registerButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorMessage: {
    color: colors.error,
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  loginContainer: {
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RegistrationScreen;
