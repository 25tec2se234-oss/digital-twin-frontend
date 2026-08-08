// Optimized UX Engine with support for dynamic page transitions
window.initUXEngine = function() {
    // Better mobile detection that doesn't falsely flag touchscreen laptops as mobile
    const isMobile = window.innerWidth <= 768 || (window.matchMedia("(any-hover: none)").matches);

    // --- 1. Custom Interactive Cursor (One-time init) ---
    const cursor = document.getElementById("cursor");
    const cursorRing = document.getElementById("cursor-ring");
    
    if (cursor && cursorRing && window.matchMedia("(pointer: fine)").matches && !window.cursorBound) {
        window.cursorBound = true;
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;
        
        const speed = 0.15;
        
        document.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.setProperty('--x', `${mouseX}px`);
            cursor.style.setProperty('--y', `${mouseY}px`);
        });
        
        const animateCursor = () => {
            ringX += (mouseX - ringX) * speed;
            ringY += (mouseY - ringY) * speed;
            cursorRing.style.setProperty('--x', `${ringX}px`);
            cursorRing.style.setProperty('--y', `${ringY}px`);
            requestAnimationFrame(animateCursor);
        };
        animateCursor();
        
        // Use event delegation for cursor hover states to support dynamic page loads
        document.addEventListener("mouseover", (e) => {
            if (e.target && e.target.closest && e.target.closest('a, button, input, .btn-amb, .btn-out, .feat-card, .auth-card')) {
                document.body.classList.add("hovering");
            } else {
                document.body.classList.remove("hovering");
            }
        });
    }

    // --- 2. tsParticles Background (One-time init) ---
    if (typeof tsParticles !== 'undefined' && !isMobile && !window.particlesLoaded) {
        window.particlesLoaded = true;
        const initParticles = () => {
            tsParticles.load("tsparticles", {
                fpsLimit: 60,
                interactivity: {
                    events: {
                        onHover: { enable: !isMobile, mode: "grab" },
                    },
                    modes: {
                        grab: { distance: 140, links: { opacity: 0.5 } }
                    },
                },
                particles: {
                    color: { value: "#37d7ff" },
                    links: {
                        color: "#7b2fff",
                        distance: 150,
                        enable: !isMobile,
                        opacity: 0.2,
                        width: 1,
                    },
                    move: {
                        enable: true,
                        speed: 0.5,
                        direction: "none",
                        random: false,
                        straight: false,
                        outModes: { default: "bounce" },
                    },
                    number: { value: isMobile ? 15 : 35, density: { enable: true, area: 800 } },
                    opacity: { value: 0.3 },
                    shape: { type: "circle" },
                    size: { value: { min: 1, max: 2 } },
                },
                detectRetina: true,
            });
        };
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => setTimeout(initParticles, 1200));
        } else {
            setTimeout(initParticles, 2000);
        }
    }

    // --- 3. Hacker Text Decoding Effect ---
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    window.decodeText = function(element) {
        if(element.dataset.decoded === "true") return;
        const originalText = element.innerText;
        element.dataset.original = originalText;
        element.dataset.decoded = "true";
        
        let iterations = 0;
        const interval = setInterval(() => {
            element.innerText = originalText.split("")
                .map((letter, index) => {
                    if (index < iterations || letter === " ") {
                        return originalText[index];
                    }
                    return letters[Math.floor(Math.random() * letters.length)];
                })
                .join("");
                
            if (iterations >= originalText.length) {
                clearInterval(interval);
            }
            iterations += 1/3;
        }, 30);
    };

    // --- 4. GSAP Card Reveal Animations ---
    if (!isMobile && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        try {
            ScrollTrigger.getAll().forEach(t => t.kill()); // Clear stale triggers to prevent lag
        } catch(e) {}
        const cards = document.querySelectorAll(".feat-card, .step-card, .info-card");
        cards.forEach((card) => {
            if (card.dataset.revealInit) return;
            card.dataset.revealInit = "true";
            gsap.fromTo(card, 
                { opacity: 0, y: 50, scale: 0.95 },
                { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1, 
                    duration: 1, 
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: card,
                        start: "top 90%",
                        toggleActions: "play none none none"
                    }
                }
            );
        });
    }

    // --- 5. Spotlight Card Effect ---
    if (!isMobile) {
        const spotlightCards = document.querySelectorAll('.feat-card, .auth-card, .dash-card, .glass-panel, .info-card, .step-card, .analyzer-card');
        spotlightCards.forEach(card => {
            if (card.dataset.spotlightInit) return;
            card.dataset.spotlightInit = "true";
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
        
        // --- 6. Magnetic Elements ---
        const magneticBtns = document.querySelectorAll('.btn-amb, .btn-out');
        magneticBtns.forEach(btn => {
            if (btn.dataset.magneticInit) return;
            btn.dataset.magneticInit = "true";
            btn.addEventListener('mousemove', (e) => {
                if (typeof gsap === 'undefined') return;
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(btn, { x: x * 0.4, y: y * 0.4, duration: 0.3, ease: 'power2.out' });
            });
            btn.addEventListener('mouseleave', () => {
                if (typeof gsap === 'undefined') return;
                gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
            });
        });
    }

    // --- 7. Magnetic Cards (Subtle Lean & 3D Tilt) ---
    const magneticCards = document.querySelectorAll('.feat-card, .auth-card, .dash-card, .glass-panel, .info-card, .step-card, .analyzer-card');
    magneticCards.forEach(card => {
        if (card.dataset.tiltInit) return;
        card.dataset.tiltInit = "true";
        const isAnalyzer = card.classList.contains('analyzer-card');
        
        card.addEventListener('mousemove', (e) => {
            if (typeof gsap === 'undefined' || isMobile) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const mult = isAnalyzer ? 0.08 : 0.035;
            const moveMult = isAnalyzer ? 0.02 : 0.05;
            
            gsap.to(card, { 
                transformPerspective: 1200,
                x: x * moveMult, 
                y: y * moveMult, 
                rotationY: x * mult, 
                rotationX: -y * mult,
                duration: 0.4, 
                ease: 'power2.out' 
            });
        });
        card.addEventListener('mouseleave', () => {
            if (typeof gsap === 'undefined' || isMobile) return;
            gsap.to(card, { 
                transformPerspective: isAnalyzer ? 1300 : 1200,
                x: 0, 
                y: 0, 
                rotationY: isAnalyzer ? -10 : 0, 
                rotationX: isAnalyzer ? 8 : 0,
                duration: 0.8, 
                ease: 'elastic.out(1, 0.3)' 
            });
        });
    });

    // --- 8. Deployment Version Checking (One-time init) ---
    if (!window.versionChecked) {
        window.versionChecked = true;
        let currentVersion = null;

        async function checkDeploymentVersion() {
            try {
                const response = await fetch('/api/version', { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    if (!currentVersion) {
                        currentVersion = data.version;
                    } else if (currentVersion !== data.version) {
                        console.log(`New deployment detected: ${currentVersion} -> ${data.version}. Reloading...`);
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistration().then(reg => {
                                if (reg && reg.waiting) {
                                    reg.waiting.postMessage('SKIP_WAITING');
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to check deployment version', e);
            }
        }

        checkDeploymentVersion();
        setInterval(checkDeploymentVersion, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkDeploymentVersion();
            }
        });

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js?v=killswitch', { updateViaCache: 'none' });
            });
        }
    }

    // --- 9. Premium Splash Screen Logic ---
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        const minTime = new Promise(resolve => setTimeout(resolve, 300));
        const winLoad = new Promise(resolve => {
            if (document.readyState === 'complete') resolve();
            else {
                window.addEventListener('load', resolve);
                setTimeout(resolve, 800);
            }
        });
        
        Promise.all([minTime, winLoad]).then(() => {
            splashScreen.classList.add('hidden');
            setTimeout(() => {
                splashScreen.remove();
                const heroTitle = document.querySelector('.auth-hero h1');
                if(heroTitle && typeof decodeText === 'function') decodeText(heroTitle);
            }, 800);
        });
    }
};

// Auto-run on DOMContentLoaded
document.addEventListener("DOMContentLoaded", window.initUXEngine);

// Footer space guard
window.addEventListener('load', () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    
    const cleanup = () => {
        const footerBottom = footer.getBoundingClientRect().bottom + window.scrollY;
        document.querySelectorAll('body *').forEach(el => {
            if (footer.contains(el) || el === footer || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.id === 'page-main' || el.closest('.page') || el.closest('.toast') || el.closest('.mod') || el.closest('.ov') || el.closest('.wa-redirect-ov')) return;
            
            const style = getComputedStyle(el);
            if (style.display !== 'none' && style.position !== 'fixed') {
                const rect = el.getBoundingClientRect();
                const elBottom = rect.bottom + window.scrollY;
                if (elBottom > footerBottom + 50) {
                    el.style.display = 'none';
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                }
            }
        });
    };

    // Run once after a brief delay to allow layout to settle, instead of 180 times
    setTimeout(cleanup, 300);
    window.addEventListener('resize', cleanup);
});
