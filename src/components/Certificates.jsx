import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import Link from 'next/link';

const Certificates = () => {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState('');

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category));
    return ['All', ...Array.from(unique)];
  }, [items]);

  const filteredCertificates = useMemo(() => {
    if (activeCategory === 'All') {
      return items;
    }
    return items.filter((item) => item.category === activeCategory);
  }, [activeCategory, items]);

  const loadCertificates = async () => {
    const response = await fetch('/api/certificates', { cache: 'no-store' });
    if (response.ok) {
      const certificateData = await response.json();
      setItems(certificateData);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  return (
    <SectionContainer
      name="certificates"
      title="Certificates"
      subtitle="Verified learning milestones across frontend, backend, and data tracks."
    >
      <div className="mb-6 flex justify-end">
        <Link
          href="/admin"
          className="rounded-full border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-600 transition hover:bg-cyan-500 hover:text-white dark:text-cyan-300"
        >
          Go to Admin Page
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeCategory === category
                ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCertificates.map((item) => (
          <motion.article
            key={item.id}
            whileHover={{ y: -6 }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <button type="button" className="w-full" onClick={() => setSelectedImage(item.image)}>
              <img src={item.image} alt={`${item.title} certificate`} className="h-48 w-full object-cover" />
            </button>
            <div className="space-y-2 p-4">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-slate-500">{item.issuer}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.category}</span>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-cyan-400 px-3 py-1 text-xs font-semibold text-cyan-600 transition hover:bg-cyan-500 hover:text-white dark:text-cyan-300"
                >
                  Verify
                </a>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <Dialog open={Boolean(selectedImage)} onClose={() => setSelectedImage('')} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white p-3 dark:bg-slate-900">
            <img src={selectedImage} alt="Certificate preview" className="max-h-[80vh] w-full object-contain" />
          </Dialog.Panel>
        </div>
      </Dialog>
    </SectionContainer>
  );
};

export default Certificates;
