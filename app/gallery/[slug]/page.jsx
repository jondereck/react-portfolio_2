'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
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

const densityGridMap = {
  small: 'grid-cols-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5',
  medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
};
const timerPresetMs = [2000, 5000, 10000, 15000, 20000, 30000];

export default function AlbumDetailPage({ params }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [sort, setSort] = useState('custom');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [density, setDensity] = useState('medium');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [delayMs, setDelayMs] = useState(5000);
  const [customDelaySeconds, setCustomDelaySeconds] = useState('12');
  const [hideUI, setHideUI] = useState(false);
  const [viewerMode, setViewerMode] = useState('focus');
  const [isMuted, setIsMuted] = useState(true);
  const [splitPanelFilter, setSplitPanelFilter] = useState('all');
  const [splitPanelItemId, setSplitPanelItemId] = useState('');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [activeMediaLoading, setActiveMediaLoading] = useState(false);
  const [mediaErrors, setMediaErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeVideoRef = useRef(null);
  const videoProgressRef = useRef({});
  const touchStartRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    let mounted = true;
    Promise.resolve(params)
      .then((resolved) => {
        if (mounted) {
          setSlug(resolved?.slug || '');
        }
      })
      .catch(() => {
        if (mounted) {
          setSlug('');
        }
      });
    return () => {
      mounted = false;
    };
  }, [params]);

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
    if (typeof window === 'undefined') return;
    const savedDensity = window.localStorage.getItem('galleryDensity');
    if (savedDensity && densityGridMap[savedDensity]) {
      setDensity(savedDensity);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('galleryDensity', density);
  }, [density]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!slug) {
      setError('Album slug is missing.');
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const albumData = await fetchJson(`/api/gallery/albums/by-slug/${slug}`);
        setAlbum(albumData);

        const photoData = await fetchJson(`/api/gallery/albums/${albumData.id}/photos?sort=${sort}`);
        setPhotos(Array.isArray(photoData.photos) ? photoData.photos : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isReady, slug, sort]);

  const filteredPhotos = photos.filter((item) => {
    if (mediaFilter === 'photos') {
      return !isVideoUrl(item.imageUrl);
    }
    if (mediaFilter === 'videos') {
      return isVideoUrl(item.imageUrl);
    }
    return true;
  });
  const filteredPhotoCount = filteredPhotos.length;

  const goToNext = useCallback(() => {
    setActiveIndex((current) => {
      if (filteredPhotoCount === 0) return 0;
      return (current + 1) % filteredPhotoCount;
    });
  }, [filteredPhotoCount]);

  const goToPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (filteredPhotoCount === 0) return 0;
      return (current - 1 + filteredPhotoCount) % filteredPhotoCount;
    });
  }, [filteredPhotoCount]);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setIsPlaying(false);
    setAutoplayBlocked(false);
    setActiveMediaLoading(false);
    setHideUI(false);
  }, []);

  const openViewerAt = useCallback((index, options = {}) => {
    const { autoplay = false, mode = 'focus' } = options;
    setActiveIndex(index);
    setViewerMode(mode);
    setViewerOpen(true);
    setIsPlaying(autoplay);
    setAutoplayBlocked(false);
    setActiveMediaLoading(true);
    setHideUI(false);
  }, []);

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }
    if (filteredPhotoCount === 0) {
      closeViewer();
      return;
    }
    if (activeIndex >= filteredPhotoCount) {
      setActiveIndex(0);
    }
  }, [viewerOpen, filteredPhotoCount, activeIndex, closeViewer]);

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (hideUI) {
          setHideUI(false);
          return;
        }
        closeViewer();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrev();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
        return;
      }
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        setIsPlaying((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerOpen, hideUI, closeViewer, goToPrev, goToNext]);

  const activeItem = viewerOpen ? filteredPhotos[activeIndex] : null;
  const activeItemIsVideo = activeItem ? isVideoUrl(activeItem.imageUrl) : false;
  const splitCandidates = viewerOpen
    ? filteredPhotos.filter((item, index) => {
        if (index === activeIndex) return false;
        if (splitPanelFilter === 'photos') return !isVideoUrl(item.imageUrl);
        if (splitPanelFilter === 'videos') return isVideoUrl(item.imageUrl);
        return true;
      })
    : [];
  const secondaryItem = splitPanelItemId
    ? splitCandidates.find((item) => item.id === splitPanelItemId) || splitCandidates[0] || null
    : splitCandidates[0] || null;
  const showSplitMode = viewerMode === 'split' && !!secondaryItem;
  const isPresetDelay = timerPresetMs.includes(delayMs);

  useEffect(() => {
    if (!viewerOpen || !isPlaying || !activeItem || activeItemIsVideo) {
      return;
    }

    const timeout = window.setTimeout(() => {
      goToNext();
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [viewerOpen, isPlaying, activeItem, activeItemIsVideo, delayMs, goToNext]);

  useEffect(() => {
    if (!viewerOpen || !activeItem || !activeItemIsVideo) {
      return;
    }

    const player = activeVideoRef.current;
    if (!player) {
      return;
    }

    if (isPlaying) {
      const playPromise = player.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setAutoplayBlocked(true);
          setIsPlaying(false);
        });
      }
    }
  }, [viewerOpen, activeItem, activeItemIsVideo, isPlaying]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split') return;
    if (splitCandidates.length === 0) {
      setSplitPanelItemId('');
      return;
    }
    const stillValid = splitCandidates.some((item) => item.id === splitPanelItemId);
    if (!stillValid) {
      setSplitPanelItemId(splitCandidates[0].id);
    }
  }, [viewerOpen, viewerMode, splitCandidates, splitPanelItemId]);

  useEffect(() => {
    if (!viewerOpen || !activeItem) {
      return;
    }
    setActiveMediaLoading(true);
    setAutoplayBlocked(false);
  }, [viewerOpen, activeItem?.id]);

  const handleTouchStart = (event) => {
    if (!viewerOpen) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, active: true };
  };

  const handleTouchEnd = (event) => {
    if (!touchStartRef.current.active) return;
    const start = touchStartRef.current;
    touchStartRef.current = { x: 0, y: 0, active: false };
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) {
      goToNext();
      return;
    }
    goToPrev();
  };

  if (!isReady) {
    return null;
  }

  const albumCover =
    album?.coverPhoto?.imageUrl ||
    (Array.isArray(photos) && photos.length > 0 ? photos[0].imageUrl : '');
  const albumCoverIsVideo = isVideoUrl(albumCover);
  const totalPhotos = photos.length;
  const totalVideos = photos.filter((item) => isVideoUrl(item.imageUrl)).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_45%)] px-4 py-6 sm:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/gallery" className="inline-flex items-center text-sm text-slate-200 transition hover:text-white">
          Back to albums
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/70 shadow-2xl shadow-slate-950/70">
          {albumCover ? (
            albumCoverIsVideo ? (
              <video
                src={getPlayableMediaUrl(albumCover)}
                className="h-[40vh] min-h-[250px] w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={albumCover}
                alt={album?.name || 'Album cover'}
                className="h-[40vh] min-h-[250px] w-full object-cover"
              />
            )
          ) : (
            <div className="h-[40vh] min-h-[250px] w-full bg-[linear-gradient(135deg,#1e293b,#334155,#0f172a)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,6,23,0.86),rgba(2,6,23,0.28)_50%,rgba(2,6,23,0.8))]" />
          <div className="absolute inset-0 flex items-end justify-between gap-4 p-5 sm:p-8">
            <div className="space-y-2 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-200/90">Album Story</p>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">{album?.name || 'Album'}</h1>
              <p className="text-sm text-slate-100/90">
                {(photos?.length ?? 0)} items
                {album?.description ? ` · ${album.description}` : ''}
              </p>
            </div>
            <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.15em] text-slate-100 backdrop-blur">
              Collection
            </div>
          </div>
        </section>

        <header className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-slate-900/50 p-4 text-slate-100 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Viewing Mode</p>
            <p className="text-sm text-slate-200">
              {totalPhotos} total · {totalPhotos - totalVideos} photos · {totalVideos} videos
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 text-sm sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-full border border-white/25 bg-white/10 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setMediaFilter('all')}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
                  mediaFilter === 'all' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/15'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('photos')}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
                  mediaFilter === 'photos' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/15'
                }`}
              >
                Photos
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('videos')}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
                  mediaFilter === 'videos' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/15'
                }`}
              >
                Videos
              </button>
            </div>
            <label className="sr-only" htmlFor="density-mobile">Density</label>
            <select
              id="density-mobile"
              className="h-10 w-full rounded-md border border-white/30 bg-slate-900/70 px-3 text-sm text-white sm:hidden"
              value={density}
              onChange={(event) => setDensity(event.target.value)}
            >
              <option value="small">Density: Small</option>
              <option value="medium">Density: Medium</option>
              <option value="large">Density: Large</option>
            </select>
            <span className="hidden sm:inline">Density:</span>
            <div className="hidden items-center gap-1 rounded-full border border-white/25 bg-white/10 p-1 sm:flex">
              <button
                type="button"
                onClick={() => setDensity('small')}
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
                  density === 'small' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/15'
                }`}
              >
                Small
              </button>
              <button
                type="button"
                onClick={() => setDensity('medium')}
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
                  density === 'medium' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/15'
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setDensity('large')}
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
                  density === 'large' ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/15'
                }`}
              >
                Large
              </button>
            </div>
            <label className="sr-only sm:not-sr-only" htmlFor="sort-media">Sort</label>
            <select
              id="sort-media"
              className="h-10 w-full rounded-md border border-white/30 bg-slate-900/70 px-3 text-sm text-white sm:w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="custom">Custom</option>
              <option value="dateAsc">Date ASC</option>
              <option value="dateDesc">Date DESC</option>
            </select>
            <button
              type="button"
              onClick={() => openViewerAt(0, { autoplay: true, mode: 'slideshow' })}
              disabled={filteredPhotos.length === 0}
              className="h-10 w-full rounded-md border border-emerald-300/50 bg-emerald-500/20 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Slideshow
            </button>
          </div>
        </header>

        {loading ? <p className="text-sm text-slate-300">Loading album...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {(!loading && !error && filteredPhotos.length === 0) ? (
          <section className="rounded-2xl border border-white/15 bg-slate-900/50 p-10 text-center text-slate-200">
            <p className="text-lg font-semibold">No media in this filter</p>
            <p className="mt-1 text-sm text-slate-300">Try switching tabs or upload more items in the admin gallery manager.</p>
          </section>
        ) : null}

        <section className={`grid gap-4 ${densityGridMap[density] || densityGridMap.medium}`}>
          {filteredPhotos.map((photo, index) => (
            <article
              key={photo.id}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-slate-900/65 shadow-lg shadow-slate-950/40 transition duration-300 hover:-translate-y-1 hover:border-white/35"
              onClick={() => openViewerAt(index, { mode: 'focus' })}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                {isVideoUrl(photo.imageUrl) ? (
                  <video
                    src={getPlayableMediaUrl(photo.imageUrl)}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={photo.imageUrl} alt={photo.caption || `Photo ${photo.id}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
                {isVideoUrl(photo.imageUrl) ? (
                  <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-black/45 px-2 py-1 text-[10px] uppercase tracking-[0.13em] text-white">
                    Video
                  </span>
                ) : null}
              </div>
              <div className="space-y-1 p-3 text-sm">
                <p className="font-medium text-slate-100">{photo.caption || 'Untitled photo'}</p>
                <p className="text-xs text-slate-300">Date: {formatDate(photo.dateTaken || photo.uploadedAt)}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
      {viewerOpen && activeItem ? (
        <div className="fixed inset-0 z-50 bg-black/85 p-4 backdrop-blur-sm sm:p-6" onClick={closeViewer}>
          <div
            className={`mx-auto flex h-full w-full flex-col shadow-2xl shadow-black/70 transition-all duration-300 ${
              hideUI
                ? 'max-w-none rounded-none border border-transparent bg-black/95 p-1 sm:p-2'
                : 'max-w-6xl rounded-2xl border border-white/20 bg-slate-950/80 p-3 sm:p-5'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`mb-3 flex items-center justify-between gap-3 text-sm text-slate-200 transition-all duration-300 ${
                hideUI ? 'pointer-events-none mb-0 h-0 overflow-hidden opacity-0' : 'opacity-100'
              }`}
            >
              <p className="truncate">
                {activeIndex + 1} / {filteredPhotos.length} · {activeItem.caption || 'Untitled media'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHideUI(true)}
                  aria-label="Hide viewer interface"
                  className="rounded-md border border-white/25 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                >
                  Hide UI
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="rounded-md border border-white/25 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            <div
              className={`relative flex-1 overflow-hidden transition-all duration-300 ${
                hideUI ? 'rounded-md border border-transparent bg-black p-0' : 'rounded-xl border border-white/10 bg-black/70'
              } ${showSplitMode ? `${hideUI ? 'grid grid-cols-1 gap-1 p-0 lg:grid-cols-2' : 'grid grid-cols-1 gap-3 p-2 lg:grid-cols-2'}` : ''}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {showSplitMode ? (
                <>
                  <div className={`relative overflow-hidden ${hideUI ? 'rounded-none border border-transparent bg-black' : 'rounded-lg border border-white/10 bg-black/70'}`}>
                    {!hideUI ? (
                      <span className="absolute left-2 top-2 z-10 rounded-full border border-white/20 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white">
                        Active
                      </span>
                    ) : null}
                    {activeItemIsVideo ? (
                      <video
                        key={activeItem.id}
                        ref={activeVideoRef}
                        src={getPlayableMediaUrl(activeItem.imageUrl)}
                        className="h-full w-full object-contain"
                        controls
                        muted={isMuted}
                        autoPlay={isPlaying}
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(event) => {
                          const savedPosition = videoProgressRef.current[activeItem.id];
                          if (
                            typeof savedPosition === 'number' &&
                            savedPosition > 0 &&
                            savedPosition < event.currentTarget.duration - 0.2
                          ) {
                            event.currentTarget.currentTime = savedPosition;
                          }
                          setActiveMediaLoading(false);
                        }}
                        onTimeUpdate={(event) => {
                          videoProgressRef.current[activeItem.id] = event.currentTarget.currentTime;
                        }}
                        onEnded={() => {
                          videoProgressRef.current[activeItem.id] = 0;
                          if (isPlaying) {
                            goToNext();
                          }
                        }}
                        onError={() => {
                          setMediaErrors((current) => ({ ...current, [activeItem.id]: true }));
                          setActiveMediaLoading(false);
                        }}
                      />
                    ) : (
                      <img
                        src={activeItem.imageUrl}
                        alt={activeItem.caption || `Photo ${activeItem.id}`}
                        className="h-full w-full object-contain"
                        onLoad={() => setActiveMediaLoading(false)}
                        onError={() => {
                          setMediaErrors((current) => ({ ...current, [activeItem.id]: true }));
                          setActiveMediaLoading(false);
                        }}
                      />
                    )}
                  </div>
                  <div className={`relative overflow-hidden ${hideUI ? 'rounded-none border border-transparent bg-black' : 'rounded-lg border border-white/10 bg-black/70'}`}>
                    {!hideUI ? (
                      <span className="absolute left-2 top-2 z-10 rounded-full border border-white/20 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white">
                        Up Next
                      </span>
                    ) : null}
                    {secondaryItem && isVideoUrl(secondaryItem.imageUrl) ? (
                      <video
                        key={`next-${secondaryItem.id}`}
                        src={getPlayableMediaUrl(secondaryItem.imageUrl)}
                        className="h-full w-full object-contain"
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : secondaryItem ? (
                      <img
                        src={secondaryItem.imageUrl}
                        alt={secondaryItem.caption || `Photo ${secondaryItem.id}`}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>
                </>
              ) : activeItemIsVideo ? (
                <video
                  key={activeItem.id}
                  ref={activeVideoRef}
                  src={getPlayableMediaUrl(activeItem.imageUrl)}
                  className="h-full w-full object-contain"
                  controls
                  muted={isMuted}
                  autoPlay={isPlaying}
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    const savedPosition = videoProgressRef.current[activeItem.id];
                    if (
                      typeof savedPosition === 'number' &&
                      savedPosition > 0 &&
                      savedPosition < event.currentTarget.duration - 0.2
                    ) {
                      event.currentTarget.currentTime = savedPosition;
                    }
                    setActiveMediaLoading(false);
                  }}
                  onTimeUpdate={(event) => {
                    videoProgressRef.current[activeItem.id] = event.currentTarget.currentTime;
                  }}
                  onEnded={() => {
                    videoProgressRef.current[activeItem.id] = 0;
                    if (isPlaying) {
                      goToNext();
                    }
                  }}
                  onError={() => {
                    setMediaErrors((current) => ({ ...current, [activeItem.id]: true }));
                    setActiveMediaLoading(false);
                  }}
                />
              ) : (
                <img
                  src={activeItem.imageUrl}
                  alt={activeItem.caption || `Photo ${activeItem.id}`}
                  className="h-full w-full object-contain"
                  onLoad={() => setActiveMediaLoading(false)}
                  onError={() => {
                    setMediaErrors((current) => ({ ...current, [activeItem.id]: true }));
                    setActiveMediaLoading(false);
                  }}
                />
              )}
              {activeMediaLoading ? (
                <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/35 text-xs uppercase tracking-[0.15em] text-slate-100">
                  {hideUI ? (
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    'Loading media...'
                  )}
                </div>
              ) : null}
              {mediaErrors[activeItem.id] ? (
                <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4 text-center text-sm text-rose-200">
                  Unable to load this media. Try next/previous or close and reopen.
                </div>
              ) : null}
              <div
                className={`absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/45 p-1.5 backdrop-blur transition-all duration-300 ${
                  hideUI ? 'opacity-95' : 'pointer-events-none opacity-0'
                }`}
              >
                <button
                  type="button"
                  onClick={goToPrev}
                  aria-label="Previous slide"
                  className="rounded-full border border-white/25 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-white/15"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((current) => !current)}
                  aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                  className="rounded-full border border-emerald-300/50 bg-emerald-500/25 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/35"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="Next slide"
                  className="rounded-full border border-white/25 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-white/15"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setHideUI(false)}
                  aria-label="Show viewer interface"
                  className="rounded-full border border-white/25 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-white/15"
                >
                  Show UI
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  aria-label="Close viewer"
                  className="rounded-full border border-white/25 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-white/15"
                >
                  Close
                </button>
              </div>
            </div>

            {!hideUI ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 transition-opacity duration-300">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={goToPrev}
                  className="rounded-md border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="rounded-md border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((current) => !current)}
                  className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-xs uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/30"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted((current) => !current)}
                  className="rounded-md border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  onClick={() => setHideUI(true)}
                  aria-label="Hide viewer interface"
                  className="rounded-md border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                >
                  Hide UI
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-300">
                <span>Mode</span>
                <select
                  value={viewerMode}
                  onChange={(event) => {
                    const nextMode = event.target.value;
                    setViewerMode(nextMode);
                    if (nextMode !== 'split') {
                      setSplitPanelItemId('');
                    }
                    if (nextMode === 'slideshow' && !isPlaying) {
                      setIsPlaying(true);
                    }
                  }}
                  className="h-9 rounded-md border border-white/30 bg-slate-900/70 px-2 text-xs text-white"
                >
                  <option value="focus">Focus</option>
                  <option value="slideshow">Slideshow</option>
                  <option value="split">Split</option>
                </select>
                <span>Timer</span>
                <select
                  value={isPresetDelay ? String(delayMs) : 'custom'}
                  onChange={(event) => {
                    if (event.target.value === 'custom') {
                      const parsed = Number(customDelaySeconds);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setDelayMs(Math.min(300000, Math.max(1000, parsed * 1000)));
                      }
                      return;
                    }
                    setDelayMs(Number(event.target.value));
                  }}
                  className="h-9 rounded-md border border-white/30 bg-slate-900/70 px-2 text-xs text-white"
                >
                  <option value={2000}>2s</option>
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={15000}>15s</option>
                  <option value={20000}>20s</option>
                  <option value={30000}>30s</option>
                  <option value="custom">Custom</option>
                </select>
                {!isPresetDelay ? (
                  <input
                    type="number"
                    min={1}
                    max={300}
                    step={1}
                    value={customDelaySeconds}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomDelaySeconds(value);
                      const parsed = Number(value);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setDelayMs(Math.min(300000, Math.max(1000, parsed * 1000)));
                      }
                    }}
                    className="h-9 w-20 rounded-md border border-white/30 bg-slate-900/70 px-2 text-xs text-white"
                    aria-label="Custom timer in seconds"
                  />
                ) : null}
                <span className="text-[10px] text-slate-400">
                  {Math.round(delayMs / 1000)}s
                </span>
                {viewerMode === 'split' ? (
                  <>
                    <span>Split panel</span>
                    <select
                      value={splitPanelFilter}
                      onChange={(event) => {
                        setSplitPanelFilter(event.target.value);
                        setSplitPanelItemId('');
                      }}
                      className="h-9 rounded-md border border-white/30 bg-slate-900/70 px-2 text-xs text-white"
                    >
                      <option value="all">All media</option>
                      <option value="photos">Photos only</option>
                      <option value="videos">Videos only</option>
                    </select>
                    <select
                      value={splitPanelItemId}
                      onChange={(event) => setSplitPanelItemId(event.target.value)}
                      className="h-9 max-w-[220px] rounded-md border border-white/30 bg-slate-900/70 px-2 text-xs text-white"
                      disabled={splitCandidates.length === 0}
                    >
                      {splitCandidates.length === 0 ? <option value="">No matching media</option> : null}
                      {splitCandidates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {isVideoUrl(item.imageUrl) ? 'Video' : 'Image'} · {item.caption || `#${item.id}`}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] text-slate-200">
                  Esc / ← / → / Space
                </span>
                <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] text-slate-200">
                  {activeItemIsVideo ? 'Video follows duration' : 'Image follows timer'}
                </span>
                {autoplayBlocked ? (
                  <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-1 text-[10px] text-amber-100">
                    Autoplay blocked. Press Play.
                  </span>
                ) : null}
              </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
