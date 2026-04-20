export const adminNavigationSections = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', iconKey: 'layoutDashboard' },
    ],
  },
  {
    title: 'Content Management',
    items: [
      { label: 'Portfolio', href: '/admin/portfolio', iconKey: 'folderOpen' },
      { label: 'Gallery', href: '/admin/gallery', iconKey: 'images' },
    ],
  },
  {
    title: 'Site Management',
    items: [
      { label: 'My Account', href: '/admin/account', iconKey: 'user' },
      { label: 'Site Settings', href: '/admin/settings', iconKey: 'settings' },
      { label: 'Users', href: '/admin/users', iconKey: 'users' },
      { label: 'Navigation', href: '/admin/navigation', iconKey: 'map' },
      { label: 'Integrations', href: '/admin/integrations', iconKey: 'plug' },
      { label: 'Security', href: '/admin/security', iconKey: 'shield' },
    ],
  },
  {
    title: 'Future Ready',
    items: [
      { label: 'Blog (planned)', href: '/admin#future-modules', iconKey: 'sparkles' },
      { label: 'Testimonials (planned)', href: '/admin#future-modules', iconKey: 'sparkles' },
      { label: 'Services (planned)', href: '/admin#future-modules', iconKey: 'sparkles' },
      { label: 'Bookings (planned)', href: '/admin#future-modules', iconKey: 'sparkles' },
    ],
  },
];
