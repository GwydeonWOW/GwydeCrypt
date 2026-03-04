import { useState } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Badge,
  Collapse,
  Table,
  Title,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import * as XLSX from 'xlsx';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconCoin,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { AddInvestmentModal } from './AddInvestmentModal';
import { SellInvestmentModal } from './SellInvestmentModal';
import { EditInvestmentModal } from './EditInvestmentModal';
import { EditSaleModal } from './EditSaleModal';
import { CHAIN_DISPLAY_NAMES } from '../constants';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// Summary Card Component
const SummaryCard = function({ title, value, format, isProfit }: { title: string; value: number; format: (v: number) => string; isProfit?: boolean }) {
  const isPositive = isProfit !== undefined ? isProfit : value >= 0;

  return (
    <Paper
      p="lg"
      radius="sm"
      withBorder
      sx={{
        backgroundColor: '#141719',
        borderColor: '#1f2326',
      }}
    >
      <Text size="13" c="dimmed" mb="xs">{title}</Text>
      <Text
        size="24"
        fw={700}
        c={isPositive ? '#4ade80' : '#f87171'}
      >
        {format(value)}
      </Text>
    </Paper>
  );
};

// Position Row Component with Expandable Transactions
const PositionRow = function({
  position,
  onEditPurchase,
  onEditSale,
}: {
  position: any;
  onEditPurchase: (tx: any, position: any) => void;
  onEditSale: (tx: any, position: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isProfit = (position.pnl_usd || 0) >= 0;

  return (
    <>
      <tr style={{ cursor: 'pointer', opacity: position.is_closed ? 0.6 : 1 }} onClick={() => setExpanded(!expanded)}>
        <td>
          <Stack spacing={0}>
            <Group spacing="xs">
              <Text size="sm" fw={600} c="white">
                {position.token?.symbol}
              </Text>
              {position.is_closed && (
                <Badge size="xs" color="gray" variant="filled">
                  Cerrada
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed">{position.token?.name}</Text>
          </Stack>
        </td>
        <td>
          <Badge size="xs" color="blue" variant="light">
            {CHAIN_DISPLAY_NAMES[position.chain as keyof typeof CHAIN_DISPLAY_NAMES] || position.chain?.toUpperCase()}
          </Badge>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text fw={600} c="white" size="lg">
            {position.current_amount?.toFixed(6) || '0'}
          </Text>
          <Text size="xs" c="dimmed">
            Comprado: {position.total_amount_purchased?.toFixed(6) || '0'}
          </Text>
          <Text size="xs" c="dimmed">
            Vendido: {position.total_amount_sold?.toFixed(6) || '0'}
          </Text>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text c="white">${position.average_buy_price?.toFixed(2) || '0.00'}</Text>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text c="white">${position.total_invested_usd?.toFixed(2) || '0.00'}</Text>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text fw={600} c="white">${position.current_value_usd?.toFixed(2) || '0.00'}</Text>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Group spacing={4} position="right" noWrap>
            {isProfit ? (
              <IconTrendingUp size={16} color="#4ade80" />
            ) : (
              <IconTrendingDown size={16} color="#f87171" />
            )}
            <Text fw={600} c={isProfit ? '#4ade80' : '#f87171'}>
              ${(position.pnl_usd || 0).toFixed(2)}
            </Text>
          </Group>
        </td>
        <td style={{ textAlign: 'right' }}>
          <Text fw={500} c={isProfit ? '#4ade80' : '#f87171'}>
            {(position.pnl_percent || 0) >= 0 ? '+' : ''}{(position.pnl_percent || 0).toFixed(2)}%
          </Text>
        </td>
        <td style={{ textAlign: 'center' }}>
          <Group spacing="xs" position="center">
            <Badge size="sm" variant="light" color="blue">
              {position.purchase_count || 0} compras
            </Badge>
            <Badge size="sm" variant="light" color="green">
              {position.sale_count || 0} ventas
            </Badge>
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

      {/* Expandable Transactions */}
      {expanded && (
        <tr>
          <td colSpan={10} style={{ padding: 0, backgroundColor: '#0d0f12' }}>
            <Collapse in={expanded}>
              <Stack p="md" spacing="sm">
                <Text size="sm" fw={600} c="white">Historial de Transacciones</Text>

                {position.transactions && position.transactions.length > 0 ? (
                  <Table striped highlightOnHover withBorder withColumnBorders>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th style={{ textAlign: 'right' }}>Cantidad</th>
                        <th style={{ textAlign: 'right' }}>Precio</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {position.transactions.map((tx: any, idx: number) => (
                        <tr key={`${tx.type}-${tx.id}-${idx}`}>
                          <td>
                            <Badge
                              size="xs"
                              color={tx.type === 'purchase' ? 'blue' : 'green'}
                              variant="light"
                            >
                              {tx.type === 'purchase' ? 'Compra' : 'Venta'}
                            </Badge>
                          </td>
                          <td>
                            <Text size="xs" c="dimmed">
                              {new Date(tx.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </Text>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Text size="sm" c="white">{tx.amount?.toFixed(6)}</Text>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Text size="sm" c="white">${tx.price_usd?.toFixed(2)}</Text>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Text size="sm" fw={600} c="white">${tx.total_usd?.toFixed(2)}</Text>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Tooltip label="Editar transacción">
                              <ActionIcon
                                color="blue"
                                variant="light"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (tx.type === 'purchase') {
                                    onEditPurchase(tx, position);
                                  } else {
                                    onEditSale(tx, position);
                                  }
                                }}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed">No hay transacciones registradas</Text>
                )}
              </Stack>
            </Collapse>
          </td>
        </tr>
      )}
    </>
  );
};

// Positions Table Component
const PositionsTable = function({
  positions,
  onEditPurchase,
  onEditSale,
}: {
  positions: any[];
  onEditPurchase: (tx: any, position: any) => void;
  onEditSale: (tx: any, position: any) => void;
}) {
  if (!positions || positions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text c="dimmed">No tienes posiciones activas. Añade inversiones para empezar.</Text>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Token</th>
            <th>Cadena</th>
            <th style={{ textAlign: 'right' }}>Cantidad Actual</th>
            <th style={{ textAlign: 'right' }}>Precio Medio</th>
            <th style={{ textAlign: 'right' }}>Total Invertido</th>
            <th style={{ textAlign: 'right' }}>Valor Actual</th>
            <th style={{ textAlign: 'right' }}>PnL ($)</th>
            <th style={{ textAlign: 'right' }}>PnL (%)</th>
            <th style={{ textAlign: 'center' }}>Transacciones</th>
            <th style={{ textAlign: 'center' }}></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position: any) => (
            <PositionRow
              key={`${position.token?.symbol}_${position.chain}`}
              position={position}
              onEditPurchase={onEditPurchase}
              onEditSale={onEditSale}
            />
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export function PositionsView() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [editInvestmentModalOpen, setEditInvestmentModalOpen] = useState(false);
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [editInvestmentData, setEditInvestmentData] = useState<any>(null);
  const [editSaleData, setEditSaleData] = useState<any>(null);
  const queryClient = useQueryClient();

  // Setup auto-refresh - same as Dashboard
  useAutoRefresh({
    queryKeys: [['positions']],
  });

  // Fetch positions
  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const response = await api.get('/investments/positions');
      return response.data.positions;
    },
  });

  const refreshPositions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['positions'] });
  };

  const handleEditPurchase = (tx: any, position: any) => {
    setEditInvestmentData({
      id: tx.id,
      amount_purchased: tx.amount,
      purchase_price_per_token: tx.price_usd,
      purchase_total_usd: tx.total_usd,
      purchase_date: tx.date,
      notes: tx.notes || '',
      token: position.token,
    });
    setEditInvestmentModalOpen(true);
  };

  const handleEditSale = (tx: any, position: any) => {
    setEditSaleData({
      id: tx.id,
      amount_sold: tx.amount,
      sale_price_per_token: tx.price_usd,
      sale_total_usd: tx.total_usd,
      sale_date: tx.date,
      notes: tx.notes || '',
      investment: { token: position.token, chain: position.chain },
    });
    setEditSaleModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Export positions to Excel
  const exportToExcel = () => {
    if (!positions || positions.length === 0) return;

    const data = positions.map((position: any) => ({
      Token: position.token?.symbol || '',
      Nombre: position.token?.name || '',
      Cadena: CHAIN_DISPLAY_NAMES[position.chain as keyof typeof CHAIN_DISPLAY_NAMES] || position.chain?.toUpperCase() || '',
      'Cantidad Actual': position.current_amount || 0,
      'Precio Medio Compra': position.average_buy_price || 0,
      'Total Invertido': position.total_invested_usd || 0,
      'Valor Actual': position.current_value_usd || 0,
      'PnL ($)': position.pnl_usd || 0,
      'PnL (%)': position.pnl_percent || 0,
      'Compras': position.purchase_count || 0,
      'Ventas': position.sale_count || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Posiciones Actuales');
    XLSX.writeFile(workbook, 'posiciones_activas.xlsx');
  };

  // Calculate totals from positions
  const totals = positions?.reduce((acc: any, pos: any) => {
    acc.invested += pos.total_invested_usd || 0;
    acc.currentValue += pos.current_value_usd || 0;
    acc.pnl += pos.pnl_usd || 0;
    return acc;
  }, { invested: 0, currentValue: 0, pnl: 0 }) || { invested: 0, currentValue: 0, pnl: 0 };

  const totalPnlPercent = totals.invested > 0 ? (totals.pnl / totals.invested) * 100 : 0;

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <Title order={3} c="white">
          Mis Posiciones (DCA)
        </Title>
        <Group spacing="xs">
          <Button onClick={() => setAddModalOpen(true)} radius="sm">
            <Group spacing="xs">
              <IconPlus size={16} />
              <span>Comprar</span>
            </Group>
          </Button>
          <Button onClick={() => setSellModalOpen(true)} radius="sm" color="green">
            <Group spacing="xs">
              <IconCoin size={16} />
              <span>Vender</span>
            </Group>
          </Button>
          <Button
            onClick={exportToExcel}
            variant="light"
            radius="sm"
            disabled={!positions || positions.length === 0}
          >
            Exportar Excel
          </Button>
        </Group>
      </Group>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <SummaryCard
          title="Total Invertido"
          value={totals.invested}
          format={formatCurrency}
        />
        <SummaryCard
          title="Valor Actual"
          value={totals.currentValue}
          format={formatCurrency}
        />
        <SummaryCard
          title="PnL Total"
          value={totals.pnl}
          format={formatCurrency}
          isProfit={totals.pnl >= 0}
        />
        <SummaryCard
          title="PnL %"
          value={totalPnlPercent}
          format={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
          isProfit={totalPnlPercent >= 0}
        />
      </div>

      {/* Positions Table */}
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <PositionsTable
          positions={positions || []}
          onEditPurchase={handleEditPurchase}
          onEditSale={handleEditSale}
        />
      </Paper>

      {/* Modals */}
      <AddInvestmentModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={async () => {
          setAddModalOpen(false);
          await refreshPositions();
        }}
      />

      <SellInvestmentModal
        opened={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        onSuccess={async () => {
          setSellModalOpen(false);
          await refreshPositions();
        }}
      />

      <EditInvestmentModal
        opened={editInvestmentModalOpen}
        investment={editInvestmentData}
        onClose={() => {
          setEditInvestmentModalOpen(false);
          setEditInvestmentData(null);
        }}
        onSuccess={async () => {
          setEditInvestmentModalOpen(false);
          setEditInvestmentData(null);
          await refreshPositions();
        }}
      />

      <EditSaleModal
        opened={editSaleModalOpen}
        sale={editSaleData}
        onClose={() => {
          setEditSaleModalOpen(false);
          setEditSaleData(null);
        }}
        onSuccess={async () => {
          setEditSaleModalOpen(false);
          setEditSaleData(null);
          await refreshPositions();
        }}
      />
    </Stack>
  );
}
