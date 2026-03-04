import React, { useState, useMemo, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Sidebar, type NavigationItem } from './Sidebar';
import { Header } from './Header';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  IconDashboard,
  IconWallet,
  IconChartHistogram,
  IconSettings,
  IconNews,
  IconCoins,
  IconTrophy
} from '@tabler/icons-react';

// Icons mapping
const iconMap = {
  '/dashboard': IconDashboard,
  '/portfolio': IconChartHistogram,
  '/wallets': IconWallet,
  '/pools': IconCoins,
  '/pool-positions': IconTrophy,
  '/news': IconNews,
  '/admin': IconSettings,
};

// Navigation items with proper icons - memoized
const getNavigationItems = (): NavigationItem[] => [
  { path: '/dashboard', label: 'Dashboard', icon: iconMap['/dashboard'] },
  { path: '/portfolio', label: 'Portfolio', icon: iconMap['/portfolio'] },
  { path: '/wallets', label: 'Wallets', icon: iconMap['/wallets'] },
  { path: '/pools', label: 'Pools', icon: iconMap['/pools'] },
  { path: '/pool-positions', label: 'Mis Pools', icon: iconMap['/pool-positions'] },
  { path: '/news', label: 'News', icon: iconMap['/news'] },
  { path: '/admin', label: 'Admin', icon: iconMap['/admin'] },
];

export const AppLayout = React.memo(function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Memoize navigation items
  const navItems = useMemo(() => getNavigationItems(), []);

  // Memoize toggle callback
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0d0f12' }}>
      <Sidebar
        navigationItems={navItems}
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginLeft: sidebarCollapsed ? '80px' : '260px',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Header */}
        <Header />

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
});
