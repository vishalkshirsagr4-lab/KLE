'use client';
import { useState } from 'react';

const DOMAINS = [
  { name: 'Healthcare', icon: '❤️', desc: 'Tools for patients, clinics and care teams.' },
  { name: 'Fintech', icon: '💳', desc: 'Payments, lending, budgeting and money safety.' },
  { name: 'AgriTech', icon: '🌾', desc: 'Smarter farming, crop and market solutions.' },
  { name: 'EdTech', icon: '📚', desc: 'Better ways to teach, learn and assess.' },
  { name: 'Sustainability', icon: '🌍', desc: 'Cut waste, save energy, protect nature.' },
  { name: 'Cybersecurity', icon: '🔒', desc: 'Defend people, data and systems.' },
  { name: 'AI/ML', icon: '🤖', desc: 'Models and agents that solve real tasks.' },
  { name: 'Open Innovation', icon: '⭐', desc: 'Any idea that matters. Surprise us.' }
];

export default function Domains() {
  const [selected, setSelected] = useState(null);

  return (
    <section id="domains" className="section">
      <h2>Choose your domain</h2>
      <div className="domains-grid">
        {DOMAINS.map((domain) => (
          <div 
            key={domain.name} 
            className={`domain-card ${selected === domain.name ? 'selected' : ''}`}
            onClick={() => setSelected(domain.name)}
          >
            <div className="domain-icon">{domain.icon}</div>
            <h3>{domain.name}</h3>
            <p>{domain.desc}</p>
            <a href={`/portal?domain=${encodeURIComponent(domain.name)}`} className="btn-small">
              Select domain
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
