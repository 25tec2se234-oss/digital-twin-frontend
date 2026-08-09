// @ts-nocheck
import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Settings, LogOut, Search, Bell, Menu, X, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './Dashboard';
import OfferEditor from './OfferEditor';
import CompanySettings from './Settings';

const OfferLetterApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLogout = () => {
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/offer-letter-studio', icon: LayoutDashboard },
    { name: 'Create Offer', path: '/offer-letter-studio/create', icon: FilePlus },
    { name: 'Settings', path: '/offer-letter-studio/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-300 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Premium Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#161920] border-r border-white/5 flex flex-col relative z-20 shrink-0 shadow-2xl shadow-black"
          >
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-white/5">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-lg tracking-tighter relative z-10">DTV</span>
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm" />
              </div>
              <div className="ml-4">
                <h1 className="text-white font-bold tracking-tight text-lg">Studio <span className="text-indigo-400">Pro</span></h1>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Digital Twin Verse</p>
              </div>
            </div>
            
            {/* Nav */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 px-2">Menu</div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/offer-letter-studio' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="relative block"
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-nav"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 to-purple-500/5 rounded-xl border border-indigo-500/20"
                      />
                    )}
                    <div className={`relative flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                      <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''}`} />
                      <span className="font-medium text-sm">{item.name}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400/50" />}
                    </div>
                  </Link>
                );
              })}
            </nav>
            
            {/* User Area */}
            <div className="p-4 border-t border-white/5 bg-[#12141a]">
              <button
                onClick={handleLogout}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group border border-transparent hover:border-red-500/20"
              >
                <div className="flex items-center">
                  <LogOut className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                  Exit Studio
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0f1115] to-[#161920]">
        
        {/* Subtle Background Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Global Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-6 z-50 bg-[#161920]/90 backdrop-blur-md border border-indigo-500/30 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold flex items-center"
            >
              <Bell className="w-5 h-5 mr-3 text-indigo-400" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Header */}
        <header className="h-20 flex items-center justify-between px-8 relative z-10 border-b border-white/5 bg-[#0f1115]/50 backdrop-blur-xl">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="mr-6 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative group hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Quick search offers..."
                className="w-64 bg-[#161920] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button 
              onClick={() => showToast('No new notifications')}
              className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_5px_rgba(99,102,241,0.8)]"></span>
            </button>
            <div className="h-8 w-px bg-white/10"></div>
            <div 
              onClick={() => showToast('Profile settings are currently synced with Settings page.')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">Kumar Kartikey</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">CEO / Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 p-0.5 group-hover:border-indigo-400 transition-colors">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Routes */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto relative z-10 custom-scrollbar p-6 lg:p-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-[1600px] mx-auto h-full"
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<OfferEditor />} />
              <Route path="/edit/:id" element={<OfferEditor />} />
              <Route path="/settings" element={<CompanySettings />} />
            </Routes>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default OfferLetterApp;
