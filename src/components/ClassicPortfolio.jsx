import React from 'react';
import NavBar from './NavBar';
import Hero from './Hero';
import About from './About';
import Projects from './Projects';
import Experience from './Experience';
import Certificates from './Certificates';
import Contact from './Contact';

const ClassicPortfolio = ({ profileSlug = null, siteContent, siteConfig, darkMode, onToggleDark }) => {
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <NavBar darkMode={darkMode} onToggleDark={onToggleDark} config={siteConfig} />
      <main>
        <Hero hero={siteContent?.hero} />
        <About about={siteContent?.about} />
        <Projects profileSlug={profileSlug} />
        <Experience profileSlug={profileSlug} />
        <Certificates profileSlug={profileSlug} />
        <Contact />
      </main>
    </div>
  );
};

export default ClassicPortfolio;

