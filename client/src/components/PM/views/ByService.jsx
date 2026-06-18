import { useState } from 'react';
import TaskTable from '../TaskTable.jsx';
import { SERVICES } from '../../../utils/constants.js';

// Filter tabs: SEO / GEO / Web / Content / Report / Reddit / Other.
export default function ByService({ tasks, onEdit, onChange }) {
  const [active, setActive] = useState('seo');
  const list = tasks.filter((t) => t.service_type === active);

  return (
    <div>
      <div className="filter-tabs">
        {SERVICES.map((s) => {
          const count = tasks.filter((t) => t.service_type === s.key).length;
          return (
            <div
              key={s.key}
              className={`filter-pill ${active === s.key ? 'active' : ''}`}
              onClick={() => setActive(s.key)}
            >
              {s.label} <span style={{ opacity: 0.6 }}>{count}</span>
            </div>
          );
        })}
      </div>
      <TaskTable tasks={list} onEdit={onEdit} onChange={onChange} />
    </div>
  );
}
