import { render, screen } from '@testing-library/react-native';

import { CareNotice } from '@/features/goals/components/CareNotice';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

describe('CareNotice', () => {
  it('shows the message and a help link', async () => {
    await render(<CareNotice title="A quick note" message="Take care." />);
    expect(screen.getByText('A quick note')).toBeOnTheScreen();
    expect(screen.getByText('Take care.')).toBeOnTheScreen();
    expect(screen.getByText('Help & resources')).toBeOnTheScreen();
  });

  it('can hide the help link', async () => {
    await render(<CareNotice title="Note" message="Hi" showHelpLink={false} />);
    expect(screen.queryByText('Help & resources')).toBeNull();
  });
});
