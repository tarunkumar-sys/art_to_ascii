import { useState, useCallback } from 'react';

/**
 * useMediaManager
 * ─────────────────────────────────────────────────────────────────────
 * Manages media source lifecycle: type tracking, URL fetching state,
 * file uploads, webcam start/stop — all decoupled from the rendering
 * pipeline.
 *
 * Requires a `mediaSourceRef` (from the <MediaSource> component) to
 * be passed in so it can delegate actual media loading.
 */
export default function useMediaManager(mediaSourceRef) {
  // ── Core media state ────────────────────────────────────────────────
  const [mediaType, setMediaType]  = useState('');   // 'image' | 'video' | 'webcam'
  const [mediaUrl, setMediaUrl]    = useState('');

  // ── URL-fetch state ─────────────────────────────────────────────────
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchError, setFetchError]       = useState('');

  // ── Handlers ────────────────────────────────────────────────────────

  const handleFetchError = useCallback((err) => {
    setFetchError(err);
    setIsFetchingUrl(false);
    setMediaType('');
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (file) {
      setFetchError('');
      mediaSourceRef.current?.loadFromFile(file);
    }
  }, [mediaSourceRef]);

  const fetchMediaUrl = useCallback(() => {
    if (!mediaUrlInput.trim()) return;
    setIsFetchingUrl(true);
    setFetchError('');
    mediaSourceRef.current?.loadFromUrl(mediaUrlInput.trim());
  }, [mediaUrlInput, mediaSourceRef]);

  const startWebcam = useCallback(
    () => mediaSourceRef.current?.startWebcam(),
    [mediaSourceRef],
  );

  const stopWebcam = useCallback(() => {
    mediaSourceRef.current?.stopWebcam();
    setMediaType('');
  }, [mediaSourceRef]);

  return {
    mediaType, setMediaType,
    mediaUrl, setMediaUrl,
    mediaUrlInput, setMediaUrlInput,
    isFetchingUrl, setIsFetchingUrl,
    fetchError, setFetchError,
    handleFetchError,
    handleFileUpload,
    fetchMediaUrl,
    startWebcam,
    stopWebcam,
  };
}
