import React, { useEffect, useState } from 'react';
import SectionContainer from './SectionContainer';

const fallbackAbout = {
  title: 'About',
  body: 'A quick snapshot of how I think, build, and deliver as a full-stack engineer.',
  highlights: [
    {
      label: 'Who I Am',
      value: [
        'Full-stack engineer focused on building reliable products for real users.',
        'Translates complex business goals into intuitive, production-ready interfaces.',
        'Committed to clean code, accessibility, and measurable outcomes.',
      ],
    },
    {
      label: 'What I Do',
      value: [
        'Build responsive UIs with React and Next.js using component-driven architecture.',
        'Implement scalable design systems with Tailwind CSS and reusable patterns.',
        'Ship performant features with testing, optimization, and continuous improvements.',
      ],
    },
    {
      label: 'Tech Focus',
      value: [
        'Core stack: React, Next.js, TypeScript, Tailwind CSS.',
        'Data layer: Prisma, REST APIs, GraphQL fundamentals.',
        'Workflow: GitHub, CI-ready code quality, and iterative product delivery.',
      ],
    },
  ],
};

const About = () => {
  const [about, setAbout] = useState(fallbackAbout);

  useEffect(() => {
    const loadSiteContent = async () => {
      const response = await fetch('/api/site-content', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const data = payload?.about;
      if (!data || typeof data !== 'object') return;
      setAbout((prev) => ({
        title: typeof data.title === 'string' ? data.title : prev.title,
        body: typeof data.body === 'string' ? data.body : prev.body,
        highlights: Array.isArray(data.highlights) && data.highlights.length > 0 ? data.highlights : prev.highlights,
      }));
    };

    loadSiteContent();
  }, []);

  return (
    <SectionContainer name="about" title={about.title} subtitle={about.body}>
      <div className="grid gap-5 md:grid-cols-3">
        {about.highlights.map((item, index) => (
          <article
            key={`${item.label}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <p className="text-sm uppercase tracking-wide text-slate-500">{item.label}</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-slate-600 dark:text-slate-300">
              {(Array.isArray(item.value) ? item.value : [item.value]).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
};

export default About;
