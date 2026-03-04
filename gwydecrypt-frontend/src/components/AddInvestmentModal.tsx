import { useState } from 'react';
import {
  Modal,
  Stack,
  NumberInput,
  Select,
  Button,
  Text,
  TextInput,
} from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import { CHAIN_OPTIONS } from '../constants';

interface AddInvestmentModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInvestmentModal({
  opened,
  onClose,
  onSuccess,
}: AddInvestmentModalProps) {
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [chain, setChain] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Calcular precio por token cuando cambia el total
  const handleTotalUsdChange = (val: number | string) => {
    const total = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;
    setTotalUsd(total as number);

    // Si hay cantidad y total, calcular precio por token
    if (total > 0 && amount > 0) {
      setPurchasePrice(total / amount);
    }
  };

  // Calcular total cuando cambia el precio por token
  const handlePurchasePriceChange = (val: number | string) => {
    const price = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;
    setPurchasePrice(price as number);

    // Si hay cantidad y precio, calcular total
    if (price > 0 && amount > 0) {
      setTotalUsd(price * amount);
    }
  };

  // Fetch available tokens
  const { data: tokensData } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const response = await api.get('/market/tokens');
      return response.data.tokens;
    },
    enabled: opened,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/investments', data);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Éxito',
        message: 'Inversión creada correctamente',
        color: 'green',
      });
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al crear inversión',
        color: 'red',
      });
    },
  });

  const resetForm = () => {
    setTokenId(null);
    setChain('');
    setAmount(0);
    setPurchasePrice(0);
    setTotalUsd(0);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handleSubmit = () => {
    if (
      !tokenId ||
      !chain ||
      amount <= 0 ||
      totalUsd <= 0 ||
      !purchaseDate
    ) {
      notifications.show({
        title: 'Error',
        message: 'Por favor completa todos los campos requeridos',
        color: 'red',
      });
      return;
    }

    // Calcular precio por token si no se ha establecido
    const finalPrice = purchasePrice || (amount > 0 ? totalUsd / amount : 0);

    createMutation.mutate({
      token_id: tokenId,
      chain,
      amount_purchased: amount,
      purchase_price_per_token: finalPrice,
      purchase_total_usd: totalUsd,
      purchase_date: new Date(purchaseDate).toISOString(),
      notes: notes || undefined,
    });
  };

  const tokenOptions = tokensData?.map((token: any) => ({
    value: token.id.toString(),
    label: `${token.symbol} - ${token.name}`,
  })) || [];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="18" fw={600} c="white">Añadir Inversión (DCA)</Text>}
      centered
      size="md"
      radius="lg"
    >
      <Stack gap="md">
        <Select
          label="Token"
          placeholder="Selecciona un token"
          data={tokenOptions}
          value={tokenId?.toString()}
          onChange={(value) => setTokenId(value ? parseInt(value) : null)}
          searchable
          required
        />

        <Select
          label="Blockchain"
          placeholder="Selecciona la blockchain"
          data={CHAIN_OPTIONS}
          value={chain}
          onChange={(value) => setChain(value || '')}
          required
        />

        <NumberInput
          label="Cantidad Comprada"
          placeholder="0.00"
          value={amount}
          onChange={(val) => setAmount(val === '' ? 0 : (typeof val === 'number' ? val : parseFloat(val) || 0))}
          min={0}
          step={0.000001}
          precision={18}
          required
        />

        <NumberInput
          label="Precio por Token (USD)"
          placeholder="0.00"
          value={purchasePrice}
          onChange={handlePurchasePriceChange}
          min={0}
          step={0.01}
          precision={2}
          prefix="$"
          required
        />

        <NumberInput
          label="Total Pagado (USD)"
          placeholder="0.00"
          value={totalUsd}
          onChange={handleTotalUsdChange}
          min={0}
          step={0.01}
          precision={2}
          prefix="$"
          required
        />

        <TextInput
          label="Fecha de Compra"
          placeholder="YYYY-MM-DD"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.currentTarget.value)}
          required
        />

        <TextInput
          label="Notas (opcional)"
          placeholder="Añade notas sobre esta inversión"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Button
          onClick={handleSubmit}
          loading={createMutation.isPending}
          disabled={
            !tokenId || !chain || amount <= 0 || totalUsd <= 0 || !purchaseDate
          }
          fullWidth
        >
          Crear Inversión
        </Button>
      </Stack>
    </Modal>
  );
}
