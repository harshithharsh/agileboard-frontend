import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import IssueCard from './IssueCard.jsx';

export default function Board({ projectId }) {
  const [board, setBoard] = useState(null);

  const load = () => api.getBoard(projectId).then(setBoard);
  useEffect(() => { load(); }, [projectId]);

  const onDrop = async (e, columnId) => {
    const issueId = e.dataTransfer.getData('text/plain');
    await api.updateIssue(issueId, { column_id: columnId });
    load();
  };

  if (!board) return <p>Loading board…</p>;

  return (
    <section>
      {board.sprint && (
        <div className="sprint">
          <h2>{board.sprint.name}</h2>
          <span>{board.sprint.goal}</span>
        </div>
      )}
      <div className="board">
        {board.columns.map((col) => (
          <div
            key={col.id}
            className="column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <h3>{col.name} <span className="count">{col.issues.length}</span></h3>
            {col.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
          </div>
        ))}
      </div>
    </section>
  );
}
