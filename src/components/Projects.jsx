import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import useSWR from 'swr';
import { isSafeHttpUrl } from '@/lib/url-safety';

const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to load projects');
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

const normalizeDescriptions = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const Projects = ({ profileSlug = null }) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const { data, error, isLoading: loading } = useSWR(withProfile('/api/portfolio', profileSlug), fetcher);
  const projectList = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
  const totalPages = Math.ceil(projectList.length / itemsPerPage);
  const paginatedData = projectList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [projectList.length]);

  return (
    <SectionContainer name="portfolio" title="Portfolio" subtitle="Selected projects that combine design quality, performance, and product thinking.">
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error instanceof Error ? error.message : 'Unable to load projects'}
        </p>
      )}
      {loading && <p className="mb-4 text-sm text-slate-500">Loading projects…</p>}
      {!loading && !error && projectList.length === 0 && <p className="mb-4 text-sm text-slate-500">No projects yet.</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedData.map((project, index) => {
          const tech = normalizeTech(project.tech ?? project.techStack);
          const bulletItems = normalizeDescriptions(project.descriptions);
          const summary =
            project.description ??
            project.summary ??
            (Array.isArray(project.descriptions) && project.descriptions.length > 0 ? project.descriptions[0] : '');
          const link = isSafeHttpUrl(project.demoUrl) ? project.demoUrl : '';
          const secondaryLink = isSafeHttpUrl(project.repoUrl) ? project.repoUrl : '';
          return (
            <motion.article
              key={project.id ?? project.slug ?? `${project.title}-${index}`}
              whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                {project.badge ? (
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                    {project.badge}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{project.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
                {tech.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tech.map((stack) => (
                      <span
                        key={`${project.id ?? project.slug ?? index}-${stack}`}
                        className="rounded-full border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-600 dark:border-cyan-300/40 dark:text-cyan-200"
                      >
                        {stack}
                      </span>
                    ))}
                  </div>
                ) : null}
                {bulletItems.length > 0 ? (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                    {bulletItems.map((item, bulletIndex) => (
                      <li key={`${project.id ?? project.slug ?? index}-desc-${bulletIndex}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white transition group-hover:shadow-lg group-hover:shadow-cyan-500/30"
                    >
                      View Project
                    </a>
                  ) : null}
                  {secondaryLink ? (
                    <a
                      href={secondaryLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-700 dark:text-slate-200"
                    >
                      View Repo
                    </a>
                  ) : null}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                aria-disabled={page === 1}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={`project-page-${i + 1}`}>
                <PaginationLink onClick={() => setPage(i + 1)} isActive={page === i + 1}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                aria-disabled={page === totalPages}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </SectionContainer>
  );
};

export default Projects;
