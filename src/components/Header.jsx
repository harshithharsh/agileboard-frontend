import { RefreshIcon, DownloadIcon } from './Icons.jsx';
import { formatDateTime } from '../lib/format.js';

export default function Header({ context, onRefresh, onExport, loading, syncing }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">{context?.project.name?.[0] ?? 'A'}</div>
        <div>
          <h1>Agile Sprint Performance Dashboard</h1>
          {context && (
            <p className="breadcrumb">
              {context.project.name}<span>·</span>{context.team.name}{context.combine === 'average' ? ' (Average)' : ''}<span>·</span>{/sprint/i.test(context.sprint.name) || !context.team.id ? '' : 'Sprint '}{context.sprint.name}
              {context.sprint.status === 'active' && <em className="live">Active</em>}
            </p>
          )}
        </div>
      </div>
      <div className="header-actions">
        {context && (
          <span className="updated">
            {context.sync.lastSuccessAt ? `Synced from Jira ${formatDateTime(context.sync.lastSuccessAt)}` : 'Not synced from Jira yet'}
          </span>
        )}
        <button className="btn" onClick={onRefresh} disabled={loading} title="Pull the latest data from Jira">
          <span className={syncing ? 'spin' : ''}><RefreshIcon /></span> <span>{syncing ? 'Syncing…' : 'Refresh'}</span>
        </button>
        <button className="btn" onClick={onExport} disabled={!context}><DownloadIcon /> <span>Export</span></button>
      </div>
    </header>
  );
}
