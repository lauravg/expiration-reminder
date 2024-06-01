import { DefaultTheme } from 'react-native-paper';

const colors = {
  primary: '#388E3C',         
  primaryLight: '#81C784',    
  primaryDark: '#2E7D32',
  primaryLightLight:'rgba(185, 246, 202, .1)',
  secondary: '#665a6f',
  secondaryLight: 'rgba(102,90,111,.5)',
  icon: '#4f4f4f',
  background: 'rgba(56, 142, 60, .1)',
  input: 'rgba(255,255,255,.6)',  
  productBackground: 'rgba(255,255,255,.8)',
  navBackground: '#FFFFFF',
  border: '#dddddd',
  error: '#B00020',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#000000',
  onProductBackground: '#000000',
  onError: '#FFFFFF',
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.secondary,
    background: colors.background,
    input: colors.input,
    error: colors.error,
    text: colors.onBackground,
    onProductBackground: colors.onProductBackground,
    disabled: '#f5f5f5',
    placeholder: '#8e8e8e',
    backdrop: '#00000050',
    notification: colors.secondaryLight,
  },
};

export { colors, theme };
