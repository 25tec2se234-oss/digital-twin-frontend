import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { QUIZ_QUESTIONS, DOMAIN_OPTIONS, TraitVector } from '../../config/quizConfig';
import { normalizeUserTraits } from '../../utils/matchingEngine';

const Cpu = (LucideIcons as any).Cpu;
const X = (LucideIcons as any).X;

interface OnboardingQuizProps {
  onComplete: () => void;
  onClose?: () => void;
}

const colorClasses: Record<string, string> = {
  blue: 'border-blue-500/50 hover:border-blue-500 bg-blue-500/10 text-blue-400',
  red: 'border-red-500/50 hover:border-red-500 bg-red-500/10 text-red-400',
  purple: 'border-purple-500/50 hover:border-purple-500 bg-purple-500/10 text-purple-400',
  cyan: 'border-cyan-500/50 hover:border-cyan-500 bg-cyan-500/10 text-cyan-400',
  orange: 'border-orange-500/50 hover:border-orange-500 bg-orange-500/10 text-orange-400',
  green: 'border-green-500/50 hover:border-green-500 bg-green-500/10 text-green-400',
  indigo: 'border-indigo-500/50 hover:border-indigo-500 bg-indigo-500/10 text-indigo-400',
  pink: 'border-pink-500/50 hover:border-pink-500 bg-pink-500/10 text-pink-400',
  yellow: 'border-yellow-500/50 hover:border-yellow-500 bg-yellow-500/10 text-yellow-400',
  emerald: 'border-emerald-500/50 hover:border-emerald-500 bg-emerald-500/10 text-emerald-400',
  amber: 'border-amber-500/50 hover:border-amber-500 bg-amber-500/10 text-amber-400',
  rose: 'border-rose-500/50 hover:border-rose-500 bg-rose-500/10 text-rose-400',
  slate: 'border-slate-500/50 hover:border-slate-500 bg-slate-500/10 text-slate-400'
};

const OnboardingQuiz: React.FC<OnboardingQuizProps> = ({ onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDomainStep, setIsDomainStep] = useState(false);
  
  const [accumulatedTraits, setAccumulatedTraits] = useState<TraitVector>({
    technical: 0, analytical: 0, creative: 0, peopleOriented: 0, entrepreneurial: 0, structured: 0
  });
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const handleOptionSelect = (weights: TraitVector) => {
    // Add weights
    setAccumulatedTraits(prev => ({
      technical: prev.technical + weights.technical,
      analytical: prev.analytical + weights.analytical,
      creative: prev.creative + weights.creative,
      peopleOriented: prev.peopleOriented + weights.peopleOriented,
      entrepreneurial: prev.entrepreneurial + weights.entrepreneurial,
      structured: prev.structured + weights.structured
    }));

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Finished all trait questions, move to domain question
      setIsDomainStep(true);
    }
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleFinishQuiz = () => {
    setIsAnalyzing(true);
    
    // Normalize traits to 0-10 scale
    const normalized = normalizeUserTraits(accumulatedTraits);
    
    // Save to localStorage
    localStorage.setItem('dtv_user_traits', JSON.stringify(normalized));
    localStorage.setItem('dtv_user_domains', JSON.stringify(selectedDomains));
    localStorage.setItem('dtv_explorer_quiz_completed', 'true');
    
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/90 backdrop-blur-xl">
      <div className="w-full max-w-4xl px-4">
        
        <AnimatePresence mode="wait">
          {!isAnalyzing ? (
            <motion.div
              key={isDomainStep ? 'domains' : currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              {/* Close Button */}
              {onClose && (
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors z-20"
                >
                  <X size={24} />
                </button>
              )}

              {/* Progress Bar */}
              <div className="absolute top-0 left-0 h-1 bg-gray-800 w-full z-10">
                <div 
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${(isDomainStep ? QUIZ_QUESTIONS.length + 1 : currentStep + 1) / (QUIZ_QUESTIONS.length + 1) * 100}%` }}
                ></div>
              </div>

              {!isDomainStep ? (
                <>
                  <div className="text-center mb-10">
                    <span className="text-orange-500 font-bold tracking-widest uppercase text-xs mb-3 block">
                      Career DNA Quiz • Question {currentStep + 1} of {QUIZ_QUESTIONS.length}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                      {QUIZ_QUESTIONS[currentStep].title}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUIZ_QUESTIONS[currentStep].options.map((option) => {
                      const IconComponent = (LucideIcons as any)[option.iconName] || (LucideIcons as any).HelpCircle;
                      
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleOptionSelect(option.weights)}
                          className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left hover:-translate-y-1 ${colorClasses[option.color] || colorClasses.blue}`}
                        >
                          <div className="flex-shrink-0">
                            <IconComponent size={32} />
                          </div>
                          <span className="font-bold text-[15px] leading-snug">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-10">
                    <span className="text-orange-500 font-bold tracking-widest uppercase text-xs mb-3 block">
                      Final Step
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2">
                      Which fields interest you the most?
                    </h2>
                    <p className="text-gray-400">Select any domains you are actively curious about (Optional).</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                    {DOMAIN_OPTIONS.map((domain) => {
                      const isSelected = selectedDomains.includes(domain);
                      return (
                        <button
                          key={domain}
                          onClick={() => toggleDomain(domain)}
                          className={`p-4 rounded-xl border text-sm font-bold transition-all ${
                            isSelected 
                              ? 'bg-orange-500 text-black border-orange-500' 
                              : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600'
                          }`}
                        >
                          {domain}
                        </button>
                      )
                    })}
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={handleFinishQuiz}
                      className="px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-full font-bold transition-colors w-full md:w-auto"
                    >
                      Generate My DNA Profile
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <Cpu size={48} className="text-orange-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-white mb-3">Synthesizing Trait Vector...</h2>
                <p className="text-gray-400 max-w-md mx-auto">Matching your DNA profile against 6000+ career paths using multi-dimensional cosine similarity scoring.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
};

export default OnboardingQuiz;
