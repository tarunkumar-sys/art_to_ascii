import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { fetchMediaAsFile } from '../utils/media-fetcher';

const MediaSource = forwardRef(({ onMediaReady, onFetchError }, ref) => {
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const [activeType, setActiveType] = useState(null); // 'image', 'video', 'webcam'
  const [sourceUrl, setSourceUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    videoElement: videoRef.current,
    imageElement: imageRef.current,
    activeType,
    
    loadFromFile: (file) => {
      cleanup();
      const url = URL.createObjectURL(file);
      setSourceUrl(url);
      if (file.type.startsWith('video/')) {
        setActiveType('video');
        // Video needs metadata to get dimensions
      } else {
        setActiveType('image');
      }

      // Background upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      fetch('/api/uploadMedia', { method: 'POST', body: formData })
        .catch(err => console.error('[Cloudinary] Original file save error:', err));
    },

    loadFromUrl: async (url) => {
      setIsLoading(true);
      try {
        const file = await fetchMediaAsFile(url);
        
        // Pass the fetched File object to the same upload pipeline
        // This ensures shared logic for cleanup, state updates, and rendering
        // console.log('[MediaSource] External media converted to File:', file);
        
        // We use the same loadFromFile logic
        const blobUrl = URL.createObjectURL(file);
        setSourceUrl(blobUrl);
        if (file.type.startsWith('video/')) {
          setActiveType('video');
        } else {
          setActiveType('image');
        }
        
        // Background upload to Cloudinary (since we have the downloaded file Blob)
        const formData = new FormData();
        formData.append('file', file);
        fetch('/api/uploadMedia', { method: 'POST', body: formData })
          .catch(err => console.error('[Cloudinary] URL media save error:', err));
          
      } catch (err) {
        console.error('[MediaSource] Fetch Error:', err);
        onFetchError?.(err.message || 'Failed to fetch media via proxy');
      } finally {
        setIsLoading(false);
      }
    },

    startWebcam: async () => {
      cleanup();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.src = '';
          await videoRef.current.play();
        }
        setActiveType('webcam');
        onMediaReady?.('webcam', 'webcam');
      } catch (err) {
        console.error('Webcam error:', err);
        onFetchError?.('Webcam access denied or unavailable.');
      }
    },

    stopWebcam: () => {
      if (activeType === 'webcam') {
        cleanup();
        setActiveType(null);
      }
    }
  }));

  const cleanup = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    if (sourceUrl && sourceUrl.startsWith('blob:')) {
      URL.revokeObjectURL(sourceUrl);
    }
    setSourceUrl(null);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  // Handle media loading events
  const handleVideoLoaded = () => {
    if (activeType === 'video') onMediaReady?.('video', sourceUrl);
  };

  const handleImageLoaded = () => {
    if (activeType === 'image') onMediaReady?.('image', sourceUrl);
  };

  return (
    <div className="hidden" aria-hidden="true">
      <video
        ref={videoRef}
        src={activeType === 'video' ? sourceUrl : undefined}
        onLoadedData={handleVideoLoaded}
        crossOrigin="anonymous"
        loop
        muted
        playsInline
      />
      <img
        ref={imageRef}
        src={activeType === 'image' ? sourceUrl : undefined}
        onLoad={handleImageLoaded}
        onError={() => activeType === 'image' && onFetchError?.('CORS or Load Error')}
        crossOrigin="anonymous"
        alt="hidden source"
      />
    </div>
  );
});

MediaSource.displayName = 'MediaSource';

export default MediaSource;
