import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../utils/api.js';
import Logo from '../Logo.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    api.get('/health').then((h) => setDemo(!!h.demo)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <div className="field">
          <label>Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Enter BOLDER OS'}
        </button>
        {error && <div className="login-error">{error}</div>}
        {demo && (
          <div className="muted" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
            Demo mode · login <strong style={{ color: 'var(--text)' }}>faris@bolder.biz</strong> / <strong style={{ color: 'var(--text)' }}>bolder</strong>
          </div>
        )}
      </form>
    </div>
  );
}
