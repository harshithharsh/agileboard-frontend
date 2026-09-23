import { RefreshIcon, DownloadIcon } from './Icons.jsx';
import { formatDateTime } from '../lib/format.js';

export default function Header({ context, onRefresh, onExport, loading }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">{context?.project.name?.[0] ?? 'A'}</div>
        <div>
          <h1>Agile Sprint Performance Dashboard</h1>
          {context && (
            <p className="breadcrumb">
              {context.project.name}<span>·</span>{context.team.name}<span>·</span>Sprint {context.sprint.name}
              {context.sprint.status === 'active' && <em className="live">Active</em>}
            </p>
          )}
        </div>
      </div>
      <div className="header-actions">
        {context && <span className="updated">Updated {formatDateTime(context.generatedAt)}</span>}
        <button className="btn" onClick={onRefresh} disabled={loading}><RefreshIcon /> <span>Refresh</span></button>
        <button className="btn" onClick={onExport} disabled={!context}><DownloadIcon /> <span>Export</span></button>
      </div>
    </header>
  );
}
