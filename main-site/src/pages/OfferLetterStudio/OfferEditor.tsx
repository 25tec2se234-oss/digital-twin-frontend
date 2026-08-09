// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileCheck2, ChevronRight, ChevronLeft, Sparkles, Check, FileText, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LivePreview from './LivePreview';

const STEPS = ['Candidate', 'Position', 'Compensation', 'Roles', 'Terms'];

const defaultResponsibilities = [
  "Spearhead the development and maintenance of scalable applications.",
  "Collaborate with cross-functional teams to define, design, and ship new features.",
  "Ensure the performance, quality, and responsiveness of applications.",
  "Identify and correct bottlenecks and fix bugs."
];

const defaultClauses = [
  { id: 'probation', title: 'Probation Period', content: 'You will be on probation for a period of 6 months from your date of joining.', enabled: true },
  { id: 'confidentiality', title: 'Confidentiality', content: 'You shall not disclose any confidential information regarding the company to any third party.', enabled: true },
  { id: 'ip', title: 'Intellectual Property', content: 'Any intellectual property created during your employment belongs exclusively to Digital Twin Verse.', enabled: true },
  { id: 'termination', title: 'Termination', content: 'Either party may terminate this agreement by providing 30 days written notice.', enabled: true },
];

const OfferEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);

  // Form State
  const [offerData, setOfferData] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    candidate_details: { name: '', email: '', phone: '' },
    position_details: { designation: '', employment_type: 'Full Time', work_mode: 'Remote', joining_date: '' },
    compensation_details: { salary_type: 'Annual', amount: '', currency: 'INR' },
    responsibilities: [...defaultResponsibilities],
    clauses: [...defaultClauses],
    signatory_id: null,
    template_id: null
  });

  useEffect(() => {
    if (id) {
      const fetchDraft = async () => {
        setInitialLoading(true);
        try {
          const docRef = doc(db, 'offer_letters', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setOfferData({ ...offerData, ...docSnap.data() });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchDraft();
    }
  }, [id]);

  const [newResp, setNewResp] = useState('');
  const [newClause, setNewClause] = useState({ title: '', content: '' });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      
      const payload = {
        ...offerData,
        updatedAt: serverTimestamp(),
      };
      
      if (id) {
        const docRef = doc(db, 'offer_letters', id);
        await updateDoc(docRef, payload);
        console.log("Offer letter updated with ID: ", id);
      } else {
        payload.status = 'DRAFT';
        payload.createdAt = serverTimestamp();
        payload.offer_id = `DTV-OFR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const docRef = await addDoc(collection(db, 'offer_letters'), payload);
        console.log("Offer letter saved with ID: ", docRef.id);
      }
      
      // Navigate back to dashboard after save
      navigate('/offer-letter-studio');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to save offer letter. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const addResponsibility = () => {
    if (newResp.trim()) {
      setOfferData({
        ...offerData,
        responsibilities: [...offerData.responsibilities, newResp.trim()]
      });
      setNewResp('');
    }
  };

  const removeResponsibility = (idx: number) => {
    const newResps = [...offerData.responsibilities];
    newResps.splice(idx, 1);
    setOfferData({ ...offerData, responsibilities: newResps });
  };

  const toggleClause = (idx: number) => {
    const newClauses = [...offerData.clauses];
    newClauses[idx].enabled = !newClauses[idx].enabled;
    setOfferData({ ...offerData, clauses: newClauses });
  };

  const addClause = () => {
    if (newClause.title.trim() && newClause.content.trim()) {
      setOfferData({
        ...offerData,
        clauses: [
          ...offerData.clauses,
          { id: `custom_${Date.now()}`, title: newClause.title.trim(), content: newClause.content.trim(), enabled: true }
        ]
      });
      setNewClause({ title: '', content: '' });
    }
  };

  const removeClause = (idx: number) => {
    const newClauses = [...offerData.clauses];
    newClauses.splice(idx, 1);
    setOfferData({ ...offerData, clauses: newClauses });
  };

  const renderStepContent = () => {
    if (initialLoading) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    switch(currentStep) {
      case 0:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Legal Name *</label>
              <input 
                type="text" 
                value={offerData.candidate_details.name}
                onChange={(e) => setOfferData({...offerData, candidate_details: {...offerData.candidate_details, name: e.target.value}})}
                className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address *</label>
              <input 
                type="email" 
                value={offerData.candidate_details.email}
                onChange={(e) => setOfferData({...offerData, candidate_details: {...offerData.candidate_details, email: e.target.value}})}
                className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                placeholder="john@example.com"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
              <input 
                type="tel" 
                value={offerData.candidate_details.phone}
                onChange={(e) => setOfferData({...offerData, candidate_details: {...offerData.candidate_details, phone: e.target.value}})}
                className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                placeholder="+91 98765 43210"
              />
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Title / Designation *</label>
              <input 
                type="text" 
                value={offerData.position_details.designation}
                onChange={(e) => setOfferData({...offerData, position_details: {...offerData.position_details, designation: e.target.value}})}
                className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600" 
                placeholder="e.g. Senior AI Engineer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Employment Type</label>
                <select 
                  value={offerData.position_details.employment_type}
                  onChange={(e) => setOfferData({...offerData, position_details: {...offerData.position_details, employment_type: e.target.value}})}
                  className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option>Full Time</option>
                  <option>Part Time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work Mode</label>
                <select 
                  value={offerData.position_details.work_mode}
                  onChange={(e) => setOfferData({...offerData, position_details: {...offerData.position_details, work_mode: e.target.value}})}
                  className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Issue Date *</label>
                <input 
                  type="date" 
                  value={offerData.issue_date}
                  onChange={(e) => setOfferData({...offerData, issue_date: e.target.value})}
                  className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [color-scheme:dark]" 
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date of Joining *</label>
                <input 
                  type="date" 
                  value={offerData.position_details.joining_date}
                  onChange={(e) => setOfferData({...offerData, position_details: {...offerData.position_details, joining_date: e.target.value}})}
                  className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [color-scheme:dark]" 
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Salary Type</label>
                <select 
                  value={offerData.compensation_details.salary_type}
                  onChange={(e) => setOfferData({...offerData, compensation_details: {...offerData.compensation_details, salary_type: e.target.value}})}
                  className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option>Annual</option>
                  <option>Monthly</option>
                  <option>Stipend</option>
                  <option>Unpaid</option>
                  <option>Equity</option>
                </select>
              </div>
              {offerData.compensation_details.salary_type !== 'Unpaid' && offerData.compensation_details.salary_type !== 'Equity' && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Currency</label>
                  <select 
                    value={offerData.compensation_details.currency}
                    onChange={(e) => setOfferData({...offerData, compensation_details: {...offerData.compensation_details, currency: e.target.value}})}
                    className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </div>
              )}
            </div>
            {offerData.compensation_details.salary_type !== 'Unpaid' && offerData.compensation_details.salary_type !== 'Equity' && (
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Compensation Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{offerData.compensation_details.currency}</span>
                  <input 
                    type="number" 
                    value={offerData.compensation_details.amount}
                    onChange={(e) => setOfferData({...offerData, compensation_details: {...offerData.compensation_details, amount: e.target.value}})}
                    className="w-full bg-[#161920] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 font-mono text-lg" 
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="space-y-3">
              {offerData.responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5 group">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                  <p className="text-sm text-gray-300 flex-1">{resp}</p>
                  <button onClick={() => removeResponsibility(idx)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addResponsibility()}
                className="flex-1 bg-[#161920] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
                placeholder="Add a new responsibility..."
              />
              <button onClick={addResponsibility} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors">
                Add
              </button>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
             {offerData.clauses.map((clause, idx) => (
               <div key={clause.id} className={`p-4 rounded-xl border transition-all relative group ${clause.enabled ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#161920] border-white/5 opacity-60 hover:opacity-100'}`}>
                 <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => toggleClause(idx)}>
                   <h4 className={`font-semibold ${clause.enabled ? 'text-indigo-300' : 'text-gray-400'}`}>{clause.title}</h4>
                   <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${clause.enabled ? 'bg-indigo-500 text-white' : 'bg-white/10 text-transparent'}`}>
                     <Check className="w-3 h-3" />
                   </div>
                 </div>
                 <p className="text-sm text-gray-400 pr-8">{clause.content}</p>
                 {clause.id.startsWith('custom_') && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); removeClause(idx); }}
                     className="absolute bottom-4 right-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <XCircle className="w-4 h-4" />
                   </button>
                 )}
               </div>
             ))}

             <div className="mt-6 p-4 rounded-xl border border-white/10 bg-[#161920]">
               <h4 className="text-sm font-semibold text-white mb-3">Add Custom Term</h4>
               <div className="space-y-3">
                 <input 
                   type="text" 
                   value={newClause.title}
                   onChange={(e) => setNewClause({...newClause, title: e.target.value})}
                   className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
                   placeholder="Term Title (e.g. Non-Compete)"
                 />
                 <textarea 
                   value={newClause.content}
                   onChange={(e) => setNewClause({...newClause, content: e.target.value})}
                   className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
                   placeholder="Term Description..."
                   rows={3}
                 />
                 <button 
                   onClick={addClause}
                   disabled={!newClause.title.trim() || !newClause.content.trim()}
                   className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                 >
                   Add Term
                 </button>
               </div>
             </div>
          </motion.div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mt-6 -mb-10 -mx-10 relative overflow-hidden bg-[#0f1115]">
      
      {/* LEFT: Premium Editor */}
      <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col bg-[#0f1115] border-r border-white/10 z-10 ${showPreview ? 'w-[45%]' : 'w-full max-w-4xl mx-auto rounded-xl shadow-2xl'}`}>
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/offer-letter-studio')} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{id ? 'Edit Offer' : 'New Offer'}</h2>
              <p className="text-xs text-indigo-400 font-medium uppercase tracking-widest mt-0.5">Wizard</p>
            </div>
          </div>
          <div className="flex space-x-3">
             <button 
                onClick={handleSaveDraft}
                className="flex items-center px-4 py-2 text-sm font-semibold text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Draft</>}
              </button>
              <button className="relative group flex items-center px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <FileCheck2 className="w-4 h-4 mr-2" /> Generate
              </button>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="px-8 py-6 border-b border-white/5 bg-[#12141a]">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-[14px] w-full h-[2px] bg-white/5 -z-10"></div>
            {/* Active progress bar */}
            <motion.div 
              className="absolute left-0 top-[14px] h-[2px] bg-indigo-500 -z-10"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />

            {STEPS.map((step, idx) => (
              <button 
                key={step}
                onClick={() => setCurrentStep(idx)}
                className="flex flex-col items-center group relative z-0"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${idx < currentStep ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.8)]' : idx === currentStep ? 'bg-[#161920] border-2 border-indigo-500 text-indigo-400' : 'bg-[#161920] border-2 border-white/10 text-gray-600 group-hover:border-white/30'}`}>
                  {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold mt-2 transition-colors ${idx <= currentStep ? 'text-gray-300' : 'text-gray-600'}`}>{step}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
           <AnimatePresence mode="wait">
             <motion.div
               key={currentStep}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
               <h3 className="text-2xl font-black text-white mb-8 tracking-tight flex items-center">
                 <span className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-indigo-400 text-lg">{currentStep + 1}</span>
                 {STEPS[currentStep]}
               </h3>
               {renderStepContent()}
             </motion.div>
           </AnimatePresence>
        </div>

        {/* Wizard Footer */}
        <div className="p-6 border-t border-white/5 flex justify-between bg-[#12141a]">
          <button 
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white bg-transparent rounded-xl disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentStep === STEPS.length - 1}
            className="flex items-center px-6 py-2.5 text-sm font-bold text-black bg-white rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors shadow-lg shadow-white/10"
          >
            Continue <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      {/* RIGHT: Live Preview (Doc Render) */}
      {showPreview && (
        <div className="flex-1 bg-[#1a1d24] relative overflow-hidden flex flex-col items-center justify-start pt-10 pb-20 custom-scrollbar overflow-y-auto">
           {/* Document Shadow Context */}
           <div className="absolute inset-0 pointer-events-none" style={{
             background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 70%)'
           }}></div>
           
           <div className="w-full max-w-3xl flex justify-between items-center mb-6 px-4 relative z-10">
             <div className="flex items-center space-x-2">
               <Eye className="w-4 h-4 text-gray-500" />
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Document Preview</h3>
             </div>
             <div className="bg-[#12141a] border border-white/10 text-gray-400 text-xs px-3 py-1.5 rounded-lg flex items-center shadow-lg">
               <Sparkles className="w-3 h-3 mr-1.5 text-indigo-400" />
               Executive Template
             </div>
           </div>
           
           {/* Document Container */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.95, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
             className="relative z-10"
           >
             <LivePreview data={offerData} />
           </motion.div>
        </div>
      )}

    </div>
  );
};

export default OfferEditor;
