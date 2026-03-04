import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Text, Group, Paper, Stack } from '@mantine/core';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0d0f12',
          padding: '20px'
        }}>
          <Paper
            radius="lg"
            p={40}
            sx={{
              backgroundColor: '#141719',
              borderColor: '#1f2326',
              maxWidth: '500px',
              width: '100%'
            }}
          >
            <Stack spacing="md" align="center">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(250, 82, 82, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text size="32px" c="red.4">⚠</Text>
              </div>

              <Text size="24px" fw={700} c="white">
                Something went wrong
              </Text>

              <Text size="sm" c="dimmed" ta="center">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </Text>

              {import.meta.env.DEV && this.state.error && (
                <Text size="xs" c="red.4" style={{ fontFamily: 'monospace', marginTop: '8px' }}>
                  {this.state.error.message}
                </Text>
              )}

              <Group spacing="sm">
                <Button onClick={this.handleReset} radius="sm">
                  Reload Page
                </Button>
                <Button
                  variant="outline"
                  radius="sm"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Go to Dashboard
                </Button>
              </Group>
            </Stack>
          </Paper>
        </div>
      );
    }

    return this.props.children;
  }
}
