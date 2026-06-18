import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth.jsx';
import { api } from './utils/api.js';
import Login from './components/Auth/Login.jsx';
import Sidebar from './components/Shell/Sidebar.jsx';
import TopBar from './components/Shell/TopBar.jsx';
import ProjectManager from './components/PM/ProjectManager.jsx';
import ApprovalQueue from './components/ACE/ApprovalQueue.jsx';
import AceChat from './components/ACE/AceChat.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('pm');
  const [aceOpen, setAceOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);

  const refreshApprovals = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await api.get('/approvals/count');
      setApprovalCount(count);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshApprovals();
    const t = setInterval(refreshApprovals, 30000);
    return () => clearInterval(t);
  }, [user, refreshApprovals]);

  if (loading) {
    return <div className="login-wrap"><div className="muted">Booting BOLDER OS…</div></div>;
  }
  if (!user) return <Login />;

  return (
    <div className="shell">
      <Sidebar active={activeModule} onSelect={setActiveModule} />
      <TopBar
        approvalCount={approvalCount}
        onOpenAce={() => setAceOpen(true)}
        onOpenApprovals={() => setApprovalsOpen(true)}
      />
      <main className="main">
        {activeModule === 'pm' && <ProjectManager onDataChange={refreshApprovals} />}
      </main>

      {approvalsOpen && (
        <ApprovalQueue
          onClose={() => setApprovalsOpen(false)}
          onResolved={refreshApprovals}
        />
      )}
      {aceOpen && <AceChat onClose={() => setAceOpen(false)} />}
    </div>
  );
}
