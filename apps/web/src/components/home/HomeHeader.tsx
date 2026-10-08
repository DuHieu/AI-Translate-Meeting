import { Menu, Settings2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/language-context-def';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { GoogleAuthControl } from '../auth/GoogleAuthControl';
import { HOME_COPY, HomeSection } from './homeCopy';

interface HomeHeaderProps {
  activeSection: HomeSection;
  menuOpen: boolean;
  onMenu: () => void;
  onPreferences: () => void;
  onNavigate: (section: HomeSection) => void;
}

export function HomeHeader({ activeSection, menuOpen, onMenu, onPreferences, onNavigate }: HomeHeaderProps) {
  const { language, t } = useLanguage();
  const copy = HOME_COPY[language];
  const links = [
    { id: 'home', label: copy.home },
    { id: 'features', label: t.nav.features },
    { id: 'pricing', label: t.nav.pricing },
    { id: 'faq', label: t.nav.faq },
  ] as const;

  return (
    <>
      <a className="lm-skip-link" href="#home-content">{language === 'vi' ? 'Đến nội dung chính' : language === 'ja' ? '本文へ移動' : 'Skip to content'}</a>
      <header className="lm-header">
        <div className="lm-container lm-header-inner">
          <button type="button" className="lm-brand" onClick={onMenu} data-testid="header-logo-menu-btn" aria-label={copy.menu} aria-expanded={menuOpen}>
            <LayaMeetLogo size="md" />
          </button>
          <nav className="lm-desktop-nav" aria-label={copy.menu}>
            {links.map(({ id, label }) => (
              <button type="button" key={id} onClick={() => onNavigate(id)} aria-current={activeSection === id ? 'page' : undefined}>{label}</button>
            ))}
            <Link to={language === 'en' ? '/en/guide' : language === 'ja' ? '/ja/guide' : '/cam-nang'}>{t.footer.guides}</Link>
          </nav>
          <div className="lm-header-actions">
            <div className="lm-desktop-preferences"><LanguageSwitcher /><ThemeToggle /></div>
            <div className="lm-header-auth"><GoogleAuthControl variant="navbar" /></div>
            <button type="button" className="lm-icon-button lm-mobile-only" onClick={onPreferences} aria-label={copy.preferences} title={copy.preferences}><Settings2 size={20} /></button>
            <button type="button" className="lm-icon-button lm-mobile-only" onClick={onMenu} data-testid="mobile-hamburger-btn" aria-label={copy.menu} aria-expanded={menuOpen}><Menu size={22} /></button>
          </div>
        </div>
      </header>
      {activeSection !== 'home' && (
        <div className="lm-container lm-section-navigation">
          <button type="button" className="lm-text-button" onClick={() => onNavigate('home')} data-testid="rail-back-home"><ChevronLeft size={18} />{copy.back}</button>
        </div>
      )}
    </>
  );
}
