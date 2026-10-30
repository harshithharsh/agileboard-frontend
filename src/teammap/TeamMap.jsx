import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../api/client.js';
import { MapIcon, TeamIcon, ClearIcon, PlusIcon, MinusIcon, SearchIcon } from '../components/Icons.jsx';
import { layoutMap, SQUAD_COLORS, SQUAD_W, SQUAD_H, CORE_W, CORE_H } from './layout.js';

const fteText = (n) => (Math.round(n * 100) / 100).toFixed(2);

// Team Map: a project in the middle, its squads around it and each squad's members around the squad.
// Hover to highlight a squad or a person (a person in two squads lights up in both); click for details.
export default function TeamMap({ user, onSignOut, onMenu, onOpenAdmin }) {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState(() => {
    try { return localStorage.getItem('agilemetrix-teammap-project'); } catch { return null; }
  });
  const [hover, setHover] = useState(null); // { squad } | { person }
  const [selected, setSelected] = useState(null); // { squad } | { person }
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => { api.teamMap().then(setProjects).catch((e) => setError(e.message)); }, []);
  const project = projects?.find((p) => p.id === projectId) ?? projects?.find((p) => p.squads.length) ?? projects?.[0];
  const choose = (id) => {
    setProjectId(id); setSelected(null); setHover(null); setZoom(1); setPan({ x: 0, y: 0 });
    try { localStorage.setItem('agilemetrix-teammap-project', id); } catch { /* storage unavailable */ }
  };

  const map = useMemo(() => (project ? layoutMap(project) : null), [project]);
  const q = search.trim().toLowerCase();
  const matches = (name) => q && name.toLowerCase().includes(q);

  // What is lit up: a squad, a person (all their places), or search results
  const focus = hover ?? selected;
  const lit = (node) => {
    if (focus?.squad) return node.squadId === focus.squad;
    if (focus?.person) return node.personId === focus.person;
    if (q) return node.personId ? matches(node.name) : node.members?.some((m) => matches(m.name));
    return true;
  };
  const dimming = !!(focus || q);

  // Details panel
  const squadOf = (id) => project?.squads.find((s) => s.id === id);
  const personInfo = (id) => {
    if (!project) return null;
    const squads = project.squads.filter((s) => s.members.some((m) => m.id === id));
    const m = squads[0]?.members.find((x) => x.id === id);
    return m ? { ...m, squads } : null;
  };

  // Pan with the mouse, zoom with the buttons or the wheel
  const onPointerDown = (e) => { if (e.button === 0 && !e.target.closest('[data-node]')) drag.current = { x: e.clientX, y: e.clientY, pan }; };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setPan({ x: drag.current.pan.x + (e.clientX - drag.current.x) / zoom, y: drag.current.pan.y + (e.clientY - drag.current.y) / zoom });
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // plain scrolling scrolls the page
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const totalPeople = project ? new Set(project.squads.flatMap((s) => s.members.map((m) => m.id))).size : 0;
  const viewBox = map ? (() => {
    const w = map.width / zoom, h = map.height / zoom;
    return `${map.minX + (map.width - w) / 2 - pan.x} ${map.minY + (map.height - h) / 2 - pan.y} ${w} ${h}`;
  })() : '0 0 100 100';

  return (
    <>
      <Header title="Team Map" icon={<MapIcon />} onMenu={onMenu} onOpenAdmin={onOpenAdmin} user={user} onSignOut={onSignOut} />
      <main className="tm-main">
        {error && <div className="card error">Could not load the team map: {error}</div>}
        {!projects && !error && <div className="card empty">Loading…</div>}
        {projects && !projects.length && <div className="card empty">No active projects yet. Add one in Settings → Projects.</div>}
        {project && (
          <>
            <section className="card filters tm-toolbar" aria-label="Team map options">
              <div className="filters-intro">
                <span className="filters-icon"><TeamIcon /></span>
                <h2>{project.name}</h2>
              </div>
              <div className="tm-toolbar-body">
                <div className="segmented" role="tablist" aria-label="Project">
                  {projects.map((p) => (
                    <button key={p.id} role="tab" aria-selected={p.id === project.id} className={`segment${p.id === project.id ? ' active' : ''}`} onClick={() => choose(p.id)}>{p.name}</button>
                  ))}
                </div>
                <span className="tm-stats">{project.squads.length} {project.squads.length === 1 ? "squad" : "squads"} · {totalPeople} {totalPeople === 1 ? "person" : "people"}{project.manager ? ` · Project manager: ${project.manager}` : ''}</span>
                <label className="tm-search">
                  <SearchIcon />
                  <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a person" aria-label="Find a person" />
                </label>
              </div>
            </section>

            <section className="card tm-canvas">
              <div className="tm-zoom" role="group" aria-label="Zoom">
                <button className="icon-btn icon-btn-sm" onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))} aria-label="Zoom in" title="Zoom in"><PlusIcon /></button>
                <button className="icon-btn icon-btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))} aria-label="Zoom out" title="Zoom out"><MinusIcon /></button>
                <button className="btn btn-sm" onClick={reset} disabled={zoom === 1 && !pan.x && !pan.y}>Fit</button>
              </div>
              {!project.squads.length ? (
                <div className="empty tm-empty">{project.name} has no squads yet. Add them in Settings → Projects.</div>
              ) : (
                <svg className={`tm-svg${drag.current ? ' dragging' : ''}`} viewBox={viewBox} style={{ aspectRatio: `${map.width} / ${map.height}`, maxWidth: `${Math.round(map.width * 1.05)}px`, margin: "0 auto" }} role="img" aria-label={`${project.name}: ${project.squads.length} squads and their members`}
                  onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel}
                  onClick={(e) => { if (!e.target.closest('[data-node]')) setSelected(null); }}>
                  {/* Links: project → squads, squads → members */}
                  {map.squads.map((s) => s.members.map((m) => (
                    <path key={`l-${s.id}-${m.id}`} d={m.link} className={`tm-link${dimming && !(lit(m) || lit(s)) ? ' dim' : ''}`} style={{ stroke: s.color }} />
                  )))}
                  {map.squads.map((s) => (
                    <path key={`p-${s.id}`} d={s.link} className={`tm-link tm-link-main${dimming && !lit(s) && !s.members.some(lit) ? ' dim' : ''}`} />
                  ))}

                  {/* Project */}
                  <g className="tm-core">
                    <rect x={-CORE_W / 2} y={-CORE_H / 2} width={CORE_W} height={CORE_H} rx="14" />
                    <text y="-2" className="tm-core-name">{project.name}</text>
                    <text y="18" className="tm-core-sub">Project</text>
                  </g>

                  {/* Squads */}
                  {map.squads.map((s) => {
                    const active = (selected?.squad ?? hover?.squad) === s.id;
                    return (
                      <g key={s.id} data-node transform={`translate(${s.x},${s.y})`} className={`tm-squad${dimming && !lit(s) && !s.members.some(lit) ? ' dim' : ''}${active ? ' active' : ''}`}
                        style={{ '--c': s.color }} tabIndex={0} role="button" aria-label={`${s.name}: ${s.members.length} members`}
                        onMouseEnter={() => setHover({ squad: s.id })} onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ squad: s.id })} onBlur={() => setHover(null)}
                        onClick={() => setSelected((x) => (x?.squad === s.id ? null : { squad: s.id }))}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected((x) => (x?.squad === s.id ? null : { squad: s.id })))}>
                        <rect x={-SQUAD_W / 2} y={-SQUAD_H / 2} width={SQUAD_W} height={SQUAD_H} rx="10" className="tm-squad-box" />
                        <rect x={s.x < 0 ? -SQUAD_W / 2 : SQUAD_W / 2 - 5} y={-SQUAD_H / 2} width="5" height={SQUAD_H} rx="2.5" style={{ fill: s.color }} />
                        <text y="-3" className="tm-squad-name">{s.name}</text>
                        <text y="14" className="tm-squad-sub">{s.members.length} {s.members.length === 1 ? 'member' : 'members'}</text>
                      </g>
                    );
                  })}

                  {/* Members */}
                  {map.squads.map((s) => s.members.map((m) => {
                    const on = lit(m) || lit(s);
                    const found = matches(m.name);
                    const isSel = selected?.person === m.personId;
                    return (
                      <g key={`m-${s.id}-${m.id}`} data-node transform={`translate(${m.x},${m.y})`}
                        className={`tm-person${dimming && !on ? ' dim' : ''}${found || isSel || hover?.person === m.personId ? ' hl' : ''}`}
                        style={{ '--c': s.color }} tabIndex={0} role="button" aria-label={`${m.name}, ${s.name}`}
                        onMouseEnter={() => setHover({ person: m.personId })} onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ person: m.personId })} onBlur={() => setHover(null)}
                        onClick={() => setSelected((x) => (x?.person === m.personId ? null : { person: m.personId }))}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected((x) => (x?.person === m.personId ? null : { person: m.personId })))}>
                        <rect x={m.left ? -m.pill : 0} y="-14" width={m.pill} height="28" rx="8" className="tm-chip" />
                        <circle cx={m.left ? -12 : 12} cy="0" r="4" style={{ fill: s.color }} />
                        <text className="tm-person-name" x={m.left ? -22 : 22} y="4.5" textAnchor={m.left ? 'end' : 'start'}>{m.short}</text>
                      </g>
                    );
                  }))}
                </svg>
              )}

              {selected && (
                <aside className="tm-panel card" aria-live="polite">
                  <button className="icon-btn icon-btn-sm tm-panel-close" onClick={() => setSelected(null)} aria-label="Close details"><ClearIcon /></button>
                  {selected.squad && (() => {
                    const s = squadOf(selected.squad);
                    const color = map.squads.find((x) => x.id === s.id)?.color;
                    return (
                      <>
                        <span className="tm-panel-kicker" style={{ color }}>Squad · {s.kind === 'kanban' ? 'Kanban board' : 'Scrum board'}{s.boardId ? ` #${s.boardId}` : ''}</span>
                        <h3>{s.name}</h3>
                        <p className="muted small">{s.members.length} members in {project.name}</p>
                        <ul className="tm-panel-list">
                          {s.members.map((m) => (
                            <li key={m.id}>
                              <button className="link-btn" onClick={() => setSelected({ person: m.id })}>{m.name}</button>
                              <span className="muted small">{m.fte[project.id] ? `${fteText(m.fte[project.id])} FTE` : '—'}</span>
                            </li>
                          ))}
                          {!s.members.length && <li className="muted small">No members yet.</li>}
                        </ul>
                      </>
                    );
                  })()}
                  {selected.person && (() => {
                    const p = personInfo(selected.person);
                    if (!p) return null;
                    const onProject = p.fte[project.id] ?? 0;
                    const total = Object.values(p.fte).reduce((n, x) => n + x, 0);
                    return (
                      <>
                        <span className="tm-panel-kicker">{p.role ?? 'Team member'}</span>
                        <h3>{p.name}</h3>
                        {p.email && <p className="muted small">{p.email}</p>}
                        <dl className="tm-panel-facts">
                          <div><dt>On {project.name}</dt><dd>{onProject ? `${fteText(onProject)} FTE` : 'Not allocated'}</dd></div>
                          <div><dt>All projects</dt><dd>{total ? `${fteText(total)} FTE` : '—'}</dd></div>
                        </dl>
                        <span className="tm-panel-kicker">Squads</span>
                        <div className="tm-panel-chips">
                          {p.squads.map((s) => (
                            <button key={s.id} className="team-chip" style={{ borderColor: map.squads.find((x) => x.id === s.id)?.color }}
                              onClick={() => setSelected({ squad: s.id })}>{s.name}</button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </aside>
              )}
            </section>

            <div className="tm-legend">
              {map.squads.map((s) => (
                <button key={s.id} className={`tm-legend-item${selected?.squad === s.id ? ' on' : ''}`} onClick={() => setSelected((x) => (x?.squad === s.id ? null : { squad: s.id }))}
                  onMouseEnter={() => setHover({ squad: s.id })} onMouseLeave={() => setHover(null)}>
                  <i style={{ background: s.color }} />{s.name}<span>{s.members.length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}


export { SQUAD_COLORS };
