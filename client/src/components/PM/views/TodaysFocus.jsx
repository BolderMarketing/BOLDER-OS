import { useEffect, useState } from 'react';
import { api } from '../../../utils/api.js';
import TaskTable from '../TaskTable.jsx';
import { isOverdue } from '../../../utils/constants.js';

function weekEnd() {
  const d = new Date();
  const day = d.getDay();
  const diffToSun = 7 - ((day + 6) % 7) - 1; // days until Sunday
  d.setDate(d.getDate() + diffToSun);
  return d.toISOString().slice(0, 10);
}

// Critical + High tasks due this week across all clients (plus anything overdue).
export default function TodaysFocus({ tasks, onEdit, onChange }) {
  const [aceLine, setAceLine] = useState(null);
  const end = weekEnd();

  useEffect(() => {
    let alive = true;
    api
      .get('/ace/focus')
      .then((d) => alive && setAceLine(d.summary))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const open = tasks.filter((t) => t.stage !== 'done');
  const focus = open
    .filter((t) => ['critical', 'high'].includes(t.priority))
    .filter((t) => isOverdue(t) || !t.due_date || t.due_date <= end);

  const overdue = open.filter(isOverdue);
  const critical = open.filter((t) => t.priority === 'critical');
  const dueThisWeek = open.filter((t) => t.due_date && t.due_date <= end && !isOverdue(t));

  // Sort: priority (critical first) -> due date -> .
  const rank = { critical: 0, high: 1, normal: 2, low: 3 };
  focus.sort((a, b) => rank[a.priority] - rank[b.priority] || (a.due_date || '9999').localeCompare(b.due_date || '9999'));

  return (
    <div>
      <div className="focus-banner">
        {aceLine || `You've got ${critical.length} critical and ${overdue.length} overdue open. Knock out the top of the list.`}
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="num" style={{ color: 'var(--critical)' }}>{overdue.length}</div>
          <div className="lbl">Overdue</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--critical)' }}>{critical.length}</div>
          <div className="lbl">Critical open</div>
        </div>
        <div className="stat">
          <div className="num">{dueThisWeek.length}</div>
          <div className="lbl">Due this week</div>
        </div>
        <div className="stat">
          <div className="num">{open.length}</div>
          <div className="lbl">Total open</div>
        </div>
      </div>

      <div className="section-title">Needs you this week</div>
      <TaskTable tasks={focus} onEdit={onEdit} onChange={onChange} />
    </div>
  );
}
