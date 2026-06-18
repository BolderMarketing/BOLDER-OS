import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { api } from '../../utils/api.js';
import { STAGES, PRIORITIES, SERVICES, todayCycle } from '../../utils/constants.js';

// Create or edit a deliverable. `task` present => edit mode.
export default function TaskModal({ task, clients, defaultClientId, onClose, onSaved }) {
  const editing = !!task;
  const [form, setForm] = useState({
    client_id: task?.client_id || defaultClientId || '',
    title: task?.title || '',
    service_type: task?.service_type || 'other',
    stage: task?.stage || 'not_started',
    priority: task?.priority || 'normal',
    due_date: task?.due_date || '',
    notes: task?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim()) return setError('Title is required.');
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, month_cycle: task?.month_cycle || todayCycle() };
      if (editing) {
        await api.patch(`/deliverables/${task.id}`, payload);
      } else {
        await api.post('/deliverables', payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this task?')) return;
    setBusy(true);
    try {
      await api.del(`/deliverables/${task.id}`);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit Task' : 'New Task'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button className="btn btn-danger" onClick={remove} disabled={busy} style={{ marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save' : 'Create'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Client</label>
        <select className="select" value={form.client_id} onChange={set('client_id')}>
          <option value="">— No client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Title</label>
        <input className="input" value={form.title} onChange={set('title')} autoFocus />
      </div>
      <div className="row gap-3">
        <div className="field grow">
          <label>Service</label>
          <select className="select" value={form.service_type} onChange={set('service_type')}>
            {SERVICES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label>Stage</label>
          <select className="select" value={form.stage} onChange={set('stage')}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="row gap-3">
        <div className="field grow">
          <label>Priority</label>
          <select className="select" value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label>Due date</label>
          <input className="input" type="date" value={form.due_date || ''} onChange={set('due_date')} />
        </div>
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea className="textarea" value={form.notes || ''} onChange={set('notes')} />
      </div>
      {error && <div className="login-error">{error}</div>}
    </Modal>
  );
}
