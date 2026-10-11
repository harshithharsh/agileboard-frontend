import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import Modal, { Field } from './Modal.jsx';
import {
  ClearIcon, UsersIcon, ShieldIcon, BoxIcon, PlusIcon, EditIcon, TrashIcon, SearchIcon,
} from '../Icons.jsx';

const PERMISSION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', admin: 'Admin' };

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  return <span className={`status ${status === 'active' ? 'status-on_track' : 'status-at_risk'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
const AVATAR_COLORS = ['#1E3A8A', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1'];
const avatarColor = (name = '') => AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button className="action-btn" onClick={onEdit} title="Edit" aria-label="Edit"><EditIcon /></button>
      <button className="action-btn action-danger" onClick={onDelete} title="Delete" aria-label="Delete"><TrashIcon /></button>
    </div>
  );
}

function AdminCard({ icon, tone, title, subtitle, addLabel, onAdd, children, count, wide = false }) {
  return (
    <section className={`admin-card${wide ? ' admin-card-wide' : ''}`}>
      <div className="admin-card-head">
        <span className={`admin-card-icon tone-${tone}`}>{icon}</span>
        <div className="admin-card-titles">
          <h2>{title}{count !== undefined && <span className="admin-count">{count}</span>}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="btn-primary-solid" onClick={onAdd}><PlusIcon /> {addLabel}</button>
      </div>
      <div className="admin-table-wrap">{children}</div>
    </section>
  );
}

const Empty = ({ cols, text }) => (
  <tr><td colSpan={cols} className="admin-empty">{text}</td></tr>
);

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function UserForm({ item, roles, projects, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({
    name: item?.name ?? '', email: item?.email ?? '', roleId: item?.role_id ?? roles.find((r) => r.name === 'Viewer')?.id ?? '',
    projectIds: item?.project_ids ?? [], status: item?.status ?? 'active',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggleProject = (id) => setF((s) => ({ ...s, projectIds: s.projectIds.includes(id) ? s.projectIds.filter((p) => p !== id) : [...s.projectIds, id] }));
  return (
    <Modal title={item ? 'Edit User' : 'Add User'} onClose={onCancel}
      footer={<FormButtons onCancel={onCancel} onSave={() => onSave(f)} saving={saving} />}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <Field label="Name" hint={item?.from_jira ? 'Synced from Jira; Jira updates the name.' : undefined}>
          <input value={f.name} onChange={set('name')} disabled={item?.from_jira} autoFocus={!item?.from_jira} />
        </Field>
        <Field label="Email"><input type="email" value={f.email ?? ''} onChange={set('email')} placeholder="name@company.com" /></Field>
        <Field label="Role">
          <select value={f.roleId ?? ''} onChange={set('roleId')}>
            <option value="">No role</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </Field>
      </div>
      <Field label="Projects">
        <div className="check-group">
          {projects.map((p) => (
            <label key={p.id} className="check"><input type="checkbox" checked={f.projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} /> {p.name}</label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function RoleForm({ item, permissions, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({ name: item?.name ?? '', description: item?.description ?? '', permissions: item?.permissions ?? ['view'] });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (p) => setF((s) => ({ ...s, permissions: s.permissions.includes(p) ? s.permissions.filter((x) => x !== p) : [...s.permissions, p] }));
  return (
    <Modal title={item ? 'Edit Role' : 'Add Role'} onClose={onCancel}
      footer={<FormButtons onCancel={onCancel} onSave={() => onSave(f)} saving={saving} />}>
      {error && <p className="form-error">{error}</p>}
      <Field label="Role name"><input value={f.name} onChange={set('name')} autoFocus /></Field>
      <Field label="Description"><input value={f.description ?? ''} onChange={set('description')} /></Field>
      <Field label="Permissions">
        <div className="check-group">
          {permissions.map((p) => (
            <label key={p} className="check"><input type="checkbox" checked={f.permissions.includes(p)} onChange={() => toggle(p)} /> {PERMISSION_LABELS[p] ?? p}</label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function ProjectForm({ item, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({
    key: item?.key ?? '', name: item?.name ?? '', description: item?.description ?? '', status: item?.status ?? 'active',
    teams: (item?.teams ?? []).map((t) => ({ ...t, jiraBoardId: t.jiraBoardId ?? '' })),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setTeam = (i, k) => (e) => setF((s) => ({ ...s, teams: s.teams.map((t, n) => (n === i ? { ...t, [k]: e.target.value } : t)) }));
  const addTeam = () => setF((s) => ({ ...s, teams: [...s.teams, { name: '', jiraBoardId: '', wipLimit: 5 }] }));
  const removeTeam = (i) => setF((s) => ({ ...s, teams: s.teams.filter((_, n) => n !== i) }));
  return (
    <Modal title={item ? 'Edit Project' : 'Add Project'} width={600} onClose={onCancel}
      footer={<FormButtons onCancel={onCancel} onSave={() => onSave(f)} saving={saving} />}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <Field label="Project name"><input value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Key" hint="Jira project key, e.g. FIBI"><input value={f.key} onChange={set('key')} /></Field>
      </div>
      <Field label="Description"><input value={f.description ?? ''} onChange={set('description')} /></Field>
      <Field label="Status" hint="Inactive projects are hidden from the dashboard and not synced.">
        <select value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </Field>
      <div className="field">
        <span className="field-label">Teams</span>
        <span className="field-hint">Each team is synced from its Jira board. Find the board id in the board's URL (…/boards/<b>524</b>).</span>
        <div className="team-rows">
          {f.teams.map((t, i) => (
            <div className="team-row" key={t.id ?? `new-${i}`}>
              <input value={t.name} onChange={setTeam(i, 'name')} placeholder="Team name" aria-label="Team name" />
              <input value={t.jiraBoardId} onChange={setTeam(i, 'jiraBoardId')} placeholder="Jira board id" inputMode="numeric" aria-label="Jira board id" />
              <input value={t.wipLimit} onChange={setTeam(i, 'wipLimit')} placeholder="WIP" inputMode="numeric" aria-label="WIP limit" title="WIP limit" />
              <button type="button" className="action-btn action-danger" onClick={() => removeTeam(i)} disabled={t.sprints > 0}
                title={t.sprints > 0 ? 'This team has synced sprints and can’t be removed' : 'Remove team'} aria-label="Remove team"><TrashIcon /></button>
            </div>
          ))}
          <button type="button" className="btn-link" onClick={addTeam}><PlusIcon /> Add team</button>
        </div>
      </div>
    </Modal>
  );
}

function FormButtons({ onCancel, onSave, saving, label = 'Save' }) {
  return (
    <>
      <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="btn-primary-solid" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

export default function AdminOverlay({ onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // { kind, item }
  const [deleting, setDeleting] = useState(null); // { kind, item, label }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => api.admin.load().then(setData).catch((e) => setLoadError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  // Lock page scroll while open; Escape closes (unless a dialog is open)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && !editing && !deleting && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, editing, deleting]);

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const save = async (form) => {
    const { kind, item } = editing;
    setSaving(true);
    setFormError(null);
    try {
      if (item) await api.admin.update(kind, item.id, form);
      else await api.admin.create(kind, form);
      setEditing(null);
      await load();
      onChanged?.();
      flash(item ? 'Changes saved' : 'Added');
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await api.admin.remove(deleting.kind, deleting.item.id);
      setDeleting(null);
      await load();
      onChanged?.();
      flash('Deleted');
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (kind, item = null) => { setFormError(null); setEditing({ kind, item }); };
  const openDelete = (kind, item, label) => { setFormError(null); setDeleting({ kind, item, label }); };

  // Search across every table
  const q = search.trim().toLowerCase();
  const match = (...values) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
  const view = useMemo(() => {
    if (!data) return null;
    return {
      users: data.users.filter((u) => match(u.name, u.email, u.role, u.projects.join(' '), u.status)),
      roles: data.roles.filter((r) => match(r.name, r.description, r.permissions.join(' '))),
      projects: data.projects.filter((p) => match(p.name, p.key, p.description, p.teams.map((t) => t.name).join(' '), p.status)),
    };
  }, [data, q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Admin">
      <main className="admin-main">
        <div className="admin-top">
          <div>
            <h1>Admin</h1>
            <p>Manage users, roles and projects.</p>
          </div>
          <div className="admin-top-actions">
            <label className="admin-search">
              <SearchIcon />
              <input type="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search admin" />
            </label>
            <button className="icon-btn" onClick={onClose} title="Back to dashboard (Esc)" aria-label="Close admin"><ClearIcon /></button>
          </div>
        </div>

        <p className="admin-notice">There is no sign-in yet, so anyone who can open AgileMetrix can change these settings, and roles are not enforced.</p>

        {loadError && <div className="card error">Could not load admin data: {loadError}</div>}
        {!view && !loadError && <div className="card empty">Loading…</div>}

        {view && (
          <div className="admin-grid">
            <AdminCard icon={<UsersIcon />} tone="purple" title="Users & Role Assignment" subtitle="Add users and assign roles across projects."
              addLabel="Add User" onAdd={() => openEdit('users')} count={view.users.length} wide>
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Projects</th><th>Status</th><th className="col-actions">Actions</th></tr></thead>
                <tbody>
                  {view.users.map((u) => (
                    <tr key={u.id}>
                      <td><span className="person"><span className="avatar" style={{ background: avatarColor(u.name) }}>{initials(u.name)}</span><b>{u.name}</b></span></td>
                      <td className="muted email">{u.email || '—'}</td>
                      <td>{u.role || <span className="muted">No role</span>}</td>
                      <td>{u.projects.join(', ') || <span className="muted">—</span>}</td>
                      <td><StatusBadge status={u.status} /></td>
                      <td><RowActions onEdit={() => openEdit('users', u)} onDelete={() => openDelete('users', u, u.name)} /></td>
                    </tr>
                  ))}
                  {!view.users.length && <Empty cols={6} text="No matching users" />}
                </tbody>
              </table>
            </AdminCard>

            <AdminCard icon={<ShieldIcon />} tone="green" title="Role Configuration" subtitle="Create and configure roles with appropriate permissions."
              addLabel="Add Role" onAdd={() => openEdit('roles')}>
              <table className="admin-table">
                <thead><tr><th>Role Name</th><th>Description</th><th>Key Permissions</th><th className="num">Users</th><th className="col-actions">Actions</th></tr></thead>
                <tbody>
                  {view.roles.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.name}</b></td>
                      <td className="muted">{r.description || '—'}</td>
                      <td>{r.permissions.length === data.permissions.length ? 'All permissions' : r.permissions.map((p) => PERMISSION_LABELS[p]).join(', ')}</td>
                      <td className="num link-num">
                        <button className="btn-link" onClick={() => setSearch(r.name)} title={`Show users with the ${r.name} role`}>{r.users}</button>
                      </td>
                      <td><RowActions onEdit={() => openEdit('roles', r)} onDelete={() => openDelete('roles', r, r.name)} /></td>
                    </tr>
                  ))}
                  {!view.roles.length && <Empty cols={5} text="No matching roles" />}
                </tbody>
              </table>
            </AdminCard>

            <AdminCard icon={<BoxIcon />} tone="orange" title="Project Configuration" subtitle="Add and manage projects. Assign teams and their Jira boards."
              addLabel="Add Project" onAdd={() => openEdit('projects')}>
              <table className="admin-table">
                <thead><tr><th>Project Name</th><th>Key</th><th>Teams (Jira board)</th><th className="num">Members</th><th>Status</th><th className="col-actions">Actions</th></tr></thead>
                <tbody>
                  {view.projects.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b>{p.description && <div className="cell-sub">{p.description}</div>}</td>
                      <td className="mono">{p.key}</td>
                      <td>{p.teams.map((t) => `${t.name}${t.jiraBoardId ? ` (#${t.jiraBoardId})` : ''}`).join(', ') || <span className="muted">No teams</span>}</td>
                      <td className="num">{p.members}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td><RowActions onEdit={() => openEdit('projects', p)} onDelete={() => openDelete('projects', p, p.name)} /></td>
                    </tr>
                  ))}
                  {!view.projects.length && <Empty cols={6} text="No matching projects" />}
                </tbody>
              </table>
            </AdminCard>
          </div>
        )}
      </main>

      {editing?.kind === 'users' && <UserForm item={editing.item} roles={data.roles} projects={data.projects} onSave={save} onCancel={() => setEditing(null)} saving={saving} error={formError} />}
      {editing?.kind === 'roles' && <RoleForm item={editing.item} permissions={data.permissions} onSave={save} onCancel={() => setEditing(null)} saving={saving} error={formError} />}
      {editing?.kind === 'projects' && <ProjectForm item={editing.item} onSave={save} onCancel={() => setEditing(null)} saving={saving} error={formError} />}

      {deleting && (
        <Modal title="Confirm delete" width={420} onClose={() => setDeleting(null)}
          footer={(
            <>
              <button className="btn" onClick={() => setDeleting(null)} disabled={saving}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
            </>
          )}>
          {formError ? <p className="form-error">{formError}</p> : <p>Delete <b>{deleting.label}</b>? This can’t be undone.</p>}
        </Modal>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
