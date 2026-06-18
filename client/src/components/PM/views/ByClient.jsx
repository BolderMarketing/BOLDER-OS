import { useState } from 'react';
import TaskTable from '../TaskTable.jsx';
import { TIER_LABEL, todayCycle } from '../../../utils/constants.js';

// Client selector -> that client's full current-month task list.
export default function ByClient({ tasks, clients, onEdit, onChange }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const cycle = todayCycle();
  const client = clients.find((c) => c.id === clientId);

  const list = tasks.filter((t) => t.client_id === clientId && t.month_cycle === cycle);

  return (
    <div>
      <div className="toolbar">
        <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select a client…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {client && (
          <span className="badge">
            {client.tier ? TIER_LABEL[client.tier] : 'No tier'} · {cycle}
          </span>
        )}
        <span className="muted">{list.length} tasks this cycle</span>
      </div>
      {!clientId ? (
        <div className="empty">Pick a client to see their month.</div>
      ) : (
        <TaskTable tasks={list} onEdit={onEdit} onChange={onChange} showClient={false} />
      )}
    </div>
  );
}
