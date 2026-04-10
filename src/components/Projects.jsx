import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import Blog from '../assets/portfolio/Blog.jpg';
import RestApi from '../assets/portfolio/RestApi.jpg';
import Stay from '../assets/portfolio/Stay.jpg';
import Homestay from '../assets/portfolio/hs.png';
import Jdnp from '../assets/portfolio/pt.png';
import Genio from '../assets/portfolio/Genio.png';

const fallbackProjects = [
  {
    id: 'fallback-1',
    title: 'RESTful Blog API',
    image: RestApi,
    tech: ['Node.js', 'Express', 'MongoDB'],
    description: 'Backend API for blog content, authentication, and admin operations.',
    features: ['JWT authentication', 'CRUD posts & comments', 'Role-based access'],
    demoUrl: 'https://github.com/jondereck/blog_api',
    badge: 'API',
  },
  {
    id: 'fallback-2',
    title: 'Blog Client',
    image: Blog,
    tech: ['React', 'Tailwind', 'REST API'],
    description: 'Responsive blog frontend focused on clean reading and author workflows.',
    features: ['Dynamic article pages', 'Client-side routing', 'Mobile-first design'],
    demoUrl: 'https://jdnblog.netlify.app/',
    badge: 'Frontend',
  },
  {
    id: 'fallback-3',
    title: 'StayC Booking',
    image: Stay,
    tech: ['React', 'Tailwind CSS'],
    description: 'Travel booking landing experience with service highlights and conversion flow.',
    features: ['Hero search CTA', 'Feature showcase', 'Responsive cards'],
    demoUrl: 'https://stayc.netlify.app/',
    badge: 'Landing Page',
  },
  {
    id: 'fallback-4',
    title: 'Genio AI',
    image: Genio,
    tech: ['Next.js', 'OpenAI API', 'Tailwind'],
    description: 'AI-powered app with fast UI interactions and contextual content generation.',
    features: ['Prompt workflows', 'Server-side rendering', 'Modern dashboard UI'],
    demoUrl: 'https://genioai.vercel.app/',
    badge: 'AI',
  },
  {
    id: 'fallback-5',
    title: 'Homestay Website',
    image: Homestay,
    tech: ['React', 'Tailwind CSS'],
    description: 'Hospitality site with booking-focused storytelling and visual hierarchy.',
    features: ['Property gallery', 'Location details', 'Call-to-book flow'],
    demoUrl: 'https://nifashomestay.netlify.app/',
    badge: 'Hospitality',
  },
  {
    id: 'fallback-6',
    title: 'Photography Portfolio',
    image: Jdnp,
    tech: ['React', 'CSS'],
    description: 'Creative portfolio for photo/video production services.',
    features: ['Project galleries', 'Service highlights', 'Contact conversion CTA'],
    demoUrl: 'https://jdnp.netlify.app/',
    badge: 'Creative',
  },
];

const normalizeTech = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/portfolio', { cache: 'no-store' });
        console.log('STATUS:', response.status);

        if (!response.ok) {
          const text = await response.text();
          console.error('API ERROR:', text);
          setError('Unable to load projects');
          setProjects([]);
          return;
        }

        const data = await response.json();
        const projectData = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
        if (projectData.length > 0) {
          setProjects(projectData);
        } else {
          setProjects([]);
        }
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load projects');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const projectList = projects.length > 0 ? projects : fallbackProjects;

  return (
    <SectionContainer name="portfolio" title="Portfolio" subtitle="Selected projects that combine design quality, performance, and product thinking.">
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}. Showing fallback projects instead.
        </p>
      )}
      {loading && <p className="mb-4 text-sm text-slate-500">Loading projects…</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projectList.map((project, index) => {
          const tech = normalizeTech(project.tech ?? project.techStack);
          const featureList = Array.isArray(project.features) ? project.features : [];
          const link = project.demoUrl || project.link;
          const secondaryLink = project.repoUrl || project.link;
          return (
            <motion.article
              key={project.id ?? project.slug ?? `${project.title}-${index}`}
              whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-lg shadow-slate-300/30 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/20"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                {project.badge && (
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                    {project.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col space-y-4 p-5">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{project.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
                </div>
                {tech.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tech.map((stack) => (
                      <span
                        key={stack}
                        className="rounded-full border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-600 dark:border-cyan-300/40 dark:text-cyan-200"
                      >
                        {stack}
                      </span>
                    ))}
                  </div>
                )}
                {featureList.length > 0 && (
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {featureList.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-3 pt-2">
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white transition group-hover:shadow-lg group-hover:shadow-cyan-500/30"
                    >
                      View Project
                    </a>
                  )}
                  {secondaryLink && secondaryLink !== link && (
                    <a
                      href={secondaryLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-700 dark:text-slate-200"
                    >
                      View Repo
                    </a>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </SectionContainer>
  );
};

export default Projects;
