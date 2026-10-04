import React from 'react';

interface ViMeetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
}

export const ViMeetLogo: React.FC<ViMeetLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBadge = false,
  badgeText = 'vimeet.vn',
  className = '',
}) => {
  const iconDimensions = {
    sm: { box: 'w-6 h-6', icon: 14, text: 'text-sm', badge: 'text-[9px]' },
    md: { box: 'w-8 h-8', icon: 18, text: 'text-base sm:text-lg', badge: 'text-[10px]' },
    lg: { box: 'w-10 h-10', icon: 22, text: 'text-xl sm:text-2xl', badge: 'text-xs' },
    xl: { box: 'w-12 h-12', icon: 26, text: 'text-2xl sm:text-3xl', badge: 'text-xs' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon SVG: Geometric dual-wave V monogram with soundwave & intelligence node */}
      <div
        className={`${iconDimensions.box} rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 ring-1 ring-white/20 transition-all duration-300 hover:scale-105 hover:shadow-blue-500/30`}
        aria-hidden="true"
      >
        <svg
          width={iconDimensions.icon}
          height={iconDimensions.icon}
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white drop-shadow-xs"
        >
          {/* Main sleek V convergence */}
          <path
            d="M5 6L14 23L23 6"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner soundwave / translation beam */}
          <path
            d="M9.5 7L14 14.5L18.5 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.85"
          />
          {/* Center intelligence core */}
          <circle cx="14" cy="18.5" r="1.6" fill="#67e8f9" />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <div className="flex items-baseline tracking-tight">
            <span className={`font-black text-zinc-950 dark:text-white ${iconDimensions.text}`}>
              Vi
            </span>
            <span className={`font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent ${iconDimensions.text}`}>
              Meet
            </span>
          </div>

          {showBadge && (
            <span
              className={`hidden sm:inline font-mono font-semibold px-2 py-0.5 rounded-full border ${iconDimensions.badge} bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 shadow-xs`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
