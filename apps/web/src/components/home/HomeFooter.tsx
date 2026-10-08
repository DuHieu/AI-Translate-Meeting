import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { HOME_COPY, HomeSection } from './homeCopy';

interface HomeFooterProps {
  onNavigate: (section: HomeSection) => void;
  onLegal: (type: 'privacy' | 'terms') => void;
  onStatus: () => void;
}

export function HomeFooter({ onNavigate, onLegal, onStatus }: HomeFooterProps) {
  const { language, t } = useLanguage();
  const copy = HOME_COPY[language];
  return (
    <footer className="lm-footer">
      <div className="lm-container lm-footer-grid">
        <div className="lm-footer-brand"><button type="button" className="lm-brand" onClick={() => onNavigate('home')} aria-label={copy.home}><LayaMeetLogo size="md" /></button><p>{copy.footerDescription}</p></div>
        <nav aria-label={copy.product}><h2>{copy.product}</h2><button type="button" onClick={() => onNavigate('features')}>{t.nav.features}</button><button type="button" onClick={() => onNavigate('pricing')}>{t.nav.pricing}</button><button type="button" onClick={() => onNavigate('contact')}>{t.nav.onPrem}</button></nav>
        <nav aria-label={copy.resources}><h2>{copy.resources}</h2><button type="button" onClick={() => onNavigate('faq')}>{t.nav.faq}</button><Link to={language === 'en' ? '/en/guide' : language === 'ja' ? '/ja/guide' : '/cam-nang'}>{t.footer.guides}</Link><Link to="/developers">{t.nav.developers}</Link></nav>
        <nav aria-label={t.footer.legalCol}><h2>{t.footer.legalCol}</h2><button type="button" onClick={() => onLegal('privacy')}>{t.footer.privacyPolicy}</button><button type="button" onClick={() => onLegal('terms')}>{t.footer.termsOfService}</button><button type="button" onClick={onStatus}>{t.nav.systemShort}</button></nav>
      </div>
      <div className="lm-container lm-footer-bottom"><span>{t.footer.copyright}</span><button type="button" className="lm-text-button" onClick={onStatus}><ShieldCheck size={16} />{t.footer.ramOnlyBadge}</button></div>
    </footer>
  );
}
