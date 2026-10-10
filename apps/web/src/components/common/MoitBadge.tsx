import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { BUSINESS_INFO } from '../../config/businessInfo';

interface MoitBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Bộ Công Thương Notification & Compliance Badge
 * Tuân thủ Thông tư 47/2014/TT-BCT và Thông tư 01/2022/TT-BCT của Bộ Công Thương.
 * - Khi hồ sơ Doanh nghiệp đang nộp chờ duyệt: Hiển thị minh bạch "HỒ SƠ ĐÃ NỘP / ĐANG DUYỆT".
 * - Khi đã được phê duyệt: Hiển thị "ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG".
 */
export const MoitBadge: React.FC<MoitBadgeProps> = ({ className = '', size = 'md' }) => {
  const isSm = size === 'sm';
  const isPending = BUSINESS_INFO.moitStatus === 'pending';

  return (
    <a
      href={BUSINESS_INFO.moitVerifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={
        isPending
          ? 'Hồ sơ Doanh nghiệp Đang Chờ Phê Duyệt tại Bộ Công Thương (Cổng thông tin Quản lý hoạt động TMĐT - online.gov.vn)'
          : 'Website Thương mại điện tử Đã Thông Báo Bộ Công Thương (online.gov.vn)'
      }
      aria-label="Thông báo Bộ Công Thương - online.gov.vn"
      className={`inline-flex items-center gap-2.5 p-2 rounded-xl transition-all group ${
        isPending
          ? 'bg-amber-50/60 dark:bg-amber-950/20 border border-amber-400/40 dark:border-amber-700/40 hover:border-amber-500/70'
          : 'bg-gradient-to-r from-blue-900/10 via-sky-800/10 to-blue-900/10 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-blue-950/40 border border-blue-500/30 dark:border-blue-700/50 hover:border-blue-500/60'
      } ${className}`}
    >
      {/* Official MOIT Seal Graphic SVG */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          className={isSm ? 'w-8 h-8' : 'w-10 h-10'}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circle */}
          <circle cx="50" cy="50" r="46" fill={isPending ? '#b45309' : '#0052cc'} stroke={isPending ? '#78350f' : '#003380'} strokeWidth="3" />
          <circle cx="50" cy="50" r="40" stroke="#ffd700" strokeWidth="2" strokeDasharray="3 2" />
          {/* Inner circle */}
          <circle cx="50" cy="50" r="32" fill={isPending ? '#92400e' : '#003d99'} />
          {/* Vietnam Star */}
          <polygon
            points="50,26 53,37 64,37 55,44 58,55 50,48 42,55 45,44 36,37 47,37"
            fill="#ffd700"
          />
          {/* Ribbon */}
          <path
            d="M28 66 Q50 60 72 66 L68 76 Q50 71 32 76 Z"
            fill="#d32f2f"
            stroke="#b71c1c"
            strokeWidth="1"
          />
          <text
            x="50"
            y="72"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7"
            fontWeight="bold"
            letterSpacing="0.3"
            fontFamily="Arial, sans-serif"
          >
            {isPending ? 'ĐANG NỘP HỒ SƠ' : 'ĐÃ THÔNG BÁO'}
          </text>
          {/* Sub text */}
          <text
            x="50"
            y="85"
            textAnchor="middle"
            fill="#ffd700"
            fontSize="6.5"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            BỘ CÔNG THƯƠNG
          </text>
        </svg>
      </div>

      {/* Label and verification status */}
      <div className="text-left leading-tight">
        <div className={`text-[11px] sm:text-xs font-bold uppercase tracking-tight flex items-center gap-1 ${
          isPending ? 'text-amber-800 dark:text-amber-300' : 'text-blue-900 dark:text-blue-300'
        }`}>
          <span>{isPending ? 'HỒ SƠ ĐÃ NỘP' : 'ĐÃ THÔNG BÁO'}</span>
          {isPending ? (
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <CheckCircle className="w-3 h-3 text-emerald-500 fill-emerald-500/20 shrink-0" />
          )}
        </div>
        <div className="text-[10px] sm:text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          BỘ CÔNG THƯƠNG
        </div>
        <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
          {isPending ? 'online.gov.vn · Chờ duyệt' : 'online.gov.vn'}
        </div>
      </div>
    </a>
  );
};
export default MoitBadge;
