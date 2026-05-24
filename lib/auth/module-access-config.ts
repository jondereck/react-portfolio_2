import type { UserRole } from '@prisma/client';

export const ADMIN_MODULE_IDS = [
  'portfolio',
  'gallery',
  'mediaScraper',
  'users',
  'navigation',
  'integrations',
  'security',
] as const;

export const MODULE_ACCESS_ACTIONS = ['view', 'createUpdate', 'delete', 'configure'] as const;
export const CONFIGURABLE_ACCESS_ROLES = ['admin', 'editor', 'viewer'] as const;

export type AdminModuleId = (typeof ADMIN_MODULE_IDS)[number];
export type ModuleAccessAction = (typeof MODULE_ACCESS_ACTIONS)[number];
export type ConfigurableAccessRole = (typeof CONFIGURABLE_ACCESS_ROLES)[number];
export type ModuleActionAccess = Record<ModuleAccessAction, boolean>;
export type RoleModuleAccess = Record<AdminModuleId, ModuleActionAccess>;
export type RoleModuleAccessMatrix = Record<ConfigurableAccessRole, RoleModuleAccess>;

export const ADMIN_MODULES: Array<{ id: AdminModuleId; label: string; description: string }> = [
  { id: 'portfolio', label: 'Portfolio', description: 'Homepage, projects, skills, certificates, and experience.' },
  { id: 'gallery', label: 'Gallery', description: 'Albums, media, imports, arrangement, and gallery tools.' },
  { id: 'mediaScraper', label: 'Media Scraper', description: 'Preview and download media from external pages.' },
  { id: 'users', label: 'Users', description: 'Account approval, role assignment, and user maintenance.' },
  { id: 'navigation', label: 'Navigation', description: 'Public navigation labels, links, and visibility.' },
  { id: 'integrations', label: 'Integrations', description: 'Cloudinary, Google Drive, email, and automation controls.' },
  { id: 'security', label: 'Security', description: 'Session, rate limit, and access policy controls.' },
];

const noAccess = (): ModuleActionAccess => ({
  view: false,
  createUpdate: false,
  delete: false,
  configure: false,
});

const viewOnly = (): ModuleActionAccess => ({
  ...noAccess(),
  view: true,
});

const editable = (): ModuleActionAccess => ({
  view: true,
  createUpdate: true,
  delete: false,
  configure: false,
});

const deletable = (): ModuleActionAccess => ({
  view: true,
  createUpdate: true,
  delete: true,
  configure: false,
});

export const fullModuleActionAccess = (): ModuleActionAccess => ({
  view: true,
  createUpdate: true,
  delete: true,
  configure: true,
});

export const defaultRoleModuleAccess: RoleModuleAccessMatrix = {
  admin: {
    portfolio: deletable(),
    gallery: deletable(),
    mediaScraper: editable(),
    users: noAccess(),
    navigation: viewOnly(),
    integrations: viewOnly(),
    security: viewOnly(),
  },
  editor: {
    portfolio: editable(),
    gallery: editable(),
    mediaScraper: editable(),
    users: noAccess(),
    navigation: viewOnly(),
    integrations: viewOnly(),
    security: viewOnly(),
  },
  viewer: {
    portfolio: viewOnly(),
    gallery: viewOnly(),
    mediaScraper: viewOnly(),
    users: noAccess(),
    navigation: viewOnly(),
    integrations: viewOnly(),
    security: viewOnly(),
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function normalizeRoleModuleAccess(value: unknown): RoleModuleAccessMatrix {
  const source = isPlainObject(value) ? value : {};

  return Object.fromEntries(
    CONFIGURABLE_ACCESS_ROLES.map((role) => {
      const roleSource = isPlainObject(source[role]) ? source[role] : {};
      const modules = Object.fromEntries(
        ADMIN_MODULE_IDS.map((moduleId) => {
          const moduleSource = isPlainObject(roleSource[moduleId]) ? roleSource[moduleId] : {};
          const defaults = defaultRoleModuleAccess[role][moduleId];

          return [
            moduleId,
            Object.fromEntries(
              MODULE_ACCESS_ACTIONS.map((action) => [
                action,
                typeof moduleSource[action] === 'boolean' ? moduleSource[action] : defaults[action],
              ]),
            ),
          ];
        }),
      ) as RoleModuleAccess;

      return [role, modules];
    }),
  ) as RoleModuleAccessMatrix;
}

export function getSuperAdminModuleAccess(): RoleModuleAccess {
  return Object.fromEntries(ADMIN_MODULE_IDS.map((moduleId) => [moduleId, fullModuleActionAccess()])) as RoleModuleAccess;
}

export function getRoleModuleAccess(role: UserRole, matrix: RoleModuleAccessMatrix): RoleModuleAccess {
  if (role === 'super_admin') {
    return getSuperAdminModuleAccess();
  }

  return matrix[role as ConfigurableAccessRole] ?? normalizeRoleModuleAccess(null).viewer;
}

export function hasModuleActionAccess(
  role: UserRole,
  matrix: RoleModuleAccessMatrix,
  moduleId: AdminModuleId,
  action: ModuleAccessAction,
) {
  if (role === 'super_admin') {
    return true;
  }

  return Boolean(getRoleModuleAccess(role, matrix)[moduleId]?.[action]);
}
