import { useEffect, useState } from 'react';
import { api } from '../../../utils/api.js';
import Modal from '../../ui/Modal.jsx';
import { StageBadge } from '../../ui/Badge.jsx';
import { STAGES, nextStage, isOverdue } from '../../../utils/constants.js';

// Non-retainer work tracked separately from the monthly cycle.
export default function OneOffProjects({ clients }) {
  const [projects, setProjects] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => setProjects(await api.get('/projects'));
  useEffect(() => {
    load();
  }, []);

  const advance = async (e, p) => {
    e.stopPropagation();
    const ns = nextStage(p.stage);
    if (ns === p.stage) return;
    await api.patch(`/projects/${p.id}`, { stage: ns });
    load();
  };

  return (
    <div>
      <div className="toolbar between">
        <span className="muted">{projects?.length || 0} projects</span>
        <button className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>+ New Project</button>
      </div>

      {!projects && <div className="spinner">Loading…</div>}
      {projects && !projects.length && <div className="empty">No one-off projects yet.</div>}
      {projects && projects.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Project</th><th>Client</th><th>Stage</th><th>Due</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className={isOverdue(p) ? 'overdue' : ''} onClick={() => setEditing(p)} style={{ cursor: 'pointer' }}>
                <td>{p.name}</td>
                <td className="muted">{p.clients?.name || '—'}</td>
                <td><StageBadge stage={p.stage} onClick={(e) => advance(e, p)} /></td>
                <td className="mono muted">{p.due_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(creating || editing) && (
        <ProjectModal
          project={editing}
          clients={clients}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

function ProjectModal({ project, clients, onClose, onSaved }) {
  const editing = !!project;
  const [form, setForm] = useState({
    client_id: project?.client_id || '',
    name: project?.name || '',
    description: project?.description || '',
    stage: project?.stage || 'not_started',
    due_date: project?.due_date || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (editing) await api.patch(`/projects/${project.id}`, form);
      else await api.post('/projects', form);
      onSaved();
      onClose();
    } catch (e) {
      alert(e.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this project?')) return;
    await api.del(`/projects/${project.id}`);
    onSaved();
    onClose();
  };

  return (
    <Modal
      title={editing ? 'Edit Project' : 'New Project'}
      onClose={onClose}
      footer={
        <>
          {editing && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={remove}>Delete</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <div className="field">
        <label>Name</label>
        <input className="input" value={form.name} onChange={set('name')} autoFocus />
      </div>
      <div className="field">
        <label>Client</label>
        <select className="select" value={form.client_id} onChange={set('client_id')}>
          <option value="">— No client —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="row gap-3">
        <div className="field grow">
          <label>Stage</label>
          <select className="select" value={form.stage} onChange={set('stage')}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label>Due date</label>
          <input className="input" type="date" value={form.due_date || ''} onChange={set('due_date')} />
        </div>
      </div>
      <div className="field">
        <label>Description</label>
        <textarea className="textarea" value={form.description || ''} onChange={set('description')} />
      </div>
    </Modal>
  );
}
