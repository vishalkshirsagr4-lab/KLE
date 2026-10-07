export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${String(status || 'unknown').toLowerCase()}`}><i />{status || 'Unknown'}</span>;
}
