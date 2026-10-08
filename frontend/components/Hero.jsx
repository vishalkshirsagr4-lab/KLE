'use client';

import { useEffect, useState } from 'react';
import Button from './ui/Button';
import Icon from './ui/Icon';

const EVENT_TIME = '2026-10-10T11:00:00+05:30';

function getCountdown() {
  const seconds = Math.max(0, Math.floor((new Date(EVENT_TIME).getTime() - Date.now()) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds / 3600) % 24),
    minutes: Math.floor((seconds / 60) % 60),
    seconds: seconds % 60
  };
}

export default function Hero() {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    setCountdown(getCountdown());
    const timer = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="hero-section">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-eyebrow"><span className="signal-dot" /> Applications open for KLE BCA students <span className="eyebrow-line" /></div>
        <p className="hero-overline">KLE INTER COLLEGE · DEPARTMENT OF BCA</p>
        <h1><span>KLE</span> HACKATHON <b>2K26</b></h1>
        <p className="hero-mantra"><span>BUILD.</span> <span>INNOVATE.</span> <em>TRANSFORM.</em></p>
        <p className="hero-description">A two-day innovation arena where KLE BCA students turn real-world problems into working prototypes, together.</p>
        <div className="hero-actions">
          <Button href="/portal" icon="arrowUpRight">Register now</Button>
          <a className="text-cta" href="#about">Explore hackathon <Icon name="arrowRight" size={17} /></a>
        </div>
        <div className="hero-meta"><span><i />10 & 11 October 2026</span><span><i />KLE BCA College, Mahalingpur</span><span><i />Teams of 2–4</span></div>
      </div>
      <div className="hero-side-info" aria-label="Event countdown">
        <div className="hero-side-label"><span>01</span><span>THE ARENA OPENS IN</span></div>
        <div className="countdown">
          {[['days', 'days'], ['hrs', 'hours'], ['min', 'minutes'], ['sec', 'seconds']].map(([label, unit]) => (
            <div className="countdown-unit" key={label}>
              <strong>{countdown ? String(countdown[unit]).padStart(2, '0') : '--'}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="hero-side-note">Kickoff · 10 Oct 2026 · 11:00 AM</p>
      </div>
      <div className="hero-scroll"><span>Scroll to enter</span><i /></div>
    </section>
  );
}
