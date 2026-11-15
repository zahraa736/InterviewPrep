import { useState } from 'react';
import { apiFetch } from '../api/client.js';

function Login({ onLogin, onShowRegister, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-icon" aria-hidden="true">✦</div>
      <h1>Welcome back</h1>
      <p className="subtitle">Log in and keep preparing for your next opportunity.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <div className="password-label-row">
          <label htmlFor="login-password">Password</label>
          <button type="button" className="forgot-password-link" onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>
        <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="switch-page">
        Need an account?{' '}
        <button type="button" className="link-button" onClick={onShowRegister}>Register</button>
      </p>
    </div>
  );
}

export default Login;
