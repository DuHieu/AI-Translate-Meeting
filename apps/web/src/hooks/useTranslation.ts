import { useState } from 'react';
import { LanguageCode } from '../types/meeting';

export function useTranslation(initialSpoken: LanguageCode = 'vi', initialTarget: LanguageCode = 'ja') {
  const [spokenLanguage, setSpokenLanguage] = useState<LanguageCode>(initialSpoken);
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(initialTarget);

  return {
    spokenLanguage,
    setSpokenLanguage,
    targetLanguage,
    setTargetLanguage,
  };
}
