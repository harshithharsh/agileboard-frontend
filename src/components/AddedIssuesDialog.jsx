import Modal from './admin/Modal.jsx';
import IssueKey from './IssueKey.jsx';
import { DownloadIcon } from './Icons.jsx';
import { downloadCsv, slug } from '../lib/download.js';

const TYPE = { story: 'Story', task: 'Task', bug: 'Bug', spike: 'Spike' };
const when = (iso) => (iso
  ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');

// Scope change drill-down: every issue added to the sprint after it started, with a link to Jira
export default function AddedIssuesDialog({ card, sprintName, jiraBaseUrl, onClose }) {
  const issues = card.addedIssues;
  const saveCsv = () => downloadCsv(
    [['Issue', 'Summary', 'Type', 'Story Points', 'Added On', 'Status'],
      ...issues.map((i) => [i.key, i.title, TYPE[i.type] ?? i.type, i.points, i.addedAt ?? '', i.status ?? ''])],
    `agilemetrix-scope-change-${slug(sprintName)}.csv`
  );
  return (
    <Modal title={`Scope Change · ${sprintName}`} width={860} onClose={onClose}
      footer={<button className="btn" onClick={saveCsv}><DownloadIcon /> Download CSV</button>}>
      <p className="scope-summary">
        <strong>{issues.length} issue{issues.length === 1 ? '' : 's'}</strong> added after the sprint started:{' '}
        <strong>{card.addedPoints} SP</strong> on top of a {card.committedPoints} SP commitment ({card.value}% unplanned work).
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table scope-table">
          <thead><tr><th>Issue</th><th>Summary</th><th>Type</th><th className="num">SP</th><th>Added On</th><th>Status</th></tr></thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.key}>
                <td className="nowrap"><IssueKey issueKey={i.key} jiraBaseUrl={jiraBaseUrl} /></td>
                <td className="scope-title">{i.title}</td>
                <td>{TYPE[i.type] ?? i.type}</td>
                <td className="num">{i.points || '—'}</td>
                <td className="muted nowrap">{when(i.addedAt)}</td>
                <td><span className={`scope-status${i.done ? ' done' : ''}`}>{i.status || (i.done ? 'Done' : 'Open')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
