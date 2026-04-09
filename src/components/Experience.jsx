import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';

const initialSkill = { name: '', level: 50, category: '' };
const initialExperience = { title: '', company: '', description: '', startDate: '', endDate: '' };

const toIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const Experience = () => {
  const [skills, setSkills] = useState([]);
  const [experienceItems, setExperienceItems] = useState([]);
  const [adminKey, setAdminKey] = useState('');
  const [skillForm, setSkillForm] = useState(initialSkill);
  const [experienceForm, setExperienceForm] = useState(initialExperience);
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editingExperienceId, setEditingExperienceId] = useState(null);

  const mutationHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', 'x-admin-key': adminKey }),
    [adminKey],
  );

  const loadData = async () => {
    const [skillsRes, experienceRes] = await Promise.all([
      fetch('/api/skills', { cache: 'no-store' }),
      fetch('/api/experience', { cache: 'no-store' }),
    ]);

    if (skillsRes.ok) {
      const skillData = await skillsRes.json();
      setSkills(skillData);
    }

    if (experienceRes.ok) {
      const experienceData = await experienceRes.json();
      setExperienceItems(experienceData);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitSkill = async (event) => {
    event.preventDefault();

    const method = editingSkillId ? 'PUT' : 'POST';
    const body = editingSkillId ? { id: editingSkillId, ...skillForm } : skillForm;
    const response = await fetch('/api/skills', {
      method,
      headers: mutationHeaders,
      body: JSON.stringify({ ...body, level: Number(skillForm.level) }),
      cache: 'no-store',
    });

    if (response.ok) {
      setSkillForm(initialSkill);
      setEditingSkillId(null);
      await loadData();
    }
  };

  const submitExperience = async (event) => {
    event.preventDefault();

    const payload = {
      ...experienceForm,
      startDate: new Date(experienceForm.startDate).toISOString(),
      endDate: experienceForm.endDate ? new Date(experienceForm.endDate).toISOString() : null,
    };

    const method = editingExperienceId ? 'PUT' : 'POST';
    const body = editingExperienceId ? { id: editingExperienceId, ...payload } : payload;

    const response = await fetch('/api/experience', {
      method,
      headers: mutationHeaders,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (response.ok) {
      setExperienceForm(initialExperience);
      setEditingExperienceId(null);
      await loadData();
    }
  };

  const deleteSkill = async (id) => {
    const response = await fetch('/api/skills', {
      method: 'DELETE',
      headers: mutationHeaders,
      body: JSON.stringify({ id }),
      cache: 'no-store',
    });

    if (response.ok) {
      await loadData();
    }
  };

  const deleteExperience = async (id) => {
    const response = await fetch('/api/experience', {
      method: 'DELETE',
      headers: mutationHeaders,
      body: JSON.stringify({ id }),
      cache: 'no-store',
    });

    if (response.ok) {
      await loadData();
    }
  };

  return (
    <SectionContainer
      name="experience"
      title="Experience & Skills"
      subtitle="Technologies and hands-on work delivered in production-ready products."
    >
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="adminKey">
          Admin Key
        </label>
        <input
          id="adminKey"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          type="password"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-cyan-400 dark:border-slate-700"
          placeholder="Required for add/edit/delete"
        />
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={submitSkill} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold">{editingSkillId ? 'Edit Skill' : 'Add Skill'}</h3>
          <div className="space-y-3">
            <input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" placeholder="Skill name" value={skillForm.name} onChange={(event) => setSkillForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" placeholder="Category" value={skillForm.category} onChange={(event) => setSkillForm((prev) => ({ ...prev, category: event.target.value }))} required />
            <input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" type="number" min={1} max={100} placeholder="Level" value={skillForm.level} onChange={(event) => setSkillForm((prev) => ({ ...prev, level: event.target.value }))} required />
            <button type="submit" className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white">{editingSkillId ? 'Update Skill' : 'Create Skill'}</button>
          </div>
        </form>

        <form onSubmit={submitExperience} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold">{editingExperienceId ? 'Edit Experience' : 'Add Experience'}</h3>
          <div className="space-y-3">
            <input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" placeholder="Title" value={experienceForm.title} onChange={(event) => setExperienceForm((prev) => ({ ...prev, title: event.target.value }))} required />
            <input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" placeholder="Company" value={experienceForm.company} onChange={(event) => setExperienceForm((prev) => ({ ...prev, company: event.target.value }))} required />
            <textarea className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" placeholder="Description" value={experienceForm.description} onChange={(event) => setExperienceForm((prev) => ({ ...prev, description: event.target.value }))} required />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" type="date" value={experienceForm.startDate} onChange={(event) => setExperienceForm((prev) => ({ ...prev, startDate: event.target.value }))} required />
              <input className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" type="date" value={experienceForm.endDate} onChange={(event) => setExperienceForm((prev) => ({ ...prev, endDate: event.target.value }))} />
            </div>
            <button type="submit" className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white">{editingExperienceId ? 'Update Experience' : 'Create Experience'}</button>
          </div>
        </form>
      </div>

      <h3 className="mb-4 text-xl font-semibold">Skills</h3>
      <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <motion.article key={skill.id} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{skill.name}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-500">{skill.category} • Level {skill.level}%</p>
              </div>
              <div className="space-x-2 text-xs">
                <button type="button" onClick={() => { setEditingSkillId(skill.id); setSkillForm({ name: skill.name, category: skill.category, level: skill.level }); }} className="rounded-full border px-2 py-1">Edit</button>
                <button type="button" onClick={() => deleteSkill(skill.id)} className="rounded-full border border-red-400 px-2 py-1 text-red-500">Delete</button>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${skill.level}%` }} />
            </div>
          </motion.article>
        ))}
      </div>

      <h3 className="mb-4 text-xl font-semibold">Experience</h3>
      <div className="grid gap-5 md:grid-cols-2">
        {experienceItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.company}</p>
                <p className="mt-1 text-xs text-slate-500">{toIsoDate(item.startDate)} - {item.endDate ? toIsoDate(item.endDate) : 'Present'}</p>
              </div>
              <div className="space-x-2 text-xs">
                <button type="button" onClick={() => { setEditingExperienceId(item.id); setExperienceForm({ title: item.title, company: item.company, description: item.description, startDate: toIsoDate(item.startDate), endDate: toIsoDate(item.endDate) }); }} className="rounded-full border px-2 py-1">Edit</button>
                <button type="button" onClick={() => deleteExperience(item.id)} className="rounded-full border border-red-400 px-2 py-1 text-red-500">Delete</button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
};

export default Experience;
