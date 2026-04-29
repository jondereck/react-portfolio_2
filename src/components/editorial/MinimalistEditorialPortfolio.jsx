/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { compareCertificatesByIssuedAtDesc } from '@/lib/certificates';
import { normalizeFormError, parseErrorResponse } from '@/lib/form-client';
import { defaultNavigation } from '@/lib/siteContentDefaults';
import { isSafeHttpUrl } from '@/lib/url-safety';
import { useLoadingStore } from '@/store/loading';

const ADMIN_CLICK_WINDOW_MS = 550;
const initialForm = { name: '', email: '', message: '' };

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

const cx = (...classes) => classes.filter(Boolean).join(' ');
const sanitizeInput = (value) => value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trimStart();
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
const getSafeUrl = (value) => (isSafeHttpUrl(value) ? value : '');

function Icon({ name, className = 'h-4 w-4' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const icons = {
    arrowUp: (
      <>
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </>
    ),
    arrowDown: <path d="M12 5v14m0 0 5-5m-5 5-5-5" />,
    certificate: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 8h10" />
        <path d="M7 12h6" />
        <path d="m15 18 2 3 2-3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z" />
      </>
    ),
    x: (
      <>
        <path d="m18 6-12 12" />
        <path d="m6 6 12 12" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] || icons.arrowUp}</svg>;
}

const normalizeLinks = (config) => {
  const source =
    Array.isArray(config?.navigation?.links) && config.navigation.links.length > 0
      ? config.navigation.links
      : defaultNavigation.links;

  const links = source
    .filter((link) => link && link.isVisible !== false)
    .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0))
    .map((link) => {
      const target = typeof link.target === 'string' ? link.target.trim() : '';
      const normalizedTarget = target === '#about' ? '#about-me' : target;
      return {
        label: target === '#about' ? 'About Me' : typeof link.label === 'string' && link.label.trim() ? link.label.trim() : 'Link',
        target: normalizedTarget,
        type: link.type === 'url' ? 'url' : 'section',
      };
    })
    .filter((link) => link.target);

  if (!links.some((link) => link.target === '#skills')) {
    const experienceIndex = links.findIndex((link) => link.target === '#experience');
    links.splice(experienceIndex >= 0 ? experienceIndex : links.length, 0, {
      label: 'Skills',
      target: '#skills',
      type: 'section',
    });
  }

  return links;
};

function Logo({ config }) {
  const adminClickStateRef = useRef({ count: 0, timerId: null });
  const logoText = typeof config?.logoText === 'string' && config.logoText.trim() ? config.logoText.trim() : 'N System';
  const logoImage = getSafeUrl(config?.logoImage);

  const clearAdminClicks = useCallback(() => {
    if (adminClickStateRef.current.timerId) {
      window.clearTimeout(adminClickStateRef.current.timerId);
      adminClickStateRef.current.timerId = null;
    }
    adminClickStateRef.current.count = 0;
  }, []);

  const handleLogoClick = (event) => {
    const nextCount = adminClickStateRef.current.count + 1;
    if (adminClickStateRef.current.timerId) window.clearTimeout(adminClickStateRef.current.timerId);

    if (nextCount >= 3) {
      event.preventDefault();
      clearAdminClicks();
      window.location.assign('/admin/login');
      return;
    }

    adminClickStateRef.current.count = nextCount;
    adminClickStateRef.current.timerId = window.setTimeout(clearAdminClicks, ADMIN_CLICK_WINDOW_MS);
  };

  useEffect(() => () => clearAdminClicks(), [clearAdminClicks]);

  return (
    <a href="#home" onClick={handleLogoClick} className="group inline-flex items-center gap-2">
      {logoImage ? (
        <img src={logoImage} alt={logoText} className="h-8 w-8 rounded-full object-contain grayscale" />
      ) : (
        <div className="relative h-7 w-7">
          <span className="absolute left-0 top-1 h-5 w-2 rotate-[-24deg] rounded-full bg-neutral-950" />
          <span className="absolute left-[9px] top-0 h-7 w-2 rotate-[24deg] rounded-full bg-neutral-950" />
          <span className="absolute right-0 top-1 h-5 w-2 rotate-[-24deg] rounded-full bg-neutral-950" />
        </div>
      )}
      <span className="sr-only">{logoText}</span>
    </a>
  );
}

function Header({ config, links }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/90 bg-[#f7f7f5]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 lg:px-10">
        <Logo config={config} />
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-neutral-700 lg:flex">
          {links.map((item) => (
            <a key={`${item.label}-${item.target}`} href={item.target} className="transition hover:text-neutral-950">
              {item.label}
            </a>
          ))}
        </nav>
        <a href="#contact" className="hidden items-center gap-1 border-b border-neutral-950 pb-1 text-[13px] font-semibold text-neutral-950 sm:inline-flex">
          Book A Call <Icon name="arrowUp" className="h-3.5 w-3.5" />
        </a>
        <button type="button" onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full border border-neutral-300 bg-white lg:hidden" aria-label="Toggle menu">
          <Icon name={open ? 'x' : 'menu'} />
        </button>
      </div>
      {open ? (
        <div className="border-t border-neutral-200 bg-white px-6 py-4 lg:hidden">
          <nav className="grid gap-3 text-sm font-medium text-neutral-700">
            {links.map((item) => (
              <a key={`${item.label}-${item.target}`} href={item.target} onClick={() => setOpen(false)} className="rounded-2xl bg-neutral-50 px-4 py-3">
                {item.label}
              </a>
            ))}
            <a href="#contact" onClick={() => setOpen(false)} className="rounded-2xl bg-neutral-950 px-4 py-3 text-center font-semibold text-white">
              Book A Call
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function Portrait() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-[-4%] hidden h-[78%] w-[58%] lg:block">
      <div className="absolute bottom-0 right-[12%] h-[76%] w-[62%] rounded-t-[42%] bg-gradient-to-b from-neutral-300 via-neutral-200 to-neutral-100" />
      <div className="absolute bottom-[49%] right-[28%] h-[22%] w-[20%] rounded-[50%] bg-gradient-to-b from-neutral-200 to-neutral-300 shadow-[inset_0_14px_24px_rgba(0,0,0,.08)]" />
      <div className="absolute bottom-[67%] right-[25.5%] h-[12%] w-[25%] rounded-t-[70%] bg-neutral-700 blur-[.2px]" />
      <div className="absolute bottom-[60%] right-[29.5%] h-[4px] w-[7%] rounded-full bg-neutral-900" />
      <div className="absolute bottom-[60%] right-[39%] h-[4px] w-[7%] rounded-full bg-neutral-900" />
      <div className="absolute bottom-[55%] right-[33.8%] h-[2px] w-[8%] rounded-full bg-neutral-700" />
      <div className="absolute bottom-[36%] right-[26%] h-[24%] w-[25%] rounded-t-[38%] bg-gradient-to-b from-neutral-100 to-neutral-300" />
      <div className="absolute bottom-[27%] right-[24%] h-[20%] w-[30%] rounded-t-[48%] bg-gradient-to-b from-neutral-200 to-neutral-400 opacity-80" />
      <div className="absolute bottom-0 right-[10%] h-[32%] w-[65%] rounded-t-[46%] bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-400" />
      <div className="absolute bottom-[50%] right-[28.6%] h-[22%] w-[21.5%] rounded-full border-[3px] border-neutral-700 opacity-70" />
      <div className="absolute bottom-[61%] right-[37%] h-[2px] w-[10%] bg-neutral-700 opacity-70" />
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-medium uppercase text-neutral-500">{children}</p>;
}

function Hero({ hero, projects, experience }) {
  const years = (() => {
    if (experience.length === 0) return '';
    const first = experience
      .map((item) => (item?.startDate ? new Date(item.startDate).getTime() : Number.NaN))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right)[0];
    if (!Number.isFinite(first)) return '';
    return `+${Math.max(1, Math.floor((Date.now() - first) / (365.25 * 24 * 60 * 60 * 1000)))}`;
  })();
  const hasProjectMetric = projects.length > 0;
  const sideLabel = hero?.eyebrow || '';
  const recentProject = projects[0];

  return (
    <section id="home" className="relative min-h-[760px] overflow-hidden bg-[#f7f7f5] px-6 pb-10 pt-12 lg:px-10 lg:pt-16">
      <div className="absolute left-8 top-28 hidden h-[560px] w-px bg-neutral-200 lg:block" />
      {sideLabel ? <div className="absolute left-4 top-40 hidden -rotate-90 text-xs font-light text-neutral-300 lg:block">{sideLabel}</div> : null}
      <div className="absolute bottom-16 left-6 hidden -rotate-90 text-xs font-light text-neutral-300 lg:block">{new Date().getFullYear()}</div>
      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.94fr_1.06fr] lg:gap-2">
        <div className="pt-8 lg:pt-16">
          {hasProjectMetric || years ? (
            <div className="mb-10 flex gap-12 pl-0 lg:pl-16">
              {hasProjectMetric ? (
                <div>
                  <p className="text-3xl font-light text-neutral-900 sm:text-4xl">+{projects.length}</p>
                  <p className="mt-1 text-xs text-neutral-500">Projects</p>
                </div>
              ) : null}
              {years ? (
                <div>
                  <p className="text-3xl font-light text-neutral-900 sm:text-4xl">{years}</p>
                  <p className="mt-1 text-xs text-neutral-500">Years experience</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <h1 className="max-w-[640px] text-8xl font-light leading-[0.78] text-neutral-900 sm:text-[9rem] lg:text-[12rem]">
            {hero?.title || 'Portfolio'}
          </h1>
          {hero?.description ? <p className="mt-3 max-w-md text-sm font-medium text-neutral-700 sm:text-base">{hero.description}</p> : null}
          <div className="mt-24 hidden items-center gap-2 text-xs text-neutral-500 md:flex">
            Scroll down <Icon name="arrowDown" className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="relative min-h-[500px] lg:min-h-[680px]">
          {recentProject ? <div className="absolute right-0 top-14 hidden max-w-[170px] items-center gap-3 text-xs text-neutral-500 lg:flex">
            <a href="#portfolio" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e8dfd3] text-neutral-900 transition hover:scale-105">
              <Icon name="arrowUp" />
            </a>
            <span>
              Recent work
              <br />
              {recentProject.title}
            </span>
          </div> : null}
          <Portrait />
        </div>
      </div>
    </section>
  );
}

function About({ about }) {
  const highlights = Array.isArray(about?.highlights) ? about.highlights : [];
  const primaryHighlight = highlights[0];
  const quoteHighlight = highlights[1];
  const focusHighlights = highlights.slice(2);
  const hasAbout = Boolean(about?.title || about?.body || highlights.length);

  if (!hasAbout) {
    return null;
  }

  return (
    <section id="about-me" className="bg-[#f7f7f5] px-6 py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.9fr_0.62fr_1fr] lg:gap-9">
        <div className="flex min-h-[460px] flex-col justify-between">
          <div>
            <h2 className="text-5xl font-light text-neutral-950 sm:text-6xl">{about?.title || 'About Me'}</h2>
            {about?.body ? <p className="mt-6 max-w-[390px] text-sm leading-7 text-neutral-500">{about.body}</p> : null}
          </div>
          <a href="#contact" className="inline-flex w-fit items-center gap-2 border-b border-neutral-950 pb-1 text-sm font-medium text-neutral-950">
            More about me <Icon name="arrowUp" className="h-3.5 w-3.5" />
          </a>
        </div>
        {primaryHighlight ? <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-[0_18px_55px_rgba(0,0,0,.05)]">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#ebe3d8] text-neutral-950">
            <Icon name="sparkle" />
          </div>
          <p className="mt-8 text-6xl font-light text-neutral-950">{primaryHighlight.label}</p>
          <p className="mt-5 max-w-[230px] text-sm leading-7 text-neutral-500">
            {primaryHighlight.value}
          </p>
          {focusHighlights.length > 0 ? (
            <>
              <div className="my-8 h-px bg-neutral-200" />
              <div className="grid gap-3 text-sm leading-7 text-neutral-500">
                {focusHighlights.map((item) => (
                  <div key={item.label}>
                    <span className="font-medium text-neutral-700">{item.label}</span>
                    <p>{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div> : null}
        <div className="grid gap-5">
          <div className="relative min-h-[245px] overflow-hidden rounded-3xl bg-neutral-200">
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-100 to-neutral-300" />
            <div className="absolute bottom-0 left-1/2 h-52 w-40 -translate-x-1/2 rounded-t-[5rem] bg-neutral-100" />
            <div className="absolute left-1/2 top-10 h-24 w-24 -translate-x-1/2 rounded-full bg-neutral-300" />
            <div className="absolute left-1/2 top-5 h-14 w-28 -translate-x-1/2 rounded-t-full bg-neutral-700" />
          </div>
          {quoteHighlight ? <div className="rounded-3xl bg-[#efe7dc] p-8">
            <p className="text-3xl leading-none text-neutral-950">"</p>
            <p className="mt-3 max-w-xs text-xl font-light leading-8 text-neutral-950">
              {quoteHighlight.value}
            </p>
            <p className="mt-8 font-serif text-3xl italic text-neutral-700">{quoteHighlight.label}</p>
          </div> : null}
        </div>
      </div>
    </section>
  );
}

function ProjectImage({ index }) {
  return (
    <div className="relative h-52 overflow-hidden rounded-t-3xl bg-neutral-200 grayscale">
      {index % 3 === 0 ? (
        <div className="absolute inset-5 rounded-2xl bg-white p-4 shadow-xl">
          <div className="h-3 w-24 rounded-full bg-neutral-300" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="rounded-xl bg-neutral-100 p-3">
                <div className="h-2 w-10 rounded-full bg-neutral-400" />
                <div className="mt-5 h-8 rounded-lg bg-neutral-200" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {index % 3 === 1 ? (
        <div className="absolute left-1/2 top-5 h-72 w-36 -translate-x-1/2 rotate-[-12deg] rounded-[2rem] border-[10px] border-neutral-800 bg-white p-3 shadow-2xl">
          <div className="mx-auto h-3 w-12 rounded-full bg-neutral-800" />
          <div className="mt-6 h-5 rounded-full bg-neutral-300" />
          <div className="mt-4 h-24 rounded-2xl bg-neutral-100" />
          <div className="mt-4 h-4 rounded-full bg-neutral-300" />
        </div>
      ) : null}
      {index % 3 === 2 ? (
        <div className="absolute bottom-6 left-8 right-8 h-36 rounded-2xl border-[10px] border-neutral-800 bg-white p-4 shadow-2xl">
          <div className="h-4 w-32 rounded-full bg-neutral-300" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl bg-neutral-100" />
            <div className="h-16 rounded-xl bg-neutral-200" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Work({ projects, loading, error }) {
  const displayProjects = projects.slice(0, 3);

  if (!loading && !error && displayProjects.length === 0) {
    return null;
  }

  return (
    <section id="portfolio" className="bg-white px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-[1280px] rounded-[2rem] bg-[#f4f0ea] px-6 py-10 sm:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <SectionLabel>Selected Work</SectionLabel>
          <a href="#contact" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-950">
            Start a project <Icon name="arrowUp" className="h-3.5 w-3.5" />
          </a>
        </div>
        {loading ? <p className="mb-4 text-sm text-neutral-500">Loading projects...</p> : null}
        {error ? <p className="mb-4 text-sm text-rose-600">{error.message}</p> : null}
        <div className="grid gap-6 md:grid-cols-3">
          {displayProjects.map((project, index) => {
            const summary = project.description ?? project.summary ?? normalizeDescriptions(project.descriptions)[0] ?? '';
            const link = getSafeUrl(project.demoUrl) || getSafeUrl(project.repoUrl);
            const badge = project.badge || normalizeTech(project.tech ?? project.techStack)[0] || '';
            return (
              <article key={project.id ?? project.slug ?? project.title} className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(0,0,0,.05)]">
                <ProjectImage index={index} />
                <div className="p-5">
                  <p className="text-xs text-neutral-400">{String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-2 text-xl font-medium text-neutral-950">{project.title}</h3>
                  {summary ? <p className="mt-2 min-h-[54px] text-sm leading-6 text-neutral-500">{summary}</p> : null}
                  <div className="mt-5 flex items-center justify-between">
                    {badge ? <span className="text-xs text-neutral-400">{badge}</span> : <span />}
                    <a href={link || '#contact'} target={link ? '_blank' : undefined} rel={link ? 'noreferrer' : undefined} className="grid h-9 w-9 place-items-center rounded-full bg-[#ede5da] text-neutral-950">
                      <Icon name="arrowUp" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl bg-[#e9dfd2] p-6 sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-neutral-950 text-white">
              <Icon name="arrowUp" />
            </div>
            <p className="text-2xl font-light text-neutral-950">Let's create something useful together.</p>
          </div>
          <a href="#contact" className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white">
            Book a Call <Icon name="arrowUp" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Skills({ skills, loading, error }) {
  const displaySkills = skills;

  if (!loading && !error && displaySkills.length === 0) {
    return null;
  }

  return (
    <section id="skills" className="bg-[#f7f7f5] px-6 py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <SectionLabel>Skills</SectionLabel>
          <h2 className="mt-4 max-w-md text-6xl font-light leading-[0.95] text-neutral-950">Skills.</h2>
          {loading ? <p className="mt-4 text-sm text-neutral-500">Loading skills...</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error.message}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {displaySkills.map((skill) => {
            const value = Math.max(0, Math.min(100, Number(skill.level ?? 75)));
            return (
              <div key={skill.id ?? skill.name} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,.04)]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-medium text-neutral-950">{skill.name}</p>
                  <p className="text-sm text-neutral-400">{value}%</p>
                </div>
                <div className="mt-5 h-px bg-neutral-200">
                  <div className="h-px bg-neutral-950" style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Experience({ items, loading, error }) {
  const displayItems = items;

  if (!loading && !error && displayItems.length === 0) {
    return null;
  }

  return (
    <section id="experience" className="bg-white px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionLabel>Experience</SectionLabel>
            <h2 className="mt-4 max-w-md text-6xl font-light leading-[0.95] text-neutral-950">Experience.</h2>
          </div>
        </div>
        {loading ? <p className="mb-4 text-sm text-neutral-500">Loading experience...</p> : null}
        {error ? <p className="mb-4 text-sm text-rose-600">{error.message}</p> : null}
        <div className="divide-y divide-neutral-200 border-y border-neutral-200">
          {displayItems.map((item) => (
            <article key={item.id ?? `${item.title}-${item.company}`} className="grid gap-6 py-8 lg:grid-cols-[0.45fr_0.75fr_1fr]">
              <p className="text-sm text-neutral-400">
                {formatDate(item.startDate) || 'Recent'} - {item.endDate ? formatDate(item.endDate) : item.isCurrent ? 'Present' : ''}
              </p>
              <div>
                <h3 className="text-3xl font-light text-neutral-950">{item.title}</h3>
                <p className="mt-2 text-sm text-neutral-500">{item.company}</p>
              </div>
              <p className="text-sm leading-7 text-neutral-500">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Certificates({ items, error }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const sorted = useMemo(() => [...items].sort(compareCertificatesByIssuedAtDesc), [items]);
  const displayItems = sorted;
  const categories = ['All', ...Array.from(new Set(displayItems.map((item) => item.category).filter(Boolean)))];
  const filtered = activeCategory === 'All' ? displayItems : displayItems.filter((item) => item.category === activeCategory);

  if (!error && displayItems.length === 0) {
    return null;
  }

  return (
    <section id="certificates" className="bg-[#f7f7f5] px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-[1280px] rounded-[2rem] bg-[#f4f0ea] px-6 py-10 sm:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <SectionLabel>Certificates</SectionLabel>
            <h2 className="mt-4 max-w-lg text-6xl font-light leading-[0.95] text-neutral-950">Certificates.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((filter) => (
              <button key={filter} type="button" onClick={() => setActiveCategory(filter)} className={cx('rounded-full border px-4 py-2 text-xs font-medium', activeCategory === filter ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 bg-white text-neutral-600')}>
                {filter}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="mb-4 text-sm text-rose-600">{error.message}</p> : null}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cert, index) => {
            const verifyLink = getSafeUrl(cert.link);
            return (
              <article key={cert.id ?? `${cert.title}-${index}`} className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(0,0,0,.05)]">
                <div className="grid h-44 place-items-center bg-[#fbfaf7] p-5 grayscale">
                  <div className="grid h-28 w-full max-w-xs place-items-center rounded-2xl border border-neutral-200 bg-white text-center">
                    <Icon name="certificate" className="h-8 w-8 text-neutral-500" />
                    <p className="mt-2 text-xs font-medium uppercase text-neutral-400">Verified Certificate</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-neutral-400">{cert.category}</p>
                  <h3 className="mt-2 min-h-[52px] text-xl font-medium leading-tight text-neutral-950">{cert.title}</h3>
                  <p className="mt-2 text-sm text-neutral-500">{cert.issuer}</p>
                  {verifyLink ? (
                    <a href={verifyLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-neutral-950">
                      Verify <Icon name="arrowUp" className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Contact({ contact }) {
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
    <section id="contact" className="bg-white px-6 py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionLabel>Contact</SectionLabel>
          <h2 className="mt-4 max-w-lg text-6xl font-light leading-[0.95] text-neutral-950">
            Tell me about your next system.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-neutral-500">
            Send a message for portfolio collaborations, internal workflow systems, dashboards, or automation projects.
          </p>
          <div className="mt-6 grid gap-2 text-sm text-neutral-500">
            {contact?.email ? <a href={`mailto:${contact.email}`} className="hover:text-neutral-950">{contact.email}</a> : null}
            {contact?.location ? <span>{contact.location}</span> : null}
          </div>
        </div>
        <form className="rounded-[2rem] bg-[#f7f7f5] p-6 shadow-[0_18px_50px_rgba(0,0,0,.05)]" onSubmit={handleSubmit} noValidate>
          {isSubmitted ? (
            <div className="grid min-h-80 place-items-center text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-950 text-white">
                  <Icon name="mail" />
                </div>
                <h3 className="mt-4 text-2xl font-light text-neutral-950">Message sent.</h3>
                <button type="button" onClick={() => setIsSubmitted(false)} className="mt-5 rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white">
                  Send another
                </button>
              </div>
            </div>
          ) : (
            <>
              <FormErrorSummary error={formError} fieldErrors={{}} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <input className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm outline-none focus:border-neutral-500" placeholder="Your name" name="name" value={formData.name} onChange={handleChange} maxLength={60} required />
                  {errors.name ? <p className="mt-1 text-sm text-rose-600">{errors.name}</p> : null}
                </div>
                <div>
                  <input className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm outline-none focus:border-neutral-500" placeholder="Email address" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={120} required />
                  {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email}</p> : null}
                </div>
              </div>
              <div>
                <textarea className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm outline-none focus:border-neutral-500" placeholder="Tell me about your project..." name="message" value={formData.message} onChange={handleChange} maxLength={800} required />
                {errors.message ? <p className="mt-1 text-sm text-rose-600">{errors.message}</p> : null}
              </div>
              <button type="submit" disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-4 text-sm font-medium text-white disabled:opacity-60">
                {loading ? 'Sending...' : 'Send Message'} <Icon name="mail" className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function Footer({ config }) {
  const logoText = typeof config?.logoText === 'string' && config.logoText.trim() ? config.logoText.trim() : 'Jon D. Nifas';
  return (
    <footer className="border-t border-neutral-200 bg-[#f7f7f5] px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 text-sm text-neutral-500 sm:flex-row sm:items-center">
        <Logo config={config} />
        <p>(c) {new Date().getFullYear()} {logoText}. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function MinimalistEditorialPortfolio({ profileSlug = null, siteContent, siteConfig }) {
  const links = useMemo(() => normalizeLinks(siteConfig), [siteConfig]);
  const { data: projectsData, error: projectsError, isLoading: projectsLoading } = useSWR(withProfile('/api/portfolio', profileSlug), fetcher);
  const { data: skillsData, error: skillsError, isLoading: skillsLoading } = useSWR(withProfile('/api/skills', profileSlug), fetcher);
  const { data: experienceData, error: experienceError, isLoading: experienceLoading } = useSWR(withProfile('/api/experience', profileSlug), fetcher);
  const { data: certificatesData, error: certificatesError } = useSWR(withProfile('/api/certificates', profileSlug), fetcher);
  const projects = Array.isArray(projectsData) ? projectsData : Array.isArray(projectsData?.projects) ? projectsData.projects : [];
  const skills = Array.isArray(skillsData) ? skillsData : [];
  const experience = Array.isArray(experienceData) ? experienceData : [];
  const certificates = Array.isArray(certificatesData) ? certificatesData : [];

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <Header config={siteConfig} links={links} />
      <Hero hero={siteContent?.hero} projects={projects} experience={experience} />
      <About about={siteContent?.about} />
      <Work projects={projects} loading={projectsLoading} error={projectsError} />
      <Skills skills={skills} loading={skillsLoading} error={skillsError} />
      <Experience items={experience} loading={experienceLoading} error={experienceError} />
      <Certificates items={certificates} error={certificatesError} />
      <Contact contact={siteContent?.contact} />
      <Footer config={siteConfig} />
    </main>
  );
}
