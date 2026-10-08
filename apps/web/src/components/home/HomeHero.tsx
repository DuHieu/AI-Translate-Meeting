import { ReactNode } from 'react';
import { ArrowRight, Calendar, Globe2, Keyboard, ShieldCheck, Video } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import { CountryFlag } from '../common/CountryFlag';
import { HOME_COPY } from './homeCopy';

interface HomeHeroProps {
  loading: boolean;
  error: string | null;
  meetingCode: string;
  onMeetingCodeChange: (value: string) => void;
  onJoin: React.FormEventHandler<HTMLFormElement>;
  onCreate: () => void;
  onSchedule: () => void;
  onPrivacy: () => void;
  preview: ReactNode;
  upcomingMeetings: ReactNode;
  enterpriseAction?: ReactNode;
}

export function HomeHero({ loading, error, meetingCode, onMeetingCodeChange, onJoin, onCreate, onSchedule, onPrivacy, preview, upcomingMeetings, enterpriseAction }: HomeHeroProps) {
  const { language, t } = useLanguage();
  const copy = HOME_COPY[language];
  return (
    <section id="hero" className="lm-container lm-hero" aria-labelledby="home-title">
      <div className="lm-hero-content">
        <p className="lm-eyebrow"><span className="lm-status-dot" aria-hidden="true" />{copy.eyebrow}</p>
        <h1 id="home-title">{copy.title}<span>{copy.titleAccent}</span></h1>
        <p className="lm-hero-description">{copy.description}</p>
        <div className="lm-primary-actions">
          <button type="button" className="lm-button lm-button-primary" onClick={onCreate} disabled={loading} aria-busy={loading}><Video size={20} /><span>{loading ? t.hero.btnCreating : t.hero.btnCreate}</span><ArrowRight size={18} /></button>
          <button type="button" className="lm-button lm-button-secondary" onClick={onSchedule}><Calendar size={19} />{copy.schedule}</button>
          {enterpriseAction}
        </div>
        <div className="lm-join">
          <label htmlFor="home-room-code">{copy.joinLabel}</label>
          <form onSubmit={onJoin} className="lm-join-form">
            <Keyboard size={20} aria-hidden="true" />
            <input id="home-room-code" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={t.hero.inputRoomCode} value={meetingCode} onChange={(event) => onMeetingCodeChange(event.target.value)} aria-describedby={error ? 'home-room-hint home-error' : 'home-room-hint'} />
            <button type="submit" className="lm-join-button" disabled={!meetingCode.trim()} aria-label={t.hero.btnJoin}><span>{t.hero.btnJoin}</span><ArrowRight size={18} /></button>
          </form>
          <p id="home-room-hint" className="lm-join-hint">{copy.joinHint}</p>
          {error && <div id="home-error" role="alert" className="lm-error">{error}</div>}
        </div>
        {upcomingMeetings}
        <div className="lm-hero-assurances">
          <button type="button" className="lm-text-button" onClick={onPrivacy}><ShieldCheck size={17} />{copy.privacy}</button>
          <span><Globe2 size={17} />{copy.browser}</span>
        </div>
      </div>
      <div className="lm-preview-column">
        <div className="lm-preview-label"><Video size={17} /><span>{copy.preview}</span></div>
        {preview}
        <p className="lm-preview-note">{copy.previewNote}</p>
        <div className="lm-language-strip">
          <div className="lm-language-flags" aria-hidden="true"><CountryFlag code="vi" size="sm" /><CountryFlag code="ja" size="sm" /><CountryFlag code="en" size="sm" /><CountryFlag code="ko" size="sm" /><CountryFlag code="zh" size="sm" /></div>
          <span>{copy.languageNote}</span>
        </div>
      </div>
    </section>
  );
}
