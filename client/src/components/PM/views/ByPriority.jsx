import TaskTable from '../TaskTable.jsx';
import { PRIORITIES } from '../../../utils/constants.js';

// Grouped list: Critical -> High -> Normal -> Low.
export default function ByPriority({ tasks, onEdit, onChange }) {
  return (
    <div className="col gap-4">
      {PRIORITIES.map((p) => {
        const list = tasks.filter((t) => t.priority === p.key && t.stage !== 'done');
        if (!list.length) return null;
        return (
          <div key={p.key}>
            <div className="section-title" style={{ color: `var(--${p.key})` }}>
              {p.label} · {list.length}
            </div>
            <TaskTable tasks={list} onEdit={onEdit} onChange={onChange} />
          </div>
        );
      })}
    </div>
  );
}
