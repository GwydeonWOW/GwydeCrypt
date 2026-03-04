import { useState, useEffect } from 'react';
import { Title, Grid, Paper, Stack, Group, Text, Badge, ActionIcon, Modal, TextInput, Select, Button, Alert, NumberInput } from '@mantine/core';
import { IconPlus, IconTrash, IconWallet, IconEdit, IconCoin, IconX } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { PrivacyValue } from '../components/PrivacyValue';
import { CHAIN_DISPLAY_NAMES, CHAIN_COLORS, CHAIN_BADGE_COLORS, CHAIN_OPTIONS } from '../constants';

// Chains virtuales que no permiten wallets
const VIRTUAL_CHAINS = ['commodities', 'fiat'];
const WALLET_CHAIN_OPTIONS = CHAIN_OPTIONS.filter(c => !VIRTUAL_CHAINS.includes(c.value));

export default function Wallets() {
  const [opened, setOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [tokenOpened, setTokenOpened] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const queryClient = useQueryClient();

  const open = () => setOpened(true);
  const close = () => setOpened(false);

  const handleOpenModal = () => {
    open();
  };

  const handleEdit = (wallet: any) => {
    setEditingWallet(wallet);
    setEditOpened(true);
  };

  const handleManageTokens = (wallet: any) => {
    setSelectedWallet(wallet);
    setTokenOpened(true);
  };

  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await api.get('/wallets');
      return response.data.wallets;
    },
  });

  const walletList = Array.isArray(wallets) ? wallets : [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/wallets/${id}`);
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Wallet eliminada', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const response = await api.put(`/wallets/${id}`, { label });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Wallet actualizada', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setEditOpened(false);
      setEditingWallet(null);
    },
  });

  if (walletList.length === 0) {
    return (
      <>
        <Stack gap="xl">
          <Title order={2} c="white">Wallets</Title>
          <Group justify="space-between">
            <Text c="dimmed" size="lg">Gestiona tus wallets de criptomonedas</Text>
            <Button onClick={handleOpenModal} radius="sm" styles={{
              root: { backgroundColor: '#2a2f35', color: '#c1c2c5', '&:hover': { backgroundColor: '#373a40' } },
            }}>
              <Group gap="xs">
                <IconPlus size={16} />
                <span>NUEVA WALLET</span>
              </Group>
            </Button>
          </Group>
          <Alert
            color="gray"
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
            }}
          >
            No se encontraron wallets. Haz clic en "Nueva Wallet" para comenzar.
          </Alert>
        </Stack>
        <AddWalletModal opened={opened} onClose={close} />
      </>
    );
  }

  return (
    <>
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={2} c="white">Wallets</Title>
          <Button onClick={handleOpenModal} radius="sm" styles={{
            root: { backgroundColor: '#2a2f35', color: '#c1c2c5', '&:hover': { backgroundColor: '#373a40' } },
          }}>
            <Group gap="xs">
              <IconPlus size={16} />
              <span>NUEVA WALLET</span>
            </Group>
          </Button>
        </Group>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '16px' }}>
          {walletList.map((wallet: any) => (
            <Paper
              key={wallet.id}
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
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="md">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <IconWallet size={24} color="white" />
                    </div>
                    <div>
                      <Text fw={600} size="16" c="white">{wallet.label || 'Wallet sin nombre'}</Text>
                      <Text size="13" c="dimmed" style={{ fontFamily: 'monospace' }}>
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </Text>
                    </div>
                  </Group>
                  <Badge
                    color={CHAIN_BADGE_COLORS[wallet.chain as keyof typeof CHAIN_BADGE_COLORS] || 'orange'}
                    radius="sm"
                    variant="light"
                    sx={{
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {CHAIN_DISPLAY_NAMES[wallet.chain as keyof typeof CHAIN_DISPLAY_NAMES] || wallet.chain}
                  </Badge>
                </Group>

                {wallet.wallet_tokens && wallet.wallet_tokens.length > 0 && (
                  <Stack gap="xs" mt="sm">
                    <Text size="12" c="dimmed" fw={500}>TOKENS</Text>
                    {wallet.wallet_tokens.map((wt: any) => (
                      <Group key={wt.id} justify="space-between" px="xs" py="4" style={{
                        backgroundColor: '#0d0f12',
                        borderRadius: '6px',
                      }}>
                        <Group gap="xs">
                          <IconCoin size={16} color="#909296" />
                          <Text size="13" c="white" fw={500}>{wt.token.symbol}</Text>
                          <Text size="12" c="dimmed">{parseFloat(wt.balance).toFixed(4)}</Text>
                        </Group>
                        <Text size="13" c="white"><PrivacyValue value={wt.value_usd || 0} /></Text>
                      </Group>
                    ))}
                    <Group justify="space-between" mt="4" px="xs">
                      <Text size="12" c="dimmed">Total</Text>
                      <Text size="14" c="white" fw={600}>
                        <PrivacyValue value={wallet.wallet_tokens.reduce((sum: number, wt: any) => sum + parseFloat(wt.value_usd || 0), 0)} />
                      </Text>
                    </Group>
                  </Stack>
                )}

                <Group justify="flex-end" gap="xs">
                  <Button
                    variant="light"
                    color="blue"
                    size="sm"
                    radius="sm"
                    onClick={() => handleManageTokens(wallet)}
                  >
                    <Group gap="xs">
                      <IconCoin size={16} />
                      <span>Tokens</span>
                    </Group>
                  </Button>
                  <ActionIcon
                    variant="light"
                    color="yellow"
                    size="lg"
                    radius="sm"
                    onClick={() => handleEdit(wallet)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    size="lg"
                    radius="sm"
                    onClick={() => { if(confirm('¿Eliminar wallet?')) deleteMutation.mutate(wallet.id); }}
                    loading={deleteMutation.isPending}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Paper>
          ))}
        </div>
      </Stack>
      <AddWalletModal opened={opened} onClose={close} />
      <EditWalletModal opened={editOpened} onClose={() => { setEditOpened(false); setEditingWallet(null); }} wallet={editingWallet} updateMutation={updateMutation} />
      <ManageTokensModal opened={tokenOpened} onClose={() => { setTokenOpened(false); setSelectedWallet(null); }} wallet={selectedWallet} />
    </>
  );
}

function AddWalletModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<string>('eth');
  const [label, setLabel] = useState('');

  const handleChainChange = (value: string | null) => {
    const newChain = value || 'eth';
    setChain(newChain);
    setLabel(CHAIN_DISPLAY_NAMES[newChain as keyof typeof CHAIN_DISPLAY_NAMES]);
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/wallets', data);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Wallet añadida', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      onClose();
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Añadir Nueva Wallet</Text>}
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
        <TextInput
          label="Dirección de la Wallet"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
        <TextInput
          label="Nombre de la Wallet"
          placeholder="Mi Wallet de Ethereum"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          radius="sm"
          styles={{
            label: { color: '#909296', marginBottom: '4px' },
            input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
          }}
        />
        <Select
          label="Blockchain"
          placeholder="Selecciona blockchain"
          data={WALLET_CHAIN_OPTIONS}
          value={chain}
          onChange={handleChainChange}
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
            onClick={() => mutation.mutate({ address, chain, label: label || undefined })}
            loading={mutation.isPending}
            radius="sm"
            styles={{
              root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
            }}
          >
            Añadir Wallet
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EditWalletModal({ opened, onClose, wallet, updateMutation }: { opened: boolean; onClose: () => void; wallet: any; updateMutation: any }) {
  const [label, setLabel] = useState(wallet?.label || '');

  useEffect(() => {
    if (wallet) {
      setLabel(wallet.label || '');
    }
  }, [wallet]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Editar Wallet</Text>}
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
        <Text size="13" c="dimmed">Dirección de la wallet: {wallet?.address}</Text>
        <TextInput
          label="Nombre de la Wallet"
          placeholder="Mi Wallet de Ethereum"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
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
            onClick={() => updateMutation.mutate({ id: wallet.id, label: label || undefined })}
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

function ManageTokensModal({ opened, onClose, wallet }: { opened: boolean; onClose: () => void; wallet: any }) {
  const queryClient = useQueryClient();
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | ''>('');
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editingBalance, setEditingBalance] = useState<number | ''>('');

  const { data: allTokens } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const response = await api.get('/market/tokens');
      return response.data.tokens;
    },
    enabled: opened,
  });

  const walletTokens = wallet?.wallet_tokens || [];

  // Filtrar tokens: primero por chain de la wallet, luego excluir los ya añadidos
  const availableTokens = allTokens?.filter((t: any) => {
    // Check if token has wallet's chain in token_chains
    const hasChain = t.token_chains && t.token_chains.some((tc: any) => tc.chain === wallet?.chain);
    const notAdded = !walletTokens.some((wt: any) => wt.token.id === t.id);
    return hasChain && notAdded;
  }) || [];

  const addTokenMutation = useMutation({
    mutationFn: async (data: { token_id: string; balance: number }) => {
      const response = await api.post(`/wallets/${wallet.id}/tokens`, {
        token_id: parseInt(data.token_id),
        balance: data.balance,
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Token añadido a la wallet', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setTokenId(null);
      setBalance('');
    },
  });

  const removeTokenMutation = useMutation({
    mutationFn: async (token_id: string) => {
      await api.delete(`/wallets/${wallet.id}/tokens/${token_id}`);
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Token eliminado de la wallet', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });

  const updateTokenMutation = useMutation({
    mutationFn: async (data: { token_id: string; balance: number }) => {
      const response = await api.put(`/wallets/${wallet.id}/tokens/${data.token_id}`, {
        balance: data.balance,
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Token actualizado', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setEditingTokenId(null);
      setEditingBalance('');
    },
  });

  const handleAddToken = () => {
    if (tokenId && balance !== '' && balance > 0) {
      addTokenMutation.mutate({ token_id: tokenId, balance: balance });
    }
  };

  const startEdit = (token_id: string, currentBalance: number) => {
    setEditingTokenId(token_id);
    setEditingBalance(currentBalance);
  };

  const cancelEdit = () => {
    setEditingTokenId(null);
    setEditingBalance('');
  };

  const saveEdit = (token_id: string) => {
    if (editingBalance !== '' && typeof editingBalance === 'number' && editingBalance > 0) {
      updateTokenMutation.mutate({ token_id, balance: editingBalance });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Gestionar Tokens</Text>}
      centered
      radius="lg"
      size="lg"
      styles={{
        content: { backgroundColor: '#141719' },
        header: { borderBottom: '1px solid #1f2326', backgroundColor: '#141719' },
        body: { backgroundColor: '#141719' },
        close: { color: '#909296', '&:hover': { color: '#fff' } },
      }}
    >
      <Stack gap="md">
        <Group gap="xs">
          <Text size="13" c="dimmed">Wallet: {wallet?.label || wallet?.address}</Text>
          <Badge
            color={wallet?.chain ? CHAIN_BADGE_COLORS[wallet?.chain as keyof typeof CHAIN_BADGE_COLORS] || 'orange' : 'orange'}
            radius="sm"
            variant="light"
          >
            {wallet?.chain?.toUpperCase()}
          </Badge>
        </Group>

        <Paper p="sm" radius="sm" withBorder sx={{ backgroundColor: '#0d0f12', borderColor: '#1f2326' }}>
          <Text size="13" fw={500} c="white" mb="xs">Añadir Token ({wallet?.chain?.toUpperCase()})</Text>
          <Group gap="xs">
            {availableTokens.length === 0 ? (
              <Text size="13" c="dimmed" fs="italic">No hay tokens disponibles para {wallet?.chain?.toUpperCase()}</Text>
            ) : (
              <Select
                placeholder="Selecciona token"
                data={availableTokens.map((t: any) => ({ value: t.id.toString(), label: `${t.symbol} - ${t.name}` }))}
                value={tokenId}
                onChange={setTokenId}
                withinPortal
                styles={{
                  input: { backgroundColor: '#141719', borderColor: '#1f2326', color: 'white', minWidth: '200px' },
                  dropdown: { backgroundColor: '#141719', borderColor: '#1f2326' },
                  item: { color: '#909296' },
                }}
              />
            )}
            <NumberInput
              placeholder="Cantidad"
              value={balance}
              onChange={(value) => setBalance(value === '' ? '' : value)}
              precision={18}
              min={0}
              step={0.00000001}
              styles={{
                input: { backgroundColor: '#141719', borderColor: '#1f2326', color: 'white', width: '150px' },
              }}
            />
            <Button
              onClick={handleAddToken}
              loading={addTokenMutation.isPending}
              disabled={!tokenId || availableTokens.length === 0 || balance === '' || parseFloat(balance.toString()) <= 0}
              radius="sm"
              styles={{
                root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
              }}
            >
              <IconPlus size={16} />
            </Button>
          </Group>
        </Paper>

        <Stack gap="xs">
          <Text size="13" fw={500} c="white">Tokens en esta Wallet</Text>
          {walletTokens.length === 0 ? (
            <Text size="13" c="dimmed">No hay tokens añadidos</Text>
          ) : (
            walletTokens.map((wt: any) => (
              <Group key={wt.id} justify="space-between" p="xs" style={{
                backgroundColor: '#0d0f12',
                borderRadius: '6px',
              }}>
                {editingTokenId === wt.token.id.toString() ? (
                  <Group gap="xs">
                    <IconCoin size={16} color="#909296" />
                    <Text size="14" c="white" fw={500}>{wt.token.symbol}</Text>
                    <NumberInput
                      value={editingBalance}
                      onChange={(value) => setEditingBalance(value === '' ? '' : value)}
                      precision={18}
                      min={0}
                      step={0.00000001}
                      size="xs"
                      styles={{
                        input: { backgroundColor: '#141719', borderColor: '#1f2326', color: 'white', width: '120px' },
                      }}
                    />
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="sm"
                      radius="sm"
                      onClick={() => saveEdit(wt.token.id.toString())}
                      loading={updateTokenMutation.isPending}
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="gray"
                      size="sm"
                      radius="sm"
                      onClick={cancelEdit}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                ) : (
                  <>
                    <Group gap="xs">
                      <IconCoin size={16} color="#909296" />
                      <Text size="14" c="white" fw={500}>{wt.token.symbol}</Text>
                      <Text size="13" c="dimmed">{parseFloat(wt.balance).toFixed(4)}</Text>
                      <Text size="13" c="white">≈ <PrivacyValue value={wt.value_usd || 0} /></Text>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="yellow"
                        size="sm"
                        radius="sm"
                        onClick={() => startEdit(wt.token.id.toString(), parseFloat(wt.balance))}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        radius="sm"
                        onClick={() => removeTokenMutation.mutate(wt.token.id.toString())}
                        loading={removeTokenMutation.isPending}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  </>
                )}
              </Group>
            ))
          )}
        </Stack>

        {walletTokens.length > 0 && (
          <Group justify="space-between" p="xs" style={{
            backgroundColor: '#1f2326',
            borderRadius: '6px',
          }}>
            <Text size="14" fw={600} c="white">Total</Text>
            <Text size="16" fw={600} c="white">
              <PrivacyValue value={walletTokens.reduce((sum: number, wt: any) => sum + parseFloat(wt.value_usd || 0), 0)} />
            </Text>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
