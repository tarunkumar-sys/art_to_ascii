import React from 'react';
import { Monitor, Sliders } from 'lucide-react';

const Layout = ({ sidebar, viewer, bottomPanel, onHelpClick }) => {
  return (
    <div className="flex h-screen w-full bg-blender-bg text-blender-text font-sans overflow-hidden select-none text-[11px]">

      {/* Blender Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-blender-header border-b border-blender-border flex items-center px-1 z-30 shadow-md">
        {/* Editor Type Selector */}
        <div className="flex items-center px-2 py-0.5 hover:bg-blender-hover rounded-sm cursor-pointer mr-2 transition-colors">
          <Monitor className="w-3 h-3 text-blender-active mr-1.5" />
          <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
        </div>

        {/* Menus */}
        <div className="flex items-center gap-0.5">
          {['File', 'Edit', 'Render', 'Window', 'Help'].map((menu) => (
            <div
              key={menu}
              onClick={menu === 'Help' ? onHelpClick : undefined}
              className="px-2.5 py-0.5 hover:bg-blender-hover rounded-sm cursor-pointer text-gray-300 hover:text-white transition-colors"
            >
              {menu}
            </div>
          ))}
        </div>



        <div className="flex items-center h-full ml-auto overflow-hidden">
        </div>
      </div>

      <div className="flex flex-row w-full h-full pt-6">
        {/* Left Side Properties Panel (The "Properties" Editor) */}
        <div className="w-[280px] h-full bg-blender-panel border-r border-blender-border flex flex-col z-10 flex-shrink-0 shadow-xl">
          {/* Header for Properties panel */}
          <div className="h-6 bg-blender-header border-b border-blender-border flex items-center px-2 gap-2">
            <Sliders className="w-3 h-3 text-blender-accent" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Properties</span>
          </div>
          {sidebar}
        </div>

        {/* 3D/Viewer Viewport */}
        <div className="flex-1 h-full bg-blender-bg relative overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            {viewer}
          </div>
          {bottomPanel}
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default Layout;

