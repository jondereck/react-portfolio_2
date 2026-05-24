import { requirePageModuleAccess } from '@/lib/auth/session';
import MediaScraperPanel from '@/modules/media-scraper/admin/MediaScraperPanel';

export default async function AdminMediaScraperPage() {
  await requirePageModuleAccess('mediaScraper');

  return (
    <div className="space-y-6">
      <MediaScraperPanel />
    </div>
  );
}

