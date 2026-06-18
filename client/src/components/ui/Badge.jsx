import { PRIORITY_LABEL, STAGE_LABEL, SERVICE_LABEL } from '../../utils/constants.js';

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge prio-${priority}`}>
      <span className="badge-dot" style={{ background: 'currentColor' }} />
      {PRIORITY_LABEL[priority] || priority}
    </span>
  );
}

export function StageBadge({ stage, onClick }) {
  return (
    <span
      className={`badge ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={onClick ? 'Click to advance stage' : undefined}
    >
      {STAGE_LABEL[stage] || stage}
    </span>
  );
}

export function ServiceBadge({ service }) {
  return <span className="badge">{SERVICE_LABEL[service] || service}</span>;
}

export function StatusBadge({ status }) {
  return <span className="badge">{String(status || '').replace(/_/g, ' ')}</span>;
}
