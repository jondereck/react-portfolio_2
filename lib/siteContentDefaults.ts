export const defaultHero = {
  eyebrow: 'Full-Stack Engineering',
  title: 'Full-Stack Engineer building scalable, high-performance web apps',
  description:
    'I design polished end-to-end experiences with Next.js, React, Tailwind CSS, and Prisma—focused on performance, maintainable architecture, and measurable impact.',
  primaryCtaLabel: 'View Projects',
  primaryCtaHref: '#portfolio',
  secondaryCtaLabel: 'Download Resume',
  secondaryCtaHref: '/resume.pdf',
  image: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/hero.png',
};

export const defaultAbout = {
  title: "Hi, I'm Jon Dereck Nifas — Product-focused Full-Stack Engineer",
  body:
    'Based in Manila, I help product teams ship reliable interfaces end to end, keeping accessibility, performance, and design consistency at the core.',
  highlights: [
    {
      label: 'Who I Am',
      value:
        'Full-stack engineer focused on building reliable products for real users. Translate complex goals into intuitive interfaces. Committed to clean code and measurable outcomes.',
    },
    {
      label: 'What I Do',
      value:
        'Build responsive UIs with React and Next.js. Implement scalable design systems with Tailwind CSS. Ship performant features with testing and continuous improvements.',
    },
    {
      label: 'Tech Focus',
      value:
        'Core stack: React, Next.js, TypeScript, Tailwind CSS. Data layer: Prisma and REST APIs. Workflow: GitHub, CI-ready quality, and iterative delivery.',
    },
  ],
};

export const defaultContact = {
  email: 'hello@jondereck.dev',
  phone: '+63 917 555 0101',
  location: 'Manila, Philippines',
  calendarLink: 'https://cal.com/jondereck',
  socialLinks: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/jondereck' },
    { label: 'GitHub', url: 'https://github.com/jondereck' },
  ],
};

export const defaultSeo = {
  title: 'Jon Dereck Nifas — Frontend Engineer',
  description: 'Portfolio and case studies of Jon Dereck Nifas, a frontend engineer focused on delivering polished web apps.',
  ogImage: 'https://res.cloudinary.com/demo/image/upload/v1710000000/portfolio/og.png',
  keywords: ['Frontend', 'React', 'Next.js', 'Product Engineer'],
};

export const defaultSiteContent = {
  hero: defaultHero,
  about: defaultAbout,
  contact: defaultContact,
  seo: defaultSeo,
};

export const defaultNavigation = {
  links: [
    { label: 'Home', target: '#home', type: 'section', isVisible: true, sortOrder: 1 },
    { label: 'About', target: '#about', type: 'section', isVisible: true, sortOrder: 2 },
    { label: 'Portfolio', target: '#portfolio', type: 'section', isVisible: true, sortOrder: 3 },
    { label: 'Experience', target: '#experience', type: 'section', isVisible: true, sortOrder: 4 },
    { label: 'Certificates', target: '#certificates', type: 'section', isVisible: true, sortOrder: 5 },
    { label: 'Contact', target: '#contact', type: 'section', isVisible: true, sortOrder: 6 },
  ],
  showAdminButton: true,
};

export const defaultSiteConfig = {
  logoText: 'Jon',
  logoImage: '',
  navigation: defaultNavigation,
};
