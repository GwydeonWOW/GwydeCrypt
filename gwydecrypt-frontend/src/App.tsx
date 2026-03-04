import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, MantineTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { useAuthStore } from './store/authStore';
import { queryClient } from './api/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SuspenseFallback } from './components/common/PageLoader';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Wallets = lazy(() => import('./pages/Wallets'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Admin = lazy(() => import('./pages/Admin'));
const Settings = lazy(() => import('./pages/Settings'));
const News = lazy(() => import('./pages/News'));
const Pools = lazy(() => import('./pages/Pools'));
const PoolPositions = lazy(() => import('./pages/PoolPositions'));

const darkTheme: MantineTheme = {
  colorScheme: 'dark',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#868e96',
      '#6c767f',
      '#5d6470',
      '#4c5562',
      '#3a4047',
      '#2b3036',
      '#25262b',
      '#1a1b1e',
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  borderRadius: 4,
};

function App() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={darkTheme}>
          <Notifications position="top-right" />
          <ModalsProvider>
            <Suspense fallback={<SuspenseFallback />}>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="wallets" element={<Wallets />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="pools" element={<Pools />} />
                    <Route path="pool-positions" element={<PoolPositions />} />
                    <Route path="news" element={<News />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="admin" element={<Admin />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </Suspense>
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
