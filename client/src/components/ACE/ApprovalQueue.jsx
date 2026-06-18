import { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import ReportPreview from '../PM/ReportPreview.jsx';

export default function ApprovalQueue({ onClose, onResolved }) {
  const [items, setItems] = useState(null);
  const [reasons, setReasons] = useState({});
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const data = await api.get('/approvals?status=pending');
    setItems(data);
  };
  useEffect(() => {
    load();
  }, []);

  const resolve = async (id, action) => {
    setBusy(id);
    try {
      if (action === 'approve') {
        await api.post(`/approvals/${id}/approve`);
      } else {
        await api.post(`/approvals/${id}/reject`, { rejection_reason: reasons[id] || '' });
      }
      await load();
      onResolved?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const label = (t) =>
    ({ report: 'Report draft', task_complete: 'Critical task — mark done?', email: 'Email', portal_update: 'Portal update' }[t] || t);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div className="row gap-2">
            <strong>Approval Queue</strong>
            {items && <span className="badge">{items.length} pending</span>}
          </div>
          <button className="x-btn" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          {!items && <div className="spinner">Loading…</div>}
          {items && items.length === 0 && (
            <div className="empty">Nothing waiting on you. Clear.</div>
          )}
          {items?.map((it) => (
            <div className="approval-item" key={it.id}>
              <div className="type">{label(it.type)}</div>
              <div style={{ margin: '6px 0' }}>
                {it.payload?.client_name && <strong>{it.payload.client_name}</strong>}
                {it.payload?.title && <span>{it.payload.title}</span>}
                {it.payload?.month_cycle && (
                  <span className="muted"> · {it.payload.month_cycle} · {it.payload.report_type}</span>
                )}
              </div>
              {it.type === 'report' && (
                <button
                  className="btn btn-sm"
                  style={{ marginBottom: 8 }}
                  onClick={() => setPreview(it.reference_id)}
                >
                  Preview report
                </button>
              )}
              <textarea
                className="textarea"
                placeholder="Rejection reason (logged so ACE learns)…"
                style={{ minHeight: 52, marginBottom: 8 }}
                value={reasons[it.id] || ''}
                onChange={(e) => setReasons((r) => ({ ...r, [it.id]: e.target.value }))}
              />
              <div className="row gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy === it.id}
                  onClick={() => resolve(it.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={busy === it.id}
                  onClick={() => resolve(it.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {preview && <ReportPreview reportId={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
