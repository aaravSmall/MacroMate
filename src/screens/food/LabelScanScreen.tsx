import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export default function LabelScanScreen() {
  const { colors, spacing } = useTheme();
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
        <Ionicons name="scan-outline" size={48} color={colors.accent} />
        <Text variant="title" align="center">
          Label scanning is coming
        </Text>
        <Text tone="muted" align="center">
          Soon you&apos;ll be able to photograph a nutrition facts panel and we&apos;ll fill in a
          new food for you to review and save.
        </Text>
      </View>
      <Card>
        <Text variant="callout" tone="muted">
          Tally reads the printed label. It won&apos;t guess calories from a photo of a meal,
          because those estimates aren&apos;t reliable.
        </Text>
      </Card>
      <Button title="Enter a food manually" onPress={() => router.replace('/create-food')} />
    </Screen>
  );
}
