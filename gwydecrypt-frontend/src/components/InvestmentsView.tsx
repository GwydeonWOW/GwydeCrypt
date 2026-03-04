import { useState } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  Button,
  Badge,
  Tabs,
  SimpleGrid,
  Title,
  ActionIcon,
  Table,
} from '@mantine/core';
import * as XLSX from 'xlsx';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconCoin,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { AddInvestmentModal } from './AddInvestmentModal';
import { EditInvestmentModal } from './EditInvestmentModal';
import { SellInvestmentModal } from './SellInvestmentModal';
import { CHAIN_DISPLAY_NAMES } from '../constants';

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

// Grouped Investments Table Component
const GroupedInvestmentsTable = function({ investments, onEdit, onDelete }: any) {
  if (!investments || investments.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text c="dimmed">No hay inversiones registradas</Text>
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
            <th style={{ textAlign: 'right' }}>Invertido</th>
            <th style={{ textAlign: 'right' }}>Valor Actual</th>
            <th style={{ textAlign: 'right' }}>PnL ($)</th>
            <th style={{ textAlign: 'right' }}>PnL (%)</th>
            <th style={{ textAlign: 'center' }}>Compras</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {investments.map((group: any) => {
            const isProfit = (group.pnl_usd || 0) >= 0;
            return (
              <tr key={`${group.token?.symbol}_${group.chain}`}>
                <td>
                  <Stack spacing={0}>
                    <Text size="sm" fw={600} c="white">
                      {group.token?.symbol}
                    </Text>
                    <Text size="xs" c="dimmed">{group.token?.name}</Text>
                  </Stack>
                </td>
                <td>
                  <Badge size="xs" color="blue" variant="light">
                    {CHAIN_DISPLAY_NAMES[group.chain as keyof typeof CHAIN_DISPLAY_NAMES] || group.chain?.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">${group.total_invested_usd?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">${group.current_value_usd?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Group spacing={4} position="right" noWrap>
                    {isProfit ? (
                      <IconTrendingUp size={16} color="#4ade80" />
                    ) : (
                      <IconTrendingDown size={16} color="#f87171" />
                    )}
                    <Text fw={600} c={isProfit ? '#4ade80' : '#f87171'}>
                      ${(group.pnl_usd || 0).toFixed(2)}
                    </Text>
                  </Group>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text fw={500} c={isProfit ? '#4ade80' : '#f87171'}>
                    {(group.pnl_percent || 0) >= 0 ? '+' : ''}{(group.pnl_percent || 0).toFixed(2)}%
                  </Text>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Badge
                    size="sm"
                    color={isProfit ? 'green' : 'red'}
                    variant="light"
                  >
                    {group.investments?.length || 0}
                  </Badge>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Group spacing="xs" position="center">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="blue"
                      onClick={() => onEdit(group)}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Group>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

// Individual Investments Table Component
const IndividualInvestmentsTable = function({ investments, onEdit, onDelete }: any) {
  if (!investments || investments.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text c="dimmed">No hay inversiones registradas</Text>
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
            <th style={{ textAlign: 'right' }}>Cantidad</th>
            <th style={{ textAlign: 'right' }}>Precio Compra</th>
            <th style={{ textAlign: 'right' }}>Total Compra</th>
            <th style={{ textAlign: 'right' }}>Valor Actual</th>
            <th style={{ textAlign: 'right' }}>PnL ($)</th>
            <th style={{ textAlign: 'right' }}>PnL (%)</th>
            <th>Fecha Compra</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {investments.map((inv: any) => {
            const isProfit = (inv.pnl_usd || 0) >= 0;
            return (
              <tr key={inv.id}>
                <td>
                  <Stack spacing={0}>
                    <Text size="sm" fw={600} c="white">
                      {inv.token?.symbol}
                    </Text>
                    <Text size="xs" c="dimmed">{inv.token?.name}</Text>
                  </Stack>
                </td>
                <td>
                  <Badge size="xs" color="blue" variant="light">
                    {CHAIN_DISPLAY_NAMES[inv.chain as keyof typeof CHAIN_DISPLAY_NAMES] || inv.chain}
                  </Badge>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">{inv.amount_purchased?.toFixed(6) || '0'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">${inv.purchase_price_per_token?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">${inv.purchase_total_usd?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">${inv.current_value_usd?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Group spacing={4} position="right" noWrap>
                    {isProfit ? (
                      <IconTrendingUp size={14} color="#4ade80" />
                    ) : (
                      <IconTrendingDown size={14} color="#f87171" />
                    )}
                    <Text fw={600} c={isProfit ? '#4ade80' : '#f87171'}>
                      ${(inv.pnl_usd || 0).toFixed(2)}
                    </Text>
                  </Group>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text fw={500} c={isProfit ? '#4ade80' : '#f87171'}>
                    {(inv.pnl_percent || 0) >= 0 ? '+' : ''}{(inv.pnl_percent || 0).toFixed(2)}%
                  </Text>
                </td>
                <td>
                  <Text size="xs" c="dimmed">
                    {inv.purchase_date ? new Date(inv.purchase_date).toLocaleDateString('es-ES') : ''}
                  </Text>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Group spacing="xs" position="center">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="blue"
                      onClick={() => onEdit(inv)}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="red"
                      onClick={() => onDelete(inv.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

// Sales Table Component
const SalesTable = function({ sales, onDelete }: any) {
  if (!sales || sales.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text c="dimmed">No hay ventas registradas</Text>
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
            <th style={{ textAlign: 'right' }}>Cantidad Vendida</th>
            <th style={{ textAlign: 'right' }}>Precio Venta</th>
            <th style={{ textAlign: 'right' }}>Total Venta</th>
            <th style={{ textAlign: 'right' }}>Precio Medio</th>
            <th style={{ textAlign: 'right' }}>PnL ($)</th>
            <th style={{ textAlign: 'right' }}>PnL (%)</th>
            <th>Fecha Venta</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale: any) => {
            const isProfit = (sale.pnl_usd || 0) >= 0;
            return (
              <tr key={sale.id}>
                <td>
                  <Stack spacing={0}>
                    <Text size="sm" fw={600} c="white">
                      {sale.investment?.token?.symbol}
                    </Text>
                    <Text size="xs" c="dimmed">{sale.investment?.token?.name}</Text>
                  </Stack>
                </td>
                <td>
                  <Badge size="xs" color="green" variant="light">
                    {CHAIN_DISPLAY_NAMES[sale.investment?.chain as keyof typeof CHAIN_DISPLAY_NAMES] || sale.investment?.chain?.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">{sale.amount_sold?.toFixed(6) || '0'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="white">${sale.sale_price_per_token?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text fw={600} c="white">${sale.sale_total_usd?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text c="dimmed">${sale.avg_buy_price?.toFixed(2) || '0.00'}</Text>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Group spacing={4} position="right" noWrap>
                    {isProfit ? (
                      <IconTrendingUp size={14} color="#4ade80" />
                    ) : (
                      <IconTrendingDown size={14} color="#f87171" />
                    )}
                    <Text fw={600} c={isProfit ? '#4ade80' : '#f87171'}>
                      ${(sale.pnl_usd || 0).toFixed(2)}
                    </Text>
                  </Group>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Text fw={500} c={isProfit ? '#4ade80' : '#f87171'}>
                    {(sale.pnl_percent || 0) >= 0 ? '+' : ''}{(sale.pnl_percent || 0).toFixed(2)}%
                  </Text>
                </td>
                <td>
                  <Text size="xs" c="dimmed">
                    {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('es-ES') : ''}
                  </Text>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    color="red"
                    onClick={() => onDelete(sale.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export function InvestmentsView() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [editInvestment, setEditInvestment] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch investments
  const { data: groupedInvestments } = useQuery({
    queryKey: ['investments-grouped'],
    queryFn: async () => {
      const response = await api.get('/investments?view=grouped');
      return response.data.investments;
    },
  });

  const { data: individualInvestments } = useQuery({
    queryKey: ['investments-individual'],
    queryFn: async () => {
      const response = await api.get('/investments?view=individual');
      return response.data.investments;
    },
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['investments-summary'],
    queryFn: async () => {
      const response = await api.get('/investments/summary');
      return response.data.summary;
    },
  });

  // Fetch sales
  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await api.get('/sales');
      return response.data.sales;
    },
  });

  // Fetch sales summary
  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: async () => {
      const response = await api.get('/sales/summary');
      return response.data.summary;
    },
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['investments-grouped'] });
    await queryClient.invalidateQueries({ queryKey: ['investments-individual'] });
    await queryClient.invalidateQueries({ queryKey: ['investments-summary'] });
    await queryClient.invalidateQueries({ queryKey: ['sales'] });
    await queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/investments/${id}`);
      notifications.show({
        title: 'Éxito',
        message: 'Inversión eliminada',
        color: 'green',
      });
      await handleRefresh();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al eliminar',
        color: 'red',
      });
    }
  };

  const handleDeleteSale = async (id: number) => {
    try {
      await api.delete(`/sales/${id}`);
      notifications.show({
        title: 'Éxito',
        message: 'Venta eliminada',
        color: 'green',
      });
      await handleRefresh();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al eliminar venta',
        color: 'red',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Export grouped investments to Excel
  const exportGroupedToExcel = () => {
    if (!groupedInvestments || groupedInvestments.length === 0) return;

    const data = groupedInvestments.map((group: any) => ({
      Token: group.token?.symbol || '',
      Nombre: group.token?.name || '',
      Cadena: CHAIN_DISPLAY_NAMES[group.chain as keyof typeof CHAIN_DISPLAY_NAMES] || group.chain?.toUpperCase() || '',
      'Total Invertido': group.total_invested_usd || 0,
      'Valor Actual': group.current_value_usd || 0,
      'PnL ($)': group.pnl_usd || 0,
      'PnL (%)': group.pnl_percent || 0,
      'Número de Compras': group.investments?.length || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inversiones Agrupadas');
    XLSX.writeFile(workbook, 'inversiones_agrupadas.xlsx');
  };

  // Export individual investments to Excel
  const exportIndividualToExcel = () => {
    if (!individualInvestments || individualInvestments.length === 0) return;

    const data = individualInvestments.map((inv: any) => ({
      Token: inv.token?.symbol || '',
      Cadena: CHAIN_DISPLAY_NAMES[inv.chain as keyof typeof CHAIN_DISPLAY_NAMES] || inv.chain || '',
      Cantidad: inv.amount_purchased || 0,
      'Precio Compra': inv.purchase_price_per_token || 0,
      'Total Compra': inv.purchase_total_usd || 0,
      'Valor Actual': inv.current_value_usd || 0,
      'PnL ($)': inv.pnl_usd || 0,
      'Fecha Compra': inv.purchase_date ? new Date(inv.purchase_date).toLocaleDateString('es-ES') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inversiones Individuales');
    XLSX.writeFile(workbook, 'inversiones_individuales.xlsx');
  };

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <Title order={3} c="white">
          Mis Inversiones (DCA)
        </Title>
        <Group spacing="xs">
          <Button onClick={() => setAddModalOpen(true)} radius="sm">
            <Group spacing="xs">
              <IconPlus size={16} />
              <span>Añadir</span>
            </Group>
          </Button>
          <Button onClick={() => setSellModalOpen(true)} radius="sm" color="green">
            <Group spacing="xs">
              <IconCoin size={16} />
              <span>Vender</span>
            </Group>
          </Button>
          <Button onClick={handleRefresh} variant="light" radius="sm">
            <Group spacing="xs">
              <IconRefresh size={16} />
              <span>Actualizar</span>
            </Group>
          </Button>
        </Group>
      </Group>

      {/* Main Tabs */}
      <Tabs defaultValue="investments" variant="outline" radius="sm">
        <Tabs.List>
          <Tabs.Tab value="investments">
            <Group spacing="xs">
              <IconTrendingUp size={16} />
              <span>Inversiones</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="sales">
            <Group spacing="xs">
              <IconCoin size={16} />
              <span>Ventas</span>
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        {/* Investments Panel */}
        <Tabs.Panel value="investments" pt="md">
          <Stack spacing="xl">
            {/* Summary Cards */}
            <SimpleGrid cols={1} breakpoints={[{ maxWidth: 'md', cols: 2, spacing: 'md' }, { minWidth: 'md', cols: 4, spacing: 'lg' }]}>
              <SummaryCard
                title="Total Invertido"
                value={summary?.total_invested_usd || 0}
                format={formatCurrency}
              />
              <SummaryCard
                title="Valor Actual"
                value={summary?.current_value_usd || 0}
                format={formatCurrency}
              />
              <SummaryCard
                title="PnL Total"
                value={summary?.pnl_usd || 0}
                format={formatCurrency}
                isProfit={summary?.pnl_usd >= 0}
              />
              <SummaryCard
                title="PnL %"
                value={summary?.pnl_percent || 0}
                format={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
                isProfit={summary?.pnl_percent >= 0}
              />
            </SimpleGrid>

            {/* Investments List */}
            <Paper p="lg" radius="sm" withBorder>
              <Tabs defaultValue="grouped" variant="pills">
                <Tabs.List>
                  <Tabs.Tab value="grouped">Agrupadas</Tabs.Tab>
                  <Tabs.Tab value="individual">Individuales</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="grouped" pt="md">
                  <Group position="right" mb="sm">
                    <Button
                      onClick={exportGroupedToExcel}
                      size="xs"
                      variant="light"
                      disabled={!groupedInvestments || groupedInvestments.length === 0}
                    >
                      Exportar Excel
                    </Button>
                  </Group>
                  <GroupedInvestmentsTable
                    investments={groupedInvestments || []}
                    onEdit={setEditInvestment}
                    onDelete={handleDelete}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="individual" pt="md">
                  <Group position="right" mb="sm">
                    <Button
                      onClick={exportIndividualToExcel}
                      size="xs"
                      variant="light"
                      disabled={!individualInvestments || individualInvestments.length === 0}
                    >
                      Exportar Excel
                    </Button>
                  </Group>
                  <IndividualInvestmentsTable
                    investments={individualInvestments || []}
                    onEdit={setEditInvestment}
                    onDelete={handleDelete}
                  />
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Sales Panel */}
        <Tabs.Panel value="sales" pt="md">
          <Stack spacing="xl">
            {/* Sales Summary Cards */}
            <SimpleGrid cols={1} breakpoints={[{ maxWidth: 'md', cols: 2, spacing: 'md' }, { minWidth: 'md', cols: 4, spacing: 'lg' }]}>
              <SummaryCard
                title="Total Vendido"
                value={salesSummary?.total_sold || 0}
                format={(v: number) => v.toFixed(6)}
              />
              <SummaryCard
                title="Ingresos Totales"
                value={salesSummary?.total_revenue_usd || 0}
                format={formatCurrency}
              />
              <SummaryCard
                title="PnL Ventas"
                value={salesSummary?.total_pnl_usd || 0}
                format={formatCurrency}
                isProfit={salesSummary?.total_pnl_usd >= 0}
              />
              <SummaryCard
                title="PnL Ventas %"
                value={salesSummary?.total_pnl_percent || 0}
                format={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
                isProfit={salesSummary?.total_pnl_percent >= 0}
              />
            </SimpleGrid>

            {/* Sales List */}
            <Paper p="lg" radius="sm" withBorder>
              <Text size="lg" fw={600} c="white" mb="md">Historial de Ventas</Text>
              <SalesTable sales={sales || []} onDelete={handleDeleteSale} />
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modals */}
      <AddInvestmentModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={async () => {
          setAddModalOpen(false);
          await handleRefresh();
        }}
      />

      <SellInvestmentModal
        opened={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        onSuccess={async () => {
          setSellModalOpen(false);
          await handleRefresh();
        }}
      />

      {editInvestment && (
        <EditInvestmentModal
          opened={!!editInvestment}
          investment={editInvestment}
          onClose={() => setEditInvestment(null)}
          onSuccess={async () => {
            setEditInvestment(null);
            await handleRefresh();
          }}
        />
      )}
    </Stack>
  );
}
