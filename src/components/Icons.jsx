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
export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
export const SunIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
);
export const MoonIcon = () => <svg {...base}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></svg>;
export const MonitorIcon = () => (
  <svg {...base}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
);
export const PaletteIcon = () => (
  <svg {...base} width={22} height={22}><circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2a10 10 0 0 0 0 20c.93 0 1.5-.75 1.5-1.5 0-.39-.15-.74-.39-1.01-.24-.26-.38-.6-.38-.99 0-.83.67-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-4.97-4.48-9-10-9z" /></svg>
);
export const ChevronDownIcon = () => <svg {...base} width={14} height={14}><path d="m6 9 6 6 6-6" /></svg>;
export const SignOutIcon = () => (
  <svg {...base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const LayoutIcon = () => (
  <svg {...base} width={18} height={18}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);
export const GripIcon = () => (
  <svg {...base}><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></svg>
);
export const EyeOffIcon = () => (
  <svg {...base}><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a17.6 17.6 0 0 1-3.2 4.2" /><path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6" /><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" /><path d="m2 2 20 20" /></svg>
);
export const ArrowLeftIcon = () => (
  <svg {...base}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
);
export const ArrowRightIcon = () => (
  <svg {...base}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);
export const WidthIcon = () => (
  <svg {...base}><path d="M21 12H3" /><path d="m7 8-4 4 4 4" /><path d="m17 8 4 4-4 4" /></svg>
);
export const ResetIcon = () => (
  <svg {...base}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);
export const TargetIcon = () => (
  <svg {...base} width={20} height={20}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
);
export const CalendarIcon = () => (
  <svg {...base} width={14} height={14}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
);
export const TagIcon = () => (
  <svg {...base} width={14} height={14}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
export const CheckCircleIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const XCircleIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6" /><path d="m15 9-6 6" /></svg>
);
export const ClockIcon = () => (
  <svg {...base} width={18} height={18}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const MenuIcon = () => (
  <svg {...base} width={18} height={18}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
);
export const HomeIcon = () => (
  <svg {...base} width={18} height={18}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></svg>
);
export const SlidersIcon = () => (
  <svg {...base} width={18} height={18}><path d="M4 6h10" /><path d="M18 6h2" /><circle cx="16" cy="6" r="2" /><path d="M4 12h4" /><path d="M12 12h8" /><circle cx="10" cy="12" r="2" /><path d="M4 18h12" /><path d="M20 18h0" /><circle cx="18" cy="18" r="2" /></svg>
);
export const TimerIcon = () => (
  <svg {...base} width={18} height={18}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M9 2h6" /></svg>
);
export const FileTextIcon = () => (
  <svg {...base} width={18} height={18}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>
);
export const PlugIcon = () => (
  <svg {...base} width={18} height={18}><path d="M9 2v6" /><path d="M15 2v6" /><path d="M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v4" /></svg>
);
export const PanelLeftIcon = () => (
  <svg {...base} width={18} height={18}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
);
export const TeamIcon = () => (
  <svg {...base} width={18} height={18}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.5A5 5 0 0 1 21 20" /></svg>
);
export const InfoIcon = () => (
  <svg {...base} width={14} height={14}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>
);
export const AlertIcon = () => (
  <svg {...base} width={16} height={16}><path d="M12 3 2 20h20z" /><path d="M12 10v4" /><path d="M12 17h.01" /></svg>
);
export const MailIcon = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
