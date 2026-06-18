import { useState, useRef, useEffect } from 'react';
import { api } from '../../utils/api.js';

export default function AceChat({ onClose }) {
  const [msgs, setMsgs] = useState([
    { role: 'ace', text: "ACE here. Ask me anything — task summaries, draft an email, what needs you today." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight);
  }, [msgs]);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: prompt }]);
    setBusy(true);
    try {
      const { response } = await api.post('/ace/ask', { prompt });
      setMsgs((m) => [...m, { role: 'ace', text: response }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ace', text: `Couldn't reach the model: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div className="row gap-2">
            <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
            <strong>ACE</strong>
          </div>
          <button className="x-btn" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          <div className="ace-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`ace-msg ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="ace-msg ace muted">thinking…</div>}
          </div>
        </div>
        <div className="ace-input-row">
          <input
            className="input"
            placeholder="Ask ACE…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            autoFocus
          />
          <button className="btn btn-primary" onClick={send} disabled={busy}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
