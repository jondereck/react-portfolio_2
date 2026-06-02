export const adminNavigationSections = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', iconKey: 'layoutDashboard' },
    ],
  },
  {
    title: 'Module Management',
    items: [
      { label: 'Portfolio', href: '/admin/portfolio', iconKey: 'folderOpen', moduleId: 'portfolio' },
      { label: 'Gallery', href: '/admin/gallery', iconKey: 'images', moduleId: 'gallery' },
      { label: 'Media Scraper', href: '/admin/media-scraper', iconKey: 'globe', moduleId: 'mediaScraper' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Users', href: '/admin/users', iconKey: 'users', moduleId: 'users' },
      { label: 'Navigation', href: '/admin/navigation', iconKey: 'map', moduleId: 'navigation' },
      { label: 'Integrations', href: '/admin/integrations', iconKey: 'plug', moduleId: 'integrations' },
      { label: 'Security', href: '/admin/security', iconKey: 'shield', moduleId: 'security' },
    ],
  },
];

export function filterAdminNavigationSections(sections, moduleAccess) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.moduleId || moduleAccess?.[item.moduleId]?.view === true),
    }))
    .filter((section) => section.items.length > 0);
}
