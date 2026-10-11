import { StatusPill } from './Section.jsx';
import { STATUS_LABEL } from '../lib/format.js';
import { TargetIcon, CalendarIcon, TagIcon } from './Icons.jsx';

// Sprint dates are 'YYYY-MM-DD'; format without timezone shifts
const date = (iso, withYear) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) })
  : '');

// The sprint goal as written in Jira, one objective per line
export default function SprintGoal({ sprint }) {
  const objectives = (sprint.goal || '').split(/\r?\n/).map((l) => l.replace(/^\s*(?:[•*\-–]|\d+[.)])\s+/, '').trim()).filter(Boolean);
  const active = sprint.status === 'active';

  return (
    <div className="card sprint-goal">
      <div className="sg-head">
        <div className="sg-title">
          <span className="sg-icon"><TargetIcon /></span>
          <div>
            <h3>Sprint Goal</h3>
            <span className="sg-sub">{sprint.name}</span>
          </div>
        </div>
        <div className="sg-meta">
          <span className="sg-chip"><CalendarIcon /> {date(sprint.startDate)} – {date(sprint.endDate, true)}</span>
          {sprint.release && <span className="sg-chip"><TagIcon /> {sprint.release}</span>}
          <StatusPill status={active ? 'in_progress' : 'on_track'} label={active ? STATUS_LABEL.in_progress : 'Completed'} />
        </div>
      </div>

      <div className="sg-body">
        {objectives.length ? (
          <ol className="sg-objectives">
            {objectives.map((o, i) => (
              <li key={i}><span className="sg-num">{String(i + 1).padStart(2, '0')}</span><span>{o}</span></li>
            ))}
          </ol>
        ) : (
          <p className="sg-empty">No sprint goal was set in Jira for this sprint. Add one on the sprint in Jira and click Refresh.</p>
        )}
      </div>
    </div>
  );
}
