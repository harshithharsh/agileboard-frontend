import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { resourceService } from '../data/resourceService.js';
import { inEffect, plannedAndCapacity, hoursPerDay, round, EPSILON, withDefaultPlan } from '../model/calc.js';
import { fmtHours, fmtFte, Person } from './ui.jsx';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { projectName, teamName } from '../model/select.js';
import { ClearIcon, PlusIcon, TrashIcon } from '../../components/Icons.jsx';

// Side panel with one person's project allocations: each row is a project, an FTE and the dates it
// applies (no end date = ongoing). Rows can be edited, added or removed; allocations that already
// ended are kept as history. The person's FTE is what is allocated today.
const ALWAYS = '1900-01-01'; // stored start for "from the start"

export default function AllocationDrawer({ resource, data, period, access, onClose }) {
  const today = data.today;
  const readOnly = !access.canEdit;
  const mine = data.savedAllocations.filter((a) => a.resourceId === resource.id);
  const ended = mine.filter((a) => a.endDate && a.endDate < today);
  const editable = mine.filter((a) => !ended.includes(a));
  // Nothing saved yet: the whole FTE is planned on the squad's project; shown as a row to edit
  const squadProject = data.teams.find((t) => t.id === resource.teamId)?.projectId ?? null;
  const defaultRow = !mine.length && squadProject && resource.employmentFte > 0
    ? { id: null, projectId: squadProject, fte: resource.employmentFte, startDate: ALWAYS, endDate: null, isDefault: true }
    : null;

  const toRow = (a) => ({ key: a.id ?? 'default', original: a, projectId: a.projectId, fte: String(a.fte), from: a.startDate === ALWAYS ? '' : a.startDate, to: a.endDate ?? '' });
  const [rows, setRows] = useState(() => (defaultRow ? [defaultRow] : editable).map(toRow));
  const [state, setState] = useState({ saving: false, error: null });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, {
    key: `new-${Date.now()}`, original: null,
    projectId: data.projects.find((p) => !rs.some((r) => r.projectId === p.id))?.id ?? data.projects[0]?.id, fte: '0.5', from: today, to: '',
  }]);
  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key));

  const isChanged = (r) => !r.original
    || r.projectId !== r.original.projectId || Number(r.fte) !== r.original.fte
    || (r.from || ALWAYS) !== r.original.startDate || (r.to || null) !== (r.original.endDate ?? null);
  const removedCount = (defaultRow ? [] : editable).filter((a) => !rows.some((r) => r.original === a)).length;
  const dirty = removedCount > 0 || rows.some(isChanged);

  // Allocations as they would be saved: ended ones unchanged, then the rows
  const stamp = { modifiedBy: access.by, modifiedAt: new Date().toISOString() };
  const nextAllocations = () => [
    ...ended,
    ...rows.map((r) => ({
      ...(r.original && !r.original.isDefault ? r.original : {}),
      id: r.original?.isDefault ? undefined : r.original?.id,
      resourceId: resource.id, projectId: r.projectId, fte: Number(r.fte), startDate: r.from || ALWAYS, endDate: r.to || null,
      ...(isChanged(r) || r.original?.isDefault ? stamp : {}),
    })),
  ];

  // FTE allocated on a day
  const fteOn = (allocs, day) => round(allocs.filter((a) => a.resourceId === resource.id && inEffect(a, day)).reduce((n, a) => n + a.fte, 0), 3);
  const draft = rows.map((r) => ({ resourceId: resource.id, projectId: r.projectId, fte: Number(r.fte) || 0, startDate: r.from || ALWAYS, endDate: r.to || null }));
  const allocatedToday = fteOn(draft, today);
  const available = round(1 - allocatedToday, 3);
  // The person's FTE is what is allocated today (kept as it is when nothing is allocated today)
  const employment = rows.length ? (allocatedToday > 0 ? allocatedToday : resource.employmentFte) : resource.employmentFte;

  // Effect: planned per week today, and planned hours in the selected period
  const draftResource = { ...resource, employmentFte: employment };
  const draftAllocations = withDefaultPlan(data.resources.map((r) => (r.id === resource.id ? draftResource : r)),
    [...data.savedAllocations.filter((a) => a.resourceId !== resource.id), ...nextAllocations()], data.teams);
  const window = { start: period.start, end: period.fullEnd };
  const before = plannedAndCapacity(resource, data.allocations, window, data.rules, data.leave);
  const after = plannedAndCapacity(draftResource, draftAllocations, window, data.rules, data.leave);
  const perWeek = (fte) => round(hoursPerDay(resource, data.rules) * data.rules.workingWeekdays.length * fte, 2);

  // Checks
  const errors = [];
  rows.forEach((r) => {
    const name = projectName(data, r.projectId);
    if (!(Number(r.fte) > 0 && Number(r.fte) <= 1.5)) errors.push(`${name}: FTE must be more than 0 and at most 1.5.`);
    if (r.to && r.from && r.to < r.from) errors.push(`${name}: the end date is before the start date.`);
  });
  rows.forEach((a, i) => rows.slice(i + 1).forEach((b) => {
    const overlap = a.projectId === b.projectId && (a.from || ALWAYS) <= (b.to || '9999-12-31') && (b.from || ALWAYS) <= (a.to || '9999-12-31');
    if (overlap) errors.push(`${projectName(data, a.projectId)} appears twice for the same dates: set an end date on one of them.`);
  }));
  const overToday = allocatedToday > 1 + EPSILON;

  const save = async () => {
    if (errors.length) return setState({ saving: false, error: errors[0] });
    setState({ saving: true, error: null });
    try {
      if (Math.abs((employment ?? 0) - (resource.employmentFte ?? 0)) > EPSILON) await resourceService.saveResource({ ...resource, employmentFte: employment });
      await resourceService.saveAllocations(resource.id, nextAllocations());
      onClose();
    } catch (e) {
      setState({ saving: false, error: e.message });
    }
  };

  const history = [...mine].sort((a, b) => (b.endDate ?? '9999').localeCompare(a.endDate ?? '9999') || b.startDate.localeCompare(a.startDate));
  const squad = teamName(data, resource.teamId);
  const range = (a) => `${a.startDate === ALWAYS ? 'From the start' : formatDate(a.startDate)} – ${a.endDate ? formatDate(a.endDate) : 'ongoing'}`;

  return createPortal(
    <div className="rm-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="rm-drawer" role="dialog" aria-modal="true" aria-label={`Allocation for ${resource.name}`}>
        <div className="rm-drawer-head">
          <Person resource={resource} sub={[squad, resource.email].filter(Boolean).join(' · ')} />
          <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Close"><ClearIcon /></button>
        </div>

        <div className="rm-drawer-body">
          <div className="al-summary">
            <div><span>Allocated today</span><b className={overToday ? 'bad-text' : ''}>{fmtFte(allocatedToday)} FTE</b></div>
            <div><span>Available</span><b className={available < -EPSILON ? 'bad-text' : ''}>{available >= 0 ? `${fmtFte(available)} FTE` : `${fmtFte(-available)} over`}</b></div>
            <div><span>Planned per week</span><b>{fmtHours(perWeek(allocatedToday))}</b></div>
          </div>

          <section className="rm-dsec">
            <div className="rm-dsec-head">
              <h3>Project allocations</h3>
              {!readOnly && <button className="btn-link" onClick={addRow}><PlusIcon /> Add allocation</button>}
            </div>
            {rows.length > 0 ? (
              <div className="al-table" role="table" aria-label="Project allocations">
                <div className="al-row al-head" role="row">
                  <span role="columnheader">Project</span><span role="columnheader">FTE</span><span role="columnheader">From</span><span role="columnheader">To</span><span aria-hidden="true" />
                </div>
                {rows.map((r) => (
                  <div key={r.key} className={`al-row${isChanged(r) && !r.original?.isDefault ? ' changed' : ''}`} role="row">
                    <select value={r.projectId} disabled={readOnly} onChange={(e) => setRow(r.key, { projectId: e.target.value })} aria-label="Project">
                      {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min="0.05" max="1.5" step="0.05" value={r.fte} disabled={readOnly}
                      onChange={(e) => setRow(r.key, { fte: e.target.value })} aria-label={`FTE on ${projectName(data, r.projectId)}`} />
                    <input type="date" value={r.from} disabled={readOnly} onChange={(e) => setRow(r.key, { from: e.target.value })}
                      aria-label="From" title={r.from ? undefined : 'Empty: from the start'} />
                    <input type="date" value={r.to} min={r.from || undefined} disabled={readOnly} onChange={(e) => setRow(r.key, { to: e.target.value })}
                      aria-label="To" title={r.to ? undefined : 'Empty: ongoing'} />
                    {!readOnly ? <button className="action-btn action-danger" onClick={() => removeRow(r.key)} aria-label={`Remove ${projectName(data, r.projectId)}`} title="Remove"><TrashIcon /></button> : <span />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No allocation yet.{!readOnly && ' Add one to plan this person’s time on a project.'}</p>
            )}
            <p className="field-hint">Leave <b>To</b> empty for an ongoing allocation, and <b>From</b> empty for “from the start”. To change an FTE from a date, set an end date on the current row and add a new row from the next day.</p>
            {defaultRow && <p className="field-hint">Nothing is saved yet: the whole FTE is planned on {projectName(data, squadProject)}, {squad ? `${squad}’s` : 'the squad’s'} project.</p>}
          </section>

          {!readOnly && dirty && (
            <section className="rm-dsec rm-effect">
              <h3>Effect of this change</h3>
              <div className="rm-effect-grid">
                <span /><span className="muted small num">Before</span><span className="muted small num">After</span>
                <span>Allocated today</span><span className="num">{fmtFte(fteOn(data.allocations, today))} FTE</span><b className="num">{fmtFte(allocatedToday)} FTE</b>
                <span>Planned, {period.label}</span><span className="num">{fmtHours(before.planned)}</span><b className="num">{fmtHours(after.planned)}</b>
              </div>
            </section>
          )}

          <section className="rm-dsec">
            <h3>History</h3>
            <ul className="rm-history">
              {history.map((a) => (
                <li key={a.id} className={a.endDate && a.endDate < today ? 'is-ended' : ''}>
                  <span><b>{projectName(data, a.projectId)} · {fmtFte(a.fte)} FTE</b><span className="muted"> · {range(a)}</span></span>
                  <span className="muted small">{a.modifiedBy ? `${a.modifiedBy} · ` : ''}{formatDateTime(a.modifiedAt)}</span>
                </li>
              ))}
              {!history.length && <li className="muted small">No saved allocations yet.</li>}
            </ul>
          </section>
        </div>

        <div className="rm-drawer-foot">
          {(state.error || (errors.length > 0 && !readOnly)) && <span className="form-error">{state.error ?? errors[0]}</span>}
          {!state.error && !errors.length && overToday && !readOnly && <span className="warn-text small">More than 1.00 FTE is allocated today.</span>}
          <button className="btn rm-push" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && <button className="btn-primary-solid" onClick={save} disabled={state.saving || !dirty}>{state.saving ? 'Saving…' : 'Save changes'}</button>}
        </div>
      </aside>
    </div>,
    document.body
  );
}
