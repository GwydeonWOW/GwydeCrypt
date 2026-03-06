import { Tabs, Box } from '@mantine/core';
import { IconWallet, IconHistory } from '@tabler/icons-react';
import { PoolPositionsTab } from './PoolPositionsTab';
import { ClosedPositionsTab } from './ClosedPositionsTab';

export function PoolPositions() {
  return (
    <Tabs variant="outline" defaultValue="open">
      <Tabs.List>
        <Tabs.Tab value="open" leftSection={<IconWallet size={14} />}>
          Posiciones Actuales
        </Tabs.Tab>
        <Tabs.Tab value="closed" leftSection={<IconHistory size={14} />}>
          Historial
        </Tabs.Tab>
      </Tabs.List>

      <Box mt={30}>
        <Tabs.Panel value="open">
          <PoolPositionsTab />
        </Tabs.Panel>

        <Tabs.Panel value="closed">
          <ClosedPositionsTab />
        </Tabs.Panel>
      </Box>
    </Tabs>
  );
}
