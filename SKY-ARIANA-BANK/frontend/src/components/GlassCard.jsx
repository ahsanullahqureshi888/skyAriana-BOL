import React from 'react';

export default function GlassCard({ children, className = '', id, onClick, style }) {
  const interactiveStyles = onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-500/10 hover:border-sky-300/80 active:translate-y-0' : 'hover:shadow-2xl hover:shadow-sky-950/[0.08] hover:border-sky-200/80';
  return (
    <div
      id={id}
      onClick={onClick}
      style={style}
      className={`bg-white/80 backdrop-blur-xl border border-sky-100/70 rounded-3xl shadow-xl shadow-sky-950/[0.06] transition-all duration-300 ease-out ${interactiveStyles} ${className}`}
    >
      {children}
    </div>
  );
}
