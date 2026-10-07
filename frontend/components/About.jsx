import SectionHeading from './SectionHeading';
import GlassCard from './ui/GlassCard';
import Icon from './ui/Icon';

const VALUES = [
  ['01', 'INNOVATE', 'Build solutions for real-world problems.', 'spark'],
  ['02', 'COLLABORATE', 'Work with talented students and teams.', 'users'],
  ['03', 'CREATE', 'Turn ideas into working prototypes.', 'grid'],
  ['04', 'IMPACT', 'Build technology that solves meaningful problems.', 'arrowUpRight']
];

export default function About() {
  return (
    <section id="about" className="section about-section">
      <div className="about-intro">
        <SectionHeading eyebrow="Why KLE Hackathon?" title="The classroom ends where the build begins." description="KLE Inter College Hackathon 2K26 is a focused build experience by the Department of BCA. Bring a problem, build a team, and ship something that matters." />
        <div className="about-fact"><span className="fact-number">02</span><p>days to move from a strong idea to a working prototype.</p></div>
      </div>
      <div className="value-grid">
        {VALUES.map(([number, title, copy, icon]) => <GlassCard as="article" className="value-card" key={title}><div className="value-top"><span>{number}</span><Icon name={icon} size={17} /></div><h3>{title}</h3><p>{copy}</p><span className="card-arrow"><Icon name="arrowUpRight" size={15} /></span></GlassCard>)}
      </div>
      <div className="organizer-line"><span>Organized by</span><strong>Shivanand Patil</strong><small>BCA Coordinator</small><i /><strong>Shirish Sir</strong><small>BBA Coordinator</small></div>
    </section>
  );
}
