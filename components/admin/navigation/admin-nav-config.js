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
      { label: 'Portfolio', href: '/admin/portfolio', iconKey: 'folderOpen' },
      { label: 'Gallery', href: '/admin/gallery', iconKey: 'images' },
      { label: 'Media Scraper', href: '/admin/media-scraper', iconKey: 'globe' },
    ],
  },
  {
    title: 'Site Management',
    items: [
      { label: 'Site Settings', href: '/admin/settings', iconKey: 'settings' },
      { label: 'Users', href: '/admin/users', iconKey: 'users' },
      { label: 'Navigation', href: '/admin/navigation', iconKey: 'map' },
      { label: 'Integrations', href: '/admin/integrations', iconKey: 'plug' },
      { label: 'Security', href: '/admin/security', iconKey: 'shield' },
    ],
  },
];
