import type { UserRole } from '@prisma/client';
import { getAdminSettings } from '@/lib/server/admin-settings';
import {
  type AdminModuleId,
  type ModuleAccessAction,
  getRoleModuleAccess,
  hasModuleActionAccess,
  normalizeRoleModuleAccess,
} from '@/lib/auth/module-access-config';

export async function getConfiguredRoleModuleAccess() {
  const settings = await getAdminSettings();
  return normalizeRoleModuleAccess(settings.security.roleModuleAccess);
}

export async function getEffectiveRoleModuleAccess(role: UserRole) {
  const matrix = await getConfiguredRoleModuleAccess();
  return getRoleModuleAccess(role, matrix);
}

export async function canAccessAdminModuleAction(
  role: UserRole,
  moduleId: AdminModuleId,
  action: ModuleAccessAction = 'view',
) {
  const matrix = await getConfiguredRoleModuleAccess();
  return hasModuleActionAccess(role, matrix, moduleId, action);
}
