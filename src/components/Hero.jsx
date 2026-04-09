import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-scroll';
import heroImage from '../assets/heroImage.jpg';

const Hero = () => {
  return (
    <section name="home" className="w-full px-4 pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="space-y-6"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-500">Frontend Engineering</p>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 dark:text-slate-100 md:text-5xl lg:text-6xl">
            Front-End Developer building scalable, high-performance web apps
          </h1>
          <p className="max-w-xl text-base text-slate-600 dark:text-slate-300 md:text-lg">
            I design polished web experiences with React, Next.js, Tailwind CSS, and Prisma—focused on performance,
            maintainable architecture, and business impact.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="portfolio"
              smooth
              duration={550}
              className="cursor-pointer rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/50"
            >
              View Projects
            </Link>
            <a
              href="/resume.pdf"
              download
              className="rounded-full border border-slate-300 px-7 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-cyan-300"
            >
              Download Resume
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          className="mx-auto w-full max-w-sm"
        >
          <div className="rounded-3xl bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-transparent p-1 shadow-2xl shadow-cyan-500/20">
            <img src={heroImage} alt="Portrait of Jon Dereck Nifas" className="w-full rounded-[1.4rem] object-cover" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
