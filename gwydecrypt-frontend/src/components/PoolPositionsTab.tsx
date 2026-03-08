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
  Progress,
  Tooltip,
  Tabs,
  Box,
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
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconHistory,
  IconScale,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserPoolPositions,
  syncUserPoolPositions,
  getClosedPositions,
  syncClosedPositions,
  vfatKeys,
  type PoolPosition,
  type ClosedPosition,
} from '../api/vfat';
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

// Format time in position
const formatTimeInPosition = (ageInDays: number | null, positionSince: string | null) => {
  if (!ageInDays || !positionSince) return null;

  const days = Math.floor(ageInDays);
  const hours = Math.floor((ageInDays % 1) * 24);
  const minutes = Math.floor(((ageInDays % 1) * 24 % 1) * 60);

  if (days === 0 && hours === 0) {
    return `${minutes} min`;
  } else if (days === 0) {
    return `${hours}h ${minutes}m`;
  } else if (days < 30) {
    return `${days}d ${hours}h`;
  } else {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return months > 0 ? `${months}m ${remainingDays}d` : `${days}d`;
  }
};

// Range Indicator Props
interface RangeIndicatorProps {
  tickLow: number | null;
  tickUp: number | null;
  currentTick: number | null;
  inRange: boolean | null;
}

// Helper function to calculate range status
const calculateRangeStatus = (tickLow: number, tickUp: number, currentTick: number, inRange: boolean) => {
  const range = tickUp - tickLow;
  const position = currentTick - tickLow;
  const percentage = Math.max(0, Math.min(100, (position / range) * 100));

  let color = '#4ade80'; // green
  let statusText = 'Zona segura';
  let statusLevel = 'safe';

  if (!inRange) {
    color = '#ef4444'; // red
    statusText = 'Fuera de rango';
    statusLevel = 'out';
  } else if (percentage < 30 || percentage > 70) {
    color = '#fbbf24'; // yellow
    statusText = 'Cerca del límite';
    statusLevel = 'warning';
  }

  return { percentage, color, statusText, statusLevel };
};

// Calculate estimated earnings based on APY and time in position
const calculateEstimatedEarnings = (apy: number, ageInDays: number | null, currentValue: number) => {
  if (!ageInDays || ageInDays <= 0 || apy <= 0) return null;

  // Simple estimate: APY * (days / 365) * average value
  // This is a rough estimate assuming constant value
  const timeInYears = ageInDays / 365;
  const estimatedEarnings = currentValue * (apy / 100) * timeInYears;

  return estimatedEarnings;
};

// Compact Range Indicator (horizontal bar with vertical line)
const RangeIndicatorCompact = ({ tickLow, tickUp, currentTick, inRange }: RangeIndicatorProps) => {
  if (tickLow === null || tickUp === null || currentTick === null) {
    return (
      <Tooltip label="Datos de rango no disponibles">
        <Text size="xs" c="dimmed">N/A</Text>
      </Tooltip>
    );
  }

  const { percentage, color } = calculateRangeStatus(tickLow, tickUp, currentTick, inRange || false);

  // Posición de la línea vertical (0-100%)
  // Si está fuera de rango por arriba, clamping al 100%
  // Si está fuera de rango por abajo, clamping al 0%
  const displayPosition = inRange
    ? percentage
    : currentTick > tickUp ? 100 : 0;

  return (
    <Tooltip
      label={
        <Stack spacing={0}>
          <Text size="xs" fw={600}>Rango: {tickLow.toLocaleString()} / {tickUp.toLocaleString()}</Text>
          <Text size="xs">Actual: {currentTick.toLocaleString()}</Text>
          <Text size="xs">Posición: {percentage.toFixed(1)}%</Text>
        </Stack>
      }
    >
      <div style={{ position: 'relative', width: '120px', height: '30px', margin: '0 auto' }}>
        {/* Barra horizontal de fondo (representa el rango completo) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '8px',
            backgroundColor: '#1f2937',
            borderRadius: '4px',
            transform: 'translateY(-50%)',
            border: '1px solid #374151',
          }}
        />

        {/* Línea vertical marcando la posición actual */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${displayPosition}%`,
            width: '3px',
            height: '24px',
            backgroundColor: color,
            transform: 'translate(-50%, -50%)',
            borderRadius: '2px',
            boxShadow: `0 0 8px ${color}, 0 0 4px ${color}`,
            transition: 'all 0.3s ease',
          }}
        />

        {/* Indicador si está fuera de rango */}
        {!inRange && (
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: `${currentTick > tickUp ? 100 : 0}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <IconAlertTriangle size={12} color="#ef4444" />
          </div>
        )}
      </div>
    </Tooltip>
  );
};

// Detailed Range Indicator (for expanded view)
const RangeIndicatorDetailed = ({ tickLow, tickUp, currentTick, inRange }: RangeIndicatorProps) => {
  if (tickLow === null || tickUp === null || currentTick === null) {
    return (
      <Alert color="gray">
        <Text size="sm">Datos de rango no disponibles</Text>
      </Alert>
    );
  }

  const { percentage, color, statusText } = calculateRangeStatus(tickLow, tickUp, currentTick, inRange || false);

  // Calcular distancias
  const range = tickUp - tickLow;
  const distanceFromLow = ((currentTick - tickLow) / range * 100);
  const distanceFromUp = ((tickUp - currentTick) / range * 100);

  // Posición visual (clamping si está fuera de rango)
  const displayPosition = inRange
    ? percentage
    : currentTick > tickUp ? 100 : 0;

  return (
    <Stack spacing="md">
      <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1f2937', borderColor: '#374151' }}>
        <Group position="apart" align="flex-start" spacing="xl">
          {/* Columna izquierda: Tick inferior y actual */}
          <Stack spacing="xs" style={{ minWidth: '120px' }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Tick Inferior</Text>
            <Text size="lg" c="#4ade80" fw={700}>{tickLow.toLocaleString()}</Text>

            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Tick Actual</Text>
            <Text size="xl" c="white" fw={700}>{currentTick.toLocaleString()}</Text>

            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Dist. Inferior</Text>
            <Text size="sm" c={distanceFromLow < 30 ? '#ef4444' : 'white'} fw={600}>
              {distanceFromLow.toFixed(1)}%
            </Text>
          </Stack>

          {/* Columna central: Barra horizontal */}
          <div style={{ position: 'relative', width: '300px', height: '120px' }}>
            {/* Etiqueta de tick superior arriba de la barra */}
            <Group position="center" mb="xs">
              <Stack spacing={0} align="center">
                <Text size="xs" c="#4ade80" fw={600}>Tick Superior</Text>
                <Text size="lg" c="#4ade80" fw={700}>{tickUp.toLocaleString()}</Text>
              </Stack>
            </Group>

            {/* Barra horizontal principal */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '16px',
                backgroundColor: '#1f2937',
                borderRadius: '8px',
                border: '2px solid #374151',
                margin: '8px 0',
              }}
            >
              {/* Línea vertical marcando la posición actual */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${displayPosition}%`,
                  width: '4px',
                  height: '48px',
                  backgroundColor: color,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '2px',
                  boxShadow: `0 0 12px ${color}, 0 0 6px ${color}`,
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
              />

              {/* Indicador de fuera de rango */}
              {!inRange && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    left: `${currentTick > tickUp ? 100 : 0}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <IconAlertTriangle size={20} color="#ef4444" />
                </div>
              )}
            </div>

            {/* Badge de estado debajo de la barra */}
            <Group position="center" mt="xl">
              <Badge
                size="lg"
                color={inRange ? 'green' : 'red'}
                styles={{
                  root: {
                    backgroundColor: color,
                    color: 'white',
                  },
                }}
              >
                {statusText}
              </Badge>
            </Group>
          </div>

          {/* Columna derecha: Distancias y tick superior */}
          <Stack spacing="xs" style={{ minWidth: '120px' }} align="flex-end">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Tick Superior</Text>
            <Text size="lg" c="#4ade80" fw={700}>{tickUp.toLocaleString()}</Text>

            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Estado</Text>
            <Group spacing={4}>
              {inRange ? (
                <IconTrophy size={20} color={color} />
              ) : (
                <IconAlertTriangle size={20} color={color} />
              )}
              <Text size="md" c="white" fw={600}>
                {inRange ? 'Generando rewards' : 'Sin rewards'}
              </Text>
            </Group>

            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="sm">Dist. Superior</Text>
            <Text size="sm" c={distanceFromUp < 30 ? '#ef4444' : 'white'} fw={600}>
              {distanceFromUp.toFixed(1)}%
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* Alerta compacta */}
      <Alert color={inRange ? 'teal' : 'red'} icon={inRange ? <IconTrophy size={16} /> : <IconAlertTriangle size={16} />}>
        <Text size="sm" fw={600}>
          {inRange
            ? 'Tu posición está generando rewards'
            : 'Tu posición NO está generando rewards - está fuera de rango'}
        </Text>
      </Alert>
    </Stack>
  );
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
        <td style={{ textAlign: 'center', padding: '8px' }}>
          <RangeIndicatorCompact
            tickLow={position.tick_low}
            tickUp={position.tick_up}
            currentTick={position.current_tick}
            inRange={position.in_range}
          />
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
          <td colSpan={10} style={{ padding: 0, backgroundColor: '#0d0f12' }}>
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

                {/* Detailed Range Indicator */}
                <RangeIndicatorDetailed
                  tickLow={position.tick_low}
                  tickUp={position.tick_up}
                  currentTick={position.current_tick}
                  inRange={position.in_range}
                />

                {/* Pending Rewards */}
                {position.pending_rewards && position.pending_rewards.length > 0 && (
                  <>
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
                )}

                {/* Total Generated */}
                <Paper p="sm" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033' }}>
                  <Group position="apart" align="center">
                    <Group spacing="xs">
                      <IconScale size={18} color="#4ade80" />
                      <Text size="sm" fw={600} c="white">Total Generado</Text>
                    </Group>
                    <Stack spacing={0} align="flex-end">
                      {totalRewardsValue > 0 && (
                        <Group spacing="xs">
                          <Text size="xs" c="dimmed">Rewards:</Text>
                          <Text size="sm" fw={600} c="green.4">{formatCurrency(totalRewardsValue)}</Text>
                        </Group>
                      )}
                      {(() => {
                        const estimatedEarnings = calculateEstimatedEarnings(
                          position.pool.apy,
                          position.age_in_days,
                          position.user_balance_usd
                        );
                        return estimatedEarnings !== null ? (
                          <Group spacing="xs">
                            <Text size="xs" c="dimmed">Estimado APY:</Text>
                            <Text size="sm" fw={600} c="blue.4">{formatCurrency(estimatedEarnings)}</Text>
                            <Tooltip label="Estimación basada en APY actual y tiempo en posición">
                              <IconAlertTriangle size={12} color="#6b7280" style={{ cursor: 'help' }} />
                            </Tooltip>
                          </Group>
                        ) : null;
                      })()}
                    </Stack>
                  </Group>
                </Paper>

                {/* Time in Position */}
                {position.position_since && (
                  <>
                    <Text size="sm" fw={600} c="white">Tiempo en Posición</Text>
                    <Group spacing="sm">
                      {formatTimeInPosition(position.age_in_days, position.position_since) && (
                        <Badge size="lg" color="blue" variant="light" leftSection={<IconClock size={14} />}>
                          {formatTimeInPosition(position.age_in_days, position.position_since)}
                        </Badge>
                      )}
                      {position.last_action && (
                        <Badge size="md" color="gray" variant="outline">
                          Última acción: {position.last_action}
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        Desde: {new Date(position.position_since).toLocaleString('es-ES')}
                      </Text>
                    </Group>
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

export function PoolPositionsTab() {
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
                  <th style={{ textAlign: 'center', minWidth: 200 }}>Rango</th>
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
