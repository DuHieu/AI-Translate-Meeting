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
      return 'bg-red-600 hover:bg-red-500 text-white border border-red-600';
    }
    if (active) {
      return 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-600';
    }
    return 'bg-[#222224] hover:bg-[#2a2a2c] dark:bg-[#222224] dark:hover:bg-[#2a2a2c] bg-zinc-100 hover:bg-zinc-200 text-zinc-300 dark:text-zinc-300 text-zinc-700 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 hover:border-[#52525b] hover:text-zinc-100 dark:hover:text-zinc-100 hover:text-zinc-900';
  };

  return (
    <div className="relative group inline-block">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${getButtonStyles()}`}
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
