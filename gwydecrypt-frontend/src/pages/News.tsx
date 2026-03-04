import { useEffect, useRef, useState } from 'react';
import { Title, Paper, Stack, Tabs, Text, Group } from '@mantine/core';
import { IconNews, IconCalendar, IconChartBar, IconFlame, IconBrandCoinbase, IconTrophy } from '@tabler/icons-react';
import { TickerTape } from '../components/TickerTape';
import { PolymarketTrending } from '../components/PolymarketTrending';

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

// TradingView News Widget
const TradingViewNews = () => {
  const { containerRef } = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
    {
      feedMode: 'all_symbols',
      isTransparent: false,
      displayMode: 'regular',
      width: '100%',
      height: '100%',
      colorTheme: 'dark',
      locale: 'es'
    }
  );

  return <div ref={containerRef} style={{ height: '600px' }} />;
};

// TradingView Economic Calendar
const EconomicCalendar = () => {
  const { containerRef } = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
    {
      colorTheme: 'dark',
      isTransparent: false,
      width: '100%',
      height: '100%',
      locale: 'es',
      importanceFilter: '-1,0,1'
    }
  );

  return <div ref={containerRef} style={{ height: '600px' }} />;
};

// TradingView Market Summary
const MarketSummary = () => {
  const { containerRef } = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js',
    {
      width: '100%',
      height: '100%',
      symbolsGroups: [
        {
          name: 'Criptomonedas',
          originalName: 'Cryptocurrencies',
          symbols: [
            { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin' },
            { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
            { name: 'BINANCE:SOLUSDT', displayName: 'Solana' },
            { name: 'BINANCE:XRPUSDT', displayName: 'Ripple' },
            { name: 'BINANCE:BNBUSDT', displayName: 'Binance Coin' },
            { name: 'BINANCE:ADAUSDT', displayName: 'Cardano' },
            { name: 'BINANCE:DOGEUSDT', displayName: 'Dogecoin' },
            { name: 'BINANCE:AVAXUSDT', displayName: 'Avalanche' },
            { name: 'BINANCE:DOTUSDT', displayName: 'Polkadot' },
            { name: 'BINANCE:MATICUSDT', displayName: 'Polygon' },
            { name: 'BINANCE:LINKUSDT', displayName: 'Chainlink' },
            { name: 'BINANCE:UNIUSDT', displayName: 'Uniswap' }
          ],
          showSymbolLogo: true
        }
      ],
      showSymbolLogo: true,
      colorTheme: 'dark',
      isTransparent: false,
      locale: 'es'
    }
  );

  return <div ref={containerRef} style={{ height: '600px' }} />;
};

// TradingView Market Screener
const MarketScreener = () => {
  const { containerRef } = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-screener.js',
    {
      width: '100%',
      height: '100%',
      defaultColumn: 'overview',
      screener_type: 'crypto_mkt',
      displayCurrency: 'USD',
      colorTheme: 'dark',
      isTransparent: false,
      locale: 'es'
    }
  );

  return <div ref={containerRef} style={{ height: '600px' }} />;
};

// TradingView Crypto Heatmap
const CryptoHeatmap = () => {
  const { containerRef } = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js',
    {
      dataSource: 'Crypto',
      blockSize: 'market_cap_calc',
      blockColor: 'change',
      locale: 'es',
      symbolUrl: '',
      colorTheme: 'dark',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      width: '100%',
      height: '100%'
    }
  );

  return <div ref={containerRef} style={{ height: '500px' }} />;
};

// Componente de información alternativa (ya que CoinGecko y CoinMarketCap bloquean iframes)
const MarketInfoCards = () => {
  return (
    <Paper
      p="xl"
      radius="sm"
      withBorder
      sx={{
        backgroundColor: '#141719',
        borderColor: '#1f2326',
        textAlign: 'center',
      }}
    >
      <Group justify="center" gap="xl">
        <div>
          <Text size="12" c="dimmed" fw={500} tt="uppercase" mb="xs">Market Cap Global</Text>
          <Text size="32" fw={700} c="white">$2.1T+</Text>
          <Text size="12" c="teal">+2.4% 24h</Text>
        </div>
        <div>
          <Text size="12" c="dimmed" fw={500} tt="uppercase" mb="xs">Volumen 24h</Text>
          <Text size="32" fw={700} c="white">$85B+</Text>
          <Text size="12" c="red">-1.2% 24h</Text>
        </div>
        <div>
          <Text size="12" c="dimmed" fw={500} tt="uppercase" mb="xs">BTC Dominance</Text>
          <Text size="32" fw={700} c="white">52.3%</Text>
          <Text size="12" c="dimmed">+0.1% 24h</Text>
        </div>
      </Group>
    </Paper>
  );
};

export default function News() {
  return (
    <Stack gap="xl">
      <Title order={2} c="white">Noticias y Mercado</Title>

      {/* Ticker Tape */}
      <Paper
        p="sm"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <TickerTape />
      </Paper>

      {/* Tabs with different widgets */}
      <Tabs defaultValue="news" variant="outline" radius="sm">
        <Tabs.List>
          <Tabs.Tab value="news">
            <Group gap="xs">
              <IconNews size={16} />
              <span>Noticias</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="calendar">
            <Group gap="xs">
              <IconCalendar size={16} />
              <span>Calendario Económico</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="summary">
            <Group gap="xs">
              <IconChartBar size={16} />
              <span>Resumen de Mercado</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="screener">
            <Group gap="xs">
              <IconFlame size={16} />
              <span>Screener</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="polymarket">
            <Group gap="xs">
              <IconTrophy size={16} />
              <span>Polymarket</span>
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="news" pt="xl">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <TradingViewNews />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="calendar" pt="xl">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <EconomicCalendar />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="summary" pt="xl">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <MarketSummary />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="screener" pt="xl">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <MarketScreener />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="polymarket" pt="xl">
          <PolymarketTrending />
        </Tabs.Panel>
      </Tabs>

      {/* Market Stats Cards - Reemplazo para CoinGecko/CoinMarketCap */}
      <div>
        <Title order={3} c="white" mb="md">Estadísticas del Mercado</Title>
        <MarketInfoCards />
      </div>

      {/* Crypto Heatmap - Always visible at bottom */}
      <div>
        <Title order={3} c="white" mb="md">Mapa de Calor del Mercado Crypto</Title>
        <Paper
          p="lg"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#141719',
            borderColor: '#1f2326',
          }}
        >
          <CryptoHeatmap />
        </Paper>
      </div>
    </Stack>
  );
}
