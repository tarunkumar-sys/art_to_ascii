import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, FolderOpen, Play, Pause,
  Camera, Download, Copy, Code, Type, Settings2,
  Box, Image as ImageIcon, Sliders, MousePointer2, Move, ZoomIn, ZoomOut, Maximize,
  Wrench, Globe, Database
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
  zoom, setZoom, pan, setPan, activeTool, setActiveTool
}) => {
  const [activeTab, setActiveTab] = useState('render');

  const tabs = [
    { id: 'render', icon: Camera, tooltip: 'Render Properties' },
    { id: 'media', icon: ImageIcon, tooltip: 'Source Media' },
    { id: 'tools', icon: MousePointer2, tooltip: 'Viewport Tools' },
    { id: 'data', icon: Database, tooltip: 'Object Data' },
    { id: 'modifiers', icon: Wrench, tooltip: 'Modifiers' },
    { id: 'world', icon: Globe, tooltip: 'World Properties' }
  ];

  return (
    <div className="flex h-full overflow-hidden bg-blender-panel">
      {/* Vertical Icon Strip (Blender Style) */}
      <div className="w-10 border-r border-blender-border bg-blender-header/50 flex flex-col items-center py-2 gap-1 select-none">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.tooltip}
            className={`p-2 cursor-pointer transition-all relative group ${
              activeTab === tab.id 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {activeTab === tab.id && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blender-active" />
            )}
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'drop-shadow-[0_0_8px_rgba(75,137,234,0.5)]' : ''}`} />
            
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] text-white text-[9px] rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-blender-border shadow-xl transition-opacity">
               {tab.tooltip}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden blender-scrollbar">
        {activeTab === 'render' && (
          <CollapsiblePanel title="Render Settings">
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
        )}

        {activeTab === 'media' && (
          <CollapsiblePanel title="Media Source">
            <div className="space-y-3">
              <label
                className="flex items-center justify-center w-full bg-blender-input hover:bg-blender-hover border border-blender-border rounded-sm py-4 cursor-pointer group transition-all shadow-inner"
              >
                <input type="file" className="hidden" accept="image/*,video/mp4,video/mov,image/gif" onChange={handleFileUpload} />
                <div className="flex flex-col items-center">
                  <FolderOpen className="w-5 h-5 mb-1 text-blender-active group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white">Open File</span>
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
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] text-gray-500 truncate max-w-[120px]">{mediaUrl.split('/').pop()}</span>
                    <span className="text-[9px] text-blender-active uppercase font-bold">{mediaType}</span>
                  </div>
                </div>
              )}
            </div>
          </CollapsiblePanel>
        )}

        {activeTab === 'tools' && (
          <CollapsiblePanel title="Viewport Tools">
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Tool</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveTool('pointer')}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border transition-all ${
                      activeTool === 'pointer' 
                        ? 'bg-blender-active border-blue-400/30 text-white' 
                        : 'bg-blender-input border-blender-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <MousePointer2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Select</span>
                  </button>
                  <button
                    onClick={() => setActiveTool('move')}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border transition-all ${
                      activeTool === 'move' 
                        ? 'bg-blender-active border-blue-400/30 text-white' 
                        : 'bg-blender-input border-blender-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Move</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-blender-border">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">View Navigation</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                    className="flex items-center gap-2 px-2 py-1.5 bg-blender-input border border-blender-border rounded-sm text-gray-400 hover:text-gray-200 transition-all"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Out</span>
                  </button>
                  <button
                    onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                    className="flex items-center gap-2 px-2 py-1.5 bg-blender-input border border-blender-border rounded-sm text-gray-400 hover:text-gray-200 transition-all"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">In</span>
                  </button>
                </div>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-blender-input border border-blender-border rounded-sm text-gray-400 hover:text-gray-200 transition-all"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-widest">Reset Viewport</span>
                </button>
              </div>
            </div>
          </CollapsiblePanel>
        )}

        {(activeTab === 'data' || activeTab === 'modifiers' || activeTab === 'world') && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-30">
             <Sliders className="w-12 h-12 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Tab Not Available</span>
            <span className="text-[9px] mt-1">This context is not applicable for ASCII Art.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
