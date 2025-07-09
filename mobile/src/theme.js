import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#667eea',
    accent: '#764ba2',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#333333',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  roundness: 12,
};

export const gradientColors = ['#667eea', '#764ba2'];

export const categoryColors = {
  'Food & Dining': '#ff6b6b',
  'Shopping': '#4ecdc4',
  'Transportation': '#45b7d1',
  'Entertainment': '#96ceb4',
  'Healthcare': '#ffeaa7',
  'Utilities': '#fab1a0',
  'Other': '#a29bfe',
};
