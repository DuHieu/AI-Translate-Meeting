import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { getLanguageOption, SUPPORTED_LANGUAGES_LIST, SupportedLanguage } from '../../types/meeting';
import { getUserSettings, saveUserSettings, subscribeUserSettings, SubtitleFontSize } from '../../utils/userSettings';

interface Props {
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  updating: boolean;
  error: string | null;
  onTargetChange: (language: SupportedLanguage) => void;
  onClose: () => void;
  onRejoin: () => void;
}

export function MeetingLanguageDialog({ spokenLanguage, targetLanguage, updating, error, onTargetChange, onClose, onRejoin }: Props) {
  const [fontSize, setFontSize] = useState<SubtitleFontSize>(() => getUserSettings().subtitleFontSize);

  useEffect(() => {
    return subscribeUserSettings((settings) => setFontSize(settings.subtitleFontSize));
  }, []);

  return (
    <AdaptiveDialog label="Ngôn ngữ & phụ đề" onClose={onClose} className="meeting-language-dialog">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ngôn ngữ &amp; phụ đề</h2>
        <button type="button" onClick={onClose} aria-label="Đóng ngôn ngữ" className="icon-target"><X /></button>
      </header>
      <label className="block mt-4 text-sm font-medium text-slate-200" htmlFor="meeting-target-language">Ngôn ngữ nghe / phụ đề</label>
      <select id="meeting-target-language" value={targetLanguage} disabled={updating} onChange={e => onTargetChange(e.target.value as SupportedLanguage)} className="meeting-field mt-2">
        {SUPPORTED_LANGUAGES_LIST.map(language => <option key={language.code} value={language.code}>{language.nativeName} ({language.code.toUpperCase()})</option>)}
      </select>
      <p role="status" className="mt-2 text-xs text-emerald-400 font-medium">{updating ? 'Đang cập nhật ngôn ngữ…' : `✓ Đang dịch sang ${getLanguageOption(targetLanguage).nativeName}`}</p>
      {error && <p role="alert" className="mt-2 text-rose-300">{error}</p>}
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-200">Kích thước chữ phụ đề</legend>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {(['sm', 'md', 'lg', 'xl'] as SubtitleFontSize[]).map((size, index) => {
            const isActive = fontSize === size;
            return (
              <button
                key={size}
                type="button"
                aria-pressed={isActive}
                className={`meeting-menu-action justify-center text-center font-medium ${
                  isActive ? 'border-sky-400 bg-sky-500/20 text-sky-200 font-semibold' : ''
                }`}
                onClick={() => {
                  saveUserSettings({ subtitleFontSize: size });
                  setFontSize(size);
                }}
              >
                {['Nhỏ', 'Vừa', 'Lớn', 'Rất lớn'][index]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-4 border-t border-slate-700/80 pt-4">
        <p className="text-sm text-slate-200">Ngôn ngữ nói: <strong className="text-white">{getLanguageOption(spokenLanguage).nativeName}</strong></p>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Để đổi ngôn ngữ nói, vào lại màn hình chuẩn bị. Bạn sẽ tạm rời cuộc họp rồi chọn ngôn ngữ mới.</p>
        <button type="button" className="meeting-menu-action mt-3 justify-center text-slate-300 hover:text-white" onClick={onRejoin}>Vào lại để đổi ngôn ngữ nói</button>
      </div>
    </AdaptiveDialog>
  );
}
