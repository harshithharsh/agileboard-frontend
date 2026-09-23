import { FilterIcon, ClearIcon } from './Icons.jsx';

const RANGES = [
  { value: '6', label: 'Last 6 sprints' },
  { value: '3', label: 'Last 3 sprints' },
  { value: '1', label: 'This sprint' },
];

const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatRange = (start, end) => `${shortDate(start)} – ${shortDate(end)}`;

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function FilterBar({ options, filters, onChange, onClear, isDefault }) {
  const teams = options.teams.filter((t) => t.project_id === filters.projectId);
  const releases = options.releases.filter((r) => r.project_id === filters.projectId);
  const sprints = options.sprints.filter(
    (s) => s.team_id === filters.teamId && (!filters.releaseId || s.release_id === filters.releaseId)
  );
  const assignees = options.assignees.filter((a) => a.team_id === filters.teamId);
  const toOptions = (list) => list.map((x) => ({ value: x.id, label: x.name }));
  // Jira sprint names already say which team they belong to ("Nexus Sprint 2")
  const sprintOptions = sprints.map((s) => ({
    value: s.id,
    label: `${s.name} · ${formatRange(s.start_date, s.end_date)}${s.status === 'active' ? ' (active)' : ''}`,
  }));

  return (
    <section className="card filters">
      <div className="filters-intro">
        <FilterIcon />
        <div>
          <h2>Dashboard filters</h2>
          <p>Choose a sprint view to compare current delivery health.</p>
        </div>
      </div>
      <div className="filters-grid">
        <Select label="Project" value={filters.projectId} options={toOptions(options.projects)}
          onChange={(v) => onChange({ projectId: v, teamId: null, releaseId: null, sprintId: null, assigneeId: null })} />
        <Select label="Team" value={filters.teamId} options={toOptions(teams)}
          onChange={(v) => onChange({ teamId: v, sprintId: null, assigneeId: null })} />
        <Select label="Sprint" value={filters.sprintId} options={sprintOptions}
          onChange={(v) => onChange({ sprintId: v })} />
        <Select label="Release" value={filters.releaseId} options={toOptions(releases)} placeholder="All"
          onChange={(v) => onChange({ releaseId: v, sprintId: null })} />
        <Select label="Date range" value={filters.range} options={RANGES}
          onChange={(v) => onChange({ range: v })} />
        <Select label="Assignee" value={filters.assigneeId} options={toOptions(assignees)} placeholder="All"
          onChange={(v) => onChange({ assigneeId: v })} />
      </div>
      <button className="btn btn-clear" onClick={onClear} disabled={isDefault} title="Reset all filters to their defaults">
        <ClearIcon /> <span>Clear</span>
      </button>
    </section>
  );
}
