import { dayKey, parseDay, shiftDay, isWorkingDay } from '../model/calc.js';

// DEMO DATA. Fictional people, teams and projects with generated Redmine time entries, used until the
// Redmine integration exists on the backend. Shaped like the workbook it replaces (35 h a week at FTE 1.0,
// part-time people, people logging hours without an FTE) and with a few problems to show the alerts.

export const DEFAULT_RULES = {
  hoursPerDay: 7,
  workingWeekdays: [1, 2, 3, 4, 5], // Monday–Friday
  weekStart: 1, // weeks start on Monday
  defaultFte: 1,
  fiscalYearStartMonth: 4, // April
  timeZone: 'Asia/Kolkata',
  thresholds: { under: 85, over: 105 }, // utilization %, below / above is flagged
  leaveHandling: 'exclude', // leave days are taken out of capacity and plan
  eligibleActivities: ['Development', 'Testing', 'Design', 'Analysis', 'Meeting', 'Support'],
  activities: ['Development', 'Testing', 'Design', 'Analysis', 'Meeting', 'Support', 'Leave'],
  holidays: [
    { date: '2026-05-01', name: 'May Day' }, { date: '2026-08-15', name: 'Independence Day' },
    { date: '2026-10-02', name: 'Gandhi Jayanti' }, { date: '2026-11-09', name: 'Diwali' },
    { date: '2026-12-25', name: 'Christmas' }, { date: '2027-01-26', name: 'Republic Day' },
  ],
};

const TEAMS = [
  ['t-atlas', 'Atlas', 'squad'], ['t-orion', 'Orion', 'squad'], ['t-platform', 'Platform', 'team'],
  ['t-qa', 'QA Guild', 'chapter'], ['t-ba', 'BA Guild', 'chapter'], ['t-design', 'Design Studio', 'team'],
];
const PROJECTS = [['p-core', 'Core Product', 101], ['p-portal', 'Client Portal', 102], ['p-mobile', 'Mobile App', 103], ['p-internal', 'Internal Tools', 104]];

// name, team, employment FTE, allocations [[project, fte]], how much they log vs plan, main activity, mapped?
const PEOPLE = [
  ['Ananya Rao', 't-atlas', 1, [['p-core', 1]], 0.93, 'Development'],
  ['Dev Kapoor', 't-atlas', 1, [['p-core', 0.5], ['p-portal', 0.5]], 1.02, 'Development'],
  ['Vikram Hegde', 't-atlas', 1, [['p-core', 1]], 1.17, 'Development'],
  ['Tara Krishnan', 't-atlas', 1, [['p-core', 1]], 0.86, 'Development'],
  ['Zoya Khan', 't-atlas', 0.75, [['p-core', 0.75]], 0.94, 'Development'],
  ['Mihir Bose', 't-atlas', 1, [['p-core', 0.5], ['p-internal', 0.5]], 0.9, 'Development'],
  ['Rahul Verma', 't-orion', 1, [['p-portal', 1]], 0.95, 'Development', false],
  ['Nikhil Das', 't-orion', 0.25, [['p-portal', 0.25]], 0.88, 'Development'],
  ['Priya Iyer', 't-orion', 1, [['p-portal', 1]], 0.9, 'Development'],
  ['Arav Menon', 't-orion', 1, [['p-portal', 0.75], ['p-internal', 0.25]], 0.83, 'Development'],
  ['Divya Nair', 't-orion', 0.5, [['p-portal', 0.5]], 0.97, 'Development'],
  ['Karan Shah', 't-platform', 1, [['p-core', 0.75], ['p-mobile', 0.5]], 1.12, 'Development'],
  ['Nisha Thomas', 't-platform', 1, [['p-mobile', 1]], 1.24, 'Development'],
  ['Rohan Joshi', 't-platform', 1, [['p-mobile', 1]], 0.96, 'Support'],
  ['Isha Mehta', 't-qa', null, [], 0.8, 'Testing'],
  ['Sameer Jain', 't-qa', 1, [['p-core', 0.5], ['p-portal', 0.5]], 0.78, 'Testing'],
  ['Kavya Reddy', 't-qa', 1, [['p-mobile', 1]], 0.82, 'Testing'],
  ['Farah Ali', 't-qa', 0.5, [['p-core', 0.5]], 0.74, 'Testing'],
  ['Sara Mathew', 't-ba', 1, [['p-core', 0.5], ['p-mobile', 0.5]], 0.77, 'Analysis'],
  ['Leela Joseph', 't-ba', 1, [['p-portal', 1]], 0.41, 'Analysis'],
  ['Arjun Pillai', 't-ba', 0.75, [['p-core', 0.75]], 0.88, 'Analysis'],
  ['Meera Pillai', 't-design', 0.75, [['p-portal', 0.5]], 0.82, 'Design'],
  ['Omar Sait', null, 1, [['p-mobile', 0.5]], 0.47, 'Design'],
  ['Neha Kulkarni', 't-design', 1, [['p-core', 0.5], ['p-mobile', 0.5]], 0.91, 'Design'],
];

// Small deterministic random generator, so the demo looks the same on every load
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
const login = (name) => { const [f, l = ''] = name.toLowerCase().split(' '); return `${f[0]}${l}`; };

export function buildDemoData(today = dayKey(new Date())) {
  const random = rng(20261021);
  const rules = DEFAULT_RULES;
  const start = dayKey(new Date(parseDay(today).getFullYear(), parseDay(today).getMonth() - 6, 1)); // about 6 months back
  const history = [];

  const teams = TEAMS.map(([id, name, kind]) => ({ id, name, kind, leadId: null, redmineProjectIds: [] }));
  const projects = PROJECTS.map(([id, name, redmineId]) => ({ id, name, redmineProjectId: redmineId }));
  const redmineProjects = PROJECTS.map(([, name, redmineId]) => ({ id: redmineId, name, identifier: slug(name).replace(/\./g, '-'), mappedProjectId: `p-${slug(name).split('.')[0]}` }));
  redmineProjects.forEach((rp) => { rp.mappedProjectId = projects.find((p) => p.redmineProjectId === rp.id)?.id ?? null; });

  const resources = [];
  const allocations = [];
  const redmineUsers = [];
  const plans = [];
  PEOPLE.forEach(([name, teamId, fte, allocs, logFactor, activity, mapped = true], i) => {
    const id = `r-${i + 1}`;
    const ruId = 900 + i;
    redmineUsers.push({ id: ruId, login: login(name), name, email: `${slug(name)}@example.com` });
    resources.push({ id, name, email: `${slug(name)}@example.com`, teamId, employmentFte: fte, weeklyHours: null, redmineUserId: mapped ? ruId : null });
    allocs.forEach(([projectId, f], k) => allocations.push({
      id: `a-${i + 1}-${k + 1}`, resourceId: id, projectId, fte: f, startDate: start, endDate: null,
      modifiedBy: 'Demo setup', modifiedAt: `${start}T09:00:00`,
    }));
    plans.push({ ruId, allocs: allocs.length ? allocs : [['p-core', 0.75]], logFactor, activity });
  });
  // Team leads, and Redmine projects behind each team
  const lead = (teamId, name) => { teams.find((t) => t.id === teamId).leadId = resources.find((r) => r.name === name).id; };
  lead('t-atlas', 'Ananya Rao'); lead('t-orion', 'Priya Iyer'); lead('t-platform', 'Karan Shah');
  lead('t-qa', 'Isha Mehta'); lead('t-ba', 'Sara Mathew'); lead('t-design', 'Neha Kulkarni');
  for (const t of teams) {
    const ids = new Set(allocations.filter((a) => resources.find((r) => r.id === a.resourceId)?.teamId === t.id).map((a) => a.projectId));
    t.redmineProjectIds = projects.filter((p) => ids.has(p.id)).map((p) => p.redmineProjectId);
  }

  // Unmapped Redmine accounts: a contractor and a bot
  redmineUsers.push({ id: 990, login: 'contractor01', name: 'External Contractor', email: 'ops@vendor.example' });
  redmineUsers.push({ id: 991, login: 'build-bot', name: 'CI bot', email: null });
  plans.push({ ruId: 990, allocs: [['p-mobile', 0.2]], logFactor: 1, activity: 'Development' });
  plans.push({ ruId: 991, allocs: [['p-core', 0.05]], logFactor: 1, activity: 'Support' });

  // Leave: two days for Sara Mathew last month
  const lastMonth = new Date(parseDay(today).getFullYear(), parseDay(today).getMonth() - 1, 14);
  const leave = [{ id: 'l-1', resourceId: resources.find((r) => r.name === 'Sara Mathew').id, startDate: dayKey(lastMonth), endDate: shiftDay(dayKey(lastMonth), 1), reason: 'Leave' }];

  // Time entries up to yesterday: each person logs per working day around their plan
  const entries = [];
  let entryId = 50000;
  const yesterday = shiftDay(today, -1);
  for (let day = start; day <= yesterday; day = shiftDay(day, 1)) {
    if (!isWorkingDay(day, rules)) continue;
    const quietWeek = parseDay(day).getDate() >= 22 && parseDay(day).getDate() <= 26; // a lighter week each month
    for (const p of plans) {
      if (random() < 0.06) continue; // a day off now and then
      for (const [projectId, f] of p.allocs) {
        const base = f * rules.hoursPerDay * p.logFactor * (quietWeek ? 0.7 : 1);
        const hours = Math.max(0, Math.round((base + (random() - 0.5) * 2.5) * 4) / 4);
        if (!hours) continue;
        const act = random() < 0.12 ? 'Meeting' : p.activity;
        entries.push({ id: entryId += 1, redmineUserId: p.ruId, projectId: projects.find((x) => x.id === projectId).redmineProjectId, date: day, hours, activity: act });
      }
    }
  }
  // A leave entry logged in Redmine (excluded by the activity rule)
  entries.push({ id: entryId += 1, redmineUserId: 918, projectId: 101, date: dayKey(lastMonth), hours: 7, activity: 'Leave' });

  // Entries store the Redmine project id; map it to the AgileMetrix project for calculations
  entries.forEach((e) => { e.projectId = projects.find((p) => p.redmineProjectId === e.projectId).id; });

  history.push({ id: 'h-1', at: `${start}T09:00:00`, by: 'Demo setup', text: 'Imported people and teams from Redmine' });

  const syncRuns = [0, 1, 2, 3, 4].map((n) => {
    const d = shiftDay(today, -n);
    const failed = n === 2;
    const partial = n === 0;
    return {
      id: `s-${n}`, startedAt: `${d}T06:00:00`, status: failed ? 'failed' : partial ? 'partial' : 'success',
      entries: failed ? 0 : 1200 + 37 * (5 - n), users: failed ? 0 : redmineUsers.length, seconds: failed ? 4 : 33 + n,
      message: failed ? 'Could not reach redmine.example.com (timeout). Previous data kept.'
        : partial ? 'Project “Mobile App”: 403 Forbidden. The API user may have lost access; other projects synced.' : null,
    };
  });

  return {
    demo: true,
    today,
    rules,
    teams,
    projects,
    resources,
    allocations,
    leave,
    redmineUsers,
    redmineProjects,
    entries,
    history,
    integration: {
      name: 'Company Redmine', baseUrl: 'https://redmine.example.com', authMethod: 'api-key', hasSecret: false,
      projectIds: redmineProjects.map((p) => p.id), importFrom: start, frequency: 'daily', syncTime: '06:00',
      ignoredUserIds: [], status: 'demo', activatedAt: null,
    },
    syncRuns,
  };
}
