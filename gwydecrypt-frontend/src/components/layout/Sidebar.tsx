import React from 'react';
import { UnstyledButton, Group, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { NavItem } from './NavItem';
import { UserMenu } from './UserMenu';

export interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface SidebarProps {
  navigationItems: NavigationItem[];
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = React.memo(function Sidebar({ navigationItems, collapsed, onToggle }: SidebarProps) {

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100vh',
      width: collapsed ? '80px' : '260px',
      backgroundColor: '#141719',
      borderRight: '1px solid #1f2326',
      transition: 'width 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0' : '0 24px',
        borderBottom: '1px solid #1f2326',
      }}>
        {!collapsed && (
          <Group spacing="xs">
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '16px',
              color: 'white',
            }}>
              G
            </div>
            <Text fw={700} size="18" c="white">GwydeCrypt</Text>
          </Group>
        )}
        <UnstyledButton
          onClick={onToggle}
          sx={{
            p: '8px',
            color: '#909296',
            '&:hover': {
              color: '#fff',
              backgroundColor: '#1f2326',
              borderRadius: '4px',
            },
          }}
        >
          {collapsed ? <IconChevronRight size={20} /> : <IconChevronLeft size={20} />}
        </UnstyledButton>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '16px' }}>
        {navigationItems.map((item) => (
          <NavItem
            key={item.path}
            {...item}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* User Section */}
      <div style={{
        borderTop: '1px solid #1f2326',
        padding: '16px',
      }}>
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  );
});
