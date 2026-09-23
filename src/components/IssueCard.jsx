export default function IssueCard({ issue }) {
  return (
    <div
      className={`card type-${issue.type}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', issue.id)}
    >
      <div className="card-title">{issue.title}</div>
      <div className="card-meta">
        <span className="key">{issue.issue_key}</span>
        <span className={`priority p-${issue.priority}`}>{issue.priority}</span>
        {issue.story_points != null && <span className="points">{issue.story_points}</span>}
      </div>
      {issue.assignee_name && <div className="assignee">{issue.assignee_name}</div>}
    </div>
  );
}
