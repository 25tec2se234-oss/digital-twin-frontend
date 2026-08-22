/* ═══════════════════════════════════════════════════════
   GLOBAL SUBSCRIPTION INTERCEPTOR
═══════════════════════════════════════════════════════ */
(function() {
    var originalFetch = window.fetch;
    window.fetch = async function() {
        var response = await originalFetch.apply(this, arguments);
        if (response.status === 403) {
            var clone = response.clone();
            try {
                var data = await clone.json();
                if (data.error === 'SubscriptionExpired') {
                    showSubscriptionExpiredModal(data.message, data.expiredAt);
                }
            } catch (e) {}
        }
        return response;
    };

    window.showSubscriptionExpiredModal = function(message, expiredAt) {
        var modal = document.getElementById('premium-expired-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'premium-expired-modal';
            modal.className = 'custom-modal-overlay active';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '999999';
            modal.style.backdropFilter = 'blur(4px)';
            modal.innerHTML = `
                <div class="custom-modal premium-expired-modal" style="background: #1e1e24; display: block; border: 1px solid rgba(232, 140, 42, 0.3); box-shadow: 0 0 20px rgba(225, 42, 42, 0.2); padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; font-family: inherit;">
                    <div class="modal-header" style="text-align: center; margin-bottom: 20px;">
                        <h3 style="color: #e12a2a; margin: 0; font-size: 22px;"><i class="fa fa-lock"></i> Premium Access Expired</h3>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 20px;">
                        <i class="fa fa-lock fa-4x" style="color: rgba(255, 255, 255, 0.1); margin-bottom: 20px;"></i>
                        <p style="font-size: 16px; margin-bottom: 15px;">${message || 'Your premium access has expired.'}</p>
                        ${expiredAt ? '<p style="font-size: 14px; color: #aaa; margin-bottom: 20px;">Expired on: ' + new Date(expiredAt).toLocaleDateString() + '</p>' : ''}
                        <button onclick="document.getElementById('premium-expired-modal').remove(); if(typeof openPricingPage === 'function') { openPricingPage(); }" class="primary-btn" style="width: 100%; padding: 12px; font-size: 16px; background: linear-gradient(135deg, #a78bfa, #e88c2a); border: none; color: #000; font-weight: bold; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">Renew Subscription Now</button>
                        <div style="margin-top: 15px;">
                            <button onclick="if(typeof doLogout === 'function') { document.getElementById('premium-expired-modal').remove(); doLogout(); }" style="background: transparent; border: none; color: #a78bfa; cursor: pointer; text-decoration: underline; font-size: 14px;">Log out</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    };
})();

        /* ═══════════════════════════════════════════════════════
   CONFIGURATION
   - Uses secure backend API route: /api/messages
   - Set demoMode: true for local demo-only behavior
═══════════════════════════════════════════════════════ */
        var CFG = {
            aiApiEndpoint: '/api/messages',
            demoMode: false,
            formspreeId: 'mvzdpwyv',
            siteUrl: 'https://digitaltwinvrs.com/',
            shareText: 'Check out Digital Twin Verse by DTV Family — AI career simulation platform!'
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
                if (APP_DATA.userData && APP_DATA.userData.token && APP_DATA.userData.role !== 'parent') {
                    // Send to backend async
                    fetch('/api/v1/data/me', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + APP_DATA.userData.token
                        },
                        body: JSON.stringify({ data: APP_DATA })
                    }).catch(function(e) { logClientError('Backend sync failed', e); });
                }
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
                var dtUser = localStorage.getItem('dt_user');
                if (dtUser) {
                    try {
                        var u = JSON.parse(dtUser);
                        if (u && Object.keys(u).length > 0) {
                            APP_DATA.userData = Object.assign(APP_DATA.userData || {}, u);
                            // Infer loggedIn state if token is present (Fixes React app login missing loggedIn flag)
                            if (u.token) {
                                APP_DATA.userData.loggedIn = true;
                                APP_DATA.userData.loggedInAt = APP_DATA.userData.loggedInAt || new Date().toISOString();
                            }
                        }
                    } catch(ue) {}
                }
                if (APP_DATA.userData && APP_DATA.userData.token) {
                    // Fetch from backend to override session storage
                    var endpoint = '/api/v1/data/me';
                    fetch(endpoint, {
                        headers: { 'Authorization': 'Bearer ' + APP_DATA.userData.token }
                    }).then(function(res) {
                        if (res.ok) return res.json();
                    }).then(function(json) {
                        if (json && json.data && Object.keys(json.data).length > 0) {
                            Object.assign(APP_DATA, json.data);
                            migrateData();
                            if (APP_DATA.streak && typeof APP_DATA.streak.current !== 'undefined') {
                                localStorage.setItem('dtv_streak', APP_DATA.streak.current);
                                localStorage.setItem('dtv_best_streak', APP_DATA.streak.best);
                                if (APP_DATA.streak.lastActive) {
                                    localStorage.setItem('dtv_last_active', APP_DATA.streak.lastActive);
                                }
                            }
                            if (typeof window.renderAll === 'function') window.renderAll();
                            if (typeof updateSubscriptionTracker === 'function') updateSubscriptionTracker();
                        }
                    }).catch(function(e) { logClientError('Backend load failed', e); });
                }
                if (typeof updateSubscriptionTracker === 'function') updateSubscriptionTracker();
            } catch (e) {
                logClientError('loadData failed', e);
            }
        }

        function loadStudentData(studentId) {
            if (APP_DATA.userData && APP_DATA.userData.token && APP_DATA.userData.role === 'parent') {
                var endpoint = '/api/v1/data/students/' + studentId;
                fetch(endpoint, {
                    headers: { 'Authorization': 'Bearer ' + APP_DATA.userData.token }
                }).then(function(res) {
                    if (res.ok) return res.json();
                }).then(function(json) {
                    if (json && json.data && Object.keys(json.data).length > 0) {
                        // Merge the student data, but keep our token/role
                        var myToken = APP_DATA.userData.token;
                        var myRole = APP_DATA.userData.role;
                        
                        Object.assign(APP_DATA, json.data);
                        APP_DATA.userData.token = myToken;
                        APP_DATA.userData.role = myRole;
                        
                        migrateData();
                        if (typeof window.renderAll === 'function') window.renderAll();
                    }
                }).catch(function(e) { logClientError('Failed to load student data', e); });
            }
        }
        window.loadStudentData = loadStudentData;

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

        function trackStudentAction(actionType, details) {
            if (!APP_DATA.userData || !APP_DATA.userData.token || APP_DATA.userData.role === 'parent') return;
            try {
                fetch('/api/v1/track', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + APP_DATA.userData.token
                    },
                    body: JSON.stringify({
                        actionType: actionType,
                        details: details || {}
                    })
                }).catch(function(e) { logClientError('Tracking failed', e); });
            } catch(err) {
                logClientError('Tracking failed', err);
            }
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
            var escaped = escapeHTML(text);
            // Format headings
            escaped = escaped.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
            escaped = escaped.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
            escaped = escaped.replace(/^# (.*?)$/gm, '<h3>$1</h3>');
            // Format bold
            escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Format bullet points
            escaped = escaped.replace(/^- (.*?)$/gm, '<li>$1</li>');
            escaped = escaped.replace(/^\* (.*?)$/gm, '<li>$1</li>');
            // Format line breaks
            escaped = escaped.replace(/\n/g, '<br>');
            return escaped;
        }

        /* ═══ CAREER DATA — 24 Careers ═══════════════════════════════ */
        
/* CAREERS data moved to js/data/careers.js */


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
        var currentCategory = 'all';
        var currentSearchQuery = '';
        var currentPage = 1;
        var pageSize = 30;
        var currentFilteredList = [];


        
var currentSalaryFilter = 'all';
var currentRemoteFilter = 'all';

function renderCareers(filter) {
            if (filter !== undefined && filter !== null) {
                currentCategory = filter;
            }
            var grid = document.getElementById('career-grid');
            if (!grid) return;
            var list = CAREERS.filter(function(c) {
                var cat = (currentCategory || 'all').toLowerCase().trim();
                var cstream = (c.stream || '').toLowerCase().trim();
                var matchCategory = false;
                
                if (cat === 'all') {
                    matchCategory = true;
                } else if (cstream === cat) {
                    matchCategory = true;
                } else if (cstream.includes(cat) || cat.includes(cstream)) {
                    matchCategory = true;
                } else {
                    // Fallback keyword matching for buttons
                    if (cat.includes('technology') && cstream.includes('technology')) matchCategory = true;
                    if (cat.includes('business') && cstream.includes('business')) matchCategory = true;
                    if (cat.includes('creative') && cstream.includes('creative')) matchCategory = true;
                    if (cat.includes('engineering') && cstream.includes('engineering')) matchCategory = true;
                    if (cat.includes('healthcare') && cstream.includes('healthcare')) matchCategory = true;
                    if (cat.includes('govt') && (cstream.includes('government') || cstream.includes('law'))) matchCategory = true;
                    if (cat.includes('science') && cstream.includes('science')) matchCategory = true;
                    if (cat.includes('education') && cstream.includes('education')) matchCategory = true;
                    if (cat.includes('emerging') && cstream.includes('emerging')) matchCategory = true;
                }

                var matchSearch = true;
                if (currentSearchQuery && currentSearchQuery.trim() !== '') {
                    var q = currentSearchQuery.trim().toLowerCase();
                    matchSearch = (c.title && c.title.toLowerCase().includes(q)) || 
                                  (c.desc && c.desc.toLowerCase().includes(q)) || 
                                  (c.stream && c.stream.toLowerCase().includes(q)) ||
                                  (c.id && c.id.toLowerCase().includes(q)) ||
                                  (c.salary && c.salary.toLowerCase().includes(q)) ||
                                  (c.salaryGlobal && c.salaryGlobal.toLowerCase().includes(q)) ||
                                  (c.futureDemand && c.futureDemand.toLowerCase().includes(q)) ||
                                  (c.eligibility && c.eligibility.toLowerCase().includes(q)) ||
                                  (c.techSkills && Array.isArray(c.techSkills) && c.techSkills.join(' ').toLowerCase().includes(q)) ||
                                  (c.softSkills && Array.isArray(c.softSkills) && c.softSkills.join(' ').toLowerCase().includes(q)) ||
                                  (c.topCompanies && Array.isArray(c.topCompanies) && c.topCompanies.join(' ').toLowerCase().includes(q));
                }
                return matchCategory && matchSearch;
            });
            
            currentFilteredList = list;
            currentPage = 1; // reset page on filter/search

            if (list.length === 0) {
                grid.innerHTML = '<div class="no-results">No careers found matching your criteria. Try adjusting your search or category filter.</div>';
                var existingBtn = document.getElementById('load-more-container');
                if (existingBtn) existingBtn.remove();
                updateOverallProgress();
                return;
            }

            var existingBtn = document.getElementById('load-more-container');
            if (existingBtn) existingBtn.remove();

            var renderSubset = list.slice(0, pageSize);
            grid.innerHTML = renderSubset.map(function(c) {
                return generateCareerCardHTML(c);
            }).join('');
            
            if (list.length > pageSize) {
                appendLoadMoreButton(grid);
            }

            updateOverallProgress();
        }
        
        function generateCareerCardHTML(c) {
            var dispDp = c.dp || c.aiRecScore || 85;
            var dispDemand = c.futureDemand || c.demand || 'High';
            var dispSalary = c.salary || 'Competitive';
            var dispGrowth = c.growthRate || '+25% Growth';
            
            var matchPillHtml = '';
            if (window.APP_DATA && window.APP_DATA.studentProfile && window.APP_DATA.studentProfile.type) {
                var score = calculateStudentMatchScore(c, window.APP_DATA.studentProfile);
                matchPillHtml = '<span style="font-size:0.72rem;color:#f59e0b;background:rgba(245, 158, 11, 0.15);padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:bold;border:1px solid rgba(245, 158, 11, 0.25);">✨ ' + score + '% Match</span>';
            }

            return '<div class="ccard" id="cc-' + c.id + '" onclick="openCareer(\'' + c.id + '\')" role="button" tabindex="0" aria-label="Explore ' + c.title + '">' +
                '<div class="ccard-top-row">' +
                    '<div class="ccard-ic" aria-hidden="true">' + c.icon + '</div>' +
                    '<div class="ccard-stream">' + c.stream + '</div>' +
                '</div>' +
                '<h3 class="ccard-title">' + c.title + '</h3>' +
                '<p class="ccard-desc">' + c.desc + '</p>' +
                '<div class="ccard-salary">' + dispSalary + matchPillHtml + '</div>' +
                '<div class="demand-bar"><div class="demand-fill" style="width:' + dispDp + '%"></div></div>' +
                '<div class="demand-lbl">Demand: ' + dispDemand + ' <span style="color:#4ade80;float:right;">' + dispGrowth + '</span></div>' +
                '<div class="ccard-act"><button class="btn-explore" tabindex="-1">Explore →</button></div>' +
                '</div>';
        }
        
        function appendLoadMoreButton(grid) {
            var btnContainer = document.createElement('div');
            btnContainer.id = 'load-more-container';
            btnContainer.style.textAlign = 'center';
            btnContainer.style.gridColumn = '1 / -1';
            btnContainer.style.marginTop = '2rem';
            
            var btn = document.createElement('button');
            btn.className = 'btn-explore';
            btn.style.width = 'auto';
            btn.style.padding = '0.75rem 2rem';
            btn.style.fontSize = '1rem';
            btn.textContent = 'Load More Careers';
            
            btn.onclick = function() {
                currentPage++;
                var start = (currentPage - 1) * pageSize;
                var end = start + pageSize;
                var nextSubset = currentFilteredList.slice(start, end);
                
                // Append new HTML
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = nextSubset.map(function(c) {
                    return generateCareerCardHTML(c);
                }).join('');
                
                while(tempDiv.firstChild) {
                    grid.appendChild(tempDiv.firstChild);
                }
                
                if (end >= currentFilteredList.length) {
                    btnContainer.remove();
                } else {
                    grid.appendChild(btnContainer); // move to bottom
                }
            };
            
            btnContainer.appendChild(btn);
            grid.appendChild(btnContainer);
        }

        function filterCareer(el, stream) {
            document.querySelectorAll('.df').forEach(function(d) {
                d.classList.remove('on');
            });
            if (el) el.classList.add('on');
            renderCareers(stream);
            var cd = document.getElementById('career-detail');
            if (cd) {
                cd.classList.remove('open');
                cd.innerHTML = '';
            }
        }

        var searchTimeout;
        function handleSearchCareer(val) {
            clearTimeout(searchTimeout);
            var clearBtn = document.getElementById('search-clear');
            if (clearBtn) {
                clearBtn.style.display = val.trim() !== '' ? 'inline-flex' : 'none';
            }
            
            searchTimeout = setTimeout(function() {
                currentSearchQuery = val;
                renderCareers();
            }, 300); // 300ms debounce

        }

        function clearSearchCareer() {
            var input = document.getElementById('career-search');
            if (input) input.value = '';
            currentSearchQuery = '';
            var clearBtn = document.getElementById('search-clear');
            if (clearBtn) clearBtn.style.display = 'none';
            renderCareers();
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

        function openCareerByTitle(title) {
            var cleanTitle = title.trim().toLowerCase();
            var matched = CAREERS.find(function(c) {
                return c.title.toLowerCase() === cleanTitle || c.title.toLowerCase().includes(cleanTitle) || cleanTitle.includes(c.title.toLowerCase());
            });
            if (matched) {
                openCareer(matched.id);
            } else {
                alert("Career '" + title + "' is currently being researched by our AI experts!");
            }
        }

        /* ═══ CAREER DETAIL WITH PREDICTION + SUGGESTIONS ═══════════ */
        function openCareer(id) {
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to access Career Explorer & details.');
                openLoginGate();
                return;
            }
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
            var recScore = c.aiRecScore || pred.score || 88;
            var predBadgesHtml = pred.badges.map(function(b) {
                return '<span class="pred-badge ' + b.cls + '">' + escapeHTML(b.label) + '</span>';
            }).join('');
            var circ = 2 * Math.PI * 28;
            var offset = circ - (recScore / 100 * circ);

            var safeTitle = escapeHTML(c.title);
            var safeDesc = escapeHTML(c.desc);
            var safeSalary = escapeHTML(c.salary || 'Competitive');
            var safeSalaryGlobal = escapeHTML(c.salaryGlobal || 'Global Equivalent');
            var safeDemand = escapeHTML(c.futureDemand || c.demand || 'High');
            var safeTime = escapeHTML(c.timeRequired || c.time || '3-4 Years');
            var safeDiff = escapeHTML(c.difficulty || 'Moderate');
            var safeStream = escapeHTML(c.stream);
            var safeBestFor = escapeHTML(c.bestFor || 'Students passionate about innovation, complex problem-solving, and future technologies.');
            var safeAiImpact = escapeHTML(c.aiImpact || 'High synergy with AI tools');
            var safeAutoRisk = escapeHTML(c.automationRisk || 'Low Risk');
            var safeOutlook = escapeHTML(c.outlook2035 || 'Exponential growth expected through 2035.');
            var safeLearn = escapeHTML(c.learn || 'Advanced domain expertise and real-world application.');
            var safeElig = escapeHTML(c.eligibility || 'Class 12th / Bachelors');
            var safeStreamReq = escapeHTML(c.streamRequired || 'Any Stream / Relevant Background');
            var safeProj = escapeHTML(c.projects || 'Practical real-world capstone projects.');
            var safeIntern = escapeHTML(c.internships || 'Top industry internships and research fellowships.');
            var safePort = escapeHTML(c.portfolio || 'Github/Live Web portfolio showcasing end-to-end implementations.');
            var safeGov = escapeHTML(c.govOpps || 'Public sector modernization and digital governance roles.');
            var safeFree = escapeHTML(c.freelanceOpps || 'High potential for global remote consulting.');
            var safeStart = escapeHTML(c.startupOpps || 'Strong venture capital backing and high startup demand.');
            var safeRes = escapeHTML(c.resources || 'Leading industry documentation and online platforms.');
            var safeBooks = escapeHTML(c.books || 'Domain-specific seminal publications and textbooks.');
            var safeYT = escapeHTML(c.youtube || 'High-quality educational channels and conference recordings.');
            var safeWeb = escapeHTML(c.websites || 'Global community portals and research repositories.');

            var dayInLifeHtml = c.dayInLife ? '<ul style="padding-left:1.2rem;margin-bottom:1.5rem;">' + c.dayInLife.map(function(item) {
                return '<li style="margin-bottom:0.4rem;font-size:0.85rem;color:var(--mu);">' + escapeHTML(item) + '</li>';
            }).join('') + '</ul>' : '';
            
            var toolsHtml = c.techSkills ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">' + c.techSkills.map(function(item) {
                return '<span class="tool-badge">' + escapeHTML(item) + '</span>';
            }).join('') + '</div>' : (c.tools ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">' + c.tools.map(function(item) {
                return '<span class="tool-badge">' + escapeHTML(item) + '</span>';
            }).join('') + '</div>' : '');
            
            var softHtml = c.softSkills ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">' + c.softSkills.map(function(item) {
                return '<span class="pred-badge on">' + escapeHTML(item) + '</span>';
            }).join('') + '</div>' : '';

            var compsHtml = c.topCompanies ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">' + c.topCompanies.map(function(item) {
                return '<span class="comp-badge">' + escapeHTML(item) + '</span>';
            }).join('') + '</div>' : '';
            
            var examsHtml = c.exams ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.8rem;"><strong>Exams:</strong> ' + c.exams.map(function(item) {
                return '<span class="comp-badge">' + escapeHTML(item) + '</span>';
            }).join('') + '</div>' : '';

            var degsHtml = c.degrees ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.8rem;"><strong>Degrees:</strong> ' + c.degrees.map(function(item) {
                return '<span class="comp-badge" style="background:rgba(59,130,246,0.15);color:#60a5fa;">' + escapeHTML(item) + '</span>';
            }).join('') + '</div>' : '';

            var certsHtml = c.certifications ? '<div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:1.5rem;"><strong>Top Certifications:</strong> ' + c.certifications.map(function(item) {
                return '<div class="cert-item">🏆 ' + escapeHTML(item) + '</div>';
            }).join('') + '</div>' : '';
            
            var trajHtml = c.trajectory ? '<div class="traj-container">' + c.trajectory.map(function(t) {
                return '<div class="traj-step"><div class="traj-lvl">' + escapeHTML(t.level) + '</div><div class="traj-role">' + escapeHTML(t.role) + '</div><div class="traj-sal">' + escapeHTML(t.salary) + '</div></div>';
            }).join('') + '</div>' : '';

            var relHtml = c.relatedCareers ? '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">' + c.relatedCareers.map(function(rc) {
                return '<span class="tool-badge" style="cursor:pointer;border-color:var(--amb);" onclick="openCareerByTitle(\'' + escapeHTML(rc) + '\')">' + escapeHTML(rc) + ' ↗</span>';
            }).join('') + '</div>' : '';

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

            var rmHtml = c.roadmap ? c.roadmap.map(function(r, i) {
                return '<div class="rm-step"><div class="rm-num">' + (i + 1) + '</div><div class="rm-txt">' + escapeHTML(r) + '</div></div>';
            }).join('') : '';

            var detail = document.getElementById('career-detail');
            detail.innerHTML =
                // — Top bar —
                '<div class="cd-top">' +
                '<div class="cd-info"><h2>' + c.icon + ' ' + safeTitle + '</h2><p>' + safeDesc + '</p>' +
                '<div class="cd-meta"><span class="meta-tag">💰 India: ' + safeSalary + ' | Global: ' + safeSalaryGlobal + '</span>' +
                '<span class="meta-tag" style="color:#4ade80; border-color:rgba(74,222,128,0.3)">📈 Demand: ' + safeDemand + (c.growthRate ? ' (' + escapeHTML(c.growthRate) + ')' : '') + '</span>' +
                '<span class="meta-tag">⏱ Entry: ' + safeTime + ' | Diff: ' + safeDiff + '</span>' +
                '<span class="meta-tag">🏷 ' + safeStream + '</span>' +
                (c.remote ? '<span class="meta-tag">Remote: ' + escapeHTML(c.remote) + '</span>' : '') +
                (c.wlb ? '<span class="meta-tag">WLB: ' + escapeHTML(c.wlb) + '</span>' : '') +
                '</div></div>' +
                '<div style="display:flex;flex-direction:column;gap:.6rem;align-items:flex-end;">' +
                '<button class="cd-close" onclick="closeCareer()">✕ Close</button>' +
                '</div></div>'
                // — Prediction Score card —
                +
                '<div class="pred-card">' +
                '<div class="pred-ring">' +
                '<svg width="72" height="72" viewBox="0 0 72 72"><circle class="bg-c" cx="36" cy="36" r="28" stroke-dasharray="' + circ + '" stroke-dashoffset="0"/>' +
                '<circle class="fg-c" cx="36" cy="36" r="28" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" id="pred-arc-' + id + '"/></svg>' +
                '<div class="pred-pct" id="pred-pct-' + id + '">' + recScore + '%</div>' +
                '</div>' +
                '<div class="pred-info"><h4>AI Career Prediction &amp; Future Outlook</h4>' +
                '<p style="margin-bottom:0.4rem;">' + pred.match + ' based on market demand, your skill progress, and profile alignment.</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.4rem;"><strong>⚡ AI Impact:</strong> ' + safeAiImpact + ' | <strong>🛡 Automation Risk:</strong> ' + safeAutoRisk + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>🚀 2035 Outlook:</strong> ' + safeOutlook + '</p>' +
                '<div class="pred-badges">' + predBadgesHtml + '</div>' +
                '<button class="tool-btn" style="margin-top: 1rem; background: linear-gradient(90deg, #a855f7, #6366f1) !important; color: white !important; width: 100%; border: none; font-weight: bold; cursor: pointer; padding: 0.75rem; border-radius: 6px; font-size:0.85rem;" onclick="openCareerSimulator(\'' + id + '\')">🔮 Simulate My Career Path (Interactive Roadmapping)</button>' +
                '</div></div>'
                // — Progress bar —
                +
                '<div class="progress-section">' +
                '<div class="prog-label"><span>Skills Progress</span><span id="pct-' + id + '">' + pct + '%</span></div>' +
                '<div class="prog-bar"><div class="prog-fill" id="pf-' + id + '" style="width:' + pct + '%"></div></div>' +
                '</div>'
                // — Body —
                +
                '<div class="cd-body">'
                // Left: skills + notes + resources + projects
                +
                '<div class="cd-section">' +
                '<h3>💡 What You Will Learn</h3><p style="font-size:0.9rem; color:var(--mu); margin-bottom:1.5rem; line-height:1.6;">' + safeLearn + '</p>' +
                (dayInLifeHtml ? '<h3>☀️ A Day in the Life</h3>' + dayInLifeHtml : '') +
                (toolsHtml ? '<h3>💻 Technical &amp; Software Skills</h3>' + toolsHtml : '') +
                (softHtml ? '<h3>🤝 Soft Skills &amp; Traits</h3>' + softHtml : '') +
                '<h3>🛠 Skills to Master (Checklist)</h3>' + skillsHtml +
                '<h3>🔬 Projects, Internships &amp; Portfolio</h3>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>📂 Projects:</strong> ' + safeProj + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>💼 Internships:</strong> ' + safeIntern + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:1.5rem;"><strong>🌐 Portfolio Building:</strong> ' + safePort + '</p>' +
                '<div class="notes-area"><label>Your Notes &amp; Remarks</label>' +
                '<textarea class="ft" id="notes-' + id + '" rows="3" placeholder="Write progress notes, targets, or plans here…"></textarea>' +
                '<button class="save-note-btn" onclick="saveNote(\'' + id + '\')">💾 Save Notes</button></div>'
                // AI Suggestions
                +
                '<div class="ai-sug-panel"><h4>🤖 AI Suggestions for You</h4><div class="sug-items">' + sugHtml + '</div></div>' +
                '</div>'
                // Right: roadmap + academics + companies + resources + best for
                +
                '<div class="cd-section">' +
                '<h3>🎓 Academics &amp; Eligibility</h3>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.8rem;"><strong>Eligibility:</strong> ' + safeElig + ' | <strong>Stream:</strong> ' + safeStreamReq + '</p>' +
                examsHtml + degsHtml + certsHtml +
                '<h3>📍 Comprehensive Step-by-Step Roadmap</h3><div class="roadmap-steps">' +
                '<div class="rm-step"><div class="rm-num" style="background:#3b82f6;color:#fff;font-size:0.7rem;width:28px;height:28px;padding:0;">Beg</div><div class="rm-txt"><strong>Beginner:</strong> ' + escapeHTML(c.roadBeginner || 'Foundational basics and introductory core concepts.') + '</div></div>' +
                '<div class="rm-step"><div class="rm-num" style="background:#8b5cf6;color:#fff;font-size:0.7rem;width:28px;height:28px;padding:0;">Int</div><div class="rm-txt"><strong>Intermediate:</strong> ' + escapeHTML(c.roadIntermediate || 'Advanced tooling, practical implementations, and core projects.') + '</div></div>' +
                '<div class="rm-step"><div class="rm-num" style="background:#10b981;color:#fff;font-size:0.7rem;width:28px;height:28px;padding:0;">Adv</div><div class="rm-txt"><strong>Advanced:</strong> ' + escapeHTML(c.roadAdvanced || 'Specialization, industry leadership, and large-scale architecture.') + '</div></div>' +
                rmHtml + '</div>' +
                '<h3>🏢 Hiring &amp; Market Opportunities</h3>' + compsHtml +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>🏛 Government Opportunities:</strong> ' + safeGov + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>💻 Freelance &amp; Remote:</strong> ' + safeFree + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:1.5rem;"><strong>🚀 Startup &amp; Innovation:</strong> ' + safeStart + '</p>' +
                (trajHtml ? '<h3>📈 Career &amp; Salary Trajectory</h3>' + trajHtml : '') +
                '<h3>📚 Recommended Learning Resources</h3>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>📘 General Resources:</strong> ' + safeRes + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>📙 Top Books:</strong> ' + safeBooks + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:0.6rem;"><strong>▶️ YouTube Channels &amp; Courses:</strong> ' + safeYT + '</p>' +
                '<p style="font-size:0.85rem; color:var(--mu); margin-bottom:1.5rem;"><strong>🌐 Essential Websites:</strong> ' + safeWeb + '</p>' +
                (relHtml ? '<h3>🔗 Related Careers</h3>' + relHtml : '') +
                '<div style="margin-top:1.5rem;padding:1rem;background:rgba(232,140,42,.07);border:1px solid rgba(232,140,42,.18);border-radius:10px;">' +
                '<div style="font-size:.78rem;font-weight:700;color:var(--amb);margin-bottom:.4rem;">💡 Best Suited For</div>' +
                '<div style="font-size:.82rem;color:var(--mu);">' + safeBestFor + '</div>' +
                '<div style="margin-top:.9rem;"><button class="btn btn-amb btn-sm" style="font-size:.76rem;padding:.48rem 1rem;" onclick="askAICareer(\'' + c.title + '\')">Ask AI for Detailed Plan</button></div>' +
                '</div></div>' +
                '</div>';

                        detail.classList.add('open');

            var _cg = document.getElementById('career-grid');
            if (_cg) _cg.style.display = 'none';
            var _dc = document.querySelector('.dash-controls');
            if (_dc) _dc.style.display = 'none';
            var _dov = document.getElementById('dash-overall');
            if (_dov) _dov.style.display = 'none';


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
                predScore: recScore,
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
            
            var _cg = document.getElementById('career-grid');
            if (_cg) _cg.style.display = '';
            var _dc = document.querySelector('.dash-controls');
            if (_dc) _dc.style.display = '';
            var _dov = document.getElementById('dash-overall');
            if (_dov) _dov.style.display = '';
            
            var _db = document.getElementById('dashboard');
            if (_db) _db.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                    doc.text('Digital Twin Verse', ml, y);
                    doc.setFontSize(9);
                    doc.setTextColor(194, 208, 224);
                    doc.text('Career Report  |  DTV Family  |  https://digitaltwinvrs.com/', ml, y + 7);
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
                    doc.text('© 2026 DTV Family · Digital Twin Verse · digitaltwinverse@gmail.com · +91 75201 19837 · https://digitaltwinvrs.com/', pw / 2, 289, {
                        align: 'center'
                    });

                    doc.save('DigitalTwinVerse_Report_' + c.title.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf');
                    showToast('✅', 'PDF report downloaded!');
                } else {
                    throw new Error('jsPDF not loaded');
                }
            } catch (err) {
                // Fallback: plain text download
                var lines = [
                    'DIGITAL TWIN VERSE — CAREER REPORT',
                    'DTV Family | https://digitaltwinvrs.com/',
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
                lines.push('© 2026 DTV Family | Digital Twin Verse | digitaltwinverse@gmail.com | +91 75201 19837 | https://digitaltwinvrs.com/');

                var blob = new Blob([lines.join('\n')], {
                    type: 'text/plain'
                });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'DigitalTwinVerse_Report_' + c.id + '.txt';
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
            // REMOVED: openLoginGate() to keep user in Guest Mode
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
            const text = typeof item === 'string' ? item : item.text || '';
            APP_DATA.studentTools.items.achieved.unshift({
                text: text,
                at: new Date().toISOString()
            });
            syncData();
            renderToolList('achieve');
            renderToolList('achieved');
            updateAccuracy();
            renderNextStep();
            refreshWeeklySummary();

            // Premium Upgrade: Confetti celebration and XP points!
            if (typeof triggerConfetti === 'function') triggerConfetti();
            if (typeof awardXpForGoal === 'function') awardXpForGoal(text);
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
            trackStudentAction('course_started', { chapter: chapter, subject: subject });
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
            trackStudentAction('course_completed', { exam: name, date: date });
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
            trackStudentAction('course_completed', { subject: subject, score: score, max: max });
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
            trackStudentAction('routine_completed', { task: task, time: time });
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
            trackStudentAction('routine_completed', { subject: subject, minutes: minutes });
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
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to download your custom study plan.');
                openLoginPage();
                return;
            }
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
                    doc.text('Digital Twin Verse', margin, 24);
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
                'STUDENT PLAN - DIGITAL TWIN VERSE',
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
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to access your Personalised Dashboard.');
                openLoginPage();
                return;
            }
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
        window.toggleDashboard = toggleDashboard;

        function openDashboardShortcut() {
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to access your Personalised Dashboard.');
                openLoginPage();
                return;
            }
            setDashboardOpen(true, true);
        }

        function initDashboardToggle() {
            setDashboardOpen(false, false);
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
        window.toggleCareerExplorer = toggleCareerExplorer;

        function initCareerExplorerToggle() {
            setCareerExplorerOpen(false, false);
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
            showToast('🤖', mode + ' mode activated.');
        }

        function togTone() {
            toneIsFriendly = !toneIsFriendly;
            var sw = document.getElementById('tone-sw');
            var lbl = document.getElementById('tone-lbl');
            if (sw) sw.classList.toggle('on', toneIsFriendly);
            if (lbl) lbl.textContent = toneIsFriendly ? 'Friendly' : 'Pro';
            showToast('💬', toneIsFriendly ? 'Friendly tone activated 😊' : 'Professional tone activated 💼');
        }

        /* ═══ CHAT FUNCTIONS ═════════════════════════════════════════ */
        function togChat() {
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to access AI Mentor & Advisor.');
                openLoginPage();
                return;
            }
            chatOpen = !chatOpen;
            var panel = document.getElementById('chat-panel');
            panel.classList.toggle('open', chatOpen);
            if (chatOpen && chatHistory.length === 0) {
                var greeting = toneIsFriendly ?
                    '👋 Hey! I\'m your Digital Twin Verse Career AI. I can help you with career guidance, skill planning, interview prep, or future trends!\n\nTell me about yourself — your education and what you\'re interested in — and I\'ll get started. 🎯' :
                    '👋 Welcome. I\'m the Digital Twin Verse Career Advisor. I operate in 4 modes: Career Advisor, Skill Mentor, Interview Coach, and Future Predictor.\n\nPlease share your education background, current skills, and career objectives for a personalised analysis.';
                addBotMsg(greeting);
                document.getElementById('cp-inp').focus();
            }
        }

        function addBotMsg(text) {
            var msgs = document.getElementById('cp-msgs');
            var div = document.createElement('div');
            div.className = 'msg bot';
            div.innerHTML = DOMPurify.sanitize(formatBotMessage(text));
            msgs.appendChild(div);
            
            // Premium Upgrade: Apply hacker decode effect
            if (typeof decodeText === 'function') {
                var pElements = div.querySelectorAll('p, li, h3, h4');
                pElements.forEach(function(p) {
                    if (!p.closest('pre') && !p.closest('code')) {
                        decodeText(p);
                    }
                });
            }
            
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
            div.innerHTML = DOMPurify.sanitize('<div class="dtv-thinking-nodes" style="display:flex; align-items:center; gap:6px;">' +
'<div class="dtv-path-node" style="position:relative; animation-delay:0s;"></div>' +
'<div class="dtv-path-node" style="position:relative; animation-delay:0.2s;"></div>' +
'<div class="dtv-path-node" style="position:relative; animation-delay:0.4s;"></div>' +
'<div class="dtv-path-node" style="position:relative; animation-delay:0.6s;"></div>' +
'<div class="dtv-path-node" style="position:relative; animation-delay:0.8s;"></div>' +
'<span class="decrypt-text" style="margin-left:12px; font-size:0.75rem; color:var(--dtv-orange-500); letter-spacing:2px; font-family:monospace; white-space:nowrap;">SYNTHESIZING...</span></div>', { ADD_ATTR: ['style'] });
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
            
            var decryptText = div.querySelector('.decrypt-text');
            if (decryptText && typeof decodeText === 'function') {
                decodeText(decryptText);
            }
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

        function getSystemPrompt() {
            var tone = toneIsFriendly ? 'warm, encouraging, and friendly' : 'highly professional, structured, and direct';
            var base = "You are India's premium AI Career Guidance Expert, Senior Academic Advisor, and Professional Mentor for 'Digital Twin Verse'. Your tone should be " + tone + ". Provide clear, highly structured, actionable, and professionally researched guidance. Use bold text, clear headings, and bullet points where appropriate.";
            if (currentMode === 'coach') {
                return base + " You are currently acting as an elite Interview Coach and Resume Optimizer. Guide the student through the PAST -> PRESENT -> PULL interview framework, salary negotiation strategies, and ATS resume optimization.";
            } else if (currentMode === 'predictor') {
                return base + " You are currently acting as a Future Career Predictor and Market Demand Analyst. Focus on emerging 2026 AI trends, salary growth trends in India and globally, and future-proof skills.";
            } else if (currentMode === 'skill') {
                return base + " You are currently acting as a Skill Acquisition Mentor and Study Planner. Generate tailored weekly study routines, Pomodoro time management strategies, and top recommended skill stacks.";
            }
            return base + " You are currently acting as an elite Career Advisor. Help the student simulate their career journey, explore high-growth career paths, and answer academic queries with extreme precision.";
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

            // Track action for Parent Portal
            trackStudentAction('ai_interaction', { message: text });

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
        var navEl = document.getElementById('nav');
        if (navEl) {
            window.addEventListener('scroll', function() {
                navEl.classList.toggle('sc', window.scrollY > 40);
            }, { passive: true });
        }

        /* ═══ DECORATIVE PARALLAX ═════════════════════════════════ */
        function initDecorativeMotion() {
            var isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
            var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var cursor = document.getElementById('cursor-glow');
            var items = Array.prototype.slice.call(document.querySelectorAll('.parallax'));
            if (reduceMotion || isMobile || !cursor || items.length === 0) {
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

        window.trackAnalyticsEvent = function(eventName, payload) {
            // Placeholder for real analytics integration (e.g. Mixpanel, GA4)
            console.log('[Analytics Tracked]', eventName, payload || {});
        };

        function triggerParentScare() {
            var existing = document.getElementById('parent-scare-overlay');
            if (existing) existing.remove();
            
            var overlay = document.createElement('div');
            overlay.id = 'parent-scare-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.zIndex = '999999999';
            overlay.style.backgroundColor = '#020202';
            overlay.style.backgroundImage = 'radial-gradient(circle at center, #1a0000 0%, #000000 100%)';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.padding = '40px';
            overlay.style.textAlign = 'center';
            overlay.style.cursor = 'pointer';
            overlay.style.fontFamily = '"Courier New", Courier, monospace';
            overlay.style.overflow = 'hidden';
            
            var style = document.createElement('style');
            style.innerHTML = `
                @keyframes scanline {
                    0% { transform: translateY(-100vh); }
                    100% { transform: translateY(100vh); }
                }
                @keyframes crtFlicker {
                    0% { opacity: 0.9; }
                    5% { opacity: 0.5; }
                    10% { opacity: 0.95; }
                    15% { opacity: 0.8; }
                    50% { opacity: 0.99; }
                    80% { opacity: 0.7; }
                    100% { opacity: 0.9; }
                }
                @keyframes cyberGlitch {
                    0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 2px); }
                    20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); }
                    40% { clip-path: inset(40% 0 50% 0); transform: translate(2px, 2px); }
                    60% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, -2px); }
                    80% { clip-path: inset(10% 0 70% 0); transform: translate(2px, -2px); }
                    100% { clip-path: inset(30% 0 50% 0); transform: translate(-2px, 2px); }
                }
                #parent-scare-overlay {
                    animation: crtFlicker 0.15s infinite;
                }
                #parent-scare-overlay::before {
                    content: " ";
                    display: block;
                    position: absolute;
                    top: 0; left: 0; bottom: 0; right: 0;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                    z-index: 2;
                    background-size: 100% 2px, 3px 100%;
                    pointer-events: none;
                }
                .scare-scanline {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 10px;
                    background: rgba(255, 0, 0, 0.3);
                    opacity: 0.4;
                    animation: scanline 6s linear infinite;
                    pointer-events: none;
                    z-index: 3;
                }
                .scare-title {
                    font-size: clamp(2.5rem, 6vw, 5rem);
                    font-weight: 900;
                    color: #ff003c;
                    letter-spacing: 5px;
                    margin-bottom: 30px;
                    position: relative;
                    text-transform: uppercase;
                    z-index: 4;
                    text-shadow: 0 0 20px rgba(255, 0, 60, 0.6);
                }
                .scare-title::before, .scare-title::after {
                    content: "SECURITY BREACH DETECTED";
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: transparent;
                }
                .scare-title::before {
                    left: 3px;
                    text-shadow: -2px 0 red;
                    animation: cyberGlitch 2s infinite linear alternate-reverse;
                }
                .scare-title::after {
                    left: -3px;
                    text-shadow: -2px 0 blue;
                    animation: cyberGlitch 3s infinite linear alternate-reverse;
                }
                .scare-box {
                    background: rgba(10, 0, 0, 0.8);
                    border: 1px solid #ff003c;
                    border-left: 5px solid #ff003c;
                    padding: 40px;
                    max-width: 800px;
                    z-index: 4;
                    box-shadow: 0 0 30px rgba(255, 0, 60, 0.2);
                    position: relative;
                }
                .scare-box p {
                    color: #e0e0e0;
                    font-size: 1.2rem;
                    line-height: 1.8;
                    margin-bottom: 20px;
                    text-align: left;
                }
                .scare-box p strong {
                    color: #ff003c;
                }
                .system-log {
                    text-align: left;
                    font-size: 0.9rem;
                    color: #666;
                    margin-top: 30px;
                    border-top: 1px solid #333;
                    padding-top: 20px;
                }
                .system-log span { color: #ff003c; }
            `;
            
            overlay.innerHTML = `
                <div class="scare-scanline"></div>
                <div class="scare-title">SECURITY BREACH DETECTED</div>
                <div class="scare-box">
                    <p><strong>UNAUTHORIZED ACCESS ATTEMPT LOGGED.</strong></p>
                    <p>You are currently authenticated via a <strong>Parent Node</strong>. Attempting to bypass security protocols and access the Student Core Infrastructure is strictly prohibited.</p>
                    <p>Your session telemetry has been recorded. Disconnect and re-authenticate with a valid Student ID immediately.</p>
                    <div class="system-log">
                        > TRACE_IP: [ENCRYPTED]<br>
                        > ROLE_VERIFICATION: <span>FAILED (PARENT_NODE)</span><br>
                        > ACTION_REQUIRED: TERMINATE_SESSION<br>
                        <br>
                        <span style="color:#555;">(Click anywhere to abort termination sequence)</span>
                    </div>
                </div>
            `;
            
            overlay.appendChild(style);
            document.body.appendChild(overlay);
            
            // 1. Cyberpunk low drone sound
            try {
                var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = audioCtx.createOscillator();
                var gn = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, audioCtx.currentTime); // Low rumble
                osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 10);
                gn.gain.setValueAtTime(0.5, audioCtx.currentTime);
                gn.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 10);
                osc.connect(gn);
                gn.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 10);
            } catch(e) {}

            // 2. Synthesized Evil Cyberpunk Laugh
            try {
                var lCtx = new (window.AudioContext || window.webkitAudioContext)();
                function playLaughSyllable(time, pitch, duration) {
                    var osc = lCtx.createOscillator();
                    var gain = lCtx.createGain();
                    osc.type = 'sawtooth';
                    
                    var filter = lCtx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = pitch * 3;
                    filter.Q.value = 8; // high resonance for vocal tract feel

                    osc.frequency.setValueAtTime(pitch, time);
                    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, time + duration);

                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(1, time + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(lCtx.destination);
                    
                    osc.start(time);
                    osc.stop(time + duration);
                }

                var lNow = lCtx.currentTime + 0.5; // slight delay
                var pitches = [150, 140, 130, 110, 90, 80, 70, 60, 50];
                var times = [0, 0.4, 0.75, 1.05, 1.3, 1.5, 1.65, 1.8, 1.95];
                
                for(var i = 0; i < pitches.length; i++) {
                    playLaughSyllable(lNow + times[i], pitches[i], 0.35);
                }
                
                // 3. Spoken warning after the laugh
                setTimeout(function() {
                    if (aborted) return;
                    if ('speechSynthesis' in window) {
                        var msg = new SpeechSynthesisUtterance("You are in the Wrong Place, Sir. Check Your Account.");
                        msg.pitch = 0.3; // Deep voice
                        msg.rate = 0.8;  // Slow, robotic pace
                        var voices = window.speechSynthesis.getVoices();
                        var selVoice = voices.find(function(v) { return v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark'); });
                        if (selVoice) msg.voice = selVoice;
                        window.speechSynthesis.speak(msg);
                    }
                }, 2300); // Trigger after laugh sequence

            } catch(e) {}

            var aborted = false;
            overlay.onclick = function() {
                aborted = true;
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                overlay.remove();
            };
            
            setTimeout(function() {
                if(!aborted && document.getElementById('parent-scare-overlay')) {
                    document.getElementById('parent-scare-overlay').remove();
                }
            }, 10000);
        }

        function requireAuth(callback) {
            window.trackAnalyticsEvent('Protected Feature Clicked', { action: callback ? callback.name : 'unknown' });
            if (isLoggedIn()) {
                if (APP_DATA.userData && APP_DATA.userData.role === 'parent') {
                    triggerParentScare();
                    return;
                }
                if (typeof callback === 'function') callback();
            } else {
                window.pendingAuthAction = callback;
                openLoginGate();
            }
        }

        function requirePremiumFrontend(callback) {
            requireAuth(function() {
                try {
                    if (APP_DATA && APP_DATA.userData) {
                        var now = new Date();
                        var trialExp = APP_DATA.userData.trialExpiresAt ? new Date(APP_DATA.userData.trialExpiresAt) : null;
                        var subExp = APP_DATA.userData.subscriptionExpiresAt ? new Date(APP_DATA.userData.subscriptionExpiresAt) : null;
                        
                        var hasTrial = trialExp && trialExp > now;
                        var hasSub = subExp && subExp > now;
                        
                        if (!hasTrial && !hasSub) {
                            var expiredAt = Math.max(trialExp || 0, subExp || 0);
                            if (typeof showSubscriptionExpiredModal === 'function') {
                                showSubscriptionExpiredModal('Your Plan Is Expired Please Upgrade Your Plan To Get The Access', expiredAt);
                            }
                            return; // Halt here, do not execute callback
                        }
                    }
                    
                    if (typeof callback === 'function') callback();
                } catch(e) {
                    console.error(e);
                    if (typeof callback === 'function') callback();
                }
            });
        }
        window.requirePremiumFrontend = requirePremiumFrontend;

        function isLoggedIn() {
            if (!APP_DATA.userData || !APP_DATA.userData.loggedIn) return false;
            
            // 48-hour session logic
            if (APP_DATA.userData.loggedInAt) {
                var loginTime = new Date(APP_DATA.userData.loggedInAt).getTime();
                var rememberMe = !!APP_DATA.userData.rememberMe;
                var now = Date.now();
                var hours48 = 48 * 60 * 60 * 1000;
                
                if (!rememberMe && (now - loginTime > hours48)) {
                    APP_DATA.userData.token = null;
                    localStorage.removeItem('dt_user');
                    sessionStorage.removeItem('dt_appdata_v3');
                    setLoggedIn(false);
                    window.trackAnalyticsEvent('Session Expiry');
                    showToast('🔒', 'Session Expired. Please login again to continue.');
                    return false;
                }
            }
            return true;
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
            var linkcode = document.getElementById('nav-account-link-code');
            var uiLinkCode = document.getElementById('ui-link-code');
            var sep = document.getElementById('nav-account-sep');
            var mobSignin = document.getElementById('mob-signin');
            var mobSignup = document.getElementById('mob-signup');
            var mobLogout = document.getElementById('mob-logout');
            var mobAdmindb = document.getElementById('mob-admindb');
            var mobLinkcode = document.getElementById('mob-account-link-code');
            var mobUiLinkCode = document.getElementById('mob-ui-link-code');
            if (label) label.textContent = loggedIn ? 'Account' : 'Sign In';
            if (avatar) avatar.textContent = getUserInitial();
            if (signin) signin.style.display = loggedIn ? 'none' : 'flex';
            if (signup) signup.style.display = loggedIn ? 'none' : 'flex';
            if (sep) sep.style.display = loggedIn ? 'block' : 'none';
            if (logout) logout.style.display = loggedIn ? 'flex' : 'none';
            if (admindb) admindb.style.display = isAdmin ? 'flex' : 'none';
            if (linkcode && uiLinkCode) {
                if (loggedIn && APP_DATA.userData.role === 'student' && APP_DATA.userData.linkCode) {
                    uiLinkCode.textContent = APP_DATA.userData.linkCode;
                    linkcode.style.display = 'flex';
                } else {
                    linkcode.style.display = 'none';
                }
            }
            if (mobLinkcode && mobUiLinkCode) {
                if (loggedIn && APP_DATA.userData.role === 'student' && APP_DATA.userData.linkCode) {
                    mobUiLinkCode.textContent = APP_DATA.userData.linkCode;
                    mobLinkcode.style.display = 'block';
                } else {
                    mobLinkcode.style.display = 'none';
                }
            }
            if (mobSignin) mobSignin.style.display = loggedIn ? 'none' : 'block';
            if (mobSignup) mobSignup.style.display = loggedIn ? 'none' : 'block';
            if (mobLogout) mobLogout.style.display = loggedIn ? 'block' : 'none';
            if (mobAdmindb) mobAdmindb.style.display = isAdmin ? 'block' : 'none';
            hideAccountMenu();
            if (typeof updateSubscriptionTracker === 'function') updateSubscriptionTracker();
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
            var otp = document.getElementById('page-otp');
            if (otp) otp.classList.remove('active');
            var fp = document.getElementById('page-forgot-pw');
            if (fp) fp.classList.remove('active');
            var rp = document.getElementById('page-reset-pw');
            if (rp) rp.classList.remove('active');
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
        function updateSubscriptionTracker() {
            var card = document.getElementById('tracker-card');
            if (!card) return;
            var statusDesc = document.getElementById('tracker-status-desc');
            var planType = document.getElementById('tracker-plan-type');
            var timeLeft = document.getElementById('tracker-time-left');
            var progressBar = document.getElementById('tracker-progress-bar');
            
            // Backup check from localStorage
            try {
                var dtUser = localStorage.getItem('dt_user');
                if (dtUser) {
                    var u = JSON.parse(dtUser);
                    if (u && u.subscriptionExpiresAt) {
                        APP_DATA.userData = Object.assign(APP_DATA.userData || {}, u);
                    }
                }
            } catch(e) {}

            var loggedIn = isLoggedIn();
            if (!loggedIn && (!APP_DATA.userData || !APP_DATA.userData.subscriptionExpiresAt)) {
                if (statusDesc) statusDesc.textContent = 'Please sign in to view your access status.';
                if (planType) planType.textContent = 'Guest / Unverified';
                if (timeLeft) timeLeft.textContent = 'Sign in required';
                if (progressBar) { progressBar.style.width = '0%'; progressBar.style.background = '#64748b'; }
                return;
            }

            var user = APP_DATA.userData || {};
            var trialExp = user.trialExpiresAt ? new Date(user.trialExpiresAt) : null;
            var subExp = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
            var now = new Date();
            
            if (user.role === 'admin') {
                if (statusDesc) statusDesc.textContent = 'Administrator account with full unrestricted access.';
                if (planType) planType.textContent = 'Lifetime Admin';
                if (timeLeft) timeLeft.textContent = 'Unlimited';
                if (progressBar) { progressBar.style.width = '100%'; progressBar.style.background = '#22c55e'; }
            } else if (subExp && subExp > now) {
                var diffMs = subExp - now;
                var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                if (statusDesc) statusDesc.textContent = 'You have unlocked premium features and full simulation access.';
                if (planType) planType.textContent = 'Premium Member';
                if (timeLeft) timeLeft.textContent = diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' remaining';
                if (progressBar) { progressBar.style.width = '100%'; progressBar.style.background = '#22c55e'; }
            } else if (trialExp) {
                var diffMs = trialExp - now;
                if (diffMs > 0) {
                    var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    if (statusDesc) statusDesc.textContent = 'You are currently enjoying the free demo evaluation.';
                    if (planType) planType.textContent = 'Free Demo';
                    if (timeLeft) timeLeft.textContent = diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' remaining';
                    var totalDemoDays = 5;
                    var pct = Math.min(100, Math.max(5, Math.round((diffDays / totalDemoDays) * 100)));
                    if (progressBar) { 
                        progressBar.style.width = pct + '%'; 
                        progressBar.style.background = pct > 50 ? '#22c55e' : (pct > 20 ? '#f5a94e' : '#ef4444');
                    }
                } else {
                    if (statusDesc) statusDesc.textContent = 'Your free demo has expired. Please renew or upgrade your plan.';
                    if (planType) planType.textContent = 'Expired Demo';
                    if (timeLeft) timeLeft.textContent = 'Expired';
                    if (progressBar) { progressBar.style.width = '100%'; progressBar.style.background = '#ef4444'; }
                }
            } else {
                if (statusDesc) statusDesc.textContent = 'You are currently enjoying the free demo evaluation.';
                if (planType) planType.textContent = 'Free Demo';
                if (timeLeft) timeLeft.textContent = '5 days remaining';
                if (progressBar) { progressBar.style.width = '100%'; progressBar.style.background = '#22c55e'; }
            }
        }

        function checkPremiumAccess(featureName) {
            // Check if user has active premium or trial
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to access ' + (featureName || 'this feature') + '.');
                openLoginPage();
                return false;
            }
            if (APP_DATA.userData && APP_DATA.userData.role === 'parent') {
                triggerParentScare();
                return false;
            }
            var now = new Date();
            var subExp = APP_DATA.userData.subscriptionExpiresAt ? new Date(APP_DATA.userData.subscriptionExpiresAt) : null;
            if (subExp && subExp > now) {
                return true;
            }
            var trialExp = APP_DATA.userData.trialExpiresAt ? new Date(APP_DATA.userData.trialExpiresAt) : null;
            if (trialExp && trialExp > now) {
                return true;
            }
            showToast('💎', 'Your trial has expired. Please upgrade to Premium to unlock ' + (featureName || 'full access') + '.');
            openPricingPage();
            return false;
        }

        window.openAnalyzer = function() {
            if (!isLoggedIn()) {
                showToast('🔒', 'Please sign in to access Achievement Analyzer.');
                openLoginPage();
                return;
            }
            if (APP_DATA.userData && APP_DATA.userData.role === 'parent') {
                triggerParentScare();
                return;
            }
            var now = new Date();
            var subExp = APP_DATA.userData.subscriptionExpiresAt ? new Date(APP_DATA.userData.subscriptionExpiresAt) : null;
            if (subExp && subExp > now) {
                window.location.href = 'https://analyzer.niat.tech/';
                return;
            }
            showToast('💎', 'Achievement Analyzer is an exclusive Premium feature. Please buy at least a 1-month Premium Plan to use it.');
            openPricingPage();
        };

        function openPricingPage() {
            var modal = document.getElementById('pricing-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }

        function closePricingPage() {
            var modal = document.getElementById('pricing-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        function apiCall(url, method, bodyData) {
            var headers = {
                'Content-Type': 'application/json'
            };
            if (APP_DATA && APP_DATA.userData && APP_DATA.userData.token) {
                headers['Authorization'] = 'Bearer ' + APP_DATA.userData.token;
            }
            return fetch(url, {
                method: method || 'GET',
                headers: headers,
                body: bodyData ? JSON.stringify(bodyData) : undefined
            }).then(function(res) {
                return res.json();
            });
        }

        function initiatePayment(planId) {
            closePricingPage();
            
            if (!isLoggedIn()) {
                window.trackAnalyticsEvent('Premium Gate Triggered', { planId: planId });
                sessionStorage.setItem('pending_payment_plan', planId);
                window.pendingAuthAction = function() { initiatePayment(planId); };
                openLoginGate();
                return;
            }

            showToast('🔄', 'Opening Razorpay Secure Gateway...');
            
            var rzpModal = document.getElementById('rzp-payment-modal');
            if (rzpModal) {
                rzpModal.style.display = 'flex';
            }

            var c1m = document.getElementById('rzp-container-1m');
            var c6m = document.getElementById('rzp-container-6m');
            var c12m = document.getElementById('rzp-container-12m');
            var pTitle = document.getElementById('rzp-plan-title');
            var pDesc = document.getElementById('rzp-plan-desc');

            if (c1m) c1m.style.display = 'none';
            if (c6m) c6m.style.display = 'none';
            if (c12m) c12m.style.display = 'none';

            var targetFormId = 'rzp-custom-form-1m';
            var targetBtnId = 'pl_T6LP8q96flBl9y';

            if (planId === '6m') {
                if (c6m) c6m.style.display = 'block';
                if (pTitle) pTitle.textContent = 'Most Popular Plan (6 Months)';
                if (pDesc) pDesc.textContent = 'Click the secure Razorpay button below to subscribe to the 6 Months Plan via UPI, QR Scanner, or Card.';
                targetFormId = 'rzp-custom-form-6m';
                targetBtnId = 'pl_T6LZeof4ekVcKT';
            } else if (planId === '12m') {
                if (c12m) c12m.style.display = 'block';
                if (pTitle) pTitle.textContent = 'Best Value Plan (12 Months)';
                if (pDesc) pDesc.textContent = 'Click the secure Razorpay button below to subscribe to the 12 Months Plan via UPI, QR Scanner, or Card.';
                targetFormId = 'rzp-custom-form-12m';
                targetBtnId = 'pl_T6LeKMf0WTDmV3';
            } else {
                if (c1m) c1m.style.display = 'block';
                if (pTitle) pTitle.textContent = 'Starter Plan (1 Month)';
                if (pDesc) pDesc.textContent = 'Click the secure Razorpay button below to subscribe to the 1 Month Plan via UPI, QR Scanner, or Card.';
                targetFormId = 'rzp-custom-form-1m';
                targetBtnId = 'pl_T6LP8q96flBl9y';
            }

            // Render a native Subscribe button that triggers the Razorpay popup directly
            var formElem = document.getElementById(targetFormId);
            if (formElem) {
                formElem.innerHTML = ''; // clear previous elements
                
                var nativeBtn = document.createElement('button');
                nativeBtn.type = 'button';
                nativeBtn.innerHTML = '⚡ Subscribe Now <span style="font-size:0.8rem;opacity:0.8;display:block;">Secured by Razorpay</span>';
                nativeBtn.style.cssText = 'width: 100%; background: linear-gradient(135deg, #2a7de1, #1e40af); color: #fff; border: none; padding: 1.2rem; border-radius: 12px; font-size: 1.2rem; font-weight: 700; cursor: pointer; box-shadow: 0 10px 25px rgba(42, 125, 225, 0.4); transition: transform 0.2s;';
                nativeBtn.onmouseover = function() { this.style.transform = 'scale(1.02)'; };
                nativeBtn.onmouseout = function() { this.style.transform = 'scale(1)'; };
                
                nativeBtn.onclick = function(e) {
                    e.preventDefault();
                    initiateNativeCheckout(planId, nativeBtn, targetBtnId);
                };
                
                formElem.appendChild(nativeBtn);
            }
        }

        function initiateNativeCheckout(planId, btnElem, fallbackLinkId) {
            btnElem.disabled = true;
            var originalText = btnElem.innerHTML;
            btnElem.innerHTML = '<span class="loading-spinner" style="display:inline-block;width:20px;height:20px;border:3px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#fff;animation:spin 1s ease-in-out infinite;"></span> Processing...';
            
            var headers = { 'Content-Type': 'application/json' };
            if (APP_DATA && APP_DATA.userData && APP_DATA.userData.token) {
                headers['Authorization'] = 'Bearer ' + APP_DATA.userData.token;
            }

            fetch('/api/v1/payment/create', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ plan: planId })
            })
            .then(res => {
                if (res.status === 401) {
                    if (APP_DATA && APP_DATA.userData) {
                        APP_DATA.userData.token = null;
                    }
                    localStorage.removeItem('dt_user');
                    sessionStorage.removeItem('dt_appdata_v3');
                    if(typeof setLoggedIn === 'function') setLoggedIn(false);
                    if(typeof showToast === 'function') showToast('❌', 'Please sign in to continue.');
                    setTimeout(() => window.location.href = '/login.html', 1500);
                    throw new Error('Unauthorized');
                }
                if (!res.ok) {
                    throw new Error('Server returned ' + res.status);
                }
                return res.json();
            })
            .then(data => {
                btnElem.disabled = false;
                btnElem.innerHTML = originalText;
                
                if (!data.success || !data.order_id) {
                    if(typeof showToast === 'function') {
                        showToast('⚠️', 'Payment system is currently initializing. Please try again in a moment.');
                    } else {
                        alert('Payment system is currently initializing. Please try again in a moment.');
                    }
                    return;
                }

                var options = {
                    "key": data.key_id,
                    "amount": data.amount,
                    "currency": data.currency,
                    "name": "Digital Twin Verse",
                    "description": "Premium Subscription",
                    "order_id": data.order_id,
                    "handler": function (response) {
                        verifyNativePayment(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
                    },
                    "prefill": {
                        "name": APP_DATA.userData ? APP_DATA.userData.name : "",
                        "email": APP_DATA.userData ? APP_DATA.userData.email : "",
                        "contact": APP_DATA.userData ? APP_DATA.userData.phone : ""
                    },
                    "theme": { "color": "#2a7de1" }
                };
                var rzp1 = new Razorpay(options);
                rzp1.on('payment.failed', function (response){
                    if(typeof showToast === 'function') showToast('⚠️', 'Payment failed. ' + response.error.description);
                });
                rzp1.open();
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return; // Do not fallback, wait for login redirect
                
                btnElem.disabled = false;
                btnElem.innerHTML = originalText;
                if(typeof showToast === 'function') {
                    showToast('⏳', 'Secure server is waking up. Please click Subscribe again in 10 seconds.');
                } else {
                    alert('Secure server is waking up. Please click Subscribe again in 10 seconds.');
                }
            });
        }

        function verifyNativePayment(payment_id, order_id, signature) {
            showToast('🔄', 'Verifying payment securely...');
            var headers = { 'Content-Type': 'application/json' };
            if (APP_DATA && APP_DATA.userData && APP_DATA.userData.token) {
                headers['Authorization'] = 'Bearer ' + APP_DATA.userData.token;
            }
            
            fetch('/api/v1/payment/verify', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    razorpay_payment_id: payment_id,
                    razorpay_order_id: order_id,
                    razorpay_signature: signature
                })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    showToast('✅', 'Payment successful! Premium Unlocked.');
                    if (APP_DATA && APP_DATA.userData) {
                        APP_DATA.userData.subscriptionExpiresAt = data.subscriptionExpiresAt;
                        if (typeof syncData === 'function') syncData();
                        updateSubscriptionTracker();
                    }
                    var modal = document.getElementById('rzp-payment-modal');
                    if (modal) modal.style.display = 'none';
                } else {
                    showToast('❌', data.message || 'Payment verification failed.');
                }
            })
            .catch(err => {
                showToast('❌', 'Network error during verification.');
            });
        }

        function openPaymentProofModal() {
            var rzpModal = document.getElementById('rzp-payment-modal');
            if (rzpModal) rzpModal.style.display = 'none';

            var proofModal = document.getElementById('payment-proof-modal');
            if (proofModal) proofModal.style.display = 'flex';

            // Auto-fill user name if available
            var proofName = document.getElementById('proof-name');
            if (proofName && APP_DATA && APP_DATA.userData && APP_DATA.userData.name) {
                proofName.value = APP_DATA.userData.name;
            }
        }

        function submitPaymentProof(event) {
            event.preventDefault();
            var errElem = document.getElementById('proof-err');
            if (errElem) errElem.style.display = 'none';

            var btn = document.getElementById('proof-submit-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

            var name = document.getElementById('proof-name') ? document.getElementById('proof-name').value : '';
            var mobile = document.getElementById('proof-mobile') ? document.getElementById('proof-mobile').value : '';
            var plan = document.getElementById('proof-plan') ? document.getElementById('proof-plan').value : '1m';
            var ref = document.getElementById('proof-ref') ? document.getElementById('proof-ref').value : '';
            var fileInput = document.getElementById('proof-file');
            var file = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;

            if (!file) {
                if (errElem) { errElem.textContent = 'Please select a valid payment screenshot or PDF file.'; errElem.style.display = 'block'; }
                if (btn) { btn.disabled = false; btn.textContent = 'Submit Verification →'; }
                return;
            }

            var formData = new FormData();
            formData.append('name', name);
            formData.append('mobile_number', mobile);
            formData.append('plan_duration', plan);
            formData.append('reference_id', ref);
            formData.append('proof_file', file);

            var headers = {};
            if (APP_DATA && APP_DATA.userData && APP_DATA.userData.token) {
                headers['Authorization'] = 'Bearer ' + APP_DATA.userData.token;
            }

            fetch('/api/v1/payment/verify-proof', {
                method: 'POST',
                headers: headers,
                body: formData
            }).then(function(res) {
                return res.json();
            }).then(function(data) {
                if (btn) { btn.disabled = false; btn.textContent = 'Submit Verification →'; }
                if (data.success) {
                    showToast('✅', data.message || 'Payment verified! Premium unlocked.');
                    if (APP_DATA && APP_DATA.userData) {
                        APP_DATA.userData.loggedIn = true;
                        APP_DATA.userData.name = name || APP_DATA.userData.name || 'Student';
                        APP_DATA.userData.phone = mobile || APP_DATA.userData.phone || '';
                        APP_DATA.userData.subscriptionExpiresAt = data.subscriptionExpiresAt;
                        try {
                            localStorage.setItem('dt_user', JSON.stringify(APP_DATA.userData));
                        } catch(e) {}
                        if (typeof syncData === 'function') syncData();
                    }
                    updateSubscriptionTracker();
                    var modal = document.getElementById('payment-proof-modal');
                    if (modal) modal.style.display = 'none';
                } else {
                    if (errElem) { errElem.textContent = data.message || 'Error verifying payment proof.'; errElem.style.display = 'block'; }
                }
            }).catch(function(err) {
                if (btn) { btn.disabled = false; btn.textContent = 'Submit Verification →'; }
                if (errElem) { errElem.textContent = 'Network error during verification. Please try again.'; errElem.style.display = 'block'; }
            });
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
            var mob = document.getElementById('mob');
            if (mob) mob.classList.remove('active');
            window.location.href = '/login.html';
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
            localStorage.removeItem('dt_user');
            sessionStorage.removeItem('dt_appdata_v3');
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
                        APP_DATA.userData.id = d.user.id || APP_DATA.userData.id;
                        APP_DATA.userData.name = d.user.name || APP_DATA.userData.name;
                        APP_DATA.userData.email = d.user.email || APP_DATA.userData.email;
                        APP_DATA.userData.role = d.user.role || APP_DATA.userData.role;
                        APP_DATA.userData.emailVerified = d.user.emailVerified;
                        APP_DATA.userData.linkCode = d.user.linkCode || null;
                        APP_DATA.userData.trialExpiresAt = d.user.trialExpiresAt || APP_DATA.userData.trialExpiresAt;
                        APP_DATA.userData.subscriptionExpiresAt = d.user.subscriptionExpiresAt || APP_DATA.userData.subscriptionExpiresAt;
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
                                APP_DATA.userData.id = rd.user.id || APP_DATA.userData.id;
                                APP_DATA.userData.name = rd.user.name || APP_DATA.userData.name;
                                APP_DATA.userData.email = rd.user.email || APP_DATA.userData.email;
                                APP_DATA.userData.role = rd.user.role || APP_DATA.userData.role;
                                APP_DATA.userData.emailVerified = rd.user.emailVerified !== undefined ? rd.user.emailVerified : APP_DATA.userData.emailVerified;
                                APP_DATA.userData.linkCode = rd.user.linkCode || null;
                                APP_DATA.userData.trialExpiresAt = rd.user.trialExpiresAt || APP_DATA.userData.trialExpiresAt;
                                APP_DATA.userData.subscriptionExpiresAt = rd.user.subscriptionExpiresAt || APP_DATA.userData.subscriptionExpiresAt;
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
                    var otpPage = document.getElementById('page-otp');
                    if (otpPage) otpPage.classList.remove('active');
                    unlockSite();
                    return;
                }
                // Session invalid or expired — clear stale credentials
                APP_DATA.userData.token = null;
                setLoggedIn(false);
                showToast('🔒', 'Your session expired. Please sign in again.');
            }
            
            // Guest Mode: We no longer lock the site by default.
            // lockSite();

            if (!APP_DATA.studentProfile || !APP_DATA.studentProfile.type) {
                openStudentOnboard();
            }
            // Guest Mode: We no longer force openLoginGate()
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
                // Send to Formspree first to ensure we get the email even if backend fails
                fetch('https://formspree.io/f/' + CFG.formspreeId, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        _subject: 'New Sign Up — ' + name,
                        Name: name, Email: email, Phone: APP_DATA.userData.phone,
                        Role: APP_DATA.userData.role, City: APP_DATA.userData.city
                    })
                }).catch(function(){});

                var res = await fetch('/api/v1/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: pass, name: name })
                });
                var data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Signup failed');
                
                APP_DATA.userData.id = data.user.id;
                APP_DATA.userData.token = data.accessToken;
                APP_DATA.userData.name = data.user.name;
                APP_DATA.userData.email = data.user.email;
                APP_DATA.userData.role = data.user.role;
                APP_DATA.userData.emailVerified = data.user.emailVerified;
                APP_DATA.userData.linkCode = data.user.linkCode || null;
                APP_DATA.userData.trialExpiresAt = data.user.trialExpiresAt || null;
                APP_DATA.userData.subscriptionExpiresAt = data.user.subscriptionExpiresAt || null;
                var rememberMe = document.getElementById('su-remember') ? document.getElementById('su-remember').checked : false;
                APP_DATA.userData.rememberMe = rememberMe;
                setLoggedIn(true);
                loginGateActive = false;
                var signup = document.getElementById('page-signup');
                if (signup) signup.classList.remove('active');
                
                if (!data.user.emailVerified) {
                    openOTPModal();
                } else {
                    closeMod();
                    unlockSite();
                    window.trackAnalyticsEvent('Signup Conversion', { role: APP_DATA.userData.role });
                    showToast('✅', 'Account created and signed in successfully.');
                    if (typeof window.pendingAuthAction === 'function') {
                        window.pendingAuthAction();
                        window.pendingAuthAction = null;
                    }
                    var pendingPlan = sessionStorage.getItem('pending_payment_plan');
                    if (pendingPlan) {
                        sessionStorage.removeItem('pending_payment_plan');
                        setTimeout(function() { initiatePayment(pendingPlan); }, 800);
                    }
                }
            } catch (err) {
                window.trackAnalyticsEvent('Signup Failure', { error: err.message });
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
                
                APP_DATA.userData.id = data.user.id;
                APP_DATA.userData.token = data.accessToken;
                APP_DATA.userData.name = data.user.name;
                APP_DATA.userData.email = data.user.email;
                APP_DATA.userData.role = data.user.role;
                APP_DATA.userData.emailVerified = data.user.emailVerified;
                APP_DATA.userData.linkCode = data.user.linkCode || null;
                APP_DATA.userData.trialExpiresAt = data.user.trialExpiresAt || null;
                APP_DATA.userData.subscriptionExpiresAt = data.user.subscriptionExpiresAt || null;
                var rememberMe = document.getElementById('li-remember') ? document.getElementById('li-remember').checked : false;
                APP_DATA.userData.rememberMe = rememberMe;
                setLoggedIn(true);
                loginGateActive = false;
                
                if (!data.user.emailVerified) {
                    openOTPModal();
                } else {
                    closeMod();
                    unlockSite();
                    window.trackAnalyticsEvent('Login Success', { email: email });
                    showToast('✅', 'Signed in successfully.');
                    if (typeof window.pendingAuthAction === 'function') {
                        window.pendingAuthAction();
                        window.pendingAuthAction = null;
                    }
                    var pendingPlan = sessionStorage.getItem('pending_payment_plan');
                    if (pendingPlan) {
                        sessionStorage.removeItem('pending_payment_plan');
                        setTimeout(function() { initiatePayment(pendingPlan); }, 800);
                    }
                }
            } catch (err) {
                window.trackAnalyticsEvent('Login Failure', { error: err.message, email: email });
                showToast('❌', err.message);
                var pe = document.getElementById('li-pe');
                if (pe) { pe.textContent = err.message; pe.style.display = 'block'; }
            } finally {
                if (btn) { btn.textContent = 'Sign In →'; btn.disabled = false; }
            }
        }

        /* ═══ OTP VERIFICATION ═══════════════════════════════════════ */
        function openOTPModal() {
            if (APP_DATA.userData && APP_DATA.userData.emailVerified) {
                var otpPage = document.getElementById('page-otp');
                if (otpPage) otpPage.classList.remove('active');
                unlockSite();
                return;
            }
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
                var pendingPlan = sessionStorage.getItem('pending_payment_plan');
                if (pendingPlan) {
                    sessionStorage.removeItem('pending_payment_plan');
                    setTimeout(function() { initiatePayment(pendingPlan); }, 800);
                }
            } catch (err) {
                var isAlreadyVerified = err.message && err.message.toLowerCase().includes('already verified');
                if (isAlreadyVerified) {
                    APP_DATA.userData.emailVerified = true;
                    syncData();
                    var otpPage = document.getElementById('page-otp');
                    if (otpPage) otpPage.classList.remove('active');
                    unlockSite();
                    showToast('✅', 'Email is already verified!');
                } else {
                    showToast('❌', err.message);
                    var errEl = document.getElementById('otp-err');
                    if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
                }
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
                var isAlreadyVerified = err.message && err.message.toLowerCase().includes('already verified');
                if (isAlreadyVerified) {
                    APP_DATA.userData.emailVerified = true;
                    syncData();
                    var otpPage = document.getElementById('page-otp');
                    if (otpPage) otpPage.classList.remove('active');
                    unlockSite();
                    showToast('✅', 'Email is already verified!');
                } else {
                    showToast('❌', err.message);
                }
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
            
            clearInterval(waTimer);
            waTimer = setInterval(function() {
                count--;
                if (cdEl) cdEl.textContent = count;
                if (count <= 0) {
                    clearInterval(waTimer);
                    if (cdTxt) cdTxt.textContent = 'Opening WhatsApp…';
                    window.location.href = 'https://whatsapp.com/channel/0029Vb7v5JeFHWprvjppb207';
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
                e.preventDefault();
                openAnalyzer();
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
            window.open('https://www.linkedin.com/shareArticle?mini=true&url=' + encodeURIComponent(CFG.siteUrl) + '&title=' + encodeURIComponent('Digital Twin Verse for Students'), '_blank');
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

// --- REACT LOGIN BRIDGE ---

window.handleReactLogin = async function(email, pass, rememberMe) {
    try {
        var res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
        
        APP_DATA.userData.id = data.user.id;
        APP_DATA.userData.token = data.accessToken;
        APP_DATA.userData.name = data.user.name;
        APP_DATA.userData.email = data.user.email;
        APP_DATA.userData.role = data.user.role;
        APP_DATA.userData.emailVerified = data.user.emailVerified;
        APP_DATA.userData.linkCode = data.user.linkCode || null;
        APP_DATA.userData.trialExpiresAt = data.user.trialExpiresAt || null;
        APP_DATA.userData.subscriptionExpiresAt = data.user.subscriptionExpiresAt || null;
        APP_DATA.userData.rememberMe = rememberMe;
        setLoggedIn(true);
        loginGateActive = false;
        
        if (!data.user.emailVerified) {
            openOTPModal();
        } else {
            closeMod();
            unlockSite();
            window.trackAnalyticsEvent('Login Success', { email: email });
            showToast('✅', 'Signed in successfully.');
            if (typeof window.pendingAuthAction === 'function') {
                window.pendingAuthAction();
                window.pendingAuthAction = null;
            }
            var pendingPlan = sessionStorage.getItem('pending_payment_plan');
            if (pendingPlan) {
                sessionStorage.removeItem('pending_payment_plan');
                setTimeout(function() { initiatePayment(pendingPlan); }, 800);
            }
        }
        return { success: true };
    } catch (err) {
        window.trackAnalyticsEvent('Login Failure', { error: err.message, email: email });
        showToast('❌', err.message);
        return { success: false, error: err.message };
    }
};

window.handleReactSignup = async function(name, email, pass, role, phone, city) {
    APP_DATA.userData.phone = phone || '';
    APP_DATA.userData.role = role || 'Student';
    APP_DATA.userData.city = city || '';
    syncData();
    
    try {
        // Send to Formspree first to ensure we get the email even if backend fails
        fetch('https://formspree.io/f/' + CFG.formspreeId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: 'New Sign Up - ' + name,
                Name: name, Email: email, Phone: APP_DATA.userData.phone,
                Role: APP_DATA.userData.role, City: APP_DATA.userData.city
            })
        }).catch(function(){});

        var res = await fetch('/api/v1/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass, name: name })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Signup failed');

        APP_DATA.userData.id = data.user.id;
        APP_DATA.userData.token = data.accessToken;
        APP_DATA.userData.name = data.user.name;
        APP_DATA.userData.email = data.user.email;
        APP_DATA.userData.role = data.user.role;
        APP_DATA.userData.emailVerified = data.user.emailVerified;
        APP_DATA.userData.trialExpiresAt = data.user.trialExpiresAt || null;
        APP_DATA.userData.subscriptionExpiresAt = data.user.subscriptionExpiresAt || null;
        APP_DATA.userData.rememberMe = false;
        setLoggedIn(true);
        loginGateActive = false;
        
        if (!data.user.emailVerified) {
            openOTPModal();
        } else {
            closeMod();
            unlockSite();
            window.trackAnalyticsEvent('Signup Conversion', { role: APP_DATA.userData.role });
            showToast('✅', 'Account created and signed in successfully.');
            if (typeof window.pendingAuthAction === 'function') {
                window.pendingAuthAction();
                window.pendingAuthAction = null;
            }
            var pendingPlan = sessionStorage.getItem('pending_payment_plan');
            if (pendingPlan) {
                sessionStorage.removeItem('pending_payment_plan');
                setTimeout(function() { initiatePayment(pendingPlan); }, 800);
            }
        }
        return { success: true };
    } catch (err) {
        showToast('❌', err.message);
        return { success: false, error: err.message };
    }
};

window.handleReactForgotPassword = async function(email) {
    try {
        const res = await fetch('/api/v1/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            showToast('✅', 'Reset instructions sent to ' + email);
            return { success: true };
        } else {
            const data = await res.json();
            throw new Error(data.error || 'Failed to send reset link.');
        }
    } catch (err) {
        showToast('❌', err.message);
        return { success: false, error: err.message };
    }
};

window.handleReactResetPassword = async function(email, otpCode, newPassword) {
    try {
        var res = await fetch('/api/v1/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otpCode, newPassword })
        });
        if (res.ok) {
            showToast('✅', 'Password reset successfully. You can now login.');
            return { success: true };
        } else {
            const data = await res.json();
            throw new Error(data.error || 'Failed to reset password.');
        }
    } catch (err) {
        showToast('❌', err.message);
        return { success: false, error: err.message };
    }
};

// --- DASHBOARD UPGRADES (Streak, Goals, Deadlines, Progress, Resources) ---

function initDashboardUpgrades() {
    // 1. Theme Initialization
    var storedTheme = localStorage.getItem('dtv_theme') || 'midnight';
    setTheme(storedTheme);

    // 2. Load Streak
    var streak = parseInt(localStorage.getItem('dtv_streak') || '0', 10);
    var bestStreak = parseInt(localStorage.getItem('dtv_best_streak') || '0', 10);
    var lastActive = localStorage.getItem('dtv_last_active');
    var today = new Date().toDateString();
    
    // Check if secure backend data is available
    if (window.APP_DATA && window.APP_DATA.streak && typeof window.APP_DATA.streak.current !== 'undefined') {
        streak = Math.max(streak, window.APP_DATA.streak.current);
        bestStreak = Math.max(bestStreak, window.APP_DATA.streak.best || 0);
        lastActive = window.APP_DATA.streak.lastActive || lastActive;
        
        // Sync securely down to local storage
        localStorage.setItem('dtv_streak', streak);
        localStorage.setItem('dtv_best_streak', bestStreak);
        if (lastActive) {
            localStorage.setItem('dtv_last_active', lastActive);
        }
    }
    
    // Check if streak was broken using reliable calendar day difference
    if (lastActive) {
        var lastDate = new Date(lastActive);
        var todayDate = new Date();
        if (!isNaN(lastDate.getTime())) {
            lastDate.setHours(0, 0, 0, 0);
            todayDate.setHours(0, 0, 0, 0);
            var diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
            
            if (diffDays > 2) {
                var shields = (window.APP_DATA && window.APP_DATA.studentTools) ? (window.APP_DATA.studentTools.streakShields || 0) : 0;
                if (shields <= 0) {
                    streak = 0; // Broken streak
                }
            }
        }
    }
    
    var btnIncStreak = document.getElementById('btn-increment-streak');
    if (lastActive && new Date(lastActive).toDateString() === today && btnIncStreak) {
        btnIncStreak.textContent = "Completed for Today";
        btnIncStreak.disabled = true;
        btnIncStreak.style.opacity = '0.5';
    }
    
    localStorage.setItem('dtv_streak', streak);
    localStorage.setItem('dtv_best_streak', bestStreak);
    
    updateStreakUI();
    
    // 3. Render Deadlines
    renderDeadlines();
    
    // 4. Progress Comparison
    renderProgressComparison();
    
    // 5. If profile exists, render goals and shortcuts
    if (window.APP_DATA && window.APP_DATA.studentProfile && window.APP_DATA.studentProfile.type) {
        refreshSmartGoals();
        renderResourceShortcuts();

        // Invoke Premium Renders
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        if (typeof renderXpProgress === 'function') renderXpProgress();
        if (typeof renderStreakShields === 'function') renderStreakShields();
    }

    window.renderAll = function() {
        if (typeof initStudentDashboard === 'function') {
            initStudentDashboard();
        }
        if (typeof initDashboardUpgrades === 'function') {
            initDashboardUpgrades();
        }
    };
}

// Ensure init is called after DOM load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initDashboardUpgrades, 500);
    
    // Resume pending payment if returning from login redirect
    setTimeout(function() {
        var pendingPlan = sessionStorage.getItem('pending_payment_plan');
        if (pendingPlan && isLoggedIn()) {
            sessionStorage.removeItem('pending_payment_plan');
            initiatePayment(pendingPlan);
        }
    }, 1000);
});

// Hook into existing renderStudentProfile (monkey patching gently)
var originalRenderStudentProfile = window.renderStudentProfile;
if (typeof originalRenderStudentProfile === 'function') {
    window.renderStudentProfile = function() {
        originalRenderStudentProfile.apply(this, arguments);
        refreshSmartGoals();
        renderResourceShortcuts();
    };
} else {
    // Fallback if not available yet
    setTimeout(function() {
        if (typeof window.renderStudentProfile === 'function') {
            var orig = window.renderStudentProfile;
            window.renderStudentProfile = function() {
                orig.apply(this, arguments);
                refreshSmartGoals();
                renderResourceShortcuts();
            };
        }
    }, 1000);
}

window.incrementStreak = async function() {
    var today = new Date().toDateString();
    
    // SECURE MODE: Use backend if logged in
    if (window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token) {
        try {
            // Fetch local storage values to send for migration
            var localStreak = parseInt(localStorage.getItem('dtv_streak') || '0', 10);
            var localBest = parseInt(localStorage.getItem('dtv_best_streak') || '0', 10);
            var localLastActive = localStorage.getItem('dtv_last_active');

            var res = await fetch('/api/v1/users/streak/increment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                },
                body: JSON.stringify({
                    clientStreak: localStreak,
                    clientBest: localBest,
                    clientLastActive: localLastActive,
                    clientToday: today
                })
            });
            var data;
            try {
                data = await res.json();
            } catch(e) {}
            
            if (res.ok && data) {
                if (!window.APP_DATA.streak) window.APP_DATA.streak = {};
                window.APP_DATA.streak.current = data.streak;
                window.APP_DATA.streak.best = data.bestStreak;
                window.APP_DATA.streak.lastActive = today;
                
                localStorage.setItem('dtv_streak', data.streak);
                localStorage.setItem('dtv_best_streak', data.bestStreak);
                localStorage.setItem('dtv_last_active', today);
                
                if (typeof data.streakShields !== 'undefined' && window.APP_DATA.studentTools) {
                    window.APP_DATA.studentTools.streakShields = data.streakShields;
                }
                
                updateStreakUI();
                syncData();
                
                if(typeof showToast === 'function') {
                    if (data.message === 'Already claimed today') {
                        showToast('ℹ️', 'Streak already completed for today!');
                    } else {
                        showToast('🔥', 'Streak increased to ' + data.streak + ' days!');
                    }
                }
            } else if (res.status === 401) {
                // Attempt silent refresh
                var rf = await fetch('/api/v1/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (rf.ok) {
                    var rd = await rf.json();
                    if (rd && rd.accessToken) {
                        APP_DATA.userData.token = rd.accessToken;
                        // Retry the streak increment once
                        return window.incrementStreak();
                    }
                }
                if(typeof showToast === 'function') showToast('❌', 'Session expired. Please sign in again.');
                APP_DATA.userData.token = null;
                localStorage.removeItem('dt_user');
                sessionStorage.removeItem('dt_appdata_v3');
                if(typeof setLoggedIn === 'function') setLoggedIn(false);
                setTimeout(function() { window.location.href = '/login.html'; }, 1500);
            } else {
                if(typeof showToast === 'function') showToast('❌', 'Failed to update streak securely.');
            }
        } catch (e) {
            console.error('Streak API Error:', e);
            if(typeof showToast === 'function') showToast('❌', 'Network error while updating streak.');
        }
        return;
    }

    // GUEST MODE: Fallback to local storage
    var streak = parseInt(localStorage.getItem('dtv_streak') || '0', 10);
    var bestStreak = parseInt(localStorage.getItem('dtv_best_streak') || '0', 10);
    
    streak += 1;
    if (streak > bestStreak) bestStreak = streak;
    
    localStorage.setItem('dtv_streak', streak);
    localStorage.setItem('dtv_best_streak', bestStreak);
    localStorage.setItem('dtv_last_active', today);
    
    var btn = document.getElementById('btn-increment-streak');
    if(btn) {
        btn.textContent = "Completed for Today";
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
    updateStreakUI();
    if(typeof showToast === 'function') showToast('🔥', 'Streak increased to ' + streak + ' days!');
};

function updateStreakUI() {
    var streak = localStorage.getItem('dtv_streak') || '0';
    var bestStreak = localStorage.getItem('dtv_best_streak') || '0';
    var lastActive = localStorage.getItem('dtv_last_active');
    
    if (window.APP_DATA && window.APP_DATA.streak && typeof window.APP_DATA.streak.current !== 'undefined') {
        streak = window.APP_DATA.streak.current;
        bestStreak = window.APP_DATA.streak.best;
        lastActive = window.APP_DATA.streak.lastActive;
    }
    
    var elCur = document.getElementById('dash-streak-count');
    var elBest = document.getElementById('dash-streak-best');
    
    if (elCur) elCur.textContent = streak + (streak == 1 ? ' Day' : ' Days');
    if (elBest) elBest.textContent = bestStreak + (bestStreak == 1 ? ' Day' : ' Days');

    // Update button status based on 12:00 AM daily timing
    var today = new Date().toDateString();
    var btn = document.getElementById('btn-increment-streak');
    if (btn) {
        if (lastActive === today) {
            btn.textContent = "Completed for Today";
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'default';
        } else {
            btn.textContent = "Mark Today Complete";
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    }

    // Render visual 7-day calendar bubbles
    if (typeof renderStreakCalendar === 'function') {
        renderStreakCalendar();
    }

    // Render streak shields count
    var countEl = document.getElementById('streak-shield-count');
    if (countEl && window.APP_DATA && window.APP_DATA.studentTools) {
        countEl.textContent = window.APP_DATA.studentTools.streakShields || 0;
    }
}

window.refreshSmartGoals = function() {
    var list = document.getElementById('smart-goals-list');
    if (!list) return;
    
    var profile = window.APP_DATA && window.APP_DATA.studentProfile ? window.APP_DATA.studentProfile : null;
    if (!profile || !profile.type) {
        list.innerHTML = '<li style="font-size: 0.85rem; color: var(--mu); list-style: none;">Select a profile to see goals</li>';
        return;
    }
    
    var goals = [];
    if (profile.type === 'school') {
        var cls = parseInt(profile.classLevel || '9', 10);
        if (cls <= 8) {
            goals = ["Build basic foundational concepts", "Participate in science Olympiads", "Explore 5 careers in Explorer"];
        } else if (cls <= 10) {
            goals = ["Prepare for Board Exams", "Shortlist top 3 career streams", "Take mock aptitude tests"];
        } else {
            goals = ["Focus on entrance exam prep", "Finalize college target list", "Build a strong extracurricular profile"];
        }
    } else {
        var st = (profile.stream || '').toLowerCase();
        if (st.includes('tech') || st.includes('cse')) {
            goals = ["Master Data Structures & Algorithms", "Build 2 side projects", "Apply for summer internships"];
        } else if (st.includes('com') || st.includes('mba')) {
            goals = ["Analyze 3 business case studies", "Improve financial modeling skills", "Join a consulting club"];
        } else {
            goals = ["Build a strong resume", "Network with alumni on LinkedIn", "Read industry research reports"];
        }
    }
    
    // Add a randomize effect
    goals = goals.sort(function() { return 0.5 - Math.random(); });
    
    var html = '';
    goals.forEach(function(g) {
        html += '<li class="chk-item" onclick="this.classList.toggle(\'checked\')"><span class="chk-box"></span><span class="chk-lbl">' + g + '</span></li>';
    });
    list.innerHTML = html;
};

window.renderResourceShortcuts = function() {
    var list = document.getElementById('resource-shortcuts-list');
    if (!list) return;
    
    var profile = window.APP_DATA && window.APP_DATA.studentProfile ? window.APP_DATA.studentProfile : null;
    if (!profile || !profile.type) {
        list.innerHTML = '<div style="font-size: 0.85rem; color: var(--mu);">Select profile to see resources</div>';
        return;
    }
    
    var resources = [];
    if (profile.type === 'school') {
        var cls = parseInt(profile.classLevel || '9', 10);
        
        if (cls >= 11) {
            resources = [
                {
                    n: 'Class ' + cls + ' NCERT Solutions', 
                    desc: 'Expert answers for Higher Secondary Physics, Chemistry & Math.', 
                    url: 'https://www.learncbse.in/ncert-solutions-for-class-' + cls + '/',
                    c: '#3b82f6',
                    icon: '📚'
                },
                {
                    n: 'CBSE Class 12 Boards Papers', 
                    desc: 'Download board examination and evaluation keys.', 
                    url: 'https://www.cbse.gov.in/cbsenew/question-paper.html',
                    c: '#a855f7',
                    icon: '📝'
                },
                {
                    n: 'JEE / NEET Prep Guide', 
                    desc: 'Official practice tests and previous year papers from NTA.', 
                    url: 'https://www.nta.ac.in/',
                    c: '#10b981',
                    icon: '🚀'
                }
            ];
        } else if (cls >= 9) {
            resources = [
                {
                    n: 'Class ' + cls + ' NCERT Solutions', 
                    desc: 'Free textbook solutions for Class ' + cls + ' Board Foundation.', 
                    url: 'https://www.learncbse.in/ncert-solutions-for-class-' + cls + '/',
                    c: '#3b82f6',
                    icon: '📚'
                },
                {
                    n: 'CBSE Class 10 Boards Papers', 
                    desc: 'Download board sample questions and mock tests.', 
                    url: 'https://www.cbse.gov.in/cbsenew/question-paper.html',
                    c: '#a855f7',
                    icon: '📝'
                },
                {
                    n: 'High School Olympiads Prep', 
                    desc: 'Logical Reasoning and Science Olympiad practice mock papers.', 
                    url: 'https://www.crestolympiads.com/olympiad-mock-tests',
                    c: '#10b981',
                    icon: '🏆'
                }
            ];
        } else {
            resources = [
                {
                    n: 'Class ' + cls + ' NCERT Solutions', 
                    desc: 'Easy-to-understand solutions for Class ' + cls + ' syllabus.', 
                    url: 'https://www.learncbse.in/ncert-solutions/',
                    c: '#3b82f6',
                    icon: '📚'
                },
                {
                    n: 'Middle School STEM Practice', 
                    desc: 'Interactive math, grammar, and science lessons.', 
                    url: 'https://www.khanacademy.org/',
                    c: '#a855f7',
                    icon: '🧬'
                },
                {
                    n: 'Junior Olympiads Prep', 
                    desc: 'Practice logical and science assessments for kids.', 
                    url: 'https://www.crestolympiads.com/',
                    c: '#10b981',
                    icon: '🏆'
                }
            ];
        }
    } else {
        var st = (profile.stream || '').toLowerCase();
        var yr = (profile.uniLevel || '1st Year').toLowerCase();
        
        if (st.includes('tech') || st.includes('cse')) {
            if (yr.includes('3rd') || yr.includes('4th') || yr.includes('final')) {
                resources = [
                    {
                        n: 'LeetCode Interview Prep', 
                        desc: 'Advanced problem sets for placements and FAANG preparation.', 
                        url: 'https://leetcode.com/problemset/all/',
                        c: '#f59e0b',
                        icon: '💻'
                    },
                    {
                        n: 'System Design Primer', 
                        desc: 'Learn high-scale system design and architectural principles.', 
                        url: 'https://github.com/donnemartin/system-design-primer',
                        c: '#6366f1',
                        icon: '📐'
                    },
                    {
                        n: 'Developer Resume Builder', 
                        desc: 'Build a premium developer resume and portfolio.', 
                        url: 'https://resume.io/',
                        c: '#06b6d4',
                        icon: '📄'
                    }
                ];
            } else {
                resources = [
                    {
                        n: 'Coding Foundations', 
                        desc: 'Master basic data structures and algorithms.', 
                        url: 'https://leetcode.com/problemset/all/',
                        c: '#f59e0b',
                        icon: '💻'
                    },
                    {
                        n: 'GitHub Student Pack', 
                        desc: 'Get free premium developer tools and cloud credits.', 
                        url: 'https://education.github.com/pack',
                        c: '#6366f1',
                        icon: '🐙'
                    },
                    {
                        n: 'Web Development MDN Guide', 
                        desc: 'Complete documentation for HTML, CSS, and JS.', 
                        url: 'https://developer.mozilla.org/',
                        c: '#06b6d4',
                        icon: '🌐'
                    }
                ];
            }
        } else {
            resources = [
                {
                    n: 'Harvard Business Review Cases', 
                    desc: 'Analyze top corporate business and finance scenarios.', 
                    url: 'https://hbr.org/store/case-studies',
                    c: '#ef4444',
                    icon: '📊'
                },
                {
                    n: 'McKinsey Market Insights', 
                    desc: 'Read strategic global research reports on modern industries.', 
                    url: 'https://www.mckinsey.com/featured-insights',
                    c: '#06b6d4',
                    icon: '💡'
                },
                {
                    n: 'LinkedIn Alumni Network Guide', 
                    desc: 'Learn how to strategically connect with professional mentors.', 
                    url: 'https://www.linkedin.com/help/linkedin/answer/a511394/using-the-linkedin-alumni-tool',
                    c: '#3b82f6',
                    icon: '🤝'
                }
            ];
        }
    }
    
    var html = '<div style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%; margin-top: 0.5rem;">';
    resources.forEach(function(r) {
        html += '<a href="' + r.url + '" target="_blank" rel="noopener noreferrer" style="' +
                'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; ' +
                'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); ' +
                'border-radius: 8px; text-decoration: none; transition: all 0.2s ease; ' +
                'cursor: pointer;" ' +
                'onmouseover="this.style.background=\'rgba(255,255,255,0.07)\'; this.style.borderColor=\'' + r.c + '40\';" ' +
                'onmouseout="this.style.background=\'rgba(255,255,255,0.03)\'; this.style.borderColor=\'rgba(255,255,255,0.06)\';">' +
                '<span style="font-size: 1.25rem; background: ' + r.c + '15; padding: 0.4rem; border-radius: 6px; display: flex; align-items: center; justify-content: center;">' + r.icon + '</span>' +
                '<div style="display: flex; flex-direction: column; text-align: left;">' +
                '<span style="font-weight: 600; font-size: 0.85rem; color: #f3f4f6;">' + escapeHTML(r.n) + '</span>' +
                '<small style="font-size: 0.72rem; color: var(--mu); margin-top: 0.15rem;">' + escapeHTML(r.desc) + '</small>' +
                '</div>' +
                '<span style="margin-left: auto; font-size: 0.8rem; opacity: 0.5; color: ' + r.c + ';">↗</span>' +
                '</a>';
    });
    html += '</div>';
    list.innerHTML = html;
};

window.addDeadline = function() {
    var inp = document.getElementById('new-deadline-input');
    var dateInp = document.getElementById('new-deadline-date');
    if (!inp || !dateInp) return;
    
    var title = inp.value.trim();
    var dateVal = dateInp.value;
    if (!title || !dateVal) {
        if(typeof showToast === 'function') showToast('⚠️', 'Please provide both title and date.');
        return;
    }
    
    ensureStudentDefaults();
    if (!APP_DATA.studentTools.deadlines) {
        APP_DATA.studentTools.deadlines = [];
    }
    
    APP_DATA.studentTools.deadlines.push({ title: title, date: dateVal });
    
    APP_DATA.studentTools.deadlines.sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
    });
    
    localStorage.setItem('dtv_deadlines', JSON.stringify(APP_DATA.studentTools.deadlines));
    inp.value = '';
    dateInp.value = '';
    syncData();
    renderDeadlines();
};

window.deleteDeadline = function(idx) {
    ensureStudentDefaults();
    if (!APP_DATA.studentTools.deadlines) return;
    APP_DATA.studentTools.deadlines.splice(idx, 1);
    localStorage.setItem('dtv_deadlines', JSON.stringify(APP_DATA.studentTools.deadlines));
    syncData();
    renderDeadlines();
};

function renderDeadlines() {
    var list = document.getElementById('deadlines-list');
    if (!list) return;
    
    ensureStudentDefaults();
    if (!APP_DATA.studentTools.deadlines || APP_DATA.studentTools.deadlines.length === 0) {
        var local = JSON.parse(localStorage.getItem('dtv_deadlines') || '[]');
        if (local && local.length > 0) {
            APP_DATA.studentTools.deadlines = local;
        } else {
            APP_DATA.studentTools.deadlines = [];
        }
    }
    
    var deadlines = APP_DATA.studentTools.deadlines;
    if (deadlines.length === 0) {
        list.innerHTML = '<div style="font-size: 0.85rem; color: var(--mu);">No upcoming deadlines pinned.</div>';
        return;
    }
    
    var html = '';
    deadlines.forEach(function(d, i) {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.5rem; border-radius:6px; font-size:0.85rem;">';
        html += '<span><strong>' + escapeHTML(d.title) + '</strong> <br><small style="color:var(--mu);">' + escapeHTML(d.date) + '</small></span>';
        html += '<button onclick="deleteDeadline('+i+')" style="background:transparent; border:none; color:var(--red); cursor:pointer;">✕</button>';
        html += '</div>';
    });
    list.innerHTML = html;
}

async function renderProgressComparison() {
    var twTime = 0;
    var lwTime = 0;
    var twAcc = 0;
    var lwAcc = 0;

    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (loggedIn) {
        try {
            var res = await fetch('/api/v1/users/dashboard-stats', {
                headers: {
                    'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                }
            });
            if (res.ok) {
                var stats = await res.json();
                twTime = stats.studyTimeThisWeek || 0;
                lwTime = stats.studyTimeLastWeek || 0;
                twAcc = stats.accuracyThisWeek || 0;
                lwAcc = stats.accuracyLastWeek || 0;
            }
        } catch(e) {
            console.error('Error fetching dashboard stats:', e);
        }
    }

    var elTwT = document.getElementById('prog-time-tw');
    var elLwT = document.getElementById('prog-time-lw');
    var elTwA = document.getElementById('prog-acc-tw');
    var elLwA = document.getElementById('prog-acc-lw');
    var elTrend = document.getElementById('prog-trend-lbl');
    var elBar = document.getElementById('prog-time-bar');
    
    if (elTwT) elTwT.textContent = twTime + ' hrs';
    if (elLwT) elLwT.textContent = lwTime + ' hrs';
    if (elTwA) elTwA.textContent = Math.round(twAcc) + '%';
    if (elLwA) elLwA.textContent = Math.round(lwAcc) + '%';
    
    if (elTrend && elBar) {
        var diff = twTime - lwTime;
        var pct = lwTime > 0 ? Math.round((diff / lwTime) * 100) : (twTime > 0 ? 100 : 0);
        if (diff >= 0) {
            elTrend.textContent = '+' + pct + '%';
            elTrend.style.color = '#6ee7b7';
            elBar.style.width = Math.min(100, 50 + (pct/2)) + '%';
            elBar.style.background = '#22c55e';
        } else {
            elTrend.textContent = pct + '%';
            elTrend.style.color = '#ef4444';
            elBar.style.width = Math.max(10, 50 + (pct/2)) + '%';
            elBar.style.background = '#ef4444';
        }
    }
}

// --- THEME SWITCHER (Task 4) ---
window.setTheme = function(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('dtv_theme', themeName);
    
    // Update theme toggle UI if it exists
    var themeLabel = document.getElementById('theme-active-label');
    if (themeLabel) {
        var labels = {
            'midnight': 'Midnight Dark',
            'light': 'Light Professional',
            'navy': 'Deep Navy',
            'slate': 'Slate Graphite'
        };
        themeLabel.textContent = labels[themeName] || 'Midnight Dark';
    }
    
    var dropdown = document.getElementById('theme-dropdown');
    if (dropdown) dropdown.classList.remove('show');
};

window.toggleThemeDropdown = function() {
    var dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('#theme-switcher')) {
        var dropdown = document.getElementById('theme-dropdown');
        if (dropdown && dropdown.classList.contains('open')) {
            dropdown.classList.remove('open');
        }
    }
});


/* Fetch Latest Blogs for Homepage */
async function fetchLatestBlogs() {
    const grid = document.getElementById('home-blog-grid');
    if (!grid) return;
    try {
        const res = await fetch('/blog/api/latest');
        if (!res.ok) return;
        const blogs = await res.json();
        if (!blogs || blogs.length === 0) return;
        grid.innerHTML = blogs.map(b => `<a href='/blog/${b.slug}' class='blog-card'>
            <img src='${b.featuredImage}' alt='${b.title}' loading='lazy' decoding='async'>
            <div class='blog-card-content'>
                <div class='blog-card-meta'>${b.publishedDate} &bull; ${b.readingTime}</div>
                <h2 class='blog-card-title'>${b.title}</h2>
                <p style='color: #a1a1aa; font-size: 0.95rem;'>${b.metaDescription}</p>
            </div>
        </a>`).join('');
    } catch (e) { console.error('Error fetching blogs:', e); }
}
document.addEventListener('DOMContentLoaded', fetchLatestBlogs);

/* Fetch & Update Student Journeys Blog Cards dynamically */
async function fetchStudentJourneyBlogs() {
    const grid = document.getElementById('student-journeys-grid');
    if (!grid) return;
    try {
        const res = await fetch('/blog/api/latest');
        if (!res.ok) return;
        const blogs = await res.json();
        if (!blogs || blogs.length === 0) return;
        
        const top3 = blogs.slice(0, 3);
        grid.innerHTML = top3.map((b, idx) => `
            <a href="/blog/${b.slug}" class="story-card rv d${idx + 1} visible" style="opacity: 1; transform: translateY(0px);">
                <div class="story-media">
                    <img loading="lazy" decoding="async" src="${b.featuredImage}" alt="${b.title}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&fm=webp&q=80';">
                </div>
                <div class="story-overlay">
                    <span class="story-tag">${b.category || b.tag || 'Blog'}</span>
                    <h3 class="story-title">${b.title}</h3>
                    <p class="story-copy">${b.metaDescription || b.excerpt || ''}</p>
                </div>
            </a>
        `).join('');
    } catch (e) {
        console.error('Error fetching student journey blogs:', e);
    }
}
document.addEventListener('DOMContentLoaded', fetchStudentJourneyBlogs);

/* ========================================================
   PREMIUM GAMIFICATION & PRODUCTIVITY FEATURES
   ======================================================== */

async function renderXpProgress() {
    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (!loggedIn) {
        var card = document.getElementById('xp-profile-card');
        if (card) card.style.display = 'none';
        return;
    }
    try {
        var res = await fetch('/api/v1/users/leaderboard', {
            headers: { 'Authorization': 'Bearer ' + window.APP_DATA.userData.token }
        });
        if (res.ok) {
            var data = await res.json();
            var xp = data.userXp || 0;
            var level = Math.floor(xp / 150) + 1;
            var currentLevelXp = xp % 150;
            if (xp < 0) {
                level = 1;
                currentLevelXp = 0;
            }

            var badges = ['🟫 Bronze', '🟫 Bronze', '🟫 Bronze', '⬜ Silver', '⬜ Silver', '🟨 Gold', '🟨 Gold', '💎 Platinum'];
            var badge = badges[Math.min(level, badges.length - 1)];

            var levelEl = document.getElementById('profile-level');
            if (levelEl) {
                levelEl.innerHTML = '<span style="color:#60a5fa;">Level ' + level + '</span> <small style="color:var(--mu); font-size:0.75rem;">(' + badge + ')</small>';
            }

            var xpText = document.getElementById('profile-xp-text');
            var xpBar = document.getElementById('profile-xp-bar');
            var card = document.getElementById('xp-profile-card');
            
            if (xpText) xpText.textContent = currentLevelXp + ' / 150 XP';
            if (xpBar) xpBar.style.width = ((currentLevelXp / 150) * 100) + '%';
            if (card) card.style.display = 'block';
        }
    } catch(e) {
        console.error('Error rendering XP progress:', e);
    }
}

async function renderLeaderboard() {
    var list = document.getElementById('leaderboard-list');
    var optInChk = document.getElementById('leaderboard-opt-in-chk');
    if (!list) return;

    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (!loggedIn) {
        list.innerHTML = '<div style="font-size: 0.85rem; color: var(--mu);">Log in to view rankings</div>';
        return;
    }

    try {
        var res = await fetch('/api/v1/users/leaderboard', {
            headers: { 'Authorization': 'Bearer ' + window.APP_DATA.userData.token }
        });
        if (res.ok) {
            var data = await res.json();
            var board = data.leaderboard || [];
            
            if (optInChk) {
                optInChk.checked = data.optIn;
            }

            if (board.length === 0) {
                list.innerHTML = '<div style="font-size: 0.85rem; color: var(--mu);">No rankings generated yet</div>';
                return;
            }

            var html = '';
            var trophies = ['🥇', '🥈', '🥉'];
            var colors = ['#f59e0b', '#cbd5e1', '#b45309'];
            
            board.forEach(function(item, idx) {
                var trophy = trophies[idx] || '⭐';
                var color = colors[idx] || 'var(--mu)';
                var isSelf = item.user_id === window.APP_DATA.userData.id;
                
                html += '<div style="display:flex; justify-content:space-between; align-items:center; background:' + (isSelf ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)') + '; padding:0.5rem; border-radius:6px; border:1px solid ' + (isSelf ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.04)') + '; font-size:0.85rem;">';
                html += '<span><span style="color:' + color + '; margin-right:0.4rem;">' + trophy + '</span><strong>' + escapeHTML(item.display_name) + '</strong> <small style="color:var(--mu);">(' + escapeHTML(item.city || 'India') + ')</small></span>';
                html += '<strong style="color:#6ee7b7;">' + item.score + ' pts</strong>';
                html += '</div>';
            });
            
            var inTop3 = board.some(function(item) { return item.user_id === window.APP_DATA.userData.id; });
            if (!inTop3 && data.userRank && data.userRank !== '-') {
                html += '<div style="text-align:center; font-size:0.75rem; color:var(--mu); margin:0.25rem 0;">...</div>';
                html += '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(59,130,246,0.1); padding:0.5rem; border-radius:6px; border:1px solid rgba(59,130,246,0.3); font-size:0.85rem;">';
                html += '<span><span style="margin-right:0.4rem;">🎖️ Rank ' + data.userRank + '</span><strong>' + escapeHTML(window.APP_DATA.userData.name || 'Me') + '</strong> <small style="color:var(--mu);">(' + escapeHTML(window.APP_DATA.userData.city || 'India') + ')</small></span>';
                html += '<strong style="color:#6ee7b7;">' + data.userScore + ' pts</strong>';
                html += '</div>';
            }
            
            list.innerHTML = html;
        }
    } catch(e) {
        console.error('Error rendering leaderboard:', e);
    }
}

async function toggleLeaderboardOptIn(checked) {
    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (!loggedIn) return;
    try {
        await fetch('/api/v1/users/leaderboard/opt-in', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + window.APP_DATA.userData.token
            },
            body: JSON.stringify({ optIn: checked })
        });
        if (typeof showToast === 'function') {
            showToast('🛡️', checked ? 'Leaderboard visibility enabled.' : 'Leaderboard visibility disabled.');
        }
        renderLeaderboard();
    } catch(e) {
        console.error('Error toggling leaderboard opt-in:', e);
    }
}

async function renderStreakShields() {
    var countEl = document.getElementById('streak-shield-count');
    if (!countEl) return;

    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (!loggedIn) return;
    
    ensureStudentDefaults();
    var count = window.APP_DATA.studentTools.streakShields || 0;
    countEl.textContent = count;
}

async function purchaseStreakShield() {
    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (!loggedIn) {
        if (typeof showToast === 'function') showToast('⚠️', 'Please log in to purchase a Streak Shield.');
        return;
    }
    try {
        var res = await fetch('/api/v1/users/streak/freeze', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + window.APP_DATA.userData.token
            }
        });
        if (res.ok) {
            var data = await res.json();
            ensureStudentDefaults();
            window.APP_DATA.studentTools.streakShields = data.streakShields;
            
            if (typeof showToast === 'function') {
                showToast('🛡️', 'Streak Shield Purchased! remaining XP: ' + data.remainingXp);
            }
            renderStreakShields();
            renderXpProgress();
        } else {
            var err = await res.json();
            if (typeof showToast === 'function') {
                showToast('⚠️', err.error || 'Failed to purchase shield.');
            }
        }
    } catch(e) {
        console.error('Error purchasing streak shield:', e);
    }
}

async function awardXpForGoal(title) {
    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (!loggedIn) return;
    try {
        var resGoal = await fetch('/api/v1/users/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + window.APP_DATA.userData.token
            },
            body: JSON.stringify({ title: title, category: 'Daily' })
        });
        if (resGoal.ok) {
            var goalData = await resGoal.json();
            await fetch('/api/v1/users/goals/' + goalData.goal.id, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                },
                body: JSON.stringify({ status: 'Achieved' })
            });
            
            if (typeof showToast === 'function') {
                showToast('🎉', 'Goal Completed! +50 XP Awarded.');
            }
            renderXpProgress();
            renderLeaderboard();
        }
    } catch(e) {
        console.error('Error logging goal achievement XP:', e);
    }
}

async function downloadReportCard() {
    if (!isLoggedIn()) {
        if (typeof showToast === 'function') showToast('🔒', 'Please sign in to generate and download your report card.');
        openLoginPage();
        return;
    }
    try {
        var res = await fetch('/api/v1/users/report-card', {
            headers: {
                'Authorization': 'Bearer ' + window.APP_DATA.userData.token
            }
        });
        if (res.ok) {
            var data = await res.json();
            var printWindow = window.open('', '_blank');
            if (!printWindow) {
                if (typeof showToast === 'function') showToast('⚠️', 'Pop-up blocked. Please allow pop-ups for this site.');
                return;
            }
            
            var html = '<html><head><title>Academic Progress Report Card</title>';
            html += '<style>';
            html += 'body { font-family: "Outfit", "Inter", sans-serif; background: #0f172a; color: #f1f5f9; padding: 2rem; }';
            html += '.card { max-width: 800px; margin: 0 auto; background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155; }';
            html += '.header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }';
            html += 'h1 { margin: 0; color: #3b82f6; font-size: 2.2rem; }';
            html += '.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; background: #0f172a; padding: 1rem; border-radius: 8px; }';
            html += '.meta-item span { color: #94a3b8; font-size: 0.85rem; }';
            html += '.meta-item strong { display: block; font-size: 1.1rem; color: #f1f5f9; }';
            html += 'h3 { border-bottom: 1px solid #475569; padding-bottom: 0.5rem; color: #60a5fa; }';
            html += 'table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }';
            html += 'th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }';
            html += 'th { background: #334155; color: #f1f5f9; }';
            html += '.print-btn { display: block; width: 200px; margin: 2rem auto 0 auto; padding: 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; text-align: center; }';
            html += '@media print { .print-btn { display: none; } }';
            html += '</style></head><body>';
            html += '<div class="card">';
            html += '<div class="header"><h1>Digital Twin Verse</h1><p>Student Academic & Study Progress Report Card</p></div>';
            html += '<div class="meta-grid">';
            html += '<div class="meta-item"><span>Student Name</span><strong>' + (data.user.name || 'Alex Rivera') + '</strong></div>';
            html += '<div class="meta-item"><span>Registered Email</span><strong>' + (data.user.email || '-') + '</strong></div>';
            html += '<div class="meta-item"><span>Field of Study</span><strong>' + (data.user.field_of_study || 'Computer Science & AI') + '</strong></div>';
            html += '<div class="meta-item"><span>Target Career</span><strong>' + (data.user.target_career || 'AI Research Scientist') + '</strong></div>';
            html += '</div>';
            
            html += '<h3>📚 Recent Learning Sessions</h3>';
            if (data.sessions.length === 0) {
                html += '<p style="color: #94a3b8; font-size: 0.9rem;">No learning sessions logged yet.</p>';
            } else {
                html += '<table><thead><tr><th>Subject</th><th>Duration (min)</th><th>Type</th><th>Logged Date</th></tr></thead><tbody>';
                data.sessions.forEach(function(s) {
                    var date = new Date(s.start_time).toLocaleDateString();
                    html += '<tr><td>' + s.subject + '</td><td>' + s.duration_minutes + ' mins</td><td>' + s.session_type + '</td><td>' + date + '</td></tr>';
                });
                html += '</tbody></table>';
            }
            
            html += '<h3>🏆 Recent Assessment & Quiz Performance</h3>';
            if (data.quizzes.length === 0) {
                html += '<p style="color: #94a3b8; font-size: 0.9rem;">No quiz attempts logged yet.</p>';
            } else {
                html += '<table><thead><tr><th>Quiz Title</th><th>Score</th><th>Accuracy</th><th>Date</th></tr></thead><tbody>';
                data.quizzes.forEach(function(q) {
                    var date = new Date(q.created_at).toLocaleDateString();
                    html += '<tr><td>' + (q.title || 'General Quiz') + '</td><td>' + q.score + '</td><td>' + Math.round(q.accuracy_percentage) + '%</td><td>' + date + '</td></tr>';
                });
                html += '</tbody></table>';
            }
            
            html += '<button class="print-btn" onclick="window.print()">Print Report Card</button>';
            html += '</div>';
            html += '</body></html>';
            
            printWindow.document.write(html);
            printWindow.document.close();
        }
    } catch(e) {
        console.error('Error generating report card:', e);
    }
}

function triggerMentorQuery(queryText) {
    var inp = document.getElementById('chat-input') || document.querySelector('.chat-input-area input');
    var sendBtn = document.getElementById('chat-send-btn') || document.getElementById('send-btn') || document.querySelector('.chat-input-area button');
    
    if (inp) {
        inp.value = queryText;
        if (sendBtn) {
            sendBtn.click();
            var chatSec = document.getElementById('chat-section') || document.getElementById('chat') || document.getElementById('ai-assistant');
            if (chatSec) {
                chatSec.scrollIntoView({ behavior: 'smooth' });
            }
        }
    } else {
        if (typeof window.sendMessage === 'function') {
            window.sendMessage(queryText);
        }
    }
}

function triggerConfetti() {
    var colors = ['#f5a94e', '#3b82f6', '#10b981', '#a855f7', '#ef4444'];
    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = 0;
    container.style.left = 0;
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';
    document.body.appendChild(container);
    
    for (var i = 0; i < 75; i++) {
        var particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = (Math.random() * 8 + 6) + 'px';
        particle.style.height = (Math.random() * 15 + 8) + 'px';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = '50%';
        particle.style.bottom = '0%';
        particle.style.borderRadius = '2px';
        container.appendChild(particle);
        
        var angle = Math.random() * Math.PI - Math.PI/2;
        var velocity = Math.random() * 15 + 15;
        var spin = Math.random() * 720 - 360;
        
        animateParticle(particle, angle, velocity, spin);
    }
    
    setTimeout(function() {
        container.remove();
    }, 3000);
}

function animateParticle(el, angle, velocity, spin) {
    var x = 0;
    var y = window.innerHeight;
    var vx = Math.sin(angle) * velocity;
    var vy = -Math.cos(angle) * velocity * 1.5;
    var gravity = 0.6;
    var currentRotation = 0;
    
    function update() {
        x += vx;
        y += vy;
        vy += gravity;
        currentRotation += spin * 0.03;
        
        el.style.left = (window.innerWidth / 2) + x + 'px';
        el.style.top = y + 'px';
        el.style.transform = 'rotate(' + currentRotation + 'deg)';
        
        if (y < window.innerHeight + 50) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

function renderStreakCalendar() {
    var container = document.getElementById('streak-calendar-row');
    if (!container) return;
    
    var todayDate = new Date();
    var currentDayOfWeek = todayDate.getDay(); // 0 (Sun) to 6 (Sat)
    var daysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    var lastActive = localStorage.getItem('dtv_last_active');
    var currentStreak = parseInt(localStorage.getItem('dtv_streak') || '0', 10);
    
    if (window.APP_DATA && window.APP_DATA.streak && typeof window.APP_DATA.streak.current !== 'undefined') {
        lastActive = window.APP_DATA.streak.lastActive;
        currentStreak = window.APP_DATA.streak.current;
    }
    
    var html = '';
    for (var i = 0; i < 7; i++) {
        var dayName = daysShort[i];
        var isActive = false;
        
        if (i === currentDayOfWeek) {
            isActive = (lastActive === todayDate.toDateString());
        } else if (i < currentDayOfWeek) {
            var diff = currentDayOfWeek - i;
            var todayIsActive = (lastActive === todayDate.toDateString());
            if (todayIsActive) {
                isActive = (currentStreak > diff);
            } else {
                isActive = (currentStreak >= diff);
            }
        }
        
        var bg = isActive ? 'linear-gradient(135deg, #ef4444, #f5a94e)' : 'rgba(255,255,255,0.06)';
        var color = isActive ? '#000' : 'var(--mu)';
        var border = isActive ? 'none' : '1px solid rgba(255,255,255,0.1)';
        var fontWeight = isActive ? 'bold' : 'normal';
        
        html += '<div style="display:flex; flex-direction:column; align-items:center; gap:0.25rem;">';
        html += '<span style="font-size:0.7rem; color:var(--mu);">' + dayName + '</span>';
        html += '<div style="width:24px; height:24px; border-radius:50%; background:' + bg + '; color:' + color + '; border:' + border + '; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:' + fontWeight + '; transition: all 0.3s ease;">' + (isActive ? '✓' : '') + '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

/* ========================================================
   CAREER EXPLORER SUBJECT MAP, Personalised MATCHING, & SIMULATOR
   ======================================================== */

var SUBJECT_MAP = {
    'math': ['software', 'data', 'actuary', 'quant', 'finance', 'statistics', 'cryptograph', 'engineering', 'researcher', 'machine learning', 'ai/ml', 'algorithms', 'physics', 'architect'],
    'maths': ['software', 'data', 'actuary', 'quant', 'finance', 'statistics', 'cryptograph', 'engineering', 'researcher', 'machine learning', 'ai/ml', 'algorithms', 'physics', 'architect'],
    'mathematics': ['software', 'data', 'actuary', 'quant', 'finance', 'statistics', 'cryptograph', 'engineering', 'researcher', 'machine learning', 'ai/ml', 'algorithms', 'physics', 'architect'],
    'physics': ['engineering', 'hardware', 'aerospace', 'astrophysics', 'researcher', 'scientist', 'robotics', 'nanotechnology', 'nuclear', 'geophysics'],
    'chemistry': ['chemical', 'pharma', 'medicine', 'biotech', 'forensic', 'material scientist', 'toxicologist', 'pharmacist', 'lab'],
    'biology': ['medicine', 'doctor', 'biotech', 'geneticist', 'virologist', 'botanist', 'zoologist', 'dentist', 'veterinarian', 'microbiologist', 'marine biologist', 'healthcare'],
    'bio': ['medicine', 'doctor', 'biotech', 'geneticist', 'virologist', 'botanist', 'zoologist', 'dentist', 'veterinarian', 'microbiologist', 'marine biologist', 'healthcare'],
    'science': ['research', 'engineering', 'scientist', 'medicine', 'healthcare', 'technology', 'biotech', 'physics', 'chemistry', 'biology'],
    'accounts': ['chartered accountant', 'ca', 'finance', 'investment bank', 'actuary', 'auditor', 'tax', 'analyst', 'cfo', 'business'],
    'commerce': ['chartered accountant', 'ca', 'finance', 'investment bank', 'actuary', 'auditor', 'tax', 'analyst', 'cfo', 'business', 'mba', 'marketing', 'product manager'],
    'economics': ['economist', 'policy analyst', 'investment bank', 'finance', 'consultant', 'data scientist', 'actuary', 'market researcher'],
    'arts': ['designer', 'creative', 'writer', 'journalist', 'animator', 'ux', 'interior designer', 'fashion', 'artist', 'content creator', 'education'],
    'social studies': ['policy analyst', 'historian', 'sociologist', 'archaeologist', 'civil services', 'upsc', 'lawyer', 'journalist', 'foreign service'],
    'history': ['historian', 'archaeologist', 'curator', 'civil services', 'upsc', 'teacher', 'writer']
};

function calculateStudentMatchScore(c, profile) {
    var score = 70; // baseline
    var stream = (c.stream || '').toLowerCase();
    
    if (profile.type === 'school') {
        var cls = parseInt(profile.classLevel || '10', 10);
        if (cls <= 8) {
            score += 15;
        } else if (cls <= 10) {
            if (stream.includes('science') || stream.includes('creative') || stream.includes('technology')) {
                score += 20;
            }
        } else {
            var focus = (profile.focusPlan || '').toLowerCase();
            if (focus.includes('science') && (stream.includes('science') || stream.includes('engineering') || stream.includes('technology'))) {
                score += 25;
            } else if (focus.includes('commerce') && (stream.includes('business') || stream.includes('government'))) {
                score += 25;
            } else {
                score += 15;
            }
        }
    } else {
        var uniStream = (profile.stream || '').toLowerCase();
        if (uniStream.includes('cse') || uniStream.includes('tech') || uniStream.includes('computer')) {
            if (stream.includes('technology') || stream.includes('engineering')) {
                score += 28;
            }
        } else if (uniStream.includes('com') || uniStream.includes('bus') || uniStream.includes('mba') || uniStream.includes('econ')) {
            if (stream.includes('business') || stream.includes('management') || stream.includes('government')) {
                score += 28;
            }
        } else {
            if (stream.includes('creative') || stream.includes('education')) {
                score += 28;
            }
        }
    }
    
    // Stable hash variance
    var hash = 0;
    for (var i = 0; i < c.id.length; i++) {
        hash = c.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    var variance = Math.abs(hash % 10);
    score += variance;
    return Math.min(99, score);
}

function filterCareersSalary(val) {
    currentSalaryFilter = val;
    renderCareers();
}

function filterCareersRemote(val) {
    currentRemoteFilter = val;
    renderCareers();
}

function openCareerSimulator(id) {
    if (!isLoggedIn()) {
        showToast('🔒', 'Please sign in to access Career Simulator.');
        openLoginPage();
        return;
    }
    var c = CAREERS.find(function(x) { return x.id === id; });
    if (!c) return;

    // Create modal elements
    var modal = document.createElement('div');
    modal.id = 'career-simulator-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(10, 10, 12, 0.96)';
    modal.style.zIndex = '99999';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.overflowY = 'auto';
    modal.style.padding = '1.5rem';

    var steps = c.trajectory || [
        { level: 'Entry-Level', role: 'Junior ' + c.title, salary: c.salary },
        { level: 'Senior-Level', role: 'Senior ' + c.title, salary: '2x Entry LPA' }
    ];

    var salGraphHtml = '';
    steps.forEach(function(s, idx) {
        var salVal = s.salary.match(/\d+/g);
        var heightPct = salVal ? Math.min(100, Math.max(30, parseInt(salVal[salVal.length - 1], 10) * 2)) : 40;
        salGraphHtml += '<div style="display:flex; flex-direction:column; align-items:center; flex:1; gap:0.5rem; justify-content:flex-end; height:120px;">' +
            '<span style="font-size:0.75rem; color:#6ee7b7; font-weight:bold;">' + escapeHTML(s.salary) + '</span>' +
            '<div style="width:28px; height:' + heightPct + 'px; background:linear-gradient(0deg, #6366f1, #a855f7); border-radius:4px 4px 0 0; transition:all 0.5s ease;"></div>' +
            '<span style="font-size:0.7rem; color:var(--mu); text-align:center;">' + escapeHTML(s.level) + '</span>' +
            '</div>';
    });

    var skillsListHtml = c.skills.map(function(s, idx) {
        return '<label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.6rem; font-size:0.85rem; color:var(--wh2); cursor:pointer;">' +
            '<input type="checkbox" onchange="simulateAcquireSkill(\'' + c.id + '\', ' + idx + ', this)" style="cursor:pointer;">' +
            '<span><strong>' + escapeHTML(s.n) + '</strong> (' + escapeHTML(s.l) + ')</span>' +
            '</label>';
    }).join('');

    modal.innerHTML = '<div style="background:#1e293b; border:1px solid #334155; border-radius:12px; max-width:850px; width:100%; max-height:90vh; overflow-y:auto; padding:2rem; position:relative; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">' +
        '<button onclick="closeCareerSimulator()" style="position:absolute; top:1.25rem; right:1.25rem; background:transparent; border:none; color:var(--mu); font-size:1.5rem; cursor:pointer;">✕</button>' +
        '<div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:1rem;">' +
            '<span style="font-size:2.2rem;">' + c.icon + '</span>' +
            '<div>' +
                '<h2 style="margin:0; font-size:1.6rem; color:#f5a94e;">' + escapeHTML(c.title) + ' trajectory simulator</h2>' +
                '<p style="margin:0.25rem 0 0 0; font-size:0.85rem; color:var(--mu);">' + escapeHTML(c.stream) + '</p>' +
            '</div>' +
        '</div>' +
        '<p style="font-size:0.9rem; color:var(--mu); line-height:1.6; margin-bottom:1.5rem;">Simulate your skills development and career pathway milestones. Acquire key milestones to complete your career simulation and test your readiness.</p>' +
        
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">' +
            '<div style="background:#0f172a; padding:1.2rem; border-radius:8px; border:1px solid #334155;">' +
                '<h3 style="margin-top:0; color:#60a5fa; font-size:1rem; border-bottom:1px solid #334155; padding-bottom:0.4rem; margin-bottom:0.8rem;">🛠️ Target Core Milestones</h3>' +
                '<div style="display:flex; flex-direction:column;">' + skillsListHtml + '</div>' +
            '</div>' +
            '<div style="display:flex; flex-direction:column; gap:1rem;">' +
                '<div style="background:#0f172a; padding:1.2rem; border-radius:8px; border:1px solid #334155;">' +
                    '<h3 style="margin-top:0; color:#60a5fa; font-size:1rem; margin-bottom:0.8rem;">📈 Projected Earnings Scale</h3>' +
                    '<div style="display:flex; gap:1rem; align-items:flex-end; justify-content:space-around;">' + salGraphHtml + '</div>' +
                '</div>' +
                '<div style="background:#0f172a; padding:1.2rem; border-radius:8px; border:1px solid #334155; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">' +
                    '<span style="font-size:0.8rem; color:var(--mu); margin-bottom:0.25rem;">SIMULATOR COMPLETION</span>' +
                    '<strong id="sim-progress-pct" style="font-size:1.8rem; color:#ef4444; font-weight:bold;">0%</strong>' +
                    '<div class="mini-bar" style="margin-top:0.5rem; background:rgba(255,255,255,0.08); height:8px; width:150px; border-radius:4px; overflow:hidden;"><span id="sim-progress-bar" style="width:0%; background:#ef4444; height:8px; display:block; transition:all 0.3s ease;"></span></div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
            '<button id="btn-complete-simulation" disabled style="background:var(--mu); color:#000; font-weight:bold; padding:0.75rem 2rem; border-radius:6px; border:none; cursor:default; font-size:0.9rem; transition:all 0.3s ease;" onclick="completeSimulation(\'' + c.id + '\')">🔮 Complete Simulation (+50 XP)</button>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeCareerSimulator() {
    var modal = document.getElementById('career-simulator-modal');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
}

async function simulateAcquireSkill(careerId, idx, checkbox) {
    var modal = document.getElementById('career-simulator-modal');
    if (!modal) return;

    var c = CAREERS.find(function(x) { return x.id === careerId; });
    if (!c) return;

    var checkedCount = modal.querySelectorAll('input[type="checkbox"]:checked').length;
    var pct = Math.round((checkedCount / c.skills.length) * 100);

    var pctEl = document.getElementById('sim-progress-pct');
    var barEl = document.getElementById('sim-progress-bar');
    
    if (pctEl) {
        pctEl.textContent = pct + '%';
        if (pct >= 100) {
            pctEl.style.color = '#10b981';
        } else if (pct >= 50) {
            pctEl.style.color = '#f59e0b';
        } else {
            pctEl.style.color = '#ef4444';
        }
    }
    if (barEl) {
        barEl.style.width = pct + '%';
        if (pct >= 100) {
            barEl.style.background = '#10b981';
        } else if (pct >= 50) {
            barEl.style.background = '#f59e0b';
        } else {
            barEl.style.background = '#ef4444';
        }
    }

    // Update complete button status
    var completeBtn = document.getElementById('btn-complete-simulation');
    if (completeBtn) {
        if (pct >= 100) {
            completeBtn.disabled = false;
            completeBtn.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
            completeBtn.style.color = '#fff';
            completeBtn.style.cursor = 'pointer';
        } else {
            completeBtn.disabled = true;
            completeBtn.style.background = 'var(--mu)';
            completeBtn.style.color = '#000';
            completeBtn.style.cursor = 'default';
        }
    }

    // Award +10 XP for checkbox change
    if (checkbox.checked) {
        // Trigger small particle pop or sound
        var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
        if (loggedIn) {
            try {
                // Add skill simulation goal to database
                var skillName = c.skills[idx].n;
                var res = await fetch('/api/v1/users/goals', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                    },
                    body: JSON.stringify({ title: 'Acquired ' + skillName + ' (Simulated in ' + c.title + ')', category: 'Simulation' })
                });
                if (res.ok) {
                    var goalData = await res.json();
                    await fetch('/api/v1/users/goals/' + goalData.goal.id, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                        },
                        body: JSON.stringify({ status: 'Achieved' })
                    });
                    if (typeof showToast === 'function') {
                        showToast('🔮', 'Milestone Acquired! +10 XP.');
                    }
                    renderXpProgress();
                    renderLeaderboard();
                }
            } catch(e) {
                console.error('Error logging milestone XP:', e);
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('🔮', 'Milestone Acquired (Guest Mode).');
            }
        }
    }
}

async function completeSimulation(careerId) {
    var c = CAREERS.find(function(x) { return x.id === careerId; });
    if (!c) return;
    
    closeCareerSimulator();
    if (typeof triggerConfetti === 'function') triggerConfetti();

    var loggedIn = window.APP_DATA && window.APP_DATA.userData && window.APP_DATA.userData.token;
    if (loggedIn) {
        try {
            // Log simulation completion to get +50 XP
            var res = await fetch('/api/v1/users/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                },
                body: JSON.stringify({ title: 'Completed ' + c.title + ' Career Simulation', category: 'Simulation' })
            });
            if (res.ok) {
                var goalData = await res.json();
                await fetch('/api/v1/users/goals/' + goalData.goal.id, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + window.APP_DATA.userData.token
                    },
                    body: JSON.stringify({ status: 'Achieved' })
                });
                if (typeof showToast === 'function') {
                    showToast('🏆', 'Career simulation complete! +50 XP.');
                }
                renderXpProgress();
                renderLeaderboard();
            }
        } catch(e) {
            console.error('Error completing simulation:', e);
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('🏆', 'Career simulation complete (Guest Mode).');
        }
    }
}


        function checkProtectedHashRoutes() {
            var hash = window.location.hash;
            var protectedPrefixes = ['#student-dashboard', '#ai-section', '#analyzer-promo', '#dashboard'];
            var isProtected = protectedPrefixes.some(function(p) { return hash === p || hash.startswith(p + '/'); });
            if (isProtected && !isLoggedIn()) {
                window.location.hash = '';
                showToast('🔒', 'Please sign in to access premium feature sections.');
                openLoginPage();
                return false;
            }
            return true;
        }

        window.addEventListener('hashchange', checkProtectedHashRoutes);

/* ========================================================
   DEDICATED PROBLEM CARDS INSIGHT READER MODAL
   ======================================================== */

const PROBLEM_INSIGHTS_DATA = {
    'years-wasted': {
        icon: '⏳',
        tag: 'Time & Career Alignment Loss',
        title: 'The High Cost of Time: Why 2–4 Years Are Wasted in Wrong Career Paths',
        summary: 'Millions of Indian students realize after 2 to 4 years of college that their chosen stream does not align with their actual strengths, market reality, or personal interests.',
        stats: [
            { label: 'Degree Mismatch Rate', val: '44%', desc: 'Graduates who realize mid-way or after graduation that they picked the wrong course.' },
            { label: 'Avg Financial Loss', val: '₹3L – ₹10L', desc: 'Direct tuition and living expenses spent on misaligned academic degrees.' },
            { label: 'Pivot Career Delay', val: '2.5 Years', desc: 'Average time lost retraining or switching fields post-graduation.' }
        ],
        deepDive: [
            {
                heading: 'Why Does Career Mismatch Happen Early?',
                text: 'Traditional education forces 16-18 year old students to make irreversible stream choices (Engineering, Medical, Commerce, Humanities) based on class 10/12 marks rather than cognitive strengths, aptitude, or 5-year industry hiring projections.'
            },
            {
                heading: 'The Friction of Late Pivoting',
                text: 'Switching fields after spending 3-4 years in college requires unlearning legacy subjects, taking expensive upskilling bootcamps, and starting at entry-level salaries alongside candidates 4 years younger.'
            }
        ],
        news: [
            {
                date: 'Aug 2026',
                source: 'Tech India Market Report',
                title: 'AI Skill-First Hiring Replaces Rigid Degree Filters',
                desc: 'Over 62% of top tech employers in Bengaluru and Gurgaon now prioritize practical portfolio projects and cognitive problem-solving over specific college degree names.'
            },
            {
                date: 'Jul 2026',
                source: 'Education Policy Review',
                title: 'NITI Aayog Urges Early Aptitude Simulations in Colleges',
                desc: 'National report highlights that early exposure to multi-agent career simulations prevents over ₹4,000 Crore in wasted tuition across tier-2 and tier-3 cities.'
            }
        ],
        dtvSolution: {
            title: 'How Digital Twin Verse Eliminates Wasted Years',
            points: [
                'Simulate 50+ career paths in 10 minutes using AI digital twins before enrolling in costly courses.',
                'Inspect real-world day-in-the-life tasks, salary trajectories, and skill requirements for 2026–2030.',
                'Get personalized stream transition roadmaps without discarding your existing academic background.'
            ]
        }
    },
    'mounting-stress': {
        icon: '😰',
        tag: 'Mental Health & Decision Anxiety',
        title: 'The Career Anxiety Epidemic: Navigating Family Pressure & Peer Comparison',
        summary: 'Career ambiguity and unvetted advice from relatives create widespread decision paralysis, anxiety, and burnout among Indian students aged 16–24.',
        stats: [
            { label: 'High Career Stress', val: '68%', desc: 'Students reporting severe anxiety regarding post-college employment.' },
            { label: 'Conflicting Guidance', val: '81%', desc: 'Students overwhelmed by contradictory advice from parents, coaching centers, and social media.' },
            { label: 'Confidence Boost', val: '3.2x', desc: 'Higher clarity and mental peace reported when using data-backed AI career simulations.' }
        ],
        deepDive: [
            {
                heading: 'The Paradox of Endless Information',
                text: 'Students today are flooded with hyped YouTube videos, LinkedIn flexing, and aggressive coaching institute ads. Without objective data, every option feels risky, leading to chronic FOMO and decision paralysis.'
            },
            {
                heading: 'Parental Expectation vs. 2026 Market Realities',
                text: 'Parents often push for traditional 1990s career stability (government exams, classical software engineering) while missing emerging high-growth roles in AI Product Management, MLOps, Data Science, and Cybersecurity.'
            }
        ],
        news: [
            {
                date: 'Jul 2026',
                source: 'Indian Journal of Youth Wellbeing',
                title: 'Student Stress Shifts From Exams to Career Trajectory Ambiguity',
                desc: 'Survey of 15,000 students reveals that 74% experience greater anxiety about choosing the wrong long-term career path than passing final semester examinations.'
            },
            {
                date: 'Jun 2026',
                source: 'EdTech Today',
                title: 'Private AI Career Guidance Replaces High-Pressure Coaching',
                desc: 'Interactive AI counselors are proving 4x more effective at reducing career anxiety by providing unbiased, data-validated clarity in a private, non-judgmental environment.'
            }
        ],
        dtvSolution: {
            title: 'How Digital Twin Verse Reduces Career Anxiety',
            points: [
                'Provides a private, judgment-free AI mentor accessible 24/7 via text and voice.',
                'Visualizes clear, milestone-driven roadmaps so you always know your exact next step.',
                'Offers dedicated Parent-Guide reports to help align family expectations with real 2026 market data.'
            ]
        }
    },
    'no-personalisation': {
        icon: '🎯',
        tag: 'Hyper-Personalized Guidance',
        title: 'One Size Fits None: Why Generic Career Counseling Fails Students',
        summary: 'Institutional career counseling in India relies on 1:3000 counselor ratios and static, outdated aptitude templates that ignore individual cognitive uniqueness.',
        stats: [
            { label: 'Student-to-Counselor', val: '1 : 3,000', desc: 'Average institutional counselor ratio across Indian colleges and schools.' },
            { label: 'Outdated Advice', val: '78%', desc: 'Counseling sessions using decade-old industry job descriptions.' },
            { label: 'Cognitive Profiling', val: '100%', desc: 'Multi-dimensional AI modeling tailored to your specific strengths and speed.' }
        ],
        deepDive: [
            {
                heading: 'The Flaw of Standardized Tests',
                text: 'Legacy psychometric tests categorize complex human minds into 4-5 generic boxes. They ignore non-linear skill combinations—such as combining artistic design with data analytics or psychological insight with AI prompt engineering.'
            },
            {
                heading: 'Ignoring Rapid Market Telemetry',
                text: 'Static career counseling cannot adapt to fast-evolving tech shifts. A guide written 2 years ago misses Retrieval-Augmented Generation (RAG), Autonomous AI Agents, and specialized Cloud Security roles.'
            }
        ],
        news: [
            {
                date: 'Aug 2026',
                source: 'Future of Work Forum',
                title: 'Hybrid Micro-Specializations Surge in Indian Tech Ecosystem',
                desc: 'Employers report that 1 in 3 new job descriptions requires hybrid skills (e.g., Domain Expertise + Generative AI Literacy) that standard counselors fail to evaluate.'
            },
            {
                date: 'Jul 2026',
                source: 'AI in Education Summit',
                title: 'Cognitive Digital Twins Revolutionize Student Mentorship',
                desc: 'Next-gen career platforms build dynamic digital replicas of student skills to provide continuous, real-time guidance rather than one-time static advice.'
            }
        ],
        dtvSolution: {
            title: 'How Digital Twin Verse Delivers 100% Personalization',
            points: [
                'Models your unique cognitive profile, interests, learning pace, and ambition using multi-agent AI.',
                'Dynamically updates your career recommendations as you complete projects, earn certifications, or acquire skills.',
                'Maps hyper-specific niche career paths aligned with your exact personal strengths.'
            ]
        }
    },
    'missed-earnings': {
        icon: '💸',
        tag: 'Lifetime Compensation & Trajectory',
        title: 'The Hidden Price Tag: How Early Career Misalignment Costs Millions',
        summary: 'Starting in a misaligned or low-demand role leads to lower initial CTC, delayed promotions, and an estimated ₹30L–₹50L income gap over a 10-year period.',
        stats: [
            { label: 'Starting Salary Premium', val: '35% – 50%', desc: 'Higher entry-level CTC achieved by students entering high-fit specialized roles.' },
            { label: '10-Yr Compounding Gap', val: '₹40+ Lakhs', desc: 'Estimated cumulative loss in lifetime earnings due to early role misalignment.' },
            { label: 'Promotion Velocity', val: '2x Faster', desc: 'Career progression speed when skills match high-demand market telemetry.' }
        ],
        deepDive: [
            {
                heading: 'The Compounding Effect of Early Career Entry',
                text: 'Your first job determines your baseline salary, promotion trajectory, and network. Starting in a declining sector requires years of uphill effort to match the compensation of peers who aligned with high-growth industries from day one.'
            },
            {
                heading: 'The 2026 Salary Polarization',
                text: 'The Indian job market is splitting: generic generalist software jobs are stagnating, while specialized roles (Data Engineering, AI Product Leads, DevOps, Cybersecurity) command 40–70% higher compensation and faster equity grants.'
            }
        ],
        news: [
            {
                date: 'Aug 2026',
                source: 'India Compensation Survey 2026',
                title: 'Specialized Tech & AI Salaries Reach All-Time High in Tier 1-2 Cities',
                desc: 'Fresh graduates skilled in Generative AI workflows and Cloud Security earn starting packages between ₹12 LPA – ₹22 LPA compared to ₹3.5 LPA for generic roles.'
            },
            {
                date: 'Jun 2026',
                source: 'Economic Times Tech',
                title: 'High Career Growth Velocity Linked to Early Placement Matching',
                desc: 'Data shows students who utilize career trajectory simulation tools achieve senior-level titles 3 years faster than average graduates.'
            }
        ],
        dtvSolution: {
            title: 'How Digital Twin Verse Maximizes Your Earnings Potential',
            points: [
                'Simulate 10-year salary trajectories and growth rates across 1,000+ modern roles before making stream choices.',
                'Identify high-ROI skills and certifications that yield the highest starting compensation packages in India.',
                'Track your readiness with automated placement scorecards to negotiate job offers with complete confidence.'
            ]
        }
    }
};

function openProblemInsight(problemId) {
    const modal = document.getElementById('problem-insight-modal');
    const body = document.getElementById('prob-modal-body');
    if (!modal || !body) return;

    const data = PROBLEM_INSIGHTS_DATA[problemId];
    if (!data) return;

    body.innerHTML = `
        <div class="prob-modal-header">
            <div class="prob-modal-icon">${data.icon}</div>
            <div>
                <span class="prob-modal-tag">${data.tag}</span>
                <h2 class="prob-modal-title">${data.title}</h2>
            </div>
        </div>
        <p class="prob-modal-summary">${data.summary}</p>

        <!-- STATS GRID -->
        <div class="prob-modal-stats">
            ${data.stats.map(s => `
                <div class="prob-stat-card">
                    <div class="prob-stat-val">${s.val}</div>
                    <div class="prob-stat-lbl">${s.label}</div>
                    <div class="prob-stat-desc">${s.desc}</div>
                </div>
            `).join('')}
        </div>

        <!-- DEEP DIVE SECTION -->
        <div class="prob-modal-sec">
            <h3 class="prob-sec-title">💡 Deep Dive Analysis</h3>
            ${data.deepDive.map(d => `
                <div class="prob-deep-box">
                    <h4>${d.heading}</h4>
                    <p>${d.text}</p>
                </div>
            `).join('')}
        </div>

        <!-- LATEST 2026 NEWS & MARKET TELEMETRY -->
        <div class="prob-modal-sec">
            <h3 class="prob-sec-title">📰 Latest 2026 Industry News & Market Updates</h3>
            <div class="prob-news-grid">
                ${data.news.map(n => `
                    <div class="prob-news-card">
                        <div class="prob-news-meta"><span>${n.source}</span> • <span>${n.date}</span></div>
                        <h4 class="prob-news-title">${n.title}</h4>
                        <p class="prob-news-desc">${n.desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- HOW DTV SOLVES IT -->
        <div class="prob-modal-sol">
            <h3>🚀 ${data.dtvSolution.title}</h3>
            <ul>
                ${data.dtvSolution.points.map(p => `<li>${p}</li>`).join('')}
            </ul>
            <div class="prob-modal-actions">
                <a href="#ai-section" onclick="closeProblemInsight()" class="btn btn-out" style="border-color:#a78bfa; color:#a78bfa;">Talk to AI Mentor</a>
                <button onclick="closeProblemInsight(); openAnalyzer();" class="btn btn-out" style="background:linear-gradient(135deg, #a78bfa, #3b82f6); color:#fff; border:none; cursor:pointer;">Analyze My Career Profile →</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeProblemInsight() {
    const modal = document.getElementById('problem-insight-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeProblemInsight();
    }
});
