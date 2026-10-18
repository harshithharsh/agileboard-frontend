import Modal from './admin/Modal.jsx';
import IssueKey from './IssueKey.jsx';
import { DownloadIcon } from './Icons.jsx';
import { downloadCsv, slug } from '../lib/download.js';

const TYPE = { story: 'Story', task: 'Task', bug: 'Bug', spike: 'Spike' };
const dateOf = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace('Sept', 'Sep');
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// Status pill colour: done, being worked on, or not started
const statusTone = (i) => (i.done ? 'done' : /progress|review|qa|test|deliver|develop/i.test(i.status ?? '') ? 'active' : 'todo');

// Scope change drill-down: every issue added to the sprint after it started, who added it, and where it stands
export default function AddedIssuesDialog({ card, sprintName, jiraBaseUrl, onClose }) {
  const issues = card.addedIssues;

  // Per person: issues and story points they added, most first
  const byPerson = new Map();
  for (const i of issues) {
    const name = i.addedBy ?? 'Unknown';
    const p = byPerson.get(name) ?? { name, issues: 0, points: 0 };
    p.issues += 1;
    p.points += i.points || 0;
    byPerson.set(name, p);
  }
  const people = [...byPerson.values()].sort((a, b) => b.issues - a.issues || b.points - a.points);
  const most = people[0]?.issues || 1;
  const doneCount = issues.filter((i) => i.done).length;

  const saveCsv = () => downloadCsv(
    [['Issue', 'Summary', 'Type', 'Story Points', 'Added On', 'Added By', 'Status'],
      ...issues.map((i) => [i.key, i.title, TYPE[i.type] ?? i.type, i.points, i.addedAt ?? '', i.addedBy ?? '', i.status ?? ''])],
    `agilemetrix-scope-change-${slug(sprintName)}.csv`
  );

  return (
    <Modal title={`Scope Change · ${sprintName}`} width={960} onClose={onClose}
      footer={(
        <>
          <span className="scope-foot-note">Sorted by when the issue was added · {doneCount} of {issues.length} done</span>
          <button className="btn" onClick={saveCsv}><DownloadIcon /> Download CSV</button>
        </>
      )}>
      <div className="scope-stats">
        <div className="scope-stat"><span>Issues Added</span><strong>{issues.length}</strong></div>
        <div className="scope-stat"><span>Story Points Added</span><strong>{card.addedPoints} <small>SP</small></strong></div>
        <div className="scope-stat"><span>Committed at Start</span><strong>{card.committedPoints} <small>SP</small></strong></div>
        <div className={`scope-stat${card.status === 'attention' ? ' warn' : ''}`}>
          <span>Unplanned Work</span><strong>{card.value}%</strong><em>Target {card.target}</em>
        </div>
      </div>

      <div className="scope-people">
        <div className="scope-section-title">Added By</div>
        <ul>
          {people.map((p) => (
            <li key={p.name}>
              <span className="scope-person">{p.name}</span>
              <span className="scope-bar"><i style={{ width: `${(p.issues / most) * 100}%` }} /></span>
              <span className="scope-count">{p.issues} {p.issues === 1 ? 'issue' : 'issues'} · {p.points} SP</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-table-wrap scope-wrap">
        <table className="admin-table scope-table">
          <colgroup>
            <col style={{ width: 104 }} /><col /><col style={{ width: 84 }} /><col style={{ width: 56 }} />
            <col style={{ width: 110 }} /><col style={{ width: 140 }} /><col style={{ width: 168 }} />
          </colgroup>
          <thead>
            <tr><th>Issue</th><th>Summary</th><th>Type</th><th className="right">SP</th><th>Added On</th><th>Added By</th><th>Status</th></tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.key}>
                <td className="nowrap"><IssueKey issueKey={i.key} jiraBaseUrl={jiraBaseUrl} /></td>
                <td title={i.title}><div className="clamp-2">{i.title}</div></td>
                <td><span className={`type-pill type-${i.type}`}>{TYPE[i.type] ?? i.type}</span></td>
                <td className="right tabular">{i.points || <span className="muted">—</span>}</td>
                <td className="nowrap">
                  {i.addedAt ? <><div>{dateOf(i.addedAt)}</div><div className="muted small">{timeOf(i.addedAt)}</div></> : <span className="muted">—</span>}
                </td>
                <td className="ellipsis" title={i.addedBy ?? ''}>{i.addedBy ?? <span className="muted">Unknown</span>}</td>
                <td><span className={`scope-status ${statusTone(i)}`} title={i.status ?? ''}>{i.status || (i.done ? 'Done' : 'Open')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
