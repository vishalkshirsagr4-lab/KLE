'use client';

import Icon from './ui/Icon';

export default function StatCard({ icon, value, label, detail, live = false }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon"><Icon name={icon} size={17} /></span>
        {live && <span className="stat-live"><i /> live</span>}
      </div>
      <p className="stat-value" aria-live={live ? 'polite' : undefined}>{value}</p>
      <h3>{label}</h3>
      {detail && <p className="stat-detail">{detail}</p>}
    </article>
  );
}
