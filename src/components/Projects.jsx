import React from 'react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import Blog from '../assets/portfolio/Blog.jpg';
import RestApi from '../assets/portfolio/RestApi.jpg';
import Stay from '../assets/portfolio/Stay.jpg';
import Homestay from '../assets/portfolio/hs.png';
import Jdnp from '../assets/portfolio/pt.png';
import Genio from '../assets/portfolio/Genio.png';

const projects = [
  {
    id: 1,
    title: 'RESTful Blog API',
    image: RestApi,
    techStack: ['Node.js', 'Express', 'MongoDB'],
    description: 'Backend API for blog content, authentication, and admin operations.',
    features: ['JWT authentication', 'CRUD posts & comments', 'Role-based access'],
    link: 'https://github.com/jondereck/blog_api',
    category: 'Fullstack',
  },
  {
    id: 2,
    title: 'Blog Client',
    image: Blog,
    techStack: ['React', 'Tailwind', 'REST API'],
    description: 'Responsive blog frontend focused on clean reading and author workflows.',
    features: ['Dynamic article pages', 'Client-side routing', 'Mobile-first design'],
    link: 'https://jdnblog.netlify.app/',
    category: 'React',
  },
  {
    id: 3,
    title: 'StayC Booking',
    image: Stay,
    techStack: ['React', 'Tailwind CSS'],
    description: 'Travel booking landing experience with service highlights and conversion flow.',
    features: ['Hero search CTA', 'Feature showcase', 'Responsive cards'],
    link: 'https://stayc.netlify.app/',
    category: 'React',
  },
  {
    id: 4,
    title: 'Genio AI',
    image: Genio,
    techStack: ['Next.js', 'OpenAI API', 'Tailwind'],
    description: 'AI-powered app with fast UI interactions and contextual content generation.',
    features: ['Prompt workflows', 'Server-side rendering', 'Modern dashboard UI'],
    link: 'https://genioai.vercel.app/',
    category: 'Fullstack',
  },
  {
    id: 5,
    title: 'Homestay Website',
    image: Homestay,
    techStack: ['React', 'Tailwind CSS'],
    description: 'Hospitality site with booking-focused storytelling and visual hierarchy.',
    features: ['Property gallery', 'Location details', 'Call-to-book flow'],
    link: 'https://nifashomestay.netlify.app/',
    category: 'React',
  },
  {
    id: 6,
    title: 'Photography Portfolio',
    image: Jdnp,
    techStack: ['React', 'CSS'],
    description: 'Creative portfolio for photo/video production services.',
    features: ['Project galleries', 'Service highlights', 'Contact conversion CTA'],
    link: 'https://jdnp.netlify.app/',
    category: 'All',
  },
];

const Projects = () => {
  return (
    <SectionContainer name="portfolio" title="Portfolio" subtitle="Selected projects that combine design quality, performance, and product thinking.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <motion.article
            key={project.id}
            whileHover={{ y: -8, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-lg shadow-slate-300/30 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/20"
          >
            <img src={project.image} alt={project.title} className="h-44 w-full object-cover" />
            <div className="space-y-3 p-5">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{project.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                {project.techStack.join(' • ')}
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {project.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white transition group-hover:shadow-lg group-hover:shadow-cyan-500/30"
              >
                View Details
              </a>
            </div>
          </motion.article>
        ))}
      </div>
    </SectionContainer>
  );
};

export default Projects;
