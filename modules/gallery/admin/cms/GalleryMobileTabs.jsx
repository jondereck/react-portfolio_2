'use client';

import { Images, Info, Upload } from 'lucide-react';

const defaultTabs = [
  { id: 'media', label: 'Media', icon: Images },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'details', label: 'Details', icon: Info },
];

export default function GalleryMobileTabs({ activeTab, onChange, tabs = defaultTabs }) {
  return (
    <section className="border-b border-slate-200 px-4 py-3 sm:px-5 lg:hidden dark:border-slate-800">
      <div className="grid grid-cols-3 gap-2 rounded-[24px] bg-slate-100 p-1.5 dark:bg-slate-950/40">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange?.(tab.id)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

