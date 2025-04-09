import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Button, TextInput as PaperTextInput, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import GlobalStyles from './GlobalStyles';
import Requests from './Requests';
import { colors } from './theme';
import { SessionData } from './SessionData';

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const navigation = useNavigation<NavigationProp<Record<string, object>>>();
  const [email, setEmail] = useState('lauravgreiner@gmail.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const requests = new Requests();

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const sessionData = new SessionData();
        if (sessionData.idToken) {
          await navigation.navigate({ name: 'Main', params: { } });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setResetError('');
      const response = await requests.resetPassword(resetEmail);
      if (response.success) {
        setResetSuccess(true);
        setResetError('');
      } else {
        setResetError(response.error || 'Failed to send reset email');
      }
    } catch (error) {
      setResetError('An unexpected error occurred. Please try again.');
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
            left={<TextInput.Icon icon="lock" color={colors.primary} />}
            right={
              <TextInput.Icon 
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
                color={colors.primary}
              />
            }
            theme={{ colors: { primary: colors.primary } }}
            autoCapitalize="none"
          />

          <TouchableOpacity 
            onPress={() => setIsForgotPasswordVisible(true)}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

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

      <Modal
        visible={isForgotPasswordVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsForgotPasswordVisible(false);
          setResetEmail('');
          setResetError('');
          setResetSuccess(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            
            {resetSuccess ? (
              <Text style={styles.successText}>
                Password reset email sent! Please check your inbox.
              </Text>
            ) : (
              <>
                <Text style={styles.modalText}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                <View style={styles.modalInputContainer}>
                  <PaperTextInput
                    style={styles.modalInput}
                    mode="flat"
                    label="Email"
                    value={resetEmail}
                    onChangeText={text => {
                      setResetEmail(text);
                      if (resetError) setResetError('');
                    }}
                    left={<TextInput.Icon icon="email" color={colors.primary} />}
                    theme={{ colors: { primary: colors.primary } }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoFocus={true}
                    disabled={isLoading}
                    returnKeyType="send"
                    onSubmitEditing={!isLoading && resetEmail ? handleResetPassword : undefined}
                  />
                  {resetError ? <Text style={styles.errorMessage}>{resetError}</Text> : null}
                </View>
              </>
            )}
            
            <View style={styles.modalButtonContainer}>
              <Button 
                onPress={() => {
                  setIsForgotPasswordVisible(false);
                  setResetEmail('');
                  setResetError('');
                  setResetSuccess(false);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {!resetSuccess && (
                <Button 
                  onPress={handleResetPassword} 
                  disabled={isLoading || !resetEmail}
                  loading={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background,
    width: '90%',
    maxWidth: 340,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  modalButton: {
    marginHorizontal: 4,
  },
  modalText: {
    marginBottom: 16,
    marginHorizontal: 24,
    color: colors.textSecondary,
    fontSize: 14,
  },
  successText: {
    color: colors.primary,
    textAlign: 'center',
    marginVertical: 24,
    marginHorizontal: 16,
    fontSize: 14,
  },
  modalInputContainer: {
    width: '100%',
    marginHorizontal: 16,
    marginBottom: 16,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  modalInput: {
    backgroundColor: 'transparent',
  },
});

export default LoginScreen;
