import React from 'react';
import { ChevronDown, FolderOpen, Play, Pause, Camera, Download, Copy, Code, Type, Settings2 } from 'lucide-react';

const PanelHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center px-2 py-1.5 bg-blender-header border-y border-blender-border cursor-pointer select-none">
    <ChevronDown className="w-3.5 h-3.5 mr-1 text-gray-400" />
    {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 text-gray-300" />}
    <span className="text-xs font-semibold text-gray-200 tracking-wide">{title}</span>
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
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden blender-scrollbar">
      {/* File Input Panel */}
      <PanelHeader title="Source Media" icon={FolderOpen} />
      <div className="p-3 text-xs">
        <label className="flex items-center justify-center w-full bg-blender-input hover:bg-blender-hover border border-blender-border rounded py-3 cursor-pointer group transition-colors">
          <input type="file" className="hidden" accept="image/*,video/mp4,video/mov,image/gif" onChange={handleFileUpload} />
          <FolderOpen className="w-4 h-4 mr-2 text-blender-active group-hover:text-white" />
          <span className="text-gray-300 font-medium">Open Media File</span>
        </label>

        {mediaUrl && (
          <div className="mt-3 bg-blender-input border border-blender-border rounded overflow-hidden relative">
            <div className="bg-blender-header px-2 py-1 border-b border-blender-border text-[10px] text-gray-400 flex justify-between">
              <span>Preview</span>
              <span>{mediaType.toUpperCase()}</span>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {mediaType === 'video' ? (
                <video ref={videoRef} src={mediaUrl} className="max-h-full max-w-full" loop muted playsInline />
              ) : (
                <img src={mediaUrl} className="max-h-full max-w-full" alt="Source" />
              )}
            </div>
            {mediaType === 'video' && (
              <div className="p-1.5 bg-blender-header flex justify-center border-t border-blender-border">
                <button onClick={togglePlay} className="px-4 py-1 bg-blender-panel hover:bg-blender-hover border border-blender-border rounded flex items-center">
                  {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Settings */}
      <PanelHeader title="ASCII Render Properties" icon={Settings2} />
      <div className="p-3 text-xs space-y-3 border-b border-blender-border">
        {/* Color Mode */}
        <div className="flex flex-col gap-1">
          <span className="text-gray-400">Color Profile</span>
          <div className="flex rounded border border-blender-border overflow-hidden">
            {['custom', 'balanced', 'dark'].map((mode) => (
              <button
                key={mode}
                onClick={() => setAsciiMode(mode)}
                className={`flex-1 py-1.5 capitalize text-center ${
                  asciiMode === mode 
                    ? 'bg-blender-active text-white font-medium' 
                    : 'bg-blender-input text-gray-400 hover:bg-blender-hover'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Character Set */}
        {asciiMode === 'custom' && (
          <div className="flex flex-col gap-1">
             <div className="flex justify-between items-center text-gray-400">
               <span>Character Ramp</span>
               <span className="text-[10px]">Dark → Light</span>
             </div>
             <input 
               type="text" 
               value={customChars}
               onChange={(e) => setCustomChars(e.target.value)}
               className="w-full bg-blender-input border border-blender-border text-blender-accent font-mono px-2 py-1.5 rounded outline-none focus:border-blender-active"
             />
          </div>
        )}

        {/* Resolution */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-gray-400">
            <span>Resolution Scale</span>
            <span className="font-mono text-blender-active">{resolution.toFixed(1)}x</span>
          </div>
          <div className="flex items-center px-1">
             <input 
               type="range" min="1" max="3" step="0.1"
               value={resolution}
               onChange={(e) => setResolution(parseFloat(e.target.value))}
               className="w-full accent-blender-active h-1 bg-blender-input rounded appearance-none cursor-pointer"
             />
          </div>
        </div>
      </div>

      {/* Export Output */}
      <PanelHeader title="Output & Export" icon={Camera} />
      <div className="p-3 text-xs grid grid-cols-2 gap-2">
         <button onClick={downloadImage} className="flex flex-col items-center justify-center p-2 bg-blender-input hover:bg-blender-hover border border-blender-border rounded gap-1 transition-colors">
            <Camera className="w-4 h-4 text-gray-300" />
            <span>Render Image</span>
         </button>
         <button onClick={downloadText} className="flex flex-col items-center justify-center p-2 bg-blender-input hover:bg-blender-hover border border-blender-border rounded gap-1 transition-colors">
            <Download className="w-4 h-4 text-gray-300" />
            <span>Save Text (.txt)</span>
         </button>
         <button onClick={copyToClipboard} className="flex items-center justify-center p-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded gap-1.5 transition-colors">
            <Copy className="w-3.5 h-3.5 text-blender-active" />
            <span>Copy ASCII</span>
         </button>
         <button onClick={copyEmbeddableCode} className="flex items-center justify-center p-1.5 bg-blender-input hover:bg-blender-hover border border-blender-border rounded gap-1.5 transition-colors">
            <Code className="w-3.5 h-3.5 text-blender-accent" />
            <span>Markdown</span>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
