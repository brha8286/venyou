interface ScaLogoProps {
  className?: string;
  size?: number;
}

export function ScaLogo({ className, size = 40 }: ScaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      aria-label="Subculture Audio logo"
    >
      <rect width="100" height="100" fill="black" />
      {/* Outer circle */}
      <circle cx="50" cy="50" r="44" stroke="white" strokeWidth="3.5" />
      {/* Inner arc (upper portion) */}
      <path d="M 28 65 A 24 24 0 0 0 72 65" stroke="white" strokeWidth="3.5" />
      {/* Center circle */}
      <circle cx="50" cy="65" r="5.5" fill="black" stroke="white" strokeWidth="3" />
      {/* Left leg */}
      <line x1="47" y1="68" x2="18" y2="88" stroke="white" strokeWidth="3.5" />
      {/* Right leg */}
      <line x1="53" y1="68" x2="82" y2="88" stroke="white" strokeWidth="3.5" />
    </svg>
  );
}
