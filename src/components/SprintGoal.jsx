import { StatusPill } from './Section.jsx';
import { STATUS_LABEL } from '../lib/format.js';

// Sprint dates are 'YYYY-MM-DD'; format without timezone shifts
const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const SPRINT_STATUS = { active: 'in_progress', completed: 'on_track' };

// The sprint goal as written in Jira: one line per goal item
export default function SprintGoal({ sprint }) {
  const lines = (sprint.goal || '').split(/\r?\n/).map((l) => l.replace(/^[\s•*\-–]+/, '').trim()).filter(Boolean);
  const status = SPRINT_STATUS[sprint.status];
  return (
    <div className="card sprint-goal">
      <div className="sprint-goal-head">
        <h3>Sprint Goal</h3>
        <div className="sprint-goal-meta">
          <span>{sprint.name}</span>
          <span>{day(sprint.startDate)} – {day(sprint.endDate)}</span>
          {sprint.release && <span>Release {sprint.release}</span>}
          {status && <StatusPill status={status} label={sprint.status === 'active' ? STATUS_LABEL.in_progress : 'Completed'} />}
        </div>
      </div>
      {lines.length === 0 && <p className="muted">No sprint goal was set in Jira for this sprint.</p>}
      {lines.length === 1 && <p className="sprint-goal-text">{lines[0]}</p>}
      {lines.length > 1 && (
        <ul className="sprint-goal-list">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      )}
    </div>
  );
}
