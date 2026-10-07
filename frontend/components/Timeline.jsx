import SectionHeading from './SectionHeading';
import Icon from './ui/Icon';

const EVENTS = [
  { title: 'Hackathon Kickoff', time: '10 Oct 2026 · 11:00 AM', desc: 'Opening ceremony, rules briefing, and the clock starts.' },
  { title: 'First Judging Round', time: '10 Oct 2026 · 6:00 PM', desc: 'Show your progress and get feedback from the judges.' },
  { title: 'Final Judging & Results', time: '11 Oct 2026 · 9:00 PM', desc: 'Final demos, then the winners are announced.' }
];

export default function Timeline() {
  return (
    <section id="timeline" className="section timeline-section">
      <div className="section-row-heading"><SectionHeading eyebrow="The rhythm of the arena" title="Two days. One clear direction." description="A focused sequence designed to move teams from kickoff to a confident final demo." /><span className="timeline-duration">10—11<br /><small>OCT 2026</small></span></div>
      <div className="timeline-list">
        {EVENTS.map((event, index) => <article className="timeline-event" key={event.title}><div className="timeline-marker"><span>0{index + 1}</span></div><div className="timeline-event-copy"><p className="timeline-time">{event.time}</p><h3>{event.title}</h3><p>{event.desc}</p></div><Icon name="arrowUpRight" size={17} /></article>)}
      </div>
    </section>
  );
}
