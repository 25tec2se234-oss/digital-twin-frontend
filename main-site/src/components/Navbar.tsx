import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleAccountMenu = () => setIsAccountMenuOpen(!isAccountMenuOpen);
  const toggleThemeMenu = () => setIsThemeMenuOpen(!isThemeMenuOpen);

  const handleThemeChange = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    setIsThemeMenuOpen(false);
    localStorage.setItem('theme', theme);
  };

  const handleLogout = () => {
    // TODO: implement actual logout logic
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav id="nav" style={{ paddingLeft: '3rem', paddingRight: '3rem' }}>
        <Link to="/" className="logo" style={{ textDecoration: 'none', marginRight: '1rem' }}>
          <img
            src="/img/dtv-logo.jpg"
            alt="DTV"
            width="36"
            height="36"
            style={{ width: '36px', height: '36px', borderRadius: '8px' }}
          />
          <div>
            <div
              className="logo-text"
              style={{
                margin: 0,
                padding: 0,
                fontSize: 'inherit',
                fontWeight: 'inherit',
                lineHeight: 'inherit',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Digital<em>Twin Verse</em>
            </div>
            <div className="logo-sub">by Eco-Novators</div>
          </div>
        </Link>
        <ul className="nav-ul" style={{ width: '100%', maxWidth: 'none', justifyContent: 'space-evenly' }}>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/explorer">Explorer</Link>
          </li>
          <li>
            <Link to="/wheel">Daily Spin</Link>
          </li>
          <li>
            <Link to="/features">Features</Link>
          </li>
          <li>
            <Link to="/advisor">AI Advisor</Link>
          </li>
          <li>
            <Link to="/parent">Parent Portal</Link>
          </li>
          <li>
            <Link to="/school">School Portal</Link>
          </li>
          <li>
            <Link to="/reviews">Reviews</Link>
          </li>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li className="theme-switcher-menu" style={{ position: 'relative', marginLeft: '0.5rem' }}>
            <button 
              className="account-btn" 
              onClick={toggleThemeMenu} 
              style={{ padding: '0 0.8rem', fontSize: '1.2rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
              title="Change Theme"
            >
              🎨
            </button>
            {isThemeMenuOpen && (
              <div
                className="account-panel active"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'absolute', 
                  right: 0, 
                  left: 'auto', 
                  top: '120%', 
                  zIndex: 9999,
                  minWidth: '200px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
              >
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('midnight')}>Midnight Dark</button>
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('light')}>Light Professional</button>
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('navy')}>Deep Navy</button>
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('slate')}>Slate Graphite</button>
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('forest')}>Forest Emerald</button>
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('crimson')}>Sunset Crimson</button>
                <button className="acc-item" style={{textAlign:'left'}} onClick={() => handleThemeChange('magenta')}>Cyber Magenta</button>
              </div>
            )}
          </li>
          <li>
            <Link
              to="/pricing"
              className="nav-pill"
              style={{
                display: 'inline-flex',
                textDecoration: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                height: '34px',
              }}
            >
              💎 Go Premium
            </Link>
          </li>

          <li className="account-menu" id="nav-account-wrap">
            <button
              className="account-btn"
              id="nav-account-btn"
              onClick={toggleAccountMenu}
            >
              <span className="account-avatar" id="nav-account-avatar">
                DT
              </span>
              <span id="nav-account-label">Account</span>
            </button>
            {isAccountMenuOpen && (
              <div
                className="account-panel active"
                id="nav-account-panel"
                style={{ display: 'flex' }}
              >
                <Link
                  to="/login"
                  className="acc-item"
                  id="nav-account-signin"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="acc-item"
                  id="nav-account-signup"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  Create Account
                </Link>
                <button
                  className="acc-item logout"
                  id="nav-account-logout"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            )}
          </li>
          <li>
            <button type="button" className="nav-pill-purple">
              🧠 Analyzer
            </button>
          </li>
        </ul>
        <div
          className={`hbg ${isMobileMenuOpen ? 'open' : ''}`}
          id="hbg"
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="mob active" id="mob" style={{ display: 'flex' }}>
          <Link to="/" onClick={toggleMobileMenu}>
            Home
          </Link>
          <Link to="/explorer" onClick={toggleMobileMenu}>
            Explorer
          </Link>
          <Link to="/login" className="btn-reset" onClick={toggleMobileMenu}>
            Sign In
          </Link>
          <Link to="/login" className="btn-reset" onClick={toggleMobileMenu}>
            Sign Up
          </Link>
          <button className="btn-reset" onClick={handleLogout}>
            Log Out
          </button>
          <Link to="/features" onClick={toggleMobileMenu}>
            Features
          </Link>
          <Link to="/advisor" onClick={toggleMobileMenu}>
            AI Advisor
          </Link>
          <Link
            to="/parent"
            style={{ color: '#a78bfa', fontWeight: 600 }}
            onClick={toggleMobileMenu}
          >
            Parent Portal
          </Link>
          <Link
            to="/school"
            style={{ color: '#60a5fa', fontWeight: 600 }}
            onClick={toggleMobileMenu}
          >
            School Portal
          </Link>
          <Link to="/reviews" onClick={toggleMobileMenu}>
            Reviews
          </Link>
          <Link to="/blog" onClick={toggleMobileMenu}>
            Blog
          </Link>
          <Link
            to="/pricing"
            style={{
              cursor: 'pointer',
              display: 'block',
              padding: '1rem 1.5rem',
              textDecoration: 'none',
              color: '#e88c2a',
              width: '100%',
              textAlign: 'left',
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
            onClick={toggleMobileMenu}
          >
            💎 Go Premium
          </Link>
          <button
            type="button"
            className="btn-reset"
            style={{
              cursor: 'pointer',
              display: 'block',
              padding: '1rem 1.5rem',
              textDecoration: 'none',
              color: 'var(--wh, #fff)',
              width: '100%',
              textAlign: 'left',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
            onClick={toggleMobileMenu}
          >
            🧠 Achievement Analyzer
          </button>
          
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem' }}>
            <p style={{ color: 'var(--mu, #a1a1aa)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Select Theme</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button onClick={() => { handleThemeChange('midnight'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--wh, #fff)' }}>Midnight</button>
                <button onClick={() => { handleThemeChange('light'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: '#fff', borderRadius: '6px', fontSize: '0.9rem', color: '#000' }}>Light</button>
                <button onClick={() => { handleThemeChange('navy'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem', color: '#60a5fa' }}>Navy</button>
                <button onClick={() => { handleThemeChange('slate'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--mu, #a1a1aa)' }}>Slate</button>
                <button onClick={() => { handleThemeChange('forest'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem', color: '#4ade80' }}>Forest</button>
                <button onClick={() => { handleThemeChange('crimson'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem', color: '#f87171' }}>Crimson</button>
                <button onClick={() => { handleThemeChange('magenta'); toggleMobileMenu(); }} className="btn-reset" style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.9rem', color: '#f472b6' }}>Magenta</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className="toast" id="toast">
        <span id="tic">✅</span>
        <span id="tmsg"></span>
      </div>
    </>
  );
};

export default Navbar;
