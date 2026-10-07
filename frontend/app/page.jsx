'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import About from '@/components/About';
import Domains from '@/components/Domains';
import Timeline from '@/components/Timeline';
import Prizes from '@/components/Prizes';
import SponsorGrid from '@/components/SponsorGrid';
import FAQ from '@/components/FAQ';
import Register from '@/components/Register';
import Portals from '@/components/Portals';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

const Scene3D = dynamic(() => import('@/components/Scene3D'), { ssr: false });

export default function Home() {
  return (
    <div className="site-shell">
      <Scene3D />
      <Navbar />
      <main className="site-main">
        <Hero />
        <Stats />
        <About />
        <Domains />
        <Timeline />
        <Prizes />
        <SponsorGrid />
        <FAQ />
        <Register />
        <Portals />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
