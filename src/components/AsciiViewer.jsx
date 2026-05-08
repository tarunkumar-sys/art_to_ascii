import { useRef, useEffect } from 'react';
import { MousePointer2, Move, ZoomIn, ZoomOut, Box, Maximize } from 'lucide-react';

const AsciiViewer = ({
  asciiOutput, coloredAscii, mediaType, previewCanvasRef,
  zoom, setZoom, pan, setPan, isDragging,
  activeTool, setActiveTool,
  handleMouseDown, handleMouseMove, handleMouseUp,
  asciiColor, asciiOpacity, fontFamily
}) => {
  const viewportRef = useRef(null);

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.0005)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom]);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header */}
      <div className="h-6 bg-blender-header border-b border-blender-border flex items-center px-3 justify-between shadow-sm z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Viewport</span>
          {coloredAscii && (
            <span className="text-[9px] px-1.5 py-0.5 bg-blender-active/20 border border-blender-active/40 rounded text-blender-active font-bold uppercase tracking-wider">Color</span>
          )}
        </div>

        <div className="text-[10px] text-gray-600 font-mono flex gap-3">
          <span>{Math.round(zoom * 100)}%</span>
          <span>{Math.round(pan.x)}, {Math.round(pan.y)}</span>
        </div>
      </div>

      {/* Viewport canvas */}
      <div
        ref={viewportRef}
        className={`flex-1 relative overflow-hidden bg-[#1c1c1c] ${isDragging ? 'cursor-grabbing' : activeTool === 'move' ? 'cursor-grab' : 'cursor-default'
          }`}
        style={{
          backgroundImage: `
            linear-gradient(to right, #222 1px, transparent 1px),
            linear-gradient(to bottom, #222 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Left toolbar strip */}
        <div className="absolute left-2 top-2 z-20 pointer-events-none">
          <div className="bg-[#2a2a2a]/90 backdrop-blur-sm border border-blender-border p-1 rounded-sm shadow-xl pointer-events-auto flex flex-col gap-1">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-1.5 rounded-sm transition-all ${activeTool === 'pointer' ? 'bg-blender-active text-white' : 'text-gray-500 hover:bg-blender-hover hover:text-white'}`}
              title="Select"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('move')}
              className={`p-1.5 rounded-sm transition-all ${activeTool === 'move' ? 'bg-blender-active text-white' : 'text-gray-500 hover:bg-blender-hover hover:text-white'}`}
              title="Move / Pan"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <div className="h-px bg-blender-border" />
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1.5 rounded-sm text-gray-500 hover:bg-blender-hover hover:text-white" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-1.5 rounded-sm text-gray-500 hover:bg-blender-hover hover:text-white" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded-sm text-gray-500 hover:bg-blender-hover hover:text-white" title="Reset">
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ASCII output */}
        {asciiOutput ? (
          <div
            className="absolute transform-gpu origin-center select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              left: '50%',
              top: '50%',
            }}
          >
            <div className="shadow-2xl bg-black/80 p-6 rounded-lg border border-blender-border/50">
              <pre
                className="text-[6px] leading-[0.5] pointer-events-none text-center whitespace-pre select-none"
                style={{
                  fontFamily: fontFamily,
                  color: coloredAscii ? 'inherit' : asciiColor,
                  opacity: coloredAscii ? 1 : asciiOpacity / 100,
                  letterSpacing: '-0.05em',
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                }}
                dangerouslySetInnerHTML={coloredAscii ? { __html: asciiOutput } : undefined}
              >
                {!coloredAscii ? asciiOutput : undefined}
              </pre>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-center text-[#3a3a3a] flex flex-col items-center">
              <Box className="w-14 h-14 mb-2 opacity-40" />
              <p className="text-sm">No media loaded</p>
              <p className="text-xs opacity-60 mt-1">Open a file in the Properties panel →</p>
            </div>
          </div>
        )}

        {/* Hidden processing canvas */}
        <canvas ref={previewCanvasRef} className="hidden" />
      </div>

      {/* Footer status bar */}
      <div className="h-6 bg-[#1a1a1a] border-t border-blender-border flex items-center px-3 text-[10px] text-gray-600 font-mono z-10 select-none">
        <span>MMB · Pan &nbsp;|&nbsp; Scroll · Zoom &nbsp;|&nbsp; Media: {mediaType || 'None'}</span>
      </div>
    </div>
  );
};

export default AsciiViewer;
