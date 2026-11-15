import { useState } from 'react';
import { apiFetch } from '../api/client.js';

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSuccess(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-icon" aria-hidden="true">✉</div>
      <h1>Forgot password?</h1>
      <p className="subtitle">Enter your email and we will help you securely reset your password.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        {error && <p className="error-message" role="alert">{error}</p>}
        {success && <p className="success-message" role="status">{success}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending instructions...' : 'Send reset instructions'}
        </button>
      </form>

      <button type="button" className="auth-back-button" onClick={onBackToLogin}>
        ← Back to login
      </button>
    </div>
  );
}

export default ForgotPassword;
