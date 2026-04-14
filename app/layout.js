import '../src/index.css';
import GlobalLoader from '@/components/GlobalLoader';
import PwaRegistration from '@/components/pwa/PwaRegistration';
import { Toaster } from '@/components/ui/sonner';

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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/logo192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalLoader />
        <PwaRegistration />
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
