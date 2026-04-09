import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';

const toIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const Experience = () => {
  const [skills, setSkills] = useState([]);
  const [experienceItems, setExperienceItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [skillsRes, experienceRes] = await Promise.all([
          fetch('/api/skills', { cache: 'no-store' }),
          fetch('/api/experience', { cache: 'no-store' }),
        ]);

        if (skillsRes.ok) {
          const skillData = await skillsRes.json();
          setSkills(Array.isArray(skillData) ? skillData : []);
        }

        if (experienceRes.ok) {
          const experienceData = await experienceRes.json();
          setExperienceItems(Array.isArray(experienceData) ? experienceData : []);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <SectionContainer
      name="experience"
      title="Experience & Skills"
      subtitle="Technologies and hands-on work delivered in production-ready products."
    >
      {loading ? <p className="mb-6 text-sm text-slate-500">Loading experience data…</p> : null}

      <h3 className="mb-4 text-xl font-semibold">Skills</h3>
      <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <motion.article
            key={skill.id}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
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
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h4 className="font-semibold">{item.title}</h4>
              <p className="text-sm text-slate-500">{item.company}</p>
              <p className="mt-1 text-xs text-slate-500">
                {toIsoDate(item.startDate)} - {item.endDate ? toIsoDate(item.endDate) : 'Present'}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
          </article>
        ))}
        {experienceItems.length === 0 && !loading ? <p className="text-sm text-slate-500">No experience entries yet.</p> : null}
      </div>
    </SectionContainer>
  );
};

export default Experience;
