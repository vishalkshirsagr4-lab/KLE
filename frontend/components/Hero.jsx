'use client';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [countdown, setCountdown] = useState({ days: 0, hrs: 0, min: 0, sec: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const T = new Date('2026-10-10T11:00:00+05:30').getTime();
      const s = Math.max(0, (T - Date.now()) / 1000 | 0);
      setCountdown({
        days: s / 86400 | 0,
        hrs: (s / 3600) % 24 | 0,
        min: (s / 60) % 60 | 0,
        sec: s % 60
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="hero">
      <h1><b>KLE INTER COLLEGE</b>HACKATHON 2K26</h1>
      <p className="hero-kicker">WHERE INNOVATION MEETS ACTION</p>
      <p className="hero-slogan">Ideas That Make a Difference.</p>
      <p className="sub">Eight domains of ideas. Two days. One campus. 10 & 11 October 2026.</p>
      
      <div className="countdown">
        <div><b>{String(countdown.days).padStart(2, '0')}</b><small>days</small></div>
        <div><b>{String(countdown.hrs).padStart(2, '0')}</b><small>hrs</small></div>
        <div><b>{String(countdown.min).padStart(2, '0')}</b><small>min</small></div>
        <div><b>{String(countdown.sec).padStart(2, '0')}</b><small>sec</small></div>
      </div>

      <a href="/portal" className="cta-btn">REGISTER NOW</a>
    </section>
  );
}
