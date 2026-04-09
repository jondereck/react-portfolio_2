import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-scroll';
import heroFallbackImage from '../assets/heroImage.jpg';

const fallbackHero = {
  eyebrow: 'Frontend Engineering',
  title: 'Front-End Developer building scalable, high-performance web apps',
  description:
    'I design polished web experiences with React, Next.js, Tailwind CSS, and Prisma—focused on performance, maintainable architecture, and business impact.',
  primaryCtaLabel: 'View Projects',
  primaryCtaHref: '#portfolio',
  secondaryCtaLabel: 'Download Resume',
  secondaryCtaHref: '/resume.pdf',
  image: '',
};

const useHeroContent = () => {
  const [content, setContent] = useState(fallbackHero);

  useEffect(() => {
    const loadSiteContent = async () => {
      const response = await fetch('/api/site-content', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const hero = payload?.hero;
      if (!hero || typeof hero !== 'object') return;
      setContent((prev) => ({
        eyebrow: typeof hero.eyebrow === 'string' ? hero.eyebrow : prev.eyebrow,
        title: typeof hero.title === 'string' ? hero.title : prev.title,
        description: typeof hero.description === 'string' ? hero.description : prev.description,
        primaryCtaLabel: typeof hero.primaryCtaLabel === 'string' ? hero.primaryCtaLabel : prev.primaryCtaLabel,
        primaryCtaHref: typeof hero.primaryCtaHref === 'string' ? hero.primaryCtaHref : prev.primaryCtaHref,
        secondaryCtaLabel:
          typeof hero.secondaryCtaLabel === 'string' ? hero.secondaryCtaLabel : prev.secondaryCtaLabel,
        secondaryCtaHref:
          typeof hero.secondaryCtaHref === 'string' ? hero.secondaryCtaHref : prev.secondaryCtaHref,
        image: typeof hero.image === 'string' ? hero.image : prev.image,
      }));
    };

    loadSiteContent();
  }, []);

  return content;
};

const Hero = () => {
  const content = useHeroContent();

  const heroImageSrc = content.image?.length ? content.image : heroFallbackImage;

  const renderCta = useMemo(() => {
    const isAnchorLink = (href) => typeof href === 'string' && href.startsWith('#');

    const primary = isAnchorLink(content.primaryCtaHref) ? (
      <Link
        to={content.primaryCtaHref.replace('#', '')}
        smooth
        duration={550}
        className="cursor-pointer rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/50"
      >
        {content.primaryCtaLabel}
      </Link>
    ) : (
      <a
        href={content.primaryCtaHref}
        className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/50"
      >
        {content.primaryCtaLabel}
      </a>
    );

    const secondary = isAnchorLink(content.secondaryCtaHref) ? (
      <Link
        to={content.secondaryCtaHref.replace('#', '')}
        smooth
        duration={550}
        className="cursor-pointer rounded-full border border-slate-300 px-7 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-cyan-300"
      >
        {content.secondaryCtaLabel}
      </Link>
    ) : (
      <a
        href={content.secondaryCtaHref}
        className="rounded-full border border-slate-300 px-7 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-cyan-300"
      >
        {content.secondaryCtaLabel}
      </a>
    );

    return { primary, secondary };
  }, [content]);

  return (
    <section name="home" className="w-full px-4 pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="space-y-6"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-500">{content.eyebrow}</p>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 dark:text-slate-100 md:text-5xl lg:text-6xl">
            {content.title}
          </h1>
          <p className="max-w-xl text-base text-slate-600 dark:text-slate-300 md:text-lg">{content.description}</p>
          <div className="flex flex-wrap items-center gap-4">
            {renderCta.primary}
            {renderCta.secondary}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          className="mx-auto w-full max-w-sm"
        >
          <div className="rounded-3xl bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-transparent p-1 shadow-2xl shadow-cyan-500/20">
            <img src={heroImageSrc} alt={content.title} className="w-full rounded-[1.4rem] object-cover" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
