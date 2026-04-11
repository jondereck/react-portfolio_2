'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const uploadToken = '/video/upload/';
  const uploadIndex = withoutQuery.indexOf(uploadToken);
  const afterUpload = uploadIndex >= 0 ? withoutQuery.slice(uploadIndex + uploadToken.length) : '';
  const firstPathSegment = afterUpload.split('/')[0] || '';
  const hasTransformationSegment = firstPathSegment.includes(',');
  const transformedBase = hasTransformationSegment
    ? withoutQuery
    : withoutQuery.replace(uploadToken, `${uploadToken}f_mp4,vc_h264,ac_aac,q_auto/`);
  const transformed = transformedBase.replace(/\.(mov|mkv|webm)$/i, '.mp4');

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

const densityGridMap = {
  small: 'grid-cols-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5',
  medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
};
const timerPresetMs = [2000, 5000, 10000, 15000, 20000, 30000];
const splitPanelDefaults = { filter: 'photos', index: 0, isPlaying: false, delayMs: 5000, loop: false };
const getSplitPanelFilter = (panelId) => (panelId === 'left' ? 'photos' : 'videos');

const mediaMatchesFilter = (item, filter) => {
  if (!item) return false;
  if (filter === 'photos') return !isVideoUrl(item.imageUrl);
  if (filter === 'videos') return isVideoUrl(item.imageUrl);
  return true;
};

const findNextIndexByType = (startIndex, photos, matcher, options = {}) => {
  const { wrap = true } = options;
  if (!Array.isArray(photos) || photos.length === 0) return -1;
  const size = photos.length;
  let attempts = wrap ? size : Math.max(0, size - startIndex - 1);
  let cursor = startIndex;

  while (attempts > 0) {
    cursor += 1;
    if (cursor >= size) {
      if (!wrap) return -1;
      cursor = 0;
    }
    if (matcher(photos[cursor], cursor)) {
      return cursor;
    }
    attempts -= 1;
  }

  return -1;
};

const findPrevIndexByType = (startIndex, photos, matcher, options = {}) => {
  const { wrap = true } = options;
  if (!Array.isArray(photos) || photos.length === 0) return -1;
  const size = photos.length;
  let attempts = wrap ? size : Math.max(0, startIndex);
  let cursor = startIndex;

  while (attempts > 0) {
    cursor -= 1;
    if (cursor < 0) {
      if (!wrap) return -1;
      cursor = size - 1;
    }
    if (matcher(photos[cursor], cursor)) {
      return cursor;
    }
    attempts -= 1;
  }

  return -1;
};

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
  const [splitPanels, setSplitPanels] = useState({
    left: { ...splitPanelDefaults },
    right: { ...splitPanelDefaults, filter: 'videos', isPlaying: true }
  });
  const [mediaLoadingByPanel, setMediaLoadingByPanel] = useState({});
  const [mediaErrors, setMediaErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeVideoRef = useRef(null);
  const splitLeftVideoRef = useRef(null);
  const splitRightVideoRef = useRef(null);
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
    setMediaLoadingByPanel({});
    setHideUI(false);
  }, []);

  const openViewerAt = useCallback((index, options = {}) => {
    const { mode = 'focus' } = options;
    setActiveIndex(index);
    setViewerMode(mode);
    setViewerOpen(true);
    setIsPlaying(mode === 'slideshow');
    setSplitPanels({
      left: { ...splitPanelDefaults, index },
      right: { ...splitPanelDefaults, filter: 'videos', isPlaying: true }
    });
    setMediaLoadingByPanel({ primary: true });
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
  const activePlayableSrc = activeItemIsVideo ? getPlayableMediaUrl(activeItem?.imageUrl) : activeItem?.imageUrl || '';
  const activeVideoSources = activeItemIsVideo
    ? Array.from(new Set([activeItem?.imageUrl, activePlayableSrc].filter(Boolean)))
    : [];
  const activeMediaKey = activeItem
    ? `primary:${activeItem.id}:${activeItemIsVideo ? activeVideoSources.join('|') : activePlayableSrc}`
    : '';
  const isPresetDelay = timerPresetMs.includes(delayMs);

  const getPanelMediaKey = useCallback((panelId, item) => {
    if (!item) return `${panelId}:none`;
    return `${panelId}:${item.id}`;
  }, []);

  const setPanelLoading = useCallback((panelId, isLoading) => {
    setMediaLoadingByPanel((current) => {
      const next = { ...current };
      if (isLoading) {
        next[panelId] = true;
      } else {
        delete next[panelId];
      }
      return next;
    });
  }, []);

  const clearPanelMediaError = useCallback((panelId, item) => {
    if (!item) return;
    const key = getPanelMediaKey(panelId, item);
    setMediaErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, [getPanelMediaKey]);

  const markPanelMediaError = useCallback((panelId, item, eventName, mediaElement, finalVideoSrc = '') => {
    if (!item) return;
    const mediaError = mediaElement?.error
      ? {
          code: mediaElement.error.code,
          message: mediaElement.error.message || '',
          networkState: mediaElement.networkState,
          readyState: mediaElement.readyState
        }
      : null;
    if (mediaError?.code === 1) {
      return;
    }
    const key = getPanelMediaKey(panelId, item);
    setMediaErrors((current) => ({ ...current, [key]: true }));
    setPanelLoading(panelId, false);
    console.warn('[GalleryViewer] Media failed to load', {
      panelId,
      eventName,
      mediaId: item.id,
      finalVideoSrc,
      mediaError
    });
  }, [getPanelMediaKey, setPanelLoading]);

  const markPanelMediaSuccess = useCallback((panelId, item) => {
    clearPanelMediaError(panelId, item);
    setPanelLoading(panelId, false);
  }, [clearPanelMediaError, setPanelLoading]);

  const buildSplitCandidates = useCallback((filter, excludeIndex) => {
    if (!Array.isArray(filteredPhotos) || filteredPhotos.length === 0) return [];
    const matched = filteredPhotos
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => mediaMatchesFilter(item, filter) && index !== excludeIndex)
      .map(({ index }) => index);
    if (matched.length > 0) return matched;
    return filteredPhotos
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => mediaMatchesFilter(item, filter))
      .map(({ index }) => index);
  }, [filteredPhotos]);

  const splitResolved = useMemo(() => {
    if (!viewerOpen || viewerMode !== 'split' || filteredPhotos.length === 0) {
      return null;
    }

    const leftState = { ...(splitPanels.left || splitPanelDefaults), filter: getSplitPanelFilter('left') };
    const rightState = { ...(splitPanels.right || splitPanelDefaults), filter: getSplitPanelFilter('right') };

    const leftCandidatesInitial = buildSplitCandidates(leftState.filter, rightState.index);
    let leftIndex = leftCandidatesInitial.includes(leftState.index)
      ? leftState.index
      : (leftCandidatesInitial[0] ?? activeIndex ?? 0);

    const rightCandidatesInitial = buildSplitCandidates(rightState.filter, leftIndex);
    let rightIndex = rightCandidatesInitial.includes(rightState.index)
      ? rightState.index
      : (rightCandidatesInitial[0] ?? 0);

    const leftCandidates = buildSplitCandidates(leftState.filter, rightIndex);
    if (leftCandidates.length > 0 && !leftCandidates.includes(leftIndex)) {
      leftIndex = leftCandidates[0];
    }

    const rightCandidates = buildSplitCandidates(rightState.filter, leftIndex);
    if (rightCandidates.length > 0 && !rightCandidates.includes(rightIndex)) {
      rightIndex = rightCandidates[0];
    }

    const leftItem = filteredPhotos[leftIndex] || null;
    const rightItem = filteredPhotos[rightIndex] || null;

    return {
      left: {
        ...leftState,
        index: leftIndex,
        candidates: leftCandidates,
        item: leftItem
      },
      right: {
        ...rightState,
        index: rightIndex,
        candidates: rightCandidates,
        item: rightItem
      }
    };
  }, [viewerOpen, viewerMode, filteredPhotos, splitPanels, buildSplitCandidates, activeIndex]);

  const leftSplitPanel = splitResolved?.left || null;
  const rightSplitPanel = splitResolved?.right || null;
  const leftSplitItem = leftSplitPanel?.item || null;
  const rightSplitItem = rightSplitPanel?.item || null;
  const leftSplitIsVideo = leftSplitItem ? isVideoUrl(leftSplitItem.imageUrl) : false;
  const rightSplitIsVideo = rightSplitItem ? isVideoUrl(rightSplitItem.imageUrl) : false;
  const showSplitMode = viewerMode === 'split' && !!leftSplitItem && !!rightSplitItem;

  const getMediaSources = useCallback((item) => {
    if (!item) return { isVideo: false, playableSrc: '', sources: [], key: '' };
    const isVideo = isVideoUrl(item.imageUrl);
    const playableSrc = isVideo ? getPlayableMediaUrl(item.imageUrl) : item.imageUrl;
    const sources = isVideo ? Array.from(new Set([item.imageUrl, playableSrc].filter(Boolean))) : [];
    const key = `${item.id}:${isVideo ? sources.join('|') : playableSrc}`;
    return { isVideo, playableSrc, sources, key };
  }, []);

  const leftSplitMedia = getMediaSources(leftSplitItem);
  const rightSplitMedia = getMediaSources(rightSplitItem);

  const moveSplitPanel = useCallback((panelId, direction) => {
    const isNext = direction === 'next';
    setSplitPanels((current) => {
      const target = current[panelId];
      const otherId = panelId === 'left' ? 'right' : 'left';
      const other = current[otherId];
      const candidates = buildSplitCandidates(getSplitPanelFilter(panelId), other.index);
      if (candidates.length === 0) return current;
      const candidateSet = new Set(candidates);
      const matcher = (_item, idx) => candidateSet.has(idx);
      const nextIndex = isNext
        ? findNextIndexByType(target.index, filteredPhotos, matcher, { wrap: true })
        : findPrevIndexByType(target.index, filteredPhotos, matcher, { wrap: true });
      const resolvedIndex = nextIndex >= 0 ? nextIndex : candidates[0];
      return {
        ...current,
        [panelId]: {
          ...target,
          index: resolvedIndex
        }
      };
    });
  }, [buildSplitCandidates, filteredPhotos]);

  const goToNextVideo = useCallback(() => {
    setActiveIndex((current) => {
      const nextVideoIndex = findNextIndexByType(
        current,
        filteredPhotos,
        (item) => isVideoUrl(item?.imageUrl),
        { wrap: true }
      );
      return nextVideoIndex >= 0 ? nextVideoIndex : current;
    });
  }, [filteredPhotos]);

  useEffect(() => {
    if (!viewerOpen || !isPlaying || !activeItem || activeItemIsVideo || viewerMode === 'split') {
      return;
    }

    const timeout = window.setTimeout(() => {
      goToNext();
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [viewerOpen, isPlaying, activeItem, activeItemIsVideo, delayMs, goToNext, viewerMode]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split' || !leftSplitPanel || !leftSplitItem) return;
    if (leftSplitPanel.index !== activeIndex) {
      setActiveIndex(leftSplitPanel.index);
    }
  }, [viewerOpen, viewerMode, leftSplitPanel, leftSplitItem, activeIndex]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split' || !splitResolved) return;
    setSplitPanels((current) => {
      let changed = false;
      const next = { ...current };
      if (current.left.index !== splitResolved.left.index) {
        next.left = { ...current.left, index: splitResolved.left.index };
        changed = true;
      }
      if (current.right.index !== splitResolved.right.index) {
        next.right = { ...current.right, index: splitResolved.right.index };
        changed = true;
      }
      return changed ? next : current;
    });
  }, [viewerOpen, viewerMode, splitResolved]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split') return;
    setSplitPanels((current) => {
      if (current.left.index === activeIndex) return current;
      return {
        ...current,
        left: { ...current.left, index: activeIndex }
      };
    });
  }, [viewerOpen, viewerMode, activeIndex]);

  useEffect(() => {
    if (!viewerOpen || !activeItem || viewerMode === 'split') return;
    setPanelLoading('primary', true);
    clearPanelMediaError('primary', activeItem);
  }, [viewerOpen, viewerMode, activeItem?.id, activePlayableSrc, setPanelLoading, clearPanelMediaError, activeItem]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split') return;
    if (leftSplitItem) {
      setPanelLoading('left', true);
      clearPanelMediaError('left', leftSplitItem);
    }
    if (rightSplitItem) {
      setPanelLoading('right', true);
      clearPanelMediaError('right', rightSplitItem);
    }
  }, [viewerOpen, viewerMode, leftSplitItem?.id, rightSplitItem?.id, leftSplitMedia.key, rightSplitMedia.key, setPanelLoading, clearPanelMediaError, leftSplitItem, rightSplitItem]);

  useEffect(() => {
    if (!viewerOpen || !activeItemIsVideo || viewerMode === 'split') return undefined;
    const player = activeVideoRef.current;
    return () => {
      if (!player) return;
      player.pause();
      player.currentTime = 0;
    };
  }, [viewerOpen, activeItem?.id, activeItemIsVideo, viewerMode]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split') return undefined;
    const leftPlayer = splitLeftVideoRef.current;
    const rightPlayer = splitRightVideoRef.current;
    return () => {
      if (leftPlayer) {
        leftPlayer.pause();
        leftPlayer.currentTime = 0;
      }
      if (rightPlayer) {
        rightPlayer.pause();
        rightPlayer.currentTime = 0;
      }
    };
  }, [viewerOpen, viewerMode, leftSplitItem?.id, rightSplitItem?.id]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split' || !leftSplitPanel?.isPlaying || !leftSplitItem || leftSplitIsVideo) {
      return;
    }
    const timeout = window.setTimeout(() => moveSplitPanel('left', 'next'), leftSplitPanel.delayMs);
    return () => window.clearTimeout(timeout);
  }, [viewerOpen, viewerMode, leftSplitPanel, leftSplitItem, leftSplitIsVideo, moveSplitPanel]);

  useEffect(() => {
    if (!viewerOpen || viewerMode !== 'split' || !rightSplitPanel?.isPlaying || !rightSplitItem || rightSplitIsVideo) {
      return;
    }
    const timeout = window.setTimeout(() => moveSplitPanel('right', 'next'), rightSplitPanel.delayMs);
    return () => window.clearTimeout(timeout);
  }, [viewerOpen, viewerMode, rightSplitPanel, rightSplitItem, rightSplitIsVideo, moveSplitPanel]);

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
              <VideoPoster
                src={albumCover}
                alt={album?.name || 'Album cover'}
                className="h-[40vh] min-h-[250px] w-full object-cover"
                fallbackClassName="h-[40vh] min-h-[250px] w-full bg-[linear-gradient(135deg,#1e293b,#334155,#0f172a)]"
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
              onClick={() => openViewerAt(0, { mode: 'slideshow' })}
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
                  <VideoPoster
                    src={photo.imageUrl}
                    alt={photo.caption || `Video ${photo.id}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    fallbackClassName="h-full w-full bg-[linear-gradient(140deg,#1e293b,#334155,#0f172a)]"
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
                {activeItemIsVideo
                  ? (activeItem.caption || 'Untitled media')
                  : `${activeIndex + 1} / ${filteredPhotos.length} · ${activeItem.caption || 'Untitled media'}`}
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
                        Left Panel
                      </span>
                    ) : null}
                    {leftSplitMedia.isVideo ? (
                      <video
                        key={`left:${leftSplitMedia.key}`}
                        ref={splitLeftVideoRef}
                        className="h-full w-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                        poster={getVideoPosterUrl(leftSplitItem?.imageUrl) || undefined}
                        crossOrigin="anonymous"
                        onLoadedMetadata={() => {
                          markPanelMediaSuccess('left', leftSplitItem);
                        }}
                        onLoadedData={() => {
                          markPanelMediaSuccess('left', leftSplitItem);
                        }}
                        onCanPlay={() => {
                          markPanelMediaSuccess('left', leftSplitItem);
                        }}
                        onEnded={(event) => {
                          if (leftSplitPanel?.loop) {
                            event.currentTarget.currentTime = 0;
                            event.currentTarget.play().catch(() => {});
                            return;
                          }
                          moveSplitPanel('left', 'next');
                        }}
                        onError={(event) => {
                          markPanelMediaError('left', leftSplitItem, 'onError', event.currentTarget, leftSplitMedia.playableSrc);
                        }}
                      >
                        {leftSplitMedia.sources.map((src) => (
                          <source key={src} src={src} />
                        ))}
                      </video>
                    ) : (
                      <img
                        key={`left:${leftSplitMedia.key}`}
                        src={leftSplitItem?.imageUrl}
                        alt={leftSplitItem?.caption || `Photo ${leftSplitItem?.id}`}
                        className="h-full w-full object-contain"
                        onLoad={() => {
                          markPanelMediaSuccess('left', leftSplitItem);
                        }}
                        onError={(event) => {
                          markPanelMediaError('left', leftSplitItem, 'onError', event.currentTarget, leftSplitMedia.playableSrc);
                        }}
                      />
                    )}
                    {mediaErrors[getPanelMediaKey('left', leftSplitItem)] ? (
                      <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4 text-center text-sm text-rose-200">
                        Unable to load this media. Try next/previous or close and reopen.
                      </div>
                    ) : null}
                  </div>
                  <div className={`relative overflow-hidden ${hideUI ? 'rounded-none border border-transparent bg-black' : 'rounded-lg border border-white/10 bg-black/70'}`}>
                    {!hideUI ? (
                      <span className="absolute left-2 top-2 z-10 rounded-full border border-white/20 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white">
                        Right Panel
                      </span>
                    ) : null}
                    {rightSplitMedia.isVideo ? (
                      <video
                        key={`right:${rightSplitMedia.key}`}
                        ref={splitRightVideoRef}
                        className="h-full w-full object-contain"
                        controls
                        autoPlay
                        playsInline
                        preload="metadata"
                        poster={getVideoPosterUrl(rightSplitItem?.imageUrl) || undefined}
                        crossOrigin="anonymous"
                        onLoadedMetadata={() => {
                          markPanelMediaSuccess('right', rightSplitItem);
                        }}
                        onLoadedData={() => {
                          markPanelMediaSuccess('right', rightSplitItem);
                        }}
                        onCanPlay={() => {
                          markPanelMediaSuccess('right', rightSplitItem);
                        }}
                        onEnded={(event) => {
                          if (rightSplitPanel?.loop) {
                            event.currentTarget.currentTime = 0;
                            event.currentTarget.play().catch(() => {});
                            return;
                          }
                          moveSplitPanel('right', 'next');
                        }}
                        onError={(event) => {
                          markPanelMediaError('right', rightSplitItem, 'onError', event.currentTarget, rightSplitMedia.playableSrc);
                        }}
                      >
                        {rightSplitMedia.sources.map((src) => (
                          <source key={src} src={src} />
                        ))}
                      </video>
                    ) : rightSplitItem ? (
                      <img
                        key={`right:${rightSplitMedia.key}`}
                        src={rightSplitItem.imageUrl}
                        alt={rightSplitItem.caption || `Photo ${rightSplitItem.id}`}
                        className="h-full w-full object-contain"
                        onLoad={() => {
                          markPanelMediaSuccess('right', rightSplitItem);
                        }}
                        onError={(event) => {
                          markPanelMediaError('right', rightSplitItem, 'onError', event.currentTarget, rightSplitMedia.playableSrc);
                        }}
                      />
                    ) : null}
                    {mediaErrors[getPanelMediaKey('right', rightSplitItem)] ? (
                      <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4 text-center text-sm text-rose-200">
                        Unable to load this media. Try next/previous or close and reopen.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : activeItemIsVideo ? (
                <video
                  key={activeMediaKey}
                  ref={activeVideoRef}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                  poster={getVideoPosterUrl(activeItem.imageUrl) || undefined}
                  crossOrigin="anonymous"
                  onLoadedMetadata={() => {
                    markPanelMediaSuccess('primary', activeItem);
                  }}
                  onLoadedData={() => {
                    markPanelMediaSuccess('primary', activeItem);
                  }}
                  onCanPlay={() => {
                    markPanelMediaSuccess('primary', activeItem);
                  }}
                  onEnded={() => {
                    if (viewerMode === 'focus') {
                      goToNextVideo();
                      return;
                    }
                    if (isPlaying) {
                      goToNext();
                    }
                  }}
                  onError={(event) => {
                    markPanelMediaError('primary', activeItem, 'onError', event.currentTarget, activePlayableSrc);
                  }}
                >
                  {activeVideoSources.map((src) => (
                    <source key={src} src={src} />
                  ))}
                </video>
              ) : (
                <img
                  key={activeMediaKey}
                  src={activeItem.imageUrl}
                  alt={activeItem.caption || `Photo ${activeItem.id}`}
                  className="h-full w-full object-contain"
                  onLoad={() => {
                    markPanelMediaSuccess('primary', activeItem);
                  }}
                  onError={(event) => {
                    markPanelMediaError('primary', activeItem, 'onError', event.currentTarget, activePlayableSrc);
                  }}
                />
              )}
              {!showSplitMode && mediaErrors[getPanelMediaKey('primary', activeItem)] ? (
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
              <div className="mt-3 flex flex-col gap-2 transition-opacity duration-300">
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
                    if (nextMode === 'slideshow' && !isPlaying) {
                      setIsPlaying(true);
                    }
                    if (nextMode === 'split') {
                      setSplitPanels((current) => {
                        const left = { ...current.left, filter: getSplitPanelFilter('left'), index: activeIndex };
                        const rightCandidates = buildSplitCandidates(getSplitPanelFilter('right'), activeIndex);
                        const rightIndex = rightCandidates.includes(current.right.index)
                          ? current.right.index
                          : (rightCandidates[0] ?? activeIndex);
                        return {
                          left,
                          right: { ...current.right, filter: getSplitPanelFilter('right'), isPlaying: true, index: rightIndex }
                        };
                      });
                    }
                  }}
                  className="h-9 rounded-md border border-white/30 bg-slate-900/70 px-2 text-xs text-white"
                >
                  <option value="focus">Focus</option>
                  <option value="slideshow">Slideshow</option>
                  <option value="split">Split</option>
                </select>
                {viewerMode !== 'split' ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex w-full flex-col gap-2 rounded-md border border-white/15 bg-slate-900/40 p-2 text-[10px] tracking-[0.08em] text-slate-200 lg:flex-row">
                    <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/20 p-2">
                      <span className="font-semibold uppercase text-slate-100">Left panel</span>
                      <span className="rounded-md border border-white/30 bg-slate-900/70 px-2 py-1 text-[10px] text-white">Image</span>
                      <button
                        type="button"
                        onClick={() => moveSplitPanel('left', 'prev')}
                        className="rounded-md border border-white/25 px-2 py-1 text-[10px] uppercase text-white transition hover:bg-white/10"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSplitPanel('left', 'next')}
                        className="rounded-md border border-white/25 px-2 py-1 text-[10px] uppercase text-white transition hover:bg-white/10"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitPanels((current) => ({
                            ...current,
                            left: { ...current.left, isPlaying: !current.left.isPlaying }
                          }));
                        }}
                        className="rounded-md border border-emerald-300/50 bg-emerald-500/20 px-2 py-1 text-[10px] uppercase text-emerald-100 transition hover:bg-emerald-500/30"
                      >
                        {leftSplitPanel?.isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={Boolean(leftSplitPanel?.loop)}
                          onChange={() => {
                            setSplitPanels((current) => ({
                              ...current,
                              left: { ...current.left, loop: !current.left.loop }
                            }));
                          }}
                        />
                        Loop
                      </label>
                      <select
                        value={String(leftSplitPanel?.delayMs || 5000)}
                        onChange={(event) => {
                          const nextDelay = Number(event.target.value);
                          setSplitPanels((current) => ({
                            ...current,
                            left: { ...current.left, delayMs: nextDelay }
                          }));
                        }}
                        className="h-8 rounded-md border border-white/30 bg-slate-900/70 px-2 text-[10px] text-white"
                      >
                        {timerPresetMs.map((ms) => (
                          <option key={`left-delay-${ms}`} value={ms}>{Math.round(ms / 1000)}s</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/20 p-2">
                      <span className="font-semibold uppercase text-slate-100">Right panel</span>
                      <span className="rounded-md border border-white/30 bg-slate-900/70 px-2 py-1 text-[10px] text-white">Video</span>
                      <button
                        type="button"
                        onClick={() => moveSplitPanel('right', 'prev')}
                        className="rounded-md border border-white/25 px-2 py-1 text-[10px] uppercase text-white transition hover:bg-white/10"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSplitPanel('right', 'next')}
                        className="rounded-md border border-white/25 px-2 py-1 text-[10px] uppercase text-white transition hover:bg-white/10"
                      >
                        Next
                      </button>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={Boolean(rightSplitPanel?.loop)}
                          onChange={() => {
                            setSplitPanels((current) => ({
                              ...current,
                              right: { ...current.right, loop: !current.right.loop }
                            }));
                          }}
                        />
                        Loop
                      </label>
                      <select
                        value={String(rightSplitPanel?.delayMs || 5000)}
                        onChange={(event) => {
                          const nextDelay = Number(event.target.value);
                          setSplitPanels((current) => ({
                            ...current,
                            right: { ...current.right, delayMs: nextDelay }
                          }));
                        }}
                        className="h-8 rounded-md border border-white/30 bg-slate-900/70 px-2 text-[10px] text-white"
                      >
                        {timerPresetMs.map((ms) => (
                          <option key={`right-delay-${ms}`} value={ms}>{Math.round(ms / 1000)}s</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {viewerMode !== 'split' ? (
                  <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] text-slate-200">
                    Esc / ← / → / Space
                  </span>
                ) : null}
                {viewerMode !== 'split' ? (
                  <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] text-slate-200">
                    {activeItemIsVideo ? 'Video follows duration' : 'Image follows timer'}
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
