"use client";

export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shrimp body — curved C shape */}
      <path
        d="M22 6C22 6 24 4 26 5C28 6 27 9 25 10C23 11 20 11 18 12C16 13 14 15 13 17C12 19 12 21 13 23C14 25 16 26 18 26"
        stroke="#a78bfa"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Shrimp shell segments */}
      <path d="M20 11.5C18.5 13 17 14.5 16 16" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 13C16.5 14.5 15.5 16 15 17.5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 15C15 16.5 14 18 13.5 19.5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
      {/* Tail fan */}
      <path d="M18 26C17 27 16 28.5 14 28.5" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 26C18.5 27.5 18 29 16.5 29.5" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 26C19.5 27 20.5 28.5 19 29.5" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" />
      {/* Antenna */}
      <path d="M25 8C27 6 29 4 30 2" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M25 9C28 8 30 6 31 4" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
      {/* Eye */}
      <circle cx="24" cy="8" r="1.2" fill="#c4b5fd" />
      {/* Legs */}
      <path d="M17 16L15 18.5" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
      <path d="M16 17.5L13.5 19.5" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
      <path d="M15 19L12.5 21" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
      <path d="M14 21L12 23" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
