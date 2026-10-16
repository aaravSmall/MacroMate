import { StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '@/constants/app';
import { colors, spacing } from '@/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
});
