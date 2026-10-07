'use client';

import { useEffect, useRef, useState } from 'react';
import SectionHeading from './SectionHeading';
import StatCard from './StatCard';

const ITEMS = [
  { value: 2, display: '02', label: 'Event days', detail: '10 & 11 October 2026', icon: 'clock' },
  { value: 8, display: '08', label: 'Official tracks', detail: 'From Healthcare to AI/ML', icon: 'grid' },
  { value: null, display: '02–04', label: 'Builders per team', detail: 'Find your build crew', icon: 'users' },
  { value: 1, display: '01', label: 'Shared arena', detail: 'KLE BCA College, Mahalingpur', icon: 'spark' }
];

export default function Stats() {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  const [values, setValues] = useState(ITEMS.map((item) => item.value == null ? item.display : '00'));

  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) {
      setStarted(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValues(ITEMS.map((item) => item.display));
      return undefined;
    }
    const duration = 850;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValues(ITEMS.map((item) => item.value == null ? item.display : String(Math.round(item.value * eased)).padStart(2, '0')));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started]);

  return (
    <section id="stats" className="stats-section" ref={ref} aria-label="Hackathon at a glance">
      <div className="stats-shell">
        <SectionHeading eyebrow="The build brief" title="Small enough to move fast. Big enough to matter." description="A focused build arena for students ready to turn a strong idea into something real." />
        <div className="stats-grid">
          {ITEMS.map((item, index) => <StatCard key={item.label} {...item} value={values[index]} live={index === 0} />)}
        </div>
      </div>
    </section>
  );
}
