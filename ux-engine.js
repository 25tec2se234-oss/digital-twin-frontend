document.addEventListener("DOMContentLoaded", () => {
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;

    // --- 1. Custom Interactive Cursor ---
    const cursor = document.getElementById("cursor");
    const cursorRing = document.getElementById("cursor-ring");
    
    if (cursor && cursorRing && window.matchMedia("(pointer: fine)").matches) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;
        
        // Smooth follow for the ring
        const speed = 0.15;
        
        document.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            // Update center dot instantly using CSS variables
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
        
        // Hover states
        const interactiveElements = document.querySelectorAll('a, button, input, .btn-amb, .btn-out, .feat-card, .auth-card');
        interactiveElements.forEach(el => {
            el.addEventListener("mouseenter", () => document.body.classList.add("hovering"));
            el.addEventListener("mouseleave", () => document.body.classList.remove("hovering"));
        });
    }

    // --- 2. tsParticles Neural Network Background ---
    if (typeof tsParticles !== 'undefined' && !isMobile) {
        tsParticles.load("tsparticles", {
            fpsLimit: 60,
            interactivity: {
                events: {
                    onHover: {
                        enable: !isMobile, // Disable grab mode on mobile for performance
                        mode: "grab", 
                    },
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
                    enable: !isMobile, // EXTREME PERFORMANCE HACK: Lines kill mobile GPUs. Disable them.
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
    }

    // --- 3. Hacker Text Decoding Effect ---
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    
    function decodeText(element) {
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
    }

    // --- 4. GSAP Cinematic Scroll Animations ---
    if (!isMobile && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Decode headers removed to preserve HTML structure (<br>, <span>)

        // Cinematic card reveal
        const cards = document.querySelectorAll(".feat-card, .step-card, .info-card");
        cards.forEach((card, index) => {
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
        const spotlightCards = document.querySelectorAll('.feat-card, .auth-card, .dash-card, .glass-panel, .info-card, .step-card');
        spotlightCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
        
        // --- 6. Magnetic Elements (Buttons & Nav) ---
        const magneticBtns = document.querySelectorAll('.btn-amb, .btn-out, .logo, .nav-ul a, .nav-pill, .account-btn');
        magneticBtns.forEach(btn => {
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
    // Restored 3D tilt! Hardware acceleration in CSS makes this smooth now.
    const magneticCards = document.querySelectorAll('.feat-card, .auth-card, .dash-card, .glass-panel, .info-card, .step-card, .analyzer-card');
    magneticCards.forEach(card => {
        const isAnalyzer = card.classList.contains('analyzer-card');
        
        card.addEventListener('mousemove', (e) => {
            if (typeof gsap === 'undefined' || ('ontouchstart' in window)) return; // Skip mousemove on touch devices
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Cards move very slightly and rotate in 3D for a premium feel
            // The analyzer card gets a slightly stronger effect to make the translateZ pop
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
            if (typeof gsap === 'undefined' || ('ontouchstart' in window)) return;
            gsap.to(card, { 
                transformPerspective: 1200,
                x: 0, 
                y: 0, 
                rotationY: 0, 
                rotationX: 0,
                duration: 0.8, 
                ease: 'elastic.out(1, 0.3)' 
            });
        });
    });

    // --- 8. Mobile Gyroscope 3D Tilt ---
    if (window.DeviceOrientationEvent && ('ontouchstart' in window)) {
        window.addEventListener('deviceorientation', (e) => {
            if (typeof gsap === 'undefined') return;
            // Gamma is left/right tilt (-90 to 90)
            // Beta is front/back tilt (-180 to 180)
            const gamma = e.gamma || 0; 
            const beta = e.beta || 0;
            
            // Limit tilt values so it doesn't spin out of control
            const tiltX = Math.min(Math.max(gamma, -25), 25);
            // Assuming the user holds the phone at a ~45 degree angle naturally
            const tiltY = Math.min(Math.max(beta - 45, -25), 25);

            magneticCards.forEach(card => {
                const isAnalyzer = card.classList.contains('analyzer-card');
                const mult = isAnalyzer ? 0.6 : 0.3; // Stronger multiplier for gyro since values are smaller than pixels
                
                gsap.to(card, {
                    transformPerspective: 1000,
                    rotationY: tiltX * mult,
                    rotationX: -tiltY * mult,
                    duration: 0.6,
                    ease: 'power2.out'
                });
            });
        });
    }

    // --- 9. Deployment Version Checking ---
    let currentVersion = null;
    let versionCheckInterval = null;

    async function checkDeploymentVersion() {
        try {
            const response = await fetch('/api/version', { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                if (!currentVersion) {
                    currentVersion = data.version;
                } else if (currentVersion !== data.version) {
                    console.log(`New deployment detected: ${currentVersion} -> ${data.version}. Reloading...`);
                    // Trigger service worker update if exists
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistration().then(reg => {
                            if (reg && reg.waiting) {
                                reg.waiting.postMessage('SKIP_WAITING');
                            }
                            window.location.reload(true);
                        });
                    } else {
                        window.location.reload(true);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to check deployment version', e);
        }
    }

    // Initial check and interval
    checkDeploymentVersion();
    versionCheckInterval = setInterval(checkDeploymentVersion, 5 * 60 * 1000); // Check every 5 minutes

    // Check immediately when user returns to the tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkDeploymentVersion();
        }
    });

    // Handle Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // A new service worker is available, force version check
                            checkDeploymentVersion();
                        }
                    });
                });
            });
        });
        
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload(true);
            }
        });
    }
});
