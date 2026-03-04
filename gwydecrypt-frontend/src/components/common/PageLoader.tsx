import { Box, Text, Stack } from '@mantine/core';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
      }}
    >
      <Stack spacing="md" align="center">
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #1f2326',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <Text size="sm" c="dimmed">{message}</Text>
      </Stack>
    </Box>
  );
}

interface SuspenseFallbackProps {
  message?: string;
}

export function SuspenseFallback({ message = 'Loading...' }: SuspenseFallbackProps) {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0d0f12',
      }}
    >
      <Stack spacing="md" align="center">
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #1f2326',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <Text size="sm" c="dimmed">{message}</Text>
      </Stack>
    </Box>
  );
}
