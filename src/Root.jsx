import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import App from './App.jsx';
import Login from './components/auth/Login.jsx';
import { DEFAULT_DISPLAY, setDisplaySettings } from './lib/datetime.js';

// Shows the sign-in page until there is a valid session, then the dashboard.
export default function Root() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [notice, setNotice] = useState(null);
  // Workspace date/time format; loaded once signed in so the first screen already uses it
  const [display, setDisplay] = useState(null);

  useEffect(() => {
    api.auth.me().then(({ user }) => setUser(user)).catch(() => setUser(null));
    const onExpired = () => {
      setNotice('You were signed out after a period of inactivity. Please sign in again.');
      setUser(null);
    };
    window.addEventListener('auth:required', onExpired);
    return () => window.removeEventListener('auth:required', onExpired);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.settings()
      .catch(() => DEFAULT_DISPLAY)
      .then((settings) => {
        setDisplaySettings(settings);
        setDisplay(settings);
      });
  }, [user]);
  const changeDisplay = (settings) => {
    setDisplaySettings(settings);
    setDisplay(settings);
  };

  // Coming back to the tab after a long break: check the session straight away, so the sign-in
  // page shows now rather than on the next click
  useEffect(() => {
    if (!user) return undefined;
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return;
      api.auth.me().catch((e) => {
        if (e.status === 401) window.dispatchEvent(new Event('auth:required'));
      });
    };
    document.addEventListener('visibilitychange', onReturn);
    return () => document.removeEventListener('visibilitychange', onReturn);
  }, [user]);

  const signOut = async () => {
    await api.auth.logout().catch(() => {});
    setNotice('You have been signed out.');
    setUser(null);
  };

  if (user === undefined) return <div className="login-page"><p className="muted">Loading…</p></div>;
  if (!user) return <Login onSignedIn={(u) => { setNotice(null); setUser(u); }} notice={notice} />;
  if (!display) return <div className="login-page"><p className="muted">Loading…</p></div>;
  return <App user={user} onSignOut={signOut} display={display} onDisplayChange={changeDisplay} />;
}
