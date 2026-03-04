import { Group, Text, Tooltip } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { formatRelativeTime } from '../utils';

export default function LastUpdateIndicator() {
  const { data: portfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await api.get('/portfolio');
      return response.data.portfolio;
    },
    refetchInterval: false,
  });

  const lastUpdateText = portfolio?.last_price_update
    ? `Actualizado hace ${formatRelativeTime(portfolio.last_price_update)}`
    : null;

  if (!lastUpdateText) {
    return null;
  }

  return (
    <Tooltip label="Última actualización de precios" position="bottom">
      <Group spacing="xs" style={{ cursor: 'default' }}>
        <IconClock size={14} color="#909296" />
        <Text size="xs" c="dimmed">
          {lastUpdateText}
        </Text>
      </Group>
    </Tooltip>
  );
}
