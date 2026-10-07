'use client';

import { useState } from 'react';
import SectionHeading from './SectionHeading';
import Icon from './ui/Icon';

const QUESTIONS = [
  ['Who can participate?', 'The hackathon is open exclusively to students of KLE BCA College, Mahalingpur.'],
  ['How many people can be on a team?', 'Teams can have 2 to 4 members. The team leader creates an account, verifies their email, and registers the team.'],
  ['When is the hackathon?', 'The event takes place on 10 and 11 October 2026. The official kickoff is 10 October at 11:00 AM.'],
  ['Which tracks can we build for?', 'The official tracks are Healthcare, Fintech, AgriTech, EdTech, Sustainability, Cybersecurity, AI/ML, and Open Innovation.'],
  ['How does registration work?', 'Create a participant account, verify your email with the six-digit code, then register your team through the participant portal.'],
  ['Can we use any technology stack?', 'Yes. The existing event information states that teams can use any stack to build their working prototype.']
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="section faq-section">
      <div className="faq-layout">
        <SectionHeading eyebrow="Need to know" title="Questions, clarified." description="Everything you need to take the first step into the arena." />
        <div className="faq-list">
          {QUESTIONS.map(([question, answer], index) => {
            const expanded = open === index;
            return (
              <div className={`faq-item ${expanded ? 'is-open' : ''}`} key={question}>
                <button type="button" className="faq-trigger" aria-expanded={expanded} aria-controls={`faq-answer-${index}`} onClick={() => setOpen(expanded ? -1 : index)}>
                  <span><b>0{index + 1}</b>{question}</span><Icon name="plus" size={18} />
                </button>
                <div id={`faq-answer-${index}`} className="faq-answer" hidden={!expanded}><p>{answer}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
