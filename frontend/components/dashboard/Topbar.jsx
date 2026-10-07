'use client';

import Icon from '../ui/Icon';

export default function Topbar({ title, subtitle, name, onMenu, onLogout }) {
  return <header className="workspace-topbar"><button className="workspace-menu" type="button" onClick={onMenu} aria-label="Toggle workspace navigation"><Icon name="menu" size={20} /></button><div><p className="workspace-kicker">KLE HACKATHON 2K26</p><h1>{title}</h1>{subtitle && <p className="workspace-subtitle">{subtitle}</p>}</div><div className="workspace-user"><span className="workspace-avatar">{String(name || 'A').slice(0, 2).toUpperCase()}</span><span className="workspace-user-copy"><strong>{name || 'Admin'}</strong><small>Signed in</small></span><button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out"><Icon name="arrowUpRight" size={16} /></button></div></header>;
}
