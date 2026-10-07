import Icon from '../ui/Icon';

export default function AdminStatCard({ label, value, detail, icon = 'grid', accent = '' }) {
  return <article className={`admin-stat-card ${accent}`}><span className="admin-stat-icon"><Icon name={icon} size={17} /></span><p>{value}</p><h3>{label}</h3>{detail && <small>{detail}</small>}</article>;
}
