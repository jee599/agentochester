"use client";

export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head silhouette — sharp angular profile facing right */}
      <path
        d="M8 8C8 8 10 4 16 4C20 4 24 6 26 10C27 12 27 15 26 17L28 16L32 18L26 19C24 22 20 26 14 28C10 29 6 28 6 28C6 28 8 24 8 20C8 16 8 12 8 8Z"
        fill="url(#crow-head)"
      />
      {/* Beak — sharp pointed */}
      <path d="M26 14L34 12L26 17Z" fill="#f59e0b" />
      <path d="M26 14L34 12L30 14.5" stroke="#d97706" strokeWidth="0.3" />
      {/* Eye — intense */}
      <circle cx="21" cy="12" r="3.5" fill="#1e1b4b" />
      <circle cx="21.5" cy="11.5" r="2" fill="#fbbf24" />
      <circle cx="21.2" cy="11.2" r="1.1" fill="#1e1b4b" />
      <circle cx="21.5" cy="10.8" r="0.35" fill="white" />
      {/* Brow ridge — aggressive */}
      <path d="M17 9C19 8 22 8 25 10" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />
      {/* Head crest feathers — sharp spiky */}
      <path d="M12 6L8 1" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 5L12 0" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 4.5L15 0.5" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
      {/* Neck feather texture */}
      <path d="M10 20C12 19 14 20 12 22" stroke="#6d28d9" strokeWidth="0.8" opacity="0.5" />
      <path d="M8 22C10 21 12 22 10 24" stroke="#6d28d9" strokeWidth="0.8" opacity="0.5" />
      <path d="M9 17C11 16 13 17 11 19" stroke="#6d28d9" strokeWidth="0.8" opacity="0.5" />
      <defs>
        <linearGradient id="crow-head" x1="6" y1="4" x2="20" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="0.6" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
    </svg>
  );
}
