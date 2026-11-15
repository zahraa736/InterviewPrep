import { useState } from 'react';
import { apiFetch } from '../api/client.js';

function Register({ onRegistered, onShowLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      onRegistered();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-icon" aria-hidden="true">✦</div>
      <h1>Create account</h1>
      <p className="subtitle">Start building confidence for your next interview.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="register-name">Name</label>
        <input id="register-name" type="text" value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="50" required />
        <label htmlFor="register-email">Email</label>
        <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="register-password">Password</label>
        <input id="register-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" maxLength="128" required />
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
      </form>
      <p className="switch-page">
        Already registered?{' '}
        <button type="button" className="link-button" onClick={onShowLogin}>Log in</button>
      </p>
    </div>
  );
}

export default Register;
