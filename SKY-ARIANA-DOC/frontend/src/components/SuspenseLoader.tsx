import React from 'react';
import { Loader2 } from 'lucide-react';

export default function SuspenseLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-4 text-blue-600/80">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-medium animate-pulse text-slate-500">Loading...</span>
      </div>
    </div>
  );
}
