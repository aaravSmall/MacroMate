import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, EmptyState, Text } from '@/components/ui';

describe('UI primitives', () => {
  it('renders Text children', async () => {
    await render(<Text variant="title">Hello</Text>);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
  });

  it('calls Button onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders EmptyState title and description', async () => {
    await render(<EmptyState title="Nothing logged yet" description="Tap + to add food." />);
    expect(screen.getByText('Nothing logged yet')).toBeOnTheScreen();
    expect(screen.getByText('Tap + to add food.')).toBeOnTheScreen();
  });
});
