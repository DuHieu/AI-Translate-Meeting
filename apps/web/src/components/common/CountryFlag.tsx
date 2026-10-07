import React from 'react';

export interface CountryFlagProps {
  /** Language code ('vi', 'ja', 'en', etc.) or ISO country code ('VN', 'JP', 'US', etc.) */
  code: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<CountryFlagProps['size']>, string> = {
  xs: 'w-3.5 h-2.5 rounded-[2px]',
  sm: 'w-4 h-3 rounded-[2px]',
  md: 'w-5 h-3.5 rounded-[3px]',
  lg: 'w-6 h-4 rounded-[3px]',
};

/**
 * Renders a crisp, cross-platform SVG national flag for spoken/subtitle languages.
 * Solves Windows Chromium rendering Unicode regional indicator emojis as [V][N], [J][P], [U][S].
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  className = '',
  size = 'sm',
}) => {
  const normalized = code.trim().toLowerCase();
  const baseClass = `inline-block shrink-0 overflow-hidden shadow-2xs ring-1 ring-black/15 dark:ring-white/15 align-middle ${SIZE_CLASSES[size]} ${className}`;

  // Vietnam (vi / vn)
  if (normalized === 'vi' || normalized === 'vn') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="20" fill="#DA251D" />
        <polygon
          points="15,4 16.47,8.52 21.22,8.52 17.38,11.31 18.85,15.83 15,13.04 11.15,15.83 12.62,11.31 8.78,8.52 13.53,8.52"
          fill="#FFFF00"
        />
      </svg>
    );
  }

  // Japan (ja / jp)
  if (normalized === 'ja' || normalized === 'jp') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="20" fill="#FFFFFF" />
        <circle cx="15" cy="10" r="6" fill="#BC002D" />
      </svg>
    );
  }

  // United States / English (en / us)
  if (normalized === 'en' || normalized === 'us') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="20" fill="#B22234" />
        <path
          d="M0,3.07h30 M0,6.15h30 M0,9.23h30 M0,12.3h30 M0,15.38h30 M0,18.46h30"
          stroke="#FFFFFF"
          strokeWidth="1.54"
        />
        <rect width="13" height="10.77" fill="#3C3B6E" />
        <g fill="#FFFFFF">
          <circle cx="2.5" cy="2.2" r="0.7" />
          <circle cx="6.5" cy="2.2" r="0.7" />
          <circle cx="10.5" cy="2.2" r="0.7" />
          <circle cx="4.5" cy="4.2" r="0.7" />
          <circle cx="8.5" cy="4.2" r="0.7" />
          <circle cx="2.5" cy="6.2" r="0.7" />
          <circle cx="6.5" cy="6.2" r="0.7" />
          <circle cx="10.5" cy="6.2" r="0.7" />
          <circle cx="4.5" cy="8.2" r="0.7" />
          <circle cx="8.5" cy="8.2" r="0.7" />
        </g>
      </svg>
    );
  }

  // China (zh / cn)
  if (normalized === 'zh' || normalized === 'cn') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="20" fill="#DE2910" />
        <polygon
          points="5,3 5.7,5.2 8,5.2 6.1,6.6 6.8,8.8 5,7.4 3.2,8.8 3.9,6.6 2,5.2 4.3,5.2"
          fill="#FFDE00"
        />
        <circle cx="10" cy="3" r="0.8" fill="#FFDE00" />
        <circle cx="11.5" cy="5" r="0.8" fill="#FFDE00" />
        <circle cx="11.5" cy="7.5" r="0.8" fill="#FFDE00" />
        <circle cx="10" cy="9.5" r="0.8" fill="#FFDE00" />
      </svg>
    );
  }

  // South Korea (ko / kr)
  if (normalized === 'ko' || normalized === 'kr') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="20" fill="#FFFFFF" />
        <circle cx="15" cy="10" r="4.8" fill="#CD2E3A" />
        <path d="M10.2,10 a4.8,4.8 0 0,0 9.6,0 a2.4,2.4 0 0,0 -4.8,0 a2.4,2.4 0 0,1 -4.8,0" fill="#0047A0" />
      </svg>
    );
  }

  // France (fr)
  if (normalized === 'fr') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="10" height="20" fill="#002395" />
        <rect x="10" width="10" height="20" fill="#FFFFFF" />
        <rect x="20" width="10" height="20" fill="#ED2939" />
      </svg>
    );
  }

  // Germany (de)
  if (normalized === 'de') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="6.67" fill="#000000" />
        <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
        <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
      </svg>
    );
  }

  // Thailand (th)
  if (normalized === 'th') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="3.33" fill="#A51931" />
        <rect y="3.33" width="30" height="3.34" fill="#F4F5F8" />
        <rect y="6.67" width="30" height="6.66" fill="#2D2A4A" />
        <rect y="13.33" width="30" height="3.34" fill="#F4F5F8" />
        <rect y="16.67" width="30" height="3.33" fill="#A51931" />
      </svg>
    );
  }

  // Indonesia (id)
  if (normalized === 'id') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="10" fill="#CE1126" />
        <rect y="10" width="30" height="10" fill="#FFFFFF" />
      </svg>
    );
  }

  // Philippines (tl / ph)
  if (normalized === 'tl' || normalized === 'ph') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="10" fill="#0038A8" />
        <rect y="10" width="30" height="10" fill="#CE1126" />
        <polygon points="0,0 12,10 0,20" fill="#FFFFFF" />
        <circle cx="4.5" cy="10" r="1.8" fill="#FCD116" />
        <circle cx="1.5" cy="3" r="0.6" fill="#FCD116" />
        <circle cx="1.5" cy="17" r="0.6" fill="#FCD116" />
        <circle cx="9" cy="10" r="0.6" fill="#FCD116" />
      </svg>
    );
  }

  // Saudi Arabia / Arabic (ar / sa)
  if (normalized === 'ar' || normalized === 'sa') {
    return (
      <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
        <rect width="30" height="20" fill="#006C35" />
        <path
          d="M7,6 h16 M9,8 h12 M11,10 h8 M7,14 h14 M21,13 v2 M7,13.5 h-1"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line x1="8" y1="14" x2="20" y2="14" stroke="#FFFFFF" strokeWidth="1.2" />
        <polygon points="21,14 20,13 20,15" fill="#FFFFFF" />
      </svg>
    );
  }

  // Spain (es)
  return (
    <svg viewBox="0 0 30 20" className={baseClass} aria-hidden="true">
      <rect width="30" height="5" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
      <rect y="15" width="30" height="5" fill="#AA151B" />
    </svg>
  );
};
