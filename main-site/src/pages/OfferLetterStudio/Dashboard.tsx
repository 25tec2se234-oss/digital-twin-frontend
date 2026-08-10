// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Edit, Eye, Download, Sparkles, Filter, MoreHorizontal, Trash2, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import html2pdf from 'html2pdf.js';
import LivePreview from './LivePreview';

const Dashboard = () => {
  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, sent: 0, accepted: 0, declined: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // PDF Download State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [offerToDownload, setOfferToDownload] = useState<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const copyCandidateLink = (token: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}#/offer/action/${token}`;
    navigator.clipboard.writeText(link);
    alert("Candidate action link copied to clipboard!");
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Trigger PDF Generation once offerToDownload is set and rendered off-screen
  useEffect(() => {
    if (offerToDownload && previewRef.current) {
      generatePDF();
    }
  }, [offerToDownload]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/', { params: { limit: 1000 } });
      const fetchedOffers = response.offers || [];
      const st = { total: response.total || 0, drafts: 0, sent: 0, accepted: 0, declined: 0, expired: 0 };
      
      fetchedOffers.forEach((data: any) => {
        const status = data.status ? data.status.toUpperCase() : 'DRAFT';
        if (status === 'DRAFT') st.drafts++;
        if (status === 'SENT') st.sent++;
        if (status === 'ACCEPTED') st.accepted++;
        if (status === 'DECLINED') st.declined++;
        if (status === 'EXPIRED') st.expired++;
      });
      
      setOffers(fetchedOffers);
      setStats(st);
    } catch (error) {
      console.error('Failed to fetch offers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this offer letter?")) {
      try {
        await api.delete(`/${id}`);
        setActiveDropdown(null);
        fetchOffers();
      } catch (err) {
        console.error("Error deleting offer: ", err);
        alert("Failed to delete offer.");
      }
    }
  };

  const triggerDownload = (offer: any) => {
    setDownloadingId(offer.id);
    setOfferToDownload(offer);
  };

  const generatePDF = async () => {
    if (!previewRef.current || !offerToDownload) return;
    try {
      await document.fonts.ready; // Wait for fonts to fully load to avoid font distortion
      const opt = {
        margin:       [0.4, 0, 0.4, 0], // Top/Bottom margin to prevent touching edges
        filename:     `Offer_Letter_${offerToDownload.candidate_details?.name || 'Candidate'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 3, useCORS: true, letterRendering: true, allowTaint: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };
      await html2pdf().set(opt).from(previewRef.current).save();
    } catch (err) {
      console.error("PDF generation error: ", err);
      alert("Failed to generate PDF");
    } finally {
      setDownloadingId(null);
      setOfferToDownload(null);
    }
  };

  const toggleFilter = () => {
    const filters = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'];
    const currentIndex = filters.indexOf(statusFilter);
    setStatusFilter(filters[(currentIndex + 1) % filters.length]);
  };

  // Apply filters
  const displayedOffers = offers.filter(offer => {
    const matchesSearch = 
      (offer.candidate_details?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.position_details?.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.offer_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const offerStatus = offer.status ? offer.status.toUpperCase() : 'DRAFT';
    const matchesStatus = statusFilter === 'ALL' || offerStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { title: 'Total Offers', value: stats.total, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { title: 'Drafts', value: stats.drafts, icon: Edit, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    { title: 'Sent', value: stats.sent, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { title: 'Accepted', value: stats.accepted, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { title: 'Declined', value: stats.declined, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">Draft</span>;
      case 'SENT': return <span className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">Sent</span>;
      case 'ACCEPTED': return <span className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">Accepted</span>;
      case 'DECLINED': return <span className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Declined</span>;
      default: return <span className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hidden container for PDF generation */}
      <div className="absolute top-[-10000px] left-[-10000px] z-[-10] opacity-0 pointer-events-none">
        {offerToDownload && (
          <div ref={previewRef}>
            <LivePreview data={offerToDownload} />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center">
            Offers Overview 
            <Sparkles className="w-5 h-5 ml-3 text-indigo-400" />
          </h1>
          <p className="text-gray-400 mt-1">Manage, track, and generate premium offer letters.</p>
        </div>
        <Link 
          to="/offer-letter-studio/create" 
          className="group relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all duration-300 ease-in-out bg-indigo-600 rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[#0f1115]"
        >
          <span className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity blur-md"></span>
          <span className="relative flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Create Offer Letter
          </span>
        </Link>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        {statCards.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-[#161920]/80 backdrop-blur-md rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-white/10 transition-colors"
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:opacity-100 opacity-50 transition-opacity`}></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-2 text-3xl font-black text-white">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Advanced Data Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#161920]/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/5 bg-white/[0.02]">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, ID or role..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[#0f1115] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            <button 
              onClick={toggleFilter}
              className={`flex items-center px-4 py-2.5 border rounded-xl text-sm transition-colors ${statusFilter !== 'ALL' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-[#0f1115] border-white/10 text-gray-300 hover:text-white hover:border-white/20'}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Status: {statusFilter}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01] border-b border-white/5 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Offer ID</th>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Role & Package</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                      <span className="text-gray-400 font-medium">Syncing offers...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedOffers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-10 h-10 text-gray-600" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">No offers found</h3>
                      <p className="text-sm text-gray-400 mb-6 text-center">We couldn't find any offers matching your current filters.</p>
                      {searchQuery || statusFilter !== 'ALL' ? (
                        <button 
                          onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                          className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <Link to="/offer-letter-studio/create" className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl transition-colors">
                          Create First Offer
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedOffers.map((offer: any) => (
                  <tr key={offer.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-medium text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md">{offer.offer_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold mr-3 shadow-inner">
                          {offer.candidate_details?.name?.charAt(0) || 'C'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-200">{offer.candidate_details?.name}</span>
                          <span className="text-xs text-gray-500">{offer.candidate_details?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-300">{offer.position_details?.designation}</span>
                        <span className="text-xs text-gray-500 mt-0.5">₹{offer.compensation_details?.amount || '---'} {offer.compensation_details?.salary_type === 'Annual' ? 'LPA' : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {offer.createdAt?.toDate 
                        ? offer.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : new Date(offer.issue_date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      }
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(offer.status?.toUpperCase() || 'DRAFT')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => copyCandidateLink(offer.verification_token)}
                          className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all" 
                          title="Copy Candidate Link"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        <Link to={`/offer/action/${offer.verification_token}`} target="_blank" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Preview Candidate Portal">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link to={`/offer-letter-studio/edit/${offer.id}`} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all" title="Edit Offer">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => triggerDownload(offer)}
                          disabled={downloadingId === offer.id}
                          className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all disabled:opacity-50" 
                          title="Download PDF"
                        >
                          <Download className={`w-4 h-4 ${downloadingId === offer.id ? 'animate-bounce text-emerald-400' : ''}`} />
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === offer.id ? null : offer.id)}
                            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-lg transition-all" 
                            title="More Options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          <AnimatePresence>
                            {activeDropdown === offer.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-[#161920] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                              >
                                <button 
                                  onClick={() => handleDelete(offer.id)}
                                  className="flex items-center w-full px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-medium"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Offer
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
