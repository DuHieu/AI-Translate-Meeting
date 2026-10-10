import React from 'react';

export const VisaIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="VISA">
    <rect width="48" height="32" rx="4" fill="#0E4595" />
    <path
      d="M18.8 22H16L17.7 8.5H20.5L18.8 22ZM13.8 8.5L11.2 17.8L10.9 16.3C10.4 14.5 8.9 12.6 7.2 11.6L9.6 22H12.5L16.8 8.5H13.8ZM33.7 22H36.3L34.1 8.5H31.8C31.2 8.5 30.7 8.9 30.5 9.4L26 22H28.9L29.5 20.3H33.1L33.7 22ZM30.3 18.1L31.8 13.5L32.7 18.1H30.3ZM26.3 13.9C26.3 11.7 23.3 11.5 23.3 10.4C23.3 10 23.7 9.6 24.6 9.5C25 9.4 26.2 9.4 27.5 10L28 7.7C27.2 7.4 26.2 7.2 24.9 7.2C21.8 7.2 19.6 8.8 19.6 11.3C19.6 13.1 21.2 14.1 22.4 14.7C23.7 15.3 24.1 15.7 24.1 16.3C24.1 17.1 23.1 17.6 22.2 17.6C20.6 17.6 19.7 17.2 18.9 16.7L18.4 19.1C19.3 19.5 20.9 19.8 22.4 19.8C25.7 19.8 27.8 18.2 27.8 15.6L26.3 13.9Z"
      fill="white"
    />
  </svg>
);

export const MastercardIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Mastercard">
    <rect width="48" height="32" rx="4" fill="#252528" />
    <circle cx="19" cy="16" r="10" fill="#EB001B" />
    <circle cx="29" cy="16" r="10" fill="#F79E1B" fillOpacity="0.88" />
  </svg>
);

export const AmexIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="American Express">
    <rect width="48" height="32" rx="4" fill="#016FD0" />
    <text x="24" y="20" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.5">
      AMEX
    </text>
  </svg>
);

export const JcbIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="JCB">
    <rect width="48" height="32" rx="4" fill="#FFFFFF" />
    <rect x="7" y="6" width="10" height="20" rx="3" fill="#0E4595" />
    <rect x="19" y="6" width="10" height="20" rx="3" fill="#D9222A" />
    <rect x="31" y="6" width="10" height="20" rx="3" fill="#007940" />
    <text x="24" y="20" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
      JCB
    </text>
  </svg>
);

export const DiscoverIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Discover">
    <rect width="48" height="32" rx="4" fill="#252528" />
    <circle cx="27" cy="16" r="6" fill="#F26822" />
    <text x="22" y="19" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
      DISCOVER
    </text>
  </svg>
);

export const UnionPayIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="UnionPay">
    <rect width="48" height="32" rx="4" fill="#FFFFFF" />
    <rect x="10" y="7" width="9" height="18" rx="2" fill="#D9222A" />
    <rect x="19" y="7" width="9" height="18" rx="2" fill="#004A8F" />
    <rect x="28" y="7" width="9" height="18" rx="2" fill="#007940" />
    <text x="23.5" y="19" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
      UnionPay
    </text>
  </svg>
);

export const ApplePayIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Apple Pay">
    <rect width="48" height="32" rx="4" fill="#000000" stroke="#333336" strokeWidth="1" />
    <text x="24" y="20.5" fill="#FFFFFF" fontSize="7.5" fontWeight="600" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif" textAnchor="middle">
      Pay
    </text>
  </svg>
);

export const GooglePayIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-auto' }) => (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Google Pay">
    <rect width="48" height="32" rx="4" fill="#1F1F23" stroke="#333336" strokeWidth="1" />
    <text x="24" y="20.5" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" fontFamily="Roboto, sans-serif" textAnchor="middle" letterSpacing="0.3">
      G Pay
    </text>
  </svg>
);
