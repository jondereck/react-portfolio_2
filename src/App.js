'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';
import EditorialBentoPortfolio from './components/editorial/EditorialBentoPortfolio';
import Immersive3DPortfolio from './components/editorial/Immersive3DPortfolio';
import MinimalistEditorialPortfolio from './components/editorial/MinimalistEditorialPortfolio';
import NeoEditorialPortfolio from './components/editorial/NeoEditorialPortfolio';
import ClassicPortfolio from './components/ClassicPortfolio';
import { isPortfolioThemeId } from '@/lib/portfolioThemes';
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

const withProfile = (path, profileSlug) => {
  if (!profileSlug) {
    return path;
  }

  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}profile=${encodeURIComponent(profileSlug)}`;
};

function PortfolioNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-6 text-neutral-950">
      <section className="w-full max-w-xl border-y border-neutral-300 py-12 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-neutral-500">404</p>
        <h1 className="mt-5 text-5xl font-light tracking-tight text-neutral-950 sm:text-6xl">Page unavailable.</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-neutral-500">
          The portfolio content could not be loaded. The page may be unavailable or temporarily out of sync.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center justify-center border-b border-neutral-950 pb-1 text-sm font-medium text-neutral-950"
        >
          Back to home
        </a>
      </section>
    </main>
  );
}

const normalizeRotationMinutes = (value) => {
  const minutes = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(minutes), 60 * 24 * 30));
};

const resolveRandomTheme = ({ pool, rotationMinutes, profileSlug }) => {
  const candidates = Array.isArray(pool) ? pool.filter((value) => isPortfolioThemeId(value)) : [];
  if (candidates.length === 0) {
    return null;
  }

  const key = `portfolio_theme_rotation:${profileSlug || 'primary'}`;
  const now = Date.now();
  const rotationMs = rotationMinutes > 0 ? rotationMinutes * 60 * 1000 : 0;

  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const storedTheme = typeof parsed?.theme === 'string' ? parsed.theme : '';
      const storedAt = typeof parsed?.chosenAt === 'number' ? parsed.chosenAt : 0;
      if (rotationMs > 0 && storedTheme && candidates.includes(storedTheme) && storedAt > 0 && now - storedAt < rotationMs) {
        return storedTheme;
      }
    }
  } catch {
    // Ignore storage JSON errors and re-pick.
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    window.localStorage.setItem(key, JSON.stringify({ theme: chosen, chosenAt: now }));
  } catch {
    // Ignore storage failures.
  }
  return chosen;
};

function App({ profileSlug = null }) {
  const [darkMode, setDarkMode] = useState(false);
  const [showThemeFade, setShowThemeFade] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState(null);
  const {
    data: siteContentData,
    error: siteContentError,
    isLoading: siteContentLoading,
  } = useSWR(withProfile('/api/site-content', profileSlug), fetcher);
  const {
    data: siteConfigData,
    error: siteConfigError,
    isLoading: siteConfigLoading,
  } = useSWR(withProfile('/api/site-config', profileSlug), fetcher);

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
      contact: siteContentData?.contact && typeof siteContentData.contact === 'object' ? siteContentData.contact : null,
    }),
    [siteContentData],
  );

  const siteConfig = useMemo(
    () => (siteConfigData && typeof siteConfigData === 'object' ? siteConfigData : null),
    [siteConfigData],
  );

  const loading = siteContentLoading || siteConfigLoading;
  const loadError = siteContentError || siteConfigError;
  const portfolioTheme = siteConfig?.portfolioTheme;
  const isRandomMode = portfolioTheme === 'random';
  const randomPoolHasCandidates = isRandomMode
    ? Array.isArray(siteConfig?.portfolioThemeRandomPool) &&
      siteConfig.portfolioThemeRandomPool.some((value) => isPortfolioThemeId(value))
    : true;
  const hasValidTheme = (isRandomMode || isPortfolioThemeId(portfolioTheme)) && randomPoolHasCandidates;

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

  useEffect(() => {
    if (loading) {
      setResolvedTheme(null);
      return;
    }

    if (loadError || !siteConfig) {
      setResolvedTheme(null);
      return;
    }

    if (isRandomMode) {
      const rotationMinutes = normalizeRotationMinutes(siteConfig?.portfolioThemeRotationMinutes);
      const picked = resolveRandomTheme({
        pool: siteConfig?.portfolioThemeRandomPool,
        rotationMinutes,
        profileSlug,
      });
      setResolvedTheme(picked);
      return;
    }

    setResolvedTheme(portfolioTheme);
  }, [isRandomMode, loadError, loading, portfolioTheme, profileSlug, siteConfig]);

  if (loading) {
    return null;
  }

  if (loadError || !siteContentData || !siteConfig || !hasValidTheme) {
    return <PortfolioNotFound />;
  }

  if (!resolvedTheme) {
    return <PortfolioNotFound />;
  }

  if (resolvedTheme === 'editorial-bento') {
    return (
      <div>
        {showThemeFade ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-slate-950/10 dark:bg-white/10" /> : null}
        <EditorialBentoPortfolio
          profileSlug={profileSlug}
          siteContent={siteContent}
          siteConfig={siteConfig}
          onToggleDark={toggleDark}
        />
        <PwaInstallPrompt />
      </div>
    );
  }

  if (resolvedTheme === 'neo-editorial') {
    return (
      <div>
        {showThemeFade ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-slate-950/10 dark:bg-white/10" /> : null}
        <NeoEditorialPortfolio
          profileSlug={profileSlug}
          siteContent={siteContent}
          siteConfig={siteConfig}
          darkMode={darkMode}
          onToggleDark={toggleDark}
        />
        <PwaInstallPrompt />
      </div>
    );
  }

  if (resolvedTheme === 'immersive-3d') {
    return (
      <div>
        {showThemeFade ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-slate-950/10 dark:bg-white/10" /> : null}
        <Immersive3DPortfolio
          profileSlug={profileSlug}
          siteContent={siteContent}
          siteConfig={siteConfig}
          darkMode={darkMode}
          onToggleDark={toggleDark}
        />
        <PwaInstallPrompt />
      </div>
    );
  }

  if (resolvedTheme === 'minimalist-editorial') {
    return (
      <div>
        {showThemeFade ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-slate-950/10 dark:bg-white/10" /> : null}
        <MinimalistEditorialPortfolio
          profileSlug={profileSlug}
          siteContent={siteContent}
          siteConfig={siteConfig}
        />
        <PwaInstallPrompt />
      </div>
    );
  }

  if (resolvedTheme === 'classic') {
    return (
      <div>
        {showThemeFade ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-slate-950/10 dark:bg-white/10" /> : null}
        <ClassicPortfolio
          profileSlug={profileSlug}
          siteContent={siteContent}
          siteConfig={siteConfig}
          darkMode={darkMode}
          onToggleDark={toggleDark}
        />
        <PwaInstallPrompt />
      </div>
    );
  }

  return <PortfolioNotFound />;
}

export default App;
