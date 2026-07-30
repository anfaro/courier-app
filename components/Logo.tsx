// components/Logo.tsx
interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 34, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 14H12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-blue-400 opacity-40" />
      <path d="M2 20H10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-blue-500 opacity-60" />
      <path d="M5 26H13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-blue-600 opacity-80" />
      <path d="M18 12L28 8L38 12V28L28 32L18 28V12Z" fill="url(#logo-gradient)" />
      <path d="M18 12L28 16L38 12" stroke="white" strokeWidth="1.5" strokeLinejoin="round" opacity="0.4" />
      <path d="M28 16V32" stroke="white" strokeWidth="1.5" strokeLinejoin="round" opacity="0.4" />
      <defs>
        <linearGradient id="logo-gradient" x1="18" y1="8" x2="38" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
