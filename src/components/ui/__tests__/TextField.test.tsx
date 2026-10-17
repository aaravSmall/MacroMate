import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from '@/components/ui';

describe('TextField', () => {
  it('hides a secure value until the user reveals it', async () => {
    await render(<TextField label="Password" value="hunter22" secureTextEntry />);
    const input = screen.getByLabelText('Password');
    expect(input.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('has no toggle for normal fields', async () => {
    await render(<TextField label="Email" value="" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
