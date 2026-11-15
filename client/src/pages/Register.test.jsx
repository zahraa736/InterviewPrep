import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import Register from './Register.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

function renderRegister() {
  const props = {
    onRegistered: vi.fn(),
    onShowLogin: vi.fn()
  };
  render(<Register {...props} />);
  return props;
}

function fillValidRegistration() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Student' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SecurePass123' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Register', () => {
  test('renders the required signup fields and actions', () => {
    renderRegister();

    expect(screen.getByLabelText('Name')).toBeRequired();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  test('submits valid registration data and reports success to the parent', async () => {
    apiFetch.mockResolvedValueOnce({ message: 'Account created successfully' });
    const { onRegistered } = renderRegister();
    fillValidRegistration();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(onRegistered).toHaveBeenCalledOnce());
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Student',
        email: 'student@example.test',
        password: 'SecurePass123'
      })
    });
  });

  test('uses browser validation to prevent an empty invalid submission', () => {
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(screen.getByLabelText('Name')).toBeInvalid();
    expect(screen.getByLabelText('Email')).toBeInvalid();
    expect(screen.getByLabelText('Password')).toBeInvalid();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('displays an API registration error', async () => {
    apiFetch.mockRejectedValueOnce(new Error('An account with this email already exists'));
    const { onRegistered } = renderRegister();
    fillValidRegistration();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
    expect(onRegistered).not.toHaveBeenCalled();
  });

  test('disables the form action while registration is pending', () => {
    apiFetch.mockReturnValueOnce(new Promise(() => {}));
    renderRegister();
    fillValidRegistration();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
  });

  test('displays a network failure and restores the registration action', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Unable to reach the server'));
    renderRegister();
    fillValidRegistration();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Unable to reach the server')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Creating account...' })).not.toBeInTheDocument();
  });
});
