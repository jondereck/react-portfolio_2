import React from 'react';
import SectionContainer from './SectionContainer';

const About = ({ about }) => {
  if (!about) {
    return null;
  }

  return (
    <SectionContainer name="about" title={about.title} subtitle={about.body}>
      <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600 dark:text-slate-300 md:text-base">
        {about.highlights.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{item.label}: </span>
            {item.value}
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
};

export default About;
