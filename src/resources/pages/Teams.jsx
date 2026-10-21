import { useMemo, useState } from 'react';
import Modal, { Field } from '../../components/admin/Modal.jsx';
import { resourceService } from '../data/resourceService.js';
import { Filters, PageHead, Empty, fmtHours, fmtFte, fmtPct, initials, avatarColor } from '../components/ui.jsx';
import { selectRows, totals } from '../model/select.js';
import { EPSILON, round } from '../model/calc.js';

const KINDS = [['team', 'Team'], ['squad', 'Squad'], ['chapter', 'Chapter'], ['department', 'Department']];
const kindLabel = (k) => KINDS.find(([v]) => v === k)?.[1] ?? 'Team';

// Teams, chapters, squads or departments: members, lead, Redmine projects, capacity and effort
export default function Teams({ data, filters, setFilters, period, access }) {
  const [editing, setEditing] = useState(null); // team object or 'new'
  const [kind, setKind] = useState('');
  const rows = useMemo(() => selectRows(data, period, { ...filters, teamId: null }), [data, period, filters]);
  const noTeam = data.resources.filter((r) => !r.teamId);
  const teams = data.teams.filter((t) => !kind || t.kind === kind);

  return (
    <>
      <PageHead title="Teams" sub="Your own structure: teams, squads, chapters or departments. Numbers are for the selected period.">
        {access.canEdit && <button className="btn-primary-solid" onClick={() => setEditing('new')}>+ New team</button>}
      </PageHead>
      <Filters filters={filters} setFilters={setFilters} data={data} period={period} show={['period', 'project']}>
        <label className="rm-field"><span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All types</option>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </Filters>

      {noTeam.length > 0 && (
        <div className="card rm-banner">
          <span className="rm-pill warn">{noTeam.length}</span>
          <span><b>{noTeam.length === 1 ? '1 person has' : `${noTeam.length} people have`} no team:</b> {noTeam.map((r) => r.name).join(', ')}. Their hours count in totals but not in any team.</span>
          {access.canEdit && <button className="btn btn-sm rm-push" onClick={() => setEditing(data.teams[0] ?? 'new')}>Assign to a team</button>}
        </div>
      )}

      {!teams.length ? (
        <Empty title="No teams yet">Create teams to compare capacity and effort by group.</Empty>
      ) : (
        <section className="rm-teams">
          {teams.map((t) => {
            const members = rows.filter((r) => r.resource.teamId === t.id);
            const sum = totals(members.filter((r) => r.resource.redmineUserId));
            const allocated = round(members.reduce((n, r) => n + r.allocatedFte, 0), 2);
            const employment = round(members.reduce((n, r) => n + (r.resource.employmentFte ?? 0), 0), 2);
            const capacity = totals(members).capacity;
            const lead = data.resources.find((r) => r.id === t.leadId);
            const issues = members.filter((r) => r.issues.length).length;
            const projects = data.redmineProjects.filter((p) => t.redmineProjectIds.includes(p.id));
            return (
              <article key={t.id} className="card rm-team">
                <div className="rm-team-head">
                  <div><b>{t.name}</b><span className="muted small rm-block">{kindLabel(t.kind)} · Lead: {lead?.name ?? 'not set'}</span></div>
                  {access.canEdit && <button className="btn btn-sm" onClick={() => setEditing(t)}>Manage</button>}
                </div>
                <div className="rm-faces" aria-label={members.map((m) => m.resource.name).join(', ')}>
                  {members.slice(0, 6).map((m) => <span key={m.resource.id} style={{ background: avatarColor(m.resource.name) }} title={m.resource.name}>{initials(m.resource.name)}</span>)}
                  {members.length > 6 && <span className="rm-more">+{members.length - 6}</span>}
                  {!members.length && <span className="muted small">No members</span>}
                </div>
                <div className="rm-team-stats">
                  <div><span>Members</span><b>{members.length}</b></div>
                  <div><span>FTE</span><b className={allocated > employment + EPSILON ? 'bad-text' : ''}>{fmtFte(allocated)} / {fmtFte(employment)}</b></div>
                  <div><span>Capacity</span><b>{fmtHours(capacity)}</b></div>
                </div>
                <div className="rm-team-effort">
                  <div><span className="muted small">Planned vs actual</span><b>{fmtHours(sum.planned)} / {fmtHours(sum.actual)}</b></div>
                  <span className="rm-util-bar rm-wide"><i style={{ width: `${sum.planned ? Math.min(100, (sum.actual / sum.planned) * 100) : 0}%`, background: 'var(--primary)' }} /></span>
                  <span className="muted small">Utilization {fmtPct(sum.utilization)}</span>
                </div>
                <div className="rm-pills">
                  {projects.map((p) => <span key={p.id} className="rm-pill neutral">Redmine: {p.name}</span>)}
                  {!projects.length && <span className="rm-pill neutral">No Redmine project</span>}
                  {issues > 0 && <span className="rm-pill warn">{issues} need attention</span>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {editing && <TeamDialog data={data} team={editing === 'new' ? null : editing} access={access} onClose={() => setEditing(null)} />}
    </>
  );
}

function TeamDialog({ data, team, access, onClose }) {
  const [f, setF] = useState({
    name: team?.name ?? '', kind: team?.kind ?? 'team', leadId: team?.leadId ?? '',
    members: data.resources.filter((r) => team && r.teamId === team.id).map((r) => r.id),
    redmineProjectIds: team?.redmineProjectIds ?? [],
  });
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggle = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const save = async () => {
    const name = f.name.trim();
    if (!name) return setError('Enter a team name');
    if (data.teams.some((t) => t.id !== team?.id && t.name.toLowerCase() === name.toLowerCase())) return setError('A team with that name already exists');
    const saved = { id: team?.id ?? `t-${Date.now()}`, name, kind: f.kind, leadId: f.members.includes(f.leadId) ? f.leadId : null, redmineProjectIds: f.redmineProjectIds };
    await resourceService.saveTeam(saved, access.by);
    await resourceService.setTeamMembers(saved.id, f.members, access.by);
    onClose();
  };
  const otherTeam = (r) => (r.teamId && r.teamId !== team?.id ? data.teams.find((t) => t.id === r.teamId)?.name : null);
  return (
    <Modal title={team ? `Manage ${team.name}` : 'New team'} width={620} onClose={onClose}
      footer={(
        <>
          {team && !confirmDelete && <button className="btn goal-clear" onClick={() => setConfirmDelete(true)}>Delete team</button>}
          {team && confirmDelete && <button className="btn-danger" onClick={async () => { await resourceService.deleteTeam(team.id, access.by); onClose(); }}>Delete {team.name}: members keep no team</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn-primary-solid" onClick={save}>Save</button>
        </>
      )}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <Field label="Name"><input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} /></Field>
        <Field label="Type">
          <select value={f.kind} onChange={(e) => setF((s) => ({ ...s, kind: e.target.value }))}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Lead" hint="Choose from the members below">
          <select value={f.leadId} onChange={(e) => setF((s) => ({ ...s, leadId: e.target.value }))}>
            <option value="">No lead</option>
            {data.resources.filter((r) => f.members.includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <fieldset className="rm-fieldset">
        <legend>Members ({f.members.length})</legend>
        <div className="rm-member-grid">
          {data.resources.map((r) => (
            <label key={r.id} className="rm-checkrow">
              <input type="checkbox" checked={f.members.includes(r.id)} onChange={() => toggle('members', r.id)} />
              {r.name}{otherTeam(r) && <span className="muted small">({otherTeam(r)})</span>}
            </label>
          ))}
        </div>
        <span className="field-hint">A person belongs to one team; ticking someone from another team moves them here.</span>
      </fieldset>
      <fieldset className="rm-fieldset">
        <legend>Redmine projects</legend>
        {data.redmineProjects.map((p) => (
          <label key={p.id} className="rm-checkrow"><input type="checkbox" checked={f.redmineProjectIds.includes(p.id)} onChange={() => toggle('redmineProjectIds', p.id)} />{p.name}</label>
        ))}
      </fieldset>
    </Modal>
  );
}
