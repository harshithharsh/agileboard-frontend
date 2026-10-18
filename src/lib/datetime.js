// Every date and time on screen is formatted here, in the workspace's chosen format
// (Workspace Settings → Date and Time). Root loads the setting once after sign-in.

export const DATE_FORMATS = [
  { value: 'DD MMM YYYY', label: '18 Oct 2026' },
  { value: 'DD/MM/YYYY', label: '18/10/2026' },
  { value: 'MM/DD/YYYY', label: '10/18/2026' },
  { value: 'YYYY-MM-DD', label: '2026-10-18' },
];
export const TIME_FORMATS = [
  { value: '12h', label: '12-hour (5:30 PM)' },
  { value: '24h', label: '24-hour (17:30)' },
];
export const DEFAULT_DISPLAY = { dateFormat: 'DD MMM YYYY', timeFormat: '12h' };

let display = DEFAULT_DISPLAY;
export const setDisplaySettings = (settings) => { display = { ...DEFAULT_DISPLAY, ...settings }; };
export const getDisplaySettings = () => display;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' is a calendar date (no time zone): read it as local, so it never shifts a day
const toDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
};

// Date in the workspace format. year: false gives the short form ('18 Oct', '18/10', '10/18', '10-18').
// weekday: true prefixes the day ('Sun 18 Oct').
export function formatDate(value, { year = true, weekday = false, format = display.dateFormat } = {}) {
  if (value == null || value === '') return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const D = d.getDate(), M = d.getMonth() + 1, Y = d.getFullYear();
  let text;
  switch (format) {
    case 'DD/MM/YYYY': text = year ? `${pad(D)}/${pad(M)}/${Y}` : `${pad(D)}/${pad(M)}`; break;
    case 'MM/DD/YYYY': text = year ? `${pad(M)}/${pad(D)}/${Y}` : `${pad(M)}/${pad(D)}`; break;
    case 'YYYY-MM-DD': text = year ? `${Y}-${pad(M)}-${pad(D)}` : `${pad(M)}-${pad(D)}`; break;
    default: text = year ? `${D} ${MONTHS[M - 1]} ${Y}` : `${D} ${MONTHS[M - 1]}`;
  }
  return weekday ? `${DAYS[d.getDay()]} ${text}` : text;
}

// Time in the workspace format: '5:30 PM' or '17:30' (seconds: true adds them)
export function formatTime(value, { seconds = false, format = display.timeFormat } = {}) {
  if (value == null || value === '') return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const s = seconds ? `:${pad(d.getSeconds())}` : '';
  if (format === '24h') return `${pad(d.getHours())}:${pad(d.getMinutes())}${s}`;
  const h = d.getHours() % 12 || 12;
  return `${h}:${pad(d.getMinutes())}${s} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export const formatDateTime = (value, options = {}) =>
  (value == null || value === '' ? '—' : `${formatDate(value, options)}, ${formatTime(value, options)}`);

// Sprint ranges: '7–20 Oct', '29 Sep – 6 Oct' (text format); '07/10 – 20/10' otherwise.
// year: true adds the year to the end date.
export function formatDateRange(start, end, { year = false } = {}) {
  if (!start) return '—';
  if (!end) return formatDate(start, { year });
  if (display.dateFormat === 'DD MMM YYYY') {
    const a = toDate(start), b = toDate(end);
    const tail = year ? ` ${b.getFullYear()}` : '';
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}${tail}`;
    return `${formatDate(start, { year: false })} – ${formatDate(end, { year: false })}${tail}`;
  }
  return `${formatDate(start, { year: false })} – ${formatDate(end, { year })}`;
}
