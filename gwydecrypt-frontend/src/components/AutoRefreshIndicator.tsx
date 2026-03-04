import { Group, Badge, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useAutoRefreshStore } from '../store/autoRefreshStore';

export default function AutoRefreshIndicator() {
  const interval = useAutoRefreshStore((state) => state.interval);

  const getIntervalLabel = () => {
    switch (interval) {
      case '5m': return '5 min';
      case '15m': return '15 min';
      case '30m': return '30 min';
      case '1h': return '1 hora';
      case 'off': return 'Desactivado';
      default: return '';
    }
  };

  const getColor = () => {
    switch (interval) {
      case '5m': return 'cyan';
      case '15m': return 'blue';
      case '30m': return 'violet';
      case '1h': return 'purple';
      case 'off': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Tooltip label="Auto-actualización" position="bottom">
      <Group spacing="xs" style={{ cursor: 'default' }}>
        <IconRefresh size={14} color={interval !== 'off' ? '#667eea' : '#909296'} />
        <Badge
          color={getColor()}
          radius="sm"
          variant="light"
          size="xs"
        >
          {getIntervalLabel()}
        </Badge>
      </Group>
    </Tooltip>
  );
}
