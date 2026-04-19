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
        src: '/app-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/app-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/app-icon?size=512&maskable=1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
