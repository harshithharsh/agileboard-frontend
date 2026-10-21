import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { formatDate } from '../../lib/datetime.js';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon } from '../Icons.jsx';

// Settings → General: public holidays. Resource Management leaves them out of capacity and planned hours.
const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
const isWeekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00`).getDay());

export default function HolidaysCard({ onChanged }) {
  const [list, setList] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
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
      setYear(Number(f.date.slice(0, 4)));
      setF({ date: '', name: '' });
    }
  };

  const shown = (list ?? []).filter((h) => h.date.startsWith(String(year)));
  const weekdays = shown.filter((h) => !isWeekend(h.date)).length;
  const exists = list?.find((h) => h.date === f.date);

  return (
    <section className="admin-card settings-card">
      <div className="settings-card-head settings-card-head-row">
        <div>
          <h2>Holidays</h2>
          <p>Public holidays for everyone. Resource Management leaves them out of capacity and planned hours.</p>
        </div>
        <div className="year-switch" role="group" aria-label="Year">
          <button className="icon-btn icon-btn-sm" onClick={() => setYear((y) => y - 1)} aria-label="Previous year"><ArrowLeftIcon /></button>
          <b>{year}</b>
          <button className="icon-btn icon-btn-sm" onClick={() => setYear((y) => y + 1)} aria-label="Next year"><ArrowRightIcon /></button>
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
        <ul className="holiday-list">
          {shown.map((h) => (
            <li key={h.date} className={isWeekend(h.date) ? 'is-weekend' : ''}>
              <span className="holiday-date"><b>{formatDate(h.date, { year: false })}</b><span>{weekday(h.date)}</span></span>
              <span className="holiday-name">{h.name}{isWeekend(h.date) && <span className="tag">Weekend</span>}</span>
              <button className="action-btn action-danger" onClick={() => run(() => api.admin.deleteHoliday(h.date))} disabled={state.busy}
                title="Remove holiday" aria-label={`Remove ${h.name}`}><TrashIcon /></button>
            </li>
          ))}
          {!shown.length && <li className="holiday-empty muted">No holidays in {year} yet.</li>}
        </ul>
      )}
      {list && shown.length > 0 && (
        <div className="settings-card-foot holiday-foot">
          <span className="muted small">{shown.length} holiday{shown.length === 1 ? '' : 's'} in {year} · {weekdays} on working days</span>
        </div>
      )}
    </section>
  );
}
