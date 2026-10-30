import { eachDay, isWorkingDay, hoursPerDay, inEffect, parseDay, dayKey, shiftDay, round } from './calc.js';

// Weekly Redmine update: for one week, who logged their hours consistently and who has entries pending.
//   Special mention: logged on every working day of the week and at least `mention` % of their planned hours
//   Action required:  logged under `action` % of their planned hours, or nothing on `missing`+ working days
// (defaults below; the dialog lets you change them)
// Planned hours = the person's FTE on each working day (all projects) × working hours per day.
// Logged hours = all their Redmine time entries that day (every linked project, eligible activities).
export const DEFAULT_RULES = { mention: 80, action: 50, missing: 2 };

// Monday of the week containing a day
export const mondayOf = (day) => {
  const d = parseDay(day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
};

// The last full week before the week containing `today`
export const lastWeekStart = (today) => shiftDay(mondayOf(today), -7);

// ISO 8601 week number (weeks start on Monday; week 1 holds the year's first Thursday)
export function isoWeek(day) {
  const d = parseDay(day);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday of this week
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((d - firstThursday) / (7 * 864e5));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// '5–9 October 2026', '29 September – 3 October 2026', '29 December 2026 – 2 January 2027'
export function weekLabel(start, end) {
  const a = parseDay(start), b = parseDay(end);
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}

// The week's working days (Mon–Sun minus weekends and holidays) and its label (first to last working weekday)
export function weekInfo(weekStart, rules) {
  const all = eachDay(weekStart, shiftDay(weekStart, 6));
  const working = all.filter((d) => isWorkingDay(d, rules));
  const weekdays = all.filter((d) => rules.workingWeekdays.includes(parseDay(d).getDay()));
  return { start: weekStart, end: shiftDay(weekStart, 6), working, number: isoWeek(weekStart), label: weekLabel(weekdays[0] ?? weekStart, weekdays.at(-1) ?? shiftDay(weekStart, 4)) };
}

// One row per person who had planned time that week and is matched to Redmine
export function weeklyCompliance(data, resources, week, rules = DEFAULT_RULES) {
  const out = [];
  for (const r of resources) {
    if (!r.redmineUserId) continue;
    const perDay = hoursPerDay(r, data.rules);
    let planned = 0;
    for (const d of week.working) {
      planned += data.allocations.filter((a) => a.resourceId === r.id && inEffect(a, d)).reduce((n, a) => n + a.fte, 0) * perDay;
    }
    if (planned <= 0) continue; // not planned that week (e.g. on leave or not allocated)
    const entries = (data.entriesByUser.get(r.redmineUserId) ?? [])
      .filter((e) => e.date >= week.start && e.date <= week.end && data.rules.eligibleActivities.includes(e.activity));
    const byDay = new Map();
    for (const e of entries) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.hours);
    const logged = round(entries.reduce((n, e) => n + e.hours, 0));
    const daysLogged = week.working.filter((d) => byDay.get(d) > 0).length;
    const missing = week.working.length - daysLogged;
    const pct = Math.round((logged / planned) * 100);
    const status = missing === 0 && pct >= rules.mention ? 'mention'
      : pct < rules.action || missing >= rules.missing ? 'action' : 'ok';
    out.push({ resource: r, planned: round(planned), logged, pct, daysLogged, workingDays: week.working.length, missing, status });
  }
  return out.sort((a, b) => a.resource.name.localeCompare(b.resource.name));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The email, in the team's usual format, as plain text and HTML (for pasting into Outlook or sending)
export function weeklyEmail({ week, project, mention, action }) {
  const header = `Redmine Weekly Update – Week ${week.number} · ${week.label}${project ? ` · ${project}` : ''}`;
  const guidelines = [
    'Update Redmine regularly, preferably on the same day the work is completed.',
    'Complete all weekly entries before leaving on Friday.',
    'Ensure logged hours accurately reflect the actual work completed and time spent.',
  ];
  const thanks = 'Thank you for maintaining consistent and timely Redmine updates throughout the week. Your discipline helps ensure accurate effort tracking and better project visibility.';
  const request = 'The following team members are requested to complete their pending Redmine entries at the earliest:';

  const text = [
    header, '', 'Hi Team,', '',
    ...(mention.length ? ['🌟 Special Mention – Consistent Redmine Updates', 'A special mention to:', '', ...mention.map((n, i) => `${i + 1}. @${n}`), '', thanks, ''] : []),
    ...(action.length ? ['⚠️ Redmine Update – Action Required', request, '', ...action.map((n) => `* @${n}`), ''] : []),
    '📌 Redmine Update Guidelines', '', ...guidelines.map((g) => `* ${g}`),
  ].join('\n');

  const h2 = 'style="font-size:16px;margin:20px 0 6px"';
  const html = `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.5">
<h1 style="font-size:20px;margin:0 0 16px">${esc(header)}</h1>
<p>Hi Team,</p>
${mention.length ? `<h2 ${h2}>🌟 Special Mention – Consistent Redmine Updates</h2>
<p>A special mention to:</p>
<ol>${mention.map((n) => `<li><b>@${esc(n)}</b></li>`).join('')}</ol>
<p>${esc(thanks)}</p>` : ''}
${action.length ? `<h2 ${h2}>⚠️ Redmine Update – Action Required</h2>
<p>${esc(request)}</p>
<ul>${action.map((n) => `<li><b>@${esc(n)}</b></li>`).join('')}</ul>` : ''}
<h2 ${h2}>📌 Redmine Update Guidelines</h2>
<ul>${guidelines.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
</div>`;
  return { subject: header, text, html };
}
