/**
 * BeatlY — programmatic SVG logo.
 * Lightweight, fully scalable, uses brand palette via currentColor.
 * Hover: equalizer bars pulse.
 */
export function BeatlyLogo({
  size = 32,
  withWordmark = false,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`beatly-logo inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="BeatlY"
        role="img"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="beatlyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.22 250)" />
            <stop offset="100%" stopColor="oklch(0.85 0.16 205)" />
          </linearGradient>
          <filter id="beatlyGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Outer ring */}
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="url(#beatlyGrad)"
          strokeWidth="2.5"
          className="beatly-ring"
        />
        {/* Equalizer bars */}
        <g filter="url(#beatlyGlow)" fill="url(#beatlyGrad)">
          <rect className="beatly-bar bar-1" x="13" y="20" width="3.5" height="8" rx="1.75" />
          <rect className="beatly-bar bar-2" x="19" y="14" width="3.5" height="20" rx="1.75" />
          <rect className="beatly-bar bar-3" x="25" y="17" width="3.5" height="14" rx="1.75" />
          <rect className="beatly-bar bar-4" x="31" y="22" width="3.5" height="4" rx="1.75" />
        </g>
      </svg>
      {withWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight">
          Beatl<span className="text-gradient">Y</span>
        </span>
      )}
      <style>{`
        .beatly-logo .beatly-ring {
          transform-origin: 24px 24px;
          animation: beatly-spin 14s linear infinite;
        }
        .beatly-logo .beatly-bar {
          transform-origin: center;
          animation: beatly-pulse 1.6s ease-in-out infinite;
        }
        .beatly-logo .bar-1 { animation-delay: 0s; }
        .beatly-logo .bar-2 { animation-delay: 0.15s; }
        .beatly-logo .bar-3 { animation-delay: 0.3s; }
        .beatly-logo .bar-4 { animation-delay: 0.45s; }
        .beatly-logo:hover .beatly-bar { animation-duration: 0.7s; }
        @keyframes beatly-pulse {
          0%, 100% { transform: scaleY(0.6); }
          50% { transform: scaleY(1.2); }
        }
        @keyframes beatly-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}
