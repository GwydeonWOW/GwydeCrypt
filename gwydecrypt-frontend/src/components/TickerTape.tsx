import { useEffect, useRef, useState } from 'react';

// TradingView Widget Component - Wrapper para asegurar que el DOM está listo
const useTradingViewWidget = (scriptSrc: string, config: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Pequeño delay para asegurar que el DOM está completamente renderizado
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      // Limpiar contenido previo
      containerRef.current.innerHTML = '';

      // Crear el contenedor del widget
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container__widget';
      containerRef.current.appendChild(widgetContainer);

      // Crear y configurar el script
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify(config);

      containerRef.current.appendChild(script);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptSrc, JSON.stringify(config)]);

  return { containerRef, isMounted };
};

// TradingView Ticker Tape
export function TickerTape() {
  const { containerRef } = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js',
    {
      symbols: [
        { proName: 'BINANCE:BTCUSDT', title: 'Bitcoin' },
        { proName: 'BINANCE:ETHUSDT', title: 'Ethereum' },
        { proName: 'BINANCE:SOLUSDT', title: 'Solana' },
        { proName: 'BINANCE:XRPUSDT', title: 'XRP' },
        { proName: 'BINANCE:BNBUSDT', title: 'Binance Coin' },
        { proName: 'BINANCE:ADAUSDT', title: 'Cardano' },
        { proName: 'BINANCE:DOGEUSDT', title: 'Dogecoin' },
        { proName: 'BINANCE:AVAXUSDT', title: 'Avalanche' },
        { proName: 'BINANCE:DOTUSDT', title: 'Polkadot' },
        { proName: 'BINANCE:MATICUSDT', title: 'Polygon' }
      ],
      showSymbolLogo: true,
      colorTheme: 'dark',
      isTransparent: false,
      displayMode: 'adaptive',
      width: '100%',
      height: '100%',
      locale: 'es'
    }
  );

  return <div ref={containerRef} style={{ height: '80px' }} />;
}
