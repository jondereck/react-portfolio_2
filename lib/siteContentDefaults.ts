export const defaultHero = {
  eyebrow: 'Frontend Engineering',
  title: 'Front-End Developer building scalable, high-performance web apps',
  description:
    'I design polished web experiences with React, Next.js, Tailwind CSS, and Prisma—focused on performance, maintainable architecture, and measurable impact.',
  primaryCtaLabel: 'View Projects',
  primaryCtaHref: '#projects',
  secondaryCtaLabel: 'Download Resume',
  secondaryCtaHref: '/resume.pdf',
  image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/hero.png',
};

export const defaultAbout = {
  title: "Hi, I'm Jon Dereck Nifas — Product-focused Frontend Engineer",
  body:
    'Based in Manila, I help product teams ship reliable interfaces, ensuring accessibility, performance, and design consistency across complex systems.',
  highlights: [
    { label: 'Years Experience', value: '6+' },
    { label: 'Products Shipped', value: '24' },
    { label: 'Satisfied Clients', value: '18' },
  ],
};

export const defaultSiteContent = {
  hero: defaultHero,
  about: defaultAbout,
};
