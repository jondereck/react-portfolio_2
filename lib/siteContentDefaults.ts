import { DEFAULT_PORTFOLIO_THEME, DEFAULT_PORTFOLIO_THEME_RANDOM_POOL } from './portfolioThemes';

export const defaultHero = {
  eyebrow: '',
  title: '',
  description: '',
  primaryCtaLabel: '',
  primaryCtaHref: '',
  secondaryCtaLabel: '',
  secondaryCtaHref: '',
  image: '',
};

export const defaultAbout = {
  title: '',
  body: '',
  highlights: [],
};

export const defaultContact = {
  socialLinks: [],
};

export const defaultSeo = {
  title: '',
  description: '',
  ogImage: '',
  keywords: [],
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
  logoText: '',
  logoImage: '',
  navigation: defaultNavigation,
  portfolioTheme: DEFAULT_PORTFOLIO_THEME,
  portfolioThemeRotationMinutes: null,
  portfolioThemeRandomPool: DEFAULT_PORTFOLIO_THEME_RANDOM_POOL,
};
