import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent } from './ui/dialog';
import AdminLoginDialog from './AdminLoginDialog';
import useSWR from 'swr';

const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to load certificates');
    }
    return response.json();
  });

const Certificates = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState('');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const { data, error } = useSWR('/api/certificates', fetcher);
  const items = Array.isArray(data) ? data : [];

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
  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const paginatedData = filteredCertificates.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, items.length]);

  return (
    <SectionContainer
      name="certificates"
      title="Certificates"
      subtitle="Verified learning milestones across frontend, backend, and data tracks."
    >


      {error ? <p className="mb-4 text-sm text-rose-600 dark:text-rose-300">{error instanceof Error ? error.message : 'Unable to load certificates'}</p> : null}

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
       {paginatedData.map((item, index) => (
          <motion.article
           key={`${item.id ?? 'cert'}-${item.title}-${index}`}
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
      {totalPages > 1 ? (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                aria-disabled={page === 1}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={`certificate-page-${i + 1}`}>
                <PaginationLink onClick={() => setPage(i + 1)} isActive={page === i + 1}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                aria-disabled={page === totalPages}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <AdminLoginDialog open={open} onOpenChange={setOpen} />

      <Dialog open={Boolean(selectedImage)} onOpenChange={(isOpen) => setSelectedImage(isOpen ? selectedImage : '')}>
        <DialogContent className="max-w-4xl bg-white p-3 dark:bg-slate-900">
          <img src={selectedImage} alt="Certificate preview" className="max-h-[80vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </SectionContainer>
  );
};

export default Certificates;
