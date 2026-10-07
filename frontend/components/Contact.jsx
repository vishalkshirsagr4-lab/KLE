'use client';

import { useState } from 'react';
import SectionHeading from './SectionHeading';
import Icon from './ui/Icon';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const handleSubmit = (event) => { event.preventDefault(); setSent(true); setForm({ name: '', email: '', message: '' }); };
  return (
    <section id="contact" className="section contact-section">
      <div className="contact-layout"><SectionHeading eyebrow="Questions before kickoff?" title="Talk to the team behind the arena." description="Reach the coordinators directly or send a note. We’ll help you find the right next step." /><div className="contact-people"><a href="tel:8904601004" className="contact-person"><span className="contact-avatar">SP</span><span><strong>Shivanand Patil</strong><small>BCA Coordinator · 8904601004</small></span><Icon name="arrowUpRight" size={16} /></a><a href="tel:9353966996" className="contact-person"><span className="contact-avatar">SS</span><span><strong>Shirish Sir</strong><small>BBA Coordinator · 9353966996</small></span><Icon name="arrowUpRight" size={16} /></a></div><form className="contact-form glass-card" onSubmit={handleSubmit}><div className="form-heading"><span>Direct line</span><h3>Send a message</h3></div><label><span>Your name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label><span>Email address</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label><span>How can we help?</span><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></label><button className="ui-button ui-button-primary" type="submit"><span>{sent ? 'Message received' : 'Send message'}</span><Icon name={sent ? 'check' : 'arrowUpRight'} size={16} /></button>{sent && <p className="inline-success" role="status">Thanks — the coordination team will get back to you by email.</p>}</form></div>
    </section>
  );
}
