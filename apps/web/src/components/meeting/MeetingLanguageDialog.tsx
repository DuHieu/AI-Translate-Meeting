import React from 'react';
import { X } from 'lucide-react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { getLanguageOption, SUPPORTED_LANGUAGES_LIST, SupportedLanguage } from '../../types/meeting';
import { saveUserSettings, SubtitleFontSize } from '../../utils/userSettings';

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
  return (
    <AdaptiveDialog label="Ngôn ngữ & phụ đề" onClose={onClose} className="meeting-language-dialog">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ngôn ngữ &amp; phụ đề</h2>
        <button type="button" onClick={onClose} aria-label="Đóng ngôn ngữ" className="icon-target"><X /></button>
      </header>
      <label className="block mt-4" htmlFor="meeting-target-language">Ngôn ngữ nghe / phụ đề</label>
      <select id="meeting-target-language" value={targetLanguage} disabled={updating} onChange={e => onTargetChange(e.target.value as SupportedLanguage)} className="meeting-field mt-2">
        {SUPPORTED_LANGUAGES_LIST.map(language => <option key={language.code} value={language.code}>{language.nativeName} ({language.code.toUpperCase()})</option>)}
      </select>
      <p role="status" className="mt-2 text-sm text-slate-300">{updating ? 'Đang cập nhật ngôn ngữ…' : `Đang dịch sang ${getLanguageOption(targetLanguage).nativeName}`}</p>
      {error && <p role="alert" className="mt-2 text-rose-300">{error}</p>}
      <fieldset className="mt-4">
        <legend>Kích thước chữ phụ đề</legend>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {(['sm', 'md', 'lg', 'xl'] as SubtitleFontSize[]).map((size, index) => <button key={size} type="button" className="meeting-menu-action" onClick={() => saveUserSettings({ subtitleFontSize: size })}>{['Nhỏ', 'Vừa', 'Lớn', 'Rất lớn'][index]}</button>)}
        </div>
      </fieldset>
      <div className="mt-4 border-t border-slate-700 pt-4">
        <p>Ngôn ngữ nói: <strong>{getLanguageOption(spokenLanguage).nativeName}</strong></p>
        <p className="text-sm text-slate-300 mt-2">Để đổi ngôn ngữ nói, vào lại màn hình chuẩn bị. Bạn sẽ tạm rời cuộc họp rồi chọn ngôn ngữ mới.</p>
        <button type="button" className="meeting-menu-action mt-3" onClick={onRejoin}>Vào lại để đổi ngôn ngữ nói</button>
      </div>
    </AdaptiveDialog>
  );
}
