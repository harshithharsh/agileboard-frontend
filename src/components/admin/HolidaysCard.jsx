import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { formatDate } from '../../lib/datetime.js';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon } from '../Icons.jsx';

// Settings → General: public holidays, one month at a time as a calendar. Resource Management leaves
// them out of capacity and planned hours.
const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
const isWeekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00`).getDay());
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HolidaysCard({ onChanged }) {
  const [list, setList] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [f, setF] = useState({ date: '', name: '' });
  const [state, setState] = useState({ busy: false, error: null });

  const load = () => api.admin.holidays().then(setList).catch((e) => setState({ busy: false, error: e.message }));
  useEffect(() => { load(); }, []);

  const run = async (fn) => {
    setState({ busy: true, error: null });
    try { await fn(); await load(); onChanged?.(); setState({ busy: false, error: null }); return true; } catch (e) { setState({ busy: false, error: e.message }); return false; }
  };
  const add = async (e) => {
    e.preventDefault();
    if (!f.date) return setState({ busy: false, error: 'Choose a date' });
    if (!f.name.trim()) return setState({ busy: false, error: 'Enter a holiday name' });
    if (await run(() => api.admin.saveHoliday(f.date, f.name.trim()))) {
      setMonth({ y: Number(f.date.slice(0, 4)), m: Number(f.date.slice(5, 7)) - 1 });
      setF({ date: '', name: '' });
    }
  };
  const step = (n) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const byDate = new Map((list ?? []).map((h) => [h.date, h]));
  const exists = byDate.get(f.date);
  const today = (() => { const d = new Date(); return dayKey(d.getFullYear(), d.getMonth(), d.getDate()); })();
  // Calendar cells: blanks before the 1st (weeks start on Monday), then each day of the month
  const lead = (new Date(month.y, month.m, 1).getDay() + 6) % 7;
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => dayKey(month.y, month.m, i + 1))];
  const prefix = `${month.y}-${pad(month.m + 1)}`;
  const inMonth = (list ?? []).filter((h) => h.date.startsWith(prefix));
  const inYear = (list ?? []).filter((h) => h.date.startsWith(String(month.y)));
  const monthName = new Date(month.y, month.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <section className="admin-card settings-card">
      <div className="settings-card-head settings-card-head-row">
        <div>
          <h2>Holidays</h2>
        </div>
        <div className="year-switch" role="group" aria-label="Month">
          <button className="icon-btn icon-btn-sm" onClick={() => step(-1)} aria-label="Previous month"><ArrowLeftIcon /></button>
          <b className="hcal-month">{monthName}</b>
          <button className="icon-btn icon-btn-sm" onClick={() => step(1)} aria-label="Next month"><ArrowRightIcon /></button>
        </div>
      </div>

      <form className="holiday-add" onSubmit={add}>
        <input type="date" value={f.date} onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))} aria-label="Holiday date" />
        <input type="text" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Holiday name, e.g. Onam" maxLength={120} aria-label="Holiday name" />
        <button className="btn-primary-solid" type="submit" disabled={state.busy}>{exists ? 'Rename' : 'Add holiday'}</button>
      </form>
      {state.error && <p className="form-error card-error">{state.error}</p>}
      {f.date && isWeekend(f.date) && <p className="form-note form-note-warn holiday-note">{formatDate(f.date)} is a {weekday(f.date)}: it doesn’t change capacity, as weekends are already off.</p>}

      {!list && !state.error && <p className="muted holiday-empty">Loading…</p>}
      {list && (
        <>
          {/* Click a day to fill in the form: add a holiday there, or rename the one it has */}
          <div className="hcal" role="grid" aria-label={`Holidays in ${monthName}`}>
            {WEEKDAYS.map((d) => <span key={d} className="hcal-wd" role="columnheader">{d}</span>)}
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} className="hcal-day hcal-blank" />;
              const h = byDate.get(date);
              const cls = ['hcal-day', isWeekend(date) && 'is-weekend', h && 'is-holiday', date === today && 'is-today', date === f.date && 'is-picked'].filter(Boolean).join(' ');
              return (
                <button key={date} type="button" role="gridcell" className={cls} title={h ? h.name : 'Add a holiday on this day'}
                  aria-label={`${formatDate(date)}${h ? `: ${h.name}` : ''}`} onClick={() => setF({ date, name: h?.name ?? '' })}>
                  <span className="hcal-num">{Number(date.slice(8))}</span>
                  {h && <span className="hcal-name">{h.name}</span>}
                </button>
              );
            })}
          </div>

          <ul className="holiday-list">
            {inMonth.map((h) => (
              <li key={h.date} className={isWeekend(h.date) ? 'is-weekend' : ''}>
                <span className="holiday-date"><b>{formatDate(h.date, { year: false })}</b><span>{weekday(h.date)}</span></span>
                <span className="holiday-name">{h.name}{isWeekend(h.date) && <span className="tag">Weekend</span>}</span>
                <button className="action-btn action-danger" onClick={() => run(() => api.admin.deleteHoliday(h.date))} disabled={state.busy}
                  title="Remove holiday" aria-label={`Remove ${h.name}`}><TrashIcon /></button>
              </li>
            ))}
            {!inMonth.length && <li className="holiday-empty muted">No holidays in {monthName}.</li>}
          </ul>
          <div className="settings-card-foot holiday-foot">
            <span className="muted small">
              {inMonth.length} in {monthName.split(' ')[0]} · {inYear.length} in {month.y}, {inYear.filter((h) => !isWeekend(h.date)).length} on working days
            </span>
          </div>
        </>
      )}
    </section>
  );
}
