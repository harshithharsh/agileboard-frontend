import { useState } from 'react';
import Modal, { Field } from '../../components/admin/Modal.jsx';
import { resourceService } from '../data/resourceService.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Add a person by hand, optionally linked to an imported Redmine user
export function AddResourceDialog({ data, access, onClose, onAdded }) {
  const used = new Set(data.resources.map((r) => r.redmineUserId).filter(Boolean));
  const free = data.redmineUsers.filter((u) => !used.has(u.id));
  const [f, setF] = useState({ name: '', email: '', teamId: '', employmentFte: String(data.rules.defaultFte), redmineUserId: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pickUser = (e) => {
    const u = free.find((x) => String(x.id) === e.target.value);
    setF((s) => ({ ...s, redmineUserId: e.target.value, name: s.name || u?.name || '', email: s.email || u?.email || '' }));
  };
  const save = async () => {
    if (!f.name.trim()) return setError('Enter a name');
    if (f.email && !EMAIL.test(f.email)) return setError('That email address doesn’t look right');
    const fte = Number(f.employmentFte);
    if (!(fte >= 0 && fte <= 1.5)) return setError('Employment FTE must be between 0 and 1.5');
    const id = `r-${Date.now()}`;
    await resourceService.saveResource({
      id, name: f.name.trim(), email: f.email.trim() || null, teamId: f.teamId || null, employmentFte: fte, weeklyHours: null,
      redmineUserId: f.redmineUserId ? Number(f.redmineUserId) : null,
    }, access.by);
    onAdded(id);
  };
  return (
    <Modal title="Add resource" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn-primary-solid" onClick={save}>Add and set allocation</button></>}>
      {error && <p className="form-error">{error}</p>}
      <Field label="From Redmine (optional)" hint={`${free.length} Redmine users are not linked to anyone yet.`}>
        <select value={f.redmineUserId} onChange={pickUser}>
          <option value="">Not in Redmine / link later</option>
          {free.map((u) => <option key={u.id} value={u.id}>{u.login} ({u.name})</option>)}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Name"><input value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input value={f.email} onChange={set('email')} placeholder="name@company.com" /></Field>
        <Field label="Team">
          <select value={f.teamId} onChange={set('teamId')}>
            <option value="">No team</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Employment FTE" hint="1.00 full time, 0.50 half time"><input type="number" min="0" max="1.5" step="0.05" value={f.employmentFte} onChange={set('employmentFte')} /></Field>
      </div>
    </Modal>
  );
}

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
