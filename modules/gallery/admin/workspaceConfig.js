export const galleryWorkspaceTabs = [
  { id: 'albums', label: 'Albums' },
  { id: 'media', label: 'Media' },
  { id: 'arrange', label: 'Arrange' },
  { id: 'settings', label: 'Settings' },
];

const galleryWorkspaceLegacyTabs = {
  photos: 'media',
  details: 'settings',
  manage: 'albums',
  import: 'media',
};

export function normalizeGalleryWorkspaceTab(value) {
  if (value === 'workspace') {
    return 'workspace';
  }

  const normalized = galleryWorkspaceLegacyTabs[value] ?? value;

  if (galleryWorkspaceTabs.some((tab) => tab.id === normalized)) {
    return normalized;
  }

  return 'albums';
}

export function buildGalleryRouteHref(tab = 'albums') {
  const normalized = normalizeGalleryWorkspaceTab(tab);

  if (normalized === 'workspace') {
    return '/admin/gallery/workspace';
  }

  return `/admin/gallery/${normalized}`;
}

export function buildGalleryWorkspaceHref(tab = 'albums') {
  return buildGalleryRouteHref(tab);
}
