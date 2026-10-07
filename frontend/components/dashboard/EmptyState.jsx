import Icon from '../ui/Icon';

export default function EmptyState({ title, message, icon = 'spark' }) {
  return <div className="workspace-empty"><span><Icon name={icon} size={18} /></span><h3>{title}</h3><p>{message}</p></div>;
}
