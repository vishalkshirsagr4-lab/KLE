import SectionHeading from './SectionHeading';
import Button from './ui/Button';
import Icon from './ui/Icon';

export default function Portals() {
  return (
    <section id="portals" className="section portals-section">
      <SectionHeading eyebrow="One arena, two workspaces" title="Everything you need to keep building." description="Enter the workspace that matches your role. Both portals are built around clear next steps." />
      <div className="portal-grid">
        <article className="portal-card portal-participant"><div className="portal-card-head"><span className="portal-symbol"><Icon name="arrowUpRight" size={20} /></span><span className="portal-label">For participants</span></div><h3>Participant portal</h3><p>Create your account, register a team, track approval, and stay close to the action.</p><ul><li><Icon name="check" size={14} /> Team registration</li><li><Icon name="check" size={14} /> Approval status</li><li><Icon name="check" size={14} /> Event announcements</li></ul><Button href="/portal">Open participant portal</Button></article>
        <article className="portal-card portal-admin"><div className="portal-card-head"><span className="portal-symbol"><Icon name="grid" size={20} /></span><span className="portal-label">For organizers</span></div><h3>Admin workspace</h3><p>Review teams, manage tracks, monitor registrations, and keep the arena moving.</p><ul><li><Icon name="check" size={14} /> Team review</li><li><Icon name="check" size={14} /> Live metrics</li><li><Icon name="check" size={14} /> Announcements</li></ul><Button href="/admin" variant="secondary">Open admin workspace</Button></article>
      </div>
    </section>
  );
}
