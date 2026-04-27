import React from 'react';
import { MousePointer2, Move, ZoomIn, ZoomOut, Box, Maximize } from 'lucide-react';

const AsciiViewer = ({
  asciiOutput, mediaType, previewCanvasRef,
  zoom, setZoom, pan, setPan, isDragging,
  activeTool, setActiveTool,
  handleWheel, handleMouseDown, handleMouseMove, handleMouseUp
}) => {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* 3D Viewport Header */}
      <div className="h-6 bg-blender-header border-b border-blender-border flex items-center px-3 justify-between shadow-sm z-10 select-none">
        <div className="flex items-center gap-3">

          {/* Tool modes */}
          <div className="flex gap-1 bg-[#151515] p-0.5 rounded border border-blender-border">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-1 rounded ${activeTool === 'pointer' ? 'bg-blender-active text-white' : 'text-gray-400 hover:bg-blender-hover hover:text-white'}`}
              title="Select Box"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('move')}
              className={`p-1 rounded ${activeTool === 'move' ? 'bg-blender-active text-white' : 'text-gray-400 hover:bg-blender-hover hover:text-white'}`}
              title="Move / Pan"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <div className="w-px bg-blender-border mx-0.5 my-1" />
            <button
              onClick={() => setZoom(z => Math.max(0.1, z - 0.02))}
              className="p-1 rounded text-gray-400 hover:bg-blender-hover hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(z => Math.min(5, z + 0.02))}
              className="p-1 rounded text-gray-400 hover:bg-blender-hover hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-1 rounded text-gray-400 hover:bg-blender-hover hover:text-white"
              title="Reset View"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-mono flex gap-4">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Pan: {Math.round(pan.x)}, {Math.round(pan.y)}</span>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div
        className={`flex-1 relative overflow-hidden bg-[#1c1c1c] ${isDragging ? 'cursor-grabbing' : (activeTool === 'move' ? 'cursor-grab' : 'cursor-default')}`}
        style={{
          // Blender grid style background
          backgroundImage: `
             linear-gradient(to right, #222 1px, transparent 1px),
             linear-gradient(to bottom, #222 1px, transparent 1px)
           `,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {asciiOutput ? (
          <div
            className="absolute transform-gpu origin-center select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              left: '50%',
              top: '50%',
            }}
          >
            {/* The ASCII Output */}
            <pre className="font-mono text-[6px] sm:text-[8px] leading-[0.6] text-blender-text pointer-events-none text-center shadow-xl bg-black/40 p-4 rounded border border-[#333]">
              {asciiOutput}
            </pre>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-center text-[#444] flex flex-col items-center">
              <Box className="w-16 h-16 mb-2 opacity-50" />
              <p className="text-sm">No media loaded.</p>
              <p className="text-xs opacity-75 mt-1">Open a file in the Properties panel.</p>
            </div>
          </div>
        )}

        {/* Hidden Canvas used for processing */}
        <canvas ref={previewCanvasRef} className="hidden"></canvas>
      </div>

      {/* Viewport Footer (Status bar) */}
      <div className="h-6 bg-[#1a1a1a] border-t border-blender-border flex items-center px-3 text-[10px] text-gray-500 font-mono z-10 select-none">
        <span>MMB: Pan | Scroll: Zoom | Media: {mediaType || 'None'}</span>
      </div>
    </div>
  );
};

export default AsciiViewer;
