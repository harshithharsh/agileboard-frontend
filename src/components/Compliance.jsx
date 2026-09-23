const ITEMS = [
  ['dor', 'Definition of Ready'],
  ['dod', 'Definition of Done'],
  ['acceptanceCriteria', 'Acceptance Criteria'],
  ['codeReview', 'Code Review'],
  ['testCases', 'Test Case Completion'],
  ['automation', 'Automation Coverage'],
];

export default function Compliance({ compliance }) {
  return (
    <div className="compliance">
      {ITEMS.map(([key, label]) => {
        const v = compliance[key];
        const tracked = v !== null && v !== undefined;
        const tone = v >= 90 ? 'bar-success' : v >= 80 ? 'bar-primary' : 'bar-warning';
        return (
          <div className="compliance-row" key={key}>
            <div className="compliance-label">
              <span>{label}</span>
              {tracked ? <b>{v}%</b> : <span className="muted">Not tracked in Jira</span>}
            </div>
            <div className="bar">{tracked && <div className={tone} style={{ width: `${v}%` }} />}</div>
          </div>
        );
      })}
    </div>
  );
}
