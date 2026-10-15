import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Sparkles, X, ChevronDown, Headphones } from 'lucide-react';
import { PipelineStatusMessage, SubtitleMessage } from '../../types/subtitle';
import {
  getLanguageOption,
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
} from '../../types/meeting';
import { formatTimestamp } from '../../utils';
import { LIVE_SUBTITLE_LIMIT } from './LiveSubtitleView';
import { getUserSettings, subscribeUserSettings, saveUserSettings, UserMeetingSettings } from '../../utils/userSettings';
import { CountryFlag } from '../common/CountryFlag';
import { ttsEngine } from '../../utils/speechSynthesis';


interface SubtitleOverlayProps {
  subtitle?: SubtitleMessage | null;
  recentSubtitles: SubtitleMessage[];
  pipelineStatuses?: Record<string, PipelineStatusMessage>;
  showOriginal: boolean;
  targetLanguage?: SupportedLanguage;
  onTargetLanguageChange?: (language: SupportedLanguage) => void;
  onToggleShowOriginal?: () => void;
  isCaptionsOn?: boolean;
  onOpenSettings?: () => void;
  currentUserId?: string;
  currentUserDisplayName?: string;
  localIdentity?: string;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  subtitle,
  recentSubtitles,
  pipelineStatuses,
  showOriginal,
  targetLanguage,
  onTargetLanguageChange,
  onToggleShowOriginal: _onToggleShowOriginal,
  isCaptionsOn = true,
  onOpenSettings: _onOpenSettings,
  currentUserId: _currentUserId,
  currentUserDisplayName: _currentUserDisplayName,
  localIdentity: _localIdentity,
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [settings, setSettings] = useState<UserMeetingSettings>(() => getUserSettings());

  useEffect(() => {
    return subscribeUserSettings((newSettings) => setSettings(newSettings));
  }, []);

  const translatingCount = Object.values(pipelineStatuses || {}).filter(
    (status) => status.phase === 'translating',
  ).length;
  const mobileHistory = useMemo(
    () => recentSubtitles.filter((item) => item.isFinal).slice(-LIVE_SUBTITLE_LIMIT),
    [recentSubtitles],
  );

  useEffect(() => {
    if (!isLangMenuOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLangMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLangMenuOpen]);

  useEffect(() => {
    if (!isMobileSheetOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileSheetOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSheetOpen]);

  const displaySubtitle = subtitle?.isFinal || settings.showInterimSubtitles ? subtitle : null;

  if (!isCaptionsOn && !displaySubtitle && translatingCount === 0 && !isMobileSheetOpen) return null;

  const isRisk = displaySubtitle?.tags?.includes('critical_risk');

  const fontSizeClass = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl font-bold',
  }[settings.subtitleFontSize] || 'text-sm sm:text-base';

  const bgOpacityClass = {
    light: 'bg-slate-900',
    medium: 'bg-slate-950',
    heavy: 'bg-slate-950',
  }[settings.subtitleBgOpacity] || 'bg-slate-950';

  const isSelf = Boolean(
    displaySubtitle && (
      (_currentUserId && displaySubtitle.participantId === _currentUserId) ||
      (_localIdentity && displaySubtitle.participantId === _localIdentity)
    )
  );

  const shouldShowOriginal =
    settings.subtitleDisplayMode === 'original_only' ||
    (settings.subtitleDisplayMode === 'bilingual' && showOriginal);

  // For self: always show original text as primary (what you said), translated as secondary (verify output)
  // For others: show translation as primary, original as secondary (bilingual mode)
  const primaryText = settings.subtitleDisplayMode === 'original_only'
    ? displaySubtitle?.originalText || displaySubtitle?.translatedText
    : isSelf
      ? displaySubtitle?.originalText || displaySubtitle?.translatedText
      : displaySubtitle?.translatedText || displaySubtitle?.originalText;

  const secondaryText = isSelf
    ? displaySubtitle?.translatedText
    : displaySubtitle?.originalText;

  const sourceLangOption = getLanguageOption(displaySubtitle?.sourceLanguage || 'vi');
  const targetLangOption = getLanguageOption(targetLanguage || displaySubtitle?.targetLanguage || 'ja');
  const secondaryFlagCode = isSelf ? targetLangOption.code : sourceLangOption.code;
  const RTL_CODES = new Set(['ar', 'he', 'fa', 'ur']);
  const bubbleDirection =
    displaySubtitle?.direction ||
    (RTL_CODES.has((displaySubtitle?.targetLanguage || targetLanguage || '').split('-')[0].toLowerCase())
      ? 'rtl'
      : 'ltr');
  const primaryDir = isSelf
    ? (RTL_CODES.has((displaySubtitle?.sourceLanguage || '').split('-')[0].toLowerCase()) ? 'rtl' : 'ltr')
    : bubbleDirection;
  const secondaryDir = isSelf ? bubbleDirection : (
    RTL_CODES.has((displaySubtitle?.sourceLanguage || '').split('-')[0].toLowerCase()) ? 'rtl' : 'ltr'
  );
  const isDecision = Boolean(
    displaySubtitle?.layaMetadata?.isDecision || displaySubtitle?.tags?.includes('decision'),
  );

  return (
    <>
      {/* Dedicated Caption Band (Google Meet 2025 / MS Teams style - Docked below video stage, never covering slides/faces) */}
      <div className="meeting-caption-band shrink-0 w-full px-3 sm:px-4 pb-2 pt-0.5 z-20 overflow-visible">
        <div className="mx-auto max-w-5xl">
          {translatingCount > 0 && !displaySubtitle && (
            <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-slate-900 px-3.5 py-2 text-xs text-sky-300 shadow-lg">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>Đang nhận diện &amp; chuyển ngữ trực tiếp…</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400 flex items-center gap-1.5">
                <CountryFlag code={sourceLangOption.code} size="xs" />
                <span>{sourceLangOption.nativeName}</span>
              </span>
            </div>
          )}

          {displaySubtitle && (
            <div
              data-dir={bubbleDirection}
              dir={bubbleDirection}
              className={`subtitle-bubble relative w-full rounded-2xl border px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-lg transition-all ${
                bubbleDirection === 'rtl' ? 'text-right' : 'text-left'
              } ${
                isRisk
                  ? 'border-rose-500 bg-zinc-950/95 ring-1 ring-rose-500/50'
                  : isDecision
                  ? 'border-amber-400/60 bg-slate-950 ring-1 ring-amber-400/30'
                  : !displaySubtitle.isFinal
                  ? `border-dashed border-slate-600 ${bgOpacityClass}`
                  : `border-solid border-slate-800 ${bgOpacityClass}`
              } ${bubbleDirection === 'rtl' ? "font-['Segoe_UI','Tahoma','Noto_Sans_Arabic','Arial',sans-serif]" : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Speaker Flag Badge + Bilingual Subtitle Lines */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span
                      title={`Phát hiện ngôn ngữ: ${sourceLangOption.nativeName}`}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                        isSelf
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-200'
                          : 'bg-zinc-800/90 border-zinc-700/80 text-zinc-200'
                      }`}
                    >
                      <CountryFlag code={sourceLangOption.code} size="xs" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {displaySubtitle.participantName || 'Người phát biểu'}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-sky-400 font-semibold">Bạn</span>
                      )}
                      <span className="font-mono text-[10px] text-zinc-400 uppercase">
                        {sourceLangOption.code}
                      </span>
                    </span>

                    {!displaySubtitle.isFinal && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-sky-300/90 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
                        Đang nói…
                      </span>
                    )}

                    {isDecision && !isRisk && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Sparkles className="h-3 w-3" /> Quyết định
                      </span>
                    )}

                    {isRisk && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                        <AlertTriangle className="h-3 w-3" /> CẢNH BÁO RỦI RO
                      </span>
                    )}

                    {ttsEngine.options.enabled && !isSelf && (
                      <span
                        title="AI đang phát âm thanh dịch vào tai nghe"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                      >
                        <Headphones className="h-3 w-3 text-emerald-400 animate-pulse" />
                        <span>Thuyết minh AI</span>
                      </span>
                    )}
                  </div>

                  <span
                    dir={primaryDir}
                    className={`line-clamp-2 block leading-relaxed transition-opacity duration-150 ${fontSizeClass} ${
                      displaySubtitle.isFinal
                        ? 'font-medium text-slate-50'
                        : 'italic text-slate-400/90 animate-pulse'
                    }`}
                  >
                    {primaryText}
                  </span>

                  {/* Secondary line: for self always show translation; for others show original in bilingual mode */}
                  {secondaryText && secondaryText !== primaryText && (
                    settings.subtitleDisplayMode !== 'original_only' && (
                      isSelf
                        ? (
                          <span
                            dir={secondaryDir}
                            className="flex items-center gap-1.5 truncate text-xs italic text-blue-400/90"
                          >
                            <CountryFlag code={secondaryFlagCode} size="xs" />
                            <span>{secondaryText}</span>
                          </span>
                        )
                        : (shouldShowOriginal && settings.subtitleDisplayMode === 'bilingual' && (
                          <span
                            dir={secondaryDir}
                            className="flex items-center gap-1.5 truncate text-xs italic text-zinc-400"
                          >
                            <CountryFlag code={secondaryFlagCode} size="xs" />
                            <span>{secondaryText}</span>
                          </span>
                        ))
                    )
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(true)}
                className="pointer-events-auto absolute inset-0 md:hidden"
                aria-label="Mở phụ đề gần đây"
              />
            </div>
          )}

          {/* Unified Compact Pill Toolbar (No full-width duplicate bar) */}
          {isCaptionsOn && (
            <div className="flex items-center justify-center pt-1.5 px-1 select-none pointer-events-auto">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/95 border border-slate-800 px-2 py-1 shadow-lg backdrop-blur-md">
                {/* Language selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLangMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-full px-2.5 py-1 text-xs text-zinc-200 transition cursor-pointer"
                    aria-expanded={isLangMenuOpen}
                    aria-haspopup="listbox"
                    aria-label="Chọn ngôn ngữ dịch phụ đề"
                  >
                    <CountryFlag code={targetLangOption.code} size="xs" />
                    <span className="font-medium">{targetLangOption.nativeName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isLangMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsLangMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div
                        role="listbox"
                        aria-label="Danh sách ngôn ngữ dịch"
                        className="absolute bottom-full mb-2 left-0 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 w-52 max-w-[calc(100vw-32px)] max-h-64 overflow-y-auto space-y-1 overscroll-contain"
                      >
                        {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            role="option"
                            aria-selected={(targetLanguage || displaySubtitle?.targetLanguage) === lang.code}
                            onClick={() => {
                              onTargetLanguageChange?.(lang.code);
                              setIsLangMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                              (targetLanguage || displaySubtitle?.targetLanguage) === lang.code
                                ? 'bg-sky-500/20 text-sky-300 font-semibold'
                                : 'text-zinc-200 hover:bg-slate-800'
                            }`}
                          >
                            <CountryFlag code={lang.code} size="xs" />
                            <span>{lang.nativeName}</span>
                            <span className="ml-auto text-[10px] text-zinc-400 font-mono uppercase">{lang.code}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newMode = settings.subtitleDisplayMode === 'bilingual' ? 'translation_only' : 'bilingual';
                    saveUserSettings({ subtitleDisplayMode: newMode });
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    settings.subtitleDisplayMode === 'bilingual'
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Bật / tắt hiển thị song ngữ"
                  aria-pressed={settings.subtitleDisplayMode === 'bilingual'}
                >
                  Song ngữ
                </button>

                <span className="h-3.5 w-px bg-slate-800 mx-0.5" aria-hidden="true" />

                <button
                  type="button"
                  onClick={() => {
                    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
                    const nextIdx = (sizes.indexOf(settings.subtitleFontSize) + 1) % sizes.length;
                    saveUserSettings({ subtitleFontSize: sizes[nextIdx] });
                  }}
                  title={`Cỡ chữ phụ đề (${settings.subtitleFontSize.toUpperCase()})`}
                  className="px-2 py-1 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer font-bold text-xs"
                >
                  <span className="font-mono tracking-tighter">TT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobileSheetOpen && (
        <AdaptiveDialog label="Phụ đề gần đây" aria-modal="true" onClose={() => setIsMobileSheetOpen(false)} className="meeting-panel">
          <div className="min-h-0 rounded-t-3xl border-t border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Phụ đề gần đây</h2>
                <p className="text-[11px] text-zinc-500">Hiển thị tối đa {LIVE_SUBTITLE_LIMIT} câu mới nhất</p>
              </div>
              <button type="button" onClick={() => setIsMobileSheetOpen(false)} aria-label="Đóng phụ đề gần đây" className="rounded-lg p-2 text-zinc-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(var(--app-height)-160px)] overflow-y-auto px-4 py-2">
              {mobileHistory.map((item) => {
                const itemLang = getLanguageOption(item.sourceLanguage);
                return (
                  <article key={item.id} className="border-b border-slate-800 py-3 last:border-b-0">
                    <div className="mb-1 flex justify-between gap-3 text-[11px] text-zinc-500">
                      <span className="truncate text-sky-400 flex items-center gap-1">
                        <span>{itemLang.flag}</span>
                        <span>{item.participantName || 'Người phát biểu'}</span>
                      </span>
                      <time>{formatTimestamp(item.timestamp)}</time>
                    </div>
                    <p className="text-sm leading-5 text-zinc-100">{item.translatedText}</p>
                    {showOriginal && item.originalText && item.originalText !== item.translatedText && (
                      <p className="mt-1 text-xs italic text-zinc-500">
                        {itemLang.flag} {item.originalText}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </AdaptiveDialog>
      )}
    </>
  );
};
