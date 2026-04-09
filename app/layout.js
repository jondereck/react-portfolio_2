import '../src/index.css';

export const metadata = {
  title: 'Portfolio',
  description: 'Developer portfolio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
