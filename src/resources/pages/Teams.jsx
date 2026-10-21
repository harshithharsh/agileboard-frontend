import { useMemo } from 'react';
import { openSettings } from '../../lib/route.js';
import { Filters, PageHead, Empty, fmtHours, fmtFte, fmtPct, initials, avatarColor } from '../components/ui.jsx';
import { selectRows, totals, projectName } from '../model/select.js';
import { EPSILON, round } from '../model/calc.js';

// Jira teams (set up in Settings → Projects): members, Redmine project, capacity and effort
export default function Teams({ data, filters, setFilters, period, access }) {
  const rows = useMemo(() => selectRows(data, period, { ...filters, teamId: null }), [data, period, filters]);
  const noTeam = data.resources.filter((r) => !r.teamId);
  const teams = data.teams.filter((t) => !filters.projectId || t.projectId === filters.projectId);

  return (
    <>
      <PageHead title="Teams" sub="The Jira teams of your projects. Numbers are for the selected period.">
        {access.canAdmin && <button className="btn" onClick={() => openSettings('projects')}>Manage teams in Settings</button>}
      </PageHead>
      <Filters filters={filters} setFilters={setFilters} data={data} period={period} show={['period', 'project']} />

      {noTeam.length > 0 && (
        <div className="card rm-banner">
          <span className="rm-pill warn">{noTeam.length}</span>
          <span><b>{noTeam.length === 1 ? '1 person has' : `${noTeam.length} people have`} no team:</b> {noTeam.map((r) => r.name).join(', ')}. Their hours count in totals but not in any team. Set a team in Resource Allocation, or add them to a Jira team in Settings → Projects.</span>
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
            const issues = members.filter((r) => r.issues.length).length;
            const projects = data.redmineProjects.filter((p) => t.redmineProjectIds.includes(p.id));
            return (
              <article key={t.id} className="card rm-team">
                <div className="rm-team-head">
                  <div><b>{t.name}</b><span className="muted small rm-block">{projectName(data, t.projectId)} · Jira team</span></div>
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

    </>
  );
}
