import { Linking, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { HELP_RESOURCES, type HelpResource } from '@/constants/helpResources';
import { useTheme } from '@/theme';

function open(url: string) {
  void Linking.openURL(url);
}

function ResourceCard({ resource }: { resource: HelpResource }) {
  const { spacing } = useTheme();
  const { phone, text, url } = resource;
  return (
    <Card>
      <Text variant="subheading">{resource.name}</Text>
      <Text variant="callout" tone="muted">
        {resource.description}
      </Text>
      {phone || text || url ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {phone ? (
            <Button
              title={`Call ${phone}`}
              variant="secondary"
              onPress={() => open(`tel:${phone.replace(/[^\d+]/g, '')}`)}
            />
          ) : null}
          {text ? (
            <Button
              title={text.body ? `Text ${text.body} to ${text.number}` : `Text ${text.number}`}
              variant="secondary"
              onPress={() =>
                open(
                  `sms:${text.number}${text.body ? `&body=${encodeURIComponent(text.body)}` : ''}`,
                )
              }
            />
          ) : null}
          {url ? <Button title="Website" variant="ghost" onPress={() => open(url)} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

export default function HelpScreen() {
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Text tone="muted">
        Changing how you eat can bring up a lot. If you&apos;re struggling with food, your body, or
        anything else, you don&apos;t have to figure it out alone.
      </Text>
      {HELP_RESOURCES.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
      <Text variant="caption" tone="muted">
        If you&apos;re in immediate danger, call 911. MacroMate is not medical advice.
      </Text>
    </Screen>
  );
}
