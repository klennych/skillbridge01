import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props={mode:'login'|'register'};

export default function SiteNavbar({mode}:Props){
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown)};
  },[open]);
  const close=()=>setOpen(false);
  return <>
    <header className="auth-site-nav">
      <Link to="/" className="brand" aria-label="SkillBridge home"><span className="brand-icon"><ArrowRight size={20}/></span><span>skill<span className="brand-light">bridge</span></span></Link>
      <nav className="auth-site-links" aria-label="Main navigation">
        <Link to="/#home">Home</Link><Link to="/#how">About us</Link><Link to="/opportunities">Opportunities</Link><Link to="/#contact">Contact us</Link><Link to="/login" className={mode==='login'?'current':''}>Log in</Link><Link to="/register" className={`auth-nav-cta ${mode==='register'?'current':''}`}>Get started<ArrowRight size={15}/></Link>
      </nav>
      <button type="button" className="auth-menu-toggle" aria-label="Open menu" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={20}/></button>
    </header>
    {open&&createPortal(<div className="responsive-mobile-menu auth-mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu">
      <div className="responsive-mobile-menu-head"><Link to="/" className="brand" aria-label="SkillBridge home" onClick={close}><span className="brand-icon"><ArrowRight size={19}/></span><span>skill<span className="brand-light">bridge</span></span></Link><button className="responsive-menu-close" aria-label="Close menu" onClick={close}><X size={22}/></button></div>
      <nav className="responsive-mobile-nav" aria-label="Mobile navigation">
        <Link to="/#home" onClick={close}>Home</Link><Link to="/#how" onClick={close}>About us</Link><Link to="/opportunities" onClick={close}>Opportunities</Link><Link to="/#contact" onClick={close}>Contact us</Link><Link to="/login" onClick={close}>Log in</Link><Link to="/register" className="responsive-nav-cta" onClick={close}>Get started<ArrowRight size={16}/></Link>
      </nav>
    </div>,document.body)}
  </>;
}
