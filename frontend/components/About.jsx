'use client';

export default function About() {
  return (
    <section id="about" className="section">
      <h2>About the hackathon</h2>
      <div className="two-col">
        <div className="card">
          <p>KLE Inter College Hackathon 2K26 is conducted by the Department of BCA and is open exclusively to students of KLE BCA College, Mahalingpur. Build a team, choose a domain, bring a problem statement, and ship a working prototype in front of the judges.</p>
          <p>Our vision: turn classroom skills into products that solve real problems in healthcare, farming, finance, learning and beyond.</p>
        </div>
        <div className="card">
          <h3>Organizers</h3>
          <p>Shivanand Patil <span className="muted">· BCA Coordinator</span></p>
          <p>Shirish Sir <span className="muted">· BBA Coordinator</span></p>
          <p className="muted">Teams of 2 to 4 · KLE BCA College students only · Any stack</p>
        </div>
      </div>
    </section>
  );
}
