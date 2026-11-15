import { useState } from 'react';
import { apiFetch } from '../api/client.js';

function ResetPassword({ token, onBackToLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('This password reset link is invalid. Please request a new one.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      setSuccess(data.message);
      window.history.replaceState({}, '', window.location.pathname);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-icon" aria-hidden="true">✓</div>
      <h1>Choose a new password</h1>
      <p className="subtitle">Use 6–128 characters and choose a password you do not use elsewhere.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength="6"
          maxLength="128"
          autoComplete="new-password"
          required
        />

        <label htmlFor="reset-confirm-password">Confirm new password</label>
        <input
          id="reset-confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength="6"
          maxLength="128"
          autoComplete="new-password"
          required
        />

        <label className="show-password-option">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <span>Show passwords</span>
        </label>

        {error && <p className="error-message" role="alert">{error}</p>}
        {success && <p className="success-message" role="status">{success}</p>}
        <button type="submit" disabled={loading || Boolean(success)}>
          {loading ? 'Resetting password...' : 'Reset password'}
        </button>
      </form>

      <button type="button" className="auth-back-button" onClick={onBackToLogin}>
        ← Back to login
      </button>
    </div>
  );
}

export default ResetPassword;
