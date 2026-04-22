import { ADMIN_ROLES } from '@/lib/auth/roles';
import { requirePageRole } from '@/lib/auth/session';
import MediaScraperPanel from '@/modules/media-scraper/admin/MediaScraperPanel';

export default async function AdminMediaScraperPage() {
  await requirePageRole(ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <MediaScraperPanel />
    </div>
  );
}

