import SectionHeading from './SectionHeading';
import Icon from './ui/Icon';

export default function SponsorGrid() {
  return (
    <section id="sponsors" className="section sponsors-section">
      <div className="sponsor-layout">
        <SectionHeading eyebrow="The network" title="Built with the people who make ideas possible." description="Our partner network will be announced as the arena comes together." />
        <div className="sponsor-placeholder" role="status"><span className="sponsor-orbit"><Icon name="spark" size={19} /></span><div><strong>Partner details coming soon</strong><p>Official sponsors and collaborators will appear here when confirmed.</p></div></div>
      </div>
    </section>
  );
}
