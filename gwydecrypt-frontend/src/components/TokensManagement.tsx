import { useState, useEffect } from 'react';
import { Paper, Text, Group, Button, Badge, TextInput, Select, Modal, NumberInput, Stack, MultiSelect, ActionIcon, Divider, Tabs } from '@mantine/core';
import { IconPlus, IconSearch, IconEdit, IconGripVertical, IconX, IconTrash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { CHAIN_DISPLAY_NAMES, CHAIN_BADGE_COLORS, CHAIN_OPTIONS } from '../constants';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TokensManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState<string>('');
  const [opened, setOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [editingToken, setEditingToken] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);

  const { data: tokensData, isLoading } = useQuery({
    queryKey: ['admin-tokens', search, chainFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (chainFilter) params.chain = chainFilter;

      const response = await api.get('/admin/tokens', { params });
      return response.data.tokens;
    },
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setTokens(data);
      }
    },
  });

  useEffect(() => {
    if (Array.isArray(tokensData)) {
      setTokens(tokensData);
    }
  }, [tokensData]);

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/tokens/${id}/toggle-dashboard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] });
      notifications.show({ title: 'Éxito', message: 'Visibilidad del token actualizada', color: 'green' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/admin/tokens', data);
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Token creado', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] });
      setOpened(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.put(`/admin/tokens/${id}`, data);
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Token actualizado', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] });
      setEditOpened(false);
      setEditingToken(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (tokens: any[]) => {
      return await api.post('/admin/tokens/reorder', {
        tokens: tokens.map((token, index) => ({
          id: token.id,
          sort_order: index,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['tokens', 'dashboard'] });
      notifications.show({ title: 'Éxito', message: 'Orden actualizado', color: 'green' });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // No permitir reordenar si hay filtros aplicados
    if (search || chainFilter) {
      notifications.show({
        title: 'Aviso',
        message: 'Limpa los filtros para reordenar los tokens',
        color: 'yellow',
      });
      return;
    }

    if (over && active.id !== over.id) {
      setTokens((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        reorderMutation.mutate(newItems);
        return newItems;
      });
    }
  };

  const tokenList = Array.isArray(tokens) ? tokens : [];

  const handleEditToken = (token: any) => {
    setEditingToken(token);
    setEditOpened(true);
  };

  const filteredTokens = tokenList.filter((token: any) => {
    if (search && !token.symbol.toLowerCase().includes(search.toLowerCase()) && !token.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (chainFilter && token.token_chains) {
      const hasChain = token.token_chains.some((tc: any) => tc.chain === chainFilter);
      if (!hasChain) return false;
    }
    return true;
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="lg" fw={600} c="white">Gestión de Tokens</Text>
        <Button
          leftIcon={<IconPlus size={16} />}
          onClick={() => {
            setOpened(true);
          }}
          radius="sm"
          styles={{
            root: { backgroundColor: '#2a2f35', color: '#c1c2c5', '&:hover': { backgroundColor: '#373a40' } },
          }}
        >
          Añadir Token
        </Button>
      </Group>

      <Paper
        p="md"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Group gap="sm">
          <TextInput
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            radius="sm"
            icon={<IconSearch size={16} />}
          />
          <Select
            placeholder="Filter by chain"
            clearable
            data={CHAIN_OPTIONS}
            value={chainFilter}
            onChange={(value) => setChainFilter(value || '')}
            radius="sm"
          />
        </Group>
      </Paper>

      <Paper
        p="md"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
          overflow: 'auto',
        }}
      >
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 100px 1fr 120px 180px 100px 150px', gap: '16px', padding: '12px 16px', borderBottom: '1px solid #1f2326' }}>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}></div>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Símbolo</div>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Nombre</div>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Red</div>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>CoinGecko ID</div>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Dashboard</div>
          <div style={{ color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Acciones</div>
        </div>

        {/* Table Body with Drag & Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredTokens.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredTokens.map((token: any) => (
              <SortableRow
                key={token.id}
                token={token}
                chainLabels={CHAIN_DISPLAY_NAMES}
                onEdit={handleEditToken}
                onToggle={(id) => toggleMutation.mutate(id)}
                isPending={toggleMutation.isPending}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Paper>

      <AddTokenModal opened={opened} onClose={() => setOpened(false)} createMutation={createMutation} />
      <EditTokenModal opened={editOpened} onClose={() => { setEditOpened(false); setEditingToken(null); }} token={editingToken} updateMutation={updateMutation} />
    </Stack>
  );
}

function SortableRow({ token, chainLabels, onEdit, onToggle, isPending }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: token.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: '40px 100px 1fr 120px 180px 100px 150px',
        gap: '16px',
        padding: '12px 16px',
        borderBottom: '1px solid #1f2326',
        alignItems: 'center',
      }}
      {...attributes}
    >
      <div {...listeners} style={{ cursor: 'grab', color: '#909296' }}>
        <IconGripVertical size={18} />
      </div>
      <div style={{ color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', fontWeight: 600 }}>
        {token.symbol}
      </div>
      <div style={{ color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        {token.name}
      </div>
      <div style={{ color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        <Group gap={4}>
          {token.token_chains && token.token_chains.length > 0 ? (
            token.token_chains.map((tc: any) => (
              <Badge
                key={tc.chain}
                color={CHAIN_BADGE_COLORS[tc.chain as keyof typeof CHAIN_BADGE_COLORS] || 'orange'}
                radius="sm"
                variant="light"
                sx={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}
              >
                {CHAIN_DISPLAY_NAMES[tc.chain as keyof typeof CHAIN_DISPLAY_NAMES] || tc.chain}
              </Badge>
            ))
          ) : (
            <Badge color="gray" radius="sm" variant="light">Sin chains</Badge>
          )}
        </Group>
      </div>
      <div style={{ color: '#909296', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', fontSize: '13px' }}>
        {token.coingecko_id || '-'}
      </div>
      <div>
        <Badge
          color={token.show_on_dashboard ? 'green' : 'gray'}
          radius="sm"
          variant="light"
          sx={{ textTransform: 'capitalize', fontSize: '12px', fontWeight: 600 }}
        >
          {token.show_on_dashboard ? 'Visible' : 'Oculto'}
        </Badge>
      </div>
      <div>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            color="yellow"
            onClick={() => onEdit(token)}
            radius="sm"
          >
            <IconEdit size={14} />
          </Button>
          <Button
            size="xs"
            variant="light"
            color="blue"
            onClick={() => onToggle(token.id)}
            loading={isPending}
            radius="sm"
          >
            {token.show_on_dashboard ? 'Ocultar' : 'Mostrar'}
          </Button>
        </Group>
      </div>
    </div>
  );
}

function AddTokenModal({ opened, onClose, createMutation }: { opened: boolean; onClose: () => void; createMutation: any }) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [chains, setChains] = useState<Array<{ chain: string; contract_address: string; decimals: number; tradingview_symbol: string }>>([]);
  const [coingeckoId, setCoingeckoId] = useState('');

  // Add new chain entry
  const addChainEntry = () => {
    setChains([...chains, { chain: '', contract_address: '', decimals: 18, tradingview_symbol: '' }]);
  };

  // Remove chain entry
  const removeChainEntry = (index: number) => {
    setChains(chains.filter((_, i) => i !== index));
  };

  // Update chain entry field
  const updateChainEntry = (index: number, field: string, value: any) => {
    const newChains = [...chains];
    newChains[index] = { ...newChains[index], [field]: value };
    setChains(newChains);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (opened) {
      setSymbol('');
      setName('');
      setChains([{ chain: '', contract_address: '', decimals: 18, tradingview_symbol: '' }]);
      setCoingeckoId('');
    }
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Añadir Nuevo Token</Text>}
      centered
      size="xl"
      radius="lg"
    >
      <Tabs defaultValue="info">
        <Tabs.List>
          <Tabs.Tab value="info">Información Básica</Tabs.Tab>
          <Tabs.Tab value="chains">Blockchains</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info">
          <Stack gap="md" mt="md">
            <TextInput
              label="Símbolo"
              placeholder="RAY"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              required
              radius="sm"
            />
            <TextInput
              label="Nombre"
              placeholder="Raydium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              radius="sm"
            />
            <TextInput
              label="CoinGecko ID"
              placeholder="raydium"
              value={coingeckoId}
              onChange={(e) => setCoingeckoId(e.target.value)}
              radius="sm"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="chains">
          <Stack gap="md" mt="md">
            {chains.map((chainData, index) => (
              <Paper key={index} p="md" withBorder style={{ backgroundColor: '#0d0f12', borderColor: '#1f2326' }}>
                <Group justify="space-between" mb="md">
                  <Text size="sm" fw={600} c="white">
                    {chainData.chain ? CHAIN_DISPLAY_NAMES[chainData.chain as keyof typeof CHAIN_DISPLAY_NAMES] || chainData.chain.toUpperCase() : `Red #${index + 1}`}
                  </Text>
                  {chains.length > 1 && (
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="light"
                      onClick={() => removeChainEntry(index)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Group>

                <Select
                  label="Blockchain"
                  placeholder="Seleccionar blockchain"
                  data={CHAIN_OPTIONS}
                  value={chainData.chain}
                  onChange={(value) => updateChainEntry(index, 'chain', value || '')}
                  required
                  radius="sm"
                  mb="sm"
                />

                <Group gap="md">
                  <NumberInput
                    label="Decimales"
                    description="Solana: 9, EVM: 18"
                    value={chainData.decimals}
                    onChange={(value) => updateChainEntry(index, 'decimals', Number(value) || 18)}
                    min={0}
                    max={18}
                    required
                    radius="sm"
                    style={{ flex: 1 }}
                  />

                  <TextInput
                    label="TradingView"
                    placeholder="BINANCE:SOLUSDT"
                    value={chainData.tradingview_symbol}
                    onChange={(e) => updateChainEntry(index, 'tradingview_symbol', e.target.value)}
                    radius="sm"
                    style={{ flex: 1 }}
                  />
                </Group>

                <TextInput
                  label="Dirección de Contrato"
                  placeholder="Opcional - Dejar vacío para nativo"
                  value={chainData.contract_address}
                  onChange={(e) => updateChainEntry(index, 'contract_address', e.target.value)}
                  radius="sm"
                />
              </Paper>
            ))}

            <Button
              variant="light"
              onClick={addChainEntry}
              radius="sm"
              leftSection={<IconPlus size={14} />}
              fullWidth
            >
              Añadir otra blockchain
            </Button>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Group justify="flex-end" mt="md" gap="xs">
        <Button
          variant="default"
          onClick={onClose}
          radius="sm"
          styles={{
            root: { backgroundColor: '#1f2326', color: '#909296', '&:hover': { backgroundColor: '#2a2f35' } },
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => createMutation.mutate({
            symbol,
            name,
            chains: chains.map(c => ({
              chain: c.chain,
              contract_address: c.contract_address || undefined,
              decimals: c.decimals,
              tradingview_symbol: c.tradingview_symbol || undefined,
            })),
            coingecko_id: coingeckoId || undefined,
          })}
          loading={createMutation.isPending}
          disabled={!chains[0]?.chain}
          radius="sm"
          styles={{
            root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
          }}
        >
          Añadir Token
        </Button>
      </Group>
    </Modal>
  );
}

function EditTokenModal({ opened, onClose, token, updateMutation }: { opened: boolean; onClose: () => void; token: any; updateMutation: any }) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [chains, setChains] = useState<Array<{ chain: string; contract_address: string; decimals: number; tradingview_symbol: string }>>([]);
  const [coingeckoId, setCoingeckoId] = useState('');

  // Add new chain entry
  const addChainEntry = () => {
    setChains([...chains, { chain: '', contract_address: '', decimals: 18, tradingview_symbol: '' }]);
  };

  // Remove chain entry
  const removeChainEntry = (index: number) => {
    setChains(chains.filter((_, i) => i !== index));
  };

  // Update chain entry field
  const updateChainEntry = (index: number, field: string, value: any) => {
    const newChains = [...chains];
    newChains[index] = { ...newChains[index], [field]: value };
    setChains(newChains);
  };

  // Reset form when token changes
  useEffect(() => {
    if (token) {
      setSymbol(token.symbol || '');
      setName(token.name || '');
      setCoingeckoId(token.coingecko_id || '');

      // Load chains from token.token_chains
      if (token.token_chains && token.token_chains.length > 0) {
        setChains(token.token_chains.map((tc: any) => ({
          chain: tc.chain,
          contract_address: tc.contract_address || '',
          decimals: tc.decimals || 18,
          tradingview_symbol: tc.tradingview_symbol || '',
        })));
      } else {
        setChains([{ chain: '', contract_address: '', decimals: 18, tradingview_symbol: '' }]);
      }
    }
  }, [token]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Editar Token</Text>}
      centered
      size="xl"
      radius="lg"
    >
      <Tabs defaultValue="info">
        <Tabs.List>
          <Tabs.Tab value="info">Información Básica</Tabs.Tab>
          <Tabs.Tab value="chains">Blockchains</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info">
          <Stack gap="md" mt="md">
            <TextInput
              label="Símbolo"
              placeholder="RAY"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              required
              radius="sm"
            />
            <TextInput
              label="Nombre"
              placeholder="Raydium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              radius="sm"
            />
            <TextInput
              label="CoinGecko ID"
              placeholder="raydium"
              value={coingeckoId}
              onChange={(e) => setCoingeckoId(e.target.value)}
              radius="sm"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="chains">
          <Stack gap="md" mt="md">
            {chains.map((chainData, index) => (
              <Paper key={index} p="md" withBorder style={{ backgroundColor: '#0d0f12', borderColor: '#1f2326' }}>
                <Group justify="space-between" mb="md">
                  <Text size="sm" fw={600} c="white">
                    {chainData.chain ? CHAIN_DISPLAY_NAMES[chainData.chain as keyof typeof CHAIN_DISPLAY_NAMES] || chainData.chain.toUpperCase() : `Red #${index + 1}`}
                  </Text>
                  {chains.length > 1 && (
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="light"
                      onClick={() => removeChainEntry(index)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Group>

                <Select
                  label="Blockchain"
                  placeholder="Seleccionar blockchain"
                  data={CHAIN_OPTIONS}
                  value={chainData.chain}
                  onChange={(value) => updateChainEntry(index, 'chain', value || '')}
                  required
                  radius="sm"
                  mb="sm"
                />

                <Group gap="md">
                  <NumberInput
                    label="Decimales"
                    description="Solana: 9, EVM: 18"
                    value={chainData.decimals}
                    onChange={(value) => updateChainEntry(index, 'decimals', Number(value) || 18)}
                    min={0}
                    max={18}
                    required
                    radius="sm"
                    style={{ flex: 1 }}
                  />

                  <TextInput
                    label="TradingView"
                    placeholder="BINANCE:SOLUSDT"
                    value={chainData.tradingview_symbol}
                    onChange={(e) => updateChainEntry(index, 'tradingview_symbol', e.target.value)}
                    radius="sm"
                    style={{ flex: 1 }}
                  />
                </Group>

                <TextInput
                  label="Dirección de Contrato"
                  placeholder="Opcional - Dejar vacío para nativo"
                  value={chainData.contract_address}
                  onChange={(e) => updateChainEntry(index, 'contract_address', e.target.value)}
                  radius="sm"
                />
              </Paper>
            ))}

            <Button
              variant="light"
              onClick={addChainEntry}
              radius="sm"
              leftSection={<IconPlus size={14} />}
              fullWidth
            >
              Añadir otra blockchain
            </Button>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Group justify="flex-end" mt="md" gap="xs">
        <Button
          variant="default"
          onClick={onClose}
          radius="sm"
          styles={{
            root: { backgroundColor: '#1f2326', color: '#909296', '&:hover': { backgroundColor: '#2a2f35' } },
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => updateMutation.mutate({
            id: token.id,
            data: {
              symbol,
              name,
              chains: chains.map(c => ({
                chain: c.chain,
                contract_address: c.contract_address || undefined,
                decimals: c.decimals,
                tradingview_symbol: c.tradingview_symbol || undefined,
              })),
              coingecko_id: coingeckoId || undefined,
            }
          })}
          loading={updateMutation.isPending}
          disabled={!chains[0]?.chain}
          radius="sm"
          styles={{
            root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
          }}
        >
          Guardar Cambios
        </Button>
      </Group>
    </Modal>
  );
}
