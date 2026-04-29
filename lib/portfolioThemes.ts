export const PORTFOLIO_THEMES = [
  {
    value: 'editorial-bento',
    title: 'Editorial Bento',
    description: 'Light premium bento layout with bold borders, lime and blue accents.',
  },
  {
    value: 'neo-editorial',
    title: 'Neo Editorial',
    description: 'Sticky side rail, orange accent, case-study blocks, and heavy ink borders.',
  },
  {
    value: 'minimalist-editorial',
    title: 'Minimalist Editorial',
    description: 'Monochrome magazine layout with quiet cards, soft portrait shapes, and thin dividers.',
  },
  {
    value: 'classic',
    title: 'Classic',
    description: 'The current dark/light portfolio interface and section styling.',
  },
] as const;

export const PORTFOLIO_THEME_IDS = [
  'editorial-bento',
  'neo-editorial',
  'minimalist-editorial',
  'classic',
] as const;

export const DEFAULT_PORTFOLIO_THEME = 'editorial-bento';
export const DEFAULT_PORTFOLIO_THEME_RANDOM_POOL = [...PORTFOLIO_THEME_IDS];

export const isPortfolioThemeId = (value: unknown): value is (typeof PORTFOLIO_THEME_IDS)[number] =>
  typeof value === 'string' && PORTFOLIO_THEME_IDS.includes(value as (typeof PORTFOLIO_THEME_IDS)[number]);

export const normalizePortfolioThemeRandomPool = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_PORTFOLIO_THEME_RANDOM_POOL];
  }

  const unique = Array.from(new Set(value.filter(isPortfolioThemeId)));
  return unique.length > 0 ? unique : [...DEFAULT_PORTFOLIO_THEME_RANDOM_POOL];
};
