import { Modal, ScrollView, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type ShareFoodSheetProps = {
  visible: boolean;
  foodName: string;
  sharing: boolean;
  error: string | null;
  onShare: () => void;
  onClose: () => void;
};

/** Confirms sharing one of the user's private foods to the global database. */
export function ShareFoodSheet({
  visible,
  foodName,
  sharing,
  error,
  onShare,
  onClose,
}: ShareFoodSheetProps) {
  const { colors, spacing } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text variant="title">Share “{foodName}”?</Text>
          <Text>
            Sharing adds this food to the public database, so everyone using the app can find it in
            search and log it.
          </Text>
          <Text>
            Sharing can&apos;t be undone. If you delete your account later, the food stays public
            without your name on it.
          </Text>
        </View>
        {error ? <Text tone="danger">{error}</Text> : null}
        <View style={{ gap: spacing.sm }}>
          <Button title="Share to public database" onPress={onShare} loading={sharing} />
          <Button title="Not now" variant="ghost" onPress={onClose} disabled={sharing} />
        </View>
      </ScrollView>
    </Modal>
  );
}
