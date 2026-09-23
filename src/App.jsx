import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import Board from './components/Board.jsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getProjects()
      .then((list) => {
        setProjects(list);
        if (list[0]) setProjectId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <h1>AgileBoard</h1>
        {projects.length > 0 && (
          <select value={projectId || ''} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.key} – {p.name}</option>
            ))}
          </select>
        )}
      </header>
      <main>
        {error && <p className="error">Could not reach the API: {error}</p>}
        {projectId && <Board projectId={projectId} />}
      </main>
    </div>
  );
}
