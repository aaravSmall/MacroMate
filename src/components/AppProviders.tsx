import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { AuthProvider, useAuth } from '@/features/auth';
import { createQueryClient, wireAppStateFocus } from '@/lib/queryClient';

/** Drops all cached server data when the signed-in user changes (including sign-out). */
function ClearCacheOnUserChange() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef(user?.id);

  useEffect(() => {
    if (previousUserId.current !== user?.id) {
      queryClient.clear();
      previousUserId.current = user?.id;
    }
  }, [user?.id, queryClient]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  useEffect(wireAppStateFocus, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClearCacheOnUserChange />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
