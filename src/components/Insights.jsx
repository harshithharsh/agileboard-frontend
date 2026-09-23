const GROUPS = [
  ['wentWell', 'What went well', 'good'],
  ['attention', 'Attention required', 'warn'],
  ['risks', 'Key risks', 'risk'],
  ['focus', 'Recommended focus', 'focus'],
];

export default function Insights({ insights }) {
  return (
    <div className="insights-grid">
      {GROUPS.map(([key, title, tone]) => (
        <div className={`card insight insight-${tone}`} key={key}>
          <h3>{title}</h3>
          <ul>
            {insights[key].length ? insights[key].map((t) => <li key={t}>{t}</li>) : <li className="muted">Nothing to report.</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
