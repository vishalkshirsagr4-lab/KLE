'use client';
import dynamic from 'next/dynamic';

const Scene3D = dynamic(() => import('@/components/Scene3D'), { ssr: false });
const Hero = dynamic(() => import('@/components/Hero'), { ssr: false });
const About = dynamic(() => import('@/components/About'), { ssr: false });
const Domains = dynamic(() => import('@/components/Domains'), { ssr: false });
const Timeline = dynamic(() => import('@/components/Timeline'), { ssr: false });
const Register = dynamic(() => import('@/components/Register'), { ssr: false });
const Portals = dynamic(() => import('@/components/Portals'), { ssr: false });
const Contact = dynamic(() => import('@/components/Contact'), { ssr: false });

export default function Home() {
  return (
    <>
      <Scene3D />
      <nav className="nav">
        <a href="#hero">Home</a>
        <a href="#about">About</a>
        <a href="#domains">Domains</a>
        <a href="#timeline">Timeline</a>
        <a href="#register">Register</a>
        <a href="#portals">Portals</a>
        <a href="#contact">Contact</a>
      </nav>
      
      <Hero />
      <About />
      <Domains />
      <Timeline />
      <Register />
      <Portals />
      <Contact />
    </>
  );
}
