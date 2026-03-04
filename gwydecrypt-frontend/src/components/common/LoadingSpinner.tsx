import React from 'react';
import { Box, Text } from '@mantine/core';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner = React.memo(function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0d0f12' }}>
      <Text c="dimmed">{message}</Text>
    </Box>
  );
});
