// Issues in the sprint by type: planned (in the sprint at start), added mid-sprint, completed.
export default function IssueTypesTable({ issueTypes }) {
  const { rows, total } = issueTypes;
  return (
    <table className="issue-types">
      <thead>
        <tr><th>Issue Type</th><th className="num">Planned</th><th className="num">Added</th><th className="num">Completed</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.type}>
            <td>No. of {r.label}</td>
            <td className="num"><b>{r.planned}</b></td>
            <td className="num">{r.added}</td>
            <td className="num">{r.completed}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="total-row">
          <td>{total.label}</td>
          <td className="num">{total.planned}</td>
          <td className="num">{total.added}</td>
          <td className="num">{total.completed}</td>
        </tr>
      </tfoot>
    </table>
  );
}
