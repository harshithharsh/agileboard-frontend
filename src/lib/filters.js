// Which teams, sprints and assignees belong to the current filter selection.

export const teamsFor = (options, projectId) => options.teams.filter((t) => t.project_id === projectId);

// Indian financial-year quarter a sprint belongs to, by its start date (the year runs April to March):
// Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar. '2026-10-07' -> 'FY2026-Q3', '2027-02-01' -> 'FY2026-Q4'
export const quarterOf = (date) => {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  return `FY${month >= 4 ? year : year - 1}-Q${Math.floor(((month + 8) % 12) / 3) + 1}`;
};

// 'FY2026' -> 'FY 2026-27'
const fyName = (fy) => `FY ${fy}-${String(Number(fy) + 1).slice(2)}`;
const QUARTER_MONTHS = { 1: 'Apr – Jun', 2: 'Jul – Sep', 3: 'Oct – Dec', 4: 'Jan – Mar' };
// Months with their calendar year: Q4 falls in the next calendar year
const quarterMonths = (fy, q) => `${QUARTER_MONTHS[q]} ${Number(fy) + (q === '4' ? 1 : 0)}`;
export const quarterLabel = (key) => {
  const [fy, q] = key.slice(2).split('-Q');
  return `Q${q} ${fyName(fy)} · ${quarterMonths(fy, q)}`;
};

const teamSprints = (options, { teamId, releaseId }) =>
  options.sprints.filter((s) => s.team_id === teamId && (!releaseId || s.release_id === releaseId));

// Q1–Q4 for every financial year the team has sprints in, newest first; quarters without sprints are disabled.
export function quartersFor(options, filters) {
  const withSprints = new Set(teamSprints(options, filters).map((s) => quarterOf(s.start_date)));
  const years = [...new Set([...withSprints].map((k) => k.slice(2, 6)))].sort().reverse();
  return years.flatMap((fy) =>
    [4, 3, 2, 1].map((q) => {
      const key = `FY${fy}-Q${q}`;
      return { value: key, label: `Q${q} FY${fy.slice(2)}-${String(Number(fy) + 1).slice(2)} · ${QUARTER_MONTHS[q].replace(/ /g, '')}`, disabled: !withSprints.has(key) };
    })
  );
}

// Sprints of the selected team in the selected quarter (and release), newest first.
export const sprintsFor = (options, filters) =>
  teamSprints(options, filters).filter((s) => !filters.quarter || quarterOf(s.start_date) === filters.quarter);

export const assigneesFor = (options, { teamId }) => options.assignees.filter((a) => a.team_id === teamId);

// Fill in defaults whenever a parent filter is cleared: first project, its first team,
// the quarter of the team's latest sprint, and the latest sprint in that quarter.
export function resolveFilters(filters, options) {
  const next = { ...filters };
  // Drop selections that no longer exist (e.g. a project deactivated in Admin)
  if (next.projectId && !options.projects.some((p) => p.id === next.projectId)) {
    Object.assign(next, { projectId: null, teamId: null, quarter: null, sprintId: null, releaseId: null, assigneeId: null });
  }
  if (next.teamId && !options.teams.some((t) => t.id === next.teamId && t.project_id === next.projectId)) {
    Object.assign(next, { teamId: null, quarter: null, sprintId: null, assigneeId: null });
  }
  next.projectId ??= options.projects[0]?.id ?? null;
  next.teamId ??= teamsFor(options, next.projectId)[0]?.id ?? null;
  const latest = teamSprints(options, next)[0];
  next.quarter ??= latest ? quarterOf(latest.start_date) : null;
  next.sprintId ??= sprintsFor(options, next)[0]?.id ?? null;
  return next;
}
