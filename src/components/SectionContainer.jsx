import React from 'react';
import { motion } from 'framer-motion';

const SectionContainer = ({ name, title, subtitle, children, className = '' }) => {
  return (
    <motion.section
      name={name}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`w-full px-4 py-20 md:py-24 ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        {(title || subtitle) && (
          <header className="mb-10 md:mb-12">
            {title && (
              <h2 className="inline-block border-b-4 border-cyan-400 pb-2 text-3xl font-semibold md:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-300">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </motion.section>
  );
};

export default SectionContainer;
