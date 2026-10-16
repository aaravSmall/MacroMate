import { Link } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Card, Divider, Text } from '@/components/ui';

export default function AccountScreen() {
  return (
    <PlaceholderScreen
      title="Account"
      description="Your profile, goals, reminders, Apple Health connection, and account options."
    >
      <Card>
        <Link href="/account/settings">
          <Text>Settings</Text>
        </Link>
        <Divider />
        <Link href="/account/help">
          <Text>Help & resources</Text>
        </Link>
        <Divider />
        <Link href="/account/delete-account">
          <Text tone="danger">Delete account</Text>
        </Link>
      </Card>
    </PlaceholderScreen>
  );
}
