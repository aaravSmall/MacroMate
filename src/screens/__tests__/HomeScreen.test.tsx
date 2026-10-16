import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/screens/HomeScreen';

jest.mock('expo-constants', () => ({ expoConfig: { name: 'Tally' } }));

describe('HomeScreen', () => {
  it('renders the app name', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Tally')).toBeOnTheScreen();
  });
});
