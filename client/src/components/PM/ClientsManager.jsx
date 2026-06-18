import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { api } from '../../utils/api.js';
import { TIERS, TIER_LABEL } from '../../utils/constants.js';

// Manage clients: set tier (drives monthly generation + reports), rate, status.
export default function ClientsManager({ clients, onClose, onSaved }) {
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  return (
    <Modal
      title="Clients"
      wide
      onClose={onClose}
      footer={<button className="btn btn-primary" onClick={() => setCreating(true)}>+ New Client</button>}
    >
      {!clients.length && <div className="empty">No clients yet. Add your first.</div>}
      {clients.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Industry</th><th>Tier</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">{c.industry || '—'}</td>
                <td>{c.tier ? <span className="badge">{TIER_LABEL[c.tier]}</span> : <span className="dim">not set</span>}</td>
                <td className="muted">{c.status}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => setEditing(c)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(creating || editing) && (
        <ClientForm
          client={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { onSaved(); }}
        />
      )}
    </Modal>
  );
}

function ClientForm({ client, onClose, onSaved }) {
  const editing = !!client;
  const [form, setForm] = useState({
    name: client?.name || '',
    industry: client?.industry || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.contact_email || '',
    contact_phone: client?.contact_phone || '',
    tier: client?.tier || '',
    monthly_rate: client?.monthly_rate || '',
    start_date: client?.start_date || '',
    commitment_end_date: client?.commitment_end_date || '',
    status: client?.status || 'active',
    notes: client?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Auto-fill the standard rate when a tier is chosen and rate is empty.
  const onTier = (e) => {
    const tier = e.target.value;
    const def = TIERS.find((t) => t.key === tier);
    setForm((f) => ({ ...f, tier, monthly_rate: f.monthly_rate || (def ? def.rate : '') }));
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (editing) await api.patch(`/clients/${client.id}`, form);
      else await api.post('/clients', form);
      onSaved();
      onClose();
    } catch (e) {
      alert(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${client.name}` : 'New Client'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <div className="field"><label>Name</label><input className="input" value={form.name} onChange={set('name')} autoFocus /></div>
      <div className="field"><label>Industry</label><input className="input" value={form.industry} onChange={set('industry')} /></div>
      <div className="row gap-3">
        <div className="field grow"><label>Tier</label>
          <select className="select" value={form.tier} onChange={onTier}>
            <option value="">— Not set —</option>
            {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label} (${t.rate}/mo)</option>)}
          </select>
        </div>
        <div className="field grow"><label>Monthly rate ($)</label><input className="input" type="number" value={form.monthly_rate} onChange={set('monthly_rate')} /></div>
      </div>
      <div className="row gap-3">
        <div className="field grow"><label>Status</label>
          <select className="select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div className="field grow"><label>Start date</label><input className="input" type="date" value={form.start_date || ''} onChange={set('start_date')} /></div>
      </div>
      <div className="row gap-3">
        <div className="field grow"><label>Contact name</label><input className="input" value={form.contact_name} onChange={set('contact_name')} /></div>
        <div className="field grow"><label>Contact email</label><input className="input" value={form.contact_email} onChange={set('contact_email')} /></div>
      </div>
      <div className="row gap-3">
        <div className="field grow"><label>Contact phone</label><input className="input" value={form.contact_phone} onChange={set('contact_phone')} /></div>
        <div className="field grow"><label>90-day commitment end</label><input className="input" type="date" value={form.commitment_end_date || ''} onChange={set('commitment_end_date')} /></div>
      </div>
      <div className="field"><label>Notes</label><textarea className="textarea" value={form.notes} onChange={set('notes')} /></div>
    </Modal>
  );
}
