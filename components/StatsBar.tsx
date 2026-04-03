import React from 'react';

export default function StatsBar() {
  return (
    <div className="animate-fadeUp delay-[600ms] px-4 w-full mb-16 flex justify-center z-10 relative">
      <div className="border border-[var(--border)] rounded-xl max-w-[640px] w-full py-4 flex flex-col sm:flex-row items-center justify-evenly divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] bg-[var(--bg)]/50 backdrop-blur-sm">
        <div className="py-2 sm:py-0 px-6 w-full sm:w-auto text-center">
          <span className="font-dm font-[500] text-[var(--muted2)] text-sm">10+ AI Models</span>
        </div>
        <div className="py-2 sm:py-0 px-6 w-full sm:w-auto text-center">
          <span className="font-dm font-[500] text-[var(--muted2)] text-sm">5 Content types</span>
        </div>
        <div className="py-2 sm:py-0 px-6 w-full sm:w-auto text-center">
          <span className="font-dm font-[500] text-[var(--text)] text-sm">Free to start</span>
        </div>
        <div className="py-2 sm:py-0 px-6 w-full sm:w-auto text-center flex items-center justify-center gap-1.5">
          <span className="text-sm">🇺🇦</span>
          <span className="font-dm font-[500] text-[var(--muted2)] text-sm">Made with love</span>
        </div>
      </div>
    </div>
  );
}
