import { useColorScheme } from 'react-native';

import { darkColors, lightColors, radii, spacing, type Theme, typography } from './tokens';

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  radii,
  typography,
};
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors, spacing, radii, typography };

/** Current theme, following the system appearance. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
