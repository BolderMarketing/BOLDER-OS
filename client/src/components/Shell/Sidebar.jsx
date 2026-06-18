import Logo from '../Logo.jsx';

// PM is the only active module in Phase 1. The rest show as locked / Coming Soon
// with their future accent colors, so the OS structure is visible from day one.
const MODULES = [
  { key: 'pm', label: 'Project Manager', color: 'var(--pm)', active: true },
  { key: 'crm', label: 'CRM', color: 'var(--crm)', active: false },
  { key: 'proposals', label: 'Proposals', color: 'var(--proposals)', active: false },
  { key: 'assistant', label: 'Personal Assistant', color: 'var(--assistant)', active: false },
  { key: 'seo', label: 'SEO/GEO & Web', color: 'var(--seo)', active: false },
];

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="sidebar">
      <Logo />
      <div className="nav-label">Modules</div>
      {MODULES.map((m) => (
        <div
          key={m.key}
          className={`nav-item ${m.active ? '' : 'locked'} ${active === m.key ? 'active' : ''}`}
          onClick={() => m.active && onSelect(m.key)}
        >
          <span className="nav-dot" style={{ background: m.color }} />
          <span>{m.label}</span>
          {m.active ? null : <span className="nav-soon">Soon 🔒</span>}
        </div>
      ))}
    </aside>
  );
}
