import { ArrowRight, BriefcaseBusiness, Building2, GraduationCap, Menu, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

const backgroundImageUrl = 'https://cdn.21st.dev/assets/mirror/a8/a8cf38f65f7315f95eba8c803c4a80a9d78cb2ea36fbfee49828396e4a0b9737.jpg';

export default function ResponsiveHeroBanner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [mobileMenuOpen]);
  return (
    <section className="responsive-hero">
      <img className="responsive-hero-background" src={backgroundImageUrl} alt="" />
      <div className="responsive-hero-shade" aria-hidden="true" />
      <header className="responsive-hero-header">
        <Link to="/" className="brand responsive-hero-brand" aria-label="SkillBridge home">
          <span className="brand-icon"><ArrowRight size={20} /></span>
          <span>skill<span className="brand-light">bridge</span></span>
        </Link>
        <nav className="responsive-hero-nav" aria-label="Main navigation">
          <a href="#home" className="active">Home</a>
          <a href="#how">About us</a>
          <Link to="/opportunities">Opportunities</Link>
          <a href="#contact">Contact us</a>
          <Link to="/login">Log in</Link>
          <Link to="/register" className="responsive-nav-cta">Get started <ArrowRight size={15} /></Link>
        </nav>
        <button className="responsive-menu-toggle" aria-label="Open menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}>
          <Menu size={21} />
        </button>
      </header>
      {mobileMenuOpen && createPortal(<div className="responsive-mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu">
        <div className="responsive-mobile-menu-head">
          <Link to="/" className="brand responsive-hero-brand" aria-label="SkillBridge home" onClick={() => setMobileMenuOpen(false)}>
            <span className="brand-icon"><ArrowRight size={20} /></span>
            <span>skill<span className="brand-light">bridge</span></span>
          </Link>
          <button className="responsive-menu-close" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)}><X size={23} /></button>
        </div>
        <nav className="responsive-mobile-nav" aria-label="Mobile navigation">
          <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#how" onClick={() => setMobileMenuOpen(false)}>About us</a>
          <Link to="/opportunities" onClick={() => setMobileMenuOpen(false)}>Opportunities</Link>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact us</a>
          <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
          <Link to="/register" className="responsive-nav-cta" onClick={() => setMobileMenuOpen(false)}>Get started <ArrowRight size={17} /></Link>
        </nav>
      </div>, document.body)}

      <div className="responsive-hero-content" id="home">
        <div className="responsive-hero-copy">
          <div className="responsive-hero-badge animate-fade-slide-in-1">
            <span>NEW</span><b>Make your next career move with SkillBridge</b>
          </div>
          <h1 className="animate-fade-slide-in-2">Bridge your skills<br className="responsive-title-break" /> with your future.</h1>
          <p className="animate-fade-slide-in-3">Turn what you’re learning into real opportunities. Build your profile, see your progress, and connect with employers who value your skills.</p>
          <div className="responsive-hero-actions animate-fade-slide-in-4">
            <Link to="/register" className="responsive-hero-primary">Get started <ArrowRight size={17} /></Link>
            <Link to="/opportunities" className="responsive-hero-secondary">Explore opportunities <ArrowRight size={16} /></Link>
          </div>
        </div>

        <div className="responsive-partners animate-fade-slide-in-2">
          <p>ONE PLATFORM FOR YOUR NEXT STEP</p>
          <div className="responsive-partner-grid">
            <div><GraduationCap /><span>Students</span></div>
            <div><Building2 /><span>Colleges</span></div>
            <div><BriefcaseBusiness /><span>Employers</span></div>
            <div><Users /><span>Career partners</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function useAnimatedValue(target: number, duration = 1800) {
  const [value, setValue] = useState(() => Math.max(0, Math.min(100, target + Math.round(Math.random() * 50 - 25))));
  useEffect(() => {
    const startValue = value;
    let startTime = 0;
    let frame = 0;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function useTypedText(text: string, speed = 42) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [text, speed]);
  return shown;
}

function SkillLine({ label, target, color }: { label: string; target: number; color: string }) {
  const value = useAnimatedValue(target);
  return <div className="skill-line"><div><span>{label}</span><b>{value}%</b></div><div className="bar"><i className={color} style={{ width: `${value}%` }} /></div></div>;
}

export function GrowthOverview() {
  const readiness = useAnimatedValue(72);
  const headline = useTypedText('Keep building');
  return <section className="growth-preview-section"><div className="container"><div className="responsive-hero-card">
    <div className="preview-top"><div><span className="overline">YOUR GROWTH OVERVIEW</span><h3>Skills in motion</h3></div><span className="live-tag"><i /> DEMO PREVIEW</span></div>
    <div className="preview-score"><div className="score-ring" style={{ borderColor: 'transparent', background: `linear-gradient(#faf9fc,#faf9fc) padding-box, conic-gradient(#7035df ${readiness * 3.6}deg, #e6def6 0deg) border-box` }}><b>{readiness}</b><small>readiness</small></div><div><b>{headline}</b><p>Your next step is within reach.</p><div className="mini-progress"><i style={{ width: `${readiness}%` }} /></div></div></div>
    <div className="skill-lines"><SkillLine label="Frontend development" target={82} color="purple" /><SkillLine label="Data fundamentals" target={64} color="blue" /><SkillLine label="Communication" target={55} color="amber" /></div>
    <div className="preview-bottom"><span><span className="target-mark">◎</span> Next recommended step</span><b>Practice a React assessment <ArrowRight size={14} /></b></div>
  </div></div></section>;
}
