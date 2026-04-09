import React from 'react';
import SectionContainer from './SectionContainer';

const aboutCards = [
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
  return (
    <SectionContainer name="about" title="About" subtitle="A quick snapshot of how I think, build, and deliver as a developer.">
      <div className="grid gap-5 md:grid-cols-3">
        {aboutCards.map((card) => (
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
