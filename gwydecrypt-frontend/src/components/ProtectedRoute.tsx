import { Navigate, Outlet } from 'react-router-dom';
import { Center, Loader, Paper, Text } from '@mantine/core';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Paper p="xl" radius="md" withBorder>
          <Loader size="md" />
          <Text mt="md">Loading...</Text>
        </Paper>
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
