import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { resourceService } from '../data/resourceService.js';
import { inEffect, shiftDay, plannedAndCapacity, hoursPerDay, round, EPSILON, withDefaultPlan } from '../model/calc.js';
import { fmtHours, fmtFte, Person, InfoTip } from './ui.jsx';
import { DEFINITIONS } from '../model/calc.js';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import { projectName } from '../model/select.js';
import { ClearIcon } from '../../components/Icons.jsx';

const PRESETS = [1, 0.75, 0.5, 0.25];

// Side panel to change a person's team, Redmine user, employment FTE and project allocations.
// FTE changes take effect from a date: the old allocation ends the day before, so past numbers stay.
export default function AllocationDrawer({ resource, data, period, access, onClose }) {
  const today = data.today;
  const readOnly = !access.canEdit;
  // Saved allocations only: the default plan (whole FTE on the team's project) is not edited here
  const current = data.savedAllocations.filter((a) => a.resourceId === resource.id && (inEffect(a, today) || a.startDate > today));
  const [f, setF] = useState({
    teamId: resource.teamId ?? '',
    redmineUserId: resource.redmineUserId ?? '',
    employmentFte: resource.employmentFte ?? data.rules.defaultFte,
    weeklyHours: resource.weeklyHours ?? '',
    from: today,
    rows: current.map((a) => ({ key: a.id, original: a, projectId: a.projectId, fte: a.fte, removed: false })),
  });
  const [state, setState] = useState({ saving: false, error: null });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setRow = (key, patch) => setF((s) => ({ ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
  const addRow = () => setF((s) => ({ ...s, rows: [...s.rows, { key: `new-${Date.now()}`, original: null, projectId: data.projects.find((p) => !s.rows.some((r) => r.projectId === p.id && !r.removed))?.id ?? data.projects[0].id, fte: 0.25, removed: false }] }));

  const employment = Number(f.employmentFte);
  const active = f.rows.filter((r) => !r.removed);
  const allocated = round(active.reduce((n, r) => n + Number(r.fte || 0), 0), 3);
  const free = round(employment - allocated, 3);

  // Allocations as they would be saved
  function nextAllocations() {
    const out = data.savedAllocations.filter((a) => a.resourceId === resource.id && !current.includes(a)); // past ones stay as they are
    const stamp = { modifiedBy: access.by, modifiedAt: new Date().toISOString() };
    for (const r of f.rows) {
      const o = r.original;
      const changed = !o || r.removed || Number(r.fte) !== o.fte || r.projectId !== o.projectId;
      if (o && !changed) { out.push(o); continue; }
      if (o) {
        if (o.startDate < f.from) out.push({ ...o, endDate: shiftDay(f.from, -1), ...stamp }); // ends the day before
      }
      if (!r.removed) out.push({ id: `a-${resource.id}-${Date.now()}-${r.key}`, resourceId: resource.id, projectId: r.projectId, fte: Number(r.fte), startDate: f.from, endDate: o?.endDate ?? null, ...stamp });
    }
    return out;
  }

  // Before / after, from the effective date to the end of the selected period (or 3 months if that is earlier)
  const until = period.fullEnd > f.from ? period.fullEnd : shiftDay(f.from, 90);
  const window = { start: f.from, end: until };
  const draftResource = { ...resource, teamId: f.teamId || null, employmentFte: employment, weeklyHours: f.weeklyHours ? Number(f.weeklyHours) : null };
  // After the change, with the default plan when no project is listed
  const draftAllocations = readOnly ? data.allocations
    : withDefaultPlan(data.resources.map((r) => (r.id === resource.id ? draftResource : r)),
      [...data.savedAllocations.filter((a) => a.resourceId !== resource.id), ...nextAllocations()], data.teams);
  const before = plannedAndCapacity(resource, data.allocations, window, data.rules, data.leave);
  const after = plannedAndCapacity(draftResource, draftAllocations, window, data.rules, data.leave);
  const fteOn = (allocs, res, day) => allocs.filter((a) => a.resourceId === res.id && inEffect(a, day)).reduce((n, a) => n + a.fte, 0);
  const perWeek = (res, fte) => round(hoursPerDay(res, data.rules) * data.rules.workingWeekdays.length * fte, 2);
  const plannedWeekBefore = perWeek(resource, fteOn(data.allocations, resource, f.from));
  const plannedWeekAfter = perWeek(draftResource, fteOn(draftAllocations, draftResource, f.from));
  // With no project listed, the whole FTE goes to the team's project
  const teamProject = data.teams.find((t) => t.id === f.teamId)?.projectId ?? null;

  const errors = [];
  if (!(employment >= 0 && employment <= 1.5)) errors.push('Employment FTE must be between 0 and 1.5.');
  if (active.some((r) => !(Number(r.fte) > 0 && Number(r.fte) <= 1.5))) errors.push('Each project allocation needs an FTE above 0.');
  if (new Set(active.map((r) => r.projectId)).size < active.length) errors.push('Each project can appear once.');
  if (allocated > employment + EPSILON) errors.push(`Allocations add up to ${fmtFte(allocated)} FTE, more than the employment FTE of ${fmtFte(employment)}. Lower an allocation or raise the employment FTE.`);
  if (!f.from) errors.push('Choose the date the change takes effect.');

  const save = async () => {
    if (errors.length) return setState({ saving: false, error: errors[0] });
    setState({ saving: true, error: null });
    try {
      await resourceService.saveResource({
        ...resource, teamId: f.teamId || null, redmineUserId: f.redmineUserId ? Number(f.redmineUserId) : null,
        employmentFte: employment, weeklyHours: f.weeklyHours ? Number(f.weeklyHours) : null,
      }, access.by);
      const changes = f.rows.filter((r) => !r.original || r.removed || Number(r.fte) !== r.original.fte || r.projectId !== r.original.projectId);
      const note = changes.length
        ? `${changes.map((r) => `${projectName(data, r.projectId)} ${r.removed ? 'removed' : `${r.original ? fmtFte(r.original.fte) : 'new'} → ${fmtFte(r.fte)}`}`).join(', ')} from ${formatDate(f.from)}`
        : null;
      await resourceService.saveAllocations(resource.id, nextAllocations(), access.by, note);
      onClose();
    } catch (e) {
      setState({ saving: false, error: e.message });
    }
  };

  const history = data.savedAllocations.filter((a) => a.resourceId === resource.id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const usedUsers = new Set(data.resources.filter((r) => r.id !== resource.id).map((r) => r.redmineUserId));

  return createPortal(
    <div className="rm-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="rm-drawer" role="dialog" aria-modal="true" aria-label={`Allocation for ${resource.name}`}>
        <div className="rm-drawer-head">
          <Person resource={resource} sub={resource.email} />
          <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Close"><ClearIcon /></button>
        </div>

        <div className="rm-drawer-body">
          <section className="rm-dsec">
            <h3>Person</h3>
            <div className="rm-grid2">
              <label className="field"><span className="field-label">Team</span>
                <select value={f.teamId} disabled={readOnly} onChange={(e) => setF((s) => ({ ...s, teamId: e.target.value }))}>
                  <option value="">No team</option>
                  {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="field"><span className="field-label">Redmine user</span>
                <select value={f.redmineUserId} disabled={readOnly || !access.canAdmin} onChange={(e) => setF((s) => ({ ...s, redmineUserId: e.target.value }))}>
                  <option value="">Not mapped</option>
                  {data.redmineUsers.filter((u) => !usedUsers.has(u.id)).map((u) => <option key={u.id} value={u.id}>{u.login ? `${u.login} (${u.name})` : u.name}</option>)}
                </select>
              </label>
              <label className="field"><span className="field-label">Employment FTE <InfoTip text={DEFINITIONS.fte} /></span>
                <input type="number" min="0" max="1.5" step="0.05" value={f.employmentFte} disabled={readOnly} onChange={(e) => setF((s) => ({ ...s, employmentFte: e.target.value }))} />
                <span className="field-hint">Total capacity across all projects.</span>
              </label>
              <label className="field"><span className="field-label">Weekly working hours</span>
                <input type="number" min="1" max="60" step="0.5" value={f.weeklyHours} disabled={readOnly} placeholder={`${data.rules.hoursPerDay * data.rules.workingWeekdays.length} (workspace default)`}
                  onChange={(e) => setF((s) => ({ ...s, weeklyHours: e.target.value }))} />
                <span className="field-hint">Leave empty to use the workspace default.</span>
              </label>
            </div>
          </section>

          <section className="rm-dsec">
            <div className="rm-dsec-head"><h3>Project allocation</h3>{!readOnly && <button className="btn-link" onClick={addRow}>+ Add project</button>}</div>
            {!active.length && (
              <p className="muted small">
                {teamProject && employment > 0
                  ? <>Not split: the whole {fmtFte(employment)} FTE is planned on <b>{projectName(data, teamProject)}</b> (the team’s project). Add projects only if this person splits time across projects.</>
                  : 'Choose a team to plan this person’s FTE on the team’s project, or add projects to split their time.'}
              </p>
            )}
            {f.rows.map((r) => {
              const changed = !r.original || r.removed || Number(r.fte) !== r.original.fte || r.projectId !== r.original.projectId;
              return (
                <div key={r.key} className={`rm-alloc${changed ? ' changed' : ''}${r.removed ? ' removed' : ''}`}>
                  <div className="rm-alloc-top">
                    <select value={r.projectId} disabled={readOnly || !!r.original} onChange={(e) => setRow(r.key, { projectId: e.target.value })} aria-label="Project">
                      {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {changed && <span className="rm-pill info">{r.removed ? 'Removed' : r.original ? `Was ${fmtFte(r.original.fte)}` : 'New'}</span>}
                    {!readOnly && <button className="btn-link rm-push" onClick={() => setRow(r.key, { removed: !r.removed })}>{r.removed ? 'Undo' : 'Remove'}</button>}
                  </div>
                  {!r.removed && (
                    <div className="rm-alloc-fte">
                      <div className="segmented" role="radiogroup" aria-label={`FTE on ${projectName(data, r.projectId)}`}>
                        {PRESETS.map((p) => (
                          <button key={p} role="radio" aria-checked={Number(r.fte) === p} disabled={readOnly}
                            className={`segment${Number(r.fte) === p ? ' active' : ''}`} onClick={() => setRow(r.key, { fte: p })}>{fmtFte(p)}</button>
                        ))}
                      </div>
                      <input type="number" min="0.05" max="1.5" step="0.05" value={r.fte} disabled={readOnly} aria-label="Custom FTE"
                        onChange={(e) => setRow(r.key, { fte: e.target.value })} />
                      <span className="muted small">{Math.round(Number(r.fte || 0) * 100)}% of a full-time week</span>
                    </div>
                  )}
                  {r.original && <span className="muted small">Since {formatDate(r.original.startDate)}{r.original.endDate ? ` until ${formatDate(r.original.endDate)}` : ''}</span>}
                </div>
              );
            })}
            {!readOnly && (
              <label className="field rm-from"><span className="field-label">Changes take effect from</span>
                <input type="date" value={f.from} onChange={(e) => setF((s) => ({ ...s, from: e.target.value }))} />
                <span className="field-hint">Earlier days keep the old allocation, so past reports don’t change.</span>
              </label>
            )}
            {active.length > 0 && <div className="rm-alloc-sum"><span>Allocated across projects</span><b className={free < -EPSILON ? 'bad-text' : ''}>{fmtFte(allocated)} of {fmtFte(employment)} FTE · {free >= 0 ? `${fmtFte(free)} free` : `${fmtFte(-free)} over`}</b></div>}
          </section>

          {!readOnly && (
            <section className="rm-dsec rm-effect">
              <h3>Effect of this change</h3>
              <div className="rm-effect-grid">
                <span /><span className="muted small num">Before</span><span className="muted small num">After</span>
                <span>Planned per week</span><span className="num">{fmtHours(plannedWeekBefore)}</span><b className="num">{fmtHours(plannedWeekAfter)}</b>
                <span>Planned, {formatDate(window.start, { year: false })} – {formatDate(window.end)}</span><span className="num">{fmtHours(before.planned)}</span><b className="num">{fmtHours(after.planned)}</b>
                <span>Available capacity, same days</span><span className="num">{fmtHours(before.capacity)}</span><b className="num">{fmtHours(after.capacity)}</b>
                <span>Free capacity</span><span className="num">{fmtFte(round((resource.employmentFte ?? 0) - fteOn(data.allocations, resource, f.from), 3))} FTE</span><b className="num">{fmtFte(round(employment - fteOn(draftAllocations, draftResource, f.from), 3))} FTE</b>
              </div>
              <p className="muted small">Capacity and planned hours both come from the FTE; project allocations only split the planned hours across projects.</p>
            </section>
          )}

          <section className="rm-dsec">
            <h3>Allocation history</h3>
            <ul className="rm-history">
              {history.map((a) => (
                <li key={a.id}>
                  <span><b>{projectName(data, a.projectId)} {fmtFte(a.fte)}</b> · {formatDate(a.startDate)}{a.endDate ? ` – ${formatDate(a.endDate)}` : ' onwards'}</span>
                  <span className="muted small">{a.modifiedBy} · {formatDateTime(a.modifiedAt)}</span>
                </li>
              ))}
              {!history.length && <li className="muted small">No allocations yet.</li>}
            </ul>
          </section>
        </div>

        <div className="rm-drawer-foot">
          {state.error && <span className="form-error">{state.error}</span>}
          {!state.error && errors.length > 0 && !readOnly && <span className="warn-text small">{errors[0]}</span>}
          <button className="btn rm-push" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && <button className="btn-primary-solid" onClick={save} disabled={state.saving}>{state.saving ? 'Saving…' : 'Save changes'}</button>}
        </div>
      </aside>
    </div>,
    document.body
  );
}
