import { Container, Title, Paper, TextInput, PasswordInput, Button, Text, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isValidEmail, sanitizeInput } from '../utils/validation';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const form = useForm({
    initialValues: {
      email: 'admin@gwydecrypt.com',
      password: 'password',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required';
        if (!isValidEmail(value)) return 'Invalid email format';
        return null;
      },
      password: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      // Sanitize inputs before sending
      const sanitizedValues = {
        email: sanitizeInput(values.email).toLowerCase(),
        password: values.password // Don't sanitize password as it may contain special chars
      };

      await login(sanitizedValues);
      notifications.show({
        title: 'Welcome back!',
        message: 'You have successfully logged in',
        color: 'green'
      });
      navigate('/dashboard');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || 'Invalid email or password';

      if (message.includes('pending approval')) {
        notifications.show({
          title: 'Account Pending Approval',
          message: 'Your account is waiting for administrator approval. Please wait for an admin to approve your account.',
          color: 'yellow',
          autoClose: false,
        });
      } else {
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d0f12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <Container size={420}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px',
          fontWeight: 700,
          color: 'white',
        }}>
          G
        </div>
        <Title order={2} c="white">Welcome back</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Login to manage your crypto portfolio
        </Text>
      </div>

      <Paper
        withBorder
        shadow="sm"
        p={32}
        radius="lg"
        sx={{
          backgroundColor: '#141719',
          borderColor: '#1f2326',
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              required
              radius="sm"
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              radius="sm"
              {...form.getInputProps('password')}
            />

            <Button type="submit" loading={isLoading} fullWidth radius="sm" size="md" mt="sm">
              Login
            </Button>

            <Text size="sm" c="dimmed" ta="center" mt="xs">
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
                Register
              </Link>
            </Text>
          </Stack>
        </form>
      </Paper>
      </Container>
    </div>
  );
}
