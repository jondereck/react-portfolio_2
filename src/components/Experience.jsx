import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import useSWR from 'swr';

const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to load experience data');
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

const toIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getInitials = (value = '') => {
  const [first = '', second = ''] = value.trim().split(' ');
  return ((first[0] || '') + (second[0] || '')).toUpperCase();
};

const renderAvatar = (src, alt, shapeClass = 'rounded-full') => (
  <div
    className={`relative h-12 w-12 overflow-hidden border border-slate-200 bg-white ${shapeClass} dark:border-slate-700 dark:bg-slate-900`}
  >
    {src ? (
      <Image src={src} alt={alt} fill sizes="48px" className="object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {getInitials(alt)}
      </span>
    )}
  </div>
);

const Experience = ({ profileSlug = null }) => {
  const { data: skillsData, error: skillsError, isLoading: skillsLoading } = useSWR(withProfile('/api/skills', profileSlug), fetcher);
  const { data: experienceData, error: experienceError, isLoading: experienceLoading } = useSWR(
    withProfile('/api/experience', profileSlug),
    fetcher,
  );
  const skills = Array.isArray(skillsData) ? skillsData : [];
  const experienceItems = Array.isArray(experienceData) ? experienceData : [];
  const loading = skillsLoading || experienceLoading;
  const error = skillsError || experienceError;

  return (
    <SectionContainer
      name="experience"
      title="Experience & Skills"
      subtitle="Technologies and hands-on work delivered in production-ready products."
    >
      {loading ? <p className="mb-6 text-sm text-slate-500">Loading experience data…</p> : null}
      {error ? <p className="mb-6 text-sm text-rose-600 dark:text-rose-300">{error instanceof Error ? error.message : 'Unable to load experience data'}</p> : null}

      <h3 className="mb-4 text-xl font-semibold">Skills</h3>
      <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <motion.article
            key={skill.id}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center gap-3">
              {renderAvatar(skill.image, `${skill.name} logo`)}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{skill.name}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {skill.category} • Level {skill.level}%
                </p>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${skill.level}%` }} />
            </div>
          </motion.article>
        ))}
        {skills.length === 0 && !loading ? <p className="text-sm text-slate-500">No skills published yet.</p> : null}
      </div>

      <h3 className="mb-4 text-xl font-semibold">Experience</h3>
      <div className="grid gap-5 md:grid-cols-2">
        {experienceItems.map((item) => (
          <article
            key={item.id}
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              {renderAvatar(item.image, `${item.company} logo`, 'rounded-2xl')}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-50">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.company}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {toIsoDate(item.startDate)} - {item.endDate ? toIsoDate(item.endDate) : 'Present'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {item.employmentType && (
                <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700">{item.employmentType}</span>
              )}
              {item.location && (
                <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700">{item.location}</span>
              )}
              {item.isCurrent && <span className="rounded-full border border-emerald-300 px-3 py-1 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300">Current</span>}
            </div>
          </article>
        ))}
        {experienceItems.length === 0 && !loading ? <p className="text-sm text-slate-500">No experience entries yet.</p> : null}
      </div>
    </SectionContainer>
  );
};

export default Experience;
