import React, { useState } from 'react';
import { X, Copy, Check, Info } from 'lucide-react';

interface MeetingDetailsDialogProps {
  meetingCode: string;
  onClose: () => void;
}

export const MeetingDetailsDialog: React.FC<MeetingDetailsDialogProps> = ({ meetingCode, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `Join AI Translate Meeting\nMeeting code: ${meetingCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-lg">
            <Info className="w-5 h-5 text-sky-400" />
            <span>Meeting Details</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Joining Code</label>
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-lg font-mono font-bold text-sky-400 text-center tracking-widest uppercase">
              {meetingCode}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-emerald-300" />
                <span>Copied Joining Info!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copy Joining Info</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
