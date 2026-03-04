import React, { ReactNode } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Text, Button, Paper, Stack } from '@mantine/core';

interface QuerySuspenseProps {
  children: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
}

interface QueryState {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  error?: Error;
}

export function QuerySuspense({
  children,
  loading,
  error,
  empty
}: QuerySuspenseProps) {
  // This is a wrapper component - actual implementation depends on useQuery
  // The consumer should check the query state and render accordingly
  return <>{children}</>;
}

interface QuerySuspenseWrapperProps extends QueryState {
  children: ReactNode;
  loadingMessage?: string;
  onRetry?: () => void;
}

export function QuerySuspenseWrapper({
  isLoading,
  isError,
  isEmpty,
  error,
  children,
  loadingMessage = 'Loading data...',
  onRetry
}: QuerySuspenseWrapperProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #1f2326',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
          <Text size="sm" c="dimmed">{loadingMessage}</Text>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Paper
        radius="sm"
        p="md"
        sx={{
          backgroundColor: 'rgba(250, 82, 82, 0.1)',
          borderColor: 'rgba(250, 82, 82, 0.3)',
        }}
      >
        <Stack spacing="xs" align="center">
          <IconAlertTriangle size={32} color="#fa5252" />
          <Text size="sm" fw={500} c="red.4">
            {error?.message || 'An error occurred while loading data'}
          </Text>
          {onRetry && (
            <Button size="xs" variant="light" color="red" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </Stack>
      </Paper>
    );
  }

  if (isEmpty) {
    return (
      <Paper
        radius="sm"
        p="xl"
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Stack gap="sm" align="center">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#1f2326',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text size="24px">📭</Text>
          </div>
          <Text size="sm" c="dimmed">No data available</Text>
        </Stack>
      </Paper>
    );
  }

  return <>{children}</>;
}
