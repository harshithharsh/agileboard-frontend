// Which teams, sprints and assignees belong to the current filter selection.

export const teamsFor = (options, projectId) => options.teams.filter((t) => t.project_id === projectId);

// Sprints of the selected team (optionally within a release), newest first.
export const sprintsFor = (options, { teamId, releaseId }) =>
  options.sprints.filter((s) => s.team_id === teamId && (!releaseId || s.release_id === releaseId));

export const assigneesFor = (options, { teamId }) => options.assignees.filter((a) => a.team_id === teamId);

// Fill in defaults whenever a parent filter is cleared: first project, its first team, the latest sprint.
export function resolveFilters(filters, options) {
  const next = { ...filters };
  next.projectId ??= options.projects[0]?.id ?? null;
  next.teamId ??= teamsFor(options, next.projectId)[0]?.id ?? null;
  next.sprintId ??= sprintsFor(options, next)[0]?.id ?? null;
  return next;
}
