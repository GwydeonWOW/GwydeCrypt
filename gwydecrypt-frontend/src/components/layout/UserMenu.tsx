import React from 'react';
import { UnstyledButton, Group, Text, Menu } from '@mantine/core';
import { IconUser, IconLogout, IconChevronDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface UserMenuProps {
  collapsed: boolean;
}

export const UserMenu = React.memo(function UserMenu({ collapsed }: UserMenuProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const userInitial = user?.email?.[0].toUpperCase() || 'U';

  const menuContent = (
    <Menu.Dropdown
      sx={{
        backgroundColor: '#1a1b1e',
        borderColor: '#2a2f35',
      }}
    >
      <Menu.Label sx={{ color: '#909296' }}>Cuenta</Menu.Label>

      <Menu.Item
        onClick={() => navigate('/settings')}
        icon={<IconUser size={16} />}
        sx={{
          color: '#c1c2c5',
          '&:hover': {
            backgroundColor: '#2a2f35',
            color: '#fff',
          },
        }}
      >
        Configuración
      </Menu.Item>

      <Menu.Divider />

      <Menu.Item
        onClick={logout}
        icon={<IconLogout size={16} />}
        color="red"
        sx={{
          color: '#fa5252',
          '&:hover': {
            backgroundColor: 'rgba(250, 82, 82, 0.1)',
          },
        }}
      >
        Cerrar Sesión
      </Menu.Item>
    </Menu.Dropdown>
  );

  const avatarButton = collapsed ? (
    <UnstyledButton
      sx={{
        width: '100%',
        p: '12px',
        display: 'flex',
        justifyContent: 'center',
        color: '#909296',
        '&:hover': {
          color: '#fff',
          backgroundColor: '#1f2326',
          borderRadius: '4px',
        },
      }}
    >
      <div style={{
        width: '32px',
        height: '32px',
        backgroundColor: '#1f2326',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#909296',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        {userInitial}
      </div>
    </UnstyledButton>
  ) : (
    <UnstyledButton
      sx={{
        width: '100%',
        p: '0',
      }}
    >
      <Group spacing="sm" style={{ width: '100%' }}>
        <div style={{
          width: '36px',
          height: '36px',
          backgroundColor: '#1f2326',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#909296',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          {userInitial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} c="white" truncate>{user?.email}</Text>
          <Text size="xs" c="dimmed">Admin</Text>
        </div>
        <IconChevronDown size={16} color="#909296" />
      </Group>
    </UnstyledButton>
  );

  return (
    <Menu shadow="md" width={200} position={collapsed ? "right" : "top-end"} withArrow>
      <Menu.Target>
        {avatarButton}
      </Menu.Target>
      {menuContent}
    </Menu>
  );
});
