import { useEffect, useState } from 'react';
import { api } from '../../../utils/api.js';
import { TIER_LABEL, todayCycle } from '../../../utils/constants.js';
import ReportPreview from '../ReportPreview.jsx';

// All clients, report status + due dates for the current cycle.
export default function ReportQueue({ onChange }) {
  const [queue, setQueue] = useState(null);
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);
  const cycle = todayCycle();

  const load = async () => {
    const d = await api.get(`/reports/queue?month_cycle=${cycle}`);
    setQueue(d.queue);
  };
  useEffect(() => {
    load();
  }, []);

  const dueDate = (type) => `${cycle}-${type === 'biweekly' ? '28' : '25'}`;

  const draft = async (clientId) => {
    setBusy(clientId);
    try {
      const r = await api.post('/reports/draft', { client_id: clientId, month_cycle: cycle });
      await load();
      onChange?.();
      setPreview(r.id);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!queue) return <div className="spinner">Loading report queue…</div>;
  if (!queue.length) return <div className="empty">No active clients yet.</div>;

  return (
    <div>
      <table className="table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Tier</th>
            <th>Report</th>
            <th>Due</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {queue.map((q) => {
            const latest = q.reports[0];
            return (
              <tr key={q.client_id}>
                <td>{q.client_name}</td>
                <td className="muted">{q.tier ? TIER_LABEL[q.tier] : '—'}</td>
                <td>{q.report_type}</td>
                <td className="mono muted">{dueDate(q.report_type)}</td>
                <td><span className="badge">{String(q.status).replace(/_/g, ' ')}</span></td>
                <td style={{ textAlign: 'right' }}>
                  {latest ? (
                    <button className="btn btn-sm" onClick={() => setPreview(latest.id)}>Preview</button>
                  ) : (
                    <button className="btn btn-sm btn-primary" disabled={busy === q.client_id} onClick={() => draft(q.client_id)}>
                      {busy === q.client_id ? 'Drafting…' : 'Draft with ACE'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {preview && (
        <ReportPreview reportId={preview} onClose={() => setPreview(null)} onChange={() => { load(); onChange?.(); }} />
      )}
    </div>
  );
}
