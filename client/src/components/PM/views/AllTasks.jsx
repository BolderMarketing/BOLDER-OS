import { useState } from 'react';
import TaskTable from '../TaskTable.jsx';
import { STAGES, PRIORITIES, SERVICES } from '../../../utils/constants.js';

// Every deliverable, filterable by client, stage, service, priority.
export default function AllTasks({ tasks, clients, onEdit, onChange }) {
  const [f, setF] = useState({ client_id: '', stage: '', service_type: '', priority: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const filtered = tasks.filter(
    (t) =>
      (!f.client_id || t.client_id === f.client_id) &&
      (!f.stage || t.stage === f.stage) &&
      (!f.service_type || t.service_type === f.service_type) &&
      (!f.priority || t.priority === f.priority)
  );

  return (
    <div>
      <div className="toolbar">
        <select className="select" value={f.client_id} onChange={set('client_id')}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={f.stage} onChange={set('stage')}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="select" value={f.service_type} onChange={set('service_type')}>
          <option value="">All services</option>
          {SERVICES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="select" value={f.priority} onChange={set('priority')}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <span className="muted">{filtered.length} tasks</span>
      </div>
      <TaskTable tasks={filtered} onEdit={onEdit} onChange={onChange} />
    </div>
  );
}
