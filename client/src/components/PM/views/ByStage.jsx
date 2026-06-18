import { PriorityBadge } from '../../ui/Badge.jsx';
import { STAGES, isOverdue } from '../../../utils/constants.js';
import { api } from '../../../utils/api.js';
import { nextStage } from '../../../utils/constants.js';

// Kanban board: Not Started -> Research -> Building -> Review -> Submitted -> Done.
export default function ByStage({ tasks, onEdit, onChange }) {
  const advance = async (e, t) => {
    e.stopPropagation();
    const ns = nextStage(t.stage);
    if (ns === t.stage) return;
    try {
      await api.patch(`/deliverables/${t.id}`, { stage: ns });
      onChange?.();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="kanban">
      {STAGES.map((stage) => {
        const col = tasks.filter((t) => t.stage === stage.key);
        return (
          <div className="kanban-col" key={stage.key}>
            <h3>
              <span>{stage.label}</span>
              <span className="dim">{col.length}</span>
            </h3>
            <div className="kanban-cards">
              {col.map((t) => (
                <div
                  key={t.id}
                  className={`task-card ${isOverdue(t) ? 'overdue' : ''}`}
                  onClick={() => onEdit(t)}
                >
                  <div className="t-title">{t.title}</div>
                  <div className="t-meta">
                    <PriorityBadge priority={t.priority} />
                    <span className="badge">{t.clients?.name || '—'}</span>
                    {t.due_date && (
                      <span className="dim mono" style={{ fontSize: 11 }}>
                        {t.due_date}
                      </span>
                    )}
                  </div>
                  {stage.key !== 'done' && (
                    <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={(e) => advance(e, t)}>
                      → Advance
                    </button>
                  )}
                </div>
              ))}
              {!col.length && <div className="dim" style={{ fontSize: 12, padding: 8 }}>Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
