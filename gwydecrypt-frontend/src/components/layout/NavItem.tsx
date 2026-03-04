import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UnstyledButton, Text } from '@mantine/core';
import type { IconProps } from '@tabler/icons-react';

interface NavItemProps {
  path: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  collapsed: boolean;
}

export const NavItem = React.memo(function NavItem({ path, label, icon: Icon, collapsed }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link to={path} style={{ textDecoration: 'none', display: 'block' }}>
      <UnstyledButton
        sx={{
          width: '100%',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? '0' : '12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          marginBottom: '4px',
          borderRadius: '4px',
          backgroundColor: isActive ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
          color: isActive ? '#667eea' : '#909296',
          fontWeight: isActive ? 600 : 'normal',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isActive ? 'rgba(102, 126, 234, 0.2)' : '#1f2326',
            color: isActive ? '#667eea' : '#fff',
          },
        }}
      >
        <Icon size={22} strokeWidth={1.5} />
        {!collapsed && <Text size="14" fw={500}>{label}</Text>}
      </UnstyledButton>
    </Link>
  );
});
