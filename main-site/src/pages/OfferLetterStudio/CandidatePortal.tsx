// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { ShieldCheck, Calendar, MapPin, Briefcase, Download, CheckCircle2, XCircle, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LivePreview from './LivePreview';
import html2pdf from 'html2pdf.js';

const CandidatePortal = () => {
  const { token } = useParams();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('');
  
  const previewRef = useRef<HTMLDivElement>(null);

  // We don't fetch on mount anymore, we wait for email verification
  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!candidateEmail.trim()) return;

    try {
      setLoading(true);
      setError('');
      const docSnap = await api.post(`/access/${token}`, { email: candidateEmail.trim() });
      
      if (docSnap && !docSnap.error) {
        setOffer({ ...docSnap });
        setIsAuthenticated(true);
      } else {
        setError('Invalid or expired offer verification link.');
      }
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError('Invalid email address. Please try again.');
      } else if (err.response && err.response.status === 404) {
        setError('Invalid or expired offer verification link.');
      } else {
        setError('Error retrieving offer document.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      setIsDownloading(true);
      await document.fonts.ready; // Wait for fonts to fully load
      const opt = {
        margin:       [10, 0, 10, 0], // Top/Bottom margin in mm
        filename:     `Offer_Letter_${offer.candidate_details?.name || 'Candidate'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true, allowTaint: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'], avoid: '.avoid-break' }
      };
      await html2pdf().set(opt).from(previewRef.current).save();
    } catch (err) {
      console.error("PDF generation error: ", err);
      alert("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const submitAction = async () => {
    if (!actionType) return;
    try {
      setActionLoading(true);
      const payload: any = {};

      if (actionType === 'accept') {
        if (!inputValue.trim()) {
           alert("Please type your name to sign.");
           setActionLoading(false);
           return;
        }
        payload.signature = inputValue;
        await api.post(`/verify/${token}/accept`, payload);
      } else {
        payload.reason = inputValue;
        await api.post(`/verify/${token}/decline`, payload);
      }

      setActionType(null);
      setInputValue('');
      await handleAuth();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${actionType} offer`);
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center">
        <div className="w-16 h-16 relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium tracking-wider uppercase text-sm">Verifying Cryptographic Token...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#161920] max-w-md w-full rounded-3xl shadow-2xl p-10 border border-white/10">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 text-center">Secure Access</h2>
          <p className="text-gray-400 text-sm text-center mb-8">Please verify your identity to access your offer letter.</p>
          
          <form onSubmit={handleAuth}>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Registered Email</label>
              <input 
                type="email" 
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                required
              />
            </div>
            
            {error && (
              <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={loading || !candidateEmail.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Access Offer Letter'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#161920] max-w-md w-full rounded-3xl shadow-2xl p-10 text-center border border-rose-500/20">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <XCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Verification Failed</h2>
          <p className="text-gray-400 leading-relaxed">{error}</p>
        </motion.div>
      </div>
    );
  }

  const isRevoked = offer.status === 'REVOKED';
  const isAccepted = offer.status === 'ACCEPTED';
  const isDeclined = offer.status === 'DECLINED';
  const isActionable = !isRevoked && !isAccepted && !isDeclined;

  return (
    <div className="min-h-screen bg-[#0f1115] py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
      
      {/* Hidden PDF Container */}
      <div className="absolute top-[-10000px] left-[-10000px] z-[-10] opacity-0 pointer-events-none" style={{ width: '210mm' }}>
        <div ref={previewRef}>
          <LivePreview data={offer} />
        </div>
      </div>

      <AnimatePresence>
        {actionType && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161920] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                {actionType === 'accept' ? 'Sign & Accept Offer' : 'Decline Offer'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {actionType === 'accept' 
                  ? 'Please type your full legal name below to act as your electronic signature.' 
                  : 'Please provide an optional reason for declining this offer.'}
              </p>
              
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={actionType === 'accept' ? "Full Legal Name" : "Reason (Optional)"}
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all mb-6"
              />
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => { setActionType(null); setInputValue(''); }}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitAction}
                  disabled={actionLoading || (actionType === 'accept' && !inputValue.trim())}
                  className={`px-6 py-2 rounded-xl font-bold text-white transition-all shadow-lg ${actionType === 'accept' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'} disabled:opacity-50`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-indigo-500/10 rounded-full blur-[120px] -z-10" />

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-6">
            <span className="text-white font-black text-3xl tracking-tighter">DTV</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
            <span className="text-white">DIGITAL</span> <span className="text-orange-500">TWIN VERSE</span>
          </h1>
          <p className="mt-3 text-lg text-indigo-300 font-medium tracking-wide uppercase">Candidate Actions Portal</p>
        </motion.div>

        {/* Status Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-[#161920]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden mb-8">
          <div className={`p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between ${isRevoked ? 'bg-rose-500/10' : isAccepted ? 'bg-emerald-500/10' : isDeclined ? 'bg-orange-500/10' : 'bg-indigo-500/10'}`}>
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <div className={`p-4 rounded-full bg-white/5 backdrop-blur-md shadow-inner ${isRevoked ? 'text-rose-400' : isAccepted ? 'text-emerald-400' : isDeclined ? 'text-orange-400' : 'text-indigo-400'}`}>
                {isRevoked ? <XCircle className="w-8 h-8" /> : 
                 isAccepted ? <CheckCircle2 className="w-8 h-8" /> :
                 isDeclined ? <XCircle className="w-8 h-8" /> :
                 <ShieldCheck className="w-8 h-8" />}
              </div>
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isRevoked ? 'text-rose-400' : isAccepted ? 'text-emerald-400' : isDeclined ? 'text-orange-400' : 'text-indigo-400'}`}>
                  {isRevoked ? 'Offer Revoked' : isAccepted ? 'Offer Accepted' : isDeclined ? 'Offer Declined' : 'Action Required'}
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-medium">
                  {isRevoked ? 'This offer letter is no longer valid or active.' : 
                   isAccepted ? `Electronically signed & accepted on ${new Date(offer.actionDate).toLocaleDateString()}` :
                   isDeclined ? 'You have declined this employment offer.' :
                   'Please review the offer details and confirm your decision.'}
                </p>
              </div>
            </div>
            {!isRevoked && (
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Generating...' : 'Download PDF'}
              </button>
            )}
          </div>
          
          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Candidate Info</h3>
                </div>
                <p className="text-3xl font-black text-white">{offer.candidate_details?.name || 'N/A'}</p>
                <p className="text-sm font-mono text-indigo-400 mt-2 bg-indigo-500/10 inline-block px-3 py-1 rounded-lg border border-indigo-500/20">ID: {offer.id}</p>
              </div>
              
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Role Details</h3>
                </div>
                <ul className="space-y-6">
                  <li className="flex items-start">
                    <div className="p-2 bg-white/5 rounded-lg mr-4 mt-0.5"><Briefcase className="w-5 h-5 text-gray-300" /></div>
                    <div>
                      <p className="text-lg font-bold text-white">{offer.position_details?.designation || 'N/A'}</p>
                      <p className="text-sm text-gray-500 mt-1">{offer.position_details?.employment_type || 'Full Time'}</p>
                    </div>
                  </li>
                  {offer.position_details?.joining_date && (
                    <li className="flex items-start">
                      <div className="p-2 bg-white/5 rounded-lg mr-4 mt-0.5"><Calendar className="w-5 h-5 text-gray-300" /></div>
                      <div>
                        <p className="text-lg font-bold text-white">Joining Date</p>
                        <p className="text-sm text-gray-500 mt-1">{new Date(offer.position_details.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </li>
                  )}
                  {offer.position_details?.work_mode && (
                    <li className="flex items-start">
                      <div className="p-2 bg-white/5 rounded-lg mr-4 mt-0.5"><MapPin className="w-5 h-5 text-gray-300" /></div>
                      <div>
                        <p className="text-lg font-bold text-white">{offer.position_details.work_mode}</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {offer.responsibilities && offer.responsibilities.length > 0 && (
              <div className="mt-12 pt-12 border-t border-white/5">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Key Responsibilities</h3>
                </div>
                <ul className="list-disc list-outside ml-5 space-y-2 text-gray-300">
                  {offer.responsibilities.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-16 bg-[#0f1115] rounded-2xl p-6 border border-white/5 flex items-center justify-between">
               <div>
                 <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Authorized By</p>
                 <p className="text-lg font-bold text-white">Digital Twin Verse</p>
                 <p className="text-sm text-gray-400">Human Resources</p>
               </div>
               <div className="opacity-20 text-white">
                 <FileSignature className="w-12 h-12" />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Action Bar */}
        {isActionable && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-[#161920]/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 text-center md:text-left">
              <h3 className="text-xl font-bold text-white tracking-tight">Final Step</h3>
              <p className="text-sm text-gray-400 mt-1">Review the PDF and confirm your decision below.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <button 
                onClick={() => setActionType('decline')}
                className="px-8 py-3.5 border border-white/10 text-sm font-bold rounded-xl text-gray-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all disabled:opacity-50"
              >
                Decline Offer
              </button>
              <button 
                onClick={() => setActionType('accept')}
                className="relative group px-8 py-3.5 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-50"
              >
                Accept & Sign Offer
              </button>
            </div>
          </motion.div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            Secured by Digital Twin Verse Enterprise Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
