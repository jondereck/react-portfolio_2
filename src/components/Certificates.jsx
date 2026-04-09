import React, { useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import SectionContainer from './SectionContainer';
import one from '../assets/certificates/1.png';
import two from '../assets/certificates/2.png';
import three from '../assets/certificates/3.png';
import four from '../assets/certificates/4.png';
import fours from '../assets/certificates/4.5.png';
import five from '../assets/certificates/5.png';
import six from '../assets/certificates/6.png';
import seven from '../assets/certificates/7.png';
import eight from '../assets/certificates/8.png';

const certificateItems = [
  { id: 1, src: one, verifyUrl: 'https://www.freecodecamp.org/certification/jdnifas/responsive-web-design', category: 'Frontend' },
  { id: 2, src: two, verifyUrl: 'https://www.freecodecamp.org/certification/jdnifas/javascript-algorithms-and-data-structures', category: 'Frontend' },
  { id: 3, src: three, verifyUrl: 'https://www.freecodecamp.org/certification/jdnifas/front-end-development-libraries', category: 'Frontend' },
  { id: 4, src: four, verifyUrl: 'https://www.freecodecamp.org/certification/jdnifas/back-end-development-and-apis', category: 'Backend' },
  { id: 5, src: fours, verifyUrl: 'https://www.freecodecamp.org/certification/jdnifas/data-visualization', category: 'Data' },
  { id: 6, src: five, verifyUrl: 'https://www.coursera.org/account/accomplishments/verify/YP5V8RVBBHZU', category: 'Data' },
  { id: 7, src: six, verifyUrl: 'https://www.coursera.org/account/accomplishments/verify/8ETC5KSTLHQL', category: 'Backend' },
  { id: 8, src: seven, verifyUrl: 'https://www.coursera.org/account/accomplishments/verify/GJV9Y8XAPTMQ', category: 'Backend' },
  { id: 9, src: eight, verifyUrl: 'https://www.credly.com/badges/a06939ef-9056-4613-88b0-8cfe498f94cf/public_url', category: 'Data' },
];

const categories = ['All', 'Frontend', 'Backend', 'Data'];

const Certificates = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState('');

  const filteredCertificates = useMemo(() => {
    if (activeCategory === 'All') {
      return certificateItems;
    }
    return certificateItems.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  return (
    <SectionContainer
      name="certificates"
      title="Certificates"
      subtitle="Verified learning milestones across frontend, backend, and data tracks."
    >
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
            <button type="button" className="w-full" onClick={() => setSelectedImage(item.src)}>
              <img src={item.src} alt={`${item.category} certificate`} className="h-48 w-full object-cover" />
            </button>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.category}</span>
              <a
                href={item.verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-cyan-400 px-3 py-1 text-xs font-semibold text-cyan-600 transition hover:bg-cyan-500 hover:text-white dark:text-cyan-300"
              >
                Verify
              </a>
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
