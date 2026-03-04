import { useState } from 'react';
import { Title, Paper, Stack, Text, Tabs } from '@mantine/core';
import TokensManagement from '../components/TokensManagement';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { Group, Button, Badge, Modal, TextInput, NumberInput, Select, ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { CHAIN_OPTIONS } from '../constants';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<string | null>('providers');

  return (
    <Stack gap="xl">
      <Title order={2} c="white">Panel de Administración</Title>

      <Paper
        p="md"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="providers">Proveedores API</Tabs.Tab>
            <Tabs.Tab value="tokens">Tokens</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="providers" pt="md">
            <ProvidersManagement />
          </Tabs.Panel>

          <Tabs.Panel value="tokens" pt="md">
            <TokensManagement />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
}

function ProvidersManagement() {
  const [opened, setOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await api.get('/admin/providers');
      return response.data.providers;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/providers/${id}`);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Provider deleted', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/admin/providers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Provider updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setEditOpened(false);
      setEditingProvider(null);
    },
  });

  const providerList = Array.isArray(providers) ? providers : [];

  const handleEditProvider = (provider: any) => {
    setEditingProvider(provider);
    setEditOpened(true);
  };

  const rows = providerList.map((provider: any) => (
    <tr key={provider.id} style={{ borderColor: '#1f2326' }}>
      <td style={{ padding: '12px 16px', color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>{provider.name}</td>
      <td style={{ padding: '12px 16px', color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        <Badge
          color={provider.provider_type === 'blockchain' ? 'blue' : 'green'}
          radius="sm"
          variant="light"
          sx={{
            textTransform: 'uppercase',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {provider.provider_type || 'price'}
        </Badge>
      </td>
      <td style={{ padding: '12px 16px', color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>{provider.chain || '-'}</td>
      <td style={{ padding: '12px 16px', color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>{provider.base_url}</td>
      <td style={{ padding: '12px 16px', color: 'white', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>{provider.priority}</td>
      <td style={{ padding: '12px 16px' }}>
        <Badge
          color={provider.is_active ? 'green' : 'gray'}
          radius="sm"
          variant="light"
          sx={{
            textTransform: 'capitalize',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {provider.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="yellow"
            size="lg"
            radius="sm"
            onClick={() => handleEditProvider(provider)}
          >
            <IconEdit size={18} />
          </ActionIcon>
          <Button
            size="xs"
            variant="light"
            color="red"
            onClick={() => { if(confirm('¿Eliminar proveedor?')) deleteMutation.mutate(provider.id); }}
            loading={deleteMutation.isPending}
            radius="sm"
          >
            Eliminar
          </Button>
        </Group>
      </td>
    </tr>
  ));

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button
          onClick={() => setOpened(true)}
          radius="sm"
          styles={{
            root: { backgroundColor: '#2a2f35', color: '#c1c2c5', '&:hover': { backgroundColor: '#373a40' } },
          }}
        >
          <Group gap="xs">
            <IconPlus size={16} />
            <span>AÑADIR PROVEEDOR</span>
          </Group>
        </Button>
      </Group>
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2326' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Nombre</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Tipo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Red</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>URL Base</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Prioridad</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </Paper>
      <AddProviderModal opened={opened} onClose={() => setOpened(false)} />
      <EditProviderModal opened={editOpened} onClose={() => { setEditOpened(false); setEditingProvider(null); }} provider={editingProvider} updateMutation={updateMutation} />
    </>
  );
}

function AddProviderModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<string>('price');
  const [chain, setChain] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [priority, setPriority] = useState(1);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/admin/providers', data);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Provider added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      onClose();
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Añadir Proveedor API</Text>}
      centered
      radius="lg"
      styles={{
        content: { backgroundColor: '#141719' },
        header: { borderBottom: '1px solid #1f2326', backgroundColor: '#141719' },
        body: { backgroundColor: '#141719' },
        close: { color: '#909296', '&:hover': { color: '#fff' } },
      }}
    >
      <Stack gap="md">
        <Select
          label="Nombre del Proveedor"
          placeholder="Seleccionar proveedor"
          data={[
            { value: 'coingecko', label: 'CoinGecko' },
            { value: 'zerion', label: 'Zerion' },
            { value: 'jupiter', label: 'Jupiter' },
          ]}
          value={name}
          onChange={(value) => setName(value || '')}
          required
          radius="sm"
          withinPortal
          zIndex={2000}
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
            dropdown: { backgroundColor: '#141719', borderColor: '#1f2326' },
            item: { color: '#909296', '&[data-selected]': { backgroundColor: 'rgba(102, 126, 234, 0.15)' }, '&:hover': { backgroundColor: '#1f2326' } },
          }}
        />
        <Select
          label="Tipo de Proveedor"
          placeholder="Seleccionar tipo"
          data={[
            { value: 'price', label: 'API de Precios' },
            { value: 'blockchain', label: 'RPC Blockchain' },
          ]}
          value={providerType}
          onChange={(value) => setProviderType(value || 'price')}
          required
          radius="sm"
          withinPortal
          zIndex={2000}
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
            dropdown: { backgroundColor: '#141719', borderColor: '#1f2326' },
            item: { color: '#909296', '&[data-selected]': { backgroundColor: 'rgba(102, 126, 234, 0.15)' }, '&:hover': { backgroundColor: '#1f2326' } },
          }}
        />
        {providerType === 'blockchain' && (
          <Select
            label="Blockchain"
            placeholder="Seleccionar blockchain"
            data={CHAIN_OPTIONS}
            value={chain}
            onChange={(value) => setChain(value || '')}
            required
            radius="sm"
            withinPortal
            zIndex={2000}
            styles={{
              label: { color: '#909296', marginBottom: '4px' },
              input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
              dropdown: { backgroundColor: '#141719', borderColor: '#1f2326' },
              item: { color: '#909296', '&[data-selected]': { backgroundColor: 'rgba(102, 126, 234, 0.15)' }, '&:hover': { backgroundColor: '#1f2326' } },
            }}
          />
        )}
        <TextInput
          label="URL Base"
          placeholder="https://api.coingecko.com/api/v3"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          required
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
        <TextInput
          label="API Key (opcional)"
          placeholder="tu-api-key-aqui"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
        <NumberInput
          label="Prioridad"
          description="Números más bajos = mayor prioridad"
          value={priority}
          onChange={(value) => setPriority(Number(value))}
          min={1}
          required
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
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
            onClick={() => mutation.mutate({
              name: name as any,
              provider_type: providerType,
              chain: providerType === 'blockchain' ? chain : undefined,
              base_url: baseUrl,
              api_key: apiKey || undefined,
              priority
            })}
            loading={mutation.isPending}
            radius="sm"
            styles={{
              root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
            }}
          >
            Añadir Proveedor
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EditProviderModal({ opened, onClose, provider, updateMutation }: { opened: boolean; onClose: () => void; provider: any; updateMutation: any }) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [priority, setPriority] = useState(1);

  // Reset form when provider changes
  if (provider && name !== provider.name) {
    setName(provider.name || '');
    setBaseUrl(provider.base_url || '');
    setApiKey(provider.api_key || '');
    setPriority(provider.priority || 1);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Editar Proveedor API</Text>}
      centered
      radius="lg"
      styles={{
        content: { backgroundColor: '#141719' },
        header: { borderBottom: '1px solid #1f2326', backgroundColor: '#141719' },
        body: { backgroundColor: '#141719' },
        close: { color: '#909296', '&:hover': { color: '#fff' } },
      }}
    >
      <Stack gap="md">
        <Select
          label="Nombre del Proveedor"
          placeholder="Seleccionar proveedor"
          data={[
            { value: 'coingecko', label: 'CoinGecko' },
            { value: 'zerion', label: 'Zerion' },
            { value: 'jupiter', label: 'Jupiter' },
          ]}
          value={name}
          onChange={(value) => setName(value || '')}
          required
          radius="sm"
          withinPortal
          zIndex={2000}
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
            dropdown: { backgroundColor: '#141719', borderColor: '#1f2326' },
            item: { color: '#909296', '&[data-selected]': { backgroundColor: 'rgba(102, 126, 234, 0.15)' }, '&:hover': { backgroundColor: '#1f2326' } },
          }}
        />
        <TextInput
          label="URL Base"
          placeholder="https://api.coingecko.com/api/v3"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          required
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
        <TextInput
          label="API Key (opcional)"
          placeholder="tu-api-key-aqui"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
        <NumberInput
          label="Prioridad"
          description="Números más bajos = mayor prioridad"
          value={priority}
          onChange={(value) => setPriority(Number(value))}
          min={1}
          required
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
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
              id: provider.id,
              data: {
                name: name as any,
                base_url: baseUrl,
                api_key: apiKey || undefined,
                priority
              }
            })}
            loading={updateMutation.isPending}
            radius="sm"
            styles={{
              root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
            }}
          >
            Guardar Cambios
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
