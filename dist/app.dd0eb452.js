        /* ═══════════════════════════════════════════════════════
   CONFIGURATION
   - Uses secure backend API route: /api/messages
   - Set demoMode: true for local demo-only behavior
═══════════════════════════════════════════════════════ */
        var CFG = {
            aiApiEndpoint: '/api/messages',
            demoMode: false,
            formspreeId: 'mvzdpwyv',
            siteUrl: 'https://digital-twin-app.onrender.com/',
            shareText: 'Check out Digital Twin for Students by Eco-Novators — AI career simulation platform!'
        };

        /* ═══════════════════════════════════════════════════════════════
           GLOBAL DATA STORE — structured, backend-ready JSON
           All user interactions are captured here and synced to localStorage
        ═══════════════════════════════════════════════════════════════ */
        var APP_DATA = {
            userData: { // Populated on sign-up / session restore
                name: '',
                email: '',
                phone: '',
                role: '',
                city: '',
                signedUpAt: null,
                loggedIn: false,
                loggedInAt: null
            },
            careerChoices: [], // Array: { id, title, skillsPct, notes, savedAt }
            AIResponses: [], // Array: { mode, tone, userMsg, aiReply, timestamp }
            reviewData: null, // Single review object
            sessionMeta: {
                firstVisit: null,
                lastVisit: null,
                pagesViewed: 0
            },
            studentProfile: {
                type: '',
                classLevel: '',
                uniLevel: '',
                stream: '',
                updatedAt: null
            },
            studentTools: {
                nextStep: '',
                items: {
                    achieve: [],
                    achieved: [],
                    develop: [],
                    utilize: [],
                    revise: [],
                    remember: [],
                    weak: [],
                    strong: [],
                    futuristic: []
                },
                sessions: [],
                routine: [],
                syllabus: [],
                chapters: [],
                exams: [],
                grades: [],
                timeTracker: {
                    targetMinutes: 600,
                    entries: []
                }
            }
        };

        var loginGateActive = false;

        /* — Persist / Load ——————————————————————————————————————————— */
        function syncData() {
            try {
                sessionStorage.setItem('dt_appdata_v3', JSON.stringify(APP_DATA));
            } catch (e) {
                logClientError('syncData failed', e);
            }
        }

        function loadData() {
            try {
                var raw = sessionStorage.getItem('dt_appdata_v3');
                if (raw) {
                    var d = JSON.parse(raw);
                    Object.assign(APP_DATA, d);
                    migrateData();
                }
            } catch (e) {
                logClientError('loadData failed', e);
            }
        }

        function migrateData() {
            try {
                var updated = false;
                var now = new Date().toISOString();
                var toolKeys = Array.isArray(STUDENT_TOOL_KEYS) ? STUDENT_TOOL_KEYS : [
                    'achieve',
                    'achieved',
                    'develop',
                    'utilize',
                    'revise',
                    'remember',
                    'weak',
                    'strong',
                    'futuristic'
                ];

                function toString(value) {
                    if (typeof value === 'string') return value;
                    if (value == null) return '';
                    return String(value);
                }

                function toStringArray(value) {
                    if (Array.isArray(value)) {
                        return value.map(toString).filter(function(item) {
                            return item !== '';
                        });
                    }
                    if (value == null) return [];
                    return [toString(value)].filter(function(item) {
                        return item !== '';
                    });
                }

                function normalizeAchieveItem(item) {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                        if (typeof item.text === 'string') return item.text;
                        if (typeof item.title === 'string') return item.title;
                        if (typeof item.name === 'string') return item.name;
                        if (typeof item.value === 'string') return item.value;
                    }
                    return toString(item);
                }

                function normalizeAchievedItem(item) {
                    if (typeof item === 'string') {
                        return {
                            text: item,
                            at: now
                        };
                    }
                    if (item && typeof item === 'object') {
                        var text = (typeof item.text === 'string') ? item.text :
                            (typeof item.title === 'string') ? item.title :
                            (typeof item.name === 'string') ? item.name :
                            (typeof item.value === 'string') ? item.value : '';
                        if (!text) text = toString(item);
                        var at = (typeof item.at === 'string' && item.at) ? item.at :
                            (typeof item.date === 'string') ? item.date :
                            (typeof item.completedAt === 'string') ? item.completedAt : now;
                        return {
                            text: text,
                            at: at
                        };
                    }
                    return {
                        text: toString(item),
                        at: now
                    };
                }

                if (!APP_DATA.userData || typeof APP_DATA.userData !== 'object') {
                    APP_DATA.userData = {
                        name: '',
                        email: '',
                        phone: '',
                        role: '',
                        city: '',
                        signedUpAt: null
                    };
                    updated = true;
                }

                if (APP_DATA.user && typeof APP_DATA.user === 'object') {
                    if (!APP_DATA.userData.name && typeof APP_DATA.user.name === 'string') {
                        APP_DATA.userData.name = APP_DATA.user.name;
                        updated = true;
                    }
                    delete APP_DATA.user;
                    updated = true;
                }

                if (!APP_DATA.studentTools || typeof APP_DATA.studentTools !== 'object') {
                    APP_DATA.studentTools = {
                        nextStep: '',
                        items: {},
                        sessions: [],
                        routine: [],
                        syllabus: [],
                        chapters: [],
                        exams: [],
                        grades: [],
                        timeTracker: {
                            targetMinutes: 600,
                            entries: []
                        }
                    };
                    updated = true;
                }

                if (!APP_DATA.studentTools.items || typeof APP_DATA.studentTools.items !== 'object') {
                    APP_DATA.studentTools.items = {};
                    updated = true;
                }

                if (APP_DATA.nextStep != null) {
                    var legacyNext = toString(APP_DATA.nextStep);
                    if (!APP_DATA.studentTools.nextStep && legacyNext) {
                        APP_DATA.studentTools.nextStep = legacyNext;
                        updated = true;
                    }
                    delete APP_DATA.nextStep;
                    updated = true;
                }

                if (APP_DATA.goals != null) {
                    var legacyGoals = toStringArray(APP_DATA.goals);
                    if (!Array.isArray(APP_DATA.studentTools.items.achieve)) {
                        APP_DATA.studentTools.items.achieve = [];
                        updated = true;
                    }
                    if (legacyGoals.length) {
                        if (!APP_DATA.studentTools.items.achieve.length) {
                            APP_DATA.studentTools.items.achieve = legacyGoals.slice();
                            updated = true;
                        } else {
                            var goalSet = {};
                            APP_DATA.studentTools.items.achieve.forEach(function(item) {
                                var text = normalizeAchieveItem(item);
                                if (text) goalSet[text.toLowerCase()] = true;
                            });
                            legacyGoals.forEach(function(item) {
                                var text = normalizeAchieveItem(item);
                                if (text && !goalSet[text.toLowerCase()]) {
                                    APP_DATA.studentTools.items.achieve.push(text);
                                    goalSet[text.toLowerCase()] = true;
                                    updated = true;
                                }
                            });
                        }
                    }
                    delete APP_DATA.goals;
                    updated = true;
                }

                if (APP_DATA.achievements != null) {
                    var legacyAchievements = Array.isArray(APP_DATA.achievements) ? APP_DATA.achievements : [APP_DATA.achievements];
                    if (!Array.isArray(APP_DATA.studentTools.items.achieved)) {
                        APP_DATA.studentTools.items.achieved = [];
                        updated = true;
                    }
                    if (legacyAchievements.length) {
                        if (!APP_DATA.studentTools.items.achieved.length) {
                            APP_DATA.studentTools.items.achieved = legacyAchievements.map(normalizeAchievedItem);
                            updated = true;
                        } else {
                            var achievedSet = {};
                            APP_DATA.studentTools.items.achieved.forEach(function(item) {
                                var text = (typeof item === 'string') ? item : (item && item.text);
                                if (text) achievedSet[text.toLowerCase()] = true;
                            });
                            legacyAchievements.forEach(function(item) {
                                var normalized = normalizeAchievedItem(item);
                                var text = normalized.text;
                                if (text && !achievedSet[text.toLowerCase()]) {
                                    APP_DATA.studentTools.items.achieved.push(normalized);
                                    achievedSet[text.toLowerCase()] = true;
                                    updated = true;
                                }
                            });
                        }
                    }
                    delete APP_DATA.achievements;
                    updated = true;
                }

                toolKeys.forEach(function(key) {
                    if (!Array.isArray(APP_DATA.studentTools.items[key])) {
                        APP_DATA.studentTools.items[key] = [];
                        updated = true;
                    }
                });

                if (Array.isArray(APP_DATA.studentTools.items.achieve)) {
                    var normalizedAchieve = [];
                    var achieveChanged = false;
                    APP_DATA.studentTools.items.achieve.forEach(function(item) {
                        var text = normalizeAchieveItem(item);
                        if (text !== item) achieveChanged = true;
                        normalizedAchieve.push(text);
                    });
                    if (achieveChanged) {
                        APP_DATA.studentTools.items.achieve = normalizedAchieve;
                        updated = true;
                    }
                }

                if (Array.isArray(APP_DATA.studentTools.items.achieved)) {
                    var normalizedAchieved = [];
                    var achievedChanged = false;
                    APP_DATA.studentTools.items.achieved.forEach(function(item) {
                        if (item && typeof item === 'object' && typeof item.text === 'string' && typeof item.at === 'string') {
                            normalizedAchieved.push(item);
                        } else {
                            normalizedAchieved.push(normalizeAchievedItem(item));
                            achievedChanged = true;
                        }
                    });
                    if (achievedChanged) {
                        APP_DATA.studentTools.items.achieved = normalizedAchieved;
                        updated = true;
                    }
                }

                if (!Array.isArray(APP_DATA.studentTools.sessions)) {
                    APP_DATA.studentTools.sessions = [];
                    updated = true;
                }
                if (!Array.isArray(APP_DATA.studentTools.routine)) {
                    APP_DATA.studentTools.routine = [];
                    updated = true;
                }
                if (!Array.isArray(APP_DATA.studentTools.syllabus)) {
                    APP_DATA.studentTools.syllabus = [];
                    updated = true;
                }
                if (!Array.isArray(APP_DATA.studentTools.chapters)) {
                    APP_DATA.studentTools.chapters = [];
                    updated = true;
                }
                if (!Array.isArray(APP_DATA.studentTools.exams)) {
                    APP_DATA.studentTools.exams = [];
                    updated = true;
                }
                if (!Array.isArray(APP_DATA.studentTools.grades)) {
                    APP_DATA.studentTools.grades = [];
                    updated = true;
                }

                if (!APP_DATA.studentTools.timeTracker || typeof APP_DATA.studentTools.timeTracker !== 'object') {
                    APP_DATA.studentTools.timeTracker = {
                        targetMinutes: 600,
                        entries: []
                    };
                    updated = true;
                }
                if (!Array.isArray(APP_DATA.studentTools.timeTracker.entries)) {
                    APP_DATA.studentTools.timeTracker.entries = [];
                    updated = true;
                }
                if (typeof APP_DATA.studentTools.timeTracker.targetMinutes !== 'number') {
                    var tgt = parseInt(APP_DATA.studentTools.timeTracker.targetMinutes, 10);
                    APP_DATA.studentTools.timeTracker.targetMinutes = Number.isFinite(tgt) ? tgt : 600;
                    updated = true;
                }

                if (typeof APP_DATA.studentTools.nextStep !== 'string') {
                    APP_DATA.studentTools.nextStep = '';
                    updated = true;
                }

                if (updated) {
                    syncData();
                }
            } catch (e) {
                logClientError('migrateData failed', e);
            }
        }

        function getLSD() {
            try {
                return JSON.parse(localStorage.getItem('dt_v2') || '{}');
            } catch (e) {
                return {};
            }
        }

        function saveLSD(d) {
            try {
                localStorage.setItem('dt_v2', JSON.stringify(d));
            } catch (e) {
                logClientError('saveLSD failed', e);
            }
        }

        function logClientError(context, err) {
            try {
                var details = (err && err.message) ? err.message : err;
                console.warn('[DigitalTwin]', context, details);
            } catch (_ignored) {}
        }

        function escapeHTML(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatBotMessage(text) {
            return escapeHTML(text)
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }

        /* ═══ CAREER DATA — 24 Careers ═══════════════════════════════ */
        var CAREERS = [{
                id: 'swe',
                title: 'Software Engineer',
                icon: '💻',
                stream: 'Technology',
                salary: '₹6–45 LPA',
                demand: 'Very High',
                dp: 95,
                time: '3–6 months',
                desc: 'Design, develop and maintain software applications for platforms worldwide.',
                skills: [{
                    n: 'Data Structures & Algorithms',
                    l: 'Core'
                }, {
                    n: 'Web/App Development',
                    l: 'Core'
                }, {
                    n: 'System Design',
                    l: 'Advanced'
                }, {
                    n: 'Version Control (Git)',
                    l: 'Essential'
                }, {
                    n: 'Database Management',
                    l: 'Important'
                }],
                roadmap: ['Learn Python or Java — build 2 small projects', 'Master DSA on LeetCode (medium level)', 'Build 3 portfolio projects with GitHub', 'Apply for software internships', 'Target product companies for placement'],
                bestFor: 'Logical problem-solvers who love building products',
                match: {
                    'Technology': 30,
                    'Mathematics & Sciences': 25,
                    'Computer Science & Tech': 40,
                    'Business': 5
                }
            },
            {
                id: 'ds',
                title: 'Data Scientist',
                icon: '📊',
                stream: 'Technology',
                salary: '₹8–40 LPA',
                demand: 'Very High',
                dp: 92,
                time: '4–8 months',
                desc: 'Extract actionable insights from complex datasets to drive business decisions.',
                skills: [{
                    n: 'Python / R Programming',
                    l: 'Core'
                }, {
                    n: 'Machine Learning',
                    l: 'Core'
                }, {
                    n: 'Statistics & Probability',
                    l: 'Core'
                }, {
                    n: 'SQL & Databases',
                    l: 'Important'
                }, {
                    n: 'Data Visualisation',
                    l: 'Important'
                }],
                roadmap: ['Master Python + NumPy + Pandas', 'Learn ML with Scikit-Learn', 'Practise on Kaggle competitions', 'Build 3 end-to-end projects', 'Get IBM/Google Data Science certification'],
                bestFor: 'Analytical minds who love patterns and statistics',
                match: {
                    'Technology': 25,
                    'Mathematics & Sciences': 40,
                    'Research': 20,
                    'Business': 15
                }
            },
            {
                id: 'aiml',
                title: 'AI/ML Engineer',
                icon: '🤖',
                stream: 'Technology',
                salary: '₹12–50 LPA',
                demand: 'Extremely High',
                dp: 97,
                time: '6–12 months',
                desc: 'Build and deploy artificial intelligence and machine learning models at scale.',
                skills: [{
                    n: 'Deep Learning (PyTorch/TF)',
                    l: 'Core'
                }, {
                    n: 'Mathematics (Linear Algebra)',
                    l: 'Core'
                }, {
                    n: 'MLOps & Deployment',
                    l: 'Advanced'
                }, {
                    n: 'Large Language Models',
                    l: 'Advanced'
                }, {
                    n: 'Cloud Platforms (AWS/GCP)',
                    l: 'Important'
                }],
                roadmap: ['Strong Python + Math foundation', 'Master deep learning frameworks', 'Build NLP/Computer Vision projects', 'Contribute to open-source AI projects', 'Target AI-first companies'],
                bestFor: 'Those fascinated by intelligence and automation',
                match: {
                    'Technology': 35,
                    'Mathematics & Sciences': 35,
                    'Research': 20,
                    'Computer Science & Tech': 10
                }
            },
            {
                id: 'pm',
                title: 'Product Manager',
                icon: '🎯',
                stream: 'Technology',
                salary: '₹12–60 LPA',
                demand: 'High',
                dp: 85,
                time: '2–3 years exp.',
                desc: 'Define product strategy and lead cross-functional teams to build user-loved products.',
                skills: [{
                    n: 'Product Strategy',
                    l: 'Core'
                }, {
                    n: 'User Research & UX',
                    l: 'Core'
                }, {
                    n: 'Data Analysis',
                    l: 'Important'
                }, {
                    n: 'Agile/Scrum',
                    l: 'Essential'
                }, {
                    n: 'Stakeholder Communication',
                    l: 'Core'
                }],
                roadmap: ['Build a technical foundation (coding basics)', 'Read PM books — Inspired, Continuous Discovery', 'Intern as Business Analyst or UX researcher', 'Get APM role at a startup', 'Build portfolio of product case studies'],
                bestFor: 'Strategic thinkers who love user problems',
                match: {
                    'Business': 30,
                    'Technology': 25,
                    'Design': 20,
                    'Law & Policy': 10,
                    'Healthcare': 15
                }
            },
            {
                id: 'cyber',
                title: 'Cybersecurity Analyst',
                icon: '🔒',
                stream: 'Technology',
                salary: '₹6–30 LPA',
                demand: 'High',
                dp: 88,
                time: '4–8 months',
                desc: 'Protect organisations from digital threats, vulnerabilities, and cyberattacks.',
                skills: [{
                    n: 'Network Security',
                    l: 'Core'
                }, {
                    n: 'Ethical Hacking',
                    l: 'Core'
                }, {
                    n: 'SIEM Tools',
                    l: 'Important'
                }, {
                    n: 'Python Scripting',
                    l: 'Important'
                }, {
                    n: 'Compliance Frameworks',
                    l: 'Advanced'
                }],
                roadmap: ['Learn networking fundamentals', 'Get CEH or CompTIA Security+', 'Practise on TryHackMe/HackTheBox', 'Build home lab for penetration testing', 'Apply for SOC Analyst roles'],
                bestFor: 'Detail-oriented people who think like attackers',
                match: {
                    'Technology': 40,
                    'Mathematics & Sciences': 20,
                    'Law & Policy': 15,
                    'Engineering': 25
                }
            },
            {
                id: 'cloud',
                title: 'Cloud Architect',
                icon: '☁',
                stream: 'Technology',
                salary: '₹15–70 LPA',
                demand: 'Very High',
                dp: 91,
                time: '1–2 years',
                desc: 'Design and manage scalable, secure cloud infrastructure for businesses.',
                skills: [{
                    n: 'AWS / Azure / GCP',
                    l: 'Core'
                }, {
                    n: 'Infrastructure as Code',
                    l: 'Core'
                }, {
                    n: 'Kubernetes & Docker',
                    l: 'Advanced'
                }, {
                    n: 'Networking & Security',
                    l: 'Important'
                }, {
                    n: 'Cost Optimisation',
                    l: 'Advanced'
                }],
                roadmap: ['Get AWS Cloud Practitioner cert', 'Master EC2, S3, Lambda, RDS', 'Learn Terraform and Kubernetes', 'Get AWS Solutions Architect cert', 'Target cloud engineering roles'],
                bestFor: 'Systems thinkers who love scalability problems',
                match: {
                    'Technology': 40,
                    'Engineering': 30,
                    'Mathematics & Sciences': 20,
                    'Business': 10
                }
            },
            {
                id: 'uxd',
                title: 'UI/UX Designer',
                icon: '🎨',
                stream: 'Creative',
                salary: '₹5–25 LPA',
                demand: 'High',
                dp: 83,
                time: '3–6 months',
                desc: 'Design intuitive, beautiful digital experiences that users love.',
                skills: [{
                    n: 'Figma / Adobe XD',
                    l: 'Core'
                }, {
                    n: 'User Research',
                    l: 'Core'
                }, {
                    n: 'Prototyping & Wireframing',
                    l: 'Core'
                }, {
                    n: 'Interaction Design',
                    l: 'Advanced'
                }, {
                    n: 'Usability Testing',
                    l: 'Important'
                }],
                roadmap: ['Learn Figma fundamentals', 'Study design principles (typography, colour)', 'Redesign 3 existing apps as case studies', 'Build Behance/Dribbble portfolio', 'Apply for junior UX roles'],
                bestFor: 'Empathetic creatives who think in systems',
                match: {
                    'Creative': 40,
                    'Technology': 25,
                    'Business': 20,
                    'Arts & Humanities': 15
                }
            },
            {
                id: 'mkt',
                title: 'Digital Marketer',
                icon: '📱',
                stream: 'Business',
                salary: '₹4–20 LPA',
                demand: 'High',
                dp: 80,
                time: '2–4 months',
                desc: 'Plan and execute digital campaigns to drive growth, leads, and brand awareness.',
                skills: [{
                    n: 'SEO & SEM',
                    l: 'Core'
                }, {
                    n: 'Social Media Strategy',
                    l: 'Core'
                }, {
                    n: 'Analytics (GA4)',
                    l: 'Important'
                }, {
                    n: 'Content Marketing',
                    l: 'Core'
                }, {
                    n: 'Paid Advertising',
                    l: 'Advanced'
                }],
                roadmap: ['Learn Google Analytics & SEO basics', 'Run campaigns on your own project', 'Get Google/HubSpot Marketing cert', 'Build case studies showing ROI', 'Join a digital agency or startup'],
                bestFor: 'Creative communicators who love data-driven results',
                match: {
                    'Business': 35,
                    'Creative': 30,
                    'Arts & Humanities': 20,
                    'Technology': 15
                }
            },
            {
                id: 'fa',
                title: 'Financial Analyst',
                icon: '📈',
                stream: 'Business',
                salary: '₹6–28 LPA',
                demand: 'High',
                dp: 82,
                time: '6–12 months',
                desc: 'Analyse financial data and guide investment and business decisions.',
                skills: [{
                    n: 'Financial Modelling',
                    l: 'Core'
                }, {
                    n: 'Excel & PowerBI',
                    l: 'Core'
                }, {
                    n: 'Accounting Principles',
                    l: 'Important'
                }, {
                    n: 'Valuation Techniques',
                    l: 'Advanced'
                }, {
                    n: 'Python for Finance',
                    l: 'Advanced'
                }],
                roadmap: ['Master financial statement analysis', 'Build Excel modelling skills', 'Get CFA Level 1 certification', 'Intern at a financial firm', 'Build portfolio of valuation projects'],
                bestFor: 'Numbers-focused people who love business strategy',
                match: {
                    'Business': 40,
                    'Mathematics & Sciences': 30,
                    'Commerce & Economics': 25,
                    'Law & Policy': 5
                }
            },
            {
                id: 'ca',
                title: 'Chartered Accountant',
                icon: '🧾',
                stream: 'Business',
                salary: '₹7–40 LPA',
                demand: 'Stable',
                dp: 75,
                time: '3–5 years',
                desc: 'Expert financial professional providing audit, tax, and advisory services.',
                skills: [{
                    n: 'Accounting Standards',
                    l: 'Core'
                }, {
                    n: 'Tax Law (GST/Income Tax)',
                    l: 'Core'
                }, {
                    n: 'Audit & Assurance',
                    l: 'Core'
                }, {
                    n: 'Financial Reporting',
                    l: 'Advanced'
                }, {
                    n: 'Corporate Law',
                    l: 'Important'
                }],
                roadmap: ['Clear CA Foundation exam', 'Complete CA Intermediate', '3-year articleship at CA firm', 'Clear CA Final exam', 'Build specialisation (Tax/Audit/Advisory)'],
                bestFor: 'Detail-oriented, disciplined individuals who value precision',
                match: {
                    'Business': 40,
                    'Commerce & Economics': 35,
                    'Law & Policy': 20,
                    'Mathematics & Sciences': 5
                }
            },
            {
                id: 'ib',
                title: 'Investment Banker',
                icon: '🏦',
                stream: 'Business',
                salary: '₹12–80 LPA',
                demand: 'High',
                dp: 78,
                time: '2–4 years',
                desc: 'Raise capital, execute mergers, and provide financial advisory to corporations.',
                skills: [{
                    n: 'Financial Modelling (DCF)',
                    l: 'Core'
                }, {
                    n: 'Valuation & M&A',
                    l: 'Core'
                }, {
                    n: 'Pitch Deck Creation',
                    l: 'Important'
                }, {
                    n: 'Market Research',
                    l: 'Advanced'
                }, {
                    n: 'Networking & Communication',
                    l: 'Core'
                }],
                roadmap: ['Top MBA or finance degree', 'Excel in financial modelling courses', 'Intern at a bulge-bracket bank', 'CFA Level 1 is a strong differentiator', 'Network actively on LinkedIn'],
                bestFor: 'Ambitious, high-energy individuals who thrive under pressure',
                match: {
                    'Business': 40,
                    'Commerce & Economics': 30,
                    'Law & Policy': 20,
                    'Mathematics & Sciences': 10
                }
            },
            {
                id: 'doc',
                title: 'Medical Doctor',
                icon: '🩺',
                stream: 'Healthcare',
                salary: '₹8–80 LPA',
                demand: 'High',
                dp: 88,
                time: '5.5+ years (MBBS)',
                desc: 'Diagnose and treat patients, improve health outcomes across communities.',
                skills: [{
                    n: 'Clinical Knowledge',
                    l: 'Core'
                }, {
                    n: 'Patient Communication',
                    l: 'Core'
                }, {
                    n: 'Diagnostic Skills',
                    l: 'Core'
                }, {
                    n: 'Emergency Medicine',
                    l: 'Advanced'
                }, {
                    n: 'Research & Evidence-Based Medicine',
                    l: 'Advanced'
                }],
                roadmap: ['Clear NEET for MBBS admission', 'Complete 5.5-year MBBS degree', '1-year mandatory internship', 'Clear PG entrance (NEET-PG)', 'Specialise in high-demand field'],
                bestFor: 'Empathetic, dedicated individuals with strong science base',
                match: {
                    'Healthcare': 40,
                    'Biology & Medicine': 40,
                    'Mathematics & Sciences': 15,
                    'Research': 5
                }
            },
            {
                id: 'bio',
                title: 'Biotech Researcher',
                icon: '🔬',
                stream: 'Healthcare',
                salary: '₹5–25 LPA',
                demand: 'Growing',
                dp: 72,
                time: '4–6 years',
                desc: 'Conduct research to develop drugs, vaccines, and biological solutions.',
                skills: [{
                    n: 'Molecular Biology',
                    l: 'Core'
                }, {
                    n: 'Biochemistry',
                    l: 'Core'
                }, {
                    n: 'Lab Techniques (PCR/ELISA)',
                    l: 'Core'
                }, {
                    n: 'Bioinformatics',
                    l: 'Advanced'
                }, {
                    n: 'Research Methodology',
                    l: 'Important'
                }],
                roadmap: ['BSc in Biotechnology/Life Sciences', 'Master specific lab skills', 'Publish research or assist in projects', 'MSc or PhD for research careers', 'Target pharma, CSIR, or biotech startups'],
                bestFor: 'Curious minds who want to solve biological problems',
                match: {
                    'Healthcare': 30,
                    'Biology & Medicine': 40,
                    'Research': 20,
                    'Mathematics & Sciences': 10
                }
            },
            {
                id: 'ce',
                title: 'Civil Engineer',
                icon: '🏗',
                stream: 'Engineering',
                salary: '₹4–25 LPA',
                demand: 'Stable',
                dp: 70,
                time: '4 years (B.Tech)',
                desc: 'Design and oversee construction of infrastructure — buildings, roads, bridges.',
                skills: [{
                    n: 'Structural Analysis',
                    l: 'Core'
                }, {
                    n: 'AutoCAD / Revit',
                    l: 'Core'
                }, {
                    n: 'Project Management',
                    l: 'Important'
                }, {
                    n: 'Construction Materials',
                    l: 'Core'
                }, {
                    n: 'Surveying',
                    l: 'Important'
                }],
                roadmap: ['B.Tech Civil Engineering', 'GATE for PSU jobs (optional)', 'Internship at construction company', 'Get licensed as Junior Engineer', 'Specialise in structural/geotechnical/env.'],
                bestFor: 'Practical builders who want visible, lasting impact',
                match: {
                    'Engineering': 40,
                    'Mathematics & Sciences': 30,
                    'Business': 15,
                    'Law & Policy': 15
                }
            },
            {
                id: 'me',
                title: 'Mechanical Engineer',
                icon: '⚙',
                stream: 'Engineering',
                salary: '₹4–22 LPA',
                demand: 'Stable',
                dp: 68,
                time: '4 years (B.Tech)',
                desc: 'Design, analyse and manufacture mechanical systems and machinery.',
                skills: [{
                    n: 'CAD/CAM (SolidWorks)',
                    l: 'Core'
                }, {
                    n: 'Thermodynamics',
                    l: 'Core'
                }, {
                    n: 'Manufacturing Processes',
                    l: 'Core'
                }, {
                    n: 'FEA Analysis (ANSYS)',
                    l: 'Advanced'
                }, {
                    n: 'Industrial Automation',
                    l: 'Growing'
                }],
                roadmap: ['Strong mechanics and maths foundation', 'Master SolidWorks/CATIA', 'Internship at manufacturing firm', 'GATE for PSU or M.Tech', 'Pivot to automation/robotics for growth'],
                bestFor: 'Hands-on problem-solvers who love machines',
                match: {
                    'Engineering': 45,
                    'Mathematics & Sciences': 30,
                    'Technology': 15,
                    'Business': 10
                }
            },
            {
                id: 'ee',
                title: 'Electrical Engineer',
                icon: '⚡',
                stream: 'Engineering',
                salary: '₹4–22 LPA',
                demand: 'Stable',
                dp: 72,
                time: '4 years (B.Tech)',
                desc: 'Design and develop electrical systems, circuits, power grids and electronics.',
                skills: [{
                    n: 'Circuit Design',
                    l: 'Core'
                }, {
                    n: 'Power Systems',
                    l: 'Core'
                }, {
                    n: 'MATLAB/Simulink',
                    l: 'Important'
                }, {
                    n: 'Embedded Systems',
                    l: 'Advanced'
                }, {
                    n: 'Renewable Energy',
                    l: 'Growing'
                }],
                roadmap: ['Strong physics and maths base', 'Master MATLAB and circuit simulators', 'GATE exam preparation', 'Internship at power company or startup', 'Pivot to IoT/EV/Renewables for high growth'],
                bestFor: 'Technical minds with passion for energy and electronics',
                match: {
                    'Engineering': 45,
                    'Mathematics & Sciences': 35,
                    'Technology': 15,
                    'Business': 5
                }
            },
            {
                id: 'law',
                title: 'Lawyer',
                icon: '⚖',
                stream: 'Law & Policy',
                salary: '₹4–50 LPA',
                demand: 'Stable',
                dp: 74,
                time: '5 years (LLB)',
                desc: 'Provide legal counsel, represent clients, and navigate the justice system.',
                skills: [{
                    n: 'Legal Research',
                    l: 'Core'
                }, {
                    n: 'Contract Law',
                    l: 'Core'
                }, {
                    n: 'Courtroom Advocacy',
                    l: 'Advanced'
                }, {
                    n: 'Corporate Law',
                    l: 'High Demand'
                }, {
                    n: 'Communication & Writing',
                    l: 'Core'
                }],
                roadmap: ['5-year BA LLB or 3-year LLB after graduation', 'Moot court and internship at law firm', 'Enroll with Bar Council', 'Specialise in Corporate/IP/Tech law (high demand)', 'Build reputation through consistent practice'],
                bestFor: 'Analytical communicators with a passion for justice',
                match: {
                    'Law & Policy': 40,
                    'Arts & Humanities': 25,
                    'Business': 20,
                    'Commerce & Economics': 15
                }
            },
            {
                id: 'hrm',
                title: 'HR Manager',
                icon: '🤝',
                stream: 'Business',
                salary: '₹4–20 LPA',
                demand: 'Stable',
                dp: 73,
                time: '2–3 years exp.',
                desc: 'Attract, develop and retain talent, and shape organisational culture.',
                skills: [{
                    n: 'Talent Acquisition',
                    l: 'Core'
                }, {
                    n: 'HRIS Systems',
                    l: 'Important'
                }, {
                    n: 'Employee Relations',
                    l: 'Core'
                }, {
                    n: 'Performance Management',
                    l: 'Advanced'
                }, {
                    n: 'Labour Law',
                    l: 'Important'
                }],
                roadmap: ['MBA HR or BBA + specialisation', 'Internship in HR department', 'Get SHRM or HRCI certification', 'Build expertise in HRBP or TA', 'Move into strategic HR or Head of People'],
                bestFor: 'People-oriented individuals who love building teams',
                match: {
                    'Business': 30,
                    'Arts & Humanities': 25,
                    'Law & Policy': 20,
                    'Psychology': 25
                }
            },
            {
                id: 'gd',
                title: 'Game Developer',
                icon: '🎮',
                stream: 'Technology',
                salary: '₹5–30 LPA',
                demand: 'Growing',
                dp: 78,
                time: '6–12 months',
                desc: 'Create interactive games for mobile, PC, and console platforms.',
                skills: [{
                    n: 'Unity / Unreal Engine',
                    l: 'Core'
                }, {
                    n: 'C# / C++',
                    l: 'Core'
                }, {
                    n: '3D Modelling Basics',
                    l: 'Useful'
                }, {
                    n: 'Physics & Collision Systems',
                    l: 'Advanced'
                }, {
                    n: 'Game Design Principles',
                    l: 'Important'
                }],
                roadmap: ['Learn Unity + C# fundamentals', 'Build 3 small game prototypes', 'Publish on itch.io or Play Store', 'Learn Unreal for AAA trajectory', 'Apply to indie studios or mobile game companies'],
                bestFor: 'Creative coders who grew up playing games',
                match: {
                    'Technology': 35,
                    'Creative': 35,
                    'Arts & Humanities': 15,
                    'Mathematics & Sciences': 15
                }
            },
            {
                id: 'da2',
                title: 'Data Analyst',
                icon: '🔍',
                stream: 'Technology',
                salary: '₹4–18 LPA',
                demand: 'Very High',
                dp: 87,
                time: '2–4 months',
                desc: 'Collect, process and interpret data to help businesses make informed decisions.',
                skills: [{
                    n: 'SQL',
                    l: 'Core'
                }, {
                    n: 'Excel / Google Sheets',
                    l: 'Core'
                }, {
                    n: 'Tableau / PowerBI',
                    l: 'Important'
                }, {
                    n: 'Python (Pandas)',
                    l: 'Important'
                }, {
                    n: 'Statistics Fundamentals',
                    l: 'Core'
                }],
                roadmap: ['Master SQL — solve 50+ queries', 'Learn Excel and PowerBI dashboards', 'Build 3 analysis projects with real datasets', 'Google Data Analytics cert (free)', 'Apply for junior analyst roles aggressively'],
                bestFor: 'Systematic thinkers who find answers in numbers',
                match: {
                    'Technology': 25,
                    'Mathematics & Sciences': 30,
                    'Business': 25,
                    'Commerce & Economics': 20
                }
            },
            {
                id: 'cc',
                title: 'Content Creator',
                icon: '🎬',
                stream: 'Creative',
                salary: '₹2–20 LPA',
                demand: 'High',
                dp: 80,
                time: '3–6 months',
                desc: 'Create engaging content across platforms — YouTube, Instagram, LinkedIn, blogs.',
                skills: [{
                    n: 'Video Editing (Premiere/CapCut)',
                    l: 'Core'
                }, {
                    n: 'Scriptwriting & Storytelling',
                    l: 'Core'
                }, {
                    n: 'SEO & Platform Algorithms',
                    l: 'Important'
                }, {
                    n: 'Graphic Design (Canva)',
                    l: 'Useful'
                }, {
                    n: 'Audience Analytics',
                    l: 'Advanced'
                }],
                roadmap: ['Pick one platform and one niche', 'Post consistently for 90 days', 'Learn video editing fundamentals', 'Monetise via brand deals + digital products', 'Build email list for owned audience'],
                bestFor: 'Creative communicators who love sharing knowledge',
                match: {
                    'Creative': 40,
                    'Arts & Humanities': 30,
                    'Business': 20,
                    'Technology': 10
                }
            },
            {
                id: 'devops',
                title: 'DevOps Engineer',
                icon: '🔧',
                stream: 'Technology',
                salary: '₹8–40 LPA',
                demand: 'Very High',
                dp: 89,
                time: '6–10 months',
                desc: 'Bridge development and operations — automate CI/CD pipelines and manage infrastructure.',
                skills: [{
                    n: 'Docker & Kubernetes',
                    l: 'Core'
                }, {
                    n: 'CI/CD Pipelines',
                    l: 'Core'
                }, {
                    n: 'Linux Administration',
                    l: 'Core'
                }, {
                    n: 'Terraform (IaC)',
                    l: 'Advanced'
                }, {
                    n: 'Monitoring (Grafana/Prometheus)',
                    l: 'Important'
                }],
                roadmap: ['Learn Linux + Bash scripting', 'Master Docker and Kubernetes', 'Set up a CI/CD pipeline project', 'Get AWS + Kubernetes (CKA) certs', 'Target DevOps/SRE roles at tech companies'],
                bestFor: 'Problem-solvers who love automation and reliability',
                match: {
                    'Technology': 45,
                    'Engineering': 30,
                    'Mathematics & Sciences': 15,
                    'Business': 10
                }
            },
            {
                id: 'ent',
                title: 'Entrepreneur',
                icon: '🚀',
                stream: 'Business',
                salary: 'Variable (₹0 to ∞)',
                demand: 'Always',
                dp: 100,
                time: 'Your own timeline',
                desc: 'Build products and companies that solve real problems and create value.',
                skills: [{
                    n: 'Problem Identification',
                    l: 'Core'
                }, {
                    n: 'Product Thinking',
                    l: 'Core'
                }, {
                    n: 'Financial Literacy',
                    l: 'Important'
                }, {
                    n: 'Sales & Marketing',
                    l: 'Core'
                }, {
                    n: 'Leadership & Resilience',
                    l: 'Essential'
                }],
                roadmap: ['Identify a painful problem you understand deeply', 'Validate with 10 real customer conversations', 'Build an MVP with minimum features', 'Find first 10 paying customers', 'Iterate based on feedback — repeat'],
                bestFor: 'Self-driven risk-takers who want to create, not just execute',
                match: {
                    'Business': 30,
                    'Technology': 20,
                    'Creative': 20,
                    'Arts & Humanities': 10,
                    'Law & Policy': 10,
                    'Engineering': 10
                }
            },
            {
                id: 'psy',
                title: 'Psychologist / Counsellor',
                icon: '🧠',
                stream: 'Healthcare',
                salary: '₹3–20 LPA',
                demand: 'Growing Fast',
                dp: 77,
                time: '5–6 years',
                desc: 'Support mental health and well-being through therapy, research, and counselling.',
                skills: [{
                    n: 'Psychological Assessment',
                    l: 'Core'
                }, {
                    n: 'Counselling Techniques (CBT)',
                    l: 'Core'
                }, {
                    n: 'Empathy & Active Listening',
                    l: 'Essential'
                }, {
                    n: 'Research Methodology',
                    l: 'Advanced'
                }, {
                    n: 'Ethics in Practice',
                    l: 'Core'
                }],
                roadmap: ['BA/BSc Psychology degree', 'MA/MSc Psychology (mandatory)', 'Internship at hospital or NGO', 'RCI registration for clinical practice', 'Specialise in corporate wellness or child psychology'],
                bestFor: 'Deeply empathetic people who want to help others heal',
                match: {
                    'Healthcare': 30,
                    'Arts & Humanities': 30,
                    'Law & Policy': 10,
                    'Business': 15,
                    'Research': 15
                }
            }
        ];

        /* ═══ PREDICTION SCORE ENGINE ════════════════════════════════ */
        function calcPredictionScore(careerId, interests) {
            var c = CAREERS.find(function(x) {
                return x.id === careerId;
            });
            if (!c) return {
                score: 70,
                match: 'Moderate',
                badges: []
            };
            var data = getLSD();
            var saved = data[careerId] || {
                skills: {},
                notes: ''
            };
            var skillDone = Object.values(saved.skills).filter(Boolean).length;
            var skillPct = c.skills.length ? skillDone / c.skills.length : 0;

            // Base score from demand
            var base = c.dp * 0.3;
            // Skill progress bonus
            var skillBonus = skillPct * 30;
            // Interest alignment bonus
            var interestBonus = 0;
            if (interests && c.match) {
                interests.forEach(function(int) {
                    if (c.match[int]) interestBonus += c.match[int] * 0.4;
                });
                interestBonus = Math.min(interestBonus, 30);
            } else {
                interestBonus = 10;
            }
            // Notes bonus (shows commitment)
            var notesBonus = (saved.notes && saved.notes.trim().length > 10) ? 5 : 0;
            var raw = Math.round(base + skillBonus + interestBonus + notesBonus);
            var score = Math.min(99, Math.max(42, raw));
            var matchLabel = score >= 80 ? 'Strong Match' : score >= 60 ? 'Good Match' : 'Possible Match';
            var badges = [];
            if (c.dp >= 90) badges.push({
                label: 'High Demand',
                cls: 'high'
            });
            if (skillPct >= 0.6) badges.push({
                label: 'Skills Ready',
                cls: 'high'
            });
            else if (skillPct > 0) badges.push({
                label: 'In Progress',
                cls: 'mid'
            });
            if (interestBonus >= 15) badges.push({
                label: 'Interest Aligned',
                cls: 'high'
            });
            if (score < 55) badges.push({
                label: 'Needs Prep',
                cls: 'low'
            });
            return {
                score: score,
                match: matchLabel,
                badges: badges
            };
        }

        /* ═══ AI SUGGESTIONS ENGINE ═════════════════════════════════ */
        var SUGGESTIONS = {
            swe: ['Learn System Design on Educative.io (free tier available)', 'Build a full-stack project using React + Node.js + PostgreSQL', 'Solve 3 LeetCode medium problems daily for 30 days', 'Get AWS Cloud Practitioner cert to stand out', 'Follow "Coding with Mosh" on YouTube for practical skills'],
            ds: ['Complete Andrew Ng\'s ML Specialisation on Coursera (free audit)', 'Join Kaggle and complete 2 competitions', 'Learn SQL deeply — Mode Analytics SQL tutorial is excellent', 'Build a data portfolio with GitHub README for each project', 'Read "Storytelling with Data" by Cole Nussbaumer Knaflic'],
            aiml: ['Study "Attention Is All You Need" paper (Transformer architecture)', 'Build a fine-tuned LLM project using HuggingFace', 'Learn MLOps: MLflow, DVC, and model deployment on FastAPI', 'Follow Andrej Karpathy on YouTube for deep AI intuition', 'Contribute to open-source ML projects on GitHub'],
            pm: ['Read "Inspired" by Marty Cagan — the PM bible', 'Complete Google\'s free PM certification on Coursera', 'Build a product teardown portfolio (3 apps, 2 pages each)', 'Shadow a PM at any startup (reach out on LinkedIn)', 'Learn SQL basics — data-savvy PMs get 30% higher offers'],
            default: ['Build a portfolio with 3 real-world projects on GitHub', 'Join LinkedIn and connect with 5 professionals in your target field', 'Get one relevant certification (Google, Microsoft, or Coursera)', 'Follow industry newsletters and blogs for market awareness', 'Start networking 6 months before your target role']
        };

        function getAISuggestions(careerId) {
            return SUGGESTIONS[careerId] || SUGGESTIONS.default;
        }

        var FEATURE_DETAILS = {
            simulation: {
                bullets: ['Compare multiple career paths', 'Check salary and demand impact', 'Test education or skill trade-offs']
            },
            gap: {
                bullets: ['Detect missing skills quickly', 'Prioritise by market demand', 'Get targeted learning steps']
            },
            whatif: {
                bullets: ['Swap degree, city, or skills', 'Instant outcome projection', 'Confidence scoring for choices']
            },
            roadmap: {
                bullets: ['Milestone-based planning', 'Skill sequencing by difficulty', 'Progress checkpoints and review']
            },
            alerts: {
                bullets: ['Real-time trend updates', 'Emerging role notifications', 'Skill obsolescence warnings']
            },
            internship: {
                bullets: ['Curated internship matches', 'Application readiness checklist', 'Interview preparation guidance']
            }
        };

        function initFeatureShowcase() {
            var cards = Array.prototype.slice.call(document.querySelectorAll('.fc[data-feature]'));
            var detail = document.getElementById('feature-detail');
            if (!cards.length || !detail) return;

            function render(card, shouldScroll) {
                var key = card.getAttribute('data-feature');
                var data = FEATURE_DETAILS[key] || {};
                var iconEl = card.querySelector('.fc-ic');
                var titleEl = card.querySelector('h3');
                var descEl = card.querySelector('p');
                var icon = iconEl ? iconEl.textContent.trim() : '+';
                var title = titleEl ? titleEl.textContent.trim() : (data.title || 'Feature');
                var desc = descEl ? descEl.textContent.trim() : (data.desc || '');
                var pills = (data.bullets || []).map(function(item) {
                    return '<span class="fd-pill">' + escapeHTML(item) + '</span>';
                }).join('');

                detail.innerHTML =
                    '<div class="fd-icon">' + escapeHTML(icon) + '</div>' +
                    '<div class="fd-body">' +
                    '<h3>' + escapeHTML(title) + '</h3>' +
                    '<p>' + escapeHTML(desc) + '</p>' +
                    '<div class="fd-pills">' + pills + '</div>' +
                    '</div>';
                detail.classList.add('open');

                cards.forEach(function(c) {
                    var selected = c === card;
                    c.classList.toggle('selected', selected);
                    c.setAttribute('aria-pressed', selected ? 'true' : 'false');
                });

                if (shouldScroll && window.innerWidth < 900) {
                    detail.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }

            cards.forEach(function(card) {
                card.addEventListener('click', function() {
                    render(card, true);
                });
                card.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        render(card, true);
                    }
                });
            });

            render(cards[0], false);
        }

        /* ═══ DASHBOARD RENDER ═══════════════════════════════════════ */
        function renderCareers(filter) {
            var grid = document.getElementById('career-grid');
            if (!grid) return;
            var list = filter === 'all' ? CAREERS : CAREERS.filter(function(c) {
                return c.stream === filter;
            });
            grid.innerHTML = list.map(function(c) {
                return '<div class="ccard" id="cc-' + c.id + '" onclick="openCareer(\'' + c.id + '\')">' +
                    '<div class="ccard-ic">' + c.icon + '</div>' +
                    '<div class="ccard-title">' + c.title + '</div>' +
                    '<div class="ccard-stream">' + c.stream + '</div>' +
                    '<div class="ccard-salary">' + c.salary + '</div>' +
                    '<div class="demand-bar"><div class="demand-fill" style="width:' + c.dp + '%"></div></div>' +
                    '<div class="demand-lbl">Demand: ' + c.demand + '</div>' +
                    '</div>';
            }).join('');
            updateOverallProgress();
        }

        function filterCareer(el, stream) {
            document.querySelectorAll('.df').forEach(function(d) {
                d.classList.remove('on');
            });
            el.classList.add('on');
            renderCareers(stream);
            document.getElementById('career-detail').classList.remove('open');
            document.getElementById('career-detail').innerHTML = '';
        }

        /* ═══ OVERALL PROGRESS ═══════════════════════════════════════ */
        function updateOverallProgress() {
            var data = getLSD();
            var careersExplored = Object.keys(data).length;
            var totalSkills = 0,
                doneSkills = 0,
                notesCount = 0;
            CAREERS.forEach(function(c) {
                if (data[c.id]) {
                    totalSkills += c.skills.length;
                    doneSkills += Object.values(data[c.id].skills || {}).filter(Boolean).length;
                    if (data[c.id].notes && data[c.id].notes.trim().length > 0) notesCount++;
                }
            });
            var pct = totalSkills > 0 ? Math.round(doneSkills / totalSkills * 100) : 0;
            var ovN = document.getElementById('ov-careers');
            var ovS = document.getElementById('ov-skills');
            var ovNo = document.getElementById('ov-notes');
            var ovF = document.getElementById('ov-fill');
            var ovP = document.getElementById('ov-pct');
            if (ovN) ovN.textContent = careersExplored;
            if (ovS) ovS.textContent = doneSkills;
            if (ovNo) ovNo.textContent = notesCount;
            if (ovF) ovF.style.width = pct + '%';
            if (ovP) ovP.textContent = pct + '%';
        }

        /* ═══ CAREER DETAIL WITH PREDICTION + SUGGESTIONS ═══════════ */
        function openCareer(id) {
            var c = CAREERS.find(function(x) {
                return x.id === id;
            });
            if (!c) return;
            document.querySelectorAll('.ccard').forEach(function(el) {
                el.classList.remove('selected');
            });
            var ccEl = document.getElementById('cc-' + id);
            if (ccEl) ccEl.classList.add('selected');

            var data = getLSD();
            var saved = data[id] || {
                skills: {},
                notes: ''
            };
            var pct = c.skills.length > 0 ?
                Math.round(Object.values(saved.skills).filter(Boolean).length / c.skills.length * 100) :
                0;

            // Prediction score
            var pred = calcPredictionScore(id, APP_DATA.userData.interests || []);
            var predBadgesHtml = pred.badges.map(function(b) {
                return '<span class="pred-badge ' + b.cls + '">' + escapeHTML(b.label) + '</span>';
            }).join('');
            var circ = 2 * Math.PI * 28;
            var offset = circ - (pred.score / 100 * circ);

            var safeTitle = escapeHTML(c.title);
            var safeDesc = escapeHTML(c.desc);
            var safeSalary = escapeHTML(c.salary);
            var safeDemand = escapeHTML(c.demand);
            var safeTime = escapeHTML(c.time);
            var safeStream = escapeHTML(c.stream);
            var safeBestFor = escapeHTML(c.bestFor);

            // Suggestions
            var sugs = getAISuggestions(id);
            var sugHtml = sugs.map(function(s) {
                return '<div class="sug-item">' + escapeHTML(s) + '</div>';
            }).join('');

            var skillsHtml = c.skills.map(function(s, i) {
                var done = saved.skills['s' + i] === true;
                return '<div class="skill-item">' +
                    '<div class="skill-cb ' + (done ? 'done' : '') + '" onclick="togSkill(\'' + id + '\',\'s' + i + '\',this)">' + (done ? '✓' : '') + '</div>' +
                    '<div class="skill-name ' + (done ? 'done' : '') + '">' + escapeHTML(s.n) + '</div>' +
                    '<span class="skill-badge">' + escapeHTML(s.l) + '</span>' +
                    '</div>';
            }).join('');

            var rmHtml = c.roadmap.map(function(r, i) {
                return '<div class="rm-step"><div class="rm-num">' + (i + 1) + '</div><div class="rm-txt">' + escapeHTML(r) + '</div></div>';
            }).join('');

            var detail = document.getElementById('career-detail');
            detail.innerHTML =
                // — Top bar —
                '<div class="cd-top">' +
                '<div class="cd-info"><h2>' + c.icon + ' ' + safeTitle + '</h2><p>' + safeDesc + '</p>' +
                '<div class="cd-meta"><span class="meta-tag">' + safeSalary + '</span>' +
                '<span class="meta-tag">' + safeDemand + ' Demand</span>' +
                '<span class="meta-tag">Entry: ' + safeTime + '</span>' +
                '<span class="meta-tag">' + safeStream + '</span></div></div>' +
                '<div style="display:flex;flex-direction:column;gap:.6rem;align-items:flex-end;">' +
                '<button class="cd-close" onclick="closeCareer()">✕ Close</button>' +
                '<button class="dl-report-btn" id="dl-btn-' + id + '" onclick="downloadReport(\'' + id + '\')"><span class="dl-icon">⬇ Download Report</span><span class="spin"></span></button>' +
                '</div></div>'
                // — Prediction Score card —
                +
                '<div class="pred-card">' +
                '<div class="pred-ring">' +
                '<svg width="72" height="72" viewBox="0 0 72 72"><circle class="bg-c" cx="36" cy="36" r="28" stroke-dasharray="' + circ + '" stroke-dashoffset="0"/>' +
                '<circle class="fg-c" cx="36" cy="36" r="28" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" id="pred-arc-' + id + '"/></svg>' +
                '<div class="pred-pct" id="pred-pct-' + id + '">' + pred.score + '%</div>' +
                '</div>' +
                '<div class="pred-info"><h4>AI Career Prediction Score</h4>' +
                '<p>' + pred.match + ' based on market demand, your skill progress, and profile alignment.</p>' +
                '<div class="pred-badges">' + predBadgesHtml + '</div></div></div>'
                // — Progress bar —
                +
                '<div class="progress-section">' +
                '<div class="prog-label"><span>Skills Progress</span><span id="pct-' + id + '">' + pct + '%</span></div>' +
                '<div class="prog-bar"><div class="prog-fill" id="pf-' + id + '" style="width:' + pct + '%"></div></div>' +
                '</div>'
                // — Body —
                +
                '<div class="cd-body">'
                // Left: skills + notes
                +
                '<div class="cd-section"><h3>Skills to Master</h3>' + skillsHtml +
                '<div class="notes-area"><label>Your Notes &amp; Remarks</label>' +
                '<textarea class="ft" id="notes-' + id + '" rows="3" placeholder="Write progress notes, targets, or plans here…"></textarea>' +
                '<button class="save-note-btn" onclick="saveNote(\'' + id + '\')">💾 Save Notes</button></div>'
                // AI Suggestions
                +
                '<div class="ai-sug-panel"><h4>🤖 AI Suggestions for You</h4><div class="sug-items">' + sugHtml + '</div></div>' +
                '</div>'
                // Right: roadmap + best for
                +
                '<div class="cd-section"><h3>Career Roadmap</h3><div class="roadmap-steps">' + rmHtml + '</div>' +
                '<div style="margin-top:1.5rem;padding:1rem;background:rgba(232,140,42,.07);border:1px solid rgba(232,140,42,.18);border-radius:10px;">' +
                '<div style="font-size:.78rem;font-weight:700;color:var(--amb);margin-bottom:.4rem;">💡 Best Suited For</div>' +
                '<div style="font-size:.82rem;color:var(--mu);">' + safeBestFor + '</div>' +
                '<div style="margin-top:.9rem;"><button class="btn btn-amb btn-sm" style="font-size:.76rem;padding:.48rem 1rem;" onclick="askAICareer(\'' + c.title + '\')">Ask AI for Detailed Plan</button></div>' +
                '</div></div>' +
                '</div>';

            detail.classList.add('open');

            var notesInput = document.getElementById('notes-' + id);
            if (notesInput) notesInput.value = saved.notes || '';

            // Animate prediction arc
            setTimeout(function() {
                var arc = document.getElementById('pred-arc-' + id);
                if (arc) arc.style.strokeDashoffset = offset;
            }, 200);

            // Track career choice in APP_DATA
            var already = APP_DATA.careerChoices.findIndex(function(x) {
                return x.id === id;
            });
            var choice = {
                id: id,
                title: c.title,
                skillsPct: pct,
                predScore: pred.score,
                savedAt: new Date().toISOString()
            };
            if (already >= 0) APP_DATA.careerChoices[already] = choice;
            else APP_DATA.careerChoices.push(choice);
            syncData();

            setTimeout(function() {
                detail.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }

        function closeCareer() {
            var detail = document.getElementById('career-detail');
            detail.classList.remove('open');
            detail.innerHTML = '';
            document.querySelectorAll('.ccard').forEach(function(el) {
                el.classList.remove('selected');
            });
        }

        function togSkill(careerId, skillKey, el) {
            var data = getLSD();
            if (!data[careerId]) data[careerId] = {
                skills: {},
                notes: ''
            };
            var newVal = !data[careerId].skills[skillKey];
            data[careerId].skills[skillKey] = newVal;
            saveLSD(data);
            el.classList.toggle('done', newVal);
            el.textContent = newVal ? '✓' : '';
            var nameEl = el.nextElementSibling;
            if (nameEl) nameEl.classList.toggle('done', newVal);
            var c = CAREERS.find(function(x) {
                return x.id === careerId;
            });
            if (c) {
                var done = Object.values(data[careerId].skills).filter(Boolean).length;
                var pct = Math.round(done / c.skills.length * 100);
                var pfEl = document.getElementById('pf-' + careerId);
                var pctEl = document.getElementById('pct-' + careerId);
                if (pfEl) pfEl.style.width = pct + '%';
                if (pctEl) pctEl.textContent = pct + '%';
                // Update prediction arc live
                var pred = calcPredictionScore(careerId, APP_DATA.userData.interests || []);
                var circ = 2 * Math.PI * 28;
                var arc = document.getElementById('pred-arc-' + careerId);
                var pctEl2 = document.getElementById('pred-pct-' + careerId);
                if (arc) arc.style.strokeDashoffset = circ - (pred.score / 100 * circ);
                if (pctEl2) pctEl2.textContent = pred.score + '%';
            }
            updateOverallProgress();
            showToast('✅', newVal ? 'Skill marked as learned!' : 'Skill unchecked.');
        }

        function saveNote(careerId) {
            var data = getLSD();
            if (!data[careerId]) data[careerId] = {
                skills: {},
                notes: ''
            };
            var noteEl = document.getElementById('notes-' + careerId);
            if (noteEl) {
                data[careerId].notes = noteEl.value;
                saveLSD(data);
                // Update APP_DATA
                var idx = APP_DATA.careerChoices.findIndex(function(x) {
                    return x.id === careerId;
                });
                if (idx >= 0) APP_DATA.careerChoices[idx].notes = noteEl.value;
                syncData();
                showToast('💾', 'Notes saved successfully!');
            }
        }

        /* ═══ PDF REPORT GENERATOR ═══════════════════════════════════ */
        async function downloadReport(careerId) {
            if (!checkPremiumAccess('PDF Download')) return;
            var btn = document.getElementById('dl-btn-' + careerId);
            if (btn) {
                btn.classList.add('loading');
                btn.disabled = true;
            }

            var c = CAREERS.find(function(x) {
                return x.id === careerId;
            });
            if (!c) {
                if (btn) {
                    btn.classList.remove('loading');
                    btn.disabled = false;
                }
                return;
            }

            var data = getLSD();
            var saved = data[careerId] || {
                skills: {},
                notes: ''
            };
            var pred = calcPredictionScore(careerId, APP_DATA.userData.interests || []);
            var sugs = getAISuggestions(careerId);
            var doneSk = c.skills.filter(function(s, i) {
                return saved.skills['s' + i];
            });
            var pendSk = c.skills.filter(function(s, i) {
                return !saved.skills['s' + i];
            });
            var pct = c.skills.length ? Math.round(doneSk.length / c.skills.length * 100) : 0;

            var now = new Date();
            var dateStr = now.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            try {
                var jsPDFLib = await ensureJsPDFLoaded().catch(function() {
                    return null;
                });
                if (jsPDFLib) {
                    var doc = new jsPDFLib({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    var pw = 210,
                        ml = 18,
                        mr = 18,
                        cw = pw - ml - mr;
                    var y = 20;

                    // Header background
                    doc.setFillColor(7, 17, 30);
                    doc.rect(0, 0, pw, 38, 'F');
                    doc.setTextColor(232, 140, 42);
                    doc.setFontSize(17);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Digital Twin for Students', ml, y);
                    doc.setFontSize(9);
                    doc.setTextColor(194, 208, 224);
                    doc.text('Career Report  |  Eco-Novators  |  digital-twin-app.onrender.com', ml, y + 7);
                    doc.setFontSize(8);
                    doc.setTextColor(122, 143, 168);
                    doc.text('Generated: ' + dateStr, pw - mr, y + 7, {
                        align: 'right'
                    });
                    y = 48;

                    // Career title block
                    doc.setFillColor(16, 31, 53);
                    doc.roundedRect(ml, y - 5, cw, 22, 3, 3, 'F');
                    doc.setFontSize(15);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(232, 240, 248);
                    doc.text(c.title, ml + 6, y + 6);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(122, 143, 168);
                    doc.text(c.stream + '  |  ' + c.salary + '  |  ' + c.demand + ' Demand', ml + 6, y + 13);
                    y += 28;

                    // Prediction score
                    doc.setFillColor(232, 140, 42, 0.12);
                    doc.roundedRect(ml, y, cw * 0.48, 22, 3, 3, 'F');
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(232, 140, 42);
                    doc.text('AI PREDICTION SCORE', ml + 4, y + 7);
                    doc.setFontSize(20);
                    doc.setTextColor(232, 140, 42);
                    doc.text(pred.score + '%', ml + 4, y + 18);
                    doc.setFontSize(8);
                    doc.setTextColor(122, 143, 168);
                    doc.setFont('helvetica', 'normal');
                    doc.text(pred.match, ml + cw * 0.48 / 2 + 4, y + 18, {
                        align: 'right'
                    });

                    // Skills progress
                    doc.setFillColor(12, 26, 46);
                    doc.roundedRect(ml + cw * 0.52, y, cw * 0.48, 22, 3, 3, 'F');
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(91, 163, 245);
                    doc.text('SKILLS PROGRESS', ml + cw * 0.52 + 4, y + 7);
                    doc.setFontSize(20);
                    doc.setTextColor(91, 163, 245);
                    doc.text(pct + '%', ml + cw * 0.52 + 4, y + 18);
                    doc.setFontSize(8);
                    doc.setTextColor(122, 143, 168);
                    doc.setFont('helvetica', 'normal');
                    doc.text(doneSk.length + '/' + c.skills.length + ' skills', ml + cw - 4, y + 18, {
                        align: 'right'
                    });
                    y += 32;

                    // Career description
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(194, 208, 224);
                    var descLines = doc.splitTextToSize(c.desc, cw);
                    doc.text(descLines, ml, y);
                    y += descLines.length * 5 + 6;

                    function sectionTitle(title, col) {
                        doc.setFillColor(col[0], col[1], col[2]);
                        doc.rect(ml, y, 3, 5, 'F');
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(col[0], col[1], col[2]);
                        doc.text(title, ml + 6, y + 4);
                        y += 10;
                    }

                    // Roadmap
                    sectionTitle('Career Roadmap', [232, 140, 42]);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(194, 208, 224);
                    c.roadmap.forEach(function(step, i) {
                        doc.setTextColor(232, 140, 42);
                        doc.text((i + 1) + '.', ml + 2, y);
                        doc.setTextColor(194, 208, 224);
                        var lines = doc.splitTextToSize(step, cw - 10);
                        doc.text(lines, ml + 8, y);
                        y += lines.length * 4.5 + 1;
                    });
                    y += 4;

                    // Skills completed
                    if (doneSk.length > 0) {
                        sectionTitle('Skills Completed ✓', [34, 197, 94]);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doneSk.forEach(function(s) {
                            doc.setTextColor(74, 222, 128);
                            doc.text('✓', ml + 2, y);
                            doc.setTextColor(194, 208, 224);
                            doc.text(s.n + ' — ' + s.l, ml + 8, y);
                            y += 5;
                        });
                        y += 3;
                    }

                    // Skills pending
                    if (pendSk.length > 0) {
                        sectionTitle('Skills To Complete', [91, 163, 245]);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        pendSk.forEach(function(s) {
                            doc.setTextColor(122, 143, 168);
                            doc.text('○', ml + 2, y);
                            doc.setTextColor(194, 208, 224);
                            doc.text(s.n + ' — ' + s.l, ml + 8, y);
                            y += 5;
                        });
                        y += 3;
                    }

                    // Check page overflow
                    if (y > 240) {
                        doc.addPage();
                        y = 20;
                    }

                    // AI Suggestions
                    sectionTitle('AI-Recommended Next Steps', [42, 125, 225]);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(194, 208, 224);
                    sugs.forEach(function(s) {
                        var lines = doc.splitTextToSize('→ ' + s, cw - 4);
                        doc.text(lines, ml + 2, y);
                        y += lines.length * 4.5 + 1.5;
                    });
                    y += 4;

                    // Notes
                    if (saved.notes && saved.notes.trim()) {
                        sectionTitle('Your Personal Notes', [245, 169, 78]);
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(8);
                        doc.setTextColor(194, 208, 224);
                        var noteLines = doc.splitTextToSize(saved.notes.trim(), cw - 4);
                        doc.text(noteLines, ml + 2, y);
                        y += noteLines.length * 4.5 + 4;
                    }

                    // Footer on last page
                    doc.setFillColor(7, 17, 30);
                    doc.rect(0, 282, pw, 15, 'F');
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(122, 143, 168);
                    doc.text('© 2026 Eco-Novators · Digital Twin for Students · kar98kbi@gmail.com · digital-twin-app.onrender.com', pw / 2, 289, {
                        align: 'center'
                    });

                    doc.save('DigitalTwin_Report_' + c.title.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf');
                    showToast('✅', 'PDF report downloaded!');
                } else {
                    throw new Error('jsPDF not loaded');
                }
            } catch (err) {
                // Fallback: plain text download
                var lines = [
                    'DIGITAL TWIN FOR STUDENTS — CAREER REPORT',
                    'Eco-Novators | digital-twin-app.onrender.com',
                    'Generated: ' + dateStr,
                    '═══════════════════════════════════════════',
                    '',
                    'CAREER: ' + c.title,
                    'Stream: ' + c.stream + ' | Salary: ' + c.salary,
                    'Demand: ' + c.demand,
                    '',
                    'AI PREDICTION SCORE: ' + pred.score + '% (' + pred.match + ')',
                    'SKILLS PROGRESS: ' + pct + '% (' + doneSk.length + '/' + c.skills.length + ' complete)',
                    '',
                    'DESCRIPTION:',
                    c.desc,
                    '',
                    'CAREER ROADMAP:',
                ];
                c.roadmap.forEach(function(r, i) {
                    lines.push((i + 1) + '. ' + r);
                });
                if (doneSk.length) {
                    lines.push('');
                    lines.push('SKILLS COMPLETED:');
                    doneSk.forEach(function(s) {
                        lines.push('✓ ' + s.n);
                    });
                }
                if (pendSk.length) {
                    lines.push('');
                    lines.push('SKILLS TO COMPLETE:');
                    pendSk.forEach(function(s) {
                        lines.push('○ ' + s.n);
                    });
                }
                lines.push('');
                lines.push('AI RECOMMENDATIONS:');
                sugs.forEach(function(s) {
                    lines.push('→ ' + s);
                });
                if (saved.notes && saved.notes.trim()) {
                    lines.push('');
                    lines.push('YOUR NOTES:');
                    lines.push(saved.notes.trim());
                }
                lines.push('');
                lines.push('───────────────────────────────────────────');
                lines.push('© 2026 Eco-Novators | kar98kbi@gmail.com | +91 75201 19837');

                var blob = new Blob([lines.join('\n')], {
                    type: 'text/plain'
                });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'DigitalTwin_Report_' + c.id + '.txt';
                a.click();
                showToast('✅', 'Report downloaded as text file!');
            }

            setTimeout(function() {
                if (btn) {
                    btn.classList.remove('loading');
                    btn.disabled = false;
                }
            }, 1500);
        }

        /* ═══ SESSION MANAGEMENT ════════════════════════════════════ */
        function restoreSession() {
            updateOverallProgress();
            document.getElementById('restore-banner').classList.remove('show');
            showToast('📂', 'Session restored! Your progress is loaded.');
        }

        function dismissRestore() {
            document.getElementById('restore-banner').classList.remove('show');
            localStorage.setItem('dt_dismiss_restore', '1');
        }

        function checkSession() {
            var lsd = getLSD();
            var hasData = Object.keys(lsd).length > 0;
            var dismissed = localStorage.getItem('dt_dismiss_restore');
            if (hasData && !dismissed) {
                var banner = document.getElementById('restore-banner');
                if (banner) banner.classList.add('show');
            }
            updateOverallProgress();
            // Session meta
            if (!APP_DATA.sessionMeta.firstVisit) APP_DATA.sessionMeta.firstVisit = new Date().toISOString();
            APP_DATA.sessionMeta.lastVisit = new Date().toISOString();
            APP_DATA.sessionMeta.pagesViewed++;
            syncData();
        }

        /* ═══ STUDENT DASHBOARD TOOLS ═════════════════════════════ */
        var STUDENT_TOOL_KEYS = ['achieve', 'achieved', 'develop', 'utilize', 'revise', 'remember', 'weak', 'strong', 'futuristic'];
        var TOOL_EMPTY_TEXT = {
            achieve: 'No goals yet. Add your first goal.',
            achieved: 'No achievements yet.',
            develop: 'Add skills you want to develop.',
            utilize: 'List resources to use more.',
            revise: 'Add revision topics here.',
            remember: 'Add reminders and key points.',
            weak: 'Track weak areas and corrections.',
            strong: 'Add strong subjects to push further.',
            futuristic: 'Add future career tracks or subjects.'
        };

        function ensureStudentDefaults() {
            if (!APP_DATA.studentProfile) {
                APP_DATA.studentProfile = {
                    type: '',
                    classLevel: '',
                    uniLevel: '',
                    stream: '',
                    updatedAt: null
                };
            }
            if (!APP_DATA.studentTools) {
                APP_DATA.studentTools = {
                    nextStep: '',
                    items: {},
                    sessions: [],
                    routine: [],
                    timeTracker: {
                        targetMinutes: 600,
                        entries: []
                    }
                };
            }
            if (!APP_DATA.studentTools.items) APP_DATA.studentTools.items = {};
            STUDENT_TOOL_KEYS.forEach(function(key) {
                if (!Array.isArray(APP_DATA.studentTools.items[key])) APP_DATA.studentTools.items[key] = [];
            });
            if (!Array.isArray(APP_DATA.studentTools.sessions)) APP_DATA.studentTools.sessions = [];
            if (!Array.isArray(APP_DATA.studentTools.routine)) APP_DATA.studentTools.routine = [];
            if (!Array.isArray(APP_DATA.studentTools.syllabus)) APP_DATA.studentTools.syllabus = [];
            if (!Array.isArray(APP_DATA.studentTools.chapters)) APP_DATA.studentTools.chapters = [];
            if (!Array.isArray(APP_DATA.studentTools.exams)) APP_DATA.studentTools.exams = [];
            if (!Array.isArray(APP_DATA.studentTools.grades)) APP_DATA.studentTools.grades = [];
            if (!APP_DATA.studentTools.timeTracker || typeof APP_DATA.studentTools.timeTracker !== 'object') {
                APP_DATA.studentTools.timeTracker = {
                    targetMinutes: 600,
                    entries: []
                };
            }
            if (!Array.isArray(APP_DATA.studentTools.timeTracker.entries)) {
                APP_DATA.studentTools.timeTracker.entries = [];
            }
            if (typeof APP_DATA.studentTools.timeTracker.targetMinutes !== 'number') {
                var tgt = parseInt(APP_DATA.studentTools.timeTracker.targetMinutes, 10);
                APP_DATA.studentTools.timeTracker.targetMinutes = Number.isFinite(tgt) ? tgt : 600;
            }
            if (typeof APP_DATA.studentTools.nextStep !== 'string') APP_DATA.studentTools.nextStep = '';
        }

        function openStudentOnboard() {
            var ov = document.getElementById('student-onboard-ov');
            if (ov) ov.classList.add('show');
            var note = document.getElementById('student-onboard-note');
            if (note) {
                if (APP_DATA.studentProfile.type === 'school') {
                    note.textContent = 'Last time you selected: School Student.';
                } else if (APP_DATA.studentProfile.type === 'university') {
                    note.textContent = 'Last time you selected: College Student.';
                } else {
                    note.textContent = 'Your selection only saves on this device.';
                }
            }
        }

        function closeStudentOnboard() {
            var ov = document.getElementById('student-onboard-ov');
            if (ov) ov.classList.remove('show');
        }

        function selectStudentType(type) {
            ensureStudentDefaults();
            APP_DATA.studentProfile.type = type;
            APP_DATA.studentProfile.updatedAt = new Date().toISOString();
            syncData();
            closeStudentOnboard();
            openLoginGate();
        }

        function setStudentType(type) {
            ensureStudentDefaults();
            APP_DATA.studentProfile.type = type;
            APP_DATA.studentProfile.updatedAt = new Date().toISOString();
            if (type === 'school' && !APP_DATA.studentProfile.classLevel) {
                APP_DATA.studentProfile.classLevel = '9';
            }
            if (type === 'university' && !APP_DATA.studentProfile.uniLevel) {
                APP_DATA.studentProfile.uniLevel = '1st Year';
            }
            renderStudentProfile();
            updateClassChips();
            updateFocusSummary();
            syncData();
            setDashboardOpen(true, true);
            showToast('👋', type === 'school' ? 'School dashboard activated.' : 'College dashboard activated.');
            var dash = document.getElementById('student-dashboard');
            if (dash) {
                setTimeout(function() {
                    dash.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 200);
            }
        }

        function setClassLevel(level) {
            ensureStudentDefaults();
            APP_DATA.studentProfile.classLevel = String(level);
            APP_DATA.studentProfile.updatedAt = new Date().toISOString();
            updateClassChips();
            updateFocusSummary();
            renderStudentProfile();
            syncData();
        }

        function setUniLevel(level) {
            if (!level) return;
            ensureStudentDefaults();
            APP_DATA.studentProfile.uniLevel = level;
            APP_DATA.studentProfile.updatedAt = new Date().toISOString();
            updateFocusSummary();
            renderStudentProfile();
            syncData();
        }

        function setUniStream(value) {
            ensureStudentDefaults();
            APP_DATA.studentProfile.stream = value;
            APP_DATA.studentProfile.updatedAt = new Date().toISOString();
            renderStudentProfile();
            syncData();
        }

        function renderStudentProfile() {
            var type = APP_DATA.studentProfile.type || '';
            var effectiveType = type || 'school';
            var dash = document.getElementById('student-dashboard');
            if (dash) dash.setAttribute('data-student', effectiveType);
            var segSchool = document.getElementById('seg-school');
            var segUni = document.getElementById('seg-university');
            if (segSchool) segSchool.classList.toggle('active', effectiveType === 'school');
            if (segUni) segUni.classList.toggle('active', effectiveType === 'university');
            var label = document.getElementById('profile-label');
            if (label) {
                if (!type) label.textContent = 'Not selected';
                else label.textContent = type === 'school' ? 'School Student' : 'College Student';
            }
            var levelEl = document.getElementById('profile-level');
            if (levelEl) {
                if (!type) {
                    levelEl.textContent = 'Select a profile';
                } else if (type === 'school') {
                    levelEl.textContent = APP_DATA.studentProfile.classLevel ? 'Class ' + APP_DATA.studentProfile.classLevel : 'Select class';
                } else {
                    var lvl = APP_DATA.studentProfile.uniLevel || 'Select year';
                    if (APP_DATA.studentProfile.stream) lvl += ' - ' + APP_DATA.studentProfile.stream;
                    levelEl.textContent = lvl;
                }
            }
            var uniSelect = document.getElementById('uni-level');
            if (uniSelect && APP_DATA.studentProfile.uniLevel) uniSelect.value = APP_DATA.studentProfile.uniLevel;
            var uniStream = document.getElementById('uni-stream');
            if (uniStream) uniStream.value = APP_DATA.studentProfile.stream || '';
        }

        function updateClassChips() {
            var grid = document.getElementById('class-grid');
            if (!grid) return;
            var level = APP_DATA.studentProfile.classLevel;
            grid.querySelectorAll('.class-chip').forEach(function(btn) {
                btn.classList.toggle('active', String(btn.textContent) === String(level));
            });
        }

        function getSchoolFocus(level) {
            var lv = parseInt(level, 10);
            if (!lv) return null;
            if (lv <= 5) {
                return {
                    title: 'Foundation Focus',
                    points: ['Reading fluency and comprehension', 'Number sense and basic arithmetic', 'Curiosity and daily practice habits']
                };
            }
            if (lv <= 8) {
                return {
                    title: 'Concept Clarity Focus',
                    points: ['Strong fundamentals in Math and Science', 'Daily revision of core subjects', 'Build confidence with short quizzes']
                };
            }
            if (lv <= 10) {
                return {
                    title: 'Exam Readiness Focus',
                    points: ['Practice papers and time management', 'Clear weak topics with extra revision', 'Start exploring interest areas']
                };
            }
            return {
                title: 'Career Stream Focus',
                points: ['Deep work in your chosen stream', 'Entrance exam preparation plan', 'Build a portfolio or project list']
            };
        }

        function getUniversityFocus(level) {
            if (!level) return null;
            if (level === '1st Year') {
                return {
                    title: 'Year 1 Focus',
                    points: ['Set academic base and core skills', 'Explore clubs, labs, or competitions', 'Build consistent study system']
                };
            }
            if (level === '2nd Year') {
                return {
                    title: 'Year 2 Focus',
                    points: ['Choose specialization direction', 'Start mini-projects or certifications', 'Build strong CGPA foundation']
                };
            }
            if (level === '3rd Year') {
                return {
                    title: 'Year 3 Focus',
                    points: ['Target internships and hackathons', 'Build portfolio projects', 'Strengthen interview readiness']
                };
            }
            if (level === '4th Year') {
                return {
                    title: 'Final Year Focus',
                    points: ['Placement preparation plan', 'Resume and interview practice', 'Finalize career track']
                };
            }
            return {
                title: 'Postgraduate Focus',
                points: ['Deep research or specialization', 'Industry networking and internships', 'Publish or build standout projects']
            };
        }

        function updateFocusSummary() {
            var box = document.getElementById('focus-box');
            if (!box) return;
            var type = APP_DATA.studentProfile.type || 'school';
            var focus = type === 'school' ? getSchoolFocus(APP_DATA.studentProfile.classLevel) : getUniversityFocus(APP_DATA.studentProfile.uniLevel);
            if (!focus) {
                box.textContent = type === 'school' ? 'Select a class to see a personalised focus plan.' : 'Select your university level to see a personalised focus plan.';
                return;
            }
            var list = focus.points.map(function(p) {
                return '<li>' + escapeHTML(p) + '</li>';
            }).join('');
            box.innerHTML = '<strong>' + escapeHTML(focus.title) + '</strong><ul>' + list + '</ul>';
        }

        function setNextStep() {
            ensureStudentDefaults();
            var input = document.getElementById('next-step-input');
            if (!input) return;
            var value = input.value.trim();
            if (!value) return;
            APP_DATA.studentTools.nextStep = value;
            input.value = '';
            syncData();
            renderNextStep();
        }

        function renderNextStep() {
            var display = document.getElementById('next-step-display');
            if (!display) return;
            display.textContent = APP_DATA.studentTools.nextStep ? APP_DATA.studentTools.nextStep : 'No next step pinned yet.';
        }

        function useFirstPendingGoal() {
            ensureStudentDefaults();
            var list = APP_DATA.studentTools.items.achieve;
            if (!list.length) return;
            APP_DATA.studentTools.nextStep = list[0];
            syncData();
            renderNextStep();
        }

        function addToolItem(key, inputId) {
            ensureStudentDefaults();
            var input = document.getElementById(inputId);
            if (!input) return;
            var value = input.value.trim();
            if (!value) return;
            if (key === 'achieved') {
                APP_DATA.studentTools.items.achieved.unshift({
                    text: value,
                    at: new Date().toISOString()
                });
            } else {
                APP_DATA.studentTools.items[key].push(value);
            }
            input.value = '';
            syncData();
            renderToolList(key);
            if (key === 'achieve' || key === 'achieved') updateAccuracy();
            refreshWeeklySummary();
        }

        function removeToolItem(key, index) {
            ensureStudentDefaults();
            var list = APP_DATA.studentTools.items[key];
            if (!list || index < 0 || index >= list.length) return;
            list.splice(index, 1);
            syncData();
            renderToolList(key);
            if (key === 'achieve' || key === 'achieved') updateAccuracy();
            refreshWeeklySummary();
        }

        function markAchieved(index) {
            ensureStudentDefaults();
            var list = APP_DATA.studentTools.items.achieve;
            if (!list || index < 0 || index >= list.length) return;
            var item = list.splice(index, 1)[0];
            APP_DATA.studentTools.items.achieved.unshift({
                text: item,
                at: new Date().toISOString()
            });
            syncData();
            renderToolList('achieve');
            renderToolList('achieved');
            updateAccuracy();
            renderNextStep();
            refreshWeeklySummary();
        }

        function renderToolList(key) {
            var list = document.getElementById('tool-' + key + '-list');
            if (!list) return;
            list.innerHTML = '';
            var items = APP_DATA.studentTools.items[key] || [];
            if (!items.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = TOOL_EMPTY_TEXT[key] || 'No items yet.';
                list.appendChild(empty);
                return;
            }
            items.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'tool-item';
                var text = (typeof item === 'string') ? item : item.text;
                var span = document.createElement('span');
                span.textContent = text;
                li.appendChild(span);
                var actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.gap = '.35rem';
                if (key === 'achieve') {
                    var done = document.createElement('button');
                    done.className = 'tool-mini';
                    done.textContent = 'Achieved';
                    done.onclick = function() {
                        markAchieved(idx);
                    };
                    actions.appendChild(done);
                }
                if (key === 'achieved' && item.at) {
                    var dateTag = document.createElement('span');
                    dateTag.className = 'session-meta';
                    dateTag.textContent = new Date(item.at).toLocaleDateString();
                    actions.appendChild(dateTag);
                }
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeToolItem(key, idx);
                };
                actions.appendChild(remove);
                li.appendChild(actions);
                list.appendChild(li);
            });
        }

        function updateAccuracy() {
            var pctEl = document.getElementById('accuracy-pct');
            var fillEl = document.getElementById('accuracy-fill');
            var noteEl = document.getElementById('accuracy-note');
            if (!pctEl || !fillEl || !noteEl) return;
            var total = APP_DATA.studentTools.items.achieve.length + APP_DATA.studentTools.items.achieved.length;
            var pct = total ? Math.round((APP_DATA.studentTools.items.achieved.length / total) * 100) : 0;
            pctEl.textContent = pct + '%';
            fillEl.style.width = pct + '%';
            noteEl.textContent = total ? ('Completed ' + APP_DATA.studentTools.items.achieved.length + ' of ' + total + ' goals.') : 'Add goals to calculate accuracy.';
            refreshWeeklySummary();
        }

        function addSession() {
            ensureStudentDefaults();
            var topicEl = document.getElementById('session-topic');
            var teacherEl = document.getElementById('session-teacher');
            var dateEl = document.getElementById('session-date');
            var timeEl = document.getElementById('session-time');
            if (!topicEl || !dateEl) return;
            var topic = topicEl.value.trim();
            var teacher = teacherEl ? teacherEl.value.trim() : '';
            var date = dateEl.value;
            var time = timeEl ? timeEl.value : '';
            if (!topic || !date) {
                showToast('!', 'Please add a topic and date for the session.');
                return;
            }
            APP_DATA.studentTools.sessions.unshift({
                topic: topic,
                teacher: teacher,
                date: date,
                time: time,
                createdAt: new Date().toISOString()
            });
            if (topicEl) topicEl.value = '';
            if (teacherEl) teacherEl.value = '';
            if (dateEl) dateEl.value = '';
            if (timeEl) timeEl.value = '';
            syncData();
            renderSessions();
            refreshWeeklySummary();
        }

        function removeSession(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.sessions.length) return;
            APP_DATA.studentTools.sessions.splice(index, 1);
            syncData();
            renderSessions();
            refreshWeeklySummary();
        }

        function renderSessions() {
            var list = document.getElementById('session-list');
            if (!list) return;
            list.innerHTML = '';
            var sessions = APP_DATA.studentTools.sessions || [];
            if (!sessions.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No sessions scheduled yet.';
                list.appendChild(empty);
                return;
            }
            sessions.forEach(function(s, idx) {
                var li = document.createElement('li');
                li.className = 'session-row';
                var meta = document.createElement('div');
                meta.className = 'session-meta';
                var title = document.createElement('strong');
                title.textContent = s.topic || 'Session';
                meta.appendChild(title);
                var info = document.createElement('div');
                var dateText = s.date || '';
                var timeText = s.time ? (' ' + s.time) : '';
                info.textContent = (s.teacher || 'Teacher') + ' - ' + dateText + timeText;
                meta.appendChild(info);
                li.appendChild(meta);
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeSession(idx);
                };
                li.appendChild(remove);
                list.appendChild(li);
            });
        }

        function addSyllabusTopic() {
            ensureStudentDefaults();
            var subjectEl = document.getElementById('syllabus-subject');
            var topicEl = document.getElementById('syllabus-topic');
            if (!subjectEl || !topicEl) return;
            var subject = subjectEl.value.trim();
            var topic = topicEl.value.trim();
            if (!subject || !topic) {
                showToast('!', 'Add subject and topic.');
                return;
            }
            APP_DATA.studentTools.syllabus.push({
                subject: subject,
                topic: topic
            });
            subjectEl.value = '';
            topicEl.value = '';
            syncData();
            renderSyllabus();
        }

        function removeSyllabusTopic(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.syllabus.length) return;
            APP_DATA.studentTools.syllabus.splice(index, 1);
            syncData();
            renderSyllabus();
        }

        function renderSyllabus() {
            var list = document.getElementById('syllabus-list');
            if (!list) return;
            list.innerHTML = '';
            var items = APP_DATA.studentTools.syllabus || [];
            if (!items.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No syllabus topics yet.';
                list.appendChild(empty);
                return;
            }
            items.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'tool-item';
                var span = document.createElement('span');
                span.textContent = item.subject + ' - ' + item.topic;
                li.appendChild(span);
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeSyllabusTopic(idx);
                };
                li.appendChild(remove);
                list.appendChild(li);
            });
        }

        function addChapter() {
            ensureStudentDefaults();
            var subjectEl = document.getElementById('chapter-subject');
            var chapterEl = document.getElementById('chapter-name');
            if (!subjectEl || !chapterEl) return;
            var subject = subjectEl.value.trim();
            var chapter = chapterEl.value.trim();
            if (!subject || !chapter) {
                showToast('!', 'Add subject and chapter.');
                return;
            }
            APP_DATA.studentTools.chapters.push({
                subject: subject,
                chapter: chapter
            });
            subjectEl.value = '';
            chapterEl.value = '';
            syncData();
            renderChapters();
        }

        function removeChapter(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.chapters.length) return;
            APP_DATA.studentTools.chapters.splice(index, 1);
            syncData();
            renderChapters();
        }

        function renderChapters() {
            var list = document.getElementById('chapter-list');
            if (!list) return;
            list.innerHTML = '';
            var items = APP_DATA.studentTools.chapters || [];
            if (!items.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No chapters added yet.';
                list.appendChild(empty);
                return;
            }
            items.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'tool-item';
                var span = document.createElement('span');
                span.textContent = item.subject + ' - ' + item.chapter;
                li.appendChild(span);
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeChapter(idx);
                };
                li.appendChild(remove);
                list.appendChild(li);
            });
        }

        function addExamDate() {
            ensureStudentDefaults();
            var nameEl = document.getElementById('exam-name');
            var dateEl = document.getElementById('exam-date');
            if (!nameEl || !dateEl) return;
            var name = nameEl.value.trim();
            var date = dateEl.value;
            if (!name || !date) {
                showToast('!', 'Add exam name and date.');
                return;
            }
            APP_DATA.studentTools.exams.push({
                name: name,
                date: date
            });
            nameEl.value = '';
            dateEl.value = '';
            syncData();
            renderExams();
            refreshWeeklySummary();
        }

        function removeExamDate(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.exams.length) return;
            APP_DATA.studentTools.exams.splice(index, 1);
            syncData();
            renderExams();
            refreshWeeklySummary();
        }

        function renderExams() {
            var list = document.getElementById('exam-list');
            if (!list) return;
            list.innerHTML = '';
            var items = APP_DATA.studentTools.exams || [];
            if (!items.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No exam dates added yet.';
                list.appendChild(empty);
                return;
            }
            items.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'tool-item';
                var span = document.createElement('span');
                span.textContent = item.name + ' - ' + item.date;
                li.appendChild(span);
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeExamDate(idx);
                };
                li.appendChild(remove);
                list.appendChild(li);
            });
        }

        function addGrade() {
            ensureStudentDefaults();
            var subjectEl = document.getElementById('grade-subject');
            var scoreEl = document.getElementById('grade-score');
            var maxEl = document.getElementById('grade-max');
            if (!subjectEl || !scoreEl || !maxEl) return;
            var subject = subjectEl.value.trim();
            var score = parseFloat(scoreEl.value);
            var max = parseFloat(maxEl.value);
            if (!subject || !Number.isFinite(score) || !Number.isFinite(max) || max <= 0) {
                showToast('!', 'Add subject, score, and max marks.');
                return;
            }
            APP_DATA.studentTools.grades.push({
                subject: subject,
                score: score,
                max: max
            });
            subjectEl.value = '';
            scoreEl.value = '';
            maxEl.value = '';
            syncData();
            renderGrades();
            refreshWeeklySummary();
        }

        function removeGrade(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.grades.length) return;
            APP_DATA.studentTools.grades.splice(index, 1);
            syncData();
            renderGrades();
            refreshWeeklySummary();
        }

        function getAverageScore() {
            var items = APP_DATA.studentTools.grades || [];
            if (!items.length) return 0;
            var total = 0;
            var count = 0;
            items.forEach(function(item) {
                var score = parseFloat(item.score);
                var max = parseFloat(item.max);
                if (Number.isFinite(score) && Number.isFinite(max) && max > 0) {
                    total += (score / max) * 100;
                    count += 1;
                }
            });
            return count ? Math.round(total / count) : 0;
        }

        function renderGrades() {
            var list = document.getElementById('grade-list');
            if (!list) return;
            list.innerHTML = '';
            var items = APP_DATA.studentTools.grades || [];
            if (!items.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No marks added yet.';
                list.appendChild(empty);
                return;
            }
            items.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'tool-item';
                var span = document.createElement('span');
                var pct = (item.max > 0) ? Math.round((item.score / item.max) * 100) : 0;
                span.textContent = item.subject + ' - ' + item.score + '/' + item.max + ' (' + pct + '%)';
                li.appendChild(span);
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeGrade(idx);
                };
                li.appendChild(remove);
                list.appendChild(li);
            });
        }

        function addRoutine() {
            ensureStudentDefaults();
            var timeEl = document.getElementById('routine-time');
            var taskEl = document.getElementById('routine-task');
            if (!taskEl) return;
            var time = timeEl ? timeEl.value : '';
            var task = taskEl.value.trim();
            if (!task) {
                showToast('!', 'Please add a routine task.');
                return;
            }
            APP_DATA.studentTools.routine.push({
                time: time || 'Anytime',
                task: task,
                createdAt: new Date().toISOString()
            });
            if (timeEl) timeEl.value = '';
            taskEl.value = '';
            syncData();
            renderRoutine();
            refreshWeeklySummary();
        }

        function removeRoutine(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.routine.length) return;
            APP_DATA.studentTools.routine.splice(index, 1);
            syncData();
            renderRoutine();
            refreshWeeklySummary();
        }

        function renderRoutine() {
            var list = document.getElementById('routine-list');
            if (!list) return;
            list.innerHTML = '';
            var items = APP_DATA.studentTools.routine || [];
            if (!items.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No routine items yet.';
                list.appendChild(empty);
                return;
            }
            items.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'tool-item';
                var span = document.createElement('span');
                span.textContent = (item.time ? item.time + ' - ' : '') + item.task;
                li.appendChild(span);
                var remove = document.createElement('button');
                remove.className = 'tool-mini warn';
                remove.textContent = 'Remove';
                remove.onclick = function() {
                    removeRoutine(idx);
                };
                li.appendChild(remove);
                list.appendChild(li);
            });
        }

        function setTrackerTarget(value) {
            ensureStudentDefaults();
            var parsed = parseInt(value, 10);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            APP_DATA.studentTools.timeTracker.targetMinutes = parsed;
            syncData();
            updateTimeTracker();
            refreshWeeklySummary();
        }

        function addTimeEntry() {
            ensureStudentDefaults();
            var subjectEl = document.getElementById('tracker-subject');
            var minutesEl = document.getElementById('tracker-minutes');
            if (!subjectEl || !minutesEl) return;
            var subject = subjectEl.value.trim();
            var minutes = parseInt(minutesEl.value, 10);
            if (!subject || !Number.isFinite(minutes) || minutes <= 0) {
                showToast('!', 'Add subject and minutes to log time.');
                return;
            }
            APP_DATA.studentTools.timeTracker.entries.unshift({
                subject: subject,
                minutes: minutes,
                at: new Date().toISOString()
            });
            subjectEl.value = '';
            minutesEl.value = '';
            syncData();
            renderTimeTracker();
            refreshWeeklySummary();
        }

        function removeTimeEntry(index) {
            ensureStudentDefaults();
            if (index < 0 || index >= APP_DATA.studentTools.timeTracker.entries.length) return;
            APP_DATA.studentTools.timeTracker.entries.splice(index, 1);
            syncData();
            renderTimeTracker();
            refreshWeeklySummary();
        }

        function getTrackerTotal() {
            return (APP_DATA.studentTools.timeTracker.entries || []).reduce(function(sum, entry) {
                return sum + (parseInt(entry.minutes, 10) || 0);
            }, 0);
        }

        function updateTimeTracker() {
            var fill = document.getElementById('tracker-fill');
            var totalEl = document.getElementById('tracker-total');
            var targetEl = document.getElementById('tracker-target');
            if (!fill || !totalEl) return;
            var total = getTrackerTotal();
            var target = APP_DATA.studentTools.timeTracker.targetMinutes || 0;
            var pct = target ? Math.min(100, Math.round((total / target) * 100)) : 0;
            fill.style.width = pct + '%';
            totalEl.textContent = total + ' min logged' + (target ? ' / ' + target + ' target' : '');
            if (targetEl && target) targetEl.value = target;
        }

        function renderTimeTracker() {
            var list = document.getElementById('tracker-list');
            if (!list) return;
            list.innerHTML = '';
            var entries = APP_DATA.studentTools.timeTracker.entries || [];
            if (!entries.length) {
                var empty = document.createElement('li');
                empty.className = 'tool-empty';
                empty.textContent = 'No study time logged yet.';
                list.appendChild(empty);
            } else {
                entries.forEach(function(entry, idx) {
                    var li = document.createElement('li');
                    li.className = 'tool-item';
                    var span = document.createElement('span');
                    span.textContent = entry.subject + ' - ' + entry.minutes + ' min';
                    li.appendChild(span);
                    var remove = document.createElement('button');
                    remove.className = 'tool-mini warn';
                    remove.textContent = 'Remove';
                    remove.onclick = function() {
                        removeTimeEntry(idx);
                    };
                    li.appendChild(remove);
                    list.appendChild(li);
                });
            }
            updateTimeTracker();
        }

        function getTopSubject() {
            var entries = APP_DATA.studentTools.timeTracker.entries || [];
            if (!entries.length) return '-';
            var totals = {};
            entries.forEach(function(entry) {
                var subject = entry.subject || 'General';
                var minutes = parseInt(entry.minutes, 10) || 0;
                totals[subject] = (totals[subject] || 0) + minutes;
            });
            var top = '-';
            var max = -1;
            Object.keys(totals).forEach(function(subject) {
                if (totals[subject] > max) {
                    max = totals[subject];
                    top = subject;
                }
            });
            return top;
        }

        function refreshWeeklySummary() {
            var goalsEl = document.getElementById('sum-goals');
            var accEl = document.getElementById('sum-accuracy');
            var routineEl = document.getElementById('sum-routine');
            var studyEl = document.getElementById('sum-study');
            var topEl = document.getElementById('sum-top');
            var examsEl = document.getElementById('sum-exams');
            var avgEl = document.getElementById('sum-avg');
            var barEl = document.getElementById('sum-bar');
            if (!goalsEl || !accEl || !routineEl || !studyEl || !topEl || !barEl || !examsEl || !avgEl) return;
            var totalGoals = APP_DATA.studentTools.items.achieve.length + APP_DATA.studentTools.items.achieved.length;
            var completed = APP_DATA.studentTools.items.achieved.length;
            var accuracy = totalGoals ? Math.round((completed / totalGoals) * 100) : 0;
            var routineCount = APP_DATA.studentTools.routine.length;
            var studyMinutes = getTrackerTotal();
            goalsEl.textContent = completed + '/' + totalGoals;
            accEl.textContent = accuracy + '%';
            routineEl.textContent = String(routineCount);
            studyEl.textContent = studyMinutes + ' min';
            topEl.textContent = getTopSubject();
            examsEl.textContent = String(APP_DATA.studentTools.exams.length || 0);
            avgEl.textContent = getAverageScore() + '%';
            barEl.style.width = accuracy + '%';
        }

        function askStudyPlan() {
            var type = APP_DATA.studentProfile.type;
            var parts = [];
            if (type === 'school') {
                parts.push('I am a school student.');
                if (APP_DATA.studentProfile.classLevel) parts.push('My class is ' + APP_DATA.studentProfile.classLevel + '.');
            } else if (type === 'university') {
                parts.push('I am a college student.');
                if (APP_DATA.studentProfile.uniLevel) parts.push('My year is ' + APP_DATA.studentProfile.uniLevel + '.');
                if (APP_DATA.studentProfile.stream) parts.push('My stream is ' + APP_DATA.studentProfile.stream + '.');
            }
            if (APP_DATA.studentTools.nextStep) parts.push('My next step is: ' + APP_DATA.studentTools.nextStep + '.');
            if (APP_DATA.studentTools.items.achieve.length) {
                parts.push('My current goals: ' + APP_DATA.studentTools.items.achieve.slice(0, 5).join(', ') + '.');
            }
            parts.push('Create a weekly study plan with daily routine, revision slots, and checkpoints.');
            if (!chatOpen) togChat();
            var inp = document.getElementById('cp-inp');
            if (inp) {
                inp.value = parts.join(' ');
                setTimeout(sendMsg, 300);
            }
        }

        async function downloadStudentPlan() {
            ensureStudentDefaults();
            var jsPDFLib = await ensureJsPDFLoaded().catch(function() {
                return null;
            });
            var profile = APP_DATA.studentProfile.type === 'school' ? 'School Student' : (APP_DATA.studentProfile.type === 'university' ? 'College Student' : 'Not selected');
            var level = '';
            if (APP_DATA.studentProfile.type === 'school') {
                level = APP_DATA.studentProfile.classLevel ? 'Class ' + APP_DATA.studentProfile.classLevel : 'Class not set';
            } else if (APP_DATA.studentProfile.type === 'university') {
                level = APP_DATA.studentProfile.uniLevel || 'Year not set';
                if (APP_DATA.studentProfile.stream) level += ' - ' + APP_DATA.studentProfile.stream;
            }
            var dateStr = new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            var summary = {
                goals: APP_DATA.studentTools.items.achieve,
                achieved: APP_DATA.studentTools.items.achieved.map(function(item) {
                    return (typeof item === 'string') ? item : item.text;
                }),
                accuracy: (function() {
                    var total = APP_DATA.studentTools.items.achieve.length + APP_DATA.studentTools.items.achieved.length;
                    return total ? Math.round((APP_DATA.studentTools.items.achieved.length / total) * 100) : 0;
                })(),
                routine: APP_DATA.studentTools.routine,
                tracker: APP_DATA.studentTools.timeTracker
            };

            function limitList(list, max) {
                return list.slice(0, max);
            }

            if (jsPDFLib) {
                var doc = new jsPDFLib({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });
                var pw = 210;
                var ph = 297;
                var margin = 16;
                var cw = pw - margin * 2;
                var y = 14;

                function ensureSpace(height) {
                    if (y + height > ph - 16) {
                        doc.addPage();
                        y = 16;
                    }
                }

                function drawHeader() {
                    doc.setFillColor(7, 17, 30);
                    doc.rect(0, 0, pw, 30, 'F');
                    doc.setFillColor(232, 140, 42);
                    doc.rect(0, 30, pw, 2, 'F');
                    doc.setTextColor(232, 240, 248);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(15);
                    doc.text('Student Plan', margin, 18);
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(194, 208, 224);
                    doc.text('Digital Twin for Students', margin, 24);
                    doc.text('Generated: ' + dateStr, pw - margin, 18, {
                        align: 'right'
                    });
                    y = 38;
                }

                var themes = {
                    overview: {
                        bar: [42, 125, 225],
                        headBg: [42, 125, 225],
                        headText: [255, 255, 255],
                        rowBg: [236, 244, 255],
                        rowAlt: [226, 238, 255],
                        rowText: [20, 32, 52],
                        border: [210, 222, 245]
                    },
                    goals: {
                        bar: [232, 140, 42],
                        headBg: [232, 140, 42],
                        headText: [255, 255, 255],
                        rowBg: [255, 244, 233],
                        rowAlt: [255, 235, 220],
                        rowText: [30, 22, 12],
                        border: [245, 200, 150]
                    },
                    achieved: {
                        bar: [34, 197, 94],
                        headBg: [34, 197, 94],
                        headText: [255, 255, 255],
                        rowBg: [234, 252, 242],
                        rowAlt: [223, 248, 234],
                        rowText: [14, 40, 24],
                        border: [170, 225, 195]
                    },
                    accuracy: {
                        bar: [123, 47, 255],
                        headBg: [123, 47, 255],
                        headText: [255, 255, 255],
                        rowBg: [241, 235, 255],
                        rowAlt: [232, 224, 255],
                        rowText: [26, 16, 60],
                        border: [205, 190, 255]
                    },
                    routine: {
                        bar: [42, 125, 225],
                        headBg: [42, 125, 225],
                        headText: [255, 255, 255],
                        rowBg: [235, 243, 255],
                        rowAlt: [224, 237, 255],
                        rowText: [18, 30, 48],
                        border: [200, 216, 240]
                    },
                    tracker: {
                        bar: [55, 215, 255],
                        headBg: [55, 175, 215],
                        headText: [255, 255, 255],
                        rowBg: [232, 250, 255],
                        rowAlt: [220, 245, 255],
                        rowText: [12, 30, 40],
                        border: [180, 224, 235]
                    },
                    syllabus: {
                        bar: [91, 163, 245],
                        headBg: [91, 163, 245],
                        headText: [255, 255, 255],
                        rowBg: [236, 243, 255],
                        rowAlt: [226, 237, 255],
                        rowText: [18, 30, 48],
                        border: [200, 216, 240]
                    },
                    exams: {
                        bar: [239, 68, 68],
                        headBg: [239, 68, 68],
                        headText: [255, 255, 255],
                        rowBg: [255, 236, 236],
                        rowAlt: [255, 226, 226],
                        rowText: [48, 18, 18],
                        border: [240, 190, 190]
                    },
                    grades: {
                        bar: [42, 125, 225],
                        headBg: [42, 125, 225],
                        headText: [255, 255, 255],
                        rowBg: [236, 243, 255],
                        rowAlt: [226, 237, 255],
                        rowText: [18, 30, 48],
                        border: [200, 216, 240]
                    },
                    listBlue: {
                        bar: [55, 215, 255],
                        headBg: [55, 175, 215],
                        headText: [255, 255, 255],
                        rowBg: [232, 250, 255],
                        rowAlt: [220, 245, 255],
                        rowText: [12, 30, 40],
                        border: [180, 224, 235]
                    },
                    listAmber: {
                        bar: [232, 140, 42],
                        headBg: [232, 140, 42],
                        headText: [255, 255, 255],
                        rowBg: [255, 244, 233],
                        rowAlt: [255, 235, 220],
                        rowText: [30, 22, 12],
                        border: [245, 200, 150]
                    }
                };

                function drawTableSection(title, theme, columns, rows) {
                    var safeRows = (rows && rows.length) ? rows : [columns.map(function(_col, idx) {
                        if (idx === 0) return '-';
                        if (idx === 1) return 'No data yet';
                        return '';
                    })];
                    var colWidths = columns.map(function(c) {
                        return Math.floor(cw * c.w);
                    });
                    var totalW = colWidths.reduce(function(sum, w) {
                        return sum + w;
                    }, 0);
                    if (totalW < cw) colWidths[colWidths.length - 1] += (cw - totalW);

                    function drawRow(cells, fill, textColor, isHeader) {
                        var lineHeight = isHeader ? 4.6 : 4.2;
                        var cellLines = cells.map(function(text, idx) {
                            var val = String(text == null ? '-' : text);
                            return doc.splitTextToSize(val, colWidths[idx] - 4);
                        });
                        var maxLines = cellLines.reduce(function(m, lines) {
                            return Math.max(m, lines.length || 1);
                        }, 1);
                        var rowH = Math.max(isHeader ? 7 : 6.5, (maxLines * lineHeight) + 2);
                        ensureSpace(rowH);
                        doc.setFillColor(fill[0], fill[1], fill[2]);
                        doc.rect(margin, y, cw, rowH, 'F');
                        doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
                        doc.rect(margin, y, cw, rowH);
                        var x = margin;
                        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
                        doc.setFontSize(isHeader ? 8.5 : 8);
                        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                        cellLines.forEach(function(lines, idx) {
                            doc.text(lines, x + 2, y + 4);
                            x += colWidths[idx];
                            if (idx < colWidths.length - 1) {
                                doc.line(x, y, x, y + rowH);
                            }
                        });
                        y += rowH;
                    }

                    ensureSpace(10);
                    doc.setFillColor(theme.bar[0], theme.bar[1], theme.bar[2]);
                    doc.roundedRect(margin, y, cw, 7, 2, 2, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(255, 255, 255);
                    doc.text(title, margin + 3, y + 5);
                    y += 9;

                    drawRow(columns.map(function(c) {
                        return c.label;
                    }), theme.headBg, theme.headText, true);
                    safeRows.forEach(function(row, idx) {
                        var fill = (idx % 2 === 0) ? theme.rowBg : theme.rowAlt;
                        drawRow(row, fill, theme.rowText, false);
                    });
                    y += 4;
                }

                drawHeader();

                drawTableSection('Profile Overview', themes.overview, [{
                    label: 'Field',
                    w: 0.3
                }, {
                    label: 'Details',
                    w: 0.7
                }], [
                    ['Profile', profile],
                    ['Level', level || 'Not set'],
                    ['Next Step', APP_DATA.studentTools.nextStep || 'Not set'],
                    ['Generated', dateStr]
                ]);

                drawTableSection('Goals To Achieve', themes.goals, [{
                    label: '#',
                    w: 0.1
                }, {
                    label: 'Goal',
                    w: 0.9
                }], limitList(summary.goals, 10).map(function(item, idx) {
                    return [String(idx + 1), item];
                }));

                drawTableSection('Things Achieved', themes.achieved, [{
                    label: '#',
                    w: 0.1
                }, {
                    label: 'Achievement',
                    w: 0.9
                }], limitList(summary.achieved, 10).map(function(item, idx) {
                    return [String(idx + 1), item];
                }));

                drawTableSection('Performance Snapshot', themes.accuracy, [{
                    label: 'Metric',
                    w: 0.55
                }, {
                    label: 'Value',
                    w: 0.45
                }], [
                    ['Completion Accuracy', summary.accuracy + '%'],
                    ['Weekly Target', (summary.tracker.targetMinutes || 0) + ' min'],
                    ['Total Logged', getTrackerTotal() + ' min'],
                    ['Top Subject', getTopSubject()]
                ]);

                drawTableSection('Daily Routine', themes.routine, [{
                    label: 'Time',
                    w: 0.25
                }, {
                    label: 'Task',
                    w: 0.75
                }], limitList(summary.routine, 10).map(function(item) {
                    var time = item.time ? item.time : 'Anytime';
                    return [time, item.task];
                }));

                drawTableSection('Time Tracker', themes.tracker, [{
                    label: 'Subject',
                    w: 0.6
                }, {
                    label: 'Minutes',
                    w: 0.4
                }], limitList(summary.tracker.entries || [], 10).map(function(entry) {
                    return [entry.subject || 'General', (entry.minutes || 0) + ' min'];
                }));

                drawTableSection('Syllabus Topics', themes.syllabus, [{
                    label: 'Subject',
                    w: 0.35
                }, {
                    label: 'Topic',
                    w: 0.65
                }], limitList(APP_DATA.studentTools.syllabus, 10).map(function(item) {
                    return [item.subject, item.topic];
                }));

                drawTableSection('Exam Dates', themes.exams, [{
                    label: 'Exam',
                    w: 0.6
                }, {
                    label: 'Date',
                    w: 0.4
                }], limitList(APP_DATA.studentTools.exams, 10).map(function(item) {
                    return [item.name, item.date];
                }));

                drawTableSection('Marks / Grades', themes.grades, [{
                    label: 'Subject',
                    w: 0.45
                }, {
                    label: 'Score',
                    w: 0.25
                }, {
                    label: 'Percent',
                    w: 0.3
                }], limitList(APP_DATA.studentTools.grades, 10).map(function(item) {
                    var pct = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;
                    return [item.subject, item.score + '/' + item.max, pct + '%'];
                }));

                drawTableSection('Weak Subjects & Corrections', themes.listBlue, [{
                    label: '#',
                    w: 0.1
                }, {
                    label: 'Item',
                    w: 0.9
                }], limitList(APP_DATA.studentTools.items.weak, 8).map(function(item, idx) {
                    return [String(idx + 1), item];
                }));

                if (APP_DATA.studentTools.sessions.length) {
                    drawTableSection('One-to-One Sessions', themes.overview, [{
                        label: 'Topic',
                        w: 0.45
                    }, {
                        label: 'Mentor',
                        w: 0.25
                    }, {
                        label: 'Schedule',
                        w: 0.3
                    }], limitList(APP_DATA.studentTools.sessions, 8).map(function(item) {
                        var schedule = (item.date || '-') + (item.time ? (' ' + item.time) : '');
                        return [item.topic || 'Session', item.teacher || 'Mentor', schedule];
                    }));
                }

                doc.save('Student_Plan.pdf');
                showToast('✅', 'Student plan downloaded!');
                return;
            }

            var lines = [
                'STUDENT PLAN - DIGITAL TWIN',
                'Generated: ' + dateStr,
                '',
                'PROFILE: ' + profile,
                'LEVEL: ' + level,
                '',
                'NEXT STEP: ' + (APP_DATA.studentTools.nextStep || 'Not set'),
                '',
                'GOALS TO ACHIEVE:',
                summary.goals.join('\n'),
                '',
                'THINGS ACHIEVED:',
                summary.achieved.join('\n'),
                '',
                'ACCURACY: ' + summary.accuracy + '%',
                '',
                'DAILY ROUTINE:',
                summary.routine.map(function(item) {
                    return (item.time ? item.time + ' - ' : '') + item.task;
                }).join('\n'),
                '',
                'TIME TRACKER: ' + getTrackerTotal() + ' min logged',
                '',
                'SYLLABUS TOPICS:',
                (APP_DATA.studentTools.syllabus || []).map(function(item) {
                    return item.subject + ' - ' + item.topic;
                }).join('\n'),
                '',
                'EXAM DATES:',
                (APP_DATA.studentTools.exams || []).map(function(item) {
                    return item.name + ' - ' + item.date;
                }).join('\n'),
                '',
                'MARKS / GRADES:',
                (APP_DATA.studentTools.grades || []).map(function(item) {
                    var pct = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;
                    return item.subject + ' - ' + item.score + '/' + item.max + ' (' + pct + '%)';
                }).join('\n'),
                '',
                'WEAK SUBJECTS:',
                APP_DATA.studentTools.items.weak.join('\n')
            ];
            var blob = new Blob([lines.join('\n')], {
                type: 'text/plain'
            });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'Student_Plan.txt';
            a.click();
            showToast('✅', 'Student plan downloaded as text!');
        }

        function setDashboardOpen(isOpen, persist) {
            var panel = document.getElementById('dashboard-panel');
            var btn = document.getElementById('dash-toggle');
            if (!panel || !btn) return;
            panel.classList.toggle('open', isOpen);
            btn.classList.toggle('open', isOpen);
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
            var label = btn.querySelector('.dash-toggle-text');
            if (label) label.textContent = isOpen ? 'Hide Personalised Dashboard' : 'Open Personalised Dashboard';
            if (persist) {
                try {
                    localStorage.setItem('dt_dashboard_open', isOpen ? '1' : '0');
                } catch (e) {}
            }
        }

        function toggleDashboard(forceOpen) {
            var panel = document.getElementById('dashboard-panel');
            if (!panel) return;
            var isOpen = panel.classList.contains('open');
            var next = (typeof forceOpen === 'boolean') ? forceOpen : !isOpen;
            setDashboardOpen(next, true);
            if (next) {
                var btn = document.getElementById('dash-toggle');
                if (btn) {
                    btn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        }

        function openDashboardShortcut() {
            setDashboardOpen(true, true);
        }

        function initDashboardToggle() {
            var saved = '0';
            try {
                saved = localStorage.getItem('dt_dashboard_open') || '0';
            } catch (e) {}
            setDashboardOpen(saved === '1', false);
        }

        function setCareerExplorerOpen(isOpen, persist) {
            var panel = document.getElementById('career-explorer-body');
            var btn = document.getElementById('career-toggle');
            if (!panel || !btn) return;
            panel.classList.toggle('open', isOpen);
            btn.classList.toggle('open', isOpen);
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
            var label = btn.querySelector('.career-toggle-text');
            if (label) label.textContent = isOpen ? 'Hide Career Explorer' : 'Open Career Explorer';
            if (persist) {
                try {
                    localStorage.setItem('dt_career_open', isOpen ? '1' : '0');
                } catch (e) {}
            }
        }

        function toggleCareerExplorer(forceOpen) {
            var panel = document.getElementById('career-explorer-body');
            if (!panel) return;
            var isOpen = panel.classList.contains('open');
            var next = (typeof forceOpen === 'boolean') ? forceOpen : !isOpen;
            setCareerExplorerOpen(next, true);
            if (next) {
                var btn = document.getElementById('career-toggle');
                if (btn) {
                    btn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        }

        function initCareerExplorerToggle() {
            var saved = '0';
            try {
                saved = localStorage.getItem('dt_career_open') || '0';
            } catch (e) {}
            setCareerExplorerOpen(saved === '1', false);
        }

        function initStudentDashboard() {
            ensureStudentDefaults();
            var type = APP_DATA.studentProfile.type;
            var updated = false;
            if (type === 'school' && !APP_DATA.studentProfile.classLevel) {
                APP_DATA.studentProfile.classLevel = '9';
                updated = true;
            }
            if (type === 'university' && !APP_DATA.studentProfile.uniLevel) {
                APP_DATA.studentProfile.uniLevel = '1st Year';
                updated = true;
            }
            if (updated) syncData();
            renderStudentProfile();
            updateClassChips();
            updateFocusSummary();
            renderNextStep();
            STUDENT_TOOL_KEYS.forEach(function(key) {
                renderToolList(key);
            });
            updateAccuracy();
            renderRoutine();
            renderTimeTracker();
            renderSyllabus();
            renderChapters();
            renderExams();
            renderGrades();
            refreshWeeklySummary();
            renderSessions();
            if (!type) {
                openStudentOnboard();
            } else {
                closeStudentOnboard();
                setTimeout(function() {
                    showToast('👋', type === 'school' ? 'Welcome back, School Student.' : 'Welcome back, College Student.');
                }, 400);
            }
        }

        function initDeferredStartup() {
            renderCareers('all');
            checkSession();
            initStudentDashboard();
            initDashboardToggle();
            initCareerExplorerToggle();
            initFeatureShowcase();
        }

        function scheduleDeferredStartup() {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(initDeferredStartup, {
                    timeout: 1200
                });
            } else {
                window.setTimeout(initDeferredStartup, 250);
            }
        }

        /* ═══ AI MODES ════════════════════════════════════════════════
           4 distinct system prompts, each with personality tone option
        ═══════════════════════════════════════════════════════════════ */
        var AI_MODES = {
            advisor: {
                label: '🎯 Career Advisor',
                friendly: 'You are a warm, encouraging Career Advisor AI for Digital Twin for Students (Eco-Novators). You help Indian students discover their ideal career path through friendly, empathetic guidance. Always address the student by first name if known. Use relatable language, emojis where appropriate, and celebrate their progress. Provide personalised advice based on their background. Focus on: career options, roadmaps, salary expectations in India (LPA), market demand, and actionable first steps. Keep responses under 280 words unless asked for a full plan. End with one encouraging actionable step. Stay on topic — career guidance only.',
                professional: 'You are a Professional Career Advisor AI for Digital Twin for Students (Eco-Novators). Your role is to provide precise, data-driven career guidance to Indian students. Communicate in a structured, formal tone. Base all advice on 2025–2026 Indian and global market data. Include specific salary ranges (LPA), skill requirements, and industry benchmarks. Analyse the student\'s profile systematically and provide structured recommendations. Format responses with clear sections. Keep responses under 280 words unless a full plan is requested. End with one specific, measurable action item. Maintain strict relevance to career guidance.'
            },
            mentor: {
                label: '📚 Skill Mentor',
                friendly: 'You are a supportive Skill Mentor AI for Digital Twin for Students. Your job is to help students build skills in a fun, approachable way. Identify exactly what skills they need, create a learning plan, and recommend specific free/paid resources. Be encouraging and break down complex topics into manageable steps. Focus only on skill development, learning paths, certifications, and projects to build. Reference real platforms: Coursera, YouTube, Udemy, freeCodeCamp, LeetCode, Kaggle, etc. Keep under 280 words. End with one specific learning action for today.',
                professional: 'You are a Skill Development Advisor AI for Digital Twin for Students. Conduct a rigorous skills gap analysis based on the student\'s profile and target career. Map required competencies against current skill level. Provide a structured learning curriculum with: specific resources, estimated timelines, and measurable checkpoints. Reference industry-standard certifications and their ROI. Prioritise skills by market demand and salary impact. All recommendations must be specific, verifiable, and actionable. Keep under 280 words. Conclude with a structured week-one learning plan.'
            },
            coach: {
                label: '🎤 Interview Coach',
                friendly: 'You are a friendly Interview Coach AI for Digital Twin for Students. Help students ace their job and internship interviews with confidence! Cover: common interview questions for their target role, how to answer them (STAR method), what to research beforehand, how to handle nerves, and salary negotiation tips. Give sample answers they can adapt. Be encouraging and practical. Focus only on interview preparation. Keep under 280 words. End with one interview practice task.',
                professional: 'You are a Professional Interview Coach AI for Digital Twin for Students. Provide systematic interview preparation tailored to the student\'s target role and experience level. Cover: technical and behavioural interview frameworks, role-specific question patterns, structured answer methodologies (STAR/CARL), research protocols, and negotiation strategy. Provide concrete example answers that can be customised. Reference current hiring patterns at target companies. Keep under 280 words. Conclude with one specific preparation deliverable.'
            },
            predictor: {
                label: '🔮 Future Predictor',
                friendly: 'You are a Future Career Predictor AI for Digital Twin for Students. Using market trends, AI disruption patterns, and industry data for 2025–2030, help students understand how their chosen career will evolve. Be honest but optimistic. Cover: which roles are growing, which are declining, new opportunities emerging, skills that will be most valuable, and how to future-proof their career. Make it engaging and forward-looking. Keep under 280 words. End with one future-proofing action.',
                professional: 'You are a Career Futures Analyst AI for Digital Twin for Students. Conduct a forward-looking career trajectory analysis based on: automation risk index, AI disruption probability, sector growth projections (2025–2030), emerging role clusters, and skill longevity scores. Cross-reference with World Economic Forum Future of Jobs data and Indian labour market indicators. Provide probability estimates where relevant. Be direct about risks and opportunities. Keep under 280 words. Conclude with a strategic career resilience recommendation.'
            }
        };

        var currentMode = 'advisor';
        var toneIsFriendly = false;
        var chatHistory = [];
        var ttsOn = false;
        var recognition = null;
        var isListening = false;
        var chatOpen = false;

        /* Anti-repeat & memory engine */
        var lastResponses = []; // Stores recent bot replies to detect repetition
        var responseCount = 0; // How many exchanges have happened
        var userProfile = { // Live-built during conversation
            name: '',
            education: '',
            skills: [],
            goals: [],
            interests: [],
            level: 'beginner', // 'beginner' | 'intermediate' | 'advanced'
            lastTopic: ''
        };

        /* Variation phrases injected to prevent robotic repetition */
        var VARIATIONS = [
            "Here's another way to look at this:",
            "Let me break this down differently.",
            "Think of it this way —",
            "A smarter angle here is:",
            "From a different perspective:",
            "Here's what actually matters:",
            "Let me be straight with you —",
            "Real talk:"
        ];

        var FOLLOW_UPS = [
            "What's your current skill level in this area?",
            "Have you already started exploring this, or is this fresh for you?",
            "What's your biggest concern right now — skill gaps or finding direction?",
            "Are you aiming for a job, internship, or just exploring options?",
            "How much time per week can you realistically dedicate to this?",
            "Is there a specific company or role type you're drawn to?",
            "What's holding you back from taking the next step?",
            "Do you prefer working in a team environment or independently?"
        ];

        function isRepeat(resp) {
            var short = resp.substring(0, 80).toLowerCase().replace(/[^a-z]/g, '');
            return lastResponses.some(function(r) {
                return r.substring(0, 80).toLowerCase().replace(/[^a-z]/g, '') === short;
            });
        }

        function antiRepeatWrap(reply) {
            if (isRepeat(reply)) {
                var v = VARIATIONS[Math.floor(Math.random() * VARIATIONS.length)];
                reply = v + ' ' + reply;
            }
            lastResponses.push(reply.substring(0, 80));
            if (lastResponses.length > 8) lastResponses.shift();
            return reply;
        }

        function extractUserProfile(text) {
            var t = text.toLowerCase();
            // Detect education level
            if (t.includes('class 12') || t.includes('12th') || t.includes('school')) userProfile.level = 'beginner';
            else if (t.includes('1st year') || t.includes('first year') || t.includes('fresher')) userProfile.level = 'beginner';
            else if (t.includes('2nd year') || t.includes('3rd year') || t.includes('second') || t.includes('third')) userProfile.level = 'intermediate';
            else if (t.includes('final year') || t.includes('4th year') || t.includes('graduate') || t.includes('mba') || t.includes('mtech')) userProfile.level = 'advanced';
            else if (t.includes('working') || t.includes('professional') || t.includes('experience')) userProfile.level = 'advanced';
            // Extract name patterns like "my name is X" or "I am X"
            var nameMatch = text.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+)/i);
            if (nameMatch && !userProfile.name) userProfile.name = nameMatch[1];
            // Topic detection
            var topics = ['software', 'data', 'ai', 'ml', 'design', 'finance', 'law', 'medicine', 'marketing', 'product'];
            topics.forEach(function(tp) {
                if (t.includes(tp) && !userProfile.lastTopic) userProfile.lastTopic = tp;
            });
        }

        function pickFollowUp() {
            return FOLLOW_UPS[responseCount % FOLLOW_UPS.length];
        }

        function setAIMode(mode, btn) {
            currentMode = mode;
            document.querySelectorAll('.ai-mode-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            if (btn) btn.classList.add('active');
            showToast('🤖', AI_MODES[mode].label + ' activated.');
        }

        function togTone() {
            toneIsFriendly = !toneIsFriendly;
            var sw = document.getElementById('tone-sw');
            var lbl = document.getElementById('tone-lbl');
            if (sw) sw.classList.toggle('on', toneIsFriendly);
            if (lbl) lbl.textContent = toneIsFriendly ? 'Friendly' : 'Pro';
            showToast('💬', toneIsFriendly ? 'Friendly tone activated 😊' : 'Professional tone activated 💼');
        }

        function getSystemPrompt() {
            var m = AI_MODES[currentMode] || AI_MODES.advisor;
            var base = toneIsFriendly ? m.friendly : m.professional;

            // Build rich user context from all available signals
            var ctx = [];
            var name = userProfile.name || APP_DATA.userData.name;
            if (name) ctx.push("The student's name is " + name + ". Address them by name occasionally.");
            if (APP_DATA.userData.role) ctx.push("They are a " + APP_DATA.userData.role + ".");
            if (APP_DATA.userData.city) ctx.push("They are based in " + APP_DATA.userData.city + ".");
            ctx.push("User's apparent experience level: " + userProfile.level + ". Adjust explanation depth accordingly.");
            if (userProfile.lastTopic) ctx.push("Recent topic of interest: " + userProfile.lastTopic + ".");
            if (APP_DATA.careerChoices.length > 0) {
                ctx.push("Careers they have explored on the platform: " + APP_DATA.careerChoices.map(function(c) {
                    return c.title;
                }).join(', ') + ". Reference these naturally.");
            }
            if (chatHistory.length > 2) {
                ctx.push("This is message " + Math.ceil(chatHistory.length / 2) + " in the conversation. Build on previous context.");
            }

            // Anti-repeat directive injected into every prompt
            var antiRepeat = "CRITICAL RULE: You must NEVER repeat a response you have already given in this conversation, even if the user asks a similar question. Always rephrase completely, use different structure, different examples. Vary your sentence openers — avoid starting with the same phrase twice. Never begin with 'Based on your input' or 'Here is your result'. Sound like a real human mentor who knows this student, not a bot.";

            // Human mentor directive
            var humanDir = "Respond like a smart, slightly informal career mentor who genuinely cares. Mix short paragraphs, bullet points, and the occasional direct question. Use the user's name when it adds warmth. End every response with either a specific action step OR a follow-up question that deepens the conversation. Keep under 300 words unless a full roadmap is requested.";

            return base + '\n\nUser Context:\n' + ctx.join('\n') + '\n\n' + antiRepeat + '\n\n' + humanDir;
        }

        /* ═══ CHAT FUNCTIONS ═════════════════════════════════════════ */
        function togChat() {
            chatOpen = !chatOpen;
            var panel = document.getElementById('chat-panel');
            panel.classList.toggle('open', chatOpen);
            if (chatOpen && chatHistory.length === 0) {
                var greeting = toneIsFriendly ?
                    '👋 Hey! I\'m your Digital Twin Career AI. I can help you with career guidance, skill planning, interview prep, or future trends!\n\nTell me about yourself — your education and what you\'re interested in — and I\'ll get started. 🎯' :
                    '👋 Welcome. I\'m the Digital Twin Career Advisor. I operate in 4 modes: Career Advisor, Skill Mentor, Interview Coach, and Future Predictor.\n\nPlease share your education background, current skills, and career objectives for a personalised analysis.';
                addBotMsg(greeting);
                document.getElementById('cp-inp').focus();
            }
        }

        function addBotMsg(text) {
            var msgs = document.getElementById('cp-msgs');
            var div = document.createElement('div');
            div.className = 'msg bot';
            div.innerHTML = formatBotMessage(text);
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
            if (ttsOn) speak(String(text).replace(/\*\*(.*?)\*\*/g, '$1'));
        }

        function addUserMsg(text) {
            var msgs = document.getElementById('cp-msgs');
            var div = document.createElement('div');
            div.className = 'msg user';
            div.textContent = text;
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }

        function showTyping() {
            var msgs = document.getElementById('cp-msgs');
            var div = document.createElement('div');
            div.className = 'msg typing';
            div.id = 'typing-ind';
            div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }

        function removeTyping() {
            var el = document.getElementById('typing-ind');
            if (el) el.remove();
        }

        function setAgentActive(agent) {
            ['manager', 'roadmap', 'skill', 'alert', 'intern'].forEach(function(c) {
                var el = document.getElementById('chip-' + c);
                if (el) el.classList.toggle('active', c === agent);
            });
        }

        function detectAgent(text) {
            var t = text.toLowerCase();
            if (t.includes('roadmap') || t.includes('plan') || t.includes('steps')) return 'roadmap';
            if (t.includes('skill') || t.includes('learn') || t.includes('gap')) return 'skill';
            if (t.includes('trend') || t.includes('demand') || t.includes('market') || t.includes('future') || t.includes('predict')) return 'alert';
            if (t.includes('intern') || t.includes('job') || t.includes('apply') || t.includes('interview')) return 'intern';
            return 'manager';
        }

        function sendMsg() {
            if (!checkPremiumAccess('AI Advisor')) return;
            var inp = document.getElementById('cp-inp');
            var text = inp.value.trim();
            if (!text) return;
            inp.value = '';
            addUserMsg(text);

            // Extract user signals from every message
            extractUserProfile(text);
            responseCount++;

            chatHistory.push({
                role: 'user',
                content: text
            });
            setAgentActive(detectAgent(text));
            showTyping();

            // Store in APP_DATA
            APP_DATA.AIResponses.push({
                mode: currentMode,
                tone: toneIsFriendly ? 'friendly' : 'professional',
                userMsg: text,
                aiReply: '',
                timestamp: new Date().toISOString()
            });

            if (CFG.demoMode) {
                var delay = 900 + Math.random() * 800; // Human-like typing delay
                setTimeout(function() {
                    removeTyping();
                    var demo = getDemoResp(text, currentMode);
                    var finalReply = antiRepeatWrap(demo);
                    addBotMsg(finalReply);
                    chatHistory.push({
                        role: 'assistant',
                        content: finalReply
                    });
                    if (APP_DATA.AIResponses.length) APP_DATA.AIResponses[APP_DATA.AIResponses.length - 1].aiReply = finalReply;
                    syncData();
                    setAgentActive('manager');
                }, delay);
                return;
            }

            fetch(CFG.aiApiEndpoint, {
                    method: 'POST',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (APP_DATA.userData.token || '')
                    },
                    body: JSON.stringify({
                        max_tokens: 1024,
                        system: getSystemPrompt(),
                        messages: chatHistory.slice(-14)
                    })
                })
                .then(function(r) {
                    return r.text().then(function(raw) {
                        var parsed = {};
                        try {
                            parsed = JSON.parse(raw);
                        } catch (e) {
                            parsed = {
                                error: 'Invalid response from AI service.'
                            };
                        }
                        if (r.status === 401) {
                            // Session expired mid-use — silently re-validate
                            validateSessionWithServer().then(function(ok) {
                                if (!ok) {
                                    APP_DATA.userData.token = null;
                                    setLoggedIn(false);
                                    openLoginGate();
                                    showToast('🔒', 'Session expired. Please sign in again.');
                                }
                            });
                            throw new Error('Session expired. Please sign in again.');
                        }
                        if (!r.ok) {
                            throw new Error(parsed.error || ('AI request failed with status ' + r.status));
                        }
                        return parsed;
                    });
                })
                .then(function(d) {
                    removeTyping();
                    var raw = (d.content && d.content[0] && d.content[0].text) ? d.content[0].text : "Hmm, something went wrong on my end. Mind trying that again?";
                    var reply = antiRepeatWrap(raw);
                    addBotMsg(reply);
                    chatHistory.push({
                        role: 'assistant',
                        content: reply
                    });
                    if (APP_DATA.AIResponses.length) APP_DATA.AIResponses[APP_DATA.AIResponses.length - 1].aiReply = reply;
                    syncData();
                    setAgentActive('manager');
                })
                .catch(function(err) {
                    removeTyping();
                    logClientError('AI request failed', err);
                    showToast('⚠️', 'Live AI temporarily unavailable. Showing smart fallback response.');
                    var demo = getDemoResp(text, currentMode);
                    var finalReply = antiRepeatWrap(demo);
                    addBotMsg(finalReply);
                    chatHistory.push({
                        role: 'assistant',
                        content: finalReply
                    });
                    if (APP_DATA.AIResponses.length) APP_DATA.AIResponses[APP_DATA.AIResponses.length - 1].aiReply = finalReply;
                    syncData();
                    setAgentActive('manager');
                });
        }

        /* ═══ SMART DEMO RESPONSES — human-mentor, mode-aware, anti-repeat ════════ */
        function getDemoResp(text, mode) {
            var t = text.toLowerCase();
            mode = mode || 'advisor';
            var n = userProfile.name ? ', ' + userProfile.name : '';
            var lvl = userProfile.level;
            var rc = responseCount;

            // ── INTERVIEW COACH MODE ────────────────────────────────────────────────
            if (mode === 'coach') {
                if (t.includes('tell me') || t.includes('yourself') || t.includes('introduce')) {
                    if (rc % 2 === 0) {
                        return 'The "tell me about yourself" question trips up more candidates than any technical question — not because it\'s hard, but because people haven\'t practised it.\n\nHere\'s a structure that works every time' + n + ':\n\n🎯 **The 3-Part Formula:**\n• **Past** — Where you come from (education + key experience)\n• **Present** — What you\'re doing now and what you\'re good at\n• **Future** — Why this role/company excites you\n\nExample opener: *"I\'m a final-year CSE student with a strong focus on backend systems. I\'ve spent the last 6 months building APIs and interning at a startup where I cut response times by 40%..."*\n\nKeep it under 90 seconds. Confident, not rehearsed.\n\n🔁 What field are you interviewing for? I\'ll tailor a version for your profile.';
                    } else {
                        return 'Let me give you a different angle on this' + n + ' — most people over-prepare the content and under-prepare the *delivery*.\n\nYour answer should sound like a story, not a CV reading.\n\n💡 **The PAST → PRESENT → PULL formula:**\n- PAST: One defining experience that shaped you\n- PRESENT: What that taught you / what you\'re skilled at now\n- PULL: What specifically draws you to *this* opportunity\n\nPro tip: End with a question back at them — *"I\'d love to know which part of my background you\'d want to explore further."* It turns a monologue into a conversation.\n\n✅ Write your version out and share it here — I\'ll give direct feedback.';
                    }
                }
                if (t.includes('salary') || t.includes('package') || t.includes('negotiate')) {
                    return 'Salary negotiation is where most students leave money on the table — because they either stay silent or say a number first' + n + '.\n\n**Golden rules:**\n\n1. Never give a number first. Ask: *"What\'s the budgeted range for this role?"*\n2. Anchor high — research the 75th percentile on Glassdoor/LinkedIn Salary\n3. Negotiate the total package, not just base (ESOPs, joining bonus, learning budget)\n4. Be silent after stating your number — silence is uncomfortable and they\'ll fill it\n\n📍 For freshers in India (2025-26):\n• Product companies: ₹10–20 LPA (negotiable)\n• Startups: ₹5–12 LPA + equity\n• Service companies: less room to negotiate, focus on role quality\n\nWhat stage are you at — first offer received, or preparing in advance?';
                }
                if (t.includes('technical') || t.includes('coding') || t.includes('system design')) {
                    return 'Technical interviews have a pattern' + n + ' — once you see it, they become much more manageable.\n\n**The 4-layer framework for any technical question:**\n\n1. **Clarify** — Ask 2 questions before coding. Shows you think before acting.\n2. **Brute Force** — Give the naive solution first, then say *"but we can do better"*\n3. **Optimise** — Walk through your thinking out loud\n4. **Edge Cases** — What breaks your solution? Mention it before they ask.\n\nFor System Design (senior/experienced roles):\n• Start with requirements gathering (functional vs non-functional)\n• Estimate scale, then design components\n• Discuss trade-offs — interviewers love hearing "I chose X over Y because..."\n\n🎯 Which company/role are you prepping for? The question patterns vary a lot between Google, startups, and service companies.';
                }
                return 'Let\'s get into interview prep mode' + n + '.\n\nHere\'s what I want to know first: **What type of role** are you targeting?\n\n- 💻 Software Engineering (DSA + System Design)\n- 📊 Data/Analytics (SQL + Case Studies)\n- 🎯 Product Management (Behavioural + Product Sense)\n- 💼 Business/Finance (Case Studies + Behavioural)\n- 🎨 Design (Portfolio Review + Design Thinking)\n\nTell me the role and I\'ll walk you through exactly how companies in that domain interview — question patterns, what they\'re really testing, and how to stand out.';
            }

            // ── FUTURE PREDICTOR MODE ───────────────────────────────────────────────
            if (mode === 'predictor') {
                if (t.includes('ai') || t.includes('automation') || t.includes('replace') || t.includes('job')) {
                    if (rc % 2 === 0) {
                        return 'Honestly' + n + ', the "AI will take all jobs" narrative is mostly noise. The truth is more nuanced — and more interesting.\n\n**What AI is actually doing (2025–2026):**\n• Replacing *tasks*, not *roles*\n• Junior data entry, basic code review, templated writing — yes, at risk\n• Roles requiring judgment, creativity, and domain expertise — growing fast\n\n📈 **Fastest growing in India right now:**\n• AI Engineers / Prompt Engineers (+45% YoY)\n• Cybersecurity (critical shortage — 3M unfilled roles globally)\n• Healthcare Tech (post-COVID digital health boom)\n• Climate Tech / Sustainability roles (new regulatory demand)\n\nThe students who\'ll win aren\'t the ones *worried* about AI — they\'re the ones building with it.\n\nWhat career are you thinking about? I\'ll give you a specific disruption probability score.';
                    } else {
                        return 'Here\'s a different frame for thinking about this' + n + ':\n\nInstead of asking *"will AI take my job?"*, ask *"how do I become the person who works with AI, not against it?"*\n\n🔮 **The skills that will hold their value through 2030:**\n- Systems thinking (understanding how things connect)\n- Human judgment in high-stakes decisions\n- Creative problem-framing (not just solving)\n- Cross-domain fluency (knowing tech AND domain)\n\n⚠️ **Vulnerable skills:**\n- Routine testing / manual QA (60-70% automation probability)\n- Basic bookkeeping (accounting software is eating this)\n- Junior copywriting without strategy\n\nThe sweet spot? Roles where AI makes you 10x more productive, not replaceable.\n\nWhich field are you in? I\'ll map the specific automation risk for your career path.';
                    }
                }
                if (t.includes('salary') || t.includes('future') || t.includes('grow') || t.includes('trend')) {
                    return 'Career trajectories are shifting faster than most people realise' + n + '.\n\n**High-conviction bets for 2025–2030:**\n\n🚀 **Breakout fields:**\n• AI/ML Infrastructure → demand growing faster than supply\n• Health informatics → ₹8–35 LPA, largely overlooked by students\n• Climate tech → early stage but policy-driven growth\n• EdTech 2.0 → AI-personalised learning is a massive unsolved problem\n\n📉 **Slowing down:**\n• Generic IT services (commoditising fast)\n• Traditional BPO/back-office work\n• Basic Android app development (market saturated)\n\n💡 The meta-trend: Hybrid skills > pure specialists in most domains. A lawyer who understands LegalTech. An accountant who can model with Python. A doctor who reads clinical data pipelines.\n\nWhat\'s your current domain? I\'ll tell you exactly what hybrid skills would 3x your value by 2028.';
                }
                return 'Future-proofing your career is really about making a few high-leverage bets' + n + '.\n\nLet me ask you something direct: **Are you currently in a field that\'s growing, stable, or at risk?**\n\nTell me what you\'re studying or working in, and I\'ll give you a brutally honest assessment of where that field is heading — growth sectors, salary curves, and the one skill that would make you irreplaceable in it by 2028.';
            }

            // ── SKILL MENTOR MODE ───────────────────────────────────────────────────
            if (mode === 'mentor') {
                if (t.includes('python') || t.includes('code') || t.includes('programming')) {
                    if (lvl === 'beginner') {
                        return 'Starting with Python is genuinely one of the best decisions you can make right now' + n + '.\n\nHere\'s the thing — most beginners waste 2 months on syntax tutorials without building anything real. Let\'s skip that.\n\n**Your first 30 days — practical approach:**\n\n📅 **Week 1–2:**\n→ CS50P by Harvard (free on edX) — the best intro course, hands down\n→ Build: a simple quiz app, then a basic calculator\n\n📅 **Week 3–4:**\n→ Lists, dictionaries, file handling (the 20% of Python you\'ll use 80% of the time)\n→ Build: a contact book that saves to a file\n\n📅 **Month 2:**\n→ Pick ONE direction: Data (Pandas) OR Web (Flask) OR Automation\n→ Your choice here shapes everything that comes next\n\nFree resources: Python.org tutorial → Real Python → CS50P\n\n✅ Which direction interests you more — data, web, or automation?';
                    } else {
                        return 'Since you\'re past the basics' + n + ', the next level is less about *knowing* Python and more about *thinking in Python*.\n\n**Where most intermediate devs plateau and how to break through:**\n\n🔧 **Technical gaps to close:**\n• Generators & context managers (memory efficiency)\n• Async/await (crucial for production-level code)\n• Testing (pytest) — most devs skip this, don\'t be one of them\n• Docker + deployment (your code isn\'t useful until it\'s live)\n\n📌 **Projects that signal seniority to employers:**\n1. A REST API with auth (FastAPI + PostgreSQL)\n2. A data pipeline from raw CSV to dashboard\n3. An open-source contribution (even fixing docs counts)\n\n🎯 The gap between "I know Python" and "I can ship production Python" is these three things: tests, type hints, and deployment.\n\nWhich of these feels weakest for you right now?';
                    }
                }
                if (t.includes('dsa') || t.includes('leetcode') || t.includes('algorithm') || t.includes('data structure')) {
                    return 'DSA prep has a reputation for being grinding — but it doesn\'t have to be' + n + '.\n\n**The 80/20 approach that actually works:**\n\n🎯 **Focus zones (in order):**\n1. Arrays + Strings (30% of interview questions)\n2. Hash Maps (makes array problems 5x easier)\n3. Trees + Recursion (interviews love these)\n4. Dynamic Programming (only for top-tier companies)\n\n📌 **Strategy:**\n- Do NOT solve random LeetCode problems. Use a structured list (Neetcode 150 or Blind 75)\n- After solving, always look at the optimal solution even if yours passes\n- Time yourself from day 30 onwards (interviews are timed)\n\n📈 **Realistic timeline:**\n• Beginner → ready for internships: 3–4 months (1 hr/day)\n• Internship → product company placement: 6–8 months\n\nWhat\'s your current level? (Never touched / done some easy / comfortable with mediums?)';
                }
                return 'Skill building works best when it\'s targeted' + n + '.\n\nI can help you build a week-by-week learning plan — but I need a bit more to work with.\n\nTell me:\n1. **Target role** (e.g., "Software Engineer at a product company")\n2. **Current skills** (what do you already know?)\n3. **Available time** (hours per week realistically)\n\nWith that, I\'ll cut straight to what you actually need to learn — no fluff, no generic course lists.';
            }

            // ── ADVISOR MODE (default) ──────────────────────────────────────────────
            // — Software/Developer
            if (t.includes('software') || t.includes('developer') || t.includes('swe') || t.includes('coding')) {
                var variants = [
                    'Looking at your interest in software' + n + ', you\'re entering one of the most in-demand fields in India right now — but the path matters a lot.\n\n**Where most students go wrong:**\nThey learn to code but never build. Hiring managers don\'t want to see tutorial projects — they want to see *your* problems solved in code.\n\n**A realistic 12-month path:**\n\n📍 **Months 1–3** — Foundation\n• Pick Python or JavaScript (not both)\n• Build 2 projects from your own ideas\n• Learn Git properly (not just "git push")\n\n📍 **Months 4–8** — Depth\n• DSA on LeetCode (50 mediums minimum)\n• One specialisation: Backend / Frontend / ML\n• Apply for internships from month 5\n\n📍 **Months 9–12** — Job ready\n• System design basics\n• 2 production-quality portfolio projects\n• Target ₹8–15 LPA for first role\n\n🔔 Market note: Full-stack + AI integration skills = 40% higher offers in 2025–26.\n\nAre you leaning more toward product companies (like Zomato, Razorpay) or service companies (Infosys, Wipro)? The prep strategy differs significantly.',

                    'Software engineering is a broad field' + n + ' — and the honest truth is, *which type* of SWE you want to be matters more than just "learning to code."\n\n**Three paths, very different prep:**\n\n🏗 **Product SWE** (Swiggy, Razorpay, Google)\n→ DSA-heavy interviews, system design, strong CS fundamentals\n→ Salary: ₹12–40 LPA entry | 2–3 years prep for top tier\n\n🔧 **Startup SWE** (Early-stage, Series A/B)\n→ Ship fast, wear many hats, less DSA focus, more product sense\n→ Salary: ₹6–15 LPA + equity | 6–8 months prep\n\n🏢 **Service SWE** (TCS, Infosys, Accenture)\n→ Aptitude tests + basic coding, less competitive\n→ Salary: ₹3.5–6 LPA | Stepping stone, not end goal\n\nFrom what you\'ve shared, which of these feels most aligned with where you want to be in 3 years?'
                ];
                return variants[rc % variants.length];
            }

            // — Data Science / Analyst
            if (t.includes('data science') || t.includes('data scientist') || t.includes('ml') || t.includes('machine learning')) {
                return 'Data Science is one of those fields where the entry bar looks low but the real ceiling is very high' + n + '.\n\n**Where you actually need to start (not where everyone tells you):**\n\nMost people jump into ML courses before their math and Python are solid. That\'s why they plateau at "completed courses" without jobs.\n\n**The honest roadmap:**\n\n🔢 **Month 1–2** — Mathematics & Python (non-negotiable)\n• Statistics: Mean/Variance/Distributions/Hypothesis Testing\n• Python: Pandas, NumPy, Matplotlib — fluency, not familiarity\n• SQL: You\'ll use this daily in any data job\n\n🤖 **Month 3–4** — Machine Learning\n• Scikit-Learn for classical ML\n• One Kaggle competition completed (not just entered)\n\n📊 **Month 5–6** — Portfolio\n• 3 end-to-end projects with GitHub writeups\n• IBM Data Science or Google cert (nice to have, not magic)\n\n💼 **Salary trajectory:** ₹4–8 LPA (junior) → ₹15–30 LPA (3 yrs) → ₹30–60 LPA (senior/staff)\n\nWhat\'s your current math comfort level? Honest answer helps me calibrate the plan.';
            }

            // — AI/ML specifically
            if (t.includes('artificial intelligence') || t.includes('deep learning') || t.includes('neural') || t.includes('llm') || t.includes('ai engineer')) {
                return 'AI Engineering is the highest-demand, highest-ceiling career right now — but it\'s also the most misunderstood' + n + '.\n\n**What AI Engineers actually do (vs what people think):**\n• Not: building GPT from scratch\n• Actually: fine-tuning models, building pipelines, deploying AI systems at scale\n\n**The skills that are actually getting people hired in 2025–26:**\n\n🔧 **Core stack:**\n• Python (fluent, not just functional)\n• PyTorch OR TensorFlow (pick one, go deep)\n• HuggingFace Transformers (this is the industry standard now)\n• MLOps: MLflow + FastAPI + Docker for deployment\n\n☁️ **Cloud:** AWS SageMaker or GCP Vertex AI — at least one\n\n🎯 **Portfolio projects that stand out:**\n1. Fine-tuned LLM on custom data\n2. Computer Vision system deployed on a web app\n3. End-to-end ML pipeline with monitoring\n\n💡 Honest reality check: This field moves fast. A project you build today might use outdated tools in 12 months. The key is learning *how to learn* in this space.\n\nWhat\'s your current foundation — have you done any ML coursework yet?';
            }

            // — Design/UX
            if (t.includes('design') || t.includes('ux') || t.includes('ui') || t.includes('figma')) {
                return 'UX/Product Design is fascinating because it sits at the intersection of psychology, business, and tech' + n + ' — and Indian companies are massively undersupplied with good designers.\n\n**What separates good designers from great ones:**\nIt\'s not Figma skills. Everyone has Figma skills. It\'s the *thinking* — understanding *why* users behave a certain way.\n\n**Starting strong:**\n\n🎨 **Month 1–2:**\n• Learn Figma (free — YouTube + Figma community files)\n• Study 5 apps you use daily: WHY did they make those design choices?\n• Book: "Don\'t Make Me Think" by Steve Krug (read this first)\n\n📐 **Month 3–4:**\n• Redesign 3 real apps with documented reasoning\n• Learn basic user research methods (interviews + usability testing)\n• Behance/Dribbble portfolio — quality > quantity\n\n💼 **Finding work:**\n• Freelance first — Upwork, local startups, college projects\n• Internships: LinkedIn + AngelList\n• Entry: ₹5–10 LPA | 3–5 years: ₹18–35 LPA at product companies\n\nDo you have any design work yet, or are you starting from zero?';
            }

            // — Finance/CA/Investment banking
            if (t.includes('finance') || t.includes('ca') || t.includes('chartered') || t.includes('investment') || t.includes('banking')) {
                return 'Finance careers in India have two very different tracks' + n + ' — and the preparation is almost completely different.\n\n**Track A: CA / Audit / Tax**\n→ Clear ICAI exams (Foundation → Inter → Final)\n→ 3-year articleship — choose a Big 4 if possible\n→ Salary: ₹7–15 LPA post-qualification, ₹25–50 LPA in 10 years\n→ Timeline: 4–5 years. Disciplined, structured career.\n\n**Track B: Investment Banking / Private Equity**\n→ Top MBA or very strong undergraduate + internships\n→ CFA Level 1 differentiates you significantly\n→ Financial modelling (DCF, LBO) is table stakes\n→ Entry: ₹12–25 LPA | ceiling: very high with the right firm\n\n**Both tracks:** Excel + PowerBI fluency is non-negotiable. Python for finance is increasingly valued.\n\n💡 Most people in India default to CA without exploring the IB path. Both are excellent, but the lifestyle and trajectory differ a lot.\n\nWhich track resonates more with you — the technical CA route, or the high-pressure finance/banking path?';
            }

            // — Medicine/Healthcare
            if (t.includes('doctor') || t.includes('medicine') || t.includes('mbbs') || t.includes('medical') || t.includes('neet')) {
                return 'Medicine is one of the most respected and financially rewarding careers in India — and also one of the longest commitments' + n + '.\n\n**The honest reality of MBBS:**\n• 5.5 years (4.5 + 1 year internship)\n• PG entrance (NEET-PG) is the real game-changer\n• Salary without PG: ₹5–12 LPA | With PG specialisation: ₹20–80+ LPA\n\n**Highest demand specialisations (2025–30):**\n• Cardiology, Neurology — always in demand\n• Psychiatry — massively undersupplied in India\n• Radiology — AI is augmenting, not replacing, high value\n• Emergency Medicine — new but growing fast\n\n**If you haven\'t cleared NEET yet:**\nThe most important thing is focusing your prep — specifically on NCERT Biology + Physics for theory, and solving past papers from 2018–2024 rigorously.\n\n**Alternative healthcare paths** (if not MBBS):\n• Physiotherapy, Occupational Therapy, Clinical Psychology — shorter timeline, good scope\n\nAre you currently preparing for NEET, or already in MBBS?';
            }

            // — Entrepreneurship
            if (t.includes('startup') || t.includes('entrepreneur') || t.includes('business') || t.includes('own company')) {
                return 'Entrepreneurship is the one career where there\'s no syllabus — which is both the most exciting and most terrifying part' + n + '.\n\n**The honest mentor\'s view:**\nMost successful founders didn\'t start with a big idea. They started with a deep understanding of a specific problem — usually one they faced themselves.\n\n**What actually matters early on:**\n\n🎯 **Phase 1 — Before the idea:**\n• Work in a fast-growing startup for 1–2 years first (learn the machine from inside)\n• Build a specific domain expertise — generalists struggle to find PMF\n• Talk to 20 potential customers before writing a single line of code\n\n💡 **Phase 2 — Validating:**\n• Build the smallest possible thing that tests your core assumption\n• First 10 paying customers > first 1000 free users\n\n💰 **Ecosystem in India:**\n• Seed funding: ₹25L–3Cr for validated MVPs\n• Incubators: IIM-A CIIE, IIT incubators, Y Combinator (India-friendly now)\n\nWhat problem are you thinking about solving? Even a rough area would help me give you more specific direction.';
            }

            // — Generic / first message
            var openers = [
                'Good to connect' + n + '! I\'m your Career AI — part mentor, part strategist, part honest friend.\n\nTo give you something actually useful (not generic advice), I need to understand your situation first.\n\nTell me:\n• What you\'re currently studying / doing\n• What excites you most as a career\n• What\'s your biggest worry or confusion right now\n\nThe more specific you are, the more specific I can be. What\'s on your mind?',
                'Hey' + n + '! Quick question before I start giving advice — what\'s the *actual* thing on your mind right now?\n\nIs it:\n- 🎯 "I have no idea what career to choose"\n- 📊 "I know the field, I need a roadmap"\n- 💼 "I need internship/job guidance"\n- 🔮 "I want to know where my field is heading"\n- 🎤 "I need interview prep help"\n\nTell me which fits — or describe your situation in your own words. No right answer here.',
                'Before I give you a plan' + n + ', I want to understand something: **what does success look like for you in 5 years?**\n\nNot in terms of job title — but lifestyle, impact, what you\'re building.\n\nA lot of career advice gets this backwards: it starts with "what\'s in demand" instead of "what fits you." Let\'s start with you.'
            ];
            return openers[rc % openers.length];
        }



        /* ═══ VOICE ══════════════════════════════════════════════════ */
        function togVoice() {
            var micBtn = document.getElementById('cp-mic');
            var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) {
                showToast('⚠️', 'Voice requires Chrome or Edge browser.');
                return;
            }
            if (isListening) {
                if (recognition) recognition.stop();
                isListening = false;
                if (micBtn) micBtn.classList.remove('on');
                return;
            }
            recognition = new SR();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-IN';
            recognition.onresult = function(e) {
                var inp = document.getElementById('cp-inp');
                if (inp) {
                    inp.value = e.results[0][0].transcript;
                    sendMsg();
                }
            };
            recognition.onend = function() {
                isListening = false;
                if (micBtn) micBtn.classList.remove('on');
            };
            recognition.onerror = function() {
                isListening = false;
                if (micBtn) micBtn.classList.remove('on');
                showToast('⚠️', 'Voice capture failed. Try again.');
            };
            recognition.start();
            isListening = true;
            if (micBtn) micBtn.classList.add('on');
            showToast('🎤', 'Listening… speak now.');
        }

        function startVoiceFromSection() {
            if (!chatOpen) togChat();
            setTimeout(togVoice, 400);
        }

        function togTTS() {
            ttsOn = !ttsOn;
            var spkBtn = document.getElementById('cp-spk');
            if (spkBtn) spkBtn.classList.toggle('on', ttsOn);
            showToast(ttsOn ? '🔊' : '🔇', ttsOn ? 'Voice responses ON' : 'Voice responses OFF');
        }

        function speak(text) {
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(text.substring(0, 300));
            utt.lang = 'en-IN';
            utt.rate = 0.95;
            utt.pitch = 1;
            window.speechSynthesis.speak(utt);
        }

        function askAICareer(title) {
            togChat();
            var inp = document.getElementById('cp-inp');
            if (inp) {
                inp.value = 'Give me a detailed 3-year career roadmap for becoming a ' + title + '.';
                setTimeout(sendMsg, 300);
            }
        }

        /* ═══ PAGES ══════════════════════════════════════════════════ */
        function goHome() {
            document.querySelectorAll('.page').forEach(function(p) {
                p.classList.remove('active');
            });
            document.getElementById('page-main').classList.add('active');
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        function showTY() {
            document.querySelectorAll('.page').forEach(function(p) {
                p.classList.remove('active');
            });
            document.getElementById('page-ty').classList.add('active');
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        /* ═══ NAV ════════════════════════════════════════════════════ */
        function togMenu() {
            document.getElementById('hbg').classList.toggle('open');
            document.getElementById('mob').classList.toggle('open');
        }
        window.addEventListener('scroll', function() {
            document.getElementById('nav').classList.toggle('sc', window.scrollY > 40);
        });

        /* ═══ DECORATIVE PARALLAX ═════════════════════════════════ */
        function initDecorativeMotion() {
            var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var cursor = document.getElementById('cursor-glow');
            var items = Array.prototype.slice.call(document.querySelectorAll('.parallax'));
            if (reduceMotion || !cursor || items.length === 0) {
                if (cursor) cursor.style.display = 'none';
                return;
            }

            var targetX = 0;
            var targetY = 0;
            var currentX = 0;
            var currentY = 0;
            var baseZ = 7;
            var cursorSize = cursor.offsetWidth || 420;

            function updateCursorSize() {
                cursorSize = cursor.offsetWidth || 420;
            }

            function onMove(x, y) {
                targetX = (x / window.innerWidth) - 0.5;
                targetY = (y / window.innerHeight) - 0.5;
            }

            function handleMouse(e) {
                onMove(e.clientX, e.clientY);
            }

            function handleTouch(e) {
                if (!e.touches || !e.touches[0]) return;
                onMove(e.touches[0].clientX, e.touches[0].clientY);
            }

            function animate() {
                currentX += (targetX - currentX) * 0.12;
                currentY += (targetY - currentY) * 0.12;

                var cx = window.innerWidth / 2 + currentX * 260;
                var cy = window.innerHeight / 2 + currentY * 260;
                cursor.style.transform = 'translate3d(' + (cx - cursorSize / 2) + 'px,' + (cy - cursorSize / 2) + 'px,0)';

                items.forEach(function(el) {
                    var depth = parseFloat(el.getAttribute('data-depth') || '0.12');
                    var tx = currentX * depth * 320;
                    var ty = currentY * depth * 320;
                    el.style.setProperty('--px', tx.toFixed(2) + 'px');
                    el.style.setProperty('--py', ty.toFixed(2) + 'px');
                });

                requestAnimationFrame(animate);
            }

            window.addEventListener('mousemove', handleMouse, {
                passive: true
            });
            window.addEventListener('touchmove', handleTouch, {
                passive: true
            });
            window.addEventListener('resize', updateCursorSize, {
                passive: true
            });
            window.addEventListener('mouseleave', function() {
                targetX = 0;
                targetY = 0;
            }, {
                passive: true
            });

            requestAnimationFrame(animate);
        }

        initDecorativeMotion();

        /* ═══ MODAL ══════════════════════════════════════════════════ */
        function openMod(tab) {
            var settings = arguments.length > 1 && arguments[1] ? arguments[1] : {};
            var ov = document.getElementById('mod-ov');
            var mod = ov ? ov.querySelector('.mod') : null;
            if (mod) {
                mod.classList.toggle('login-only', !!settings.loginOnly);
                mod.classList.toggle('gate-lock', !!settings.gate);
            }
            loginGateActive = !!settings.gate;
            if (ov) ov.classList.add('open');
            swTab(tab || 'su');
            document.body.style.overflow = 'hidden';
        }

        function closeMod() {
            if (loginGateActive) return;
            var ov = document.getElementById('mod-ov');
            if (ov) ov.classList.remove('open');
            var mod = ov ? ov.querySelector('.mod') : null;
            if (mod) mod.classList.remove('login-only', 'gate-lock');
            document.body.style.overflow = '';
        }
        var modOv = document.getElementById('mod-ov');
        if (modOv) {
            modOv.addEventListener('click', function(e) {
                if (e.target === this && !loginGateActive) closeMod();
            });
        }

        function swTab(t) {
            ['su', 'li'].forEach(function(x) {
                var panel = document.getElementById('panel-' + x);
                if (panel) panel.classList.toggle('on', x === t);
                var tab = document.getElementById('tab-' + x);
                if (tab) tab.classList.toggle('on', x === t);
            });
        }

        /* ═══ AUTH ═══════════════════════════════════════════════════ */
        function togEye(id, el) {
            var i = document.getElementById(id);
            if (!i) return;
            i.type = i.type === 'password' ? 'text' : 'password';
            el.textContent = i.type === 'password' ? '👁' : '🙈';
        }

        function showE(id, v) {
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('show', v);
        }

        function isEmail(v) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        }

        function ensureAuthDefaults() {
            if (!APP_DATA.userData || typeof APP_DATA.userData !== 'object') {
                APP_DATA.userData = {
                    name: '',
                    email: '',
                    phone: '',
                    role: '',
                    city: '',
                    signedUpAt: null,
                    loggedIn: false,
                    loggedInAt: null
                };
            }
            if (typeof APP_DATA.userData.loggedIn !== 'boolean') APP_DATA.userData.loggedIn = false;
            if (!('loggedInAt' in APP_DATA.userData)) APP_DATA.userData.loggedInAt = null;
        }

        function isLoggedIn() {
            return !!(APP_DATA.userData && APP_DATA.userData.loggedIn);
        }

        function getUserInitial() {
            var name = (APP_DATA.userData && APP_DATA.userData.name) ? APP_DATA.userData.name.trim() : '';
            if (name) return name.charAt(0).toUpperCase();
            var email = (APP_DATA.userData && APP_DATA.userData.email) ? APP_DATA.userData.email.trim() : '';
            if (email) return email.charAt(0).toUpperCase();
            return 'DT';
        }

        var jsPdfLoadPromise = null;

        function ensureJsPDFLoaded() {
            var existing = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
            if (existing) return Promise.resolve(existing);
            if (!jsPdfLoadPromise) {
                jsPdfLoadPromise = new Promise(function(resolve, reject) {
                    var script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.async = true;
                    script.onload = function() {
                        var loaded = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
                        if (loaded) resolve(loaded);
                        else reject(new Error('jsPDF failed to initialize'));
                    };
                    script.onerror = function() {
                        reject(new Error('jsPDF load failed'));
                    };
                    document.head.appendChild(script);
                });
            }
            return jsPdfLoadPromise;
        }

        function toggleAccountMenu(event) {
            if (event) event.stopPropagation();
            var panel = document.getElementById('nav-account-panel');
            if (!panel) return;
            panel.classList.toggle('open');
        }

        function hideAccountMenu() {
            var panel = document.getElementById('nav-account-panel');
            if (panel) panel.classList.remove('open');
        }

        document.addEventListener('click', function(event) {
            var wrap = document.getElementById('nav-account-wrap');
            var panel = document.getElementById('nav-account-panel');
            if (!wrap || !panel) return;
            if (!wrap.contains(event.target)) panel.classList.remove('open');
        });

        function setLoggedIn(value) {
            ensureAuthDefaults();
            APP_DATA.userData.loggedIn = !!value;
            APP_DATA.userData.loggedInAt = value ? new Date().toISOString() : null;
            syncData();
            updateAuthNav();
        }

        function updateAuthNav() {
            var loggedIn = isLoggedIn();
            var isAdmin = loggedIn && APP_DATA.userData && APP_DATA.userData.role === 'admin';
            var label = document.getElementById('nav-account-label');
            var avatar = document.getElementById('nav-account-avatar');
            var signin = document.getElementById('nav-account-signin');
            var signup = document.getElementById('nav-account-signup');
            var logout = document.getElementById('nav-account-logout');
            var admindb = document.getElementById('nav-account-admindb');
            var sep = document.getElementById('nav-account-sep');
            var mobSignin = document.getElementById('mob-signin');
            var mobSignup = document.getElementById('mob-signup');
            var mobLogout = document.getElementById('mob-logout');
            var mobAdmindb = document.getElementById('mob-admindb');
            if (label) label.textContent = loggedIn ? 'Account' : 'Sign In';
            if (avatar) avatar.textContent = getUserInitial();
            if (signin) signin.style.display = loggedIn ? 'none' : 'flex';
            if (signup) signup.style.display = loggedIn ? 'none' : 'flex';
            if (sep) sep.style.display = loggedIn ? 'block' : 'none';
            if (logout) logout.style.display = loggedIn ? 'flex' : 'none';
            if (admindb) admindb.style.display = isAdmin ? 'flex' : 'none';
            if (mobSignin) mobSignin.style.display = loggedIn ? 'none' : 'block';
            if (mobSignup) mobSignup.style.display = loggedIn ? 'none' : 'block';
            if (mobLogout) mobLogout.style.display = loggedIn ? 'block' : 'none';
            if (mobAdmindb) mobAdmindb.style.display = isAdmin ? 'block' : 'none';
            hideAccountMenu();
        }

        async function openAdminDashboard() {
            try {
                var res = await fetch('/dashboard', {
                    headers: { 'Authorization': 'Bearer ' + (APP_DATA.userData.token || '') }
                });
                if (!res.ok) {
                    showToast('🚫', 'Failed to open Developer DB. Ensure you are an Admin.');
                    return;
                }
                var html = await res.text();
                var newWin = window.open('', '_blank');
                if (newWin) {
                    newWin.document.write(html);
                    newWin.document.close();
                } else {
                    showToast('⚠️', 'Please allow popups to view the dashboard.');
                }
            } catch (err) {
                showToast('❌', 'Error fetching Developer DB.');
            }
        }

        function lockSite() {
            document.body.classList.add('gate-locked');
            var main = document.getElementById('page-main');
            if (main) main.classList.remove('active');
            var ty = document.getElementById('page-ty');
            if (ty) ty.classList.remove('active');
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.remove('active');
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.remove('active');
        }

        function unlockSite() {
            document.body.classList.remove('gate-locked');
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.remove('active');
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.remove('active');
            goHome();
        }

        function openAuthPage() {
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.remove('active');
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.add('active');
            swTab('li');
            var email = document.getElementById('li-e');
            if (email) {
                setTimeout(function() {
                    email.focus();
                }, 50);
            }
        }
        // ── PAYMENT / PREMIUM ──
        function checkPremiumAccess(featureName) {
            // Premium features are temporarily free
            return true;
        }

        function openPricingPage() {
            showToast('💎', 'Premium plans coming soon! All features are currently free.');
        }

        function closePricingPage() {
            // Pricing page removed for now
        }

        function initiatePayment(planId) {
            showToast('🚧', 'Payment integration coming soon. Stay tuned!');
        }

        function openSignupPage() {
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.remove('active');
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.add('active');
            var otp = document.getElementById('page-otp');
            if (otp) otp.classList.remove('active');
            
            var fp = document.getElementById('page-forgot-pw');
            if (fp) fp.classList.remove('active');
            var rp = document.getElementById('page-reset-pw');
            if (rp) rp.classList.remove('active');
            
            var name = document.getElementById('su-n');
            if (name) {
                setTimeout(function() {
                    name.focus();
                }, 50);
            }
        }

        function openLoginPage() {
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.add('active');
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.remove('active');
            var otp = document.getElementById('page-otp');
            if (otp) otp.classList.remove('active');
            
            var fp = document.getElementById('page-forgot-pw');
            if (fp) fp.classList.remove('active');
            var rp = document.getElementById('page-reset-pw');
            if (rp) rp.classList.remove('active');
        }

        function openForgotPasswordPage() {
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.remove('active');
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.remove('active');
            var fp = document.getElementById('page-forgot-pw');
            if (fp) fp.classList.add('active');
            var rp = document.getElementById('page-reset-pw');
            if (rp) rp.classList.remove('active');
        }

        function openResetPasswordPage() {
            var auth = document.getElementById('page-auth');
            if (auth) auth.classList.remove('active');
            var signup = document.getElementById('page-signup');
            if (signup) signup.classList.remove('active');
            var fp = document.getElementById('page-forgot-pw');
            if (fp) fp.classList.remove('active');
            var rp = document.getElementById('page-reset-pw');
            if (rp) rp.classList.add('active');
        }

        function openLoginGate() {
            lockSite();
            closeMod();
            openAuthPage();
        }

        async function doLogout() {
            var ok = window.confirm('Are you sure you want to log out?');
            if (!ok) return false;
            try {
                await fetch('/api/v1/auth/logout', { method: 'POST' });
            } catch (e) {
                console.error(e);
            }
            APP_DATA.userData.token = null;
            setLoggedIn(false);
            loginGateActive = false;
            closeMod();
            openLoginGate();
            showToast('👋', 'You have been signed out.');
            return true;
        }

        async function validateSessionWithServer() {
            var token = APP_DATA.userData && APP_DATA.userData.token;
            if (!token) return false;
            try {
                var r = await fetch('/api/v1/auth/me', {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (r.ok) {
                    var d = await r.json();
                    if (d && d.user) {
                        APP_DATA.userData.name = d.user.name || APP_DATA.userData.name;
                        APP_DATA.userData.email = d.user.email || APP_DATA.userData.email;
                        APP_DATA.userData.role = d.user.role || APP_DATA.userData.role;
                        APP_DATA.userData.emailVerified = d.user.emailVerified;
                        syncData();
                        updateAuthNav();
                    }
                    return true;
                }
                if (r.status === 401) {
                    // Token expired — try silent refresh via HttpOnly cookie
                    var rf = await fetch('/api/v1/auth/refresh', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (rf.ok) {
                        var rd = await rf.json();
                        if (rd && rd.accessToken) {
                            APP_DATA.userData.token = rd.accessToken;
                            if (rd.user) {
                                APP_DATA.userData.name = rd.user.name || APP_DATA.userData.name;
                                APP_DATA.userData.email = rd.user.email || APP_DATA.userData.email;
                                APP_DATA.userData.role = rd.user.role || APP_DATA.userData.role;
                            }
                            syncData();
                            updateAuthNav();
                            return true;
                        }
                    }
                }
            } catch (e) {
                /* Network error — allow site to fall through to lock */
            }
            return false;
        }

        async function initAccessGate() {
            ensureAuthDefaults();
            updateAuthNav();
            if (isLoggedIn()) {
                var valid = await validateSessionWithServer();
                if (valid) {
                    if (APP_DATA.userData.emailVerified === false) {
                        openOTPModal();
                        return;
                    }
                    unlockSite();
                    return;
                }
                // Session invalid or expired — clear stale credentials
                APP_DATA.userData.token = null;
                setLoggedIn(false);
                showToast('🔒', 'Your session expired. Please sign in again.');
            }
            lockSite();
            if (!APP_DATA.studentProfile || !APP_DATA.studentProfile.type) {
                openStudentOnboard();
            } else {
                openLoginGate();
            }
        }

        async function doSignup() {
            var name = document.getElementById('su-n').value.trim();
            var email = document.getElementById('su-e').value.trim();
            var pass = document.getElementById('su-pw').value;
            var ok = true;
            showE('su-ne', !name);
            if (!name) ok = false;
            showE('su-ee', !isEmail(email));
            if (!isEmail(email)) ok = false;
            showE('su-pe', pass.length < 8);
            if (pass.length < 8) ok = false;
            if (!ok) return;
            
            APP_DATA.userData.phone = document.getElementById('su-p').value.trim();
            APP_DATA.userData.role = document.getElementById('su-role').value;
            APP_DATA.userData.city = document.getElementById('su-c').value.trim();
            syncData();
            
            var btn = document.getElementById('su-btn');
            btn.textContent = 'Sending…';
            btn.disabled = true;
            
            try {
                var res = await fetch('/api/v1/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: pass, name: name })
                });
                var data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Signup failed');
                
                // Formspree submission silently fallback
                fetch('https://formspree.io/f/' + CFG.formspreeId, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        _subject: 'New Sign Up — ' + name,
                        Name: name, Email: email, Phone: APP_DATA.userData.phone,
                        Role: APP_DATA.userData.role, City: APP_DATA.userData.city
                    })
                }).catch(function(){});
                
                APP_DATA.userData.token = data.accessToken;
                APP_DATA.userData.name = data.user.name;
                APP_DATA.userData.email = data.user.email;
                APP_DATA.userData.role = data.user.role;
                APP_DATA.userData.emailVerified = data.user.emailVerified;
                setLoggedIn(true);
                loginGateActive = false;
                var signup = document.getElementById('page-signup');
                if (signup) signup.classList.remove('active');
                
                if (!data.user.emailVerified) {
                    openOTPModal();
                } else {
                    closeMod();
                    unlockSite();
                    showToast('✅', 'Account created and signed in successfully.');
                }
            } catch (err) {
                showToast('❌', err.message);
                var pe = document.getElementById('su-pe');
                if (pe) { pe.textContent = err.message; pe.style.display = 'block'; }
            } finally {
                btn.textContent = 'Create My Account →';
                btn.disabled = false;
            }
        }

        async function doForgotPassword() {
            var email = document.getElementById('fp-e').value.trim();
            if (!email || !email.includes('@')) {
                var err = document.getElementById('fp-ee');
                if (err) err.style.display = 'block';
                return;
            }
            var errEl = document.getElementById('fp-ee');
            if (errEl) errEl.style.display = 'none';
            
            try {
                const res = await fetch('/api/v1/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                if (res.ok) {
                    alert('If the email exists, a password reset code has been sent.');
                    sessionStorage.setItem('resetEmail', email);
                    openResetPasswordPage();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Request failed.');
                }
            } catch (err) {
                console.error(err);
                alert('Connection error.');
            }
        }

        async function doResetPassword() {
            var email = sessionStorage.getItem('resetEmail');
            var otpCode = document.getElementById('rp-otp').value.trim();
            var newPassword = document.getElementById('rp-pw').value;
            
            if (!otpCode || otpCode.length !== 6 || newPassword.length < 8) {
                alert('Please check your code and ensure password is min 8 chars.');
                return;
            }
            
            try {
                const res = await fetch('/api/v1/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otpCode, newPassword })
                });
                
                if (res.ok) {
                    alert('Password successfully reset. You can now login.');
                    openLoginPage();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Invalid or expired code.');
                }
            } catch (err) {
                console.error(err);
                alert('Connection error.');
            }
        }

        async function doLogin() {
            var email = document.getElementById('li-e').value.trim();
            var pass = document.getElementById('li-pw').value;
            var btn = document.getElementById('li-btn');
            var ok = true;
            showE('li-ee', !isEmail(email));
            if (!isEmail(email)) ok = false;
            showE('li-pe', !pass);
            if (!pass) ok = false;
            if (!ok) return;
            
            if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
            try {
                var res = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: pass })
                });
                var data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
                
                APP_DATA.userData.token = data.accessToken;
                APP_DATA.userData.name = data.user.name;
                APP_DATA.userData.email = data.user.email;
                APP_DATA.userData.role = data.user.role;
                APP_DATA.userData.emailVerified = data.user.emailVerified;
                setLoggedIn(true);
                loginGateActive = false;
                
                if (!data.user.emailVerified) {
                    openOTPModal();
                } else {
                    closeMod();
                    unlockSite();
                    showToast('✅', 'Signed in successfully.');
                }
            } catch (err) {
                showToast('❌', err.message);
                var pe = document.getElementById('li-pe');
                if (pe) { pe.textContent = err.message; pe.style.display = 'block'; }
            } finally {
                if (btn) { btn.textContent = 'Sign In →'; btn.disabled = false; }
            }
        }

        /* ═══ OTP VERIFICATION ═══════════════════════════════════════ */
        function openOTPModal() {
            closeMod(); // Close any other auth modals
            var otpPage = document.getElementById('page-otp');
            if (otpPage) otpPage.classList.add('active');
            lockSite();
        }

        async function verifyOTP() {
            var otpCode = document.getElementById('otp-input').value.trim();
            var btn = document.getElementById('verify-btn');
            showE('otp-err', !otpCode || otpCode.length !== 6);
            if (!otpCode || otpCode.length !== 6) return;

            btn.textContent = 'Verifying...';
            btn.disabled = true;

            try {
                var res = await fetch('/api/v1/auth/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + APP_DATA.userData.token
                    },
                    body: JSON.stringify({ otpCode: otpCode })
                });
                var data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Verification failed');

                APP_DATA.userData.emailVerified = true;
                syncData();
                var otpPage = document.getElementById('page-otp');
                if (otpPage) otpPage.classList.remove('active');
                
                unlockSite();
                showToast('✅', 'Email verified successfully!');
            } catch (err) {
                showToast('❌', err.message);
                var errEl = document.getElementById('otp-err');
                if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
            } finally {
                btn.textContent = 'Verify Account →';
                btn.disabled = false;
            }
        }

        async function resendOTP() {
            try {
                var res = await fetch('/api/v1/auth/resend-otp', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + APP_DATA.userData.token }
                });
                var data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Failed to resend');
                
                var msg = document.getElementById('otp-msg');
                if (msg) {
                    msg.style.display = 'block';
                    setTimeout(function() { msg.style.display = 'none'; }, 3000);
                }
            } catch (err) {
                showToast('❌', err.message);
            }
        }

        /* ═══ ENHANCED REVIEW FORM ═══════════════════════════════════ */
        function togOtherRole(sel) {
            var wrap = document.getElementById('rr-other-wrap');
            if (wrap) wrap.style.display = sel.value === 'Other' ? 'block' : 'none';
        }

        var selStar = 0;
        var rvColors = ['linear-gradient(135deg,#2a7de1,#5ba3f5)', 'linear-gradient(135deg,#e88c2a,#f5a94e)', 'linear-gradient(135deg,#1a7a4a,#2aad6a)', 'linear-gradient(135deg,#8b2be1,#b85cf5)', 'linear-gradient(135deg,#c0392b,#e74c3c)'];

        function setStar(n) {
            selStar = n;
            document.querySelectorAll('.sb').forEach(function(b, i) {
                b.classList.toggle('lit', i < n);
            });
        }

        /* ── Review form: clear error styles when user types ─────────── */
        function clearRevFieldError(el) {
            if (el) {
                el.classList.remove('fi-error');
            }
        }
        (function() {
            ['rev-email', 'rev-phone'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('input', function() {
                    clearRevFieldError(this);
                    clearContactNote();
                });
            });
        })();

        function clearContactNote() {
            var note = document.getElementById('contact-req-note');
            if (note) note.classList.remove('show');
        }

        /* ── Main review submit function ─────────────────────────────── */
        function postReview() {
            // ── Collect field values ────────────────────────────────────
            var name = document.getElementById('rn').value.trim();
            var roleEl = document.getElementById('rr');
            var role = roleEl.value;
            if (role === 'Other') {
                var otherEl = document.getElementById('rr-other');
                if (otherEl && otherEl.value.trim()) role = otherEl.value.trim();
            }
            var text = document.getElementById('rt').value.trim();
            var revEmail = document.getElementById('rev-email').value.trim();
            var revPhone = document.getElementById('rev-phone').value.trim();
            var waCheck = document.getElementById('rev-wa').checked;
            var note = document.getElementById('contact-req-note');

            // ── Step 1: Basic required fields ──────────────────────────
            if (!name || !text || !selStar) {
                showToast('⚠️', 'Please fill in your name, rating, and review.');
                if (!name) {
                    var rnEl = document.getElementById('rn');
                    rnEl.classList.add('fi-error');
                    rnEl.focus();
                } else if (!text) {
                    var rtEl = document.getElementById('rt');
                    rtEl.classList.add('fi-error');
                    rtEl.focus();
                }
                return;
            }

            // ── Step 2: STRICT — at least one contact required ─────────
            if (!revEmail && !revPhone) {
                // Highlight both fields
                var eEl = document.getElementById('rev-email');
                var pEl = document.getElementById('rev-phone');
                if (eEl) {
                    eEl.classList.add('fi-error');
                }
                if (pEl) {
                    pEl.classList.add('fi-error');
                }
                // Show inline required note
                if (note) note.classList.add('show');
                // Show toast with required message
                showToast('🚫', 'Enter the mandatory credentials');
                // Auto-focus first empty contact field
                if (eEl) eEl.focus();
                return;
            }
            // Clear contact errors if we passed
            ['rev-email', 'rev-phone'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.classList.remove('fi-error');
            });
            if (note) note.classList.remove('show');

            // ── Step 3: Format validation ───────────────────────────────
            if (revEmail && !isEmail(revEmail)) {
                var eEl2 = document.getElementById('rev-email');
                if (eEl2) {
                    eEl2.classList.add('fi-error');
                    eEl2.focus();
                }
                showToast('⚠️', 'Please enter a valid email address.');
                return;
            }
            if (revPhone && !/^[+\d\s\-]{7,15}$/.test(revPhone)) {
                var pEl2 = document.getElementById('rev-phone');
                if (pEl2) {
                    pEl2.classList.add('fi-error');
                    pEl2.focus();
                }
                showToast('⚠️', 'Please enter a valid phone number.');
                return;
            }

            // ── All validations passed — build review card ──────────────
            var stars = '★'.repeat(selStar) + '☆'.repeat(5 - selStar);
            var g = rvColors[Math.floor(Math.random() * rvColors.length)];
            var card = document.createElement('div');
            card.className = 'rvc';
            card.style.animation = 'fu .5s ease both';
            var starsEl = document.createElement('div');
            starsEl.className = 'rvc-st';
            starsEl.textContent = stars;

            var textEl = document.createElement('p');
            textEl.className = 'rvc-tx';
            textEl.textContent = '"' + text + '"';

            var userRow = document.createElement('div');
            userRow.className = 'rvc-u';

            var avatar = document.createElement('div');
            avatar.className = 'rav';
            avatar.style.background = g;
            avatar.textContent = name[0].toUpperCase();

            var metaWrap = document.createElement('div');
            var nameEl = document.createElement('div');
            nameEl.className = 'rnm';
            nameEl.textContent = name;
            var roleElOut = document.createElement('div');
            roleElOut.className = 'rrl';
            roleElOut.textContent = role || 'Community Member';

            metaWrap.appendChild(nameEl);
            metaWrap.appendChild(roleElOut);
            userRow.appendChild(avatar);
            userRow.appendChild(metaWrap);
            card.appendChild(starsEl);
            card.appendChild(textEl);
            card.appendChild(userRow);
            document.getElementById('urlist').prepend(card);
            document.getElementById('rev-ok').classList.add('show');

            // ── Save to APP_DATA ────────────────────────────────────────
            APP_DATA.reviewData = {
                name: name,
                role: role,
                stars: selStar,
                review: text,
                email: revEmail,
                phone: revPhone,
                joinWhatsApp: waCheck,
                submittedAt: new Date().toISOString()
            };
            syncData();

            // ── Send to Formspree ───────────────────────────────────────
            var payload = {
                _subject: 'New Review — ' + name,
                Name: name,
                Role: role,
                Stars: selStar,
                Review: text
            };
            if (revEmail) payload.Email = revEmail;
            if (revPhone) payload.Phone = revPhone;
            if (waCheck) payload['WhatsApp Community'] = 'Yes — wants to join';
            fetch('https://formspree.io/f/' + CFG.formspreeId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            }).catch(function(err) {
                logClientError('Review submit failed', err);
            });

            // ── Reset form fields ───────────────────────────────────────
            ['rn', 'rt', 'rev-email', 'rev-phone'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('rev-wa').checked = false;
            document.getElementById('rr').selectedIndex = 0;
            var owrap = document.getElementById('rr-other-wrap');
            if (owrap) owrap.style.display = 'none';
            setStar(0);

            // ── Post-submission flow ────────────────────────────────────
            if (waCheck) {
                // WhatsApp selected: show overlay with countdown
                showToast('🎉', 'Review submitted successfully 🎉');
                setTimeout(function() {
                    showWAOverlay();
                }, 600);
            } else {
                // Normal flow: go to thank-you
                showToast('🎉', 'Review posted! Redirecting…');
                setTimeout(function() {
                    showTY();
                }, 1800);
            }
        }

        /* ── WhatsApp overlay logic ───────────────────────────────── */
        var waTimer;

        function showWAOverlay() {
            var ov = document.getElementById('wa-overlay');
            if (!ov) return;
            ov.classList.add('show');
            var count = 3;
            var cdEl = document.getElementById('wa-cd');
            var cdTxt = document.getElementById('wa-cd-txt');
            if (cdEl) cdEl.textContent = count;
            if (cdTxt) cdTxt.textContent = '';
            waTimer = setInterval(function() {
                count--;
                if (cdEl) cdEl.textContent = count;
                if (count <= 0) {
                    clearInterval(waTimer);
                    if (cdTxt) cdTxt.textContent = 'Opening WhatsApp…';
                    window.open('https://chat.whatsapp.com/EoeMkImMW9u2NzEn2XTjr9?mode=gi_t', '_blank');
                    setTimeout(function() {
                        closeWAOverlay();
                        showTY();
                    }, 800);
                }
            }, 1000);
        }

        function closeWAOverlay() {
            clearInterval(waTimer);
            var ov = document.getElementById('wa-overlay');
            if (ov) ov.classList.remove('show');
            showTY();
        }

        /* ════ INIT ═══════════════════════════════════════════════════════════════════════ */
        document.addEventListener('click', function(e) {
            var target = e.target.closest('a[href="https://analyzer.niat.tech/"]');
            if (target) {
                if (!checkPremiumAccess('Achievement Analyzer')) {
                    e.preventDefault();
                }
            }
        });

        /* ═══ TOAST ══════════════════════════════════════════════════ */
        var toastT;

        function showToast(icon, msg) {
            clearTimeout(toastT);
            var tic = document.getElementById('tic');
            var tmsg = document.getElementById('tmsg');
            var toast = document.getElementById('toast');
            if (!tic || !tmsg || !toast) return;
            tic.textContent = icon;
            tmsg.textContent = msg;
            toast.classList.add('show');
            toastT = setTimeout(function() {
                toast.classList.remove('show');
            }, 3200);
        }

        /* ═══ SHARE ══════════════════════════════════════════════════ */
        function shareWA() {
            window.open('https://wa.me/?text=' + encodeURIComponent(CFG.shareText + ' ' + CFG.siteUrl), '_blank');
        }

        function shareLI() {
            window.open('https://www.linkedin.com/shareArticle?mini=true&url=' + encodeURIComponent(CFG.siteUrl) + '&title=' + encodeURIComponent('Digital Twin for Students'), '_blank');
        }

        function shareTW() {
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(CFG.shareText) + '&url=' + encodeURIComponent(CFG.siteUrl), '_blank');
        }

        function copyLink() {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(CFG.siteUrl).then(function() {
                    showToast('🔗', 'Link copied!');
                });
            } else {
                showToast('📋', CFG.siteUrl);
            }
        }

        /* ═══ SCROLL REVEAL ══════════════════════════════════════════ */
        var rvObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) {
                if (e.isIntersecting) e.target.classList.add('in');
            });
        }, {
            threshold: 0.07
        });
        document.querySelectorAll('.rv').forEach(function(el) {
            rvObs.observe(el);
        });

        /* ═══ PASSWORD STRENGTH METER ═══════════════════════════════ */
        (function() {
            function getPwStrength(pw) {
                var score = 0;
                if (!pw) return 0;
                if (pw.length >= 8)  score += 1;
                if (pw.length >= 12) score += 1;
                if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
                if (/[0-9]/.test(pw)) score += 1;
                if (/[^A-Za-z0-9]/.test(pw)) score += 1;
                return score;
            }
            function updateStrengthBar(pw) {
                var bar = document.getElementById('pw-strength-bar');
                if (!bar) return;
                var score = getPwStrength(pw);
                var w = ['0%', '25%', '45%', '65%', '85%', '100%'][score] || '0%';
                var bg = ['transparent', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'][score] || 'transparent';
                bar.style.width  = pw.length ? w  : '0%';
                bar.style.background = pw.length ? bg : 'transparent';
                bar.title = pw.length ? (['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][score] || '') : '';
            }
            function hookStrengthMeter() {
                var inp = document.getElementById('su-pw');
                if (!inp) { setTimeout(hookStrengthMeter, 200); return; }
                inp.addEventListener('input', function() { updateStrengthBar(inp.value); });
            }
            hookStrengthMeter();
        })();

        async function initGoogleAnalytics() {
            try {
                const res = await fetch('/api/v1/config');
                if (!res.ok) return;
                const config = await res.json();
                const gaId = config.GOOGLE_ANALYTICS_ID;
                if (gaId && gaId.trim() !== '') {
                    const script = document.createElement('script');
                    script.async = true;
                    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                    document.head.appendChild(script);

                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', gaId);
                    console.log('Google Analytics loaded.');
                }
            } catch (err) {}
        }

        /* ═══ INIT ═══════════════════════════════════════════════════ */
        document.addEventListener('DOMContentLoaded', function() {
            initGoogleAnalytics();
            loadData();
            ensureStudentDefaults();
            ensureAuthDefaults();
            initAccessGate();
            scheduleDeferredStartup();

            var chatInput = document.getElementById('cp-inp');
            if (chatInput) {
                chatInput.addEventListener('keydown', function(event) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        sendMsg();
                    }
                });
            }
        });