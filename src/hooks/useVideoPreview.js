import { useEffect } from 'react';
import { convertToGrayScales, drawVideoAscii } from '../utils/ascii-engine';

/**
 * useVideoPreview — renders one static ASCII frame from the first video frame.
 */
export default function useVideoPreview({
  mediaUrl, mediaType, previewCanvasRef, settings, setAsciiOutput,
}) {
  const {
    resolution, getActiveAsciiString, coloredAscii,
    aspectRatioCorrection, invertBrightness, brightness, contrast, fontFamily,
  } = settings;

  useEffect(() => {
    if (mediaType !== 'video' || !mediaUrl) return;

    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.src = mediaUrl;
    tempVideo.muted = true;

    const handleFirstFrame = () => {
      if (!previewCanvasRef.current) return;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const asciiStr = getActiveAsciiString();
      const multiplier = 4 - resolution;
      const baseWidth = Math.floor(window.innerWidth / 4 / multiplier);
      const width = Math.min(baseWidth, 250);
      const aspect = (tempVideo.videoHeight || 1) / (tempVideo.videoWidth || 1);
      const height = Math.round(width * aspect);
      const processHeight = aspectRatioCorrection ? Math.round(height * 2) : height;

      canvas.width = width;
      canvas.height = processHeight;
      ctx.drawImage(tempVideo, 0, 0, width, processHeight);

      if (coloredAscii) {
        const imageData = ctx.getImageData(0, 0, width, processHeight);
        setAsciiOutput(drawVideoAscii(imageData.data, width, asciiStr, true));
      } else {
        const gs = convertToGrayScales(ctx, width, processHeight, {
          invertBrightness, brightness, contrast,
        });
        setAsciiOutput(drawVideoAscii(gs, width, asciiStr, false));
      }
    };

    tempVideo.onloadeddata = () => { tempVideo.currentTime = 0.01; };
    tempVideo.onseeked = handleFirstFrame;

    return () => {
      tempVideo.onloadeddata = null;
      tempVideo.onseeked = null;
      tempVideo.src = '';
    };
  }, [
    mediaUrl, mediaType, resolution, getActiveAsciiString,
    coloredAscii, aspectRatioCorrection, invertBrightness,
    brightness, contrast, fontFamily, previewCanvasRef, setAsciiOutput,
  ]);
}
