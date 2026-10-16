import { ActivityIndicator, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';

export type QueryStatusProps = {
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
};

/** Loading spinner or error-with-retry for a query. Renders nothing when neither applies. */
export function QueryStatus({ loading, error, onRetry }: QueryStatusProps) {
  const { colors, spacing } = useTheme();
  if (error) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Couldn't load this"
        description={error instanceof Error ? error.message : 'Something went wrong.'}
        actionLabel={onRetry ? 'Try again' : undefined}
        onAction={onRetry}
      />
    );
  }
  if (loading) {
    return (
      <View style={{ paddingVertical: spacing.xl }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return null;
}
