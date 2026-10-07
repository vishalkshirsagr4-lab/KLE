'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ role, active, onChange, title, subtitle, name, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const change = (next) => { onChange(next); setMenuOpen(false); };
  return <div className={`workspace workspace-${role}`}><Sidebar role={role} active={active} onChange={change} open={menuOpen} /><div className="workspace-main"><Topbar title={title} subtitle={subtitle} name={name} onMenu={() => setMenuOpen((value) => !value)} onLogout={onLogout} /><main className="workspace-content">{children}</main></div>{menuOpen && <button className="workspace-scrim" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}</div>;
}
