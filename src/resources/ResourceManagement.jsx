import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { HomeIcon, TimerIcon } from '../components/Icons.jsx';
import { useResourceData, resourceService } from './data/resourceService.js';
import { openSettings } from '../lib/route.js';
import { useResourceFilters, resourceAccess } from './useResourceFilters.js';
import Overview from './pages/Overview.jsx';
import EffortTracker from './pages/EffortTracker.jsx';

// Resource allocation lives in Settings (resources/AllocationSettings.jsx)
const PAGES = {
  overview: ['Project Overview', Overview, <HomeIcon key="i" />],
  effort: ['Effort Tracker', EffortTracker, <TimerIcon key="i" />],
};

// Resource Management module: shared data, filters and permissions for its pages
export default function ResourceManagement({ page, user, onSignOut, onMenu, onOpenAdmin, adminVersion }) {
  const { data, error } = useResourceData();
  // Settings changed something (holidays, Redmine import or matches, teams): load the data again
  useEffect(() => { resourceService.syncVersion(adminVersion); }, [adminVersion]);
  const access = resourceAccess(user);
  // Period, team and project stay the same while moving between pages
  const { filters, setFilters, period } = useResourceFilters(data);
  // Buttons a page puts in the top bar (e.g. the Effort Tracker's Excel download)
  const [actions, setActions] = useState(null);
  const [title, Page, pageIcon] = PAGES[page] ?? PAGES.overview;

  return (
    <>
      <Header title={title} icon={pageIcon} actions={actions} onMenu={onMenu} onOpenAdmin={onOpenAdmin} user={user} onSignOut={onSignOut}
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
        {data && filters.projectId !== undefined && <Page key={page} data={data} filters={filters} setFilters={setFilters} period={period} access={access} setActions={setActions} />}
      </main>
      <Footer />
    </>
  );
}
