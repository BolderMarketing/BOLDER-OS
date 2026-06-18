import { api } from '../../utils/api.js';
import { PriorityBadge, StageBadge, ServiceBadge } from '../ui/Badge.jsx';
import { nextStage, isOverdue } from '../../utils/constants.js';

// Reusable task table. Click a row to edit; click the stage badge to advance.
export default function TaskTable({ tasks, onEdit, onChange, showClient = true }) {
  const advance = async (e, task) => {
    e.stopPropagation();
    const ns = nextStage(task.stage);
    if (ns === task.stage) return;
    try {
      await api.patch(`/deliverables/${task.id}`, { stage: ns });
      onChange?.();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!tasks.length) return <div className="empty">No tasks here.</div>;

  return (
    <table className="table">
      <thead>
        <tr>
          {showClient && <th>Client</th>}
          <th>Task</th>
          <th>Service</th>
          <th>Stage</th>
          <th>Priority</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id} className={isOverdue(t) ? 'overdue' : ''} onClick={() => onEdit(t)} style={{ cursor: 'pointer' }}>
            {showClient && <td className="muted">{t.clients?.name || '—'}</td>}
            <td>{t.title}</td>
            <td><ServiceBadge service={t.service_type} /></td>
            <td><StageBadge stage={t.stage} onClick={(e) => advance(e, t)} /></td>
            <td><PriorityBadge priority={t.priority} /></td>
            <td className="mono muted">
              {t.due_date || '—'}
              {isOverdue(t) && <span style={{ color: 'var(--critical)' }}> · overdue</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
