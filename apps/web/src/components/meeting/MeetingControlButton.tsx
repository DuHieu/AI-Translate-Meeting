import React from 'react';

interface MeetingControlButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export const MeetingControlButton: React.FC<MeetingControlButtonProps> = ({
  icon,
  label,
  tooltip,
  onClick,
  active = false,
  danger = false,
  disabled = false,
}) => {
  const getButtonStyles = () => {
    if (danger) {
      return 'bg-[#ea4335] hover:bg-[#dc2626] text-white px-5 rounded-full';
    }
    if (active) {
      return 'bg-[#c2e7ff] hover:bg-[#a8c7fa] text-[#001d35] font-semibold rounded-full shadow-xs';
    }
    return 'bg-[#282a2d] hover:bg-[#35373b] text-[#e8eaed] rounded-full border border-zinc-700/60 hover:border-zinc-500';
  };

  return (
    <div className="relative group inline-block">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`h-11 ${danger ? 'w-14' : 'w-11'} flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${getButtonStyles()}`}
      >
        {icon}
      </button>

      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-[#222224] dark:bg-[#222224] bg-zinc-900 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-700 text-zinc-200 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
};
