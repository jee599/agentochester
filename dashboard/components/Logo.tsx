"use client";

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chunky shrimp body — thicc curved bean */}
      <path
        d="M28 8C32 10 34 14 33 18C32 22 28 25 24 27C20 29 16 29 14 31"
        stroke="url(#shrimp-grad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Shell stripes */}
      <path d="M30 15C28 17 26 19 24 20" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M28 18C26 20 24 22 22 23" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Tail — 3 fan pieces spread out */}
      <path d="M14 31C11 33 8 33 6 31" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 31C12 34 9 36 6 35" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 31C13 35 12 37 10 38" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
      {/* Antenna — long swoopy */}
      <path d="M29 9C32 5 36 3 38 2" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 8C34 6 37 7 39 5" stroke="#ddd6fe" strokeWidth="1.2" strokeLinecap="round" />
      {/* Big cute eye */}
      <circle cx="28" cy="10" r="3" fill="#1e1b4b" />
      <circle cx="28" cy="10" r="2.2" fill="#ede9fe" />
      <circle cx="27" cy="9.5" r="1" fill="#1e1b4b" />
      <circle cx="27.5" cy="9" r="0.4" fill="white" />
      {/* Little legs */}
      <path d="M26 21L23 24" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 23L21 25.5" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22 25L19 27" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
      {/* Claw arm — one cute pincer */}
      <path d="M30 14L34 17" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 17L36 15.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M34 17L35.5 19" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      {/* Gradient def */}
      <defs>
        <linearGradient id="shrimp-grad" x1="14" y1="31" x2="33" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}
