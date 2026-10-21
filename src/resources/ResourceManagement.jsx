import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { TeamIcon } from '../components/Icons.jsx';
import { useResourceData, resourceService } from './data/resourceService.js';
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
    canEdit: perms.includes('edit') || perms.includes('admin'), // FTE, allocations, teams
    canAdmin: perms.includes('admin'), // opens Redmine settings from alerts and mapping links
    by: user?.name ?? 'Unknown',
  };
  // Period, team and project stay the same while moving between pages
  const [filters, setFilters] = useState({ preset: 'this-quarter', customStart: null, customEnd: null, teamId: null, projectId: null });
  const period = useMemo(
    () => (data ? periodRange(filters.preset, data.rules, data.today, { start: filters.customStart, end: filters.customEnd }) : null),
    [data, filters.preset, filters.customStart, filters.customEnd]
  );
  const [title, Page] = PAGES[page] ?? PAGES.overview;

  return (
    <>
      <Header title={`Resource Management · ${title}`} icon={<TeamIcon />} onMenu={onMenu} onOpenAdmin={onOpenAdmin} user={user} onSignOut={onSignOut}
        actions={data?.demo && (
          <span className="rm-demo" title="Fictional people, teams and hours generated in this browser. Redmine is not connected yet.">
            Demo data
            {access.canAdmin && <button className="btn-link" onClick={() => window.confirm('Reset the demo data? Your demo edits are lost.') && resourceService.reset()}>Reset</button>}
          </span>
        )} />
      <main className="rm-main">
        {error && <div className="card error">Could not load resource data: {error}</div>}
        {!data && !error && <div className="card empty">Loading resource data…</div>}
        {data && <Page data={data} filters={filters} setFilters={setFilters} period={period} access={access} />}
      </main>
      <Footer />
    </>
  );
}
