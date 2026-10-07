'use client';

import { useEffect, useState } from 'react';
import Icon from './ui/Icon';
import Button from './ui/Button';

const ITEMS = [
  ['Home', 'hero'],
  ['About', 'about'],
  ['Tracks', 'domains'],
  ['Timeline', 'timeline'],
  ['Prizes', 'prizes'],
  ['Sponsors', 'sponsors'],
  ['FAQ', 'faq']
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('hero');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = ITEMS.map(([, id]) => document.getElementById(id)).filter(Boolean);
    if (!('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-38% 0px -52% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={`site-nav nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="nav-shell">
        <a className="brand-lockup" href="#hero" onClick={close} aria-label="KLE Hackathon 2K26 home">
          <span className="brand-mark" aria-hidden="true"><span>K</span><i /></span>
          <span className="brand-copy"><strong>KLE</strong><small>HACKATHON <b>2K26</b></small></span>
        </a>
        <nav className="desktop-links" aria-label="Primary navigation">
          {ITEMS.map(([label, id]) => <a key={id} className={active === id ? 'is-active' : ''} href={`#${id}`} aria-current={active === id ? 'page' : undefined}>{label}</a>)}
        </nav>
        <div className="nav-actions">
          <a className="nav-login" href="/portal">Log in</a>
          <Button href="/portal" className="nav-cta" icon="arrowUpRight">Register now</Button>
        </div>
        <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <Icon name={open ? 'x' : 'menu'} size={21} />
        </button>
      </div>
      <div id="mobile-navigation" className="mobile-menu" hidden={!open}>
        <nav aria-label="Mobile navigation">
          {ITEMS.map(([label, id]) => <a key={id} className={active === id ? 'is-active' : ''} href={`#${id}`} onClick={close}>{label}<Icon name="arrowUpRight" size={15} /></a>)}
        </nav>
        <div className="mobile-actions"><a href="/portal" onClick={close}>Log in</a><Button href="/portal" onClick={close}>Register now</Button></div>
      </div>
    </header>
  );
}
