// @ts-nocheck
import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
  onSignInClick: () => void;
}

export default function ForgotPassword({ onSignInClick }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setError('');
    
    try {
      const isIframe = window.parent && window.parent !== window && (window.parent as any).handleReactForgotPassword;
      if (isIframe) {
        const res = await (window.parent as any).handleReactForgotPassword(email);
        if (res && res.success) {
          setSubmitted(true);
        } else {
          setError(res?.error || 'Failed to send reset link.');
        }
      } else {
        // Standalone forgot password - make actual API call!
        const res = await fetch('/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        if (res.ok) {
          setSubmitted(true);
        } else {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send reset link.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setResetError('Please enter both the OTP and your new password.');
      return;
    }
    setResetError('');
    setIsResetting(true);
    
    try {
      const isIframe = window.parent && window.parent !== window && (window.parent as any).handleReactResetPassword;
      if (isIframe) {
        const res = await (window.parent as any).handleReactResetPassword(email, otp, newPassword);
        if (res && res.success) {
          setSubmitted(false);
          onSignInClick();
        } else {
          setResetError(res?.error || 'Failed to reset password.');
        }
      } else {
        // Standalone reset password - make actual API call!
        const res = await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, otpCode: otp, newPassword: newPassword })
        });
        if (res.ok) {
          setSubmitted(false);
          onSignInClick();
        } else {
          const data = await res.json();
          throw new Error(data.error || 'Failed to reset password.');
        }
      }
    } catch (err: any) {
      setResetError(err.message || 'An error occurred.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-md px-6 py-12 relative z-10 flex flex-col items-center animate-[fadeInScale_0.6s_ease-out_forwards]">
      {/* Logo Area */}
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          id="dtv-logo-forgot"
          alt="Digital Twin Verse"
          referrerPolicy="no-referrer"
          className="w-24 h-24 rounded-2xl object-cover shadow-[0_0_35px_rgba(212,175,55,0.25)] border border-[#d4af37]/20 mb-6"
          src="https://digitaltwinvrs.com/img/dtv-logo.jpg"
        />
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3 font-sans">
          Restore Access
        </h1>
        <p className="text-sm text-[#cbc3d7] text-center leading-relaxed backdrop-blur-md bg-black/40 rounded-xl p-4 border border-white/5">
          Enter your registered email address below, and we will send a restoration signal to rebuild your twin's synaptic connections.
        </p>
      </div>

      {/* ForgotPassword Card */}
      <div id="forgot-password-card" className="glass-card w-full rounded-2xl p-8 backdrop-blur-xl bg-[#131314]/60 border border-[#d4af37]/15 shadow-2xl relative">
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6 flex flex-col relative z-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#cbc3d7] block" htmlFor="forgot-email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#958ea0]">
                  <Mail size={18} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full rounded-lg py-3 pl-12 pr-4 text-white bg-black/60 border border-white/10 placeholder-[#b4acc0] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm outline-none"
                  placeholder="Please enter your email."
                />
              </div>
            </div>

            <button
              id="reset-submit-btn"
              type="submit"
              className="btn-primary w-full mt-4 py-3.5 rounded-lg text-[#101415] font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] hover:from-[#e5c04c] hover:to-[#bc9d3d] transition-all duration-300 flex items-center justify-center gap-2 group shadow-[0_10px_25px_-5px_rgba(212,175,55,0.4)] cursor-pointer"
            >
              Send Recovery Signal
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4 py-4 relative z-10 flex flex-col">
            <h3 className="text-lg font-bold text-white text-center">Enter OTP & New Password</h3>
            <p className="text-xs text-[#cbc3d7] text-center mb-4">
              We sent an OTP to <strong className="text-white">{email}</strong>
            </p>
            {resetError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 text-center">
                {resetError}
              </div>
            )}
            <input
              id="reset-otp"
              required
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="glass-input w-full rounded-lg py-3 px-4 text-white bg-black/60 border border-[#d4af37]/20 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all mb-4"
            />
            <input
              id="reset-pwd"
              required
              minLength={6}
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="glass-input w-full rounded-lg py-3 px-4 text-white bg-black/60 border border-[#d4af37]/20 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all mb-4"
            />
            <button
              type="submit"
              disabled={isResetting}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] hover:from-[#c5a030] hover:to-[#e4d59b] text-black font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)] mb-4 cursor-pointer"
            >
              {isResetting ? 'Verifying...' : 'Verify & Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-xs text-[#d4af37] hover:underline w-full text-center mt-2 cursor-pointer"
            >
              Try a different email address
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center relative z-10">
          <button
            id="forgot-back-to-signin-btn"
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
