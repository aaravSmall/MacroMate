import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { getDiningMenu, listDiningLocations } from '../services/diningService';

export function useDiningLocations() {
  return useQuery({
    queryKey: queryKeys.dining.locations(),
    queryFn: listDiningLocations,
    staleTime: 60 * 60_000,
  });
}

export function useDiningMenu(locationId: string | null, date: string) {
  return useQuery({
    queryKey: queryKeys.dining.menu(locationId ?? '', date),
    queryFn: () => getDiningMenu(locationId ?? '', date),
    enabled: !!locationId,
    staleTime: 15 * 60_000,
  });
}
