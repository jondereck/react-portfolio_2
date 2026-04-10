import '../src/index.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Portfolio',
  description: 'Developer portfolio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
