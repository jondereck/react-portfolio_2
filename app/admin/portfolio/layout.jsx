import { requirePageModuleAccess } from '@/lib/auth/session';

export default async function PortfolioAdminLayout({ children }) {
  await requirePageModuleAccess('portfolio');
  return children;
}
