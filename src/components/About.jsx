import React from 'react';
import { useEffect, useState } from 'react';
import SectionContainer from './SectionContainer';

const fallbackAboutCards = [
  {
    title: 'Who I Am',
    points: [
      'Front-end developer focused on building reliable products for real users.',
      'I enjoy translating complex business goals into intuitive interfaces.',
      'Committed to clean code, accessibility, and measurable outcomes.',
    ],
  },
  {
    title: 'What I Do',
    points: [
      'Build responsive UIs with React and Next.js using component-driven architecture.',
      'Implement scalable design systems with Tailwind CSS and reusable patterns.',
      'Ship performant features with testing, optimization, and continuous improvements.',
    ],
  },
  {
    title: 'Tech Focus',
    points: [
      'Core stack: React, Next.js, TypeScript, Tailwind CSS.',
      'Data layer: Prisma, REST APIs, GraphQL fundamentals.',
      'Workflow: GitHub, CI-ready code quality, and iterative product delivery.',
    ],
  },
];

const About = () => {
  const [cards, setCards] = useState(fallbackAboutCards);
  const [subtitle, setSubtitle] = useState('A quick snapshot of how I think, build, and deliver as a developer.');

  useEffect(() => {
    const loadSiteContent = async () => {
      const response = await fetch('/api/site-content', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const about = payload?.about;
      if (!about || typeof about !== 'object') return;

      if (typeof about.body === 'string') {
        setSubtitle(about.body);
      }

      if (Array.isArray(about.highlights) && about.highlights.length > 0) {
        const normalized = about.highlights
          .map((highlight) => {
            if (!highlight || typeof highlight !== 'object') return null;
            const label = typeof highlight.label === 'string' ? highlight.label : '';
            const value = typeof highlight.value === 'string' ? highlight.value : '';
            if (!label || !value) return null;
            return { title: label, points: [value] };
          })
          .filter(Boolean);

        if (normalized.length > 0) {
          setCards(normalized);
        }
      }
    };

    loadSiteContent();
  }, []);

  return (
    <SectionContainer name="about" title="About" subtitle={subtitle}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <h3 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{card.title}</h3>
            <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {card.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
};

export default About;
