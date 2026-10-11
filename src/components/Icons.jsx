const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const RefreshIcon = () => (
  <svg {...base}><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /></svg>
);
export const DownloadIcon = () => (
  <svg {...base}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>
);
export const ClearIcon = () => (
  <svg {...base}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
export const FilterIcon = () => (
  <svg {...base}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
);
export const TrendUp = () => (
  <svg {...base} width={12} height={12}><path d="m7 17 10-10" /><path d="M7 7h10v10" /></svg>
);
export const TrendDown = () => (
  <svg {...base} width={12} height={12}><path d="m7 7 10 10" /><path d="M17 7v10H7" /></svg>
);
export const ChartIcon = () => (
  <svg {...base} width={20} height={20}><path d="M3 21h18" /><path d="M6 17v-5" /><path d="M10 17V8" /><path d="M14 17v-7" /><path d="M18 17V5" /></svg>
);
export const SettingsIcon = () => (
  <svg {...base} width={18} height={18}><path d="M12 2.5 20.2 7.25v9.5L12 21.5l-8.2-4.75v-9.5z" /><circle cx="12" cy="12" r="3" /></svg>
);
// Generic two-tone diamond for the Jira connection badge
export const JiraMark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" fill="#2684FF" />
    <path d="M12 7.2 16.8 12 12 16.8 7.2 12z" fill="#0052CC" />
  </svg>
);
export const UsersIcon = () => (
  <svg {...base} width={22} height={22}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const ShieldIcon = () => (
  <svg {...base} width={22} height={22}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const BoxIcon = () => (
  <svg {...base} width={22} height={22}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
);
export const PlusIcon = () => <svg {...base}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
export const EditIcon = () => <svg {...base}><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>;
export const TrashIcon = () => (
  <svg {...base}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
export const HomeIcon = () => (
  <svg {...base} width={20} height={20}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>
);
export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
