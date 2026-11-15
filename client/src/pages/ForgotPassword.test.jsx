import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import ForgotPassword from './ForgotPassword.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Forgot Password', () => {
  test('renders the email form and navigation action', () => {
    render(<ForgotPassword onBackToLogin={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Send reset instructions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Back to login' })).toBeInTheDocument();
  });

  test('submits the email and displays the success confirmation', async () => {
    const successMessage = 'If an account exists, reset instructions will arrive shortly.';
    apiFetch.mockResolvedValueOnce({ message: successMessage });
    render(<ForgotPassword onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.test' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByRole('status')).toHaveTextContent(successMessage);
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@example.test' })
    });
  });

  test('displays an API error when the request fails', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Password reset email is not configured'));
    render(<ForgotPassword onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.test' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Password reset email is not configured');
  });

  test('displays a network failure and restores the submit action', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Unable to reach the server'));
    render(<ForgotPassword onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student@example.test' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server');
    expect(screen.getByRole('button', { name: 'Send reset instructions' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Sending instructions...' })).not.toBeInTheDocument();
  });
});
