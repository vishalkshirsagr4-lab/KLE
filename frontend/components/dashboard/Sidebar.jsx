'use client';

import Icon from '../ui/Icon';

const ICONS = { overview: 'grid', teams: 'users', submissions: 'arrowUpRight', announcements: 'mail', notifications: 'bell', analytics: 'spark', settings: 'plus' };

export default function Sidebar({ active, onChange, role = 'admin', open = true, onClose }) {
  const items = role === 'admin' ? [['overview', 'Overview'], ['teams', 'Teams'], ['submissions', 'Submissions'], ['announcements', 'Announcements'], ['analytics', 'Analytics'], ['settings', 'Settings']] : [['overview', 'Dashboard'], ['teams', 'My Team'], ['submissions', 'Submission'], ['notifications', 'Notifications'], ['analytics', 'Timeline'], ['settings', 'Profile & settings']];
  return (
    <aside id="workspace-sidebar" className={`workspace-sidebar ${open ? 'is-open' : ''}`} aria-label="Workspace navigation">
      <div className="workspace-sidebar-header">
        <a href="/" className="workspace-brand">
          <span className="brand-mark" aria-hidden="true"><span>K</span><i /></span>
          <span><strong>KLE / 2K26</strong><small>{role === 'admin' ? 'OPERATIONS' : 'PARTICIPANT ARENA'}</small></span>
        </a>
        <button type="button" className="workspace-sidebar-close" aria-label="Close navigation" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <nav aria-label="Workspace navigation">
        {items.map(([id, label]) => (
          <button key={id} type="button" className={active === id ? 'is-active' : ''} onClick={() => onChange(id)}>
            <Icon name={ICONS[id]} size={17} />
            <span>{label}</span>
            {active === id && <i />}
          </button>
        ))}
      </nav>
      <div className="workspace-sidebar-foot">
        <span className="sidebar-status"><i /> System online</span>
        <a href="/">Back to public site <Icon name="arrowUpRight" size={14} /></a>
      </div>
    </aside>
  );
}
