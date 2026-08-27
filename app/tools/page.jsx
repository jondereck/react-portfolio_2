import ToolsRedirect from './ToolsRedirect';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'JDN Tools',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

const TOOLS_DRIVE_URL =
  'https://drive.google.com/drive/folders/1Vjh38ZqtXZtX2reV6MfXwzdHyP8dehib?usp=sharing';

export default function ToolsPage() {
  return <ToolsRedirect destinationUrl={TOOLS_DRIVE_URL} />;
}
