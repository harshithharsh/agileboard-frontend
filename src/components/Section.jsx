import { useRef, useState } from 'react';
import { DownloadIcon } from './Icons.jsx';
import { downloadPng, downloadCsv } from '../lib/download.js';

export function Section({ title, aside, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {aside && <span className="section-aside">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

// exportAs = { file, columns: [[key, header], ...], rows } adds PNG and CSV download buttons.
export function Card({ title, icon, badge, children, className = '', exportAs }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const savePng = async () => {
    setBusy(true);
    try {
      await downloadPng(ref.current, `${exportAs.file}.png`);
    } finally {
      setBusy(false);
    }
  };
  const saveCsv = () => {
    const header = exportAs.columns.map(([, label]) => label);
    const body = exportAs.rows.map((row) =>
      exportAs.columns.map(([key]) => (typeof key === 'function' ? key(row) : row[key]))
    );
    downloadCsv([header, ...body], `${exportAs.file}.csv`);
  };

  return (
    <div className={`card ${className}`} ref={ref}>
      {(title || badge || exportAs) && (
        <div className="card-head">
          <h3>{icon}{title}</h3>
          <div className="card-head-right">
            {badge && <span className="badge">{badge}</span>}
            {exportAs && (
              <div className="export-actions">
                <button className="btn-mini" onClick={savePng} disabled={busy} title="Download chart as image">
                  <DownloadIcon /> PNG
                </button>
                <button className="btn-mini" onClick={saveCsv} title="Download chart data">
                  <DownloadIcon /> CSV
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function StatusPill({ status, label }) {
  return <span className={`status status-${status}`}><i />{label}</span>;
}
