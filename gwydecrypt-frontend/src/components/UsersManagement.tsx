import { useState } from 'react';
import {
  Badge,
  Group,
  ActionIcon,
  Text,
  TextInput,
  Select,
  Stack,
  Paper,
  Button,
  Grid,
  Card,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconTrash } from '@tabler/icons-react';
import type { User } from '../types';

export default function UsersManagement() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [roleFilter, setRoleFilter] = useState<string | null>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page, statusFilter, roleFilter, searchQuery],
    queryFn: () =>
      usersApi.getUsers({
        page,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'pending' | 'approved'),
        role: roleFilter === 'all' ? undefined : (roleFilter as 'admin' | 'user'),
        search: searchQuery || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getStats(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => usersApi.approveUser(id),
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Usuario aprobado correctamente', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => usersApi.rejectUser(id),
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Usuario rechazado correctamente', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Usuario eliminado correctamente', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'admin' | 'user' }) =>
      usersApi.updateRole(id, role),
    onSuccess: () => {
      notifications.show({ title: 'Éxito', message: 'Rol actualizado correctamente', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  const users = usersData?.users?.data || [];
  const pagination = usersData?.users;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  if (isLoading) {
    return <Text c="dimmed">Cargando usuarios...</Text>;
  }

  return (
    <Stack gap="md">
      {/* Stats Cards */}
      {stats && (
        <Grid>
          <Grid.Col span={3}>
            <Card
              p="md"
              radius="sm"
              withBorder
              sx={{ backgroundColor: '#1a1b1e', borderColor: '#2a2f35' }}
            >
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Usuarios
                </Text>
                <Text size="xl" fw={700} c="white">
                  {stats.stats.total_users}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card
              p="md"
              radius="sm"
              withBorder
              sx={{ backgroundColor: '#1a1b1e', borderColor: '#2a2f35' }}
            >
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Aprobados
                </Text>
                <Text size="xl" fw={700} c="green.4">
                  {stats.stats.approved_users}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card
              p="md"
              radius="sm"
              withBorder
              sx={{ backgroundColor: '#1a1b1e', borderColor: '#2a2f35' }}
            >
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Pendientes
                </Text>
                <Text size="xl" fw={700} c="yellow.4">
                  {stats.stats.pending_users}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card
              p="md"
              radius="sm"
              withBorder
              sx={{ backgroundColor: '#1a1b1e', borderColor: '#2a2f35' }}
            >
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Administradores
                </Text>
                <Text size="xl" fw={700} c="blue.4">
                  {stats.stats.admin_users}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {/* Filters */}
      <Group>
        <TextInput
          placeholder="Buscar por nombre o email..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
          radius="sm"
        />

        <Select
          placeholder="Estado"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendientes' },
            { value: 'approved', label: 'Aprobados' },
          ]}
          radius="sm"
          style={{ width: 150 }}
        />

        <Select
          placeholder="Rol"
          value={roleFilter}
          onChange={setRoleFilter}
          data={[
            { value: 'all', label: 'Todos' },
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'Usuario' },
          ]}
          radius="sm"
          style={{ width: 150 }}
        />
      </Group>

      {/* Users Table */}
      <Paper
        withBorder
        radius="sm"
        sx={{
          backgroundColor: '#1a1b1e',
          borderColor: '#2a2f35',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2f35' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px' }}>
                  Usuario
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px' }}>
                  Rol
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px' }}>
                  Estado
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px' }}>
                  Registrado
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#909296', fontWeight: 600, fontSize: '13px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                    <Text c="dimmed">No se encontraron usuarios</Text>
                  </td>
                </tr>
              ) : (
                users.map((user: User) => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid #2a2f35' }}
                  >
                    <td style={{ padding: '16px' }}>
                      <Stack gap={2}>
                        <Text fw={500} c="white" size="sm">
                          {user.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {user.email}
                        </Text>
                      </Stack>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge
                        color={user.role === 'admin' ? 'blue' : 'gray'}
                        radius="sm"
                        variant="light"
                        size="xs"
                      >
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge
                        color={user.is_approved ? 'green' : 'yellow'}
                        radius="sm"
                        variant="light"
                        size="xs"
                      >
                        {user.is_approved ? 'Aprobado' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Text size="sm" c="dimmed">
                        {new Date(user.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Group gap={8}>
                        {!user.is_approved && (
                          <ActionIcon
                            color="green"
                            variant="light"
                            radius="sm"
                            size="md"
                            onClick={() => approveMutation.mutate(user.id)}
                            loading={approveMutation.isPending}
                            title="Aprobar usuario"
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        )}

                        {user.is_approved && (
                          <ActionIcon
                            color="yellow"
                            variant="light"
                            radius="sm"
                            size="md"
                            onClick={() => rejectMutation.mutate(user.id)}
                            loading={rejectMutation.isPending}
                            title="Rechazar usuario"
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        )}

                        <ActionIcon
                          color="red"
                          variant="light"
                          radius="sm"
                          size="md"
                          onClick={() => {
                            if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          loading={deleteMutation.isPending}
                          title="Eliminar usuario"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <Group justify="center" mt="md" mb="md">
            <Button
              variant="light"
              radius="sm"
              size="xs"
              disabled={pagination.current_page === 1}
              onClick={() => setPage(pagination.current_page - 1)}
            >
              Anterior
            </Button>
            <Text c="dimmed" size="sm">
              Página {pagination.current_page} de {pagination.last_page}
            </Text>
            <Button
              variant="light"
              radius="sm"
              size="xs"
              disabled={pagination.current_page === pagination.last_page}
              onClick={() => setPage(pagination.current_page + 1)}
            >
              Siguiente
            </Button>
          </Group>
        )}
      </Paper>
    </Stack>
  );
}
