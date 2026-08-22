// @ts-nocheck
import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Phone, MapPin, Sparkles, ArrowLeft } from 'lucide-react';

interface SignUpProps {
  onSignInClick: () => void;
  onSignUpSuccess: (data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    role: string;
    city: string;
  }) => void;
}

const ROLES = [
  'School Student',
  'Undergraduate',
  'Postgraduate',
  'Parent',
  'Career Counsellor',
  'Other',
];

export default function SignUp({ onSignInClick, onSignUpSuccess }: SignUpProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password Strength Meter Logic
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-4
  };

  const pwScore = getPasswordStrength(password);
  const strengthFillPct = password.length === 0 ? 0 : Math.max(25, (pwScore / 4) * 100);
  
  let strengthLabel = 'WEAK';
  let strengthColorClass = 'text-[#FF5C5C]';
  let strengthBarBgColor = '#FF5C5C';
  
  if (pwScore <= 1) {
    strengthLabel = 'WEAK';
    strengthColorClass = 'text-[#FF5C5C]';
    strengthBarBgColor = '#FF5C5C';
  } else if (pwScore <= 2) {
    strengthLabel = 'MEDIUM';
    strengthColorClass = 'text-[#F5B93D]';
    strengthBarBgColor = '#F5B93D';
  } else {
    strengthLabel = 'STRONG';
    strengthColorClass = 'text-[#2ECC71]';
    strengthBarBgColor = '#2ECC71';
  }

  const handleSocialSignUp = (provider: string) => {
    if ((window.parent as any).showToast) {
      (window.parent as any).showToast('⚠️', `${provider} sign-up is coming soon.`);
    } else {
      setError(`${provider} sign-up is currently unavailable.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !mobileNumber || !role || !city || !password || !confirmPassword) {
      setError('Please fill in all fields to register.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const isIframe = window.parent && window.parent !== window && (window.parent as any).handleReactSignup;
      if (isIframe) {
        const res = await (window.parent as any).handleReactSignup(fullName, email, password, role, mobileNumber, city);
        if (res && res.success) {
          setIsSuccess(true);
          setTimeout(() => {
            onSignUpSuccess({ fullName, email, mobileNumber, role, city });
          }, 900);
        } else {
          setError(res?.error || 'Registration failed.');
        }
      } else {
        // Standalone signup - make actual API call!
        const formspreeId = (window as any).CFG?.formspreeId || 'mvzdpwyv';
        fetch('https://formspree.io/f/' + formspreeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            _subject: 'New Sign Up - ' + fullName,
            Name: fullName, Email: email, Phone: mobileNumber || '',
            Role: role || 'Student', City: city || ''
          })
        }).catch(() => {});

        const res = await fetch('/api/v1/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password, name: fullName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Signup failed');
        
        const userData = {
          id: data.user.id,
          token: data.accessToken,
          name: data.user.name,
          email: data.user.email,
          role: role || 'Student',
          phone: mobileNumber || '',
          city: city || '',
          emailVerified: data.user.emailVerified,
          trialExpiresAt: data.user.trialExpiresAt || null,
          subscriptionExpiresAt: data.user.subscriptionExpiresAt || null,
          rememberMe: false,
          loggedIn: true,
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('dt_user', JSON.stringify(userData));
        
        setIsSuccess(true);
        setTimeout(() => {
          window.top.location.href = '/';
        }, 900);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl px-6 py-8 relative z-10 flex flex-col items-center animate-[fadeInScale_0.6s_ease-out_forwards]">
      {/* Logo Area */}
      <div className="mb-6 flex flex-col items-center text-center">
        <img
          id="dtv-logo-signup"
          alt="Digital Twin Verse"
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-2xl object-cover shadow-[0_0_30px_rgba(212,175,55,0.2)] border border-[#d4af37]/20 mb-4"
          src="https://digitaltwinvrs.com/img/dtv-logo.jpg"
        />
        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2 font-sans">
          Create Your DTV Profile
        </h1>
        <p className="text-xs text-[#cbc3d7] text-center max-w-sm">
          Initialize your academic digital twin. Your twin will model your skills, simulate pathways, and serve as your personalized study partner.
        </p>
      </div>

      {/* SignUp Card */}
      <div id="signup-card" className="glass-card w-full rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-[#131314]/60 border border-[#d4af37]/15 shadow-2xl relative">
        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2.5 text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="fullName">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <UserIcon size={16} />
                </span>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none"
                  placeholder="e.g. Alex Rivera"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="signup-email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <Mail size={16} />
                </span>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none"
                  placeholder="e.g. alex@university.edu"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mobile Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="mobileNumber">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <Phone size={16} />
                </span>
                <input
                  id="mobileNumber"
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none"
                  placeholder="e.g. +1 (555) 019-2834"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="city">
                City
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <MapPin size={16} />
                </span>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none"
                  placeholder="e.g. San Francisco"
                />
              </div>
            </div>
          </div>

          {/* I am (Role) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="role">
              I am (Role)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                <Sparkles size={16} />
              </span>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`glass-input w-full rounded-lg py-2.5 pl-10 pr-8 bg-black/65 border border-white/10 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none appearance-none cursor-pointer ${role === '' ? 'text-[#b4acc0]' : 'text-white'
                  }`}
              >
                <option value="" disabled style={{ backgroundColor: '#191c1e', color: '#b4acc0' }}>
                  Select your role
                </option>
                {ROLES.map((roleOpt) => (
                  <option key={roleOpt} value={roleOpt} style={{ backgroundColor: '#191c1e', color: '#ffffff' }}>
                    {roleOpt}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="signup-password">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <Lock size={16} />
                </span>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none"
                  placeholder="At least 6 characters"
                />
              </div>
              {password.length > 0 && (
                <div className="password-strength mt-2">
                  <div className="strength-bar w-full h-[4px] bg-white/15 rounded-[2px] overflow-hidden">
                    <div 
                      className="strength-fill h-full rounded-[2px] transition-all duration-350"
                      style={{ width: `${strengthFillPct}%`, backgroundColor: strengthBarBgColor }}
                    ></div>
                  </div>
                  <div className="strength-row flex justify-between mt-1.5 text-[9px] font-bold">
                    <span className={`strength-label uppercase tracking-wider ${strengthColorClass}`}>{strengthLabel}</span>
                    <span className="strength-hint text-white/50">Must be at least 8 characters</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#cbc3d7]" htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <Lock size={16} />
                </span>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-xs outline-none"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            disabled={isLoading || isSuccess}
            className={`btn-signin w-full mt-4 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 group relative overflow-hidden cursor-pointer transition-all duration-300 ${
              isSuccess 
                ? 'success bg-[#2ECC71] shadow-[0_0_24px_rgba(46,204,113,0.55)] text-white' 
                : 'bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-[#101415] hover:from-[#e5c04c] hover:to-[#bc9d3d] shadow-[0_10px_25px_-5px_rgba(212,175,55,0.3)]'
            }`}
          >
            {isSuccess ? (
              <span className="relative z-10 font-bold">&#10003; Twin Instantiated!</span>
            ) : (
              <span className="relative z-10 font-bold">{isLoading ? 'Instantiating...' : 'Instantiate My Twin'}</span>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10 text-center relative z-10">
          <button
            id="back-to-signin-btn"
            onClick={onSignInClick}
            className="text-xs font-semibold text-[#cbc3d7] hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
