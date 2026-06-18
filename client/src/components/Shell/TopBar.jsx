import { useAuth } from '../../hooks/useAuth.jsx';

export default function TopBar({ approvalCount, onOpenAce, onOpenApprovals }) {
  const { logout } = useAuth();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="date mono">{today}</div>
      <div className="row gap-3">
        <div className="bell" onClick={onOpenApprovals} title="Approval queue">
          🔔
          {approvalCount > 0 && <span className="count">{approvalCount}</span>}
        </div>
        <div className="ace-pill" onClick={onOpenAce} title="Ask ACE">
          <span className="dot" />
          ACE
        </div>
        <button className="btn btn-sm btn-ghost" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
