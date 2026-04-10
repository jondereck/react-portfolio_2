'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import About from './components/About';
import Certificates from './components/Certificates';
import Contact from './components/Contact';
import Experience from './components/Experience';
import Hero from './components/Hero';
import NavBar from './components/NavBar';
import Projects from './components/Projects';
import SocialLinks from './components/SocialLinks';
import { REALTIME_EVENT, REALTIME_SIGNAL_KEY, revalidatePublicData } from '@/lib/realtime';

const sanitizeText = (value) => (typeof value === 'string' ? value : '');

const normalizeHighlights = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      label: sanitizeText(item?.label),
      value:
        typeof item?.value === 'string'
          ? item.value
          : Array.isArray(item?.value)
            ? item.value.filter((line) => typeof line === 'string').join(', ')
            : '',
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
};

const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to load homepage content.');
    }
    return response.json();
  });

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [showThemeFade, setShowThemeFade] = useState(false);
  const {
    data: siteContentData,
    error: siteContentError,
    isLoading: siteContentLoading,
  } = useSWR('/api/site-content', fetcher);
  const {
    data: siteConfigData,
    error: siteConfigError,
    isLoading: siteConfigLoading,
  } = useSWR('/api/site-config', fetcher);

  const siteContent = useMemo(
    () => ({
      hero: siteContentData?.hero && typeof siteContentData.hero === 'object' ? siteContentData.hero : null,
      about:
        siteContentData?.about && typeof siteContentData.about === 'object'
          ? {
              title: sanitizeText(siteContentData.about.title),
              body: sanitizeText(siteContentData.about.body),
              highlights: normalizeHighlights(siteContentData.about.highlights),
            }
          : null,
    }),
    [siteContentData],
  );

  const siteConfig = useMemo(
    () => (siteConfigData && typeof siteConfigData === 'object' ? siteConfigData : null),
    [siteConfigData],
  );

  const loading = siteContentLoading || siteConfigLoading;
  const loadError = siteContentError || siteConfigError;

  useEffect(() => {
    const handleRefresh = () => {
      revalidatePublicData();
    };
    const handleStorage = (event) => {
      if (event.key === REALTIME_SIGNAL_KEY) {
        handleRefresh();
      }
    };

    window.addEventListener(REALTIME_EVENT, handleRefresh);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(REALTIME_EVENT, handleRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedTheme = window.localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDark = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const html = document.documentElement;
    const isDark = html.classList.contains('dark');

    if (isDark) {
      html.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      html.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    setShowThemeFade(true);
    const timer = window.setTimeout(() => {
      setShowThemeFade(false);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [darkMode]);

  if (loading) {
    return null;
  }

  if (loadError) {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400">{loadError instanceof Error ? loadError.message : 'Unable to load homepage content.'}</div>;
  }

  return (
    <div>
      {showThemeFade ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-slate-950/10 dark:bg-white/10" /> : null}
      <NavBar darkMode={darkMode} onToggleDark={toggleDark} config={siteConfig} />
      <main className="bg-slate-50 text-black transition duration-500 dark:bg-slate-950 dark:text-white">
        <Hero hero={siteContent?.hero} />
        <About about={siteContent?.about} />
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
