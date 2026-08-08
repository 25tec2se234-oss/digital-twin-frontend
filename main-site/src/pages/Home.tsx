import React, { useEffect, useState } from 'react';
import AIAnalysisPreviewCard from '../components/AIAnalysisPreviewCard';
import AnalyzerModal from '../components/AnalyzerModal';

const Home: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Re-initialize UX engine after component mounts to bind hover/magnetic effects
    if (typeof window !== 'undefined' && (window as any).initUXEngine) {
      setTimeout(() => {
        (window as any).initUXEngine();
      }, 100);
    }
  }, []);

  return (
    <>
      <main id="page-main" className="page active">
        <section id="hero" className="sec">
            <div className="blobs">
                <div className="b"
                    style={{ width: "650px", height: "650px", top: "-180px", left: "-200px", background: "rgba(42,125,225,.16)", animationDelay: "0s" }}>
                </div>
                <div className="b"
                    style={{ width: "550px", height: "550px", bottom: "-120px", right: "-160px", background: "rgba(232,140,42,.13)", animationDelay: "5s" }}>
                </div>
            </div>
            <div className="hero-shell">
                <div className="hero-copy rv">
                    <div className="badge"><span className="bdot"></span>India's First AI Career Simulation Platform ·
                        Eco-Novators</div>
                    <h1 className="hero-h fluid-text">Don't Guess Your Future<br /><span className="serif amb">Simulate It.</span>
                    </h1>
                    <p className="hero-sub">Digital Twin Verse uses a multi-agent AI system to model your skills, interests,
                        and goals — mapping real-world career paths so you decide with confidence, not guesswork.</p>
                    <div className="hero-btns">

                        <a href="#ai-section" className="btn btn-out">Talk to Career AI</a>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-out"
                            style={{ borderColor: "rgba(167,139,250,.4)", color: "var(--purple,#a78bfa)", cursor: "pointer" }}>🧠
                            Analyze My Profile</button>
                    </div>

                </div>
            </div>
        </section>

        {/*  TICKER  */}
        <div className="ticker">
            <div className="tt">
                <div className="ti">AI Career Simulation<span className="sp">◆</span></div>
                <div className="ti">Skill Gap Analysis<span className="sp">◆</span></div>
                <div className="ti">Roadmap Planning<span className="sp">◆</span></div>
                <div className="ti">Market Alerts<span className="sp">◆</span></div>
                <div className="ti">Internship Guidance<span className="sp">◆</span></div>
                <div className="ti">1800+ Career Paths<span className="sp">◆</span></div>
                <div className="ti">Voice + Chat AI<span className="sp">◆</span></div>
                <div className="ti">Eco-Novators · 2026<span className="sp">◆</span></div>
                <div className="ti">AI Career Simulation<span className="sp">◆</span></div>
                <div className="ti">Skill Gap Analysis<span className="sp">◆</span></div>
                <div className="ti">Roadmap Planning<span className="sp">◆</span></div>
                <div className="ti">Market Alerts<span className="sp">◆</span></div>
                <div className="ti">Internship Guidance<span className="sp">◆</span></div>
                <div className="ti">1800+ Career Paths<span className="sp">◆</span></div>
                <div className="ti">Voice + Chat AI<span className="sp">◆</span></div>
                <div className="ti">Eco-Novators · 2026<span className="sp">◆</span></div>
            </div>
        </div>

        {/*  VISUAL STORIES  */}
        <section id="stories" className="sec">
            <div className="wrap">
                <div className="rv center-head">
                    <p className="lbl">Student Journeys</p>
                    <h2 className="ttl">See The Energy Behind<br /><span className="serif">Real Career Growth</span></h2>
                    <p className="desc">Interactive visuals that represent how students explore options, learn skills, and
                        become placement-ready using Digital Twin Verse.</p>
                </div>
                <div className="story-grid">
                    <article className="story-card rv d1">
                        <div className="story-media">
                            <img loading="lazy" decoding="async" width="600" height="400"
                                src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=600&fm=webp&q=80"
                                alt="Students collaborating in a modern classroom"
                                 />
                        </div>
                        <div className="story-overlay">
                            <span className="story-tag">Explore</span>
                            <h3 className="story-title">Compare Career Paths With Confidence</h3>
                            <p className="story-copy">Students can switch streams, inspect salary trends, and test what-if
                                scenarios in minutes.</p>
                        </div>
                    </article>
                    <article className="story-card rv d2">
                        <div className="story-media">
                            <img loading="lazy" decoding="async" width="600" height="400"
                                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&fm=webp&q=80"
                                alt="Mentor guiding students during a planning session"
                                 />
                        </div>
                        <div className="story-overlay">
                            <span className="story-tag">Plan</span>
                            <h3 className="story-title">AI Roadmaps That Feel Personal</h3>
                            <p className="story-copy">The AI mentor creates step-by-step goals based on current skills,
                                interests, and role demand.</p>
                        </div>
                    </article>
                    <article className="story-card rv d3">
                        <div className="story-media">
                            <img loading="lazy" decoding="async" width="600" height="400"
                                src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&fm=webp&q=80"
                                alt="Students preparing together with digital tools"
                                 />
                        </div>
                        <div className="story-overlay">
                            <span className="story-tag">Launch</span>
                            <h3 className="story-title">Track Progress And Get Job Ready</h3>
                            <p className="story-copy">From skill checklists to AI interview guidance, every milestone is
                                visible and measurable.</p>
                        </div>
                    </article>
                </div>
            </div>
        </section>

        {/*  PROBLEM  */}
        <section id="prob" className="sec surf">
            <div className="wrap grid2">
                <div className="rv">
                    <p className="lbl">The Problem</p>
                    <h2 className="ttl">Career Planning is Broken.<br /><span className="serif">Here's why it matters.</span></h2>
                    <p className="desc">Millions of students make costly, life-altering career decisions every year with
                        zero personalised guidance. The consequences compound over decades.</p>
                </div>
                <div className="pcg rv d1">
                    <a href="/problem/years-wasted" className="pc" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="pc-ic">⏳</div>
                        <h4>Years Wasted</h4>
                        <p>2–4 years in the wrong course before realising the mismatch — too late to pivot easily.</p>
                        <span className="pc-hint">Read full dedicated breakdown &amp; news &rarr;</span>
                    </a>
                    <a href="/problem/mounting-stress" className="pc" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="pc-ic">😰</div>
                        <h4>Mounting Stress</h4>
                        <p>Family pressure, peer comparison, and zero clarity create a widespread career-anxiety crisis.</p>
                        <span className="pc-hint">Read full dedicated breakdown &amp; news &rarr;</span>
                    </a>
                    <a href="/problem/no-personalisation" className="pc" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="pc-ic">🎯</div>
                        <h4>No Personalisation</h4>
                        <p>Generic counsellors give generic advice. Your unique profile, strengths and potential are ignored.</p>
                        <span className="pc-hint">Read full dedicated breakdown &amp; news &rarr;</span>
                    </a>
                    <a href="/problem/missed-earnings" className="pc" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="pc-ic">💸</div>
                        <h4>Missed Earnings</h4>
                        <p>Wrong decisions at the right age directly reduce lifetime earnings and career satisfaction.</p>
                        <span className="pc-hint">Read full dedicated breakdown &amp; news &rarr;</span>
                    </a>
                </div>
            </div>
        </section>

        {/*  HOW IT WORKS  */}
        <section id="analyzer-promo" className="sec surf2" style={{ background: "var(--surf2,#101f35)" }}>
            <div className="wrap">
                <div className="rv analyzer-grid">
                    <div>
                        <p className="lbl">New Feature</p>
                        <h2 className="ttl">Upload Your Achievements.<br /><span className="ttl-serif amb">Get Your
                                Roadmap.</span></h2>
                        <p className="desc">Our AI-powered Achievement Analyzer reads your resume, certificates, CGPA, and
                            skills — then generates a personalised, step-by-step career roadmap with a confidence score,
                            skill gap analysis, and internship suggestions.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem", margin: "1.5rem 0 2rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: ".7rem", fontSize: ".84rem", color: "var(--mu)" }}>
                                <span
                                    style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(167,139,250,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0", fontSize: ".75rem" }}>📤</span>
                                <span>Drag &amp; drop your resume, certs and projects</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: ".7rem", fontSize: ".84rem", color: "var(--mu)" }}>
                                <span
                                    style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(79,142,247,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0", fontSize: ".75rem" }}>🧠</span>
                                <span>AI analyses your profile and generates a personalized dashboard</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: ".7rem", fontSize: ".84rem", color: "var(--mu)" }}>
                                <span
                                    style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(34,211,153,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0", fontSize: ".75rem" }}>📄</span>
                                <span>Download a full colorful PDF report with your roadmap</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-amb"
                            style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", textDecoration: "none", cursor: "pointer" }}>🚀
                            Launch Achievement Analyzer →</button>
                    </div>
                    
                    <AIAnalysisPreviewCard onOpenModal={() => setIsModalOpen(true)} />
                </div>
            </div>
        </section>

        {/* Analyzer Full Modal */}
        <AnalyzerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
    </>
  );
};

export default Home;

