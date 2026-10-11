import { useState } from 'react';
import { api } from '../../api/client.js';

// Sign-in page (username and password)
export default function Login({ onSignedIn, notice }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.auth.login(username, password);
      onSignedIn(user);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src="/logo-icon.svg" alt="" className="logo-light" />
          <img src="/logo-icon-dark.svg" alt="" className="logo-dark" />
          <span className="brand-wordmark"><span className="brand-agile">Agile</span><span className="brand-metrix">Metrix</span></span>
        </div>
        <h1>Sign in</h1>
        {notice && !error && <p className="login-notice">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="field">
          <span className="field-label">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="btn-primary-solid login-submit" disabled={busy || !username || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="login-foot">© {new Date().getFullYear()} AgileMetrix · Powered by <strong>Quadpact</strong></p>
    </div>
  );
}
