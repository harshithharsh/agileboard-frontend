import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, SettingsIcon, ChevronDownIcon, SignOutIcon, LayoutIcon, MenuIcon } from './Icons.jsx';

// Signed-in user's initials and name, with a Sign out menu
function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return (
    <div className="settings-wrap" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Account: ${user.name}`}>
        <span className="user-avatar">{initials}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="settings-panel user-panel" role="menu">
          <div className="user-panel-name">{user.name}</div>
          <div className="user-panel-meta">@{user.username} · {user.role || 'No role'}</div>
          <button className="user-signout" role="menuitem" onClick={onSignOut}><SignOutIcon /> Sign out</button>
        </div>
      )}
    </div>
  );
}

// Top bar of every page: page title on the left (with the menu button on small screens);
// the page's own buttons, Settings and the account menu on the right. The brand lives in the sidebar.
export default function Header({ title, icon, onMenu, actions, onOpenAdmin, user, onSignOut }) {
  return (
    <header className="header">
      <div className="header-brand">
        {onMenu && (
          <button className="icon-btn header-menu" onClick={onMenu} aria-label="Open navigation"><MenuIcon /></button>
        )}
        <h1 className="page-title">{icon}{title}</h1>
      </div>
      <div className="header-actions">
        {actions}
        {onOpenAdmin && (
          <button className="icon-btn" onClick={onOpenAdmin} title="Settings" aria-label="Settings">
            <SettingsIcon />
          </button>
        )}
        {user && <UserMenu user={user} onSignOut={onSignOut} />}
      </div>
    </header>
  );
}

// Agile Metrics buttons: Customize, Export (Jira sync is in Settings → Integrations → Jira)
export function SprintActions({ context, onExport, onCustomize, customizing }) {
  return (
    <>
      <button className={`icon-btn${customizing ? ' is-active' : ''}`} onClick={onCustomize ?? undefined} disabled={!onCustomize}
        title={customizing ? 'Customizing the dashboard' : 'Customize: rearrange, resize or hide widgets'} aria-label="Customize dashboard" aria-pressed={!!customizing}>
        <LayoutIcon />
      </button>
      <button className="icon-btn" onClick={onExport} disabled={!context} title="Export the dashboard as CSV" aria-label="Export">
        <DownloadIcon />
      </button>
    </>
  );
}
