export default function manifest() {
  return {
    name: 'Portfolio',
    short_name: 'Portfolio',
    description: 'Install the portfolio for faster access on mobile and desktop.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#020617',
    theme_color: '#020617',
    categories: ['portfolio', 'productivity', 'business'],
    icons: [
      {
        src: '/logo192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/logo512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
