import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { colors } from './theme';
import { SessionData } from './SessionData';

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const requests = new Requests();

  useEffect(() => {
    const sessionData = new SessionData();
    if (sessionData.idToken) {
      navigation.navigate({ name: 'Main', params: { } });
    }
  });

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await requests.handleLogin(email, password);
      if (response) {
        console.info('Login successful');
        onLoginSuccess();
        navigation.navigate({ name: 'Main', params: { } });
      } else {
        setError('Login failed.');
      }
    } catch (error) {
      console.error('Login failed', error);
      setError('Login failed. Please check your credentials');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[GlobalStyles.container, styles.container]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons 
            name="food-apple" 
            size={64} 
            color={colors.primary} 
            style={styles.icon}
          />
          <Text style={styles.appName}>PantryGuardian</Text>
          <Text style={styles.tagline}>Keep your food fresh, reduce waste</Text>
        </View>

        <View style={styles.formContainer}>
          <PaperTextInput
            style={styles.input}
            mode="flat"
            label="Email"
            value={email}
            onChangeText={text => setEmail(text)}
            left={<TextInput.Icon icon="email" color={colors.primary} />}
            theme={{ colors: { primary: colors.primary } }}
          />

          <PaperTextInput
            style={styles.input}
            mode="flat"
            label="Password"
            value={password}
            onChangeText={text => setPassword(text)}
            secureTextEntry={!showPassword}
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

          {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

          <Button 
            mode="contained" 
            onPress={() => handleLogin(email, password)}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
          >
            Sign In
          </Button>

          <TouchableOpacity 
            onPress={() => navigation.navigate({ name: 'Registration', params: {} })}
            style={styles.registerContainer}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
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
  loginButton: {
    width: '100%',
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  loginButtonContent: {
    height: 48,
  },
  loginButtonLabel: {
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
  registerContainer: {
    marginTop: 24,
  },
  registerText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
