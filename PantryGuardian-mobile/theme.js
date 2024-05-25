// theme.js
import { DefaultTheme } from 'react-native-paper';

const colors = {
  primary: '#388E3C',         // A green shade for primary
  primaryLight: '#81C784',    // A lighter green for primary light
  primaryDark: '#2E7D32',     // A darker green for primary dark
  secondary: '#665a6f',       // A green shade for secondary
  // secondaryLight: '#B9F6CA',  // A lighter green for secondary light
  secondaryLight:'rgba(185, 246, 202, .1)',
  secondaryDark: '#00C853',   // A darker green for secondary dark
  background: '#FFFFFF',      // Keeping the background white
  surface: '#FFFFFF',         // Keeping the surface white
  error: '#B00020',           // Keeping the error color red
  onPrimary: '#FFFFFF',       // White text on primary
  onSecondary: '#000000',     // Black text on secondary
  onBackground: '#000000',    // Black text on background
  onSurface: '#000000',       // Black text on surface
  onError: '#FFFFFF',         // White text on error
  lightpurple: 'rgba(233, 223, 235, .4)',
  primaryBackground: 'rgba(56, 142, 60, .1)',
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    text: colors.onBackground,
    onSurface: colors.onSurface,
    disabled: '#f5f5f5',
    placeholder: '#8e8e8e',
    backdrop: '#00000050',
    notification: colors.secondaryLight,
  },
};

export { colors, theme };
