import { useState } from 'react';
import { Title, Paper, Stack, Text, Group, TextInput, PasswordInput, Button, Divider, Alert, Badge, Select, SegmentedControl } from '@mantine/core';
import { IconUser, IconMail, IconLock, IconAlertCircle, IconUsers, IconShield, IconRefresh } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import UsersManagement from '../components/UsersManagement';
import { useAutoRefreshStore } from '../store/autoRefreshStore';

export default function Settings() {
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.user;
    },
    onSuccess: (data) => {
      setProfileData({
        name: data.name || '',
        email: data.email || '',
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await api.put('/auth/profile', data);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Perfil actualizado correctamente', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; password: string; password_confirmation: string }) => {
      const response = await api.put('/auth/password', {
        current_password: data.current_password,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Contraseña actualizada correctamente', color: 'green' });
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        notifications.show({ title: 'Error', message: 'La contraseña actual es incorrecta', color: 'red' });
      }
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.password_confirmation) {
      notifications.show({ title: 'Error', message: 'Las contraseñas no coinciden', color: 'red' });
      return;
    }
    updatePasswordMutation.mutate(passwordData);
  };

  // Auto-refresh configuration
  const autoRefreshInterval = useAutoRefreshStore((state) => state.interval);
  const setAutoRefreshInterval = useAutoRefreshStore((state) => state.setInterval);

  return (
    <Stack gap="xl">
      <Title order={2} c="white">Configuración</Title>

      {/* Profile Information */}
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Stack gap="md">
          <Group gap="sm">
            <IconUser size={20} color="#667eea" />
            <Text size="18" fw={600} c="white">Información del Perfil</Text>
          </Group>

          <form onSubmit={handleProfileSubmit}>
            <Stack gap="md">
              <TextInput
                label="Nombre"
                placeholder="Tu nombre"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                required
                radius="sm"
                styles={{
                  label: { color: '#909296', marginBottom: '4px' },
                  input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
                }}
              />

              <TextInput
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                required
                radius="sm"
                styles={{
                  label: { color: '#909296', marginBottom: '4px' },
                  input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
                }}
              />

              <Button
                type="submit"
                loading={updateProfileMutation.isPending}
                radius="sm"
                styles={{
                  root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
                }}
              >
                Guardar Cambios
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>

      {/* Change Password */}
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Stack gap="md">
          <Group gap="sm">
            <IconLock size={20} color="#667eea" />
            <Text size="18" fw={600} c="white">Cambiar Contraseña</Text>
          </Group>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="yellow"
            radius="sm"
            sx={{
              backgroundColor: 'rgba(250, 204, 21, 0.1)',
              borderColor: 'rgba(250, 204, 21, 0.2)',
            }}
          >
            <Text size="sm" c="yellow">
              La contraseña debe tener al menos 8 caracteres.
            </Text>
          </Alert>

          <form onSubmit={handlePasswordSubmit}>
            <Stack gap="md">
              <PasswordInput
                label="Contraseña Actual"
                placeholder="Introduce tu contraseña actual"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
                radius="sm"
                styles={{
                  label: { color: '#909296', marginBottom: '4px' },
                  input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
                }}
              />

              <PasswordInput
                label="Nueva Contraseña"
                placeholder="Introduce tu nueva contraseña"
                value={passwordData.password}
                onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                required
                minLength={8}
                radius="sm"
                styles={{
                  label: { color: '#909296', marginBottom: '4px' },
                  input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
                }}
              />

              <PasswordInput
                label="Confirmar Nueva Contraseña"
                placeholder="Confirma tu nueva contraseña"
                value={passwordData.password_confirmation}
                onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                required
                minLength={8}
                radius="sm"
                styles={{
                  label: { color: '#909296', marginBottom: '4px' },
                  input: { backgroundColor: '#0d0f12', borderColor: '#1f2326', color: 'white', '&:focus': { borderColor: '#667eea' } },
                }}
              />

              <Button
                type="submit"
                loading={updatePasswordMutation.isPending}
                radius="sm"
                styles={{
                  root: { backgroundColor: '#667eea', '&:hover': { backgroundColor: '#5a67d8' } },
                }}
              >
                Actualizar Contraseña
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>

      {/* Auto-refresh Configuration */}
      <Paper
        p="lg"
        radius="sm"
        withBorder
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <Stack gap="md">
          <Group gap="sm">
            <IconRefresh size={20} color="#667eea" />
            <Text size="18" fw={600} c="white">Auto-actualización de Datos</Text>
          </Group>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="blue"
            radius="sm"
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderColor: 'rgba(102, 126, 234, 0.2)',
            }}
          >
            <Text size="sm" c="blue.2">
              Configura la frecuencia con la que se actualizan automáticamente los datos del portafolio y precios de los tokens.
            </Text>
          </Alert>

          <Stack gap="sm">
            <Text size="sm" c="dimmed" fw={500}>Intervalo de actualización:</Text>

            <SegmentedControl
              value={autoRefreshInterval}
              onChange={(value) => {
                setAutoRefreshInterval(value as 'off' | '5m' | '15m' | '30m' | '1h');
                notifications.show({
                  title: 'Auto-actualización actualizada',
                  message: `El intervalo ha sido establecido en ${value === 'off' ? 'desactivado' : value}`,
                  color: 'green',
                });
              }}
              data={[
                { label: 'Desactivado', value: 'off' },
                { label: '5 min', value: '5m' },
                { label: '15 min', value: '15m' },
                { label: '30 min', value: '30m' },
                { label: '1 hora', value: '1h' },
              ]}
              styles={{
                root: {
                  backgroundColor: '#0d0f12',
                  borderColor: '#1f2326',
                },
                indicator: {
                  backgroundColor: '#667eea',
                },
              }}
            />

            {autoRefreshInterval !== 'off' && (
              <Text size="xs" c="dimmed" mt="xs">
                Los datos se actualizarán automáticamente cada{' '}
                <Text span c="white" fw={500}>
                  {autoRefreshInterval === '5m' ? '5 minutos' :
                   autoRefreshInterval === '15m' ? '15 minutos' :
                   autoRefreshInterval === '30m' ? '30 minutos' : '1 hora'}
                </Text>
              </Text>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* User Management (Admin Only) */}
      {user?.role === 'admin' && (
        <Paper
          p="lg"
          radius="sm"
          withBorder
          sx={{
            backgroundColor: '#141719',
            borderColor: '#1f2326',
          }}
        >
          <Stack gap="md">
            <Group gap="sm">
              <IconUsers size={20} color="#667eea" />
              <Text size="18" fw={600} c="white">Gestión de Usuarios</Text>
              <Badge
                color="blue"
                radius="sm"
                variant="light"
                size="xs"
                leftSection={<IconShield size={12} />}
              >
                Solo Administradores
              </Badge>
            </Group>

            <Alert
              icon={<IconAlertCircle size={16} />}
              color="blue"
              radius="sm"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderColor: 'rgba(102, 126, 234, 0.2)',
              }}
            >
              <Text size="sm" c="blue.2">
                Como administrador, puedes gestionar los usuarios del sistema, aprobar cuentas pendientes y asignar roles.
              </Text>
            </Alert>

            <UsersManagement />
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
