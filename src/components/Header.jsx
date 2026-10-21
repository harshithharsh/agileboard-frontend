import { useEffect, useRef, useState } from 'react';
import { RefreshIcon, DownloadIcon, SettingsIcon, JiraMark, ChevronDownIcon, SignOutIcon, LayoutIcon, MenuIcon } from './Icons.jsx';
import { formatDateTime } from '../lib/format.js';

// Jira connection state, from the last sync runs
function jiraStatus(sync, syncing) {
  if (syncing) return { key: 'syncing', label: 'Syncing…' };
  if (sync?.latest?.status === 'failed') return { key: 'failed', label: 'Jira Sync Failed' };
  if (sync?.lastSuccessAt) return { key: 'connected', label: 'Jira Connected' };
  return { key: 'disconnected', label: 'Not Connected' };
}

function SettingsPanel({ context, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && onClose();
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const sync = context?.sync;
  const latest = sync?.latest;
  const status = jiraStatus(sync, false);
  const attempt = latest
    ? { success: 'Succeeded', failed: 'Failed', running: 'Running' }[latest.status] ?? latest.status
    : null;
  return (
    <div className="settings-panel" ref={ref} role="dialog" aria-label="Jira connection settings">
      <div className="settings-head">
        <span className="settings-title">Jira Connection</span>
        <span className={`settings-badge jira-${status.key}`}><i className="jira-dot" />{status.key === 'connected' ? 'Connected' : status.label}</span>
      </div>
      <div className="settings-row">
        <span className="settings-label">Jira site</span>
        <span className="settings-value">
          {context?.jiraBaseUrl
            ? <a href={context.jiraBaseUrl} target="_blank" rel="noreferrer">{context.jiraBaseUrl.replace(/^https?:\/\//, '')}</a>
            : '—'}
        </span>
      </div>
      <div className="settings-row">
        <span className="settings-label">Last successful sync</span>
        <span className="settings-value">{sync?.lastSuccessAt ? formatDateTime(sync.lastSuccessAt) : 'Never'}</span>
      </div>
      <div className="settings-row">
        <span className="settings-label">Last attempt</span>
        <span className={`settings-value ${latest?.status === 'failed' ? 'is-failed' : ''}`}>
          {latest ? `${attempt} · ${formatDateTime(latest.started_at)}` : '—'}
        </span>
        {latest?.status === 'failed' && latest.message && <span className="settings-error">{latest.message}</span>}
      </div>
      <p className="settings-note">Use Refresh to pull the latest sprints and issues from Jira.</p>
    </div>
  );
}

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

// Sprint Analytics buttons: Jira status, Refresh, Customize, Export
export function SprintActions({ context, onRefresh, onExport, loading, syncing, canSync = true, onCustomize, customizing }) {
  const [jiraOpen, setJiraOpen] = useState(false);
  const status = jiraStatus(context?.sync, syncing);
  const lastSync = context?.sync?.lastSuccessAt;
  return (
    <>
      <div className="settings-wrap">
        <button
          className={`jira-status jira-${status.key}`}
          onClick={() => setJiraOpen((o) => !o)}
          aria-expanded={jiraOpen}
          title={lastSync ? `Last synced from Jira: ${formatDateTime(lastSync)}. Click for details.` : 'Not synced from Jira yet'}
        >
          <JiraMark />
          <span className="jira-label">{status.label}</span>
          <i className="jira-dot" />
        </button>
        {jiraOpen && <SettingsPanel context={context} onClose={() => setJiraOpen(false)} />}
      </div>
      <span className="actions-divider" aria-hidden="true" />
      <button className="icon-btn" onClick={onRefresh} disabled={loading || !canSync}
        title={canSync ? 'Refresh: pull the latest data from Jira' : 'Your role can’t refresh from Jira (needs Edit permission)'} aria-label="Refresh">
        <span className={syncing ? 'spin' : ''}><RefreshIcon /></span>
      </button>
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
