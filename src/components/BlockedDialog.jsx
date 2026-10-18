import Modal from './admin/Modal.jsx';
import IssueKey from './IssueKey.jsx';
import { formatDate } from '../lib/datetime.js';

const when = (iso) => formatDate(iso, { year: false });
const STAGE_HINT = {
  Developer: 'In development, code review or sent back after a failed test',
  QA: 'Delivered to QA or under test',
  BA: 'Waiting on requirements, refinement or UAT',
  Other: 'Status not mapped to a role',
  Unknown: 'Blocked before this was tracked; click Refresh to update',
};

// Blocked work drill-down: each blocker, which role it is stuck with, and who to chase
export default function BlockedDialog({ blocked, sprintName, jiraBaseUrl, onClose }) {
  // Still-blocked first, then longest
  const rows = [...blocked.list].sort((a, b) => (b.open - a.open) || (b.days - a.days));
  return (
    <Modal title={`Blocked Work · ${sprintName}`} width={980} onClose={onClose}>
      <div className="stage-summary">
        {blocked.byStage.map((s) => (
          <div key={s.stage} className={`stage-tile stage-${s.stage.toLowerCase()}`} title={STAGE_HINT[s.stage]}>
            <span>Stuck with {s.stage}</span>
            <strong>{s.issues}</strong>
            <small>{s.issues === 1 ? 'issue' : 'issues'} · {s.open ? `${s.open} still blocked` : 'all resolved'}</small>
          </div>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table scope-table">
          <thead>
            <tr><th>Issue</th><th>Summary</th><th>Stuck With</th><th>Blocked In</th><th>Assignee</th><th>Since</th><th className="num">Days</th><th>State</th></tr>
          </thead>
          <tbody>
            {rows.map((b, n) => (
              <tr key={`${b.issueKey}-${n}`}>
                <td className="nowrap"><IssueKey issueKey={b.issueKey} jiraBaseUrl={jiraBaseUrl} /></td>
                <td className="scope-title">
                  {b.title}
                  {(b.reason || b.external) && <div className="muted small">{[b.reason, b.external && 'External dependency'].filter(Boolean).join(' · ')}</div>}
                </td>
                <td><span className={`stage-pill stage-${b.stage.toLowerCase()}`} title={STAGE_HINT[b.stage]}>{b.stage}</span></td>
                <td className="muted">{b.blockedIn ?? '—'}</td>
                <td>{b.assignee ?? <span className="muted">Unassigned</span>}</td>
                <td className="muted nowrap">{when(b.startedAt)}</td>
                <td className="num">{b.days}</td>
                <td><span className={`scope-status${b.open ? ' blocked' : ' done'}`}>{b.open ? 'Still blocked' : 'Resolved'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
