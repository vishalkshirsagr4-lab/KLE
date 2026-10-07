'use client';

export default function Timeline() {
  const events = [
    { title: 'Hackathon Kickoff', time: '10 Oct 2026 · 11:00 AM', desc: 'Opening ceremony, rules briefing, and the clock starts.' },
    { title: 'First Judging Round', time: '10 Oct 2026 · 6:00 PM', desc: 'Show your progress and get feedback from the judges.' },
    { title: 'Final Judging & Results', time: '11 Oct 2026 · 9:00 PM', desc: 'Final demos, then the winners are announced.' }
  ];

  return (
    <section id="timeline" className="section">
      <h2>Event timeline</h2>
      <div className="timeline">
        {events.map((event, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot">{i + 1}</div>
            <h3>{event.title}</h3>
            <p className="time">{event.time}</p>
            <p>{event.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
