import { useEffect } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook para refresco muy frecuente de datos (usado para pools/positions)
 * Por defecto refresca cada 15 segundos
 */
export function useFastRefresh<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
  refreshInterval: number = 15000 // 15 segundos por defecto
) {
  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 segundos
    ...options,
  });

  return query;
}
