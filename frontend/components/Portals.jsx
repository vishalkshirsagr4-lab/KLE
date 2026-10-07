'use client';

export default function Portals() {
  return (
    <section id="portals" className="section">
      <h2>Two portals</h2>
      <div className="portals-grid">
        <div className="portal-card">
          <h3>Participant portal</h3>
          <p>Sign up, register your team, edit details and watch your approval status.</p>
          <a href="/portal" className="btn">Open participant portal</a>
        </div>
        <div className="portal-card">
          <h3>Admin portal</h3>
          <p>Review teams, approve or reject, see stats, export CSV and post announcements.</p>
          <a href="/admin" className="btn">Open admin portal</a>
        </div>
      </div>
    </section>
  );
}
