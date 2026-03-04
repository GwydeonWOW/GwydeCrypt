import { useNavigate, Link } from 'react-router-dom';
import { Container, Paper, TextInput, PasswordInput, Button, Title, Text, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuthStore } from '../store/authStore';
import { notifications } from '@mantine/notifications';
import { isValidEmail, sanitizeInput, validatePassword } from '../utils/validation';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const form = useForm({
    initialValues: { name: '', email: '', password: '', password_confirmation: '' },
    validate: {
      name: (value) => {
        if (!value) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 50) return 'Name must not exceed 50 characters';
        return null;
      },
      email: (value) => {
        if (!value) return 'Email is required';
        if (!isValidEmail(value)) return 'Invalid email format';
        return null;
      },
      password: (value) => {
        if (!value) return 'Password is required';
        const validation = validatePassword(value);
        if (!validation.isValid) return validation.errors[0];
        return null;
      },
      password_confirmation: (value, values) => {
        if (!value) return 'Please confirm your password';
        if (value !== values.password) return 'Passwords do not match';
        return null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      // Sanitize inputs before sending
      const sanitizedValues = {
        name: sanitizeInput(values.name),
        email: sanitizeInput(values.email).toLowerCase(),
        password: values.password,
        password_confirmation: values.password_confirmation
      };

      await register(sanitizedValues);
      notifications.show({
        title: 'Account Created!',
        message: 'Your account has been created successfully. Please wait for an administrator to approve your account before you can login.',
        color: 'green',
        autoClose: false,
      });
      navigate('/login');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Registration failed',
        message: err.response?.data?.message || 'An error occurred',
        color: 'red'
      });
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
        <Title order={2} c="white">Create your account</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Start tracking your crypto portfolio today
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
              label="Name"
              placeholder="Your name"
              required
              radius="sm"
              {...form.getInputProps('name')}
            />
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
            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              required
              radius="sm"
              {...form.getInputProps('password_confirmation')}
            />

            <Button type="submit" fullWidth radius="sm" size="md" mt="sm" loading={isLoading}>
              Create account
            </Button>

            <Text size="sm" c="dimmed" ta="center" mt="xs">
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
                Login
              </Link>
            </Text>
          </Stack>
        </form>
      </Paper>
      </Container>
    </div>
  );
}
