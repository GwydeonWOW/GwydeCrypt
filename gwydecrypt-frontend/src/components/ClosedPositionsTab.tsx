import { useState } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Badge,
  Table,
  LoadingOverlay,
  Select,
  Pagination,
} from '@mantine/core';
import {
  IconRefresh,
  IconCloudDownload,
  IconHistory,
  IconTrophy,
  IconScale,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconSortDescending,
  IconSortAscending,
  IconFilter,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClosedPositions,
  syncClosedPositions,
  vfatKeys,
} from '../api/vfat';

const POSITIONS_PER_PAGE = 20;

type SortField = 'closed_timestamp' | 'realized_pnl_usd' | 'roi' | 'initial_balance_usd' | 'pool' | 'chain';
type SortOrder = 'asc' | 'desc';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatROI = (roi: number) => {
  return `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`;
};

// Componente para botones de ordenamiento en cabeceras
const SortableHeader = ({
  label,
  field,
  currentField,
  currentOrder,
  onSort,
  align = 'left',
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: () => void;
  align?: 'left' | 'right' | 'center';
}) => {
  const isActive = currentField === field;
  const Icon = currentOrder === 'asc' ? IconSortAscending : IconSortDescending;

  return (
    <th
      style={{
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        padding: '12px 8px',
      }}
      onClick={onSort}
    >
      <Group gap={4} justify={align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'} wrap="nowrap">
        <Text size="sm" fw={600} c="white">
          {label}
        </Text>
        {isActive && <Icon size={14} color="#667eea" />}
      </Group>
    </th>
  );
};

export function ClosedPositionsTab() {
  const queryClient = useQueryClient();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedChain, setSelectedChain] = useState<string | null>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('closed_timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Fetch closed positions
  const { data: closedData, isLoading, error, refetch } = useQuery({
    queryKey: vfatKeys.closedPositions(),
    queryFn: () => getClosedPositions({ sort_by: 'closed_timestamp', sort_order: 'desc' }),
    refetchInterval: 60000, // 1 minute
  });

  const syncMutation = useMutation({
    mutationFn: syncClosedPositions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vfatKeys.closedPositions() });
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const positions = closedData?.positions ?? [];

  // Extraer chains únicas de las posiciones
  const chains = Array.from(new Set(positions.map((p) => p.pool.chain))).sort();

  // Filtrar por chain
  const filteredPositions = selectedChain
    ? positions.filter((p) => p.pool.chain === selectedChain)
    : positions;

  // Calcular estadísticas por chain
  const getChainStats = (chain: string | null) => {
    const chainPositions = chain
      ? positions.filter((p) => p.pool.chain === chain)
      : positions;

    if (chainPositions.length === 0) {
      return {
        total_positions: 0,
        total_pnl_usd: 0,
        avg_roi: 0,
      };
    }

    const totalPnl = chainPositions.reduce((sum, p) => sum + p.realized_pnl_usd, 0);
    const avgRoi = chainPositions.reduce((sum, p) => sum + p.roi, 0) / chainPositions.length;

    return {
      total_positions: chainPositions.length,
      total_pnl_usd: totalPnl,
      avg_roi: avgRoi,
    };
  };

  const currentChainStats = getChainStats(selectedChain);

  // Ordenar posiciones
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'closed_timestamp':
        comparison = new Date(a.closed_timestamp || 0).getTime() - new Date(b.closed_timestamp || 0).getTime();
        break;
      case 'realized_pnl_usd':
        comparison = a.realized_pnl_usd - b.realized_pnl_usd;
        break;
      case 'roi':
        comparison = a.roi - b.roi;
        break;
      case 'initial_balance_usd':
        comparison = a.initial_balance_usd - b.initial_balance_usd;
        break;
      case 'pool':
        comparison = a.pool.name.localeCompare(b.pool.name);
        break;
      case 'chain':
        comparison = a.pool.chain.localeCompare(b.pool.chain);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Paginar
  const totalPages = Math.ceil(sortedPositions.length / POSITIONS_PER_PAGE);
  const paginatedPositions = sortedPositions.slice(
    (currentPage - 1) * POSITIONS_PER_PAGE,
    currentPage * POSITIONS_PER_PAGE
  );

  // Resetear página cuando cambian filtros
  const handleChainChange = (value: string | null) => {
    setSelectedChain(value);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <Paper p="lg" radius="sm" withBorder sx={{ backgroundColor: '#141719', borderColor: '#1f2326', minHeight: 400 }}>
        <LoadingOverlay visible />
        <Stack spacing="md" align="center" py="xl">
          <Text size="lg">Cargando historial de posiciones...</Text>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper p="lg" radius="sm" withBorder sx={{ backgroundColor: '#141719', borderColor: '#1f2326' }}>
        <Stack spacing="md">
          <Text c="red">Error al cargar posiciones cerradas: {(error as Error).message}</Text>
          <Button onClick={() => refetch()} size="sm">Reintentar</Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing="lg">
      {/* Stats Cards */}
      <Group grow>
        <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033', height: 100 }}>
          <Stack justify="space-between" h="100">
            <Group spacing="xs">
              <IconHistory size={16} color="#909296" />
              <Text size="xs" c="dimmed">{selectedChain ? `${selectedChain}` : 'Total'} Posiciones</Text>
            </Group>
            <Text size="xl" fw={700} c="white">
              {currentChainStats.total_positions}
            </Text>
          </Stack>
        </Paper>

        <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033', height: 100 }}>
          <Stack justify="space-between" h="100">
            <Group spacing="xs">
              <IconScale size={16} color="#909296" />
              <Text size="xs" c="dimmed">PnL Total</Text>
            </Group>
            <Text size="xl" fw={700} c={(currentChainStats.total_pnl_usd ?? 0) >= 0 ? '#4ade80' : '#ef4444'}>
              {formatCurrency(currentChainStats.total_pnl_usd ?? 0)}
            </Text>
          </Stack>
        </Paper>

        <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033', height: 100 }}>
          <Stack justify="space-between" h="100">
            <Group spacing="xs">
              <IconTrophy size={16} color="#909296" />
              <Text size="xs" c="dimmed">ROI Promedio</Text>
            </Group>
            <Text size="xl" fw={700} c={(currentChainStats.avg_roi ?? 0) >= 0 ? '#4ade80' : '#ef4444'}>
              {formatROI(currentChainStats.avg_roi ?? 0)}
            </Text>
          </Stack>
        </Paper>

        <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033', height: 100 }}>
          <Stack justify="space-between" h="100">
            <Group spacing="xs">
              <IconRefresh size={16} color="#909296" />
              <Text size="xs" c="dimmed">Acciones</Text>
            </Group>
            <Button
              onClick={handleSync}
              loading={syncMutation.isPending}
              size="sm"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              fullWidth
              h={36}
            >
              Sincronizar
            </Button>
          </Stack>
        </Paper>
      </Group>

      {/* Filter by Chain */}
      <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033' }}>
        <Group justify="space-between">
          <Group gap="sm">
            <IconFilter size={16} color="#909296" />
            <Text size="sm" fw={600} c="white">
              Filtrar por Chain
            </Text>
          </Group>
          <Select
            placeholder="Todas las chains"
            clearable
            value={selectedChain}
            onChange={handleChainChange}
            data={[
              { value: '', label: 'Todas las chains' },
              ...chains.map((chain) => ({
                value: chain,
                label: `${chain} (${positions.filter((p) => p.pool.chain === chain).length} posiciones)`,
              })),
            ]}
            styles={{
              input: {
                backgroundColor: '#141719',
                borderColor: '#2c3033',
                color: 'white',
                minWidth: 200,
              },
            }}
          />
        </Group>
        {selectedChain && (
          <Stack gap={0}>
            <Text size="xs" c="dimmed" mt="xs">
              Mostrando {paginatedPositions.length} de {filteredPositions.length} posiciones de {selectedChain}
            </Text>
            <Group gap="md">
              <Text size="xs" c={currentChainStats.total_pnl_usd >= 0 ? 'green.6' : 'red.6'}>
                PnL: {formatCurrency(currentChainStats.total_pnl_usd)}
              </Text>
              <Text size="xs" c={currentChainStats.avg_roi >= 0 ? 'green.6' : 'red.6'}>
                ROI: {formatROI(currentChainStats.avg_roi)}
              </Text>
            </Group>
          </Stack>
        )}
      </Paper>

      {/* Table */}
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

        {positions.length === 0 ? (
          <Stack spacing="md" align="center" py="xl">
            <IconCloudDownload size={48} color="#909296" />
            <Text size="lg" c="dimmed">No hay posiciones cerradas</Text>
            <Text size="sm" c="dimmed" ta="center">
              Sincroniza para ver tu historial de posiciones cerradas
            </Text>
            <Button onClick={handleSync} loading={syncMutation.isPending} size="sm">
              Sincronizar Ahora
            </Button>
          </Stack>
        ) : (
          <Stack spacing="md">
            <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withBorder withColumnBorders>
              <thead>
                <tr>
                  <SortableHeader
                    label="Pool / Protocolo"
                    field="pool"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={() => handleSort('pool')}
                  />
                  <SortableHeader
                    label="Chain"
                    field="chain"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={() => handleSort('chain')}
                  />
                  <SortableHeader
                    label="Fecha Cierre"
                    field="closed_timestamp"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={() => handleSort('closed_timestamp')}
                  />
                  <SortableHeader
                    label="Balance Inicial"
                    field="initial_balance_usd"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={() => handleSort('initial_balance_usd')}
                    align="right"
                  />
                  <SortableHeader
                    label="PnL"
                    field="realized_pnl_usd"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={() => handleSort('realized_pnl_usd')}
                    align="right"
                  />
                  <SortableHeader
                    label="ROI"
                    field="roi"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={() => handleSort('roi')}
                    align="right"
                  />
                  <th style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <Text size="sm" fw={600} c="white">Tiempo Activa</Text>
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <Text size="sm" fw={600} c="white">Acción</Text>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPositions.map((position) => {
                  const isExpanded = expandedRows.has(position.id);
                  const isProfitable = position.realized_pnl_usd >= 0;

                  return (
                    <>
                      <tr key={position.id} style={{ cursor: 'pointer' }} onClick={() => toggleRow(position.id)}>
                        <td>
                          <Stack spacing={0}>
                            <Text size="sm" fw={600} c="white">
                              {position.pool.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {position.pool.protocol}
                            </Text>
                          </Stack>
                        </td>
                        <td>
                          <Badge size="sm" variant="light">
                            {position.pool.chain}
                          </Badge>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <IconClock size={14} color="#909296" />
                            <Text size="sm">
                              {position.closed_timestamp
                                ? new Date(position.closed_timestamp).toLocaleDateString('es-ES')
                                : 'N/A'}
                            </Text>
                          </Group>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Text size="sm" c="white">
                            {formatCurrency(position.initial_balance_usd)}
                          </Text>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Text
                            size="sm"
                            fw={600}
                            c={isProfitable ? '#4ade80' : '#ef4444'}
                          >
                            {isProfitable && '+'}{formatCurrency(position.realized_pnl_usd)}
                          </Text>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Text
                            size="sm"
                            fw={600}
                            c={position.roi >= 0 ? '#4ade80' : '#ef4444'}
                          >
                            {formatROI(position.roi)}
                          </Text>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Text size="sm" c="dimmed">
                            {position.age_in_days ? `${parseFloat(position.age_in_days).toFixed(1)}d` : 'N/A'}
                          </Text>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge
                            size="sm"
                            color={position.last_action === 'exited' ? 'blue' : 'gray'}
                            variant="light"
                          >
                            {position.last_action || 'N/A'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9}>
                            <Paper p="md" radius="sm" withBorder sx={{ backgroundColor: '#1a1d1f', borderColor: '#2c3033' }}>
                              <Stack spacing="md">
                                {/* Underlying Tokens */}
                                {position.underlying && position.underlying.length > 0 && (
                                  <>
                                    <Text size="sm" fw={600} c="white">Tokens en Posición</Text>
                                    <Group spacing="sm">
                                      {position.underlying.map((token, idx) => (
                                        <Badge key={idx} size="lg" variant="outline">
                                          {token.symbol}: {parseFloat(token.balance).toFixed(4)}
                                        </Badge>
                                      ))}
                                    </Group>
                                  </>
                                )}

                                {/* Dates */}
                                <Group grow>
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">Fecha Apertura</Text>
                                    <Text size="sm" c="white">
                                      {position.oldest_action_timestamp
                                        ? new Date(position.oldest_action_timestamp).toLocaleString('es-ES')
                                        : 'N/A'}
                                    </Text>
                                  </Stack>
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">Fecha Cierre</Text>
                                    <Text size="sm" c="white">
                                      {position.closed_timestamp
                                        ? new Date(position.closed_timestamp).toLocaleString('es-ES')
                                        : 'N/A'}
                                    </Text>
                                  </Stack>
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">Tiempo Activa</Text>
                                    <Text size="sm" c="white">
                                      {position.age_in_days ? `${parseFloat(position.age_in_days).toFixed(2)} días` : 'N/A'}
                                    </Text>
                                  </Stack>
                                </Group>

                                {/* Financial Summary */}
                                <Group grow>
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">Balance Inicial</Text>
                                    <Text size="md" fw={600} c="white">
                                      {formatCurrency(position.initial_balance_usd)}
                                    </Text>
                                  </Stack>
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">PnL Realizado</Text>
                                    <Text size="md" fw={600} c={isProfitable ? '#4ade80' : '#ef4444'}>
                                      {isProfitable && '+'}{formatCurrency(position.realized_pnl_usd)}
                                    </Text>
                                  </Stack>
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">ROI</Text>
                                    <Text size="md" fw={600} c={position.roi >= 0 ? '#4ade80' : '#ef4444'}>
                                      {formatROI(position.roi)}
                                    </Text>
                                  </Stack>
                                </Group>

                                {/* Metadata */}
                                {position.nft_id_chain && position.nft_id_chain.length > 1 && (
                                  <Stack spacing="xs">
                                    <Text size="xs" c="dimmed">NFT IDs</Text>
                                    <Group spacing="xs">
                                      {position.nft_id_chain.map((id, idx) => (
                                        <Badge key={idx} size="sm" variant="light">
                                          {id}
                                        </Badge>
                                      ))}
                                    </Group>
                                  </Stack>
                                )}

                                {position.is_migrated && (
                                  <Badge size="sm" color="orange" variant="light">
                                    Migrada
                                  </Badge>
                                )}
                              </Stack>
                            </Paper>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Results Counter */}
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Mostrando {(currentPage - 1) * POSITIONS_PER_PAGE + 1}-{Math.min(currentPage * POSITIONS_PER_PAGE, filteredPositions.length)} de {filteredPositions.length} posiciones
              {selectedChain && ` en ${selectedChain}`}
            </Text>
          </Group>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
                color="#667eea"
                styles={{
                  control: {
                    backgroundColor: '#1a1d1f',
                    borderColor: '#2c3033',
                    '&:hover': {
                      backgroundColor: '#2c3033',
                    },
                  },
                }}
              />
            </Group>
          )}
        </Stack>
        )}
      </Paper>
    </Stack>
  );
}
