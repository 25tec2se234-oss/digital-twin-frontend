// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { ShieldCheck, Calendar, MapPin, Briefcase, CheckCircle2, XCircle, FileSignature } from 'lucide-react';
import { motion } from 'framer-motion';
import LivePreview from './LivePreview';

const PublicVerification = () => {
  const { token } = useParams();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [securityPassed, setSecurityPassed] = useState(false);
  const [securityInput, setSecurityInput] = useState('');
  const [securityError, setSecurityError] = useState('');

  useEffect(() => {
    fetchOffer();
  }, [token]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const docSnap = await api.get(`/verify/${token}`);
      
      if (docSnap && !docSnap.error) {
        setOffer({ ...docSnap });
      } else {
        setError('Invalid or expired verification link.');
      }
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        setError('Invalid or expired verification link.');
      } else {
        setError('Error retrieving document.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center">
        <div className="w-16 h-16 relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium tracking-wider uppercase text-sm">Verifying Cryptographic Record...</p>
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

  const handleSecurityCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityInput.trim().toUpperCase() === offer.offer_id.toUpperCase()) {
      setSecurityPassed(true);
      setSecurityError('');
    } else {
      setSecurityError('ACCESS DENIED: Incorrect Offer ID.');
    }
  };

  if (!securityPassed && offer) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#161920] max-w-md w-full rounded-3xl shadow-2xl p-10 border border-indigo-500/20">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 text-center">Z++ Security Gateway</h2>
          <p className="text-gray-400 text-sm text-center mb-8">This is a restricted document. Please enter the Exact Offer ID printed on the physical letter to unlock the verification record.</p>
          
          <form onSubmit={handleSecurityCheck}>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Offer ID</label>
              <input 
                type="text" 
                value={securityInput}
                onChange={(e) => setSecurityInput(e.target.value)}
                placeholder="e.g. DTV-OFR-2026-1529"
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                required
              />
            </div>
            
            {securityError && (
              <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center font-mono">
                {securityError}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={!securityInput.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
            >
              Verify & Unlock Record
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const isRevoked = offer.status === 'REVOKED';
  const isActive = offer.status === 'ACCEPTED';
  const isDeclined = offer.status === 'DECLINED';

  return (
    <div className="min-h-screen bg-[#0f1115] py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
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
          <p className="mt-3 text-lg text-indigo-300 font-medium tracking-wide uppercase">Public Verification Record</p>
        </motion.div>

        {/* Status Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-[#161920]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden mb-8">
          <div className={`p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between ${isRevoked ? 'bg-rose-500/10' : isActive ? 'bg-emerald-500/10' : isDeclined ? 'bg-orange-500/10' : 'bg-indigo-500/10'}`}>
            <div className="flex items-center space-x-6">
              <div className={`p-4 rounded-full bg-white/5 backdrop-blur-md shadow-inner ${isRevoked ? 'text-rose-400' : isActive ? 'text-emerald-400' : isDeclined ? 'text-orange-400' : 'text-indigo-400'}`}>
                {isRevoked ? <XCircle className="w-8 h-8" /> : 
                 isActive ? <CheckCircle2 className="w-8 h-8" /> :
                 isDeclined ? <XCircle className="w-8 h-8" /> :
                 <ShieldCheck className="w-8 h-8" />}
              </div>
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isRevoked ? 'text-rose-400' : isActive ? 'text-emerald-400' : isDeclined ? 'text-orange-400' : 'text-indigo-400'}`}>
                  {isRevoked ? 'Record Revoked' : isActive ? 'Verified Employee' : isDeclined ? 'Record Inactive' : 'Valid Offer Record'}
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-medium">
                  {isRevoked ? 'This individual is no longer associated with DTV or the offer was revoked.' : 
                   isActive ? `This individual is a verified member of Digital Twin Verse.` :
                   isDeclined ? 'This offer was declined and is inactive.' :
                   'This is an authentic, cryptographically secured employment offer record by DTV.'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Candidate Info</h3>
                </div>
                <p className="text-3xl font-black text-white">{offer.candidate_details?.name || 'N/A'}</p>
                <p className="text-sm font-mono text-indigo-400 mt-2 bg-indigo-500/10 inline-block px-3 py-1 rounded-lg border border-indigo-500/20">Ref ID: {offer.id}</p>
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
                 <div className="flex items-center space-x-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Officially Verified</span>
                 </div>
                 <p className="text-lg font-bold text-white">Digital Twin Verse</p>
                 <p className="text-sm text-gray-400">Authentic Employment Record</p>
               </div>
               <div className="opacity-20 text-emerald-500">
                 <FileSignature className="w-12 h-12" />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Visual Document Preview */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-12 flex flex-col items-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Original Document View</h3>
          </div>
          
          <div className="w-full overflow-x-auto pb-8 custom-scrollbar flex justify-center">
            <div className="relative shadow-2xl rounded-sm overflow-hidden border border-white/10 shrink-0">
              <LivePreview data={offer} />
            </div>
          </div>
        </motion.div>

        <div className="mt-4 text-center">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            Secured by Digital Twin Verse Enterprise Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicVerification;
