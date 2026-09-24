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

export function Card({ title, icon, badge, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || badge) && (
        <div className="card-head">
          <h3>{icon}{title}</h3>
          {badge && <span className="badge">{badge}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatusPill({ status, label }) {
  return <span className={`status status-${status}`}><i />{label}</span>;
}
