import { ChartIcon, HomeIcon, TimerIcon, SettingsIcon, MapIcon } from './Icons.jsx';
import { hrefFor } from '../lib/route.js';


// Icon rail on the left: the logo, one icon per page (its name shows on hover and to screen readers),
// and Settings at the bottom for administrators.
// While Settings is open it shows beside the sidebar: Settings is the active item, and a link closes it
export default function Sidebar({ route, canAdmin, onOpenAdmin, settingsOpen = false, onNavigate }) {
  const link = (href, label, icon, active) => (
    <a key={href} href={href} onClick={onNavigate} className={`side-item${active && !settingsOpen ? ' active' : ''}`} aria-label={label} aria-current={active && !settingsOpen ? 'page' : undefined}>
      {icon}<span className="side-tip" role="tooltip">{label}</span>
    </a>
  );
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <a className="side-logo" href={hrefFor('resources', 'overview')} onClick={onNavigate} aria-label="AgileMetrix home">
        <img className="logo-light" src="/logo-icon.svg" alt="" />
        <img className="logo-dark" src="/logo-icon-dark.svg" alt="" />
        <span className="side-tip" role="tooltip">AgileMetrix</span>
      </a>

      <div className="side-items">
        {link(hrefFor('resources', 'overview'), 'Project Overview', <HomeIcon />, route.module === 'resources' && route.page === 'overview')}
        {link(hrefFor('sprint'), 'Agile Metrics', <ChartIcon />, route.module === 'sprint')}
        {link(hrefFor('resources', 'effort'), 'Effort Tracker', <TimerIcon />, route.module === 'resources' && route.page === 'effort')}
        {link(hrefFor('map'), 'Team Map', <MapIcon />, route.module === 'map')}
      </div>

      {onOpenAdmin && (
        <button className={`side-item side-bottom${settingsOpen ? ' active' : ''}`} onClick={onOpenAdmin} aria-label="Settings" aria-pressed={settingsOpen}>
          <SettingsIcon /><span className="side-tip" role="tooltip">Settings</span>
        </button>
      )}
    </nav>
  );
}
