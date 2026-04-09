import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { MdNightsStay, MdWbSunny } from 'react-icons/md';
import { Link } from 'react-scroll';

const links = ['home', 'about', 'portfolio', 'experience', 'certificates', 'contact'];

const NavBar = ({ darkMode, setDarkMode }) => {
  const [nav, setNav] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between">
        <h1 className="text-4xl font-signature text-slate-900 dark:text-slate-100">Jon</h1>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-2">
            {links.map((name) => (
              <li key={name}>
                <Link
                  to={name}
                  smooth
                  duration={500}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium capitalize text-slate-700 transition hover:bg-slate-100 hover:text-cyan-500 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {darkMode ? <MdWbSunny size={24} /> : <MdNightsStay size={24} />}
          </button>

          <button
            type="button"
            onClick={() => setNav(!nav)}
            className="rounded-full p-2 text-slate-700 md:hidden dark:text-slate-200"
            aria-label="Toggle navigation"
          >
            {nav ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>
        </div>
      </div>

      {nav ? (
        <ul className="space-y-2 pb-4 md:hidden">
          {links.map((name) => (
            <li key={name}>
              <Link
                onClick={() => setNav(false)}
                to={name}
                smooth
                duration={500}
                className="block cursor-pointer rounded-lg px-4 py-2 capitalize text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
};

export default NavBar;
