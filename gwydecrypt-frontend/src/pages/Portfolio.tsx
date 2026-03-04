import { useState, useMemo } from 'react';
import { Title, Paper, Stack, Text, Group, Grid, Badge, Button, SimpleGrid, Tabs } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconWallet, IconCoin, IconRefresh, IconClock, IconCamera } from '@tabler/icons-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { PrivacyValue } from '../components/PrivacyValue';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePeriodPersistence } from '../hooks/usePeriodPersistence';
import { PositionsView } from '../components/PositionsView';

const COLORS = ['#667eea', '#4facfe', '#f093fb', '#fa709a', '#fee140', '#00f2fe', '#fa709a'];

export default function Portfolio() {
  const [period, setPeriod] = usePeriodPersistence('portfolio', '1w');
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const queryClient = useQueryClient();

  // Setup auto-refresh
  useAutoRefresh({
    queryKeys: [['portfolio'], ['portfolio', 'history'], ['portfolio-distribution'], ['positions']],
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

  const { data: distribution } = useQuery({
    queryKey: ['portfolio-distribution'],
    queryFn: async () => {
      const response = await api.get('/portfolio/distribution');
      return response.data.distribution;
    },
  });

  const { data: dailyChange } = useQuery({
    queryKey: ['portfolio', 'daily-change'],
    queryFn: async () => {
      const response = await api.get('/portfolio/change/daily');
      return response.data.change;
    },
  });

  const { data: weeklyChange } = useQuery({
    queryKey: ['portfolio', 'weekly-change'],
    queryFn: async () => {
      const response = await api.get('/portfolio/change/weekly');
      return response.data.change;
    },
  });

  const { data: monthlyChange } = useQuery({
    queryKey: ['portfolio', 'monthly-change'],
    queryFn: async () => {
      const response = await api.get('/portfolio/change/monthly');
      return response.data.change;
    },
  });

  const { data: bestPerformers } = useQuery({
    queryKey: ['portfolio', 'best-performers'],
    queryFn: async () => {
      const response = await api.get('/portfolio/performers/best?limit=5');
      return response.data.performers;
    },
  });

  const { data: worstPerformers } = useQuery({
    queryKey: ['portfolio', 'worst-performers'],
    queryFn: async () => {
      const response = await api.get('/portfolio/performers/worst?limit=5');
      return response.data.performers;
    },
  });

  const { data: marketComparison } = useQuery({
    queryKey: ['portfolio', 'compare-market'],
    queryFn: async () => {
      const response = await api.get('/portfolio/compare-market');
      return response.data.comparison;
    },
  });

  const handleRefresh = async () => {
    setIsUpdatingPrices(true);
    try {
      // First update prices
      await api.post('/portfolio/update-prices');

      // Then refetch all data
      await refetchPortfolio();
      await queryClient.invalidateQueries({ queryKey: ['portfolio-distribution'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'history'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'daily-change'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'weekly-change'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'monthly-change'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'best-performers'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'worst-performers'] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'compare-market'] });
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

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const response = await api.post('/portfolio/create-snapshot');

      // Invalidate history queries
      await queryClient.invalidateQueries({ queryKey: ['portfolio', 'history'] });

      notifications.show({
        title: 'Éxito',
        message: `Snapshot creado: ${new Date(response.data.snapshot.snapshot_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al crear snapshot',
        color: 'red',
      });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Calculate 24h change
  const change24h = portfolio?.tokens?.reduce((acc: number, token: any) => acc + (token.change_24h_percent || 0), 0) || 0;
  const change24hPositive = change24h >= 0;

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

  // Prepare data for charts - add current value at the end
  const historyData = useMemo(() => {
    const snapshotData = history?.map((h: any) => ({
      date: new Date(h.snapshot_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      value: typeof h.total_value_usd === 'number' ? h.total_value_usd : parseFloat(h.total_value_usd) || 0,
    })) || [];

    // Add current portfolio value as the last point
    if (portfolio && snapshotData.length > 0) {
      const lastDate = new Date();
      const hasDataToday = snapshotData.some((d: any) =>
        d.date === lastDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      );

      // Only add current value if there's no snapshot from today
      if (!hasDataToday) {
        snapshotData.push({
          date: 'Hoy',
          value: typeof portfolio.total_value_usd === 'number' ? portfolio.total_value_usd : parseFloat(portfolio.total_value_usd) || 0,
        });
      }
    }

    return snapshotData;
  }, [history, portfolio]);

  const distributionByToken = distribution?.by_token?.map((item: any) => ({
    name: item.symbol,
    value: typeof item.value_usd === 'number' ? item.value_usd : parseFloat(item.value_usd) || 0,
    percentage: typeof item.percentage === 'number' ? item.percentage : parseFloat(item.percentage) || 0,
  })) || [];

  const distributionByChain = distribution?.by_chain?.map((item: any) => ({
    name: item.chain,
    value: typeof item.value_usd === 'number' ? item.value_usd : parseFloat(item.value_usd) || 0,
    percentage: typeof item.percentage === 'number' ? item.percentage : parseFloat(item.percentage) || 0,
  })) || [];

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2} c="white">Gestión de Portafolio</Title>
        <Group gap="xs">
          <Button
            onClick={handleCreateSnapshot}
            loading={isCreatingSnapshot}
            variant="light"
            color="blue"
            radius="sm"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCamera size={16} />
              <span>Snapshot</span>
            </div>
          </Button>
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
      </Group>

      <Tabs defaultValue="portfolio" variant="outline" radius="sm">
        <Tabs.List>
          <Tabs.Tab value="portfolio">
            <Group gap="xs">
              <IconWallet size={16} />
              <span>Portafolio</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="investments">
            <Group gap="xs">
              <IconCoin size={16} />
              <span>Inversiones (DCA)</span>
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="portfolio" pt="xl">
          <Stack gap="xl">
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Group justify="space-between" align="center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Text size="sm" c="dimmed">Valor Actual del Portafolio</Text>
              {lastUpdateText && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={12} color="#909296" />
                  <Text size="10" c="dimmed">{lastUpdateText}</Text>
                </div>
              )}
            </div>
            <Text size="48" fw={700} c="white" lh={1} sx={{ letterSpacing: '-1px' }}>
              <PrivacyValue value={portfolio?.total_value_usd || 0} />
            </Text>
          </div>
          {change24h !== 0 && (
            <div style={{ textAlign: 'right' }}>
              <Text size="xs" c="dimmed" mb={4}>Últimas 24h</Text>
              <Badge
                leftSection={change24hPositive ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                color={change24hPositive ? 'teal' : 'red'}
                variant="light"
                radius="sm"
                size="lg"
              >
                {change24hPositive ? '+' : ''}{change24h.toFixed(2)}%
              </Badge>
            </div>
          )}
        </Group>
      </Paper>

      {/* Portfolio Evolution Chart */}
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
          <div>
            <Text size="18" fw={600} c="white">Evolución del Portafolio</Text>
            {historyData.length > 0 && periodPerformance && (
              <Group gap="xs" mt="xs">
                <Badge
                  leftSection={periodPerformance.isPositive ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                  color={periodPerformance.isPositive ? 'teal' : 'red'}
                  variant="light"
                  radius="sm"
                >
                  {periodPerformance.isPositive ? '+' : ''}{periodPerformance.changePercent.toFixed(2)}%
                </Badge>
                <Text size="12" c="dimmed">
                  {periodPerformance.initialValue.toFixed(2)} → {periodPerformance.currentValue.toFixed(2)}
                </Text>
              </Group>
            )}
          </div>
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
        {historyData.length > 0 ? (
          <>
            <Text size="24" fw={700} c="white" mb="md">
              ${historyData[historyData.length - 1].value.toFixed(2)}
            </Text>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2326" />
                <XAxis dataKey="date" stroke="#909296" />
                <YAxis stroke="#909296" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141719', border: '1px solid #1f2326', borderRadius: '8px' }}
                  labelStyle={{ color: '#909296' }}
                  formatter={(value: any, name: any, props: any) => {
                    if (name === 'date') {
                      return [value, 'Fecha'];
                    }
                    if (typeof value === 'number') {
                      return [`$${value.toFixed(2)}`, 'Valor'];
                    }
                    try {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        return [`$${numValue.toFixed(2)}`, 'Valor'];
                      }
                    } catch (e) {
                      // Ignore error
                    }
                    return [value, 'Valor'];
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={{ fill: '#667eea' }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <Text ta="center" c="dimmed" py="xl">No hay datos históricos disponibles</Text>
        )}
      </Paper>

      {/* Performance Metrics */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Paper
          p="lg"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#141719',
            borderColor: '#1f2326',
          }}
        >
          <Group justify="space-between" mb="sm">
            <Text size="14" c="dimmed" fw={500}>Cambio Diario</Text>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <IconCoin size={16} color="white" />
            </div>
          </Group>
          <Group gap="xs">
            {dailyChange >= 0 ? (
              <IconTrendingUp size={20} color="#4ade80" />
            ) : (
              <IconTrendingDown size={20} color="#f87171" />
            )}
            <Text size="24" fw={700} c={dailyChange >= 0 ? '#4ade80' : '#f87171'}>
              {dailyChange >= 0 ? '+' : ''}{(dailyChange || 0).toFixed(2)}%
            </Text>
          </Group>
        </Paper>

        <Paper
          p="lg"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#141719',
            borderColor: '#1f2326',
          }}
        >
          <Group justify="space-between" mb="sm">
            <Text size="14" c="dimmed" fw={500}>Cambio Semanal</Text>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <IconCoin size={16} color="white" />
            </div>
          </Group>
          <Group gap="xs">
            {weeklyChange >= 0 ? (
              <IconTrendingUp size={20} color="#4ade80" />
            ) : (
              <IconTrendingDown size={20} color="#f87171" />
            )}
            <Text size="24" fw={700} c={weeklyChange >= 0 ? '#4ade80' : '#f87171'}>
              {weeklyChange >= 0 ? '+' : ''}{(weeklyChange || 0).toFixed(2)}%
            </Text>
          </Group>
        </Paper>

        <Paper
          p="lg"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#141719',
            borderColor: '#1f2326',
          }}
        >
          <Group justify="space-between" mb="sm">
            <Text size="14" c="dimmed" fw={500}>Cambio Mensual</Text>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <IconCoin size={16} color="white" />
            </div>
          </Group>
          <Group gap="xs">
            {monthlyChange >= 0 ? (
              <IconTrendingUp size={20} color="#4ade80" />
            ) : (
              <IconTrendingDown size={20} color="#f87171" />
            )}
            <Text size="24" fw={700} c={monthlyChange >= 0 ? '#4ade80' : '#f87171'}>
              {monthlyChange >= 0 ? '+' : ''}{(monthlyChange || 0).toFixed(2)}%
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Distribution Charts */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Text size="16" fw={600} c="white" mb="md">Distribución por Token</Text>
            {distributionByToken.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={distributionByToken}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {distributionByToken.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => {
                      const numValue = typeof value === 'number' ? value : parseFloat(value);
                      return isNaN(numValue) ? `$0.00` : `$${numValue.toFixed(2)}`;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack gap="xs" mt="md">
                  {distributionByToken.map((item: any, index: number) => (
                    <Group key={item.name} justify="space-between">
                      <Group gap="xs">
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                        <Text size="13" c="white">{item.name}</Text>
                      </Group>
                      <Group gap="md">
                        <Text size="13" c="dimmed">{item.percentage.toFixed(1)}%</Text>
                        <Text size="13" c="white" fw={500}>${item.value.toFixed(2)}</Text>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No hay datos de distribución</Text>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Text size="16" fw={600} c="white" mb="md">Distribución por Blockchain</Text>
            {distributionByChain.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={distributionByChain}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {distributionByChain.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => {
                      const numValue = typeof value === 'number' ? value : parseFloat(value);
                      return isNaN(numValue) ? `$0.00` : `$${numValue.toFixed(2)}`;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack gap="xs" mt="md">
                  {distributionByChain.map((item: any, index: number) => (
                    <Group key={item.name} justify="space-between">
                      <Group gap="xs">
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                        <Text size="13" c="white">{item.name}</Text>
                      </Group>
                      <Group gap="md">
                        <Text size="13" c="dimmed">{item.percentage.toFixed(1)}%</Text>
                        <Text size="13" c="white" fw={500}>${item.value.toFixed(2)}</Text>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No hay datos de distribución</Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Performers */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Group gap="xs" mb="md">
              <IconTrendingUp size={20} color="#4ade80" />
              <Text size="16" fw={600} c="white">Mejores Performers</Text>
            </Group>
            <Stack gap="sm">
              {bestPerformers && bestPerformers.length > 0 ? (
                bestPerformers.map((performer: any) => (
                  <Group key={performer.token?.id} justify="space-between" p="xs" sx={{
                    backgroundColor: '#0d0f12',
                    borderRadius: '6px',
                  }}>
                    <Group gap="xs">
                      <IconCoin size={16} color="#909296" />
                      <Text size="14" c="white">{performer.token?.symbol}</Text>
                    </Group>
                    <Badge color="teal" variant="light" radius="sm">
                      +{performer.change_percent?.toFixed(2)}%
                    </Badge>
                  </Group>
                ))
              ) : (
                <Text size="13" c="dimmed">No hay datos disponibles</Text>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper
            p="lg"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Group gap="xs" mb="md">
              <IconTrendingDown size={20} color="#f87171" />
              <Text size="16" fw={600} c="white">Peores Performers</Text>
            </Group>
            <Stack gap="sm">
              {worstPerformers && worstPerformers.length > 0 ? (
                worstPerformers.map((performer: any) => (
                  <Group key={performer.token?.id} justify="space-between" p="xs" sx={{
                    backgroundColor: '#0d0f12',
                    borderRadius: '6px',
                  }}>
                    <Group gap="xs">
                      <IconCoin size={16} color="#909296" />
                      <Text size="14" c="white">{performer.token?.symbol}</Text>
                    </Group>
                    <Badge color="red" variant="light" radius="sm">
                      {performer.change_percent?.toFixed(2)}%
                    </Badge>
                  </Group>
                ))
              ) : (
                <Text size="13" c="dimmed">No hay datos disponibles</Text>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Market Comparison */}
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Text size="16" fw={600} c="white" mb="md">Comparación con el Mercado (7 días)</Text>
        <Group gap="xl">
          <div>
            <Text size="13" c="dimmed">Tu Portafolio</Text>
            <Group gap="xs">
              {marketComparison?.portfolio_change_7d >= 0 ? (
                <IconTrendingUp size={18} color="#4ade80" />
              ) : (
                <IconTrendingDown size={18} color="#f87171" />
              )}
              <Text size="20" fw={700} c={marketComparison?.portfolio_change_7d >= 0 ? '#4ade80' : '#f87171'}>
                {marketComparison?.portfolio_change_7d >= 0 ? '+' : ''}{(marketComparison?.portfolio_change_7d || 0).toFixed(2)}%
              </Text>
            </Group>
          </div>
          <div>
            <Text size="13" c="dimmed">Mercado (BTC+ETH)</Text>
            <Group gap="xs">
              {marketComparison?.market_change_7d >= 0 ? (
                <IconTrendingUp size={18} color="#4ade80" />
              ) : (
                <IconTrendingDown size={18} color="#f87171" />
              )}
              <Text size="20" fw={700} c={marketComparison?.market_change_7d >= 0 ? '#4ade80' : '#f87171'}>
                {marketComparison?.market_change_7d >= 0 ? '+' : ''}{(marketComparison?.market_change_7d || 0).toFixed(2)}%
              </Text>
            </Group>
          </div>
          <div>
            <Text size="13" c="dimmed">Rendimiento vs Mercado</Text>
            <Group gap="xs">
              {marketComparison?.outperformance >= 0 ? (
                <IconTrendingUp size={18} color="#4ade80" />
              ) : (
                <IconTrendingDown size={18} color="#f87171" />
              )}
              <Text size="20" fw={700} c={marketComparison?.outperformance >= 0 ? '#4ade80' : '#f87171'}>
                {marketComparison?.outperformance >= 0 ? '+' : ''}{(marketComparison?.outperformance || 0).toFixed(2)}%
              </Text>
            </Group>
          </div>
        </Group>
      </Paper>
      </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="investments" pt="xl">
          <PositionsView />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
