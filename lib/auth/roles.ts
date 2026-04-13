import type { UserRole } from '@prisma/client';

export const ADMIN_ROLES: UserRole[] = ['viewer', 'editor', 'admin', 'super_admin'];
export const CONTENT_MUTATION_ROLES: UserRole[] = ['editor', 'admin', 'super_admin'];
export const CONTENT_DELETE_ROLES: UserRole[] = ['admin', 'super_admin'];
export const GLOBAL_SETTINGS_ROLES: UserRole[] = ['super_admin'];
export const USER_MANAGEMENT_ROLES: UserRole[] = ['super_admin'];

export function hasRequiredRole(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}

export function canViewAdmin(role: UserRole) {
  return hasRequiredRole(role, ADMIN_ROLES);
}

export function canMutateContent(role: UserRole) {
  return hasRequiredRole(role, CONTENT_MUTATION_ROLES);
}

export function canDeleteContent(role: UserRole) {
  return hasRequiredRole(role, CONTENT_DELETE_ROLES);
}

export function canManageGlobalSettings(role: UserRole) {
  return hasRequiredRole(role, GLOBAL_SETTINGS_ROLES);
}

export function canManageUsers(role: UserRole) {
  return hasRequiredRole(role, USER_MANAGEMENT_ROLES);
}

export function isSuperAdmin(role: UserRole) {
  return role === 'super_admin';
}
