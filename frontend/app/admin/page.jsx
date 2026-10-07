'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Portal3DBackdrop = dynamic(() => import('@/components/Portal3DBackdrop'), { ssr: false });

export default function Admin() {
  return (
    <div className="portal-page">
      <Portal3DBackdrop />
      <div className="portal-content">
        <Link href="/" className="back-link">← Back to site</Link>
        <div className="portal-box">
          <h1>Admin <span className="gradient-text">Dashboard</span></h1>
          
          <div className="form-card">
            <h2>Admin Access</h2>
            <p>Review teams, approve submissions, and manage the hackathon.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); }}>
              <div className="form-group">
                <label>EMAIL</label>
                <input type="email" placeholder="admin@example.com" required />
              </div>
              
              <div className="form-group">
                <label>PASSWORD</label>
                <input type="password" placeholder="Admin password" />
              </div>

              <button type="submit" className="btn-full">Log in to Admin</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
