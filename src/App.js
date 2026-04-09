'use client';

import { useState } from 'react';
import About from './components/About';
import Certificates from './components/Certificates';
import Contact from './components/Contact';
import Experience from './components/Experience';
import Hero from './components/Hero';
import NavBar from './components/NavBar';
import Projects from './components/Projects';
import SocialLinks from './components/SocialLinks';

function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <NavBar darkMode={darkMode} setDarkMode={setDarkMode} />
      <main className="bg-slate-50 text-black transition duration-500 dark:bg-slate-950 dark:text-white">
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Certificates />
        <Contact />
      </main>
      <SocialLinks />
    </div>
  );
}

export default App;
