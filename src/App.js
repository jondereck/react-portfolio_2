'use client';

import { useEffect, useState } from 'react';
import About from './components/About';
import Certificates from './components/Certificates';
import Contact from './components/Contact';
import Experience from './components/Experience';
import Hero from './components/Hero';
import NavBar from './components/NavBar';
import Projects from './components/Projects';
import SocialLinks from './components/SocialLinks';
import { useLoadingStore } from '@/store/loading';

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
            ? item.value.filter((line) => typeof line === 'string').join(' ')
            : '',
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [siteContent, setSiteContent] = useState(null);
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setGlobalLoading(true);
        setLoading(true);
        setLoadError('');

        const [contentResponse, configResponse] = await Promise.all([
          fetch('/api/site-content', { cache: 'no-store' }),
          fetch('/api/site-config', { cache: 'no-store' }),
        ]);

        if (!contentResponse.ok || !configResponse.ok) {
          throw new Error('Unable to load homepage content.');
        }

        const contentPayload = await contentResponse.json();
        const configPayload = await configResponse.json();

        setSiteContent({
          hero: contentPayload?.hero && typeof contentPayload.hero === 'object' ? contentPayload.hero : null,
          about:
            contentPayload?.about && typeof contentPayload.about === 'object'
              ? {
                  title: sanitizeText(contentPayload.about.title),
                  body: sanitizeText(contentPayload.about.body),
                  highlights: normalizeHighlights(contentPayload.about.highlights),
                }
              : null,
        });
        setSiteConfig(configPayload && typeof configPayload === 'object' ? configPayload : null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load homepage content.');
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    loadPageData();

    const handleRefresh = () => {
      loadPageData();
    };

    window.addEventListener('site-content-updated', handleRefresh);
    window.addEventListener('site-config-updated', handleRefresh);

    return () => {
      window.removeEventListener('site-content-updated', handleRefresh);
      window.removeEventListener('site-config-updated', handleRefresh);
    };
  }, [setGlobalLoading]);

  if (loading) {
    return null;
  }

  if (loadError) {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400">{loadError}</div>;
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <NavBar darkMode={darkMode} setDarkMode={setDarkMode} config={siteConfig} />
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
