'use client';

export default function Register() {
  return (
    <section id="register" className="section">
      <h2>Register your team</h2>
      <div className="register-card">
        <p>Create a participant account, then register your team of 2 to 4 with your domain and problem statement. You can track approval and edit your details any time.</p>
        <div className="buttons">
          <a href="/portal" className="btn">Sign up and register</a>
          <a href="/portal" className="btn btn-outline">Participant log in</a>
        </div>
      </div>
    </section>
  );
}
