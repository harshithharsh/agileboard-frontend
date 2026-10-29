// Resource & effort calculations. Pure functions: no data access, no formatting.
//
//   Available capacity = employment FTE × working hours, for each working day in the period
//                        (configured weekdays, minus public holidays and leave days).
//   Planned effort     = Σ project allocations (FTE) in effect on each working day × working hours.
//                        With no allocation saved, the whole employment FTE is planned on the person's
//                        team project (withDefaultPlan); allocations are only needed to split time.
//   Actual effort      = Σ eligible Redmine time entries in the period, each entry counted once.
//   Variance           = Actual − Planned.
//   Utilization        = Actual ÷ Available capacity × 100; no value (null) when capacity is 0.

export const DEFINITIONS = {
  capacity: 'Available capacity = employment FTE × working hours per day, for each working day in the period. Weekends, public holidays and leave days are left out.',
  planned: 'Planned effort = FTE × working hours per day, for each working day. The FTE is planned on the person’s team project, unless their time is split across projects (project allocations).',
  actual: 'Actual effort = the sum of eligible Redmine time entries in the period. Each time entry is counted once.',
  variance: 'Variance = Actual − Planned. Negative means less time was logged than planned.',
  utilization: 'Utilization = Actual ÷ Available capacity × 100. Filtered to a project, capacity is the time allocated to that project. Shown as — when there is no capacity (FTE not set or 0, or no working days).',
  fte: 'FTE = full-time equivalent: 1.00 full time, 0.75 = 75%, 0.50 = half time. Employment FTE is the person’s total capacity; project allocations split it and must not add up to more.',
};

export const EPSILON = 0.001;
export const round = (n, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

// 'YYYY-MM-DD' <-> Date, in local time (no time-zone shifts)
export const parseDay = (s) => new Date(`${s}T00:00:00`);
export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shiftDay = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayKey(d); };

export function eachDay(start, end) {
  const days = [];
  for (let d = parseDay(start); dayKey(d) <= end; d.setDate(d.getDate() + 1)) days.push(dayKey(d));
  return days;
}

export const isHoliday = (day, rules) => rules.holidays.some((h) => h.date === day);
export const isWorkingDay = (day, rules) => rules.workingWeekdays.includes(parseDay(day).getDay()) && !isHoliday(day, rules);
export const inEffect = (item, day) => item.startDate <= day && (!item.endDate || item.endDate >= day);
const onLeave = (resourceId, day, leave) => leave.some((l) => l.resourceId === resourceId && l.startDate <= day && l.endDate >= day);
export const hoursPerDay = (resource, rules) => (resource.weeklyHours ? resource.weeklyHours / rules.workingWeekdays.length : rules.hoursPerDay);
export const weeklyHours = (resource, rules) => hoursPerDay(resource, rules) * rules.workingWeekdays.length;

// Capacity and planned hours of one resource over a period, optionally for some projects only
export function plannedAndCapacity(resource, allocations, range, rules, leave = [], projectIds = null) {
  let capacity = 0;
  let planned = 0;
  const perDay = hoursPerDay(resource, rules);
  const mine = allocations.filter((a) => a.resourceId === resource.id && (!projectIds || projectIds.includes(a.projectId)));
  for (const day of eachDay(range.start, range.end)) {
    if (!isWorkingDay(day, rules) || onLeave(resource.id, day, leave)) continue;
    capacity += (resource.employmentFte ?? 0) * perDay;
    planned += mine.reduce((n, a) => n + (inEffect(a, day) ? a.fte : 0), 0) * perDay;
  }
  // Filtered to projects: the capacity that counts is the time allocated to them, not the whole person
  return { capacity: round(projectIds ? planned : capacity), planned: round(planned) };
}

// Actual hours from an index of entries by Redmine user: eligible entries in the period, each once
export function actualHours(resource, entriesByUser, range, rules, projectIds = null) {
  if (!resource.redmineUserId) return 0;
  const seen = new Set();
  let total = 0;
  for (const e of entriesByUser.get(resource.redmineUserId) ?? []) {
    if (e.date < range.start || e.date > range.end || seen.has(e.id)) continue;
    if (!rules.eligibleActivities.includes(e.activity)) continue;
    if (projectIds && !projectIds.includes(e.projectId)) continue;
    seen.add(e.id);
    total += e.hours;
  }
  return round(total);
}

export const utilization = (actual, capacity) => (capacity > EPSILON ? Math.round((actual / capacity) * 100) : null);

// Saved allocations plus a default one for everyone with none saved: their whole employment FTE on
// their team's project, on every day. So setting a person's FTE and team is enough; project
// allocations are only needed to split someone across projects. Default ones have `isDefault`.
export function withDefaultPlan(resources, allocations, teams) {
  const saved = new Set(allocations.map((a) => a.resourceId));
  const projectOf = new Map(teams.map((t) => [t.id, t.projectId]));
  const defaults = resources
    .filter((r) => !saved.has(r.id) && r.employmentFte > 0 && projectOf.get(r.teamId))
    .map((r) => ({ id: `default-${r.id}`, resourceId: r.id, projectId: projectOf.get(r.teamId), fte: r.employmentFte, startDate: '1900-01-01', endDate: null, isDefault: true }));
  return [...allocations, ...defaults];
}

export const allocatedFte = (resourceId, allocations, day) =>
  round(allocations.filter((a) => a.resourceId === resourceId && inEffect(a, day)).reduce((n, a) => n + a.fte, 0), 3);

export const ISSUE_LABEL = {
  'missing-fte': 'FTE not set',
  unmapped: 'Not mapped',
  'no-team': 'No team',
  overallocated: 'Over-allocated',
};

export function configIssues(resource, allocations, day) {
  const issues = [];
  if (resource.employmentFte == null) issues.push('missing-fte');
  if (!resource.redmineUserId) issues.push('unmapped');
  if (!resource.teamId) issues.push('no-team');
  if (resource.employmentFte != null && allocatedFte(resource.id, allocations, day) > resource.employmentFte + EPSILON) issues.push('overallocated');
  return issues;
}

export function utilizationBand(pct, thresholds) {
  if (pct == null) return 'none';
  if (pct > thresholds.over) return 'over';
  if (pct < thresholds.under) return 'under';
  return 'ok';
}

// Entries grouped by Redmine user, once per data load
export function indexEntries(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.redmineUserId)) map.set(e.redmineUserId, []);
    map.get(e.redmineUserId).push(e);
  }
  return map;
}

// Everything about one resource in one period (filters.projectId limits to one project)
export function resourceRow(resource, data, range, filters = {}) {
  const projectIds = filters.projectId ? [filters.projectId] : null;
  const { capacity, planned } = plannedAndCapacity(resource, data.allocations, range, data.rules, data.leave, projectIds);
  const actual = actualHours(resource, data.entriesByUser, range, data.rules, projectIds);
  const pct = utilization(actual, capacity);
  return {
    resource,
    capacity,
    planned,
    actual,
    variance: round(actual - planned),
    utilization: pct,
    band: utilizationBand(pct, data.rules.thresholds),
    allocatedFte: allocatedFte(resource.id, data.allocations, range.asOf),
    issues: configIssues(resource, data.allocations, range.asOf),
  };
}

// Totals: utilization recomputed from the summed hours, never an average of percentages
export function totals(rows) {
  const sum = (k) => round(rows.reduce((n, r) => n + r[k], 0));
  const capacity = sum('capacity');
  const actual = sum('actual');
  const planned = sum('planned');
  return { capacity, planned, actual, variance: round(actual - planned), utilization: utilization(actual, capacity) };
}
