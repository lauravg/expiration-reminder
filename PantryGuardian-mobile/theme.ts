import { DefaultTheme } from 'react-native-paper';

interface Colors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  divider: string;
  input: string;
  inputBorder: string;
  card: {
    background: string;
    shadow: string;
  };
  statusBadge: {
    background: string;
    text: string;
  };
  hover: string;
  pressed: string;
  disabled: string;
  secondary: string;
}

export const colors: Colors = {
  // Primary Colors
  primary: '#6200EE',         // Deep charcoal for primary elements
  primaryLight: '#3D3D3D',    
  primaryDark: '#1A1A1A',
  accent: '#03DAC5',          // Warm orange for accents
  secondary: '#03dac6',
  
  // Background Colors
  background: '#F5F5F5',      // Light gray for main background
  surface: '#FFFFFF',         // Pure white for cards
  surfaceVariant: '#F3F4F8',  // Subtle gray for secondary surfaces
  
  // Status Colors
  error: '#B00020',          // Bright red for errors
  success: '#4CAF50',        // Green for success
  warning: '#FF9800',        // Orange for warnings
  info: '#2196F3',          // Blue for info
  
  // Text Colors
  textPrimary: '#000000',    // Almost black for primary text
  textSecondary: '#757575',  // Medium gray for secondary text
  textTertiary: '#9CA3AF',   // Light gray for tertiary text
  textInverse: '#FFFFFF',    // White text for dark backgrounds
  
  // UI Elements
  border: '#E5E7EB',         // Light gray for borders
  divider: '#F3F4F6',        // Subtle divider color
  input: '#FFFFFF',          // White input background
  inputBorder: '#E5E7EB',    // Input border color
  
  // Component-specific
  card: {
    background: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.05)',
  },
  statusBadge: {
    background: 'rgba(243, 244, 246, 0.7)',
    text: '#2B2B2B',
  },
  
  // States
  hover: 'rgba(0, 0, 0, 0.04)',
  pressed: 'rgba(0, 0, 0, 0.08)',
  disabled: '#E5E7EB',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    text: colors.textPrimary,
    disabled: colors.disabled,
    placeholder: colors.textTertiary,
    backdrop: 'rgba(0, 0, 0, 0.3)',
    notification: colors.accent,
  },
  roundness: 16,
  animation: {
    scale: 1.0,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
} as const; 