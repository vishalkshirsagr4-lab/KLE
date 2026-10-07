import SectionHeading from './SectionHeading';
import PrizeCard from './PrizeCard';

export default function Prizes() {
  return (
    <section id="prizes" className="section prizes-section">
      <SectionHeading eyebrow="Recognition" title="Build something worth remembering." description="The podium is reserved for teams that turn a meaningful problem into a thoughtful, working prototype. Prize details will be announced officially." />
      <div className="prize-grid">
        <PrizeCard rank="01" title="First Prize" note="The highest distinction for the team that raises the bar." featured />
        <PrizeCard rank="02" title="Second Prize" note="For a standout build with clarity, craft, and promise." />
        <PrizeCard rank="03" title="Third Prize" note="For an idea that makes a meaningful mark." />
      </div>
    </section>
  );
}
