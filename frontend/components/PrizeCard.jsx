import Icon from './ui/Icon';

export default function PrizeCard({ rank, title, featured = false, note }) {
  return (
    <article className={`prize-card ${featured ? 'is-featured' : ''}`}>
      <div className="prize-rank"><span>{rank}</span><Icon name="spark" size={16} /></div>
      <div><p className="prize-kicker">{featured ? 'The headline achievement' : 'Recognition tier'}</p><h3>{title}</h3><p className="prize-note">{note}</p></div>
      <span className="prize-line" aria-hidden="true" />
    </article>
  );
}
