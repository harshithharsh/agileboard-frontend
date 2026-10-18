import { useState } from 'react';
import Modal from './admin/Modal.jsx';
import { api } from '../api/client.js';

export const OUTCOME_LABEL = { met: 'Met', partly_met: 'Partly met', not_met: 'Not met' };

// Record (or change) whether the sprint met its goal. Starts from the saved outcome, else the suggestion.
export default function GoalOutcomeDialog({ sprint, goal, onClose, onSaved }) {
  const [outcome, setOutcome] = useState(goal.outcome?.value ?? goal.suggestion ?? null);
  const [note, setNote] = useState(goal.outcome?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async (value) => {
    if (value === undefined && !outcome) return setError('Choose Met, Partly met or Not met');
    setSaving(true);
    setError(null);
    try {
      await api.sprints.saveGoalOutcome(sprint.id, value === undefined ? outcome : value, note);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={`Sprint goal outcome · ${sprint.name}`} width={460} onClose={onClose}
      footer={(
        <>
          {goal.outcome && <button className="btn goal-clear" onClick={() => save(null)} disabled={saving}>Clear outcome</button>}
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary-solid" onClick={() => save()} disabled={saving}>{saving ? 'Saving…' : 'Save outcome'}</button>
        </>
      )}>
      {goal.suggestion && (
        <p className="goal-suggestion">
          Suggested from Jira: <strong>{OUTCOME_LABEL[goal.suggestion]}</strong> ({goal.done} of {goal.total} goal items done)
        </p>
      )}
      <div className="goal-choice" role="radiogroup" aria-label="Goal outcome">
        {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={outcome === value}
            className={`goal-option goal-${value}${outcome === value ? ' selected' : ''}`}
            onClick={() => { setOutcome(value); setError(null); }}>
            {label}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field-label">Note (optional)</span>
        <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="UCLA deploy waiting on client access" />
      </label>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}
