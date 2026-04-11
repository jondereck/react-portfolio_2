import GlobalLoader from '@/components/GlobalLoader';

export default function Loading() {
  return <GlobalLoader forceVisible message="Opening the next scene" hint="The field reacts while the next page is assembling." />;
}
