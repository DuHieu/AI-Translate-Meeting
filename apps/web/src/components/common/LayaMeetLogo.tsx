import React from 'react';

export interface LayaMeetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
  version?: 'v1' | 'v2' | 'v3';
}

/**
 * LayaMeet Enterprise Mascot + Cinema Camera Emblem
 * Geometric Falcon/Fox Mascot integrated with a Precision Optical Camera Lens.
 * Executive Teal & Deep Slate Palette — trustworthy, calm, ERP-grade corporate identity.
 */
export const LayaMeetMascotCameraLogo: React.FC<Omit<LayaMeetLogoProps, 'version'>> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '_');

  const iconDimensions = {
    sm: { box: 'w-7 h-7', text: 'text-sm' },
    md: { box: 'w-8 h-8', text: 'text-base sm:text-lg' },
    lg: { box: 'w-10 h-10', text: 'text-lg sm:text-xl' },
    xl: { box: 'w-12 h-12', text: 'text-xl sm:text-2xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Mascot + Camera Corporate Emblem */}
      <div
        className={`${iconDimensions.box} rounded-lg overflow-hidden shrink-0 shadow-xs ring-1 ring-slate-900/10 dark:ring-white/10`}
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${id}_bg`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id={`${id}_mascot`} x1="20" y1="16" x2="108" y2="112" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0F766E" />
            </linearGradient>
            <linearGradient id={`${id}_lens`} x1="44" y1="48" x2="84" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Deep Executive Slate Background */}
          <rect width="128" height="128" rx="24" fill={`url(#${id}_bg)`} />

          {/* Geometric Mascot Ears (Owl / Fox Silhouette) */}
          <path
            d="M24 52L30 20L54 38H74L98 20L104 52Z"
            fill={`url(#${id}_mascot)`}
          />
          <path d="M32 44L35 27L48 38H32Z" fill="#CCFBF1" fillOpacity="0.8" />
          <path d="M96 44L93 27L80 38H96Z" fill="#CCFBF1" fillOpacity="0.8" />

          {/* Camera Body / Mascot Head */}
          <rect
            x="20"
            y="40"
            width="88"
            height="66"
            rx="16"
            fill={`url(#${id}_mascot)`}
            stroke="#5EEAD4"
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />

          {/* Mascot Cheeks / Camera Grip */}
          <path
            d="M20 76C32 76 38 86 44 106H28C23.5817 106 20 102.418 20 98V76Z"
            fill="#F1F5F9"
            fillOpacity="0.95"
          />
          <path
            d="M108 76C96 76 90 86 84 106H100C104.418 106 108 102.418 108 98V76Z"
            fill="#F1F5F9"
            fillOpacity="0.95"
          />

          {/* Broadcast Tally Indicator */}
          <circle cx="92" cy="54" r="4.5" fill="#10B981" />
          <circle cx="92" cy="54" r="2" fill="#D1FAE5" />

          {/* Center Optical Camera Lens */}
          <circle cx="64" cy="73" r="23" fill="#0F172A" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="64" cy="73" r="15" fill={`url(#${id}_lens)`} />
          <circle cx="64" cy="73" r="7" fill="#0F172A" />

          {/* Optical Reflection */}
          <circle cx="58" cy="67" r="3.5" fill="#FFFFFF" fillOpacity="0.9" />
          <circle cx="70" cy="78" r="1.8" fill="#BAE6FD" fillOpacity="0.85" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-1.5">
          <div className="flex items-baseline tracking-tight leading-none">
            <span className={`${iconDimensions.text} text-slate-900 dark:text-slate-100 font-bold tracking-[-0.02em]`}>
              Laya
            </span>
            <span className={`${iconDimensions.text} text-[#0F766E] dark:text-teal-400 font-semibold ml-0.5 tracking-[-0.01em]`}>
              Meet
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const LayaMeetLogo: React.FC<LayaMeetLogoProps> = (props) => {
  return <LayaMeetMascotCameraLogo {...props} />;
};
export const LayaMeetLogoV1 = LayaMeetMascotCameraLogo;
export const LayaMeetLogoV2 = LayaMeetMascotCameraLogo;
