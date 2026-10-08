import { ArrowRight, FileText, Globe2, ShieldCheck, Video } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import { HOME_COPY } from './homeCopy';

const FEATURE_ICONS = [Globe2, Video, FileText, ShieldCheck];

export function HomeFeatures() {
  const { language } = useLanguage();
  const copy = HOME_COPY[language];
  return (
    <section id="features" className="lm-features" aria-labelledby="features-title">
      <div className="lm-container">
        <div className="lm-section-heading">
          <p className="lm-eyebrow">{copy.featureEyebrow}</p>
          <h2 id="features-title">{copy.featureTitle}</h2>
          <p>{copy.featureDescription}</p>
        </div>
        <div className="lm-feature-grid">
          {copy.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return <article className="lm-feature" key={feature.title}><div className="lm-feature-icon"><Icon size={23} /></div><h3>{feature.title}</h3><p>{feature.description}</p></article>;
          })}
        </div>
      </div>
    </section>
  );
}

interface HomeCallToActionProps {
  loading: boolean;
  onCreate: () => void;
  onContact: () => void;
}

export function HomeCallToAction({ loading, onCreate, onContact }: HomeCallToActionProps) {
  const { language, t } = useLanguage();
  const copy = HOME_COPY[language];
  return (
    <>
      <section className="lm-container lm-workflow" aria-labelledby="workflow-title">
        <div className="lm-section-heading"><p className="lm-eyebrow">{copy.workflowEyebrow}</p><h2 id="workflow-title">{copy.workflowTitle}</h2></div>
        <ol className="lm-step-grid">{copy.steps.map((step, index) => <li key={step.title}><span className="lm-step-number" aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
      </section>
      <section className="lm-container lm-cta" aria-labelledby="cta-title">
        <div><p className="lm-eyebrow">LayaMeet</p><h2 id="cta-title">{copy.ctaTitle}</h2><p>{copy.ctaDescription}</p></div>
        <div className="lm-cta-actions"><button type="button" className="lm-button lm-button-primary" onClick={onCreate} disabled={loading} aria-busy={loading}>{loading ? t.hero.btnCreating : t.hero.btnCreate}<ArrowRight size={18} /></button><button type="button" className="lm-text-button" onClick={onContact}>{copy.enterprise}<ArrowRight size={17} /></button></div>
      </section>
    </>
  );
}
