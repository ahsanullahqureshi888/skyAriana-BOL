import React from 'react';
import GlassCard from './GlassCard';

export default function StatCard({ title, value, icon: Icon, colorClass = 'text-sky-500 bg-sky-50' }) {
  return (
    <GlassCard className="flex min-h-[118px] items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-500">{title}</p>
        <h3 className="mt-2 break-words text-[22px] font-black leading-tight text-slate-900">{value}</h3>
      </div>
    </GlassCard>
  );
}
