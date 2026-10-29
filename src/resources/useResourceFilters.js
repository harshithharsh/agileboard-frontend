import { useEffect, useMemo, useState } from 'react';
import { periodRange } from './model/period.js';

// Period, team and project filters shared by the resource pages (and the Settings allocation tab)
// Project starts on the first project linked to Redmine (undefined until the data is in)
export function useResourceFilters(data) {
  const [filters, setFilters] = useState({ preset: 'this-quarter', customStart: null, customEnd: null, teamId: null, projectId: undefined });
  useEffect(() => {
    if (!data || filters.projectId !== undefined) return;
    const linked = data.projects.filter((p) => p.redmineProjectId);
    setFilters((f) => ({ ...f, projectId: linked[0]?.id ?? null }));
  }, [data, filters.projectId]);
  const period = useMemo(
    () => (data ? periodRange(filters.preset, data.rules, data.today, { start: filters.customStart, end: filters.customEnd }) : null),
    [data, filters.preset, filters.customStart, filters.customEnd]
  );
  return { filters, setFilters, period };
}

// What the signed-in user may do in Resource Management
export const resourceAccess = (user) => {
  const perms = user?.permissions ?? [];
  return {
    canEdit: perms.includes('edit') || perms.includes('admin'), // FTE, allocations, team for reports
    canAdmin: perms.includes('admin'), // opens Redmine settings from alerts and mapping links
    by: user?.name ?? 'Unknown',
  };
};
