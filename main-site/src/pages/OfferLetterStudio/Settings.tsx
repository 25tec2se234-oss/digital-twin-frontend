// @ts-nocheck
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Save, Building, Users, Briefcase, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [settings, setSettings] = useState({
    company_name: 'Digital Twin Verse',
    brand_name: 'DTV',
    legal_entity_name: 'Digital Twin Verse Pvt Ltd',
    website: 'https://digitaltwinvrs.com/',
    company_email: 'contact@digitaltwinvrs.com',
    company_phone: '',
    company_address: 'Bangalore, India',
    offer_prefix: 'DTV-OFR'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response && !response.error) {
        setSettings({ ...settings, ...response });
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put('/settings', settings);
      showToast('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center">
          Studio Preferences
        </h1>
        <p className="text-gray-400 mt-1">Configure company details, branding, and authorized signatories.</p>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] font-semibold flex items-center"
          >
            <ShieldCheck className="w-5 h-5 mr-3" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#161920]/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-2xl flex">
        
        {/* Settings Sidebar */}
        <div className="w-64 border-r border-white/5 bg-white/[0.02]">
           <div className="p-6">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Configuration</div>
             <nav className="space-y-2">
               <button 
                 className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'company' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                 onClick={() => setActiveTab('company')}
               >
                 <div className="flex items-center">
                   <Building className="w-5 h-5 mr-3" />
                   <span className="font-semibold text-sm">Company Profile</span>
                 </div>
                 {activeTab === 'company' && <ChevronRight className="w-4 h-4" />}
               </button>
               <button 
                 className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'signatories' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                 onClick={() => setActiveTab('signatories')}
               >
                 <div className="flex items-center">
                   <Users className="w-5 h-5 mr-3" />
                   <span className="font-semibold text-sm">Signatories</span>
                 </div>
                 {activeTab === 'signatories' && <ChevronRight className="w-4 h-4" />}
               </button>
             </nav>
           </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'company' && (
              <motion.div 
                key="company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Legal & Brand Identity</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Name *</label>
                      <input 
                        type="text" 
                        value={settings.company_name}
                        onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                        className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand / Short Name</label>
                      <input 
                        type="text" 
                        value={settings.brand_name}
                        onChange={(e) => setSettings({...settings, brand_name: e.target.value})}
                        className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Legal Entity Name</label>
                      <input 
                        type="text" 
                        value={settings.legal_entity_name || ''}
                        onChange={(e) => setSettings({...settings, legal_entity_name: e.target.value})}
                        className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Website URL</label>
                      <input 
                        type="text" 
                        value={settings.website || ''}
                        onChange={(e) => setSettings({...settings, website: e.target.value})}
                        className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Corporate Email</label>
                      <input 
                        type="email" 
                        value={settings.company_email || ''}
                        onChange={(e) => setSettings({...settings, company_email: e.target.value})}
                        className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Registered Address</label>
                      <textarea 
                        value={settings.company_address || ''}
                        onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                        className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'signatories' && (
              <motion.div 
                key="signatories"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-white">Authorized Signatories</h3>
                  <button className="text-sm font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 transition-colors">+ Add New</button>
                </div>
                
                <div className="grid gap-4">
                  <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                          K
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-bold text-white text-lg">Kumar Kartikey</h4>
                             <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          </div>
                          <p className="text-sm text-gray-400 flex items-center mt-1 font-medium">
                            <Briefcase className="w-4 h-4 mr-2 opacity-50" />
                            Founder & CEO
                          </p>
                        </div>
                      </div>
                      <button className="text-sm font-semibold text-gray-500 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100">Edit Profile</button>
                    </div>
                  </div>

                  <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                          K
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-bold text-white text-lg">Kaushiki Singh</h4>
                             <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          </div>
                          <p className="text-sm text-gray-400 flex items-center mt-1 font-medium">
                            <Briefcase className="w-4 h-4 mr-2 opacity-50" />
                            Co-Founder
                          </p>
                        </div>
                      </div>
                      <button className="text-sm font-semibold text-gray-500 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100">Edit Profile</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Settings;
