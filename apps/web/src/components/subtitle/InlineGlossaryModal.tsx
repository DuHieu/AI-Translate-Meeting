import React, { useState } from 'react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { BookMarked, Check, Plus, X } from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { getUserSettings, saveUserSettings } from '../../utils/userSettings';

export interface InlineGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode?: string;
  initialSourceTerm?: string;
  initialTargetTerm?: string;
  onTermSaved?: (source: string, target: string) => void;
}

export const InlineGlossaryModal: React.FC<InlineGlossaryModalProps> = ({
  isOpen,
  onClose,
  meetingCode,
  initialSourceTerm = '',
  initialTargetTerm = '',
  onTermSaved,
}) => {
  const [sourceTerm, setSourceTerm] = useState(initialSourceTerm);
  const [targetTerm, setTargetTerm] = useState(initialTargetTerm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSourceTerm(initialSourceTerm);
      setTargetTerm(initialTargetTerm);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialSourceTerm, initialTargetTerm]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanSource = sourceTerm.trim();
    const cleanTarget = targetTerm.trim();

    if (!cleanSource || !cleanTarget) {
      setError('Vui lòng nhập cả thuật ngữ gốc và bản dịch chuẩn.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const currentSettings = getUserSettings();
      const updatedGlossary = {
        ...currentSettings.customGlossary,
        [cleanSource]: cleanTarget,
      };

      // Save locally
      saveUserSettings({ customGlossary: updatedGlossary });

      // If in a room, sync to room's Redis cache immediately
      if (meetingCode) {
        await meetingApi.updateRoomGlossary(meetingCode, updatedGlossary);
      }

      setSuccess(true);
      onTermSaved?.(cleanSource, cleanTarget);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu thuật ngữ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdaptiveDialog
      label="Dạy AI thuật ngữ phòng họp"
      onClose={onClose}
      className="inline-glossary-modal"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Dạy AI Thuật ngữ tức thì</h3>
              <p className="text-[11px] text-zinc-400">Khóa nghĩa chuẩn cho toàn bộ người nói trong phòng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success ? (
          <div role="status" className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2 font-medium">
            <Check className="w-4 h-4" />
            <span>Đã cập nhật thuật ngữ thành công! Áp dụng ngay cho phòng họp.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="inline-source-term" className="block text-xs font-medium text-zinc-300 mb-1">
                Từ gốc / Câu nói gốc:
              </label>
              <input
                id="inline-source-term"
                type="text"
                value={sourceTerm}
                onChange={(e) => setSourceTerm(e.target.value)}
                placeholder="Ví dụ: Kouza, KYC, SLA..."
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
                maxLength={200}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="inline-target-term" className="block text-xs font-medium text-zinc-300 mb-1">
                Bản dịch chuẩn bắt buộc:
              </label>
              <input
                id="inline-target-term"
                type="text"
                value={targetTerm}
                onChange={(e) => setTargetTerm(e.target.value)}
                placeholder="Ví dụ: Tài khoản ngân hàng, Định danh điện tử..."
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
                maxLength={500}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !sourceTerm.trim() || !targetTerm.trim()}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu & Áp dụng ngay'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AdaptiveDialog>
  );
};
