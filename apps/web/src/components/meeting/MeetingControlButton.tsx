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
      return 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 border-red-500';
    }
    if (active) {
      return 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/20';
    }
    return 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/80';
  };

  return (
    <div className="relative group inline-block">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`w-11 h-11 md:w-12 md:h-12 rounded-full border flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-40 disabled:cursor-not-allowed ${getButtonStyles()}`}
      >
        {icon}
      </button>

      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
};
