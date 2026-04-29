import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, FolderOpen, Play, Pause,
  Camera, Download, Copy, Code, Type, Settings2,
  Box, Image as ImageIcon
} from 'lucide-react';

const CollapsiblePanel = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-blender-border">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 py-1 bg-blender-header hover:bg-blender-hover cursor-pointer select-none group transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 mr-1 text-gray-400 group-hover:text-gray-200" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 mr-1 text-gray-400 group-hover:text-gray-200" />
        )}
        {Icon && <Icon className="w-3 h-3 mr-1.5 text-blender-active" />}
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-tight">{title}</span>
      </div>
      {isOpen && <div className="p-3 space-y-3 bg-blender-panel">{children}</div>}
    </div>
  );
};

const PropertyRow = ({ label, children, tip }) => (
  <div className="flex items-center gap-2 group" title={tip}>
    <span className="w-20 text-[10px] text-gray-400 font-medium truncate shrink-0">{label}</span>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

const Sidebar = ({
  mediaUrl, mediaType, videoRef,
  isPlaying, togglePlay, handleFileUpload,
  asciiMode, setAsciiMode, customChars, setCustomChars,
  resolution, setResolution,
  downloadText, downloadImage, copyToClipboard, copyEmbeddableCode
}) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden blender-scrollbar bg-blender-panel">

      {/* Search Bar Placeholder */}
      <div className="p-2 border-b border-blender-border bg-blender-header">
        <div className="flex items-center bg-blender-input border border-blender-border rounded-sm px-2 py-0.5">
          <Settings2 className="w-3 h-3 mr-2 text-gray-500" />
          <input
            type="text"
            placeholder="Search properties..."
            className="bg-transparent border-none outline-none text-[10px] text-gray-300 w-full placeholder:text-gray-600"
            disabled
          />
        </div>
      </div>

      <CollapsiblePanel title="Source Media">
        <div className="space-y-3">
          <label
            className="flex items-center justify-center w-full bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm py-4 cursor-pointer group transition-all shadow-inner"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e);
            }}
          >
            <input type="file" className="hidden" accept="image/*,video/mp4,video/mov,image/gif" onChange={handleFileUpload} />
            <div className="flex flex-col items-center">
              <FolderOpen className="w-5 h-5 mb-1 text-blender-active group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white">Open Data</span>
            </div>
          </label>

          {mediaUrl && (
            <div className="space-y-2">
              <div className="border border-blender-border rounded-sm bg-black relative shadow-lg overflow-hidden group">
                <div className="aspect-video flex items-center justify-center">
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="max-h-full max-w-full" loop muted playsInline />
                  ) : (
                    <img src={mediaUrl} className="max-h-full max-w-full" alt="Source" />
                  )}
                </div>
              </div>

              {mediaType === 'video' && (
                <button
                  onClick={togglePlay}
                  className="flex items-center justify-center gap-2 w-full py-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm text-[10px] font-bold text-gray-300 transition-colors shadow-sm"
                >
                  {isPlaying ? (
                    <><Pause className="w-3 h-3 text-blender-active" /> PAUSE PLAYBACK</>
                  ) : (
                    <><Play className="w-3 h-3 text-blender-active" /> START PLAYBACK</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Render Properties">
        <div className="space-y-3">
          <PropertyRow label="Sampling Mode">
            <div className="flex rounded-sm border border-blender-border overflow-hidden shadow-sm">
              {['custom', 'balanced', 'dark'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAsciiMode(mode)}
                  className={`flex-1 py-1 px-1 text-[10px] font-bold capitalize transition-colors ${asciiMode === mode
                    ? 'bg-blender-active text-white shadow-inner'
                    : 'bg-blender-input text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </PropertyRow>

          {asciiMode === 'custom' && (
            <PropertyRow label="Character Ramp">
              <input
                type="text"
                value={customChars}
                onChange={(e) => setCustomChars(e.target.value)}
                className="w-full bg-blender-input border border-blender-border text-blender-accent font-mono text-[10px] px-2 py-1 rounded-sm outline-none focus:border-blender-active shadow-inner"
              />
            </PropertyRow>
          )}

          <PropertyRow label="Resolution">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-blender-input border border-blender-border rounded-sm h-5 relative flex items-center px-1 overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-blender-active/20"
                  style={{ width: `${(resolution / 3) * 100}%` }}
                />
                <input
                  type="range" min="1" max="3" step="0.1"
                  value={resolution}
                  onChange={(e) => setResolution(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-ew-resize"
                />
                <span className="relative text-[9px] text-gray-300 font-bold ml-auto pointer-events-none">
                  {resolution.toFixed(1)}x
                </span>
              </div>
            </div>
          </PropertyRow>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Output">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={downloadImage}
            className="flex items-center gap-2 px-2 py-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm transition-all group"
          >
            <Camera className="w-3.5 h-3.5 text-gray-400 group-hover:text-blender-active" />
            <span className="text-[10px] text-gray-400 group-hover:text-white font-medium">Image</span>
          </button>
          <button
            onClick={downloadText}
            className="flex items-center gap-2 px-2 py-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm transition-all group"
          >
            <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blender-active" />
            <span className="text-[10px] text-gray-400 group-hover:text-white font-medium">Text</span>
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-2 py-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm transition-all group"
          >
            <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-blender-active" />
            <span className="text-[10px] text-gray-400 group-hover:text-white font-medium">Copy</span>
          </button>
          <button
            onClick={copyEmbeddableCode}
            className="flex items-center gap-2 px-2 py-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm transition-all group"
          >
            <Code className="w-3.5 h-3.5 text-gray-400 group-hover:text-blender-active" />
            <span className="text-[10px] text-gray-400 group-hover:text-white font-medium">Embed</span>
          </button>
        </div>
      </CollapsiblePanel>

      {/* Info panel at bottom */}
      <div className="mt-auto p-4 border-t border-blender-border bg-blender-header/30">
        <div className="flex items-center gap-2 opacity-50">
          <ImageIcon className="w-3 h-3" />
          <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Workspace: Studio</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

