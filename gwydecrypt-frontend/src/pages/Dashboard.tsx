import { useState, useMemo } from 'react';
import { Title, Paper, Text, Group, Stack, Button, Badge, Tabs } from '@mantine/core';
import { IconWallet, IconCoin, IconRefresh, IconTrendingUp, IconTrendingDown, IconClock } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import TradingViewChart from '../components/TradingViewChart';
import { TickerTape } from '../components/TickerTape';
import { notifications } from '@mantine/notifications';
import { PrivacyValue } from '../components/PrivacyValue';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePeriodPersistence } from '../hooks/usePeriodPersistence';
import { CHAIN_DISPLAY_NAMES } from '../constants';

// Categorías de activos
const CATEGORIES = {
  CRYPTO: 'crypto',
  COMMODITIES: 'commodities',
  FIAT: 'fiat'
} as const;

// Chains virtuales por categoría
const VIRTUAL_CHAINS = {
  [CATEGORIES.COMMODITIES]: ['commodities'],
  [CATEGORIES.FIAT]: ['fiat']
};

export default function Dashboard() {
  const [period, setPeriod] = usePeriodPersistence('dashboard', '1w');
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const queryClient = useQueryClient();

  // Setup auto-refresh
  useAutoRefresh({
    queryKeys: [['portfolio'], ['portfolio', 'history'], ['tokens', 'dashboard'], ['positions']],
  });

  const { data: portfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await api.get('/portfolio');
      return response.data.portfolio;
    },
  });

  const { data: history } = useQuery({
    queryKey: ['portfolio', 'history', period],
    queryFn: async () => {
      const response = await api.get(`/portfolio/history?period=${period}`);
      return response.data.history;
    },
    enabled: !!portfolio,
  });

  const { data: tokens } = useQuery({
    queryKey: ['tokens', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/market/tokens?dashboard=1');
      return response.data.tokens;
    },
  });

  // Calculate 24h change
  const change24h = portfolio?.tokens?.reduce((acc: number, token: any) => acc + (token.change_24h_percent || 0), 0) || 0;
  const change24hPositive = change24h >= 0;

  // Calculate performance for the selected period
  const periodPerformance = useMemo(() => {
    if (!history || history.length === 0 || !portfolio) return null;

    const initialValue = parseFloat(history[0]?.total_value_usd) || 0;
    const currentValue = portfolio?.total_value_usd || 0;

    const change = currentValue - initialValue;
    const changePercent = initialValue > 0 ? ((change / initialValue) * 100) : 0;
    const isPositive = change >= 0;

    return {
      initialValue,
      currentValue,
      change,
      changePercent,
      isPositive,
    };
  }, [history, portfolio]);

  // Format last update timestamp
  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const lastUpdateText = formatLastUpdate(portfolio?.last_price_update || null);

  const handleRefresh = async () => {
    setIsUpdatingPrices(true);
    try {
      // First update prices
      await api.post('/portfolio/update-prices');

      // Then refetch all data
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio-distribution'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'history'] });
      await queryClient.invalidateQueries({ queryKey: ['tokens', 'dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['positions'] });

      notifications.show({
        title: 'Éxito',
        message: 'Precios actualizados correctamente',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al actualizar precios',
        color: 'red',
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2} c="white">Portafolio</Title>
        <Button
          onClick={handleRefresh}
          loading={isUpdatingPrices}
          variant="light"
          color="gray"
          radius="sm"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconRefresh size={16} />
            <span>Actualizar</span>
          </div>
        </Button>
      </Group>

      {/* Portfolio Summary */}
      <Paper
        p="xl"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Group justify="space-between" align="stretch">
          {/* Left: Main Value */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Text size="sm" c="dimmed">Valor Total del Portafolio</Text>
              {lastUpdateText && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={12} color="#909296" />
                  <Text size="10" c="dimmed">{lastUpdateText}</Text>
                </div>
              )}
            </div>
            <Text
              size={64}
              fw={800}
              c="white"
              lh={1}
              sx={{
                letterSpacing: '-1px',
              }}
            >
              <PrivacyValue value={portfolio?.total_value_usd || 0} />
            </Text>
            {change24h !== 0 && (
              <div style={{ marginTop: '12px' }}>
                <Badge
                  leftSection={change24hPositive ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                  color={change24hPositive ? 'teal' : 'red'}
                  variant="light"
                  radius="sm"
                  size="lg"
                >
                  {change24hPositive ? '+' : ''}{change24h.toFixed(2)}%
                </Badge>
                <Text size="sm" c="dimmed" ml="xs" span>Últimas 24h</Text>
              </div>
            )}
          </div>

          {/* Right: Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            flex: '0 0 400px',
          }}>
            <Paper
              p="sm"
              radius="sm"
              withBorder
              sx={{
                backgroundColor: '#0d0f12',
                borderColor: '#1f2326',
                textAlign: 'center',
              }}
            >
              <IconWallet size={20} color="#909296" style={{ marginBottom: '4px' }} />
              <Text size="10" c="dimmed" fw={500} tt="uppercase">Wallets</Text>
              <Text size="28" fw={700} c="white" lh={1}>{portfolio?.wallets_count || 0}</Text>
            </Paper>

            <Paper
              p="sm"
              radius="sm"
              withBorder
              sx={{
                backgroundColor: '#0d0f12',
                borderColor: '#1f2326',
                textAlign: 'center',
              }}
            >
              <IconCoin size={20} color="#909296" style={{ marginBottom: '4px' }} />
              <Text size="10" c="dimmed" fw={500} tt="uppercase">Tokens</Text>
              <Text size="28" fw={700} c="white" lh={1}>{portfolio?.tokens_count || 0}</Text>
            </Paper>

            {portfolio?.tokens && portfolio.tokens.length > 0 && (
              <Paper
                p="sm"
                radius="sm"
                withBorder
                sx={{
                  backgroundColor: '#0d0f12',
                  borderColor: '#1f2326',
                  textAlign: 'center',
                }}
              >
                <IconTrendingUp size={20} color="#909296" style={{ marginBottom: '4px' }} />
                <Text size="10" c="dimmed" fw={500} tt="uppercase">Top</Text>
                <Text size="16" fw={700} c="white" lh={1.2}>
                  {portfolio.tokens[0].tokens[0].symbol}
                </Text>
                <Text size="10" c="dimmed">
                  {((portfolio.tokens[0].value_usd / portfolio.total_value_usd) * 100).toFixed(1)}%
                </Text>
              </Paper>
            )}
          </div>
        </Group>
      </Paper>

      {/* Market Ticker Tape */}
      <TickerTape />

      {/* Portfolio Performance */}
      {history && history.length > 0 && (
        <Paper
          p="lg"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#141719',
            borderColor: '#1f2326',
          }}
        >
          <Group justify="space-between" mb="md">
            <Text size="16" fw={600} c="white">Rendimiento del Portafolio</Text>
            <Group gap="xs">
              {['1d', '1w', '1m', '3m', '1y'].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'filled' : 'light'}
                  size="xs"
                  radius="sm"
                  onClick={() => setPeriod(p)}
                  styles={{
                    root: period === p ? { backgroundColor: '#667eea' } : { backgroundColor: '#1f2326', color: '#909296' },
                  }}
                >
                  {p === '1d' ? '1D' : p === '1w' ? '1S' : p === '1m' ? '1M' : p === '3m' ? '3M' : '1A'}
                </Button>
              ))}
            </Group>
          </Group>
          <Group gap="xs">
            {periodPerformance && (
              <>
                <Text size="14" c="dimmed">Valor inicial: ${periodPerformance.initialValue.toFixed(2)}</Text>
                <Text size="14" c="dimmed">•</Text>
                <Text size="14" c="dimmed">Valor actual: ${periodPerformance.currentValue.toFixed(2)}</Text>
                <Text size="14" c="dimmed">•</Text>
                <Text size="14" c={periodPerformance.isPositive ? 'teal' : 'red'} fw={500}>
                  Cambio: {periodPerformance.isPositive ? '+' : ''}{periodPerformance.changePercent.toFixed(2)}%
                </Text>
              </>
            )}
          </Group>
        </Paper>
      )}

      {/* Tokens Breakdown */}
      <div>
        <Title order={3} c="white" mb="md">Mis Tokens</Title>
        {portfolio?.tokens && portfolio.tokens.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {portfolio.tokens.map((item: any, index: number) => {
              const tokenData = item;
              const firstToken = tokenData.tokens[0];
              const tokenChange24h = firstToken.change_24h_percent || 0;
              const tokenChangePositive = tokenChange24h >= 0;

              return (
                <Paper
                  key={`token-${firstToken.symbol}-${index}`}
                  p="lg"
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
                >
                  {/* Fila superior: icono, nombre, cambio y precio */}
                  <Group justify="space-between" mb="xs">
                    <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <IconCoin size={20} color="white" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text size="15" fw={600} c="white" truncate>{firstToken.symbol}</Text>
                        <Text size="11" c="dimmed" truncate>{firstToken.name}</Text>
                      </div>
                    </Group>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <Text size="15" fw={700} c="white" lh={1}>
                        <PrivacyValue value={tokenData.value_usd || 0} />
                      </Text>
                      <Group gap={4} justify="flex-end" style={{ marginTop: '2px' }}>
                        {tokenChangePositive ? (
                          <IconTrendingUp size={12} color="#4ade80" />
                        ) : (
                          <IconTrendingDown size={12} color="#f87171" />
                        )}
                        <Text size="11" fw={600} c={tokenChangePositive ? '#4ade80' : '#f87171'} lh={1}>
                          {tokenChangePositive ? '+' : ''}{tokenChange24h.toFixed(2)}%
                        </Text>
                      </Group>
                    </div>
                  </Group>

                  {/* Fila inferior: balance y porcentaje del portfolio */}
                  <Group justify="space-between">
                    <Text size="12" c="dimmed">
                      {(tokenData.balance || 0).toFixed(4)} {firstToken.symbol}
                    </Text>
                    <Badge
                      color={tokenData.value_usd / portfolio.total_value_usd > 0.1 ? 'blue' : 'gray'}
                      radius="sm"
                      variant="light"
                      size="sm"
                    >
                    {((tokenData.value_usd / portfolio.total_value_usd) * 100).toFixed(1)}%
                    </Badge>
                  </Group>
                </Paper>
              );
            })}
          </div>
        ) : (
          <Paper p="xl" radius="sm" withBorder sx={{ backgroundColor: '#141719', borderColor: '#1f2326' }}>
            <Text c="dimmed" ta="center">No tienes tokens en tu portafolio. Añade tokens a tus wallets para empezar.</Text>
          </Paper>
        )}
      </div>

      {/* Price Charts Section */}
      <div>
        <Title order={3} c="white" mb="md">Gráficos de Precios</Title>

        <Tabs defaultValue={CATEGORIES.CRYPTO}>
          <Tabs.List>
            <Tabs.Tab value={CATEGORIES.CRYPTO}>Criptomonedas</Tabs.Tab>
            <Tabs.Tab value={CATEGORIES.COMMODITIES}>Metales Preciosos</Tabs.Tab>
            <Tabs.Tab value={CATEGORIES.FIAT}>Monedas Fiat</Tabs.Tab>
          </Tabs.List>

          {/* Criptomonedas */}
          <Tabs.Panel value={CATEGORIES.CRYPTO}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(600px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {tokens?.filter((token: any) => {
                // Solo crypto (no commodities ni fiat)
                return token.token_chains && token.token_chains.some((tc: any) =>
                  tc.tradingview_symbol &&
                  !VIRTUAL_CHAINS[CATEGORIES.COMMODITIES].includes(tc.chain) &&
                  !VIRTUAL_CHAINS[CATEGORIES.FIAT].includes(tc.chain)
                );
              }).map((token: any) => {
                const tradingviewSymbol = token.token_chains.find((tc: any) => tc.tradingview_symbol)?.tradingview_symbol;
                if (!tradingviewSymbol) return null;

                return (
                  <TradingViewChart
                    key={token.id}
                    symbol={tradingviewSymbol}
                    tokenName={token.name}
                    tokenSymbol={token.symbol}
                  />
                );
              })}
            </div>
          </Tabs.Panel>

          {/* Metales Preciosos */}
          <Tabs.Panel value={CATEGORIES.COMMODITIES}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(600px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {tokens?.filter((token: any) => {
                // Solo commodities
                return token.token_chains && token.token_chains.some((tc: any) =>
                  tc.tradingview_symbol &&
                  VIRTUAL_CHAINS[CATEGORIES.COMMODITIES].includes(tc.chain)
                );
              }).map((token: any) => {
                const tradingviewSymbol = token.token_chains.find((tc: any) => tc.tradingview_symbol)?.tradingview_symbol;
                if (!tradingviewSymbol) return null;

                return (
                  <TradingViewChart
                    key={token.id}
                    symbol={tradingviewSymbol}
                    tokenName={token.name}
                    tokenSymbol={token.symbol}
                  />
                );
              })}
            </div>
          </Tabs.Panel>

          {/* Monedas Fiat */}
          <Tabs.Panel value={CATEGORIES.FIAT}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(600px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {tokens?.filter((token: any) => {
                // Solo fiat
                return token.token_chains && token.token_chains.some((tc: any) =>
                  tc.tradingview_symbol &&
                  VIRTUAL_CHAINS[CATEGORIES.FIAT].includes(tc.chain)
                );
              }).map((token: any) => {
                const tradingviewSymbol = token.token_chains.find((tc: any) => tc.tradingview_symbol)?.tradingview_symbol;
                if (!tradingviewSymbol) return null;

                return (
                  <TradingViewChart
                    key={token.id}
                    symbol={tradingviewSymbol}
                    tokenName={token.name}
                    tokenSymbol={token.symbol}
                  />
                );
              })}
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </Stack>
  );
}
