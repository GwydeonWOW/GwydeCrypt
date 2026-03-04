import React, { useMemo } from 'react';
import { Text, Group, UnstyledButton, Tooltip } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { usePrivacyStore } from '../../store/privacyStore';
import AutoRefreshIndicator from '../AutoRefreshIndicator';
import LastUpdateIndicator from '../LastUpdateIndicator';
import { useLocation } from 'react-router-dom';

export const Header = React.memo(function Header() {
  const { hideValues, toggleValues } = usePrivacyStore();
  const location = useLocation();

  // Show last update indicator only on Dashboard and Portfolio
  const showLastUpdate = useMemo(() =>
    ['/dashboard', '/portfolio'].includes(location.pathname),
  [location.pathname]);

  const currentPageLabel = useMemo(() => {
    const path = location.pathname;
    const labels: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/portfolio': 'Portfolio',
      '/wallets': 'Wallets',
      '/pools': 'Pools',
      '/news': 'News',
      '/settings': 'Configuración',
      '/admin': 'Admin',
    };
    return labels[path] || 'Dashboard';
  }, [location.pathname]);

  return (
    <div style={{
      height: '64px',
      backgroundColor: '#141719',
      borderBottom: '1px solid #1f2326',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Text size="20" fw={600} c="white">
        {currentPageLabel}
      </Text>

      {/* Header Actions */}
      <Group spacing="sm">
        {/* Last Update Indicator - only on Dashboard and Portfolio */}
        {showLastUpdate && <LastUpdateIndicator />}

        {/* Auto-refresh Indicator */}
        <AutoRefreshIndicator />

        {/* Privacy Toggle */}
        <Tooltip label={hideValues ? 'Mostrar valores' : 'Ocultar valores'} position="bottom">
          <UnstyledButton
            onClick={toggleValues}
            sx={{
              p: '8px',
              color: hideValues ? '#667eea' : '#909296',
              backgroundColor: 'transparent',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#1f2326',
                color: hideValues ? '#764ba2' : '#fff',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {hideValues ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </UnstyledButton>
        </Tooltip>
      </Group>
    </div>
  );
});
