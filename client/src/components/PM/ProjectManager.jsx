import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api.js';
import TaskModal from './TaskModal.jsx';
import ClientsManager from './ClientsManager.jsx';
import TodaysFocus from './views/TodaysFocus.jsx';
import AllTasks from './views/AllTasks.jsx';
import ByClient from './views/ByClient.jsx';
import ByStage from './views/ByStage.jsx';
import ByService from './views/ByService.jsx';
import ByPriority from './views/ByPriority.jsx';
import ReportQueue from './views/ReportQueue.jsx';
import OneOffProjects from './views/OneOffProjects.jsx';
import { todayCycle } from '../../utils/constants.js';

const VIEWS = [
  { key: 'focus', label: "Today's Focus" },
  { key: 'all', label: 'All Tasks' },
  { key: 'client', label: 'By Client' },
  { key: 'stage', label: 'By Stage' },
  { key: 'service', label: 'By Service' },
  { key: 'priority', label: 'By Priority' },
  { key: 'reports', label: 'Report Queue' },
  { key: 'projects', label: 'One-off Projects' },
];

export default function ProjectManager({ onDataChange }) {
  const [view, setView] = useState('focus');
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // task being edited
  const [creating, setCreating] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([api.get('/clients'), api.get('/deliverables')]);
      setClients(c);
      setTasks(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(() => {
    load();
    onDataChange?.();
  }, [load, onDataChange]);

  const generateMonth = async () => {
    if (!confirm(`Generate this month's (${todayCycle()}) checklist for all active clients?`)) return;
    setGenBusy(true);
    try {
      const res = await api.post('/monthly/generate', { month_cycle: todayCycle() });
      const made = res.results.reduce((n, r) => n + (r.created || 0), 0);
      alert(made ? `Generated ${made} tasks.` : 'Nothing new — clients already have this cycle (or no tier set).');
      reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setGenBusy(false);
    }
  };

  const viewProps = { clients, tasks, loading, onEdit: setEditing, onChange: reload };

  return (
    <div>
      <div className="module-head">
        <h1>
          <span className="accent-bar" />
          Project Manager
        </h1>
        <div className="row gap-2">
          <button className="btn btn-sm" onClick={() => setClientsOpen(true)}>Clients</button>
          <button className="btn btn-sm" onClick={generateMonth} disabled={genBusy}>
            {genBusy ? 'Generating…' : 'Generate Month'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
            + New Task
          </button>
        </div>
      </div>

      <div className="tabs">
        {VIEWS.map((v) => (
          <div
            key={v.key}
            className={`tab ${view === v.key ? 'active' : ''}`}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </div>
        ))}
      </div>

      {loading && <div className="spinner">Loading the board…</div>}

      {!loading && (
        <>
          {view === 'focus' && <TodaysFocus {...viewProps} />}
          {view === 'all' && <AllTasks {...viewProps} />}
          {view === 'client' && <ByClient {...viewProps} />}
          {view === 'stage' && <ByStage {...viewProps} />}
          {view === 'service' && <ByService {...viewProps} />}
          {view === 'priority' && <ByPriority {...viewProps} />}
          {view === 'reports' && <ReportQueue clients={clients} onChange={reload} />}
          {view === 'projects' && <OneOffProjects clients={clients} />}
        </>
      )}

      {clientsOpen && (
        <ClientsManager
          clients={clients}
          onClose={() => setClientsOpen(false)}
          onSaved={reload}
        />
      )}
      {creating && (
        <TaskModal
          clients={clients}
          onClose={() => setCreating(false)}
          onSaved={reload}
        />
      )}
      {editing && (
        <TaskModal
          task={editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
