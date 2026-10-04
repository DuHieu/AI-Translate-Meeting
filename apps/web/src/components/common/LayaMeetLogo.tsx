import React from 'react';

interface LayaMeetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
}

export const LayaMeetLogo: React.FC<LayaMeetLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBadge: _showBadge = false,
  badgeText: _badgeText = 'layameet.com',
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
      {/* Brand Icon: Geometric Letter 'L' Monogram with Acoustic Translation Bar */}
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
          {/* Elegant geometric letter 'L' backbone */}
          <path
            d="M6.5 5.5V16.5C6.5 17.6046 7.39543 18.5 8.5 18.5H17.5"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Translation bridge bar above the base */}
          <path
            d="M10.5 14.5H18"
            stroke="#93c5fd"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Active meeting voice node */}
          <circle cx="17" cy="8" r="1.5" fill="#60a5fa" />
        </svg>
      </div>

      {/* Custom Designed Wordmark: 'Laya' confident + 'Meet' blue accent */}
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
