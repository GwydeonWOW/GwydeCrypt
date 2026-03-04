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

interface EditInvestmentModalProps {
  opened: boolean;
  investment: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditInvestmentModal({
  opened,
  investment,
  onClose,
  onSuccess,
}: EditInvestmentModalProps) {
  const [amountPurchased, setAmountPurchased] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (opened && investment) {
      setAmountPurchased(investment.amount_purchased);
      setPurchasePrice(investment.purchase_price_per_token);
      setTotalUsd(investment.purchase_total_usd);
      setPurchaseDate(investment.purchase_date ? investment.purchase_date.split('T')[0] : '');
      setNotes(investment.notes || '');
    } else {
      // Reset when closed
      setAmountPurchased(0);
      setPurchasePrice(0);
      setTotalUsd(0);
      setPurchaseDate('');
      setNotes('');
    }
  }, [opened, investment]);

  // Calcular precio por token cuando cambia el total
  const handleTotalUsdChange = (val: number | string) => {
    const total = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;
    setTotalUsd(total as number);

    // Si hay cantidad y total, calcular precio por token
    if (total > 0 && amountPurchased > 0) {
      setPurchasePrice(total / amountPurchased);
    }
  };

  // Calcular total cuando cambia el precio por token
  const handlePurchasePriceChange = (val: number | string) => {
    const price = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;
    setPurchasePrice(price as number);

    // Si hay cantidad y precio, calcular total
    if (price > 0 && amountPurchased > 0) {
      setTotalUsd(price * amountPurchased);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await api.put(`/investments/${id}`, data);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Éxito',
        message: 'Compra actualizada correctamente',
        color: 'green',
      });
      onSuccess();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al actualizar compra',
        color: 'red',
      });
    },
  });

  const handleSubmit = () => {
    if (amountPurchased <= 0) {
      notifications.show({
        title: 'Error',
        message: 'La cantidad comprada debe ser mayor que 0',
        color: 'red',
      });
      return;
    }

    if (purchasePrice < 0) {
      notifications.show({
        title: 'Error',
        message: 'El precio de compra no puede ser negativo',
        color: 'red',
      });
      return;
    }

    if (!purchaseDate) {
      notifications.show({
        title: 'Error',
        message: 'La fecha de compra es requerida',
        color: 'red',
      });
      return;
    }

    updateMutation.mutate({
      id: investment.id,
      data: {
        amount_purchased: amountPurchased,
        purchase_price_per_token: purchasePrice,
        purchase_date: purchaseDate,
        notes: notes || null,
      },
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Editar Compra</Text>}
      size="md"
      key={investment?.id || 'edit-investment-modal'}
    >
      <Stack>
        <Group grow>
          <NumberInput
            label="Cantidad comprada"
            description={investment?.token?.symbol}
            value={amountPurchased}
            onChange={(val) => setAmountPurchased(Number(val) || 0)}
            min={0}
            step={0.000001}
            precision={6}
            required
          />
          <NumberInput
            label="Precio por token ($)"
            value={purchasePrice}
            onChange={handlePurchasePriceChange}
            min={0}
            step={0.01}
            precision={6}
            required
          />
        </Group>

        <NumberInput
          label="Total compra ($)"
          value={totalUsd}
          onChange={handleTotalUsdChange}
          min={0}
          step={0.01}
          precision={2}
          required
        />

        <TextInput
          label="Fecha de compra"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.currentTarget.value)}
          required
        />

        <TextInput
          label="Notas"
          placeholder="Opcional"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        {investment?.token && (
          <Text size="sm" c="dimmed">
            Token: {investment.token.symbol} ({investment.token.name})
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
