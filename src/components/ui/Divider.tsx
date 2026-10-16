import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export function Divider({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]}
    />
  );
}
