"use client";

export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4L10 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M9 4L15 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M14 4L20 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M6 16C6 16 8 20 12 20C16 20 18 16 18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
