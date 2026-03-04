import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  TextInput,
  NumberInput,
  Button,
  Select,
  Text,
  Paper,
  Badge,
} from '@mantine/core';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { CHAIN_DISPLAY_NAMES } from '../constants';

interface SellInvestmentModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SellInvestmentModal({ opened, onClose, onSuccess }: SellInvestmentModalProps) {
  const [investmentId, setInvestmentId] = useState<string | null>(null);
  const [amountSold, setAmountSold] = useState<number>(0);
  const [salePricePerToken, setSalePricePerToken] = useState<number>(0);
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [lastFieldChanged, setLastFieldChanged] = useState<'price' | 'total' | null>(null);

  // Fetch available investments (with remaining amount)
  const { data: investments } = useQuery({
    queryKey: ['investments-available'],
    queryFn: async () => {
      const response = await api.get('/sales/available');
      return response.data.investments;
    },
    enabled: opened,
  });

  // Get selected investment
  const selectedInvestment = investments?.find((inv: any) => inv.id === parseInt(investmentId || ''));

  // Calculate total when amount or price changes
  useEffect(() => {
    if (lastFieldChanged === 'price' || lastFieldChanged === null) {
      setTotalUsd(amountSold * salePricePerToken);
    }
  }, [amountSold, salePricePerToken]);

  // Calculate price per token when total changes
  useEffect(() => {
    if (lastFieldChanged === 'total' && amountSold > 0) {
      setSalePricePerToken(totalUsd / amountSold);
    }
  }, [totalUsd]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!opened) {
      setInvestmentId(null);
      setAmountSold(0);
      setSalePricePerToken(0);
      setSaleDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setTotalUsd(0);
      setLastFieldChanged(null);
    }
  }, [opened]);

  const sellMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/sales', {
        investment_id: investmentId,
        amount_sold: amountSold,
        sale_price_per_token: salePricePerToken,
        sale_date: saleDate,
        notes: notes || null,
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Venta registrada',
        message: 'La venta se ha registrado correctamente',
        color: 'green',
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al registrar la venta',
        color: 'red',
      });
    },
  });

  const handleSubmit = () => {
    if (!investmentId || amountSold <= 0) {
      notifications.show({
        title: 'Validación',
        message: 'Por favor ingresa la cantidad vendida',
        color: 'yellow',
      });
      return;
    }

    if (totalUsd <= 0) {
      notifications.show({
        title: 'Validación',
        message: 'Por favor ingresa el total de la venta',
        color: 'yellow',
      });
      return;
    }

    // Check if enough tokens remaining
    if (selectedInvestment && amountSold > selectedInvestment.amount_remaining) {
      notifications.show({
        title: 'Error',
        message: `Solo tienes ${selectedInvestment.amount_remaining.toFixed(6)} tokens disponibles`,
        color: 'red',
      });
      return;
    }

    sellMutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Registrar Venta</Text>}
      size="md"
      radius="sm"
    >
      <Stack gap="md">
        {/* Investment Selection */}
        <Select
          label="Inversión"
          placeholder="Selecciona una inversión"
          data={investments?.map((inv: any) => ({
            value: inv.id.toString(),
            label: `${inv.token.symbol} - ${CHAIN_DISPLAY_NAMES[inv.chain as keyof typeof CHAIN_DISPLAY_NAMES] || inv.chain} (${inv.amount_remaining.toFixed(6)} disponibles)`,
          })) || []}
          value={investmentId}
          onChange={setInvestmentId}
          searchable
        />

        {/* Selected Investment Info */}
        {selectedInvestment && (
          <Paper p="sm" radius="sm" withBorder style={{ backgroundColor: '#0d0f12', borderColor: '#1f2326' }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="12" c="dimmed">Precio Medio Compra</Text>
                <Text size="13" fw={600} c="white">${selectedInvestment.average_buy_price.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="12" c="dimmed">Disponibles</Text>
                <Text size="13" fw={600} c="#4ade80">{selectedInvestment.amount_remaining.toFixed(6)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="12" c="dimmed">PnL Estimado</Text>
                <Text size="13" fw={600} c={salePricePerToken >= selectedInvestment.average_buy_price ? '#4ade80' : '#f87171'}>
                  {((salePricePerToken - selectedInvestment.average_buy_price) * amountSold).toFixed(2)} USD
                </Text>
              </Group>
            </Stack>
          </Paper>
        )}

        <NumberInput
          label="Cantidad Vendida"
          placeholder="0.00"
          value={amountSold}
          onChange={(val) => {
            const newAmount = val === '' ? 0 : (typeof val === 'number' ? val : parseFloat(val) || 0);
            setAmountSold(newAmount);
            setLastFieldChanged('price');
          }}
          precision={18}
          step={0.000001}
          min={0}
          max={selectedInvestment?.amount_remaining || 0}
          disabled={!investmentId}
        />

        <NumberInput
          label="Precio de Venta por Token (USD)"
          placeholder="0.00 (calculado)"
          value={salePricePerToken}
          onChange={(val) => {
            const newPrice = val === '' ? 0 : (typeof val === 'number' ? val : parseFloat(val) || 0);
            setSalePricePerToken(newPrice);
            setLastFieldChanged('price');
          }}
          precision={2}
          step={0.01}
          min={0}
          prefix="$"
          disabled={!investmentId}
          description="Se recalcula si cambias el total"
        />

        <NumberInput
          label="Total de Venta (USD) 💰"
          placeholder="0.00"
          value={totalUsd}
          onChange={(val) => {
            const newTotal = val === '' ? 0 : (typeof val === 'number' ? val : parseFloat(val) || 0);
            setTotalUsd(newTotal);
            setLastFieldChanged('total');
          }}
          precision={2}
          step={0.01}
          min={0}
          prefix="$"
          disabled={!investmentId}
          description="Ingresa el total y se calculará el precio por token"
          styles={{
            input: {
              backgroundColor: '#1f2326',
              borderColor: '#667eea',
              borderWidth: '2px',
            },
          }}
        />

        <TextInput
          label="Fecha de Venta"
          type="date"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
        />

        <TextInput
          label="Notas (opcional)"
          placeholder="Añade notas sobre esta venta..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose} radius="sm">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={sellMutation.isPending}
            radius="sm"
            color="green"
          >
            Registrar Venta
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
