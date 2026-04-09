import React from 'react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import htmlImage from '../assets/html.png';
import css from '../assets/css.png';
import github from '../assets/github.png';
import javascript from '../assets/javascript.png';
import react from '../assets/react.png';
import tailwind from '../assets/tailwind.png';
import nextjs from '../assets/nextjs.png';
import prisma from '../assets/prisma.png';
import typescript from '../assets/typescript.png';
import mongodb from '../assets/monggodb.gif';

const skills = [
  { id: 1, icon: htmlImage, title: 'HTML', level: 92 },
  { id: 2, icon: css, title: 'CSS', level: 88 },
  { id: 3, icon: javascript, title: 'JavaScript', level: 84 },
  { id: 4, icon: react, title: 'React', level: 86 },
  { id: 5, icon: nextjs, title: 'Next.js', level: 78 },
  { id: 6, icon: tailwind, title: 'Tailwind', level: 90 },
  { id: 7, icon: typescript, title: 'TypeScript', level: 75 },
  { id: 8, icon: prisma, title: 'Prisma', level: 72 },
  { id: 9, icon: mongodb, title: 'MongoDB', level: 74 },
  { id: 10, icon: github, title: 'GitHub', level: 86 },
];

const Experience = () => {
  return (
    <SectionContainer
      name="experience"
      title="Experience & Skills"
      subtitle="Technologies I use to build scalable, maintainable products."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <motion.article
            key={skill.id}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center gap-3">
              <img src={skill.icon} alt={skill.title} className="h-12 w-12 rounded-lg object-contain" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{skill.title}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-500">Level {skill.level}%</p>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${skill.level}%` }}
              />
            </div>
          </motion.article>
        ))}
      </div>
    </SectionContainer>
  );
};

export default Experience;
