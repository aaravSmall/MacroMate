import type { ReactNode } from 'react';
import type { Edge } from 'react-native-safe-area-context';

import { Screen, Text } from '@/components/ui';

export type PlaceholderScreenProps = {
  title: string;
  description: string;
  edges?: Edge[];
  children?: ReactNode;
};

/** Temporary scaffold: title + one-line description of what the screen will do. */
export function PlaceholderScreen({ title, description, edges, children }: PlaceholderScreenProps) {
  return (
    <Screen scroll edges={edges}>
      <Text variant="title">{title}</Text>
      <Text tone="muted">{description}</Text>
      {children}
    </Screen>
  );
}
