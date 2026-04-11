'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import GlobalLoader from '@/components/GlobalLoader';
import { useLoadingStore } from '@/store/loading';

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
};

const isVideoUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.toLowerCase();
  return (
    normalized.includes('/video/upload/') ||
    normalized.endsWith('.mp4') ||
    normalized.endsWith('.mov') ||
    normalized.endsWith('.webm') ||
    normalized.endsWith('.mkv')
  );
};

const getPlayableMediaUrl = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (!isVideoUrl(value)) return value;
  if (!value.includes('res.cloudinary.com') || !value.includes('/video/upload/')) return value;

  const [withoutQuery, query] = value.split('?');
  const transformed = withoutQuery
    .replace('/video/upload/', '/video/upload/f_mp4,vc_h264,ac_aac,q_auto/')
    .replace(/\.(mov|mkv|webm)$/i, '.mp4');

  return query ? `${transformed}?${query}` : transformed;
};

const getVideoPosterUrl = (value) => {
  if (!isVideoUrl(value) || !value.includes('res.cloudinary.com') || !value.includes('/video/upload/')) {
    return '';
  }

  const [withoutQuery, query] = value.split('?');
  const posterBase = withoutQuery
    .replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto/')
    .replace(/\.(mp4|mov|webm|mkv)$/i, '.jpg');

  return query ? `${posterBase}?${query}` : posterBase;
};

const VideoPoster = ({ src, alt, className, fallbackClassName }) => {
  const posterSrc = getVideoPosterUrl(src);
  if (!posterSrc) {
    return <div className={fallbackClassName} />;
  }

  return <img src={posterSrc} alt={alt} className={className} />;
};

const normalizeLabel = (album) => {
  if (typeof album?.description === 'string' && album.description.trim()) {
    const firstChunk = album.description.split(/[\.|·]/)[0]?.trim();
    if (firstChunk) return firstChunk;
  }

  return 'Private Collection';
};

const buildTitleLines = (name) => {
  if (!name || typeof name !== 'string') {
    return ['Private', 'Gallery'];
  }

  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return [words[0] || 'Private', words[1] || 'Gallery'];
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
};

export default function GalleryPage() {
  const router = useRouter();
  const startGlobalLoading = useLoadingStore((state) => state.startLoading);
  const stopGlobalLoading = useLoadingStore((state) => state.stopLoading);
  const [isReady, setIsReady] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [slideDirection, setSlideDirection] = useState(1);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/admin/verify', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/');
          return;
        }

        if (mounted) {
          setIsReady(true);
        }
      } catch {
        router.replace('/');
      }
    };

    verifySession();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let finished = false;
    const finalize = () => {
      if (finished) {
        return;
      }

      finished = true;
      stopGlobalLoading();
    };

    setLoading(true);
    setError('');
    startGlobalLoading('Curating the gallery preview');

    const loadAlbums = async () => {
      try {
        const data = await fetchJson('/api/gallery/albums');
        const publishedAlbums = Array.isArray(data) ? data.filter((item) => item.isPublished) : [];
        setAlbums(publishedAlbums);
        setActiveIndex(0);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
        finalize();
      }
    };

    loadAlbums();
    return () => {
      finalize();
    };
  }, [isReady, startGlobalLoading, stopGlobalLoading]);

  const resolveAlbumCover = (album) => album?.coverPhoto?.imageUrl || album?.photos?.[0]?.imageUrl || '';

  const activeAlbum = albums[activeIndex] || null;
  const activeCover = activeAlbum ? resolveAlbumCover(activeAlbum) : '';
  const activeIsVideo = isVideoUrl(activeCover);
  const [headlineTop, headlineBottom] = buildTitleLines(activeAlbum?.name);

  const previewAlbums = useMemo(() => {
    if (albums.length <= 1) return [];

    const previewCount = Math.min(3, albums.length - 1);
    return Array.from({ length: previewCount }, (_, offset) => {
      const index = (activeIndex + offset + 1) % albums.length;
      return { album: albums[index], index };
    });
  }, [albums, activeIndex]);

  const moveSlide = (direction) => {
    if (albums.length <= 1) return;
    setSlideDirection(direction >= 0 ? 1 : -1);
    setActiveIndex((previous) => (previous + direction + albums.length) % albums.length);
  };

  useEffect(() => {
    if (!isReady || isAutoplayPaused || albums.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setSlideDirection(1);
      setActiveIndex((previous) => (previous + 1) % albums.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isReady, isAutoplayPaused, albums.length]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSlide(-1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveSlide(1);
    }
  };

  const onTouchStart = (event) => {
    setTouchStartX(event.touches?.[0]?.clientX ?? null);
  };

  const onTouchEnd = (event) => {
    const endX = event.changedTouches?.[0]?.clientX ?? null;
    if (touchStartX === null || endX === null) {
      setTouchStartX(null);
      return;
    }

    const delta = endX - touchStartX;
    if (Math.abs(delta) > 45) {
      moveSlide(delta > 0 ? -1 : 1);
    }
    setTouchStartX(null);
  };

  if (!isReady) {
    return <GlobalLoader forceVisible message="Checking gallery access" hint="Verifying the secure gallery session." />;
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-950 text-white"
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      tabIndex={0}
      aria-label="Private gallery slider"
    >
      <AnimatePresence mode="wait">
        {activeCover ? (
          <motion.div
            key={`active-background-${activeAlbum?.id ?? 'none'}`}
            className="absolute inset-0"
            initial={{
              opacity: 0,
              scale: slideDirection > 0 ? 1.18 : 1.1,
              x: slideDirection > 0 ? 32 : -32,
              filter: 'blur(6px)',
            }}
            animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeIsVideo ? (
              <VideoPoster
                src={activeCover}
                alt={activeAlbum?.name || 'Active album'}
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full bg-[linear-gradient(135deg,#1e293b,#334155,#0f172a)]"
              />
            ) : (
              <img
                src={activeCover}
                alt={activeAlbum?.name || 'Active album'}
                className="h-full w-full object-cover"
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="active-background-fallback"
            className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a,#1e293b,#0b1120)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-[linear-gradient(108deg,rgba(2,6,23,0.84),rgba(2,6,23,0.36)_48%,rgba(2,6,23,0.92))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_34%,rgba(255,255,255,0.15),transparent_42%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1380px] flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.32em] text-white/85">Private Gallery</p>
          <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/90 backdrop-blur">
            Secure Session
          </div>
        </header>

        {loading ? <p className="mt-8 text-sm text-white/80">Loading albums...</p> : null}
        {error ? <p className="mt-8 text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && albums.length === 0 ? (
          <section className="my-auto max-w-xl rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur">
            <p className="text-2xl font-semibold">No albums yet</p>
            <p className="mt-2 text-sm text-white/80">Add and publish albums in admin to show them here.</p>
          </section>
        ) : null}

        {!loading && !error && activeAlbum ? (
          <>
            <section className="my-auto grid gap-6 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:grid-cols-[minmax(0,1fr)_minmax(560px,0.78fr)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`featured-copy-${activeAlbum.id}`}
                  className="flex min-h-[360px] flex-col justify-end space-y-6 pb-2"
                  initial={{ opacity: 0, x: -30, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 18, scale: 0.985 }}
                  transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-3">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/90">{normalizeLabel(activeAlbum)}</p>
                    <h1 className="font-['Bebas_Neue','Inter',sans-serif] text-[3.1rem] uppercase leading-[0.86] tracking-[0.02em] sm:text-[4.4rem] xl:text-[5.25rem]">
                      <span className="block">{headlineTop}</span>
                      <span className="block">{headlineBottom}</span>
                    </h1>
                  </div>

                  <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                    {activeAlbum.description || 'A private cinematic album experience with premium storytelling visuals.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/gallery/${activeAlbum.slug}`}
                      className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition hover:scale-[1.02] hover:bg-slate-100"
                    >
                      Open Album
                    </Link>
                    <span className="rounded-full border border-white/35 px-4 py-2 text-xs uppercase tracking-[0.15em] text-white/90">
                      {activeAlbum._count?.photos ?? 0} Photos
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div
                className="relative flex min-h-[340px] items-end md:items-center"
                onMouseEnter={() => setIsAutoplayPaused(true)}
                onMouseLeave={() => setIsAutoplayPaused(false)}
              >
                <div className="w-full overflow-hidden pb-2">
                  <div className="flex items-stretch gap-3 pr-1">
                    {previewAlbums.map(({ album, index }) => {
                      const coverImage = resolveAlbumCover(album);
                      const coverIsVideo = isVideoUrl(coverImage);
                      const isHighlighted = index === (activeIndex + 1) % albums.length;

                      return (
                        <button
                          key={album.id}
                          type="button"
                          onClick={() => {
                            const delta = (index - activeIndex + albums.length) % albums.length;
                            setSlideDirection(delta > 0 ? 1 : -1);
                            setActiveIndex(index);
                          }}
                          className={`group relative h-[250px] w-[165px] overflow-hidden rounded-2xl border text-left shadow-xl shadow-black/40 transition duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-[280px] sm:w-[175px] lg:w-[180px] ${
                            isHighlighted
                              ? 'border-white/70 ring-2 ring-white/50'
                              : 'border-white/28 hover:border-white/50'
                          }`}
                          aria-label={`Show album ${album.name}`}
                        >
                          {coverImage ? coverIsVideo ? (
                            <VideoPoster
                              src={coverImage}
                              alt={album.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              fallbackClassName="h-full w-full bg-[linear-gradient(140deg,#475569,#64748b,#334155)]"
                            />
                          ) : (
                            <img
                              src={coverImage}
                              alt={album.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-[linear-gradient(140deg,#475569,#64748b,#334155)]" />
                          )}

                          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.86),rgba(2,6,23,0.18))]" />
                          <div className="absolute bottom-0 w-full space-y-1 p-3">
                            <p className="line-clamp-2 text-xs font-bold uppercase tracking-[0.08em] text-white">{album.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-white/80">{album._count?.photos ?? 0} photos</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <footer className="mt-auto flex items-center justify-between border-t border-white/25 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    moveSlide(-1);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/10 text-lg text-white transition hover:bg-white/20"
                  aria-label="Previous album"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    moveSlide(1);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/10 text-lg text-white transition hover:bg-white/20"
                  aria-label="Next album"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-white/85">
                <span>{(activeIndex + 1).toString().padStart(2, '0')}</span>
                <span className="h-px w-14 bg-white/40" />
                <span>{albums.length.toString().padStart(2, '0')}</span>
              </div>
            </footer>
          </>
        ) : null}
      </div>
    </main>
  );
}
