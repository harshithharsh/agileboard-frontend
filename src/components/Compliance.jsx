const ITEMS = [
  ['dor', 'Definition of Ready'],
  ['dod', 'Definition of Done'],
  ['acceptanceCriteria', 'Acceptance criteria'],
  ['codeReview', 'Code review'],
  ['testCases', 'Test case completion'],
  ['automation', 'Automation coverage'],
];

export default function Compliance({ compliance }) {
  return (
    <div className="compliance">
      {ITEMS.map(([key, label]) => {
        const v = compliance[key] ?? 0;
        const tone = v >= 90 ? 'bar-success' : v >= 80 ? 'bar-primary' : 'bar-warning';
        return (
          <div className="compliance-row" key={key}>
            <div className="compliance-label"><span>{label}</span><b>{v}%</b></div>
            <div className="bar"><div className={tone} style={{ width: `${v}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
