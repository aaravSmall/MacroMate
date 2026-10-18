import { type AuthClient, bearerToken, signedInUserId } from '../auth';

function request(authorization?: string): Request {
  return new Request('https://example.test/functions/v1/x', {
    method: 'POST',
    headers: authorization ? { Authorization: authorization } : {},
  });
}

function client(result: Awaited<ReturnType<AuthClient['auth']['getUser']>> | Error) {
  const getUser = jest.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { client: { auth: { getUser } } satisfies AuthClient, getUser };
}

describe('bearerToken', () => {
  it('extracts a bearer JWT', () => {
    expect(bearerToken('Bearer eyJhbGciOi.payload.sig')).toBe('eyJhbGciOi.payload.sig');
    expect(bearerToken('bearer   abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('rejects missing headers, other schemes, and publishable/secret keys', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('')).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken('Bearer sb_publishable_abc')).toBeNull();
    expect(bearerToken('Bearer sb_secret_abc')).toBeNull();
  });
});

describe('signedInUserId', () => {
  it('returns the verified user id', async () => {
    const { client: c, getUser } = client({ data: { user: { id: 'user-1' } }, error: null });
    await expect(signedInUserId(request('Bearer a.b.c'), c)).resolves.toBe('user-1');
    expect(getUser).toHaveBeenCalledWith('a.b.c');
  });

  it('never calls getUser without a JWT (e.g. publishable key only)', async () => {
    const { client: c, getUser } = client({ data: { user: { id: 'x' } }, error: null });
    await expect(signedInUserId(request(), c)).resolves.toBeNull();
    await expect(signedInUserId(request('Bearer sb_publishable_x'), c)).resolves.toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired tokens', async () => {
    const invalid = client({ data: { user: null }, error: new Error('invalid JWT') });
    await expect(signedInUserId(request('Bearer a.b.c'), invalid.client)).resolves.toBeNull();
    const throwing = client(new Error('network'));
    await expect(signedInUserId(request('Bearer a.b.c'), throwing.client)).resolves.toBeNull();
  });
});
