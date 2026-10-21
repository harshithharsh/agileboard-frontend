import { ChartIcon, TeamIcon, HomeIcon, SlidersIcon, TimerIcon, FileTextIcon, PlugIcon, SettingsIcon } from './Icons.jsx';
import { hrefFor } from '../lib/route.js';

// Resource Management pages; Integration Settings only for administrators
const RESOURCE_ITEMS = [
  { page: 'overview', label: 'Overview', icon: <HomeIcon /> },
  { page: 'allocation', label: 'Resource Allocation', icon: <SlidersIcon /> },
  { page: 'effort', label: 'Effort Tracker', icon: <TimerIcon /> },
  { page: 'teams', label: 'Teams', icon: <TeamIcon /> },
  { page: 'reports', label: 'Reports', icon: <FileTextIcon /> },
  { page: 'integration', label: 'Integration Settings', icon: <PlugIcon />, admin: true },
];

// Icon rail on the left: the logo, one icon per page (its name shows on hover and to screen readers),
// and Workspace Settings at the bottom for administrators.
export default function Sidebar({ route, canAdmin, onOpenAdmin }) {
  const link = (href, label, icon, active) => (
    <a key={href} href={href} className={`side-item${active ? ' active' : ''}`} aria-label={label} aria-current={active ? 'page' : undefined}>
      {icon}<span className="side-tip" role="tooltip">{label}</span>
    </a>
  );
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <a className="side-logo" href="#/" aria-label="AgileMetrix home">
        <img className="logo-light" src="/logo-icon.svg" alt="" />
        <img className="logo-dark" src="/logo-icon-dark.svg" alt="" />
        <span className="side-tip" role="tooltip">AgileMetrix</span>
      </a>

      <div className="side-items">
        {link(hrefFor('sprint'), 'Sprint Analytics', <ChartIcon />, route.module === 'sprint')}
        <span className="side-divider" aria-hidden="true" />
        {RESOURCE_ITEMS.filter((i) => !i.admin || canAdmin).map((i) =>
          link(hrefFor('resources', i.page), `Resource Management · ${i.label}`, i.icon, route.module === 'resources' && route.page === i.page))}
      </div>

      {onOpenAdmin && (
        <button className="side-item side-bottom" onClick={onOpenAdmin} aria-label="Workspace Settings">
          <SettingsIcon /><span className="side-tip" role="tooltip">Workspace Settings</span>
        </button>
      )}
    </nav>
  );
}
