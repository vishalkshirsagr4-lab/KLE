'use client';

import { useState } from 'react';
import SectionHeading from './SectionHeading';
import Icon from './ui/Icon';

const DOMAINS = [
  { name: 'Healthcare', mark: 'HC', desc: 'Tools for patients, clinics and care teams.', accent: 'cyan' },
  { name: 'Fintech', mark: 'FT', desc: 'Payments, lending, budgeting and money safety.', accent: 'blue' },
  { name: 'AgriTech', mark: 'AG', desc: 'Smarter farming, crop and market solutions.', accent: 'gold' },
  { name: 'EdTech', mark: 'ED', desc: 'Better ways to teach, learn and assess.', accent: 'violet' },
  { name: 'Sustainability', mark: 'SU', desc: 'Cut waste, save energy, protect nature.', accent: 'green' },
  { name: 'Cybersecurity', mark: 'CY', desc: 'Defend people, data and systems.', accent: 'cyan' },
  { name: 'AI/ML', mark: 'AI', desc: 'Models and agents that solve real tasks.', accent: 'violet' },
  { name: 'Open Innovation', mark: 'OI', desc: 'Any idea that matters. Surprise us.', accent: 'gold' }
];

export default function Domains() {
  const [selected, setSelected] = useState(null);
  return (
    <section id="domains" className="section tracks-section">
      <div className="section-row-heading"><SectionHeading eyebrow="Eight ways to make a mark" title="Choose your build track." description="Start with the problem space that keeps you curious. Your team, your stack, your way of solving it." /><span className="section-index">02 <i /> 08</span></div>
      <div className="tracks-grid">
        {DOMAINS.map((domain, index) => {
          const isSelected = selected === domain.name;
          return (
            <article key={domain.name} className={`track-card track-${domain.accent} ${isSelected ? 'is-selected' : ''}`} tabIndex={0} onClick={() => setSelected(domain.name)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(domain.name); } }}>
              <div className="track-card-top"><span className="track-number">0{index + 1}</span><span className="track-mark">{domain.mark}</span></div>
              <div><h3>{domain.name}</h3><p>{domain.desc}</p></div>
              <a href={`/portal?domain=${encodeURIComponent(domain.name)}`} className="track-link" onClick={(event) => event.stopPropagation()}>Select track <Icon name="arrowUpRight" size={15} /></a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
