import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { api } from '../../utils/api.js';

// Renders a report's HTML in a sandboxed iframe with approve/send actions.
export default function ReportPreview({ reportId, onClose, onChange }) {
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setReport(await api.get(`/reports/${reportId}`));
  useEffect(() => {
    load();
  }, [reportId]);

  const act = async (path) => {
    setBusy(true);
    try {
      await api.post(`/reports/${reportId}/${path}`);
      await load();
      onChange?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={report ? `${report.clients?.name || 'Report'} — ${report.month_cycle}` : 'Report'}
      wide
      onClose={onClose}
      footer={
        report && (
          <>
            <span className="badge" style={{ marginRight: 'auto' }}>{String(report.status).replace(/_/g, ' ')}</span>
            <button className="btn" onClick={onClose}>Close</button>
            {report.status === 'pending_approval' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => act('approve')}>
                Approve
              </button>
            )}
            {report.status === 'approved' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => act('send')}>
                Mark Sent
              </button>
            )}
          </>
        )
      }
    >
      {!report && <div className="spinner">Loading…</div>}
      {report && (
        <iframe
          title="report"
          sandbox=""
          srcDoc={report.html_content || '<p>No content.</p>'}
          style={{ width: '100%', height: '60vh', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }}
        />
      )}
    </Modal>
  );
}
