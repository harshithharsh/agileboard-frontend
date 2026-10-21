import { dayKey, parseDay, shiftDay } from './calc.js';
import { formatDate, formatDateRange } from '../../lib/datetime.js';

// Reporting periods. Quarters follow the workspace fiscal year (rules.fiscalYearStartMonth, 4 = April).
// A period that runs past today is cut at today ("to date"), so plan and actuals cover the same days.

const monthStart = (y, m) => dayKey(new Date(y, m, 1));
const monthEnd = (y, m) => dayKey(new Date(y, m + 1, 0));

function quarterOf(day, fyStart) {
  const d = parseDay(day);
  const offset = (d.getMonth() - (fyStart - 1) + 12) % 12; // months since the fiscal year began
  const q = Math.floor(offset / 3);
  const startMonth = d.getMonth() - (offset % 3);
  const fyYear = d.getMonth() >= fyStart - 1 ? d.getFullYear() : d.getFullYear() - 1;
  return { q: q + 1, fyYear, start: monthStart(d.getFullYear(), startMonth), end: monthEnd(d.getFullYear(), startMonth + 2) };
}

const weekStartOf = (day, weekStart) => {
  const back = (parseDay(day).getDay() - weekStart + 7) % 7;
  return shiftDay(day, -back);
};

export const PERIOD_PRESETS = [
  ['this-week', 'This week'], ['last-week', 'Last week'],
  ['this-month', 'This month'], ['last-month', 'Last month'],
  ['this-quarter', 'This quarter'], ['last-quarter', 'Last quarter'],
  ['custom', 'Custom'],
];

const fyLabel = (fyYear, fyStart) => (fyStart === 1 ? `${fyYear}` : `FY${String(fyYear).slice(2)}-${String(fyYear + 1).slice(2)}`);

// { start, end, asOf, label, toDate } for a preset (or custom dates)
export function periodRange(preset, rules, today, custom = {}) {
  const t = parseDay(today);
  let start;
  let end;
  let label;
  if (preset === 'this-week' || preset === 'last-week') {
    start = weekStartOf(today, rules.weekStart);
    if (preset === 'last-week') start = shiftDay(start, -7);
    end = shiftDay(start, 6);
    label = `Week of ${formatDate(start, { year: false })}`;
  } else if (preset === 'this-month' || preset === 'last-month') {
    const m = t.getMonth() - (preset === 'last-month' ? 1 : 0);
    start = monthStart(t.getFullYear(), m);
    end = monthEnd(t.getFullYear(), m);
    label = parseDay(start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } else if (preset === 'this-quarter' || preset === 'last-quarter') {
    let q = quarterOf(today, rules.fiscalYearStartMonth);
    if (preset === 'last-quarter') q = quarterOf(shiftDay(q.start, -1), rules.fiscalYearStartMonth);
    ({ start, end } = q);
    label = `Q${q.q} ${fyLabel(q.fyYear, rules.fiscalYearStartMonth)}`;
  } else {
    start = custom.start || shiftDay(today, -27);
    end = custom.end || today;
    if (end < start) [start, end] = [end, start];
    label = formatDateRange(start, end, { year: true });
  }
  const toDate = end > today;
  const cut = toDate ? today : end;
  return { start, end: cut, fullEnd: end, asOf: cut, label: toDate ? `${label} · to date` : label, toDate };
}

// Weekly or monthly buckets covering a range (first and last may be partial)
export function buckets(range, granularity, rules) {
  const out = [];
  if (granularity === 'month') {
    for (let d = parseDay(range.start); dayKey(d) <= range.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const s = dayKey(d) < range.start ? range.start : dayKey(d);
      const e = monthEnd(d.getFullYear(), d.getMonth());
      out.push({ start: s, end: e > range.end ? range.end : e, asOf: e > range.end ? range.end : e, label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) });
    }
    return out;
  }
  for (let s = weekStartOf(range.start, rules.weekStart); s <= range.end; s = shiftDay(s, 7)) {
    const e = shiftDay(s, 6);
    out.push({ start: s < range.start ? range.start : s, end: e > range.end ? range.end : e, asOf: e > range.end ? range.end : e, label: formatDate(s, { year: false }) });
  }
  return out;
}

export const workingDayCount = (range, rules, isWorkingDay) => {
  let n = 0;
  for (let d = range.start; d <= range.end; d = shiftDay(d, 1)) if (isWorkingDay(d, rules)) n += 1;
  return n;
};
