/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { normalizeFormError, parseErrorResponse } from '@/lib/form-client';
import { defaultNavigation } from '@/lib/siteContentDefaults';
import { useLoadingStore } from '@/store/loading';
import { isSafeHttpUrl } from '@/lib/url-safety';
import { compareCertificatesByIssuedAtDesc, isPdfAssetUrl } from '@/lib/certificates';

const cx = (...classes) => classes.filter(Boolean).join(' ');
const NEO_ADMIN_CLICK_WINDOW_MS = 550;

const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to load portfolio data.');
    }
    return response.json();
  });

const withProfile = (path, profileSlug) => {
  if (!profileSlug) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}profile=${encodeURIComponent(profileSlug)}`;
};

const getSafeImage = (value) => (isSafeHttpUrl(value) ? value : '');

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

const normalizeTech = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const normalizeDescriptions = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split('\n').map((item) => item.trim()).filter(Boolean);
  return [];
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
};

const formatExperienceYears = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const earliestStart = items
    .map((item) => (item?.startDate ? new Date(item.startDate).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)[0];

  if (!Number.isFinite(earliestStart)) return '';

  const yearMs = 365.25 * 24 * 60 * 60 * 1000;
  const years = Math.max(1, Math.floor((Date.now() - earliestStart) / yearMs));
  return `${years}+`;
};

const getMostUsedTech = (projects) => {
  if (!Array.isArray(projects) || projects.length === 0) return '';
  const counts = new Map();
  projects.forEach((project) => {
    normalizeTech(project?.tech ?? project?.techStack).forEach((tech) => {
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    });
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? '';
};

function Icon({ name, className = 'h-5 w-5' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  const icons = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    arrowUp: (
      <>
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </>
    ),
    check: <path d="m20 6-11 11-5-5" />,
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    github: (
      <>
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-1.5 6-6.5.1-1.3-.3-2.6-1-3.7.3-1.1.3-2.3 0-3.3 0 0-1 0-3 1.5a10.3 10.3 0 0 0-5.5 0C8.5 1 7.5 1 7.5 1c-.3 1-.3 2.2 0 3.3a5.4 5.4 0 0 0-1 3.7c0 5 3 6.5 6 6.5a4.8 4.8 0 0 0-1 3.5v4" />
        <path d="M9 18c-4.5 2-5-2-7-2" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] || icons.arrow}</svg>;
}

function Logo({ config }) {
  const adminClickStateRef = useRef({ count: 0, timerId: null });
  const logoText = typeof config?.logoText === 'string' && config.logoText.trim() ? config.logoText.trim() : 'N System';
  const logoImage = getSafeImage(config?.logoImage);
  const initial = logoText.trim()[0]?.toUpperCase() || 'N';

  const clearAdminClicks = useCallback(() => {
    if (adminClickStateRef.current.timerId) {
      window.clearTimeout(adminClickStateRef.current.timerId);
      adminClickStateRef.current.timerId = null;
    }
    adminClickStateRef.current.count = 0;
  }, []);

  const handleLogoClick = (event) => {
    if ('button' in event && event.button !== 0) {
      return;
    }

    const nextCount = adminClickStateRef.current.count + 1;
    if (adminClickStateRef.current.timerId) {
      window.clearTimeout(adminClickStateRef.current.timerId);
    }

    if (nextCount >= 3) {
      event.preventDefault();
      clearAdminClicks();
      window.location.assign('/admin/login');
      return;
    }

    adminClickStateRef.current.count = nextCount;
    adminClickStateRef.current.timerId = window.setTimeout(() => {
      clearAdminClicks();
    }, NEO_ADMIN_CLICK_WINDOW_MS);
  };

  useEffect(() => () => clearAdminClicks(), [clearAdminClicks]);

  return (
    <a href="#home" onClick={handleLogoClick} className="flex items-center gap-3">
      {logoImage ? (
        <img src={logoImage} alt={logoText} className="h-[54px] w-[54px] rounded-[18px] border-[3px] border-[#101010] bg-[#fffdf8] object-contain shadow-[6px_6px_0_#101010]" />
      ) : (
        <span className="grid h-[54px] w-[54px] place-items-center rounded-[18px] bg-[#101010] text-xl font-black text-white shadow-[8px_8px_0_#101010]">
          {initial}
        </span>
      )}
      <span>
        <strong className="block text-base leading-none text-[#101010]">{logoText}</strong>
        <span className="mt-1 block text-[0.68rem] font-black uppercase text-[#5f5f5f]">Neo Editorial</span>
      </span>
    </a>
  );
}

function ThemeButtons({ darkMode, onToggleDark }) {
  const switchToLight = () => {
    if (darkMode) onToggleDark?.();
  };
  const switchToDark = () => {
    if (!darkMode) onToggleDark?.();
  };

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={switchToLight} className={cx('rounded-full border-2 border-[#101010] px-2 py-2 text-xs font-black', !darkMode ? 'bg-[#101010] text-white' : 'bg-[#fffdf8] text-[#101010]')}>
        Base
      </button>
      <button type="button" onClick={switchToDark} className={cx('rounded-full border-2 border-[#101010] px-2 py-2 text-xs font-black', darkMode ? 'bg-[#101010] text-white' : 'bg-[#fffdf8] text-[#101010]')}>
        Dark
      </button>
    </div>
  );
}

const displayLabel = (link) => {
  const target = String(link?.target || '').toLowerCase();
  if (target === '#portfolio') return 'Work';
  if (target === '#experience') return 'Skills';
  return link.label;
};

function NavLinks({ links, onNavigate, compact = false }) {
  return (
    <nav className={cx('grid', compact ? 'gap-2' : 'gap-3')}>
      {links.map((link, index) => {
        const href = link.type === 'url' || !link.target.startsWith('#') ? link.target : link.target;
        const external = isSafeHttpUrl(href);
        return (
          <a
            key={`${link.label}-${link.target}`}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            onClick={onNavigate}
            className="flex items-center justify-between rounded-full border-2 border-[#101010] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#101010] transition hover:translate-x-1 hover:bg-[#e8dfd2]"
          >
            <span>{displayLabel(link)}</span>
            {!compact ? <small className="text-xs font-black text-[#5f5f5f]">{String(index + 1).padStart(2, '0')}</small> : null}
          </a>
        );
      })}
    </nav>
  );
}

function Sidebar({ config, links, darkMode, onToggleDark }) {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col justify-between gap-5 border-r-[3px] border-[#101010] bg-[#fffdf8]/85 p-7 backdrop-blur-xl xl:flex">
      <div>
        <Logo config={config} />
        <div className="mt-5 rounded-[26px] border-[3px] border-[#101010] bg-[#fffdf8] p-5 shadow-[8px_8px_0_#101010]">
          <span className="inline-flex rounded-full border-2 border-[#101010] bg-[#ff6a2a] px-4 py-2 text-xs font-black text-white">Open for opportunities</span>
          <p className="mt-4 text-sm leading-8 text-[#5f5f5f]">
            Sticky rail, editorial blocks, case-study sections, and a bolder portfolio identity powered by your existing content.
          </p>
        </div>
        <div className="mt-5">
          <NavLinks links={links} />
        </div>
      </div>

      <div className="rounded-[26px] border-[3px] border-[#101010] bg-[#fffdf8] p-5 shadow-[8px_8px_0_#101010]">
        <h3 className="text-base font-black text-[#101010]">Theme direction</h3>
        <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">Neo-editorial / product case-study layout with a sticky rail.</p>
        <ThemeButtons darkMode={darkMode} onToggleDark={onToggleDark} />
      </div>
    </aside>
  );
}

function MobileTopbar({ config, links, darkMode, onToggleDark }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 border-b-2 border-[#101010]/10 bg-[#f3efe7]/95 py-3 backdrop-blur-xl xl:hidden">
      <div className="mx-auto w-[min(1380px,calc(100%-20px))]">
        <div className="flex items-center justify-between gap-3">
          <Logo config={config} />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#101010] bg-[#fffdf8] text-[#101010]"
            aria-label="Toggle navigation"
          >
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
        {open ? (
          <div className="mt-3 rounded-[24px] border-[3px] border-[#101010] bg-[#fffdf8] p-4 shadow-[8px_8px_0_#101010]">
            <NavLinks links={links} onNavigate={() => setOpen(false)} compact />
            <div className="mt-3 border-t-2 border-[#101010]/10 pt-3">
              <ThemeButtons darkMode={darkMode} onToggleDark={onToggleDark} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CtaLink({ href, children, className }) {
  const safeHref = typeof href === 'string' && href.trim() ? href.trim() : '#contact';
  const external = isSafeHttpUrl(safeHref);
  return (
    <a href={safeHref} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={className}>
      {children}
    </a>
  );
}

function SectionTitle({ eyebrow, title, desc, dark = false }) {
  return (
    <div>
      <small className={cx('block text-xs font-black uppercase', dark ? 'text-[#ff6a2a]' : 'text-[#ff6a2a]')}>{eyebrow}</small>
      <h2 className={cx('mt-3 max-w-[14ch] text-4xl font-black leading-[0.95] md:text-6xl', dark ? 'text-white' : 'text-[#101010]')}>{title}</h2>
      {desc ? <p className={cx('mt-4 max-w-3xl text-base leading-8', dark ? 'text-white/80' : 'text-[#5f5f5f]')}>{desc}</p> : null}
    </div>
  );
}

function DeviceMock({ heroImage = '' }) {
  const image = getSafeImage(heroImage);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[26px] border-[3px] border-[#101010] bg-[linear-gradient(135deg,#f8d5c5,#f6ecd7_45%,#fff_100%)] p-5">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,16,16,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,16,16,.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-45" />
      <div className="absolute right-4 top-4 z-10 rounded-[20px] border-2 border-[#101010] bg-white/85 p-4 shadow-[8px_8px_0_#101010] backdrop-blur">
        <strong className="block text-lg">LGU-ready</strong>
        <span className="text-sm text-[#5f5f5f]">Practical systems</span>
      </div>
      <div className="absolute bottom-5 left-4 z-10 rounded-[20px] border-2 border-[#101010] bg-white/85 p-4 shadow-[8px_8px_0_#101010] backdrop-blur">
        <strong className="block text-lg">Operations</strong>
        <span className="text-sm text-[#5f5f5f]">Automation first</span>
      </div>
      <div className="absolute bottom-8 right-8 z-10 rounded-[20px] border-2 border-[#101010] bg-white/85 p-4 shadow-[8px_8px_0_#101010] backdrop-blur">
        <strong className="block text-lg">UX + Dev</strong>
        <span className="text-sm text-[#5f5f5f]">One workflow</span>
      </div>
      <div className="absolute left-1/2 top-[54%] w-[min(94%,420px)] -translate-x-1/2 -translate-y-1/2 -rotate-[7deg] overflow-hidden rounded-[30px] border-[3px] border-[#101010] bg-[#fffdf8] shadow-[12px_12px_0_rgba(16,16,16,.18)]">
        <div className="flex h-11 items-center gap-2 border-b-[3px] border-[#101010] bg-[#e8dfd2] px-4">
          <span className="h-3 w-3 rounded-full bg-[#ff6a2a]" />
          <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
          <span className="h-3 w-3 rounded-full bg-[#8fd19e]" />
        </div>
        {image ? (
          <div className="relative h-[315px]">
            <img src={image} alt="Portfolio hero visual" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#101010]/75 to-transparent p-5 pt-20">
              <p className="text-2xl font-black text-white">Portfolio system preview</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[18px] border-2 border-[#101010] bg-white p-4">
                <strong>Operations Dashboard</strong>
                <span className="mt-4 block h-2 rounded-full bg-[#e8dfd2]" />
                <span className="mt-2 block h-2 w-2/3 rounded-full bg-[#e8dfd2]" />
              </div>
              <div className="rounded-[18px] border-2 border-[#101010] bg-[linear-gradient(180deg,#fff,#fff7ef)] p-4">
                <strong>Analytics</strong>
                <div className="mt-3 flex h-16 items-end gap-2">
                  {[38, 66, 80, 55, 92].map((height) => (
                    <span key={height} className="flex-1 rounded-t-lg bg-[#101010]" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Employees', 'Documents', 'Approvals', 'Reports'].map((label) => (
                <div key={label} className="rounded-[18px] border-2 border-[#101010] bg-white p-4">
                  <strong>{label}</strong>
                  <span className="mt-4 block h-2 rounded-full bg-[#e8dfd2]" />
                  <span className="mt-2 block h-2 w-2/3 rounded-full bg-[#e8dfd2]" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroSection({ hero, about, profileSlug }) {
  const { data: projectsData } = useSWR(withProfile('/api/portfolio', profileSlug), fetcher);
  const { data: experienceData } = useSWR(withProfile('/api/experience', profileSlug), fetcher);
  const projects = Array.isArray(projectsData) ? projectsData : Array.isArray(projectsData?.projects) ? projectsData.projects : [];
  const experienceItems = Array.isArray(experienceData) ? experienceData : [];
  const aboutHighlights = Array.isArray(about?.highlights) ? about.highlights.slice(0, 3) : [];
  const metrics = [
    { value: projects.length > 0 ? `${projects.length}+` : aboutHighlights[0]?.label || '10+', label: 'systems built' },
    { value: formatExperienceYears(experienceItems) || '3+', label: 'years experience' },
    { value: getMostUsedTech(projects) || '100%', label: getMostUsedTech(projects) ? 'main stack' : 'responsive layout' },
  ];

  return (
    <section id="home" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="grid min-h-[620px] content-between rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-7 shadow-[8px_8px_0_#101010]">
        <div>
          <div className="inline-flex rounded-full border-2 border-[#101010] bg-[#e8dfd2] px-4 py-3 text-xs font-black uppercase">
            {hero?.eyebrow || 'Neo editorial portfolio'}
          </div>
          <h1 className="mt-6 max-w-[10ch] text-5xl font-black leading-[0.92] text-[#101010] md:text-7xl xl:text-[6.6rem]">
            {hero?.title || 'I build systems that make office work easier.'}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f5f5f] md:text-lg">
            {hero?.description || 'Practical web-based systems for HR, document tracking, reporting, automation, data accuracy, and public service workflows.'}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaLink href={hero?.primaryCtaHref || '#portfolio'} className="inline-flex items-center gap-2 rounded-full border-2 border-[#101010] bg-[#101010] px-5 py-4 text-sm font-black text-white shadow-[6px_6px_0_#101010] transition hover:-translate-y-0.5">
              {hero?.primaryCtaLabel || 'View case studies'} <Icon name="arrow" className="h-4 w-4" />
            </CtaLink>
            <CtaLink href={hero?.secondaryCtaHref || '#contact'} className="inline-flex items-center gap-2 rounded-full border-2 border-[#101010] bg-[#fffdf8] px-5 py-4 text-sm font-black text-[#101010] shadow-[6px_6px_0_#101010] transition hover:-translate-y-0.5">
              {hero?.secondaryCtaLabel || 'Use this design'} <Icon name="arrowUp" className="h-4 w-4" />
            </CtaLink>
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={`${metric.value}-${metric.label}`} className="rounded-[22px] border-2 border-[#101010] bg-[#e8dfd2] p-4">
              <strong className="block break-words text-2xl leading-none">{metric.value}</strong>
              <span className="mt-2 block text-sm font-bold text-[#5f5f5f]">{metric.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-5 shadow-[8px_8px_0_#101010]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full border-2 border-[#101010] bg-[#e8dfd2] px-4 py-2 text-xs font-black">Portfolio Preview</span>
          <span className="rounded-full border-2 border-[#101010] bg-[#e8dfd2] px-4 py-2 text-xs font-black">Responsive</span>
        </div>
        <DeviceMock heroImage={hero?.image} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <span className="rounded-full border-2 border-[#101010] bg-[#e8dfd2] px-4 py-2 text-center text-xs font-black">Creative UI</span>
          <span className="rounded-full border-2 border-[#101010] bg-[#e8dfd2] px-4 py-2 text-center text-xs font-black">Clean Code</span>
        </div>
      </div>
    </section>
  );
}

function AboutSection({ about }) {
  const cards = Array.isArray(about?.highlights) && about.highlights.length > 0
    ? about.highlights.slice(0, 3)
    : [
        { label: 'Different structure', value: 'Desktop uses a sticky side rail, while mobile becomes a compact topbar with a proper menu.' },
        { label: 'Case-study feeling', value: 'Projects are displayed as longer story blocks instead of repeated small cards, which feels more professional.' },
        { label: 'Stronger personality', value: 'Typography, shadows, borders, and asymmetry make the design more memorable and less generic.' },
      ];

  return (
    <section id="about" className="mt-7">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-[320px] items-end rounded-[28px] border-[3px] border-[#101010] bg-[linear-gradient(135deg,#141414,#343434)] p-7 text-white shadow-[8px_8px_0_#101010]">
          <SectionTitle
            dark
            eyebrow="About"
            title={about?.title || 'A sharper personal brand presentation.'}
            desc={about?.body || 'This layout makes your portfolio feel more intentional and premium while keeping your content dynamic.'}
          />
        </div>
        <div className="grid gap-4">
          {cards.map((card, index) => (
            <article key={`${card.label}-${index}`} className="grid grid-cols-[auto_1fr] gap-4 rounded-[24px] border-[3px] border-[#101010] bg-[#fffdf8] p-5 shadow-[8px_8px_0_#101010]">
              <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#ff6a2a] font-black text-white shadow-[4px_4px_0_#101010]">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <h3 className="text-xl font-black">{card.label}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">{card.value}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectFallback({ project, index }) {
  return (
    <div className="rounded-[24px] border-[3px] border-[#101010] bg-white">
      <div className="flex h-11 items-center gap-2 border-b-[3px] border-[#101010] bg-[#e8dfd2] px-4">
        <span className="h-3 w-3 rounded-full bg-[#ff6a2a]" />
        <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
        <span className="h-3 w-3 rounded-full bg-[#8fd19e]" />
      </div>
      <div className="p-4">
        {index % 3 === 1 ? (
          <>
            <div className="rounded-[18px] border-2 border-[#101010] bg-[linear-gradient(135deg,#111,#444)] p-5 text-white">
              <strong className="text-2xl">{project?.title || 'Project'}</strong>
              <span className="mt-4 block h-2 rounded-full bg-white/15" />
              <span className="mt-2 block h-2 w-2/3 rounded-full bg-white/15" />
            </div>
            <div className="mt-3 grid grid-cols-[0.9fr_1.1fr] gap-3">
              <div className="min-h-[86px] rounded-2xl bg-[#e8dfd2]" />
              <div className="min-h-[86px] rounded-2xl bg-[#e8dfd2]" />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {['#ffe1d3', '#fff2c7', '#d8ebff', '#fadfff', '#d9f5df', '#ffdbe8'].map((color) => (
              <div key={color} className="min-h-[86px] rounded-2xl border-2 border-[#101010]/10" style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectVisual({ project, index }) {
  const image = getSafeImage(project?.image);
  if (!image) return <ProjectFallback project={project} index={index} />;

  return (
    <div className="overflow-hidden rounded-[24px] border-[3px] border-[#101010] bg-white">
      <div className="flex h-11 items-center gap-2 border-b-[3px] border-[#101010] bg-[#e8dfd2] px-4">
        <span className="h-3 w-3 rounded-full bg-[#ff6a2a]" />
        <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
        <span className="h-3 w-3 rounded-full bg-[#8fd19e]" />
      </div>
      <div className="relative min-h-[310px]">
        <img src={image} alt={project?.title || 'Project image'} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#101010]/85 to-transparent p-5 pt-24">
          <p className="line-clamp-2 text-2xl font-black text-white">{project?.title}</p>
        </div>
      </div>
    </div>
  );
}

function WorkSection({ profileSlug }) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 3;
  const { data, error, isLoading } = useSWR(withProfile('/api/portfolio', profileSlug), fetcher);
  const projects = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const pageItems = projects.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [projects.length]);

  return (
    <section id="portfolio" className="mt-7">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <SectionTitle
          eyebrow="Selected Work"
          title="Projects shown like product solutions."
          desc="Each project is treated like a real system with its own summary, stack, and value proposition."
        />
        <a href="#contact" className="w-fit rounded-full border-2 border-[#101010] bg-[#fffdf8] px-5 py-4 text-sm font-black shadow-[6px_6px_0_#101010] transition hover:-translate-y-0.5">
          Start a project
        </a>
      </div>
      {error ? <p className="mb-4 rounded-2xl border-2 border-rose-700 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error.message}</p> : null}
      {isLoading ? <p className="mb-4 text-sm font-bold text-[#5f5f5f]">Loading projects...</p> : null}
      {!isLoading && !error && projects.length === 0 ? <p className="mb-4 text-sm font-bold text-[#5f5f5f]">No projects yet.</p> : null}
      <div className="grid gap-6">
        {pageItems.map((project, index) => {
          const globalIndex = (page - 1) * itemsPerPage + index;
          const tech = normalizeTech(project.tech ?? project.techStack);
          const summary = project.description ?? project.summary ?? normalizeDescriptions(project.descriptions)[0] ?? '';
          const link = isSafeHttpUrl(project.demoUrl) ? project.demoUrl : '';
          const repo = isSafeHttpUrl(project.repoUrl) ? project.repoUrl : '';

          return (
            <article key={project.id ?? project.slug ?? `${project.title}-${globalIndex}`} className="grid gap-5 rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-5 shadow-[8px_8px_0_#101010] lg:grid-cols-[0.95fr_1.05fr]">
              <ProjectVisual project={project} index={globalIndex} />
              <div className="flex flex-col justify-between gap-6 p-1">
                <div>
                  <span className="inline-flex rounded-full border-2 border-[#101010] bg-[#e8dfd2] px-4 py-2 text-xs font-black">{project.badge || 'Featured Project'}</span>
                  <h3 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-[#101010] md:text-4xl">{project.title}</h3>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-[#5f5f5f]">{summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tech.slice(0, 6).map((item) => (
                      <span key={`${project.id ?? project.slug}-${item}`} className="rounded-full border-2 border-[#101010] bg-[#fffdf8] px-3 py-2 text-xs font-black">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-[#101010] bg-[#101010] px-5 py-3 text-sm font-black text-white shadow-[6px_6px_0_#101010]">
                      View project <Icon name="arrow" className="h-4 w-4" />
                    </a>
                  ) : null}
                  {repo ? (
                    <a href={repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-[#101010] bg-[#fffdf8] px-5 py-3 text-sm font-black text-[#101010] shadow-[6px_6px_0_#101010]">
                      Source <Icon name="github" className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <div className="mt-7 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1} className="rounded-full border-2 border-[#101010] bg-[#fffdf8] px-4 py-2 text-sm font-black disabled:opacity-40">
            Previous
          </button>
          <span className="rounded-full bg-[#101010] px-4 py-2 text-sm font-black text-white">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page === totalPages} className="rounded-full border-2 border-[#101010] bg-[#fffdf8] px-4 py-2 text-sm font-black disabled:opacity-40">
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SkillsExperienceSection({ profileSlug }) {
  const { data: skillsData, error: skillsError, isLoading: skillsLoading } = useSWR(withProfile('/api/skills', profileSlug), fetcher);
  const { data: experienceData, error: experienceError, isLoading: experienceLoading } = useSWR(withProfile('/api/experience', profileSlug), fetcher);
  const skills = Array.isArray(skillsData) ? skillsData : [];
  const experienceItems = Array.isArray(experienceData) ? experienceData : [];
  const loading = skillsLoading || experienceLoading;
  const error = skillsError || experienceError;

  return (
    <section id="experience" className="mt-7">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div id="skills" className="rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-7 shadow-[8px_8px_0_#101010]">
          <SectionTitle eyebrow="Skills" title="Balanced stack for shipping useful systems." desc="Frontend, backend, database work, reporting, dashboards, and deployment." />
          {loading ? <p className="mt-4 text-sm font-bold text-[#5f5f5f]">Loading experience data...</p> : null}
          {error ? <p className="mt-4 text-sm font-bold text-rose-700">{error.message}</p> : null}
          <div className="mt-6 grid gap-4">
            {skills.map((skill) => (
              <div key={skill.id} className="rounded-[20px] border-2 border-[#101010] bg-[#e8dfd2] p-4">
                <div className="mb-3 flex items-center justify-between gap-3 font-black">
                  <span className="truncate">{skill.name}</span>
                  <span className="rounded-full border-2 border-[#101010] bg-white px-3 py-1 text-xs shadow-[4px_4px_0_#101010]">{skill.level}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border-2 border-[#101010] bg-white">
                  <span className="block h-full rounded-full bg-[#101010]" style={{ width: `${skill.level}%` }} />
                </div>
              </div>
            ))}
            {skills.length === 0 && !loading ? <p className="text-sm font-bold text-[#5f5f5f]">No skills published yet.</p> : null}
          </div>
        </div>

        <div className="rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-7 shadow-[8px_8px_0_#101010]">
          <SectionTitle eyebrow="Experience" title="Professional timeline." desc="A cleaner way to show your experience without making the section boring." />
          <div className="relative mt-6 grid gap-5 before:absolute before:bottom-0 before:left-3 before:top-0 before:w-[3px] before:bg-[#101010]">
            {experienceItems.map((item, index) => (
              <article key={item.id} className="relative pl-10">
                <span className="absolute left-0 top-2 h-6 w-6 rounded-full border-[3px] border-[#101010] bg-[#ff6a2a]" />
                <div className="rounded-[24px] border-2 border-[#101010] bg-[#e8dfd2] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-black text-[#5f5f5f]">
                        {item.company} - {formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : 'Present'}
                      </p>
                    </div>
                    {item.isCurrent ? <span className="w-fit rounded-full border-2 border-[#101010] bg-[#fffdf8] px-3 py-1 text-xs font-black">Current</span> : null}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#5f5f5f]">{item.description}</p>
                </div>
              </article>
            ))}
            {experienceItems.length === 0 && !loading ? <p className="pl-10 text-sm font-bold text-[#5f5f5f]">No experience entries yet.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CertificatesSection({ profileSlug }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const { data, error } = useSWR(withProfile('/api/certificates', profileSlug), fetcher);
  const items = Array.isArray(data) ? data : [];
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))], [items]);
  const sortedItems = useMemo(() => [...items].sort(compareCertificatesByIssuedAtDesc), [items]);
  const filteredItems = activeCategory === 'All' ? sortedItems : sortedItems.filter((item) => item.category === activeCategory);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const pageItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, items.length]);

  return (
    <section id="certificates" className="mt-7">
      <div className="rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-7 shadow-[8px_8px_0_#101010]">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <SectionTitle eyebrow="Certificates" title="Compact proof gallery." desc="A certificate section that feels lighter and more organized." />
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setActiveCategory(category)} className={cx('rounded-full border-2 border-[#101010] px-4 py-2 text-xs font-black', activeCategory === category ? 'bg-[#101010] text-white' : 'bg-[#fffdf8] text-[#101010]')}>
                {category}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="mb-4 text-sm font-bold text-rose-700">{error.message}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((cert, index) => {
            const certificateImage = getSafeImage(cert.image);
            const isPdf = isPdfAssetUrl(cert.image);
            return (
              <article key={`${cert.id ?? 'cert'}-${cert.title}-${index}`} className="overflow-hidden rounded-[24px] border-2 border-[#101010] bg-[#fffdf8]">
                <div className="grid min-h-[150px] place-items-center bg-[linear-gradient(135deg,#fff1ea,#fff9ef,#fff)] p-4">
                  {certificateImage && !isPdf ? (
                    <img src={certificateImage} alt={`${cert.title} certificate`} className="h-32 w-full rounded-[18px] border-2 border-[#101010] object-cover" />
                  ) : (
                    <div className="grid h-28 w-full max-w-[230px] place-items-center rounded-[18px] border-2 border-[#101010] bg-white p-3 text-center">
                      <Icon name="file" className="h-8 w-8 text-[#ff6a2a]" />
                      <p className="text-xs font-black">{isPdf ? 'PDF Certificate' : cert.credentialId || cert.issuer}</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-base font-black leading-snug">{cert.title}</h3>
                  <p className="mt-2 text-sm font-bold text-[#5f5f5f]">{cert.issuer}</p>
                  {cert.issuedAt ? <p className="mt-1 text-xs font-bold text-[#5f5f5f]">Issued {new Date(cert.issuedAt).toLocaleDateString()}</p> : null}
                  {isSafeHttpUrl(cert.link) ? (
                    <a href={cert.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[#101010] bg-[#101010] px-4 py-2 text-xs font-black text-white">
                      Verify <Icon name="arrowUp" className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        {totalPages > 1 ? (
          <div className="mt-7 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1} className="rounded-full border-2 border-[#101010] bg-[#fffdf8] px-4 py-2 text-sm font-black disabled:opacity-40">
              Previous
            </button>
            <span className="rounded-full bg-[#101010] px-4 py-2 text-sm font-black text-white">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page === totalPages} className="rounded-full border-2 border-[#101010] bg-[#fffdf8] px-4 py-2 text-sm font-black disabled:opacity-40">
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const initialForm = { name: '', email: '', message: '' };
const sanitizeInput = (value) => value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trimStart();

function ContactSection() {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const startGlobalLoading = useLoadingStore((state) => state.startLoading);
  const stopGlobalLoading = useLoadingStore((state) => state.stopLoading);

  const validateForm = ({ name, email, message }) => {
    const nextErrors = { ...initialForm };
    if (!/^[A-Za-z\s]{3,60}$/.test(name.trim())) nextErrors.name = 'Enter a valid name (3-60 letters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (message.trim().length < 10 || message.trim().length > 800) nextErrors.message = 'Message must be between 10 and 800 characters.';
    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: sanitizeInput(value) }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setFormError('');

    if (Object.values(validationErrors).some(Boolean)) return;

    setLoading(true);
    startGlobalLoading('Sending your message');
    try {
      const promise = fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).then(async (res) => {
        if (!res.ok) throw await parseErrorResponse(res, 'Failed to send message');
        return res.json();
      });

      toast.promise(promise, {
        loading: 'Sending message...',
        success: (data) => {
          if (data.success) return 'Message sent successfully!';
          throw new Error('Failed');
        },
        error: (error) => (error instanceof Error ? error.message : 'Failed to send message'),
      });

      const data = await promise;
      if (data.success) {
        setIsSubmitted(true);
        setFormData(initialForm);
      }
    } catch (submitError) {
      const nextError = normalizeFormError(submitError, 'Failed to send message');
      setFormError(nextError.formError);
      setErrors((prev) => ({
        ...prev,
        name: nextError.fieldErrors?.name?.[0] || prev.name,
        email: nextError.fieldErrors?.email?.[0] || prev.email,
        message: nextError.fieldErrors?.message?.[0] || prev.message,
      }));
    } finally {
      setLoading(false);
      stopGlobalLoading();
    }
  };

  return (
    <section id="contact" className="mt-7">
      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[28px] border-[3px] border-[#101010] bg-[linear-gradient(135deg,#ff6a2a,#ff905d)] p-7 text-white shadow-[8px_8px_0_#101010]">
          <SectionTitle dark eyebrow="Contact" title="Let's build something useful." desc="Have a system idea, internal workflow problem, or portfolio collaboration? Send a message and let's talk about the practical next step." />
          <div className="mt-6 grid gap-3">
            {['jonderecknifas@gmail.com', 'Philippines', 'Open for opportunities'].map((item) => (
              <div key={item} className="rounded-[18px] border-2 border-white/45 bg-white/15 px-4 py-4 font-black">{item}</div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border-[3px] border-[#101010] bg-[#fffdf8] p-7 shadow-[8px_8px_0_#101010]">
          {isSubmitted ? (
            <div className="grid min-h-[360px] place-items-center text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[#101010] bg-[#ff6a2a] text-white">
                  <Icon name="check" />
                </div>
                <h3 className="mt-4 text-2xl font-black">Message sent successfully.</h3>
                <button type="button" onClick={() => setIsSubmitted(false)} className="mt-5 rounded-full border-2 border-[#101010] bg-[#101010] px-5 py-3 text-sm font-black text-white">
                  Send another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="grid gap-4">
              <FormErrorSummary error={formError} fieldErrors={{}} />
              <div>
                <input className="w-full rounded-[18px] border-2 border-[#101010] bg-[#e8dfd2] px-5 py-4 font-bold text-[#101010] outline-none placeholder:text-[#5f5f5f]" placeholder="Your name" name="name" value={formData.name} onChange={handleChange} maxLength={60} required />
                {errors.name ? <p className="mt-1 text-sm font-bold text-rose-700">{errors.name}</p> : null}
              </div>
              <div>
                <input className="w-full rounded-[18px] border-2 border-[#101010] bg-[#e8dfd2] px-5 py-4 font-bold text-[#101010] outline-none placeholder:text-[#5f5f5f]" placeholder="Email address" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={120} required />
                {errors.email ? <p className="mt-1 text-sm font-bold text-rose-700">{errors.email}</p> : null}
              </div>
              <div>
                <textarea className="min-h-40 w-full resize-y rounded-[18px] border-2 border-[#101010] bg-[#e8dfd2] px-5 py-4 font-bold text-[#101010] outline-none placeholder:text-[#5f5f5f]" placeholder="Tell me about your project..." name="message" value={formData.message} onChange={handleChange} maxLength={800} required />
                {errors.message ? <p className="mt-1 text-sm font-bold text-rose-700">{errors.message}</p> : null}
              </div>
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#101010] bg-[#101010] px-5 py-4 text-sm font-black text-white shadow-[6px_6px_0_#101010] disabled:opacity-60">
                {loading ? 'Sending...' : 'Send Message'} <Icon name="send" className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer({ config }) {
  const logoText = typeof config?.logoText === 'string' && config.logoText.trim() ? config.logoText.trim() : 'Jon D. Nifas';
  return (
    <footer className="py-7 text-sm font-bold text-[#5f5f5f]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#101010]/10 pt-6">
        <div>(c) 2026 {logoText}. Neo editorial portfolio.</div>
        <div>Sticky rail / Editorial layout / Responsive design</div>
      </div>
    </footer>
  );
}

export default function NeoEditorialPortfolio({ profileSlug = null, siteContent, siteConfig, darkMode = false, onToggleDark }) {
  const links = useMemo(() => normalizeLinks(siteConfig), [siteConfig]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,106,42,.10),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(255,209,102,.16),transparent_24%),#f3efe7] font-sans text-[#101010] selection:bg-[#ff6a2a] selection:text-white">
      <MobileTopbar config={siteConfig} links={links} darkMode={darkMode} onToggleDark={onToggleDark} />
      <div className="grid min-h-screen xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar config={siteConfig} links={links} darkMode={darkMode} onToggleDark={onToggleDark} />
        <main className="mx-auto w-[min(1380px,calc(100%-20px))] py-5 md:w-[min(1380px,calc(100%-32px))] md:py-7">
          <HeroSection hero={siteContent?.hero} about={siteContent?.about} profileSlug={profileSlug} />
          <AboutSection about={siteContent?.about} />
          <WorkSection profileSlug={profileSlug} />
          <SkillsExperienceSection profileSlug={profileSlug} />
          <CertificatesSection profileSlug={profileSlug} />
          <ContactSection />
          <Footer config={siteConfig} />
        </main>
      </div>
    </div>
  );
}
