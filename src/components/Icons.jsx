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
