import { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Badge,
  Title,
  Alert,
  Table,
  LoadingOverlay,
  Collapse,
  Switch,
} from '@mantine/core';
import {
  IconRefresh,
  IconCloudDownload,
  IconTrophy,
  IconWallet,
  IconCoin,
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle,
  IconClock,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserPoolPositions, syncUserPoolPositions, vfatKeys, type PoolPosition } from '../api/vfat';
import { useFastRefresh } from '../hooks/useFastRefresh';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatAPY = (apy: number) => {
  if (apy >= 100) return `${apy.toFixed(0)}%`;
  if (apy >= 10) return `${apy.toFixed(1)}%`;
  return `${apy.toFixed(2)}%`;
};

// Position Row Component
const PositionRow = ({ position }: { position: PoolPosition }) => {
  const [expanded, setExpanded] = useState(false);

  const poolTypeColor = position.pool.pool_type === 'farm' ? 'yellow' : 'blue';
  const poolTypeLabel = position.pool.pool_type === 'farm' ? 'Farming' : 'Pool';

  // Determinar si está en rango desde el backend (calculado con ticks)
  const inRange = position.in_range === true;
  const hasPendingRewards = position.pending_rewards && position.pending_rewards.length > 0;
  const totalRewardsValue = position.pending_rewards?.reduce((sum, r) => sum + r.value_usd, 0) || 0;

  // Calcular tiempo desde último sync
  const lastSyncTime = new Date(position.last_synced_at).getTime();
  const now = Date.now();
  const secondsAgo = Math.floor((now - lastSyncTime) / 1000);
  const timeAgoStr = secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}m`;
  const isStale = secondsAgo > 60; // Más de 1 minuto = datos obsoletos

  // Formatear rewards para mostrar
  const rewardsText = totalRewardsValue > 0
    ? (totalRewardsValue >= 1 ? `$${totalRewardsValue.toFixed(2)}` : `$${totalRewardsValue.toFixed(3)}`)
    : '$0.00';

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <td>
          <Stack spacing={0}>
            <Group spacing="xs">
              <Text size="sm" fw={600} c="white">
                {position.pool.protocol}
              </Text>
              <Badge size="xs" color={poolTypeColor} variant="light">
                {poolTypeLabel}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">{position.pool.name}</Text>
          </Stack>
        </td>
        <td>
          <Badge size="xs" color="blue" variant="light">
            {position.pool.chain}
          </Badge>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text fw={600} c="white" size="lg">
            {formatCurrency(position.user_balance_usd)}
          </Text>
          <Text size="xs" c="dimmed">
            {position.pool_share.toFixed(4)}% del pool
          </Text>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Group spacing={4} position="right" noWrap>
            <IconTrophy size={14} color={totalRewardsValue > 0 ? '#4ade80' : '#6b7280'} />
            <Text fw={700} c={totalRewardsValue > 0 ? '#4ade80' : '#6b7280'} size="sm">
              {rewardsText}
            </Text>
          </Group>
          {hasPendingRewards && position.pending_rewards.length > 0 && (
            <Text size="xs" c="dimmed" mt={2}>
              {position.pending_rewards.map(r => r.symbol).join(' + ')}
            </Text>
          )}
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text fw={700} c="#4ade80" size="sm">
            {formatAPY(position.pool.apy)}
          </Text>
        </td>
        <td style={{ textAlign: 'center' }}>
          <Badge
            size="lg"
            color={inRange ? 'green' : 'red'}
            variant={inRange ? 'filled' : 'light'}
            leftSection={inRange ? <IconTrophy size={14} /> : <IconAlertTriangle size={14} />}
          >
            {inRange ? 'EN RANGO' : 'FUERA RANGO'}
          </Badge>
        </td>
        <td style={{ textAlign: 'center' }}>
          <Text size="sm" c={isStale ? 'red' : 'dimmed'}>{timeAgoStr}</Text>
        </td>
        <td style={{ textAlign: 'center' }}>
          <Group spacing={4} position="center" noWrap>
            <IconWallet size={16} color="#909296" />
            <Text size="xs" c="dimmed">
              {position.wallet_address.slice(0, 8)}...{position.wallet_address.slice(-6)}
            </Text>
          </Group>
        </td>
        <td style={{ textAlign: 'center' }}>
          {expanded ? (
            <IconChevronUp size={18} color="#909296" />
          ) : (
            <IconChevronDown size={18} color="#909296" />
          )}
        </td>
      </tr>

      {/* Expandable Details */}
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, backgroundColor: '#0d0f12' }}>
            <Collapse in={expanded}>
              <Stack p="md" spacing="sm">
                {/* Pool Details */}
                <Group spacing="xl">
                  <Stack spacing={4}>
                    <Text size="xs" c="dimmed">Dirección Pool</Text>
                    <Text size="sm" c="white" style={{ fontFamily: 'monospace' }}>
                      {position.pool.pool_address.slice(0, 10)}...{position.pool.pool_address.slice(-8)}
                    </Text>
                  </Stack>
                  {position.pool.farm_address && (
                    <Stack spacing={4}>
                      <Text size="xs" c="dimmed">Dirección Farm</Text>
                      <Text size="sm" c="white" style={{ fontFamily: 'monospace' }}>
                        {position.pool.farm_address.slice(0, 10)}...{position.pool.farm_address.slice(-8)}
                      </Text>
                    </Stack>
                  )}
                  <Stack spacing={4}>
                    <Text size="xs" c="dimmed">Tipo</Text>
                    <Text size="sm" c="white">{position.pool.farm_type || 'N/A'}</Text>
                  </Stack>
                </Group>

                {/* User Tokens */}
                {position.user_tokens && position.user_tokens.length > 0 && (
                  <>
                    <Text size="sm" fw={600} c="white">Tokens en el Pool</Text>
                    <Table striped highlightOnHover withBorder withColumnBorders size="sm">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th style={{ textAlign: 'right' }}>Cantidad</th>
                          <th style={{ textAlign: 'right' }}>Valor USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {position.user_tokens.map((token, idx) => (
                          <tr key={idx}>
                            <td>
                              <Group spacing="xs">
                                <IconCoin size={14} />
                                <Text size="sm" c="white">{token.symbol}</Text>
                              </Group>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Text size="sm" c="white">{parseFloat(token.amount).toFixed(6)}</Text>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Text size="sm" fw={600} c="white">{formatCurrency(token.value_usd)}</Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}

                {/* Pending Rewards & Range Status */}
                {position.pending_rewards && position.pending_rewards.length > 0 ? (
                  <>
                    <Group spacing="md" align="center">
                      <Badge size="xl" color="green" variant="filled" leftSection={<IconTrophy size={18} />}>
                        EN RANGO
                      </Badge>
                      <Text size="sm" c="dimmed">Tu posición está generando rewards</Text>
                    </Group>

                    <Text size="sm" fw={600} c="white">Rewards Acumulados</Text>
                    <Group spacing="sm">
                      {position.pending_rewards.map((reward, idx) => (
                        <Badge key={idx} size="lg" color="green" variant="light" leftSection={<IconTrophy size={14} />}>
                          {parseFloat(reward.amount).toFixed(4)} {reward.symbol} ≈ {formatCurrency(reward.value_usd)}
                        </Badge>
                      ))}
                      <Badge size="lg" color="green" variant="outline">
                        Total: {formatCurrency(totalRewardsValue)}
                      </Badge>
                    </Group>
                  </>
                ) : (
                  <>
                    <Group spacing="md" align="center">
                      <Badge size="xl" color="red" variant="light" leftSection={<IconAlertTriangle size={18} />}>
                        FUERA DE RANGO
                      </Badge>
                      <Text size="sm" c="dimmed">Tu posición NO está generando rewards</Text>
                    </Group>
                    <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                      <Text size="sm">
                        Tu posición está fuera del rango de precios actual. Mueve tu posición para empezar a generar rewards nuevamente.
                      </Text>
                    </Alert>
                  </>
                )}

                {/* Last Sync */}
                <Group spacing="xs" mt="xs">
                  <IconClock size={12} color="#909296" />
                  <Text size="xs" c="dimmed">
                    Última sync: {new Date(position.last_synced_at).toLocaleString('es-ES')}
                  </Text>
                </Group>
              </Stack>
            </Collapse>
          </td>
        </tr>
      )}
    </>
  );
};

export function PoolPositions() {
  const queryClient = useQueryClient();
  // Cargar preferencia desde localStorage
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('poolPositions_autoSync');
    return saved !== null ? saved === 'true' : true;
  });

  // Guardar preferencia en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('poolPositions_autoSync', String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  // Fast refresh - cada 15 segundos
  const { data: positionsData, isLoading, error, refetch } = useFastRefresh(
    vfatKeys.positions(),
    getUserPoolPositions,
    {},
    15000 // 15 segundos
  );

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncUserPoolPositions,
    onSuccess: () => {
      // Refrescar posiciones después de sync
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: vfatKeys.positions() });
      }, 1000);
    },
  });

  // Ref para almacenar el intervalo y poder limpiarlo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-sync desde vfat.io cada 30 segundos para datos muy frescos
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!autoSyncEnabled) {
      console.log('[PoolPositions] Auto-sync desactivado');
      return;
    }

    console.log('[PoolPositions] Iniciando auto-sync desde vfat.io cada 30s...');

    // Esperar 2 segundos antes del primer sync para no saturar
    const initialSyncTimer = setTimeout(() => {
      if (autoSyncEnabled) {
        console.log('[PoolPositions] Sync inicial desde vfat.io...');
        syncMutation.mutate();
      }
    }, 2000);

    // Luego cada 30 segundos
    intervalRef.current = setInterval(() => {
      if (autoSyncEnabled && !syncMutation.isPending) {
        console.log('[PoolPositions] Auto-syncing from vfat.io...');
        syncMutation.mutate();
      }
    }, 30000);

    return () => {
      clearTimeout(initialSyncTimer);
      if (intervalRef.current) {
        console.log('[PoolPositions] Limpiando intervalo de auto-sync');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoSyncEnabled]); // Reaccionar a cambios del toggle

  const handleSync = () => {
    syncMutation.mutate();
  };

  const positions = positionsData?.positions || [];
  const stats = positionsData?.stats;
  const wallets = positionsData?.positions_by_wallet || {};

  return (
    <Stack spacing="md">
      {/* Header */}
      <Group position="apart" align="center">
        <div>
          <Group spacing="xs" align="center">
            <Title order={3} c="white">
              Mis Posiciones en Pools
            </Title>
            {syncMutation.isPending && (
              <Badge size="sm" color="blue" variant="light">
                Sync desde vfat.io...
              </Badge>
            )}
            {!autoSyncEnabled && (
              <Badge size="sm" color="gray" variant="light">
                Auto-sync OFF
              </Badge>
            )}
          </Group>
          <Group spacing="md" mt={8} align="center">
            <Switch
              label="Auto-sync"
              description={autoSyncEnabled ? "Cada 30 segundos" : "Pausado"}
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.currentTarget.checked)}
              color={autoSyncEnabled ? "teal" : "gray"}
              size="xs"
            />
            <Text size="xs" c="dimmed">
              {autoSyncEnabled
                ? "Sincronización automática activada"
                : "Sincronización pausada - usa el botón de sync manual"}
            </Text>
          </Group>
        </div>
        <Group spacing="xs">
          <Button
            onClick={() => refetch()}
            loading={isLoading}
            variant="light"
            size="sm"
            title="Refrescar desde BD"
          >
            <IconRefresh size={16} />
          </Button>
        </Group>
      </Group>

      {/* Sync Button */}
      <Paper
        p="md"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Group position="apart">
          <Group spacing="sm">
            <IconCloudDownload size={20} color="#667eea" />
            <div>
              <Text size="sm" fw={600} c="white">
                Sincronizar Posiciones desde vfat.io
              </Text>
              <Text size="xs" c="dimmed">
                Escanea todas tus wallets en busca de posiciones en pools
              </Text>
            </div>
          </Group>
          <Button
            onClick={handleSync}
            loading={syncMutation.isPending}
            disabled={syncMutation.isSuccess}
            size="sm"
          >
            <Group spacing="xs">
              <IconCloudDownload size={16} />
              <span>Sincronizar Ahora</span>
            </Group>
          </Button>
        </Group>
        {syncMutation.isError && (
          <Alert color="red" mt="sm" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">Error al sincronizar posiciones. Intenta de nuevo.</Text>
          </Alert>
        )}
      </Paper>

      {/* Error State */}
      {error && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Error al cargar posiciones"
          color="red"
        >
          <Text size="sm">No se pudieron cargar las posiciones. Intenta sincronizar nuevamente.</Text>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          <Paper
            p="md"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Group spacing="sm">
              <IconTrophy size={20} color="#4ade80" />
              <div>
                <Text size="11" c="dimmed" tt="uppercase">Valor Total</Text>
                <Text size="20" fw={700} c="white">
                  {formatCurrency(stats.total_value_usd)}
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            p="md"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Group spacing="sm">
              <IconWallet size={20} color="#667eea" />
              <div>
                <Text size="11" c="dimmed" tt="uppercase">Posiciones</Text>
                <Text size="20" fw={700} c="white">
                  {stats.total_positions}
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            p="md"
            radius="sm"
            withBorder
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            <Group spacing="sm">
              <IconCoin size={20} color="#f59e0b" />
              <div>
                <Text size="11" c="dimmed" tt="uppercase">Wallets con Posiciones</Text>
                <Text size="20" fw={700} c="white">
                  {stats.wallets_with_positions} / {stats.wallets_checked}
                </Text>
              </div>
            </Group>
          </Paper>
        </div>
      )}

      {/* Positions Table */}
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          position: 'relative',
        }}
      >
        <LoadingOverlay visible={isLoading} />

        {positions.length === 0 && !isLoading ? (
          <Stack spacing="md" align="center" py="xl">
            <IconCloudDownload size={48} color="#909296" />
            <Text size="lg" c="dimmed">No tienes posiciones en pools</Text>
            <Text size="sm" c="dimmed" ta="center">
              Sincroniza tus wallets para descubrir posiciones en pools de liquidez y farming
            </Text>
            <Button onClick={handleSync} loading={syncMutation.isPending} size="sm">
              Sincronizar Ahora
            </Button>
          </Stack>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withBorder withColumnBorders>
              <thead>
                <tr>
                  <th>Pool / Protocolo</th>
                  <th>Chain</th>
                  <th style={{ textAlign: 'right' }}>Mi Inversión</th>
                  <th style={{ textAlign: 'right' }}>Rewards</th>
                  <th style={{ textAlign: 'right' }}>APY</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Sync</th>
                  <th style={{ textAlign: 'center' }}>Wallet</th>
                  <th style={{ textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <PositionRow key={position.id} position={position} />
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Paper>

      {/* Last Update Info */}
      {positionsData?.last_sync_at && (
        <Paper p="xs" radius="sm" withBorder sx={{ backgroundColor: '#0d0f12', borderColor: '#1f2326' }}>
          <Group position="center" spacing="xl">
            <Group spacing="xs">
              <IconClock size={12} color="#909296" />
              <Text size="xs" c="dimmed">
                Front refresco: {new Date().toLocaleTimeString('es-ES')}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">•</Text>
            <Group spacing="xs">
              <IconCloudDownload size={12} color="#909296" />
              <Text size="xs" c="dimmed">
                Último sync vfat.io: {new Date(positionsData.last_sync_at).toLocaleString('es-ES')}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">•</Text>
            <Text size="xs" c="dimmed">
              {positionsData.data_source}
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
