import { useEffect, useState } from 'react';
import App from './App.jsx';
import Sidebar from './components/Sidebar.jsx';
import AdminOverlay from './components/admin/AdminOverlay.jsx';
import ResourceManagement from './resources/ResourceManagement.jsx';
import TeamMap from './teammap/TeamMap.jsx';
import { useRoute } from './lib/route.js';

// Signed-in layout: the icon sidebar, then the current module (Agile Metrics or Resource Management).
// Owns Settings, opened from the sidebar on every page.
export default function Shell({ user, onSignOut, onDisplayChange }) {
  const route = useRoute();
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState(null); // tab to open on, when a page links into Settings
  const [adminChanged, setAdminChanged] = useState(false);
  const [adminVersion, setAdminVersion] = useState(0); // bumps after Settings changed projects or teams
  const canAdmin = (user?.permissions ?? []).includes('admin');

  const page = { user, onSignOut };

  const closeAdmin = () => {
    setAdminOpen(false);
    if (adminChanged) {
      setAdminChanged(false);
      setAdminVersion((v) => v + 1);
    }
  };

  useEffect(() => {
    const onOpen = (e) => { setAdminTab(e.detail ?? null); setAdminOpen(true); };
    window.addEventListener('agilemetrix:open-settings', onOpen);
    return () => window.removeEventListener('agilemetrix:open-settings', onOpen);
  }, []);

  // Old bookmarks of the Resource Allocation page: it is now a Settings tab
  useEffect(() => {
    if (!window.location.hash.startsWith('#/resources/allocation')) return;
    window.location.replace('#/resources/overview');
    if (canAdmin) { setAdminTab('allocation'); setAdminOpen(true); }
  }, [route, canAdmin]);

  return (
    <div className="shell">
      <Sidebar route={route} canAdmin={canAdmin} settingsOpen={adminOpen && canAdmin}
        onOpenAdmin={canAdmin ? () => { setAdminTab(null); setAdminOpen(true); } : null}
        onNavigate={adminOpen ? closeAdmin : undefined} />
      <div className="shell-main">
        {route.module === 'resources' && <ResourceManagement {...page} page={route.page} adminVersion={adminVersion} />}
        {route.module === 'map' && <TeamMap key={adminVersion} {...page} />}
        {route.module === 'sprint' && <App {...page} adminVersion={adminVersion} />}
      </div>
      {adminOpen && canAdmin && (
        <AdminOverlay
          user={user}
          initialTab={adminTab}
          onDisplayChange={onDisplayChange}
          onChanged={() => setAdminChanged(true)}
          onClose={closeAdmin}
        />
      )}
    </div>
  );
}
