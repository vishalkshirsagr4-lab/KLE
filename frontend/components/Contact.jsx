'use client';
import { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Message received! We will reply by email.');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="section">
      <h2>Contact</h2>
      <div className="contact-container">
        <div className="contact-cards">
          <div className="contact-card">
            <h4>Shivanand Patil</h4>
            <p className="role">BCA Coordinator</p>
            <a href="tel:8904601004" className="phone">📞 8904601004</a>
          </div>
          <div className="contact-card">
            <h4>Shirish Sir</h4>
            <p className="role">BBA Coordinator</p>
            <a href="tel:9353966996" className="phone">📞 9353966996</a>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="contact-form">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <textarea
            placeholder="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <button type="submit" className="btn">Send message</button>
        </form>
      </div>
    </section>
  );
}
