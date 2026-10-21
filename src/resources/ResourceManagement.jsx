import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { TeamIcon } from '../components/Icons.jsx';
import { useResourceData } from './data/resourceService.js';
import { openSettings } from '../lib/route.js';
import { periodRange } from './model/period.js';
import Overview from './pages/Overview.jsx';
import Allocation from './pages/Allocation.jsx';
import EffortTracker from './pages/EffortTracker.jsx';
import Teams from './pages/Teams.jsx';
import Reports from './pages/Reports.jsx';

const PAGES = {
  overview: ['Overview', Overview],
  allocation: ['Resource Allocation', Allocation],
  effort: ['Effort Tracker', EffortTracker],
  teams: ['Teams', Teams],
  reports: ['Reports', Reports],
};

// Resource Management module: shared data, filters and permissions for its pages
export default function ResourceManagement({ page, user, onSignOut, onMenu, onOpenAdmin }) {
  const { data, error } = useResourceData();
  const perms = user?.permissions ?? [];
  const access = {
    canEdit: perms.includes('edit') || perms.includes('admin'), // FTE, allocations, team for reports
    canAdmin: perms.includes('admin'), // opens Redmine settings from alerts and mapping links
    by: user?.name ?? 'Unknown',
  };
  // Period, team and project stay the same while moving between pages
  // Project starts on the first project linked to Redmine (undefined until the data is in)
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
  const [title, Page] = PAGES[page] ?? PAGES.overview;

  return (
    <>
      <Header title={`Resource Management · ${title}`} icon={<TeamIcon />} onMenu={onMenu} onOpenAdmin={onOpenAdmin} user={user} onSignOut={onSignOut}
        />
      <main className="rm-main">
        {error && <div className="card error">Could not load resource data: {error}</div>}
        {!data && !error && <div className="card empty">Loading resource data…</div>}
        {data && !data.redmineProjects.length && (
          <div className="card rm-empty">
            <b>No project is linked to Redmine yet</b>
            <span>Actual hours come from Redmine. {access.canAdmin ? 'Link a Jira project to its Redmine project and import the time entries.' : 'Ask an administrator to link your project to Redmine.'}</span>
            {access.canAdmin && <button className="btn-primary-solid" onClick={() => openSettings('redmine')}>Open Redmine settings</button>}
          </div>
        )}
        {data && filters.projectId !== undefined && <Page data={data} filters={filters} setFilters={setFilters} period={period} access={access} />}
      </main>
      <Footer />
    </>
  );
}
