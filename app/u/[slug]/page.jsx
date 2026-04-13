import App from '@/src/App';

export default async function PublicProfilePage({ params }) {
  const { slug } = await params;
  return <App profileSlug={slug} />;
}
