import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { MdNightsStay, MdWbSunny } from 'react-icons/md';
import Link from 'next/link';
import { Link as ScrollLink } from 'react-scroll';

const links = ['home', 'about', 'portfolio', 'experience', 'certificates', 'contact'];

const NavBar = ({ darkMode, onToggleDark, config }) => {
  const [nav, setNav] = useState(false);
  const logoText = typeof config?.logoText === 'string' && config.logoText.trim().length > 0 ? config.logoText : 'Jon';
  const logoImage = typeof config?.logoImage === 'string' ? config.logoImage : '';

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between">
        {logoImage ? (
          <img src={logoImage} alt={logoText} className="h-8 w-auto rounded object-contain" />
        ) : (
          <h1 className="text-4xl font-signature text-slate-900 dark:text-slate-100">{logoText}</h1>
        )}

        <nav className="hidden md:block">
          <ul className="flex items-center gap-2">
            {links.map((name) => (
              <li key={name}>
                <ScrollLink
                  to={name}
                  smooth
                  duration={500}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium capitalize text-slate-700 transition hover:bg-slate-100 hover:text-cyan-500 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {name}
                </ScrollLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/admin" className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Admin
          </Link>
          <button
            type="button"
            onClick={onToggleDark}
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
              <ScrollLink
                onClick={() => setNav(false)}
                to={name}
                smooth
                duration={500}
                className="block cursor-pointer rounded-lg px-4 py-2 capitalize text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {name}
              </ScrollLink>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
};

export default NavBar;
