import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import App from './App.jsx';
import Login from './components/auth/Login.jsx';

// Shows the sign-in page until there is a valid session, then the dashboard.
export default function Root() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.auth.me().then(({ user }) => setUser(user)).catch(() => setUser(null));
    const onExpired = () => {
      setNotice('Your session has ended. Please sign in again.');
      setUser(null);
    };
    window.addEventListener('auth:required', onExpired);
    return () => window.removeEventListener('auth:required', onExpired);
  }, []);

  const signOut = async () => {
    await api.auth.logout().catch(() => {});
    setNotice('You have been signed out.');
    setUser(null);
  };

  if (user === undefined) return <div className="login-page"><p className="muted">Loading…</p></div>;
  if (!user) return <Login onSignedIn={(u) => { setNotice(null); setUser(u); }} notice={notice} />;
  return <App user={user} onSignOut={signOut} />;
}
