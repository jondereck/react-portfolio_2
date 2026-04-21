import '../src/index.css';
import { Suspense } from 'react';
import GlobalLoader from '@/components/GlobalLoader';
import PwaRegistration from '@/components/pwa/PwaRegistration';
import PwaRoutePersistence from '@/components/pwa/PwaRoutePersistence';
import { Toaster } from '@/components/ui/sonner';
import { BRAND_THEME_COLOR } from '@/lib/server/site-branding';

export const metadata = {
  title: 'JDN',
  description: 'Developer portfolio',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Portfolio',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: '/logo192.png', type: 'image/png' }],
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
        <Suspense fallback={null}>
          <PwaRoutePersistence />
        </Suspense>
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
