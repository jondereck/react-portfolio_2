/* eslint-disable @next/next/no-img-element */
import React, { useRef, useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { MdNightsStay, MdWbSunny } from 'react-icons/md';
import { Link as ScrollLink } from 'react-scroll';
import { defaultNavigation } from '@/lib/siteContentDefaults';
import { isSafeHttpUrl } from '@/lib/url-safety';

const normalizeLinks = (config) => {
  const source =
    Array.isArray(config?.navigation?.links) && config.navigation.links.length > 0
      ? config.navigation.links
      : defaultNavigation.links;

  return source
    .filter((link) => link && link.isVisible !== false)
    .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0))
    .map((link) => ({
      label: typeof link.label === 'string' && link.label.trim() ? link.label.trim() : 'Link',
      target: typeof link.target === 'string' ? link.target.trim() : '',
      type: link.type === 'url' ? 'url' : 'section',
    }))
    .filter((link) => link.target);
};

const NavBar = ({ darkMode, onToggleDark, config }) => {
  const [nav, setNav] = useState(false);
  const logoText = typeof config?.logoText === 'string' && config.logoText.trim().length > 0 ? config.logoText : 'Jon';
  const logoImage = isSafeHttpUrl(config?.logoImage) ? config.logoImage : '';
  const links = normalizeLinks(config);
  const logoTapCountRef = useRef(0);
  const logoTapStartRef = useRef(0);

  const handleLogoSecretTap = (event) => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const startedAt = logoTapStartRef.current;
    const windowMs = 2000;

    if (!startedAt || now - startedAt > windowMs) {
      logoTapStartRef.current = now;
      logoTapCountRef.current = 1;
      return;
    }

    logoTapCountRef.current += 1;

    if (logoTapCountRef.current >= 7) {
      logoTapCountRef.current = 0;
      logoTapStartRef.current = 0;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      window.location.assign('/admin/login');
    }
  };

  const renderNavLink = (link, isMobile = false) => {
    const className = isMobile
      ? 'block cursor-pointer rounded-lg px-4 py-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
      : 'cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-cyan-500 dark:text-slate-200 dark:hover:bg-slate-800';

    if (link.type === 'url' || !link.target.startsWith('#')) {
      const external = isSafeHttpUrl(link.target);
      return (
        <a href={link.target} className={className} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
          {link.label}
        </a>
      );
    }

    return (
      <ScrollLink to={link.target.replace(/^#/, '')} smooth duration={500} onClick={isMobile ? () => setNav(false) : undefined} className={className}>
        {link.label}
      </ScrollLink>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between">
        <ScrollLink
          to="home"
          smooth
          duration={500}
          onClick={handleLogoSecretTap}
          className="flex cursor-pointer items-center"
        >
          {logoImage ? (
            <img
              src={logoImage}
              alt={logoText}
              className="h-16 w-auto rounded object-contain drop-shadow-md sm:h-20 lg:h-24 dark:drop-shadow-lg"
            />
          ) : (
            <h1 className="text-4xl font-signature text-slate-900 dark:text-slate-100">{logoText}</h1>
          )}
        </ScrollLink>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-2">
            {links.map((link, index) => (
              <li key={`${link.label}-${link.target}-${index}`}>
                {renderNavLink(link)}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
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
          {links.map((link, index) => (
            <li key={`${link.label}-${link.target}-${index}`}>
              {renderNavLink(link, true)}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
};

export default NavBar;
