import { DeleteAccountError, deleteAccount } from '@/features/account/services/accountService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() }, auth: { signOut: jest.fn() } },
}));

const invoke = supabase.functions.invoke as unknown as jest.Mock;
const signOut = supabase.auth.signOut as unknown as jest.Mock;

beforeEach(() => {
  invoke.mockReset();
  signOut.mockReset().mockResolvedValue({ error: null });
});

describe('deleteAccount', () => {
  it('calls delete-account with no body, then signs out locally', async () => {
    invoke.mockResolvedValue({ data: null, error: null });
    await deleteAccount();
    expect(invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(invoke.mock.calls[0]?.[1]).not.toHaveProperty('body');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('throws a friendly error and stays signed in when the function fails', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('FunctionsHttpError') });
    const result = deleteAccount();
    await expect(result).rejects.toBeInstanceOf(DeleteAccountError);
    await expect(result).rejects.toThrow(/Your data hasn't changed/);
    expect(signOut).not.toHaveBeenCalled();
  });
});
