import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import ResetPassword from './ResetPassword.jsx';

vi.mock('../api/client.js', () => ({
  apiFetch: vi.fn()
}));

const testToken = 'synthetic-test-token';

function fillPasswords(password, confirmation = password) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: confirmation }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');
});

describe('Reset Password', () => {
  test('rejects submission when the reset token is missing', async () => {
    render(<ResetPassword token="" onBackToLogin={vi.fn()} />);
    fillPasswords('NewSecurePass123');

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This password reset link is invalid. Please request a new one.'
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('submits the token and new password and displays success', async () => {
    apiFetch.mockResolvedValueOnce({
      message: 'Password reset successfully. You can now log in.'
    });
    render(<ResetPassword token={testToken} onBackToLogin={vi.fn()} />);
    fillPasswords('NewSecurePass123');

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Password reset successfully. You can now log in.'
    );
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: testToken, password: 'NewSecurePass123' })
    });
    await waitFor(() => {
      expect(screen.getByLabelText('New password')).toHaveValue('');
      expect(screen.getByLabelText('Confirm new password')).toHaveValue('');
    });
  });

  test('displays an invalid or expired token response from the API', async () => {
    apiFetch.mockRejectedValueOnce(new Error('This password reset link is invalid or has expired'));
    render(<ResetPassword token={testToken} onBackToLogin={vi.fn()} />);
    fillPasswords('NewSecurePass123');

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This password reset link is invalid or has expired'
    );
  });

  test('rejects mismatched passwords before making an API request', async () => {
    render(<ResetPassword token={testToken} onBackToLogin={vi.fn()} />);
    fillPasswords('NewSecurePass123', 'DifferentPass123');

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The passwords do not match.');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('displays a network failure and restores the reset action', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Unable to reach the server'));
    render(<ResetPassword token={testToken} onBackToLogin={vi.fn()} />);
    fillPasswords('NewSecurePass123');

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server');
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Resetting password...' })).not.toBeInTheDocument();
  });
});
