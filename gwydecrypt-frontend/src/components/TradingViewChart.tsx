import { useEffect, useRef } from 'react';
import { Paper, Text } from '@mantine/core';

interface TradingViewChartProps {
  symbol: string;
  tokenName: string;
  tokenSymbol: string;
  color?: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function TradingViewChart({ symbol, tokenName, tokenSymbol, color }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(`tradingview_${Math.random().toString(36).substring(7)}`).current;
  const isInitialized = useRef(false);

  useEffect(() => {
    // Evitar inicializar múltiples veces
    if (isInitialized.current) return;

    // Esperar a que el script de TradingView esté disponible globalmente
    const checkTradingView = () => {
      if (window.TradingView && containerRef.current && !isInitialized.current) {
        isInitialized.current = true;

        // Limpiar el contenedor antes de crear un nuevo widget
        containerRef.current.innerHTML = '';

        new window.TradingView.widget({
          autosize: false,
          width: '100%',
          height: 500,
          symbol: symbol,
          interval: '60',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#141719',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          container_id: uniqueId,
          details: false,
          hotlist: false,
          calendar: false,
          studies: [],
          show_popup_button: false,
          popup_width: '1000',
          popup_height: '650',
          backgroundColor: '#141719',
          gridColor: '#1f2326',
        });
      } else if (!isInitialized.current) {
        // Si TradingView no está disponible, intentar de nuevo en 100ms
        setTimeout(checkTradingView, 100);
      }
    };

    checkTradingView();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        isInitialized.current = false;
      }
    };
  }, [symbol, uniqueId]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text size="lg" fw={600} c="white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
          {tokenName} ({tokenSymbol})
        </Text>
      </div>
      <Paper
        id={uniqueId}
        ref={containerRef}
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          '&:hover': {
            borderColor: '#2a2f35',
          },
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}
