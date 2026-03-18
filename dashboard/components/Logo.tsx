"use client";

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head — triangular */}
      <path d="M20 6L16 14L24 14Z" fill="#a78bfa" />
      {/* Big compound eyes */}
      <circle cx="15" cy="8" r="3.5" fill="#7c3aed" />
      <circle cx="25" cy="8" r="3.5" fill="#7c3aed" />
      <circle cx="15.5" cy="7.5" r="1.8" fill="#ede9fe" />
      <circle cx="25.5" cy="7.5" r="1.8" fill="#ede9fe" />
      <circle cx="15" cy="7" r="0.8" fill="#1e1b4b" />
      <circle cx="25" cy="7" r="0.8" fill="#1e1b4b" />
      <circle cx="15.3" cy="6.7" r="0.3" fill="white" />
      <circle cx="25.3" cy="6.7" r="0.3" fill="white" />
      {/* Antenna */}
      <path d="M16 6C14 3 11 1 9 2" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 6C26 3 29 1 31 2" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round" />
      {/* Body — long thorax + abdomen */}
      <path d="M18 14L17 20L16 28" stroke="url(#mantis-body)" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 14L23 20L24 28" stroke="url(#mantis-body)" strokeWidth="4" strokeLinecap="round" />
      <rect x="16" y="14" width="8" height="4" rx="1" fill="#a78bfa" />
      <rect x="15.5" y="18" width="9" height="4" rx="1" fill="#8b5cf6" />
      <rect x="15" y="22" width="10" height="4" rx="1" fill="#7c3aed" />
      <rect x="16" y="26" width="8" height="3" rx="1" fill="#6d28d9" />
      {/* Raptorial front arms — praying pose */}
      <path d="M16 15C12 13 8 11 6 8" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 8C5 6 4 4 5 3" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 15C28 13 32 11 34 8" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 8C35 6 36 4 35 3" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
      {/* Spikes on arms */}
      <path d="M10 11L9 9" stroke="#7c3aed" strokeWidth="1" strokeLinecap="round" />
      <path d="M12 12L11 10" stroke="#7c3aed" strokeWidth="1" strokeLinecap="round" />
      <path d="M30 11L31 9" stroke="#7c3aed" strokeWidth="1" strokeLinecap="round" />
      <path d="M28 12L29 10" stroke="#7c3aed" strokeWidth="1" strokeLinecap="round" />
      {/* Back legs */}
      <path d="M17 22L12 26" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 25L13 29" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M23 22L28 26" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M23 25L27 29" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      {/* Wings — translucent */}
      <path d="M22 16C26 18 30 22 28 28" stroke="#c4b5fd" strokeWidth="0.8" fill="#8b5cf6" fillOpacity="0.15" />
      <path d="M18 16C14 18 10 22 12 28" stroke="#c4b5fd" strokeWidth="0.8" fill="#8b5cf6" fillOpacity="0.15" />
      {/* Gradient def */}
      <defs>
        <linearGradient id="mantis-body" x1="20" y1="14" x2="20" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
