import '../src/index.css';
import GlobalLoader from '@/components/GlobalLoader';
import PwaRegistration from '@/components/pwa/PwaRegistration';
import { Toaster } from '@/components/ui/sonner';
import { BRAND_THEME_COLOR } from '@/lib/server/site-branding';

export const metadata = {
  title: 'Portfolio',
  description: 'Developer portfolio',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Portfolio',
  },
  icons: {
    icon: [
      { url: '/app-icon?size=32', sizes: '32x32', type: 'image/png' },
      { url: '/app-icon?size=48', sizes: '48x48', type: 'image/png' },
      { url: '/app-icon?size=192', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon?size=512', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/app-icon?size=180', sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: '/app-icon?size=32', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: BRAND_THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-startup-image" href="/app-splash?w=1242&h=2688" />
      </head>
      <body>
        <GlobalLoader />
        <PwaRegistration />
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
