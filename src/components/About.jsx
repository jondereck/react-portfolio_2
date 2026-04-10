import React from 'react';
import SectionContainer from './SectionContainer';

const About = ({ about }) => {
  if (!about) {
    return null;
  }

  return (
    <SectionContainer name="about" title={about.title} subtitle={about.body}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {about.highlights.map((item, index) => {
          const points = item.value
            .split('.')
            .map((point) => point.trim())
            .filter(Boolean);

          return (
            <article
              key={`${item.label}-${index}-${item.value.length}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">{item.label}</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {points.map((point, pointIndex) => (
                  <li key={`${item.label}-${pointIndex}-${point}`}>{point}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </SectionContainer>
  );
};

export default About;
