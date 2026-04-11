'use client';

import { portfolioResources } from '@/modules/portfolio/admin/resources';
import SiteContentSection from '@/modules/portfolio/admin/SiteContentSection';
import PortfolioResourceSection from '@/modules/portfolio/admin/PortfolioResourceSection';

const sectionMap = {
  homepage: 'homepage',
  projects: 'portfolio',
  skills: 'skills',
  certificates: 'certificates',
  experience: 'experience',
};

export default function PortfolioAdminWorkspace({ focusSection = null }) {
  const normalized = focusSection ? sectionMap[focusSection] ?? null : null;

  return (
    <div className="space-y-6">
      {(normalized === null || normalized === 'homepage') ? <SiteContentSection /> : null}
      {portfolioResources
        .filter((resource) => normalized === null || normalized === resource.key)
        .map((resource) => (
          <PortfolioResourceSection key={resource.key} resource={resource} />
        ))}

      {normalized === 'contact' ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">Contact Info</h2>
          <p className="mt-2 text-sm text-slate-500">
            Contact details are currently managed directly in source content. A dedicated contact admin module can be added here next.
          </p>
        </section>
      ) : null}
    </div>
  );
}
