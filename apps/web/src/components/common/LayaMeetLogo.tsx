import React from 'react';

export interface LayaMeetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
  version?: 'v1' | 'v2';
}

/**
 * Version 1 (Original): Geometric Letter 'L' Monogram with Acoustic Translation Bar
 * Preserved for historical continuity or when explicitly needed via version="v1".
 */
export const LayaMeetLogoV1: React.FC<Omit<LayaMeetLogoProps, 'version'>> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: { box: 'w-6 h-6', icon: 14, text: 'text-sm' },
    md: { box: 'w-8 h-8', icon: 18, text: 'text-base sm:text-lg' },
    lg: { box: 'w-10 h-10', icon: 22, text: 'text-xl sm:text-2xl' },
    xl: { box: 'w-12 h-12', icon: 26, text: 'text-2xl sm:text-3xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon V1: Monogram 'L' */}
      <div
        className={`${iconDimensions.box} rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105`}
        aria-hidden="true"
      >
        <svg
          width={iconDimensions.icon + 4}
          height={iconDimensions.icon + 4}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.5 5.5V16.5C6.5 17.6046 7.39543 18.5 8.5 18.5H17.5"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 14.5H18"
            stroke="#93c5fd"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="17" cy="8" r="1.5" fill="#60a5fa" />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex items-center gap-2">
          <div className="flex items-baseline tracking-tight font-extrabold leading-none">
            <span className={`${iconDimensions.text} text-zinc-950 dark:text-zinc-50 font-black tracking-[-0.03em]`}>
              Laya
            </span>
            <span className={`${iconDimensions.text} text-blue-600 dark:text-blue-400 font-bold ml-0.5 tracking-[-0.01em]`}>
              Meet
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Version 2 (New): Meeting Room Conference & Camera Lens Logo
 * Exact vector graphic from meeting_room_logo_download.svg.
 */
export const LayaMeetLogoV2: React.FC<Omit<LayaMeetLogoProps, 'version'>> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '_');

  const iconDimensions = {
    sm: { box: 'w-6 h-6', text: 'text-sm' },
    md: { box: 'w-8 h-8', text: 'text-base sm:text-lg' },
    lg: { box: 'w-10 h-10', text: 'text-xl sm:text-2xl' },
    xl: { box: 'w-12 h-12', text: 'text-2xl sm:text-3xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon V2: Exact user SVG with squircle clipping & soft shadow */}
      <div
        className={`${iconDimensions.box} rounded-xl overflow-hidden shrink-0 shadow-md shadow-blue-500/25 ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105`}
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient
              id={`${id}_bg`}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(256 256) rotate(90) scale(360)"
            >
              <stop offset="0%" stopColor="#1F73FF" />
              <stop offset="100%" stopColor="#0B56F0" />
            </radialGradient>
            <linearGradient id={`${id}_whiteGrad`} x1="120" y1="110" x2="420" y2="430" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EDF3FF" />
            </linearGradient>
            <linearGradient id={`${id}_pillGrad`} x1="195" y1="275" x2="430" y2="325" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D6EDFF" />
              <stop offset="100%" stopColor="#B9DEFF" />
            </linearGradient>
            <linearGradient id={`${id}_outerLensGrad`} x1="270" y1="95" x2="430" y2="255" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8FE2FF" />
              <stop offset="100%" stopColor="#5FC7FF" />
            </linearGradient>
            <radialGradient
              id={`${id}_innerLensGrad`}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(352 168) rotate(135) scale(70)"
            >
              <stop offset="0%" stopColor="#D5EEFF" />
              <stop offset="100%" stopColor="#6FB7FF" />
            </radialGradient>
            <filter id={`${id}_shadow`} x="0" y="0" width="512" height="512" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#083FB3" floodOpacity="0.18" />
            </filter>
            <filter id={`${id}_softShadow`} x="0" y="0" width="512" height="512" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#083FB3" floodOpacity="0.14" />
            </filter>
            <clipPath id={`${id}_innerLensClip`}>
              <circle cx="352" cy="168" r="40" />
            </clipPath>
          </defs>
          <rect width="512" height="512" fill={`url(#${id}_bg)`} />
          <g filter={`url(#${id}_shadow)`}>
            <path
              d="M138 112V376C138 407.48 163.52 433 195 433H424"
              stroke={`url(#${id}_whiteGrad)`}
              strokeWidth="64"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g filter={`url(#${id}_softShadow)`}>
            <rect x="190" y="288" width="240" height="50" rx="25" fill={`url(#${id}_pillGrad)`} />
            <path d="M200 293C204 293 209 296 213 301" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g filter={`url(#${id}_softShadow)`}>
            <circle cx="352" cy="168" r="78" fill={`url(#${id}_outerLensGrad)`} fillOpacity="0.95" />
            <circle cx="352" cy="168" r="49" stroke="#0F5CFF" strokeWidth="20" />
            <circle cx="352" cy="168" r="40" fill={`url(#${id}_innerLensGrad)`} />
            <g clipPath={`url(#${id}_innerLensClip)`}>
              <ellipse cx="372" cy="188" rx="24" ry="24" fill="#5EAFFF" fillOpacity="0.22" />
              <ellipse cx="338" cy="151" rx="30" ry="26" fill="#FFFFFF" fillOpacity="0.10" />
            </g>
            <circle cx="329" cy="145" r="12" fill="#FFFFFF" fillOpacity="0.95" />
            <path d="M299 120C313 104 333 94 356 92" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="6" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <div className="flex items-baseline tracking-tight font-extrabold leading-none">
            <span className={`${iconDimensions.text} text-zinc-950 dark:text-zinc-50 font-black tracking-[-0.03em]`}>
              Laya
            </span>
            <span className={`${iconDimensions.text} text-blue-600 dark:text-blue-400 font-bold ml-0.5 tracking-[-0.01em]`}>
              Meet
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Universal LayaMeet Logo component
 * Defaults to 'v2' (exact meeting_room_logo_download.svg) while preserving 'v1' for backward compatibility.
 */
export const LayaMeetLogo: React.FC<LayaMeetLogoProps> = ({ version = 'v2', ...props }) => {
  if (version === 'v1') {
    return <LayaMeetLogoV1 {...props} />;
  }
  return <LayaMeetLogoV2 {...props} />;
};
