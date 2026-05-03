import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';

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
    },

    loadFromUrl: async (url) => {
      cleanup();
      setIsLoading(true);
      try {
        let finalUrl = url;
        
        // Handle YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          onFetchError?.('YouTube URLs require a direct video stream link. Try a direct file URL or use a downloader.');
          setIsLoading(false);
          return;
        }

        // Try to check if direct load works first
        let isVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
        
        // If it's a known CORS-heavy site (like pinimg, i.redd.it, etc.) or no extension, use proxy immediately
        const needsProxy = !isVideo || url.includes('pinimg.com') || url.includes('unsplash.com') || url.includes('static.flickr.com');
        
        if (needsProxy) {
          // Use a reliable CORS proxy
          finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        }

        // If no extension, try to sniff type via proxy HEAD request if possible, 
        // but for now let's just try to load as image first, then video
        setSourceUrl(finalUrl);
        setActiveType(isVideo ? 'video' : 'image');
        // For URL images, we can call ready immediately if we want, 
        // but it's safer to wait for the <img> onLoad.
      } catch (err) {
        onFetchError?.('Failed to load media from URL');
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
