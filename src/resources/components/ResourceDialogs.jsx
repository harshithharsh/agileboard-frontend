import { useState } from 'react';
import Modal, { Field } from '../../components/admin/Modal.jsx';
import { resourceService } from '../data/resourceService.js';

// Change the team or employment FTE of several people at once
export function BulkDialog({ data, ids, access, onClose, onDone }) {
  const [f, setF] = useState({ teamId: '__keep', employmentFte: '' });
  const [error, setError] = useState(null);
  const save = async () => {
    const patch = {};
    if (f.teamId !== '__keep') patch.teamId = f.teamId || null;
    if (f.employmentFte !== '') {
      const fte = Number(f.employmentFte);
      if (!(fte >= 0 && fte <= 1.5)) return setError('Employment FTE must be between 0 and 1.5');
      patch.employmentFte = fte;
    }
    if (!Object.keys(patch).length) return setError('Choose a team or an FTE to change');
    await resourceService.bulkUpdate(ids, patch, access.by);
    onDone();
  };
  const names = data.resources.filter((r) => ids.includes(r.id)).map((r) => r.name);
  return (
    <Modal title={`Change ${ids.length} people`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn-primary-solid" onClick={save}>Apply</button></>}>
      {error && <p className="form-error">{error}</p>}
      <p className="muted small">{names.join(', ')}</p>
      <div className="form-grid">
        <Field label="Team">
          <select value={f.teamId} onChange={(e) => setF((s) => ({ ...s, teamId: e.target.value }))}>
            <option value="__keep">Keep current team</option>
            <option value="">No team</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Employment FTE" hint="Leave empty to keep each person’s FTE">
          <input type="number" min="0" max="1.5" step="0.05" value={f.employmentFte} onChange={(e) => setF((s) => ({ ...s, employmentFte: e.target.value }))} />
        </Field>
      </div>
      <p className="muted small">Project allocations are changed per person (Edit), because they differ by project.</p>
    </Modal>
  );
}
