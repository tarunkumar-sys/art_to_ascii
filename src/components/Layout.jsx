import React from 'react';
import { Layers } from 'lucide-react';

const Layout = ({ sidebar, viewer, onHelpClick }) => {
  return (
    <div className="flex h-screen w-full bg-blender-bg text-blender-text font-sans overflow-hidden select-none">
      {/* Top Header Bar - Blender Style */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-blender-header border-b border-blender-border flex items-center px-4 text-xs font-medium z-20 shadow-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <Layers className="w-4 h-4 text-blender-active" />
          <span>Ascii-Studio v1.0</span>
        </div>
        <div className="flex items-center ml-6 gap-4">
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-blender-hover">File</span>
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-blender-hover">Edit</span>
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-blender-hover">Render</span>
          <span className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-blender-hover">Window</span>
          <span onClick={onHelpClick} className="hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-blender-hover">Help</span>
        </div>
      </div>

      <div className="flex flex-row w-full h-full pt-8">
        {/* Left Side Properties Panel */}
        <div className="w-[320px] h-full bg-blender-panel border-r border-blender-border flex flex-col z-10 flex-shrink-0">
          {sidebar}
        </div>

        {/* 3D/Viewer Viewport */}
        <div className="flex-1 h-full bg-blender-bg relative overflow-hidden">
          {viewer}
        </div>
      </div>
    </div>
  );
};

export default Layout;
