import React from 'react';

export default function PageLoader() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-8 animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing shimmer ring */}
        <div className="absolute h-20 w-20 rounded-full bg-gradient-to-tr from-sky-400/30 to-blue-600/30 blur-xl animate-pulse"></div>
        
        {/* Glass container */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 backdrop-blur-xl border border-sky-100/80 shadow-2xl shadow-sky-950/10">
          {/* Animated spinner */}
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500"></div>
        </div>
      </div>
      
      {/* Loading text with shimmer */}
      <div className="mt-5 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-sky-500 animate-pulse">
          Sky Banking
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          Loading workspace...
        </p>
      </div>
    </div>
  );
}
