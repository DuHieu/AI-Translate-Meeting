import React from 'react';
import { LanguageCode } from '../../types/meeting';

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  label?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange, label }) => {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-slate-400 font-medium">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className="bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg p-2.5 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
      >
        <option value="vi">vi - Vietnamese</option>
        <option value="en">en - English</option>
        <option value="ja">ja - Japanese</option>
      </select>
    </div>
  );
};
