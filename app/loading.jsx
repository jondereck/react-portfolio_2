import GlobalLoader from '@/components/GlobalLoader';

export default function Loading() {
  return <GlobalLoader forceVisible message="Opening the next page" hint="Preparing the next screen." />;
}
