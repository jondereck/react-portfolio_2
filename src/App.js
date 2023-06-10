
import { useState } from 'react';
import About from './components/About';
import Contact from './components/Contact';
import Experience from './components/Experience';
import Home from './components/Home';
import NavBar from './components/NavBar';
import Portfolio from './components/Portfolio';
import SocialLinks from './components/SocialLinks';
import './index.css';

function App() {

  const [darkMode, setDarkMode] = useState(true)

  return (
    <div className={darkMode && "dark"}>
      <NavBar darkMode={darkMode} setDarkMode={setDarkMode} />
      <main className=' text-black dark:text-white bg-white dark:duration-500 duration-500 dark:bg-black'>
        <Home />
        <About />
        <Portfolio />
        <Experience />
        <Contact />
      </main>
      {/* <HideOnScroll className="duration-500"> */}
        <SocialLinks />
      {/* </HideOnScroll> */}
    </div>
  );
}

export default App;
