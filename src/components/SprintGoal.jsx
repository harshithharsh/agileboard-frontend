import { StatusPill } from './Section.jsx';
import { STATUS_LABEL } from '../lib/format.js';
import { useState } from 'react';
import { TargetIcon, CalendarIcon, TagIcon, CheckCircleIcon, XCircleIcon, EditIcon } from './Icons.jsx';
import IssueKey from './IssueKey.jsx';
import { formatDate, formatDateRange } from '../lib/datetime.js';
import GoalOutcomeDialog, { OUTCOME_LABEL } from './GoalOutcomeDialog.jsx';


const OUTCOME_STATUS = { met: 'on_track', partly_met: 'attention', not_met: 'at_risk' };
const dayTime = (iso) => formatDate(iso, { year: false });

// The sprint goal as written in Jira (one objective per line), whether it was met, and the goal-tagged issues.
// canEdit: may record the outcome (Edit permission); onChanged: reload after saving.
export default function SprintGoal({ sprint, goal, jiraBaseUrl, canEdit, onChanged }) {
  const [recording, setRecording] = useState(false);
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
          <span className="sg-chip"><CalendarIcon /> {formatDateRange(sprint.startDate, sprint.endDate, { year: true })}</span>
          {sprint.release && <span className="sg-chip"><TagIcon /> {sprint.release}</span>}
          {active && <StatusPill status="in_progress" label={STATUS_LABEL.in_progress} />}
          {!active && goal?.outcome && <StatusPill status={OUTCOME_STATUS[goal.outcome.value]} label={`Goal ${OUTCOME_LABEL[goal.outcome.value].toLowerCase()}`} />}
          {!active && !goal?.outcome && <span className="sg-chip sg-unrecorded">Outcome not recorded</span>}
          {!active && canEdit && goal && (
            <button className="btn-mini" onClick={() => setRecording(true)}>
              <EditIcon /> {goal.outcome ? 'Change' : 'Record outcome'}
            </button>
          )}
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

      {goal?.items.length > 0 && (
        <div className="sg-items">
          <span className="sg-items-title">Goal items in Jira · {goal.done} of {goal.total} done</span>
          <ul>
            {goal.items.map((i) => (
              <li key={i.key} className={i.done ? 'done' : ''} title={i.status ?? ''}>
                {i.done ? <CheckCircleIcon /> : <XCircleIcon />}
                <IssueKey issueKey={i.key} jiraBaseUrl={jiraBaseUrl} /> <span>{i.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {goal && (goal.outcome || goal.suggestion || goal.hitRate.recorded > 0) && (
        <div className="sg-foot">
          <span>
            {goal.outcome
              ? <>Recorded by {goal.outcome.recordedBy ?? 'a former user'}, {dayTime(goal.outcome.recordedAt)}{goal.outcome.note && <> · {goal.outcome.note}</>}</>
              : goal.suggestion && <>Suggested from Jira: {OUTCOME_LABEL[goal.suggestion]} ({goal.done} of {goal.total} goal items done)</>}
          </span>
          {goal.hitRate.recorded > 0 && (
            <span>Goal met in {goal.hitRate.met} of {goal.hitRate.recorded} recorded sprint{goal.hitRate.recorded === 1 ? '' : 's'}</span>
          )}
        </div>
      )}

      {recording && (
        <GoalOutcomeDialog sprint={sprint} goal={goal} onClose={() => setRecording(false)}
          onSaved={() => { setRecording(false); onChanged(); }} />
      )}
    </div>
  );
}
