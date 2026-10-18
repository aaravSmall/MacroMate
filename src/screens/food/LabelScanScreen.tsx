import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useLabelScan } from '@/features/food';
import { useTheme } from '@/theme';

export default function LabelScanScreen() {
  const { colors, spacing } = useTheme();
  const { state, scan } = useLabelScan();
  const reading = state.status === 'reading';

  async function handleScan(from: 'camera' | 'library') {
    if (await scan(from)) {
      router.replace({ pathname: '/create-food', params: { source: 'label_scan' } });
    }
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
        <Ionicons name="scan-outline" size={48} color={colors.accent} />
        <Text variant="title" align="center">
          Scan a Nutrition Facts label
        </Text>
        <Text tone="muted" align="center">
          Photograph the Nutrition Facts panel on a package. We&apos;ll fill in a new food for you
          to check and save.
        </Text>
      </View>

      <Card>
        <Text variant="callout" tone="muted">
          Tally reads the printed label only. It won&apos;t guess calories from a photo of a meal,
          because those estimates aren&apos;t reliable. The photo is read on your device and is
          never uploaded or saved.
        </Text>
      </Card>

      {reading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator color={colors.accent} />
          <Text tone="muted">Reading the label…</Text>
        </View>
      ) : null}
      {state.status === 'error' ? <Text tone="danger">{state.message}</Text> : null}

      <Button title="Take a photo" onPress={() => void handleScan('camera')} disabled={reading} />
      <Button
        title="Choose from library"
        variant="secondary"
        onPress={() => void handleScan('library')}
        disabled={reading}
      />
      <Button
        title="Enter a food manually"
        variant="ghost"
        onPress={() => router.replace('/create-food')}
        disabled={reading}
      />
    </Screen>
  );
}
