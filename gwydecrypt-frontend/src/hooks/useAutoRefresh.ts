import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAutoRefreshStore } from '../store/autoRefreshStore';
import api from '../api/axios';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  queryKeys?: string[][];
  onRefresh?: () => void;
  updatePrices?: boolean;
}

export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const { enabled = true, queryKeys = [], onRefresh, updatePrices = true } = options;
  const queryClient = useQueryClient();
  const interval = useAutoRefreshStore((state) => state.interval);
  const getIntervalInMs = useAutoRefreshStore((state) => state.getIntervalInMs);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Si está deshabilitado o no está enabled, no hacer nada
    if (!enabled || interval === 'off') {
      return;
    }

    const intervalMs = getIntervalInMs();

    // Crear nuevo intervalo
    intervalRef.current = window.setInterval(async () => {
      try {
        // Primero actualizar precios desde el backend
        if (updatePrices) {
          await api.post('/portfolio/update-prices');
        }

        // Luego invalidar queries especificadas para refrescar datos
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        // Ejecutar callback personalizado si existe
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error durante auto-actualización:', error);
        // Incluso si falla la actualización de precios, refrescar las queries
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    }, intervalMs);

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, getIntervalInMs, queryKeys, queryClient, onRefresh, updatePrices]);

  return {
    interval,
    isEnabled: enabled && interval !== 'off',
    intervalMs: interval === 'off' ? 0 : getIntervalInMs(),
  };
}
