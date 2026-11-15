import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import Login from './Login.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

function renderLogin(overrides = {}) {
  const props = {
    onLogin: vi.fn(),
    onShowRegister: vi.fn(),
    onForgotPassword: vi.fn(),
    ...overrides
  };

  render(<Login {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Login', () => {
  test('renders accessible email and password fields and a login button', () => {
    renderLogin();

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  test('displays an API error after the user submits invalid credentials', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Invalid email or password'));
    const onLogin = vi.fn();
    renderLogin({ onLogin });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'wrong-password'
      })
    });
    expect(onLogin).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    });
  });

  test('displays a network failure and restores the login action', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Unable to reach the server'));
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.test' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecurePass123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Unable to reach the server')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Logging in...' })).not.toBeInTheDocument();
  });
});
