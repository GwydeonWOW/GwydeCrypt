import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  NumberInput,
  Button,
  Text,
  TextInput,
  Group,
} from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';

interface EditSaleModalProps {
  opened: boolean;
  sale: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSaleModal({
  opened,
  sale,
  onClose,
  onSuccess,
}: EditSaleModalProps) {
  const [amountSold, setAmountSold] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [saleDate, setSaleDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (opened && sale) {
      setAmountSold(sale.amount_sold);
      setSalePrice(sale.sale_price_per_token);
      setTotalUsd(sale.sale_total_usd);
      setSaleDate(sale.sale_date ? sale.sale_date.split('T')[0] : '');
      setNotes(sale.notes || '');
    } else {
      // Reset when closed
      setAmountSold(0);
      setSalePrice(0);
      setTotalUsd(0);
      setSaleDate('');
      setNotes('');
    }
  }, [opened, sale]);

  // Calcular precio por token cuando cambia el total
  const handleTotalUsdChange = (val: number | string) => {
    const total = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;
    setTotalUsd(total as number);

    // Si hay cantidad y total, calcular precio por token
    if (total > 0 && amountSold > 0) {
      setSalePrice(total / amountSold);
    }
  };

  // Calcular total cuando cambia el precio por token
  const handleSalePriceChange = (val: number | string) => {
    const price = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;
    setSalePrice(price as number);

    // Si hay cantidad y precio, calcular total
    if (price > 0 && amountSold > 0) {
      setTotalUsd(price * amountSold);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await api.put(`/sales/${id}`, data);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Éxito',
        message: 'Venta actualizada correctamente',
        color: 'green',
      });
      onSuccess();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al actualizar venta',
        color: 'red',
      });
    },
  });

  const handleSubmit = () => {
    if (amountSold <= 0) {
      notifications.show({
        title: 'Error',
        message: 'La cantidad vendida debe ser mayor que 0',
        color: 'red',
      });
      return;
    }

    if (salePrice < 0) {
      notifications.show({
        title: 'Error',
        message: 'El precio de venta no puede ser negativo',
        color: 'red',
      });
      return;
    }

    if (!saleDate) {
      notifications.show({
        title: 'Error',
        message: 'La fecha de venta es requerida',
        color: 'red',
      });
      return;
    }

    updateMutation.mutate({
      id: sale.id,
      data: {
        amount_sold: amountSold,
        sale_price_per_token: salePrice,
        sale_date: saleDate,
        notes: notes || null,
      },
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Editar Venta</Text>}
      size="md"
      key={sale?.id || 'edit-sale-modal'}
    >
      <Stack>
        <Group grow>
          <NumberInput
            label="Cantidad vendida"
            description={sale?.investment?.token?.symbol}
            value={amountSold}
            onChange={(val) => setAmountSold(Number(val) || 0)}
            min={0}
            step={0.000001}
            precision={6}
            required
          />
          <NumberInput
            label="Precio por token ($)"
            value={salePrice}
            onChange={handleSalePriceChange}
            min={0}
            step={0.01}
            precision={6}
            required
          />
        </Group>

        <NumberInput
          label="Total venta ($)"
          value={totalUsd}
          onChange={handleTotalUsdChange}
          min={0}
          step={0.01}
          precision={2}
          required
        />

        <TextInput
          label="Fecha de venta"
          type="date"
          value={saleDate}
          onChange={(e) => setSaleDate(e.currentTarget.value)}
          required
        />

        <TextInput
          label="Notas"
          placeholder="Opcional"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        {sale?.investment && (
          <Text size="sm" c="dimmed">
            Inversión: {sale.investment.token.symbol} ({sale.investment.chain})
          </Text>
        )}

        <Group position="right" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
          >
            Guardar cambios
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
