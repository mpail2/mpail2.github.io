// Load sections dynamically
async function loadSections() {
    const sectionMappings = {
        'summary-section-container': 'sections/summary.html',
        'method-section-container': 'sections/method.html',
        'results-overview-section-container': 'sections/experiments-overview.html',
        'baselines-section-container': 'sections/baselines.html',
        'efficiency-section-container': 'sections/efficiency.html',
        'transfer-section-container': 'sections/transfer.html',
        'generalization-section-container': 'sections/generalization.html',
        'your-turn-section-container': 'sections/your-turn.html'
    };

    const fetchSection = async (sectionFile, attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await fetch(sectionFile, { cache: 'no-cache' });
                if (response.ok) return await response.text();
                console.error(`Failed to load section (${response.status}): ${sectionFile}`);
            } catch (error) {
                console.error(`Error loading section ${sectionFile} (attempt ${i + 1}):`, error);
            }
            await new Promise(r => setTimeout(r, 250 * (i + 1)));
        }
        return null;
    };

    const loadPromises = Object.entries(sectionMappings).map(async ([containerId, sectionFile]) => {
        const html = await fetchSection(sectionFile);
        if (html === null) return;
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
    });
    await Promise.all(loadPromises);
    // Initialize any interactive elements that depend on loaded sections.
    // Wrap so a failure here can't prevent the scroll re-fires below.
    try {
        initializeInteractiveSections();
    } catch (e) {
        console.error('initializeInteractiveSections failed:', e);
    }

    // Make results blocks collapsible (efficiency + transfer)
    document.querySelectorAll('.content-block .collapsible-body').forEach((bodyEl) => {
        const block = bodyEl.closest('.content-block');
        if (!block) return;
        const header = block.querySelector('.subsection-header');
        if (!header) return;

        block.classList.add('collapsible');
        block.classList.add('collapsed'); // begin collapsed
        header.style.cursor = 'pointer';
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', block.classList.contains('collapsed') ? 'false' : 'true');

        const toggle = () => {
            block.classList.toggle('collapsed');
            header.setAttribute('aria-expanded', block.classList.contains('collapsed') ? 'false' : 'true');
        };

        header.addEventListener('click', toggle);
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
    });
    // Trigger scroll recalculation after sections load. Fire several times to
    // account for layout shifts as images/videos finish loading (more noticeable
    // on slower hosts like GitHub Pages), plus once on full window load.
    const fireScroll = () => window.dispatchEvent(new Event('scroll'));
    fireScroll();
    [100, 400, 1000, 2500].forEach(ms => setTimeout(fireScroll, ms));
    window.addEventListener('load', fireScroll);
}

// Load sections when DOM is ready
document.addEventListener('DOMContentLoaded', loadSections);

// Rich term tooltips (bold/italic via data-tooltip-html with <strong>, <em>, etc.)
document.addEventListener('DOMContentLoaded', function() {
    var richTooltip = document.createElement('div');
    richTooltip.className = 'term-rich-tooltip';
    document.body.appendChild(richTooltip);

    var hideTimer = null;
    var HIDE_DELAY_MS = 50;

    var hideTransitionTimer = null;

    function showRichTooltip(termEl) {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (hideTransitionTimer) { clearTimeout(hideTransitionTimer); hideTransitionTimer = null; }
        var html = termEl.getAttribute('data-tooltip-html');
        if (!html) return;
        richTooltip.innerHTML = html;
        richTooltip.style.display = 'block';
        richTooltip.style.left = '-9999px';
        richTooltip.classList.remove('term-rich-tooltip--visible');
        var rect = termEl.getBoundingClientRect();
        var tipRect = richTooltip.getBoundingClientRect();
        var left = rect.left + (rect.width / 2) - (tipRect.width / 2);
        var top = rect.top - tipRect.height - 6;
        richTooltip.style.left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8)) + 'px';
        richTooltip.style.top = Math.max(8, top) + 'px';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                richTooltip.classList.add('term-rich-tooltip--visible');
            });
        });
    }

    function hideRichTooltip() {
        richTooltip.classList.remove('term-rich-tooltip--visible');
        if (hideTransitionTimer) clearTimeout(hideTransitionTimer);
        hideTransitionTimer = setTimeout(function() {
            hideTransitionTimer = null;
            richTooltip.style.display = 'none';
        }, 200);
    }

    function scheduleHide() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function() {
            hideTimer = null;
            hideRichTooltip();
        }, HIDE_DELAY_MS);
    }

    function cancelScheduleHide() {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    document.addEventListener('mouseover', function(e) {
        var el = e.target.closest && e.target.closest('[data-tooltip-html]');
        if (el) {
            cancelScheduleHide();
            showRichTooltip(el);
        } else if (e.target === richTooltip || richTooltip.contains(e.target)) {
            cancelScheduleHide();
        }
    });

    document.addEventListener('mouseout', function(e) {
        var term = e.target.closest && e.target.closest('[data-tooltip-html]');
        var enteringTooltip = e.relatedTarget && (e.relatedTarget === richTooltip || richTooltip.contains(e.relatedTarget));
        if (term && !term.contains(e.relatedTarget) && !enteringTooltip) scheduleHide();
        if (term && !e.relatedTarget) scheduleHide();
    });

    richTooltip.addEventListener('mouseleave', function() {
        cancelScheduleHide();
        hideRichTooltip();
    });
});

// Authors toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Authors toggle functionality
    var authorsToggle = document.getElementById('authors-toggle');
    var authorsSection = document.getElementById('authors-section');
    if (authorsToggle && authorsSection) {
        authorsToggle.addEventListener('click', function() {
            this.classList.toggle('expanded');
            authorsSection.classList.toggle('expanded');
        });
    }
});

// Hero "NO <assumption>" list. The full list sits beside the video and scrolls
// vertically (a seamless carousel) past a STATIC "NO"; whichever assumption is
// beside NO is in focus. Words are read from the markup, so adding a
// <li class="rotator__word"> in index.html is all that's needed.
document.addEventListener('DOMContentLoaded', function() {
    var list = document.getElementById('hero-rotator');
    var no = document.getElementById('hero-no');
    if (!list || !no) return;
    var claim = list.closest('.hero-claim') || list.parentNode;
    var orig = Array.prototype.slice.call(list.querySelectorAll('.rotator__word'));
    var N = orig.length;
    if (!N) return;

    // Clone the words above and below (3 copies) so the strip always has content
    // on both sides of NO and can wrap with no visible seam.
    var clone = function(w) { var c = w.cloneNode(true); c.classList.remove('is-active'); return c; };
    var firstChild = list.firstChild;
    orig.forEach(function(w) { list.insertBefore(clone(w), firstChild); }); // copy above
    orig.forEach(function(w) { list.appendChild(clone(w)); });              // copy below
    var all = Array.prototype.slice.call(list.children);                    // 3N, middle copy is the original

    var i = 0;                                          // step within the middle copy (0..N-1)
    // position only — the strip slides; focus is applied separately so a word only
    // lights up once it is horizontally in-line with NO (i.e. settled at center).
    function position(animate) {
        var h = claim.clientHeight / N;                // N words exactly fill the video height
        all.forEach(function(el) { el.style.height = h + 'px'; });
        list.style.transition = animate ? '' : 'none';
        var ty = claim.clientHeight / 2 - ((N + i) * h + h / 2);
        list.style.transform = 'translateY(' + ty + 'px)';
        if (!animate) { void list.offsetHeight; list.style.transition = ''; } // commit snap, restore transition
    }
    function focusCenter() {
        all.forEach(function(el, k) { el.classList.toggle('is-active', (k % N) === (((i % N) + N) % N)); });
    }
    // light up whichever word's center is within an epsilon of NO's center (used live while dragging)
    function highlightAtCenter(ty) {
        var h = claim.clientHeight / N, center = claim.clientHeight / 2, eps = h * 0.42;
        all.forEach(function(el, k) {
            el.classList.toggle('is-active', Math.abs((ty + k * h + h / 2) - center) < eps);
        });
    }

    position(false); focusCenter();
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function() { position(false); }); }
    window.addEventListener('resize', function() { position(false); });
    setTimeout(function() { position(false); }, 300);  // re-layout once the video sets the height
    setTimeout(function() { position(false); }, 1200);

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ----- auto-cycle (pausable while the user drags) -----
    var cycleTimer = null, dragging = false;
    function startCycle() {
        if (reduce || N < 2 || cycleTimer) return;
        cycleTimer = setInterval(function() {
            if (dragging) return;
            all.forEach(function(el) { el.classList.remove('is-active'); }); // defocus while it travels
            i += 1;
            position(true);
            if (i >= N) {                              // wrapped onto the clone — snap back invisibly
                setTimeout(function() { i -= N; position(false); focusCenter(); }, 560);
            } else {
                setTimeout(focusCenter, 560);          // focus only once it's in-line with NO
            }
        }, 1900);
    }
    function stopCycle() { if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } }

    // ----- drag to scrub through the assumptions; cycling resumes after release -----
    if (!reduce && N >= 2) {
        var wordH = function() { return claim.clientHeight / N; };
        var startY = 0, baseTy = 0;
        var getY = function(e) {
            if (e.touches && e.touches[0]) return e.touches[0].clientY;
            if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientY;
            return e.clientY;
        };
        var onDown = function(e) {
            dragging = true; stopCycle();
            startY = getY(e);
            baseTy = claim.clientHeight / 2 - ((N + i) * wordH() + wordH() / 2);
            list.style.transition = 'none';
            all.forEach(function(el) { el.classList.remove('is-active'); });
            claim.classList.add('is-dragging');
            e.preventDefault();
        };
        var onMove = function(e) {
            if (!dragging) return;
            var ty = baseTy + (getY(e) - startY);
            list.style.transform = 'translateY(' + ty + 'px)';
            highlightAtCenter(ty);             // words light up as they pass NO
            e.preventDefault();
        };
        var onUp = function(e) {
            if (!dragging) return;
            dragging = false; claim.classList.remove('is-dragging');
            i -= Math.round((getY(e) - startY) / wordH());   // drag down -> earlier words
            list.style.transition = '';
            position(true);
            setTimeout(function() {                            // normalize into [0,N) invisibly, then resume
                var ni = ((i % N) + N) % N;
                if (ni !== i) { i = ni; position(false); }
                focusCenter(); startCycle();
            }, 560);
        };
        claim.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        claim.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    }
    startCycle();
});

// Main functionality
document.addEventListener('DOMContentLoaded', function() {
    // One-time hint for task switching in Experiments
    const leftSidebarHint = document.createElement('div');
    leftSidebarHint.className = 'left-sidebar-hint';
    leftSidebarHint.innerHTML = `
        <button class="hint-close" aria-label="Dismiss hint" title="Dismiss">×</button>
        <strong>Tip:</strong> Use the left sidebar to switch between experiment tasks.
    `;
    document.body.appendChild(leftSidebarHint);
    let dismissedLeftHint = false;
    const dismissLeftHint = () => {
        leftSidebarHint.classList.remove('visible');
        dismissedLeftHint = true; // resets on refresh
    };
    leftSidebarHint.querySelector('.hint-close')?.addEventListener('click', dismissLeftHint);
    // Expose for other handlers (e.g., task changes)
    window.dismissLeftSidebarHint = dismissLeftHint;

    const positionLeftSidebarHint = () => {
        const sidebar = document.getElementById('task-buttons-left');
        if (!sidebar) return;
        const sidebarRect = sidebar.getBoundingClientRect();
        if (sidebarRect.width === 0 || sidebarRect.height === 0) return;

        // Ensure we can measure the tooltip
        const wasHidden = !leftSidebarHint.classList.contains('visible');
        if (wasHidden) {
            leftSidebarHint.style.visibility = 'hidden';
            leftSidebarHint.style.display = 'block';
        }

        const hintRect = leftSidebarHint.getBoundingClientRect();

        const gap = 12;
        const left = sidebarRect.right + gap;
        const top = sidebarRect.top + (sidebarRect.height / 2) - (hintRect.height / 2);
        const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - hintRect.width - 8));
        const clampedTop = Math.max(8, Math.min(top, window.innerHeight - hintRect.height - 8));

        leftSidebarHint.style.left = `${clampedLeft}px`;
        leftSidebarHint.style.top = `${clampedTop}px`;
        leftSidebarHint.style.transform = 'translateY(0)';

        // Put the arrow vertically aligned with sidebar center
        const arrowY = (sidebarRect.top + sidebarRect.height / 2) - clampedTop;
        leftSidebarHint.style.setProperty('--hint-arrow-y', `${Math.max(12, Math.min(hintRect.height - 12, arrowY))}px`);

        if (wasHidden) {
            leftSidebarHint.style.display = 'none';
            leftSidebarHint.style.visibility = '';
        }
    };

    window.addEventListener('resize', () => {
        if (leftSidebarHint.classList.contains('visible')) positionLeftSidebarHint();
    });

    // Initialize elements that may or may not be present yet
    initializeInteractiveSections();

    // Initialize navigation elements
    const taskButtonsLeft = document.getElementById('task-buttons-left');
    const tasksSection = document.querySelector('.tasks-section');
    
    // Timeline navigation
    const timelineNav = document.getElementById('timeline-nav');
    const themeToggle = document.getElementById('theme-toggle');

    // Initialize navigation state
    window.isTimelineNavigating = false;

    if (themeToggle) {
        themeToggle.classList.add('hidden-on-hero');
    }
    
    window.addEventListener('scroll', function() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        // Show/hide timeline navigation based on hero visibility
        const heroSection = document.querySelector('.hero-section');
        if (heroSection && timelineNav) {
            const heroRect = heroSection.getBoundingClientRect();
            const heroBottom = heroRect.bottom + window.scrollY; // static page-space bottom
            if (window.scrollY > heroBottom - windowHeight * 0.25) {
                timelineNav.classList.add('visible');
            } else {
                timelineNav.classList.remove('visible');
            }
        }

        // Get section references (they are loaded dynamically)
        const summarySection = document.getElementById('summary-section');
        const methodSection = document.getElementById('method-section');
        const resultsOverviewSection = document.getElementById('results-overview-section');
        const baselinesSection = document.getElementById('baselines-section');
        const efficiencySection = document.getElementById('efficiency-section');
        const transferSection = document.getElementById('transfer-section');
        const generalizationSection = document.getElementById('generalization-section');
        const yourTurnSection = document.getElementById('your-turn-section');

        // Only bail if nothing has loaded yet. Otherwise run with whatever
        // sections are present so a single slow/failed fetch (e.g. on GitHub
        // Pages) can't freeze the whole scroll/highlight/task-button logic.
        if (!summarySection && !methodSection && !resultsOverviewSection &&
            !efficiencySection && !transferSection && !generalizationSection &&
            !yourTurnSection) {
            return;
        }

        // Safe rect: missing sections are treated as far off-screen (top = Infinity)
        // so they never satisfy "top < threshold" checks below.
        const OFF = { top: Infinity, bottom: Infinity };
        const rectOf = (el) => (el ? el.getBoundingClientRect() : OFF);

        // Get section positions
        const summaryRect = rectOf(summarySection);
        const methodRect = rectOf(methodSection);
        const resultsOverviewRect = rectOf(resultsOverviewSection);
        const baselinesRect = rectOf(baselinesSection);
        const efficiencyRect = rectOf(efficiencySection);
        const transferRect = rectOf(transferSection);
        const generalizationRect = rectOf(generalizationSection);
        const yourTurnRect = rectOf(yourTurnSection);
        
        // Show/hide left task buttons
        if (taskButtonsLeft) {
            const showLeftButtons = efficiencyRect.top < windowHeight * 0.75 && generalizationRect.top > windowHeight * 0.5;
            if (showLeftButtons) {
                taskButtonsLeft.classList.add('visible');
            } else {
                taskButtonsLeft.classList.remove('visible');
            }
        }

        if (themeToggle) {
            if (scrollY > windowHeight * 0.9) {
                themeToggle.classList.remove('hidden-on-hero');
            } else {
                themeToggle.classList.add('hidden-on-hero');
            }
        }
        
        // Skip active section updates during navigation
        if (window.isTimelineNavigating) {
            return;
        }
        
        // Determine active section (matches data-section values in the timeline)
        let activeSection = 'summary';
        if (yourTurnRect.top < windowHeight * 0.5) {
            activeSection = 'your-turn';
        } else if (generalizationRect.top < windowHeight * 0.5) {
            activeSection = 'generalization';
        } else if (transferRect.top < windowHeight * 0.5) {
            activeSection = 'side-by-side';
        } else if (efficiencyRect.top < windowHeight * 0.5) {
            activeSection = 'side-by-side';
        } else if (resultsOverviewRect.top < windowHeight * 0.5) {
            activeSection = 'results-overview';
        } else if (baselinesRect.top < windowHeight * 0.5) {
            activeSection = 'baselines';
        } else if (methodRect.top < windowHeight * 0.5) {
            activeSection = 'method';
        }

        // Show a one-time hint to use the left sidebar during Side-by-Side
        const leftButtonsVisible = taskButtonsLeft && taskButtonsLeft.classList.contains('visible');
        if (!dismissedLeftHint && leftButtonsVisible && activeSection === 'side-by-side') {
            leftSidebarHint.classList.add('visible');
            positionLeftSidebarHint();
        } else {
            leftSidebarHint.classList.remove('visible');
        }

        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            if (item.dataset.section === activeSection) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Section visibility management
        const showGeneralization = generalizationRect.top < windowHeight * 0.75;
        const showTransfer = transferRect.top < windowHeight * 0.75;
        const showEfficiency = efficiencyRect.top < windowHeight * 0.75;

        // Reset section states (null-safe)
        summarySection?.classList.remove('fade-out');
        efficiencySection?.classList.remove('fade-in', 'fade-out', 'hidden-below');
        transferSection?.classList.remove('fade-in', 'fade-out', 'hidden-below');
        generalizationSection?.classList.remove('fade-in', 'fade-out', 'hidden-below');

        if (showGeneralization) {
            summarySection?.classList.add('fade-out');
            efficiencySection?.classList.add('fade-out');
            transferSection?.classList.add('fade-out');
            generalizationSection?.classList.add('fade-in');
        } else if (showTransfer) {
            summarySection?.classList.add('fade-out');
            efficiencySection?.classList.add('fade-out');
            transferSection?.classList.add('fade-in');
            generalizationSection?.classList.add('hidden-below');
        } else if (showEfficiency) {
            summarySection?.classList.add('fade-out');
            efficiencySection?.classList.add('fade-in');
            transferSection?.classList.add('hidden-below');
            generalizationSection?.classList.add('hidden-below');
        } else {
            efficiencySection?.classList.add('hidden-below');
            transferSection?.classList.add('hidden-below');
            generalizationSection?.classList.add('hidden-below');
        }

    });
});

// Baseline Models — interactive component diagram
function initBaselineDiagram() {
    const picker = document.getElementById('baseline-picker');
    const svg = document.getElementById('baseline-diagram');
    if (!picker || !svg) return;
    if (picker.dataset.initialized === '1') return;
    picker.dataset.initialized = '1';

    // Per baseline:
    //   planner/dynamics/offpolicy : MPAIL2's three pillars [P]/[M]/[O]
    //   reward  : learns an *inferred* reward (IRL).  value : has a critic.
    //   online  : interacts with the environment.  sup/actions/handR : human supervision.
    const BASELINES = {
        mpail2: { name: 'MPAIL2', planner: true,  dynamics: true,  offpolicy: true,  reward: true, value: true, online: true,
            info: 'The full method: latent planning, a learned dynamics model, and off-policy value learning &mdash; learning visual manipulation from observation alone.' },
        o:      { name: '[&minus;O] MPAIL', planner: true,  dynamics: true,  offpolicy: false, reward: true, value: true, online: true,
            info: 'Drops off-policy learning. It still plans with a dynamics model, but learns an <em>on-policy</em> state value from fresh rollouts (no replay).' },
        p:      { name: '[&minus;P] MAIRL', planner: false, dynamics: true,  offpolicy: true,  reward: true, value: true, online: true,
            info: 'Removes the planner. The dynamics model and off-policy value remain, but actions come straight from the policy with no online planning.' },
        pm:     { name: '[&minus;PM] DAC', planner: false, dynamics: false, offpolicy: true,  reward: true, value: true, online: true,
            info: 'No planner and no dynamics model: a model-free, off-policy actor&ndash;critic with an adversarial (inferred) reward only.' },
        pmo:    { name: '[&minus;PMO] AIRL', planner: false, dynamics: false, offpolicy: false, reward: true, value: true, online: true,
            info: 'Strips all three pillars: model-free, on-policy, no planning &mdash; the most basic adversarial IRL baseline.' },
        rlpd:   { name: 'RLPD', planner: false, dynamics: false, offpolicy: true,  reward: false, value: true, online: true,
            sup: true, actions: true, handR: true, intValue: true,
            info: 'RL from prior data. Given <em>hand-designed rewards</em> and <em>demonstrated actions</em> (human supervision), it learns an off-policy Q&#8209;value and policy, replaying real interaction. No reward inference, dynamics model, or planner.' },
        bc:     { name: 'BC (Diffusion)', planner: false, dynamics: false, offpolicy: false, reward: false, value: false, online: false,
            sup: true, actions: true, handR: false, acts: true, deadInt: true, noIntEnc: true,
            info: 'Behavior cloning: supervised learning from <em>demonstrated actions</em>. The policy can act in the environment, but that interaction is never learned from &mdash; the loop is severed (offline).' }
    };

    const infoTitle = document.getElementById('bl-info-title');
    const infoBody = document.getElementById('bl-info-body');
    const pillars = document.getElementById('baseline-pillars');

    const setComp = (name, on) => {
        svg.querySelectorAll('.bl-comp[data-comp="' + name + '"]').forEach(el => {
            el.classList.toggle('is-off', !on);
        });
    };
    const setPillar = (p, on) => {
        const chip = pillars && pillars.querySelector('.pillar-chip[data-pillar="' + p + '"]');
        if (chip) chip.classList.toggle('on', on);
    };

    // "act in environment" connector: its origin animates between the Planner
    // (planning methods plan + execute actions) and the Policy (model-free methods).
    const fbPath = svg.querySelector('#bl-feedback');
    const FB_PLANNER = { x: 504, y: 230 };   // planner bottom-center
    const FB_POLICY  = { x: 664, y: 207 };   // policy bottom-center
    let fbX = FB_PLANNER.x, fbY = FB_PLANNER.y, fbRAF = null;
    const fbD = (x, y) => roundOrtho('M' + x.toFixed(1) + ',' + y.toFixed(1) + ' V350 H44 V320', 8);
    function setFeedback(planner, animate) {
        const t = planner ? FB_PLANNER : FB_POLICY;
        if (fbRAF) { cancelAnimationFrame(fbRAF); fbRAF = null; }
        if (!fbPath) return;
        if (!animate) { fbX = t.x; fbY = t.y; fbPath.setAttribute('d', fbD(fbX, fbY)); return; }
        const sx = fbX, sy = fbY, dur = 520, t0 = performance.now();
        const step = (now) => {
            let p = Math.min(1, (now - t0) / dur);
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // easeInOutCubic
            fbX = sx + (t.x - sx) * e;
            fbY = sy + (t.y - sy) * e;
            fbPath.setAttribute('d', fbD(fbX, fbY));
            if (p < 1) fbRAF = requestAnimationFrame(step);
        };
        fbRAF = requestAnimationFrame(step);
    }

    const setDim = (name, dim) => {
        svg.querySelectorAll('[data-comp="' + name + '"]').forEach(el => el.classList.toggle('bl-dim', dim));
    };

    function apply(key, animate) {
        const c = BASELINES[key];
        if (!c) return;
        const irl = !!c.reward;                     // inferred-reward (IRL) methods vs RLPD/BC
        setComp('planner', c.planner);
        setComp('dynamics', c.dynamics);
        setComp('dynamics-wire', c.dynamics && c.online);
        setComp('replay', c.offpolicy && c.dynamics);
        // inferred reward + its IRL wiring
        setComp('reward', irl);
        setComp('obs-reward', irl);
        setComp('int-reward', irl && c.online);
        setComp('reward-value', irl && c.value);
        // value head: Q-Value (off-policy) vs state Value (on-policy); absent entirely for BC
        setComp('value-q', c.value && c.offpolicy);
        setComp('value-v', c.value && !c.offpolicy);
        setComp('ac-bidir', c.value && c.offpolicy);
        setComp('ac-single', c.value && !c.offpolicy);
        // RLPD / BC: observation routed straight to value / policy
        setComp('obs-value', !irl && c.value);
        setComp('obs-policy', !irl);
        // human supervision: the Actions + Reward boxes are PERSISTENT (greyed when the current method
        // doesn't use them), so you can always click to add/remove supervision; the dashed enclosure
        // shows for supervision methods.
        setComp('supervision', true);
        svg.querySelectorAll('[data-comp="supervision"]').forEach(el => el.classList.toggle('bl-sup-off', !c.sup));
        setComp('actions', true);
        setComp('hand-reward', true);
        svg.querySelectorAll('[data-comp="actions"]').forEach(el => el.classList.toggle('bl-sup-off', !c.actions));
        svg.querySelectorAll('[data-comp="hand-reward"]').forEach(el => el.classList.toggle('bl-sup-off', !c.handR));
        setComp('actions-policy', !!c.actions);
        setComp('hand-reward-value', !!c.handR && c.value);
        // interaction encoder + its input arrow (the obs encoder is always kept)
        setComp('int-encoder', !c.noIntEnc);
        setComp('int-enc', c.online && !c.noIntEnc);
        setComp('dynamics-wire', c.dynamics && c.online);
        setComp('int-value', !!c.intValue);          // RLPD: interaction replays into the value
        setComp('int-dead', !!c.deadInt);            // BC: severed interaction path
        // "act in environment": online methods, plus BC (it acts but doesn't learn)
        const acts = c.online || c.acts;
        if (fbPath) fbPath.classList.toggle('bl-hidden', !acts);
        if (acts) setFeedback(c.planner, animate);
        setPillar('P', c.planner);
        setPillar('M', c.dynamics);
        setPillar('O', c.offpolicy);
        if (infoTitle) infoTitle.innerHTML = c.name || '';
        if (infoBody) infoBody.innerHTML = c.info || '';
    }

    // ===== interactive: click the model boxes to toggle MPAIL2's pillars and discover baselines =====
    // P (planner) / M (dynamics) / O (off-policy); planner needs a model (P => M). Each {P,M,O}
    // maps to the nearest named IRL baseline; the one unnamed combo (!P,M,!O) snaps to MAIRL.
    const NS = 'http://www.w3.org/2000/svg';
    const PILLAR_MAP = { '111': 'mpail2', '110': 'o', '011': 'p', '001': 'pm', '000': 'pmo', '010': 'p' };
    let PS = { P: true, M: true, O: true };
    let curKey = 'mpail2', lastIRL = 'mpail2';
    const psKey = (p) => (p.P ? 1 : 0) + '' + (p.M ? 1 : 0) + '' + (p.O ? 1 : 0);
    const mkEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

    // dashed, clickable "ghost" placeholders shown where an off dynamics / planner used to be
    const dynGhost = mkEl('g', { class: 'bl-ghost bl-hidden', 'data-ghost': 'M' });
    dynGhost.appendChild(mkEl('rect', { x: 300, y: 143, width: 88, height: 64, rx: 12 }));
    const dgl = mkEl('text', { x: 344, y: 178, class: 'bl-ghost-label' }); dgl.textContent = '+ Dynamics'; dynGhost.appendChild(dgl);
    const planGhost = mkEl('g', { class: 'bl-ghost bl-ghost--pill bl-hidden', 'data-ghost': 'P' });
    const planGhostRect = mkEl('rect', { x: 439, y: 104, width: 130, height: 22, rx: 11 });
    planGhost.appendChild(planGhostRect);
    const pgl = mkEl('text', { x: 504, y: 119, class: 'bl-ghost-label' }); pgl.textContent = '+ Planner'; planGhost.appendChild(pgl);
    svg.appendChild(dynGhost); svg.appendChild(planGhost);

    function syncAfterApply(key) {
        const c = BASELINES[key]; if (!c) return;
        curKey = key;
        if (c.reward) lastIRL = key;            // remember the last inferred-reward (IRL) baseline
        PS = { P: !!c.planner, M: !!c.dynamics, O: !!c.offpolicy };
        const isIRL = !!c.reward;
        dynGhost.classList.toggle('bl-hidden', !(isIRL && !PS.M));
        // planner ghost always shows when planning is off; greyed with "(needs dynamics)" until a model exists
        const planOff = isIRL && !PS.P;
        planGhost.classList.toggle('bl-hidden', !planOff);
        if (planOff) {
            const needsDyn = !PS.M;
            planGhost.classList.toggle('bl-ghost--disabled', needsDyn);
            pgl.textContent = needsDyn ? '+ Planner (needs dynamics)' : '+ Planner';
            const w = needsDyn ? 190 : 130;
            planGhostRect.setAttribute('width', w);
            planGhostRect.setAttribute('x', 504 - w / 2);
        }
        picker.querySelectorAll('.baseline-btn').forEach(b => {
            const on = b.dataset.baseline === key;
            b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }
    function select(key, animate) { apply(key, animate); syncAfterApply(key); }
    function togglePillar(which) {
        const p = Object.assign({}, PS);
        p[which] = !p[which];
        if (which === 'M' && !p.M) p.P = false;   // dropping the model drops planning
        if (which === 'P' && p.P) p.M = true;     // planning needs a model
        select(PILLAR_MAP[psKey(p)], true);
    }
    const clickToggle = (sel, which) => svg.querySelectorAll(sel).forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => { e.stopPropagation(); togglePillar(which); });
    });
    clickToggle('[data-comp="value-q"],[data-comp="value-v"]', 'O');
    clickToggle('[data-comp="dynamics"]', 'M');
    clickToggle('[data-comp="planner"]', 'P');
    dynGhost.addEventListener('click', () => togglePillar('M'));
    planGhost.addEventListener('click', () => { if (PS.M) togglePillar('P'); }); // disabled until a model exists

    // persistent supervision boxes are clickable to add/remove human supervision:
    //   Reward: RLPD <-> BC (and adds the full supervision from an IRL method)
    //   Actions: IRL -> BC (add action demos); from a supervision method, drop back to the last IRL baseline
    svg.querySelectorAll('[data-comp="hand-reward"]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => { e.stopPropagation(); select(curKey === 'rlpd' ? 'bc' : 'rlpd', true); });
    });
    svg.querySelectorAll('[data-comp="actions"]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            select(BASELINES[curKey] && BASELINES[curKey].sup ? lastIRL : 'bc', true);
        });
    });

    picker.querySelectorAll('.baseline-btn').forEach(btn => {
        btn.addEventListener('click', () => select(btn.dataset.baseline, true));
    });

    // ----- hover explainer for each block -----
    const TIPS = {
        obs:      ['Task Observation', 'Demonstration frames of the task being performed. Used only to learn the reward &mdash; the actions are never observed.'],
        int:      ['Direct Interaction', "The robot's own experience from acting in the environment (on-policy rollouts)."],
        encoder:  ['Encoder', 'Compresses raw observations into a compact latent state that the world model reasons over.'],
        dynamics: ['Dynamics Model', 'The learned world model: predicts the next latent state from the current state and action &mdash; what makes planning and off-policy value learning possible.'],
        reward:   ['Reward', 'An <em>inferred</em> reward (inverse RL): scores how expert-like a state is, learned adversarially from observation alone.'],
        value:    ['Critic', 'Estimates expected long-term return. Off-policy variants learn a Q&#8209;value from replayed data; on-policy variants learn a state value from fresh rollouts.'],
        policy:   ['Policy', 'The actor: maps the latent state to an action distribution.'],
        planner:  ['Planner', 'Model-predictive planner: imagines candidate action sequences through the dynamics model, scores them with the reward and value, and executes the best plan.'],
        electron: ['Off-policy replay', 'This line indicates that the method also uses the dynamics model to optimize the policy, like Dreamer or MBPO.'],
        supervision: ['Human supervision', 'Signals a person must provide by hand &mdash; demonstrated actions and/or a designed reward. MPAIL2 needs none of these.'],
        actions:  ['Action supervision', "The demonstrator's actions are provided directly (not just observations) &mdash; used by BC and RLPD."],
        'hand-reward': ['Hand-designed reward', 'A reward function written by a human, rather than inferred from demonstrations.']
    };
    // hover explainer -> the lower side box updates dynamically
    const tipTitle = document.getElementById('bl-tip-title');
    const tipBody = document.getElementById('bl-tip-body');
    const TIP_DEFAULT = ['Hover a block', 'Mouse over any block in the diagram to read what it does.'];
    const setTip = (info, el) => {
        if (tipTitle) tipTitle.innerHTML = info[0];
        if (tipBody) tipBody.innerHTML = info[1];
        svg.querySelectorAll('.bl-focus').forEach(x => x.classList.remove('bl-focus'));
        if (el) el.classList.add('bl-focus');
    };
    if (tipTitle && tipBody) {
        svg.addEventListener('mouseover', (e) => {
            const el = e.target.closest && e.target.closest('[data-tip]');
            if (el && TIPS[el.getAttribute('data-tip')]) setTip(TIPS[el.getAttribute('data-tip')], el);
        });
        svg.addEventListener('mouseout', (e) => {
            const el = e.target.closest && e.target.closest('[data-tip]');
            if (el && !el.contains(e.relatedTarget)) setTip(TIP_DEFAULT, null);
        });
        svg.querySelectorAll('[data-tip]').forEach((el) => {
            el.setAttribute('tabindex', '0');
            el.addEventListener('focus', () => setTip(TIPS[el.getAttribute('data-tip')] || TIP_DEFAULT, el));
            el.addEventListener('blur', () => setTip(TIP_DEFAULT, null));
        });
    }

    // ---- round every orthogonal connector's corners ----
    function roundOrtho(d, r) {
        // parse an absolute M/H/V/L path into points
        const pts = []; let cx = 0, cy = 0;
        const re = /([MHVL])\s*(-?[\d.]+)?(?:[ ,]+(-?[\d.]+))?/gi; let m;
        while ((m = re.exec(d))) {
            const c = m[1].toUpperCase();
            if (c === 'M' || c === 'L') { cx = parseFloat(m[2]); cy = parseFloat(m[3]); }
            else if (c === 'H') { cx = parseFloat(m[2]); }
            else if (c === 'V') { cy = parseFloat(m[2]); }
            pts.push([cx, cy]);
        }
        if (pts.length < 3) return d;
        let out = 'M' + pts[0][0] + ',' + pts[0][1];
        for (let i = 1; i < pts.length - 1; i++) {
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
            const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
            const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
            const a = [p1[0] + (p0[0] - p1[0]) / d1 * r1, p1[1] + (p0[1] - p1[1]) / d1 * r1];
            const b = [p1[0] + (p2[0] - p1[0]) / d2 * r2, p1[1] + (p2[1] - p1[1]) / d2 * r2];
            out += ' L' + a[0].toFixed(1) + ',' + a[1].toFixed(1) +
                   ' Q' + p1[0] + ',' + p1[1] + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
        }
        const last = pts[pts.length - 1];
        out += ' L' + last[0] + ',' + last[1];
        return out;
    }
    svg.querySelectorAll('.bl-wire').forEach(p => {
        if (p.id === 'bl-feedback') return;            // animated separately
        const d = p.getAttribute('d');
        if (d) p.setAttribute('d', roundOrtho(d, 8));
    });

    select('mpail2', false);

    // dev/verification: ?blbaseline=p pre-selects a baseline
    const blPre = new URLSearchParams(location.search).get('blbaseline');
    if (blPre && BASELINES[blPre]) select(blPre, false);
}

// Overview: scroll-driven native diagram that assembles the MPAIL2 architecture
// (the same diagram built in sections/baselines.html), beat by beat, as the script captions advance.
function initStoryScrub() {
    const story = document.getElementById('summary-section');
    if (!story || !story.classList.contains('story')) return;
    if (story.dataset.init === '1') return;
    story.dataset.init = '1';
    const svg = document.getElementById('story-diagram');
    if (!svg) return;
    const caps = Array.prototype.slice.call(story.querySelectorAll('.story__cap'));
    const chips = Array.prototype.slice.call(story.querySelectorAll('.story__chip:not(.story__skip)'));
    const bar = document.getElementById('story-bar');
    const duration = parseFloat(story.dataset.duration) || 120;

    // round orthogonal wire corners (same look as the baselines diagram)
    function roundOrtho(d, r) {
        const pts = []; let cx = 0, cy = 0;
        const re = /([MHVL])\s*(-?[\d.]+)?(?:[ ,]+(-?[\d.]+))?/gi; let m;
        while ((m = re.exec(d))) {
            const c = m[1].toUpperCase();
            if (c === 'M' || c === 'L') { cx = parseFloat(m[2]); cy = parseFloat(m[3]); }
            else if (c === 'H') { cx = parseFloat(m[2]); }
            else if (c === 'V') { cy = parseFloat(m[2]); }
            pts.push([cx, cy]);
        }
        if (pts.length < 3) return d;
        let out = 'M' + pts[0][0] + ',' + pts[0][1];
        for (let i = 1; i < pts.length - 1; i++) {
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
            const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
            const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
            const a = [p1[0] + (p0[0] - p1[0]) / d1 * r1, p1[1] + (p0[1] - p1[1]) / d1 * r1];
            const b = [p1[0] + (p2[0] - p1[0]) / d2 * r2, p1[1] + (p2[1] - p1[1]) / d2 * r2];
            out += ' L' + a[0].toFixed(1) + ',' + a[1].toFixed(1) +
                   ' Q' + p1[0] + ',' + p1[1] + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
        }
        const last = pts[pts.length - 1];
        out += ' L' + last[0] + ',' + last[1];
        return out;
    }
    svg.querySelectorAll('.bl-wire').forEach(p => {
        const d = p.getAttribute('d');
        if (d && /[HV]/.test(d)) p.setAttribute('d', roundOrtho(d, 8));
    });

    // ----- beat definitions (16). Each `on` lists which data-comp groups are present;
    // label/flag fields drive relabels and the few genuine morphs. The `t` values align
    // with the caption/chapter data-t scale so captions + chapter rail stay in lockstep. -----
    const valLabel = document.getElementById('st-val-label');
    const valSub = document.getElementById('st-val-sub');
    const policyLabel = document.getElementById('st-policy-label');
    const obsPanel = document.getElementById('st-obs');
    const dynBox = svg.querySelector('[data-comp="dynamics"]');

    // ----- per-method paper citation (bottom-right; swaps with the active chapter) -----
    // Indexed to the chapter rail order: [Observation/LfO, IRL, AIL, MPAIL, MPAIL2].
    // Fill label/cite/href per method; an entry with no href keeps the chip hidden.
    const citeEl = document.getElementById('story-cite');
    const CITES = [
        { label: 'LfO',    cite: 'Liu et al. 2018',    href: 'https://ieeexplore.ieee.org/document/8462901/' },
        { label: 'IRL',    cite: 'Abbeel &amp; Ng 2004', href: 'https://doi.org/10.1145/1015330.1015430' },
        { label: 'AIL',    cite: 'Ho &amp; Ermon 2016',  href: 'https://proceedings.neurips.cc/paper_files/paper/2016/hash/cc7e2b878868cbae992d1fb743995d8f-Abstract.html' },
        { label: 'MPAIL',  cite: 'Han et al. 2025',     href: 'https://arxiv.org/abs/2507.21533' },
        { label: 'MPAIL2', cite: 'This work',           href: '' }
    ];
    let curCite = -2;
    const setCite = (hi) => {
        if (hi === curCite) return; curCite = hi;
        const c = hi >= 0 ? CITES[hi] : null;
        if (!citeEl) return;
        if (!c || (!c.cite && !c.href)) { citeEl.classList.remove('is-on'); return; }
        const arrow = c.href ? '<span class="story__cite-arr">&#8599;</span>' : '';
        citeEl.innerHTML = '<span class="story__cite-m">' + c.label + '</span><span>' + c.cite + '</span>' + arrow;
        if (c.href) { citeEl.href = c.href; citeEl.removeAttribute('aria-disabled'); citeEl.classList.remove('story__cite--plain'); }
        else { citeEl.removeAttribute('href'); citeEl.setAttribute('aria-disabled', 'true'); citeEl.classList.add('story__cite--plain'); }
        citeEl.classList.add('is-on');
    };

    // imgPhase: 'center' = single obs centered (LfO); 'side' = obs+interaction side-by-side (IRL start);
    // 'column' (default) = top/bottom column, positioned by the layout engine.
    const B = (t, on, x) => Object.assign({ t: t, on: on }, x || {});
    const BEATS = [
        B(0,   ['obsPanel'], { imgPhase: 'center' }),
        B(5,   ['obsPanel'], { imgPhase: 'center' }),
        B(12,  ['obsPanel', 'obsDeck'], { imgPhase: 'center' }),               // stack with the LfO con
        B(19,  ['obsPanel', 'intPanel', 'obsDeck'], { imgPhase: 'side', deckCollapse: true }), // IRL begins: side-by-side; data stack collapses
        B(25,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward'], { deckCollapse: true }), // reward -> column; keep the data stack collapsed as it fades
        B(32,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'return'], { val: 'RL', sub: '' }),
        B(38,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'recycle', 'return', 'intDeck'], { val: 'RL', sub: '' }), // IRL con: cycle + interaction stack
        B(49,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'policy', 'wAc', 'return', 'recycleX', 'intDeck'], { val: 'Value', sub: '' }),
        B(58,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'policy', 'wAc', 'return', 'intDeck'], { val: 'Value', sub: '', sketchy: true }),
        // MPAIL: dynamics is introduced together with the planner (with "(prior)"); policy is absorbed
        B(66,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'return', 'planner', 'dynamics', 'intDeck'], { val: 'Value', sub: '' }),
        // MPAIL con: the interaction stack becomes simulation/terminal-style (needs a prior model + sim)
        B(72,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'return', 'planner', 'dynamics', 'intDeck'], { val: 'Value', sub: '', prior: 'show', sim: true }),
        B(81,  ['obsPanel', 'intPanel', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'return', 'planner', 'dynamics', 'intDeck'], { val: 'Value', sub: '', prior: 'show', sim: true }),
        // online dynamics: encoders appear, "(prior)" is crossed out, interaction -> dynamics connector appears
        B(90,  ['obsPanel', 'intPanel', 'obsEnc', 'intEnc', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'return', 'planner', 'dynamics', 'wIntDyn', 'intDeck'], { val: 'Value', sub: '', prior: 'gone', sim: true }),
        // off-policy: the policy box reappears (added for value optimization); the interaction stack
        // collapses into the panel as it goes away (sample efficiency solved)
        B(98,  ['obsPanel', 'intPanel', 'obsEnc', 'intEnc', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'policy', 'wAcBidir', 'return', 'planner', 'dynamics', 'wIntDyn', 'intDeck'], { val: 'Q-Value', sub: 'off-policy', prior: 'gone', sim: true, intDeckCollapse: true }),
        // multi-step policy: the off-policy "electron" replay line appears here
        B(105, ['obsPanel', 'intPanel', 'obsEnc', 'intEnc', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'policy', 'wAcBidir', 'return', 'planner', 'dynamics', 'wIntDyn', 'replay'], { val: 'Q-Value', sub: 'off-policy', prior: 'gone', policyName: 'Multi-Step Policy' }),
        B(115, ['obsPanel', 'intPanel', 'obsEnc', 'intEnc', 'reward', 'wObsReward', 'wIntReward', 'valbox', 'wRewardVal', 'policy', 'wAcBidir', 'return', 'planner', 'dynamics', 'wIntDyn', 'replay'], { val: 'Q-Value', sub: 'off-policy', prior: 'gone', policyName: 'Multi-Step Policy' })
    ];
    const ALL_COMPS = ['obsPanel', 'intPanel', 'obsEnc', 'intEnc', 'obsDeck', 'intDeck',
        'reward', 'wObsReward', 'wIntReward', 'wRewardVal', 'valbox', 'policy', 'wAc', 'wAcBidir',
        'recycle', 'recycleX', 'return', 'planner', 'dynamics', 'wIntDyn', 'replay'];

    const setComp = (name, on) => {
        svg.querySelectorAll('[data-comp="' + name + '"]').forEach(el => el.classList.toggle('is-off', !on));
    };

    // ---- layout engine ----
    // The whole diagram (input images + encoders + core) is laid out left-to-right with fixed internal
    // gaps and centered as a unit, so when few boxes are present the images move inward (short
    // connectors) and slide back out as the core grows. Reward/Value/Policy ride in #st-rvp; Dynamics
    // is placed independently. In the 'center'/'side' phases the images take bespoke transforms instead.
    const CORE = ['dynamics', 'reward', 'value', 'policy'];
    const CW = { dynamics: 88, reward: 84, value: 88, policy: 88 };  // box widths
    const HOME = { reward: 436, value: 548, policy: 662 };           // home left edge of rvp boxes
    const DYN_HOME = 320, GAP = 28;
    const OBS_C = { x: 110, y: 80 }, INT_C = { x: 110, y: 271 };     // panel centers (for center-scaling)
    const stRvp = document.getElementById('st-rvp');
    const dynGroup = document.getElementById('st-dyn-pos');   // wrapper that carries the layout translate
    const intPanel = svg.querySelector('[data-comp="intPanel"]');
    const obsEncG = svg.querySelector('[data-comp="obsEnc"]');
    const intEncG = svg.querySelector('[data-comp="intEnc"]');
    const obsDeckG = svg.querySelector('[data-comp="obsDeck"]');
    const intDeckG = svg.querySelector('[data-comp="intDeck"]');
    const plRect = document.getElementById('st-planner-rect');
    const plLabel = document.getElementById('st-planner-label');
    const wObs = svg.querySelector('[data-comp="wObsReward"] path');
    const wInt = svg.querySelector('[data-comp="wIntReward"] path');
    const wIntDynP = svg.querySelector('[data-comp="wIntDyn"] path');
    const replayP = svg.querySelector('[data-comp="replay"] path');
    const retP = document.getElementById('st-return');
    const counterEl = document.getElementById('story-counter');
    let LS = { encOn: false, plannerOn: false, policyOn: false };
    const KEYS = ['rvpDx', 'dynDx', 'plx', 'plw', 'ply', 'plh', 'plrx', 'obsTx', 'obsTy', 'obsS', 'intTx', 'intTy', 'intS', 'imgDx'];

    function planeFor(beat, onSet) {
        const phase = beat.imgPhase || 'column';
        const S = { rvpDx: 0, dynDx: 0, plx: 295, plw: 480, ply: 120, plh: 110, plrx: 15, obsTx: 0, obsTy: 0, obsS: 1, intTx: 0, intTy: 0, intS: 1, imgDx: 0 };
        if (phase === 'center') {                          // single obs image, centered + enlarged
            S.obsTx = 286; S.obsTy = 121; S.obsS = 1.55; S.intTx = 286; S.intTy = 121;
        } else if (phase === 'side') {                     // obs + interaction side-by-side, centered
            S.obsTx = 181; S.obsTy = 95; S.obsS = 1.08; S.intTx = 391; S.intTy = -96; S.intS = 1.08;
        } else {                                           // column: center the whole diagram
            const present = CORE.filter(c => onSet.has(c === 'value' ? 'valbox' : c));
            let W = GAP * Math.max(0, present.length - 1); present.forEach(c => W += CW[c]);
            const imgDx = 226 - W / 2;                      // centers image(180)+gap(120)+core on viewBox center
            S.imgDx = imgDx; S.obsTx = imgDx; S.intTx = imgDx;
            // dynamics is always the leftmost core box, so its slot is at imgDx whether or not it is
            // present yet. Pre-positioning it there means it EXPANDS in place when the planner introduces
            // it (a pure scale, no slide-in) instead of dropping in from below.
            S.dynDx = imgDx;
            if (present.length) {
                const firstLeft = DYN_HOME + imgDx;        // leftmost core box sits a fixed gap from the images
                let cur = firstLeft; const left = {};
                present.forEach(c => { left[c] = cur; cur += CW[c] + GAP; });
                for (const c of ['reward', 'value', 'policy']) if (c in left) { S.rvpDx = left[c] - HOME[c]; break; }
                const last = present[present.length - 1];
                // planner enclosure wraps every present core box. Before the planner exists it sits
                // exactly on the policy box (same geom + color) so MPAIL's planner can MORPH out of it:
                // the box grows outward and recolors purple->gold instead of cross-fading.
                if (onSet.has('planner')) {
                    S.plx = firstLeft - 25; S.plw = (left[last] + CW[last] + 25) - (firstLeft - 25);
                    S.ply = 120; S.plh = 110; S.plrx = 15;
                } else if (onSet.has('policy')) {
                    S.plx = 662 + S.rvpDx; S.plw = CW.policy; S.ply = 143; S.plh = 64; S.plrx = 12;
                }
            }
        }
        return S;
    }
    const tfStr = (tx, ty, s, c) => (Math.abs(s - 1) < 1e-3)
        ? 'translate(' + tx.toFixed(2) + ',' + ty.toFixed(2) + ')'
        : 'translate(' + tx.toFixed(2) + ',' + ty.toFixed(2) + ') translate(' + c.x + ',' + c.y + ') scale(' + s.toFixed(3) + ') translate(' + (-c.x) + ',' + (-c.y) + ')';
    function renderLayout(S) {
        if (obsPanel) obsPanel.setAttribute('transform', tfStr(S.obsTx, S.obsTy, S.obsS, OBS_C));
        if (obsDeckG) obsDeckG.setAttribute('transform', tfStr(S.obsTx, S.obsTy, S.obsS, OBS_C));
        if (intPanel) intPanel.setAttribute('transform', tfStr(S.intTx, S.intTy, S.intS, INT_C));
        if (intDeckG) intDeckG.setAttribute('transform', tfStr(S.intTx, S.intTy, S.intS, INT_C));
        const encT = 'translate(' + S.imgDx.toFixed(2) + ',0)';
        if (obsEncG) obsEncG.setAttribute('transform', encT);
        if (intEncG) intEncG.setAttribute('transform', encT);
        if (stRvp) stRvp.setAttribute('transform', 'translate(' + S.rvpDx.toFixed(2) + ',0)');
        if (dynGroup) dynGroup.setAttribute('transform', 'translate(' + S.dynDx.toFixed(2) + ',0)');
        const sx = ((LS.encOn ? 274 : 200) + S.imgDx).toFixed(1);   // feeder resumes at encoder tip when present
        const ex = (456 + S.rvpDx).toFixed(1);
        if (wObs) wObs.setAttribute('d', roundOrtho('M' + sx + ',80 H' + ex + ' V141', 8));
        if (wInt) wInt.setAttribute('d', roundOrtho('M' + sx + ',271 H' + ex + ' V209', 8));
        if (wIntDynP) wIntDynP.setAttribute('d', roundOrtho('M' + (274 + S.imgDx).toFixed(1) + ',271 H' + (364 + S.dynDx).toFixed(1) + ' V207', 8));
        if (replayP) replayP.setAttribute('d', 'M' + (408 + S.dynDx).toFixed(1) + ',165 H' + (636 + S.rvpDx).toFixed(1));
        if (plRect) {
            plRect.setAttribute('x', S.plx.toFixed(1)); plRect.setAttribute('width', S.plw.toFixed(1));
            plRect.setAttribute('y', S.ply.toFixed(1)); plRect.setAttribute('height', S.plh.toFixed(1));
            plRect.setAttribute('rx', S.plrx.toFixed(1));
        }
        if (plLabel) { plLabel.setAttribute('x', (S.plx + S.plw / 2).toFixed(1)); plLabel.setAttribute('y', (S.ply - 7).toFixed(1)); }
        // act-in-environment return origin: planner > policy > value/RL box; endpoint tracks the interaction
        let ox, oy;
        if (LS.plannerOn) { ox = S.plx + S.plw / 2; oy = 230; }
        else if (LS.policyOn) { ox = 706 + S.rvpDx; oy = 207; }
        else { ox = 592 + S.rvpDx; oy = 207; }
        const ix = (44 + S.imgDx).toFixed(1);             // re-enter the interaction panel wherever it sits
        if (retP) retP.setAttribute('d', roundOrtho('M' + ox.toFixed(1) + ',' + oy + ' V350 H' + ix + ' V320', 8));
    }
    let curS = null, layoutRAF = null;
    const lerp = (a, b, e) => a + (b - a) * e;
    function animateLayout(target, animate) {
        if (!animate || !curS) {
            if (layoutRAF) cancelAnimationFrame(layoutRAF);
            layoutRAF = null; curS = Object.assign({}, target); renderLayout(curS); return;
        }
        const f = Object.assign({}, curS), t0 = performance.now(), dur = 560;
        if (layoutRAF) cancelAnimationFrame(layoutRAF);
        const step = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            const S = {}; KEYS.forEach(k => S[k] = lerp(f[k], target[k], e));
            renderLayout(S); curS = S;
            if (p < 1) layoutRAF = requestAnimationFrame(step); else layoutRAF = null;
        };
        layoutRAF = requestAnimationFrame(step);
    }

    // obs/interaction stacks: fan OUT (animated) when newly appearing, fan IN (collapse, animated) on
    // exit, else stay fanned. A pending fan-out rAF is cancelled first so it can't undo a later collapse.
    let obsDeckWasOn = false, intDeckWasOn = false;
    function setDeckState(group, on, wasOn, collapseFlag, instant) {
        if (group._deckRAF) { cancelAnimationFrame(group._deckRAF); group._deckRAF = 0; group.classList.remove('st-deck-instant'); }
        if (collapseFlag) { group.classList.add('st-collapse'); return; }   // fan in (animates via the .6s transition)
        if (on && !wasOn && !instant) {              // newly appearing -> animate the fan-out from collapsed
            group.classList.add('st-deck-instant', 'st-collapse');
            void group.offsetWidth;                  // commit the collapsed start with transitions off
            group.classList.remove('st-deck-instant');
            group._deckRAF = requestAnimationFrame(() => { group.classList.remove('st-collapse'); group._deckRAF = 0; });
            return;
        }
        group.classList.remove('st-collapse');
    }

    let curBeat = -1;
    function applyBeat(i, instant) {
        if (i === curBeat && !instant) return;
        const first = curBeat === -1;
        curBeat = i;
        const b = BEATS[i];
        const onSet = new Set(b.on);
        ALL_COMPS.forEach(c => setComp(c, onSet.has(c)));
        // relabels
        if (valLabel && b.val) valLabel.textContent = b.val;
        if (valSub) valSub.textContent = b.sub || '';
        if (policyLabel) {
            const pn = b.policyName || 'Policy';
            // "Multi-Step Policy" overflows the box, so wrap it onto two lines
            if (pn === 'Multi-Step Policy') {
                policyLabel.innerHTML = '<tspan x="706" dy="-6.5">Multi-Step</tspan><tspan x="706" dy="15">Policy</tspan>';
            } else {
                policyLabel.textContent = pn;
            }
        }
        // "act in environment" return line turns sketchy/brittle (AIL con), solid otherwise
        svg.querySelectorAll('.st-return').forEach(el => el.classList.toggle('st-sketchy', !!b.sketchy));
        // dynamics "(prior)" crossout + fade once it is learned online (animated via CSS)
        if (dynBox) {
            dynBox.classList.toggle('st-prior-show', b.prior === 'show');
            dynBox.classList.toggle('st-dyn-online', b.prior === 'gone');
        }
        // policy -> planner morph: the planner rect carries the policy's purple while planning is absent,
        // then drops st-as-policy when the planner appears so it recolors to gold as it grows out of the
        // policy box. The policy box fades in place (st-morph-out) instead of dropping away beneath it.
        const morphIntoPlanner = onSet.has('planner') && !onSet.has('policy');
        if (plRect) plRect.classList.toggle('st-as-policy', !onSet.has('planner'));
        const policyG = svg.querySelector('[data-comp="policy"]');
        if (policyG) policyG.classList.toggle('st-morph-out', morphIntoPlanner);
        // once the reward (and the architecture) is introduced, fade the input photos into the background
        svg.classList.toggle('st-dim-imgs', onSet.has('reward'));
        // obs/interaction stacks: fan OUT when newly appearing, fan IN (collapse) on exit; sim-style at the MPAIL con
        const obsDeckOn = onSet.has('obsDeck'), intDeckOn = onSet.has('intDeck');
        if (obsDeckG) setDeckState(obsDeckG, obsDeckOn, obsDeckWasOn, !!b.deckCollapse, instant);
        if (intDeckG) {
            intDeckG.classList.toggle('is-sim', !!b.sim);
            setDeckState(intDeckG, intDeckOn, intDeckWasOn, !!b.intDeckCollapse, instant);
        }
        obsDeckWasOn = obsDeckOn; intDeckWasOn = intDeckOn;
        // layout state for renderLayout, then reflow (instant on first paint / forced capture / loop reset)
        LS = { encOn: onSet.has('obsEnc'), plannerOn: onSet.has('planner'), policyOn: onSet.has('policy') };
        animateLayout(planeFor(b, onSet), !first && !story.dataset.forceP && !instant);
        if (counterEl && !instant) counterEl.textContent = 'frame ' + (i + 1) + ' / ' + BEATS.length;
    }

    // ----- animation loop: while parked on a beat, replay its enter transition on a loop
    // (jump to the start instantly, then play to the end), with a progress bar above the caption. -----
    const animBar = document.getElementById('story-animbar');
    const animBarFill = animBar ? animBar.querySelector('span') : null;
    const ANIM_MS = 680, LOOP_MS = ANIM_MS + 750;   // animation, then a short hold before replaying
    let loopRAF = null, loopT0 = 0, loopGen = 0, lastScrollP = -1, lastScrollAt = 0;
    // Loop ONLY a beat's specific "style change" animation, in isolation (reset just that property to its
    // "before" instantly, then play it to its "after") — NOT block introductions, relabels, collapses,
    // or layout/phase intros. Returns {reset, apply} or null if the beat shouldn't loop.
    const has = (b, c) => b.on.indexOf(c) >= 0;
    function getReplay(idx) {
        const b = BEATS[idx], p = BEATS[idx - 1] || { on: [] };
        if ((b.imgPhase || 'col') !== (p.imgPhase || 'col')) return null;   // layout/phase intro, not a style loop
        const R = [], A = [];                                               // reset / apply actions for this beat
        // a small element fading in (NOT a model box) — encoders, the interaction->dynamics wire, the ✕
        const appear = (c) => { if (has(b, c) && !has(p, c)) { R.push(() => setComp(c, false)); A.push(() => setComp(c, true)); } };
        const deck = (g) => { R.push(() => { if (g._deckRAF) { cancelAnimationFrame(g._deckRAF); g._deckRAF = 0; } g.classList.add('st-collapse'); }); A.push(() => g.classList.remove('st-collapse')); };
        if (has(b, 'obsDeck') && !has(p, 'obsDeck')) deck(obsDeckG);         // data-stack expansion (fan out)
        if (has(b, 'intDeck') && !has(p, 'intDeck')) deck(intDeckG);         // interaction-stack expansion
        if (!!b.sim && !p.sim) { R.push(() => intDeckG.classList.remove('is-sim')); A.push(() => intDeckG.classList.add('is-sim')); } // sim/terminal-style
        if (b.prior === 'show' && p.prior !== 'show') { R.push(() => dynBox.classList.remove('st-prior-show')); A.push(() => dynBox.classList.add('st-prior-show')); } // "(prior)" appears
        if (b.prior === 'gone' && p.prior !== 'gone') {                      // "(prior)" crossout
            R.push(() => { dynBox.classList.remove('st-dyn-online'); dynBox.classList.add('st-prior-show'); });
            A.push(() => { dynBox.classList.remove('st-prior-show'); dynBox.classList.add('st-dyn-online'); });
        }
        if (!!b.sketchy && !p.sketchy) {                                     // return connector turns brittle
            R.push(() => svg.querySelectorAll('.st-return').forEach(e => e.classList.remove('st-sketchy')));
            A.push(() => svg.querySelectorAll('.st-return').forEach(e => e.classList.add('st-sketchy')));
        }
        appear('recycleX'); appear('obsEnc'); appear('intEnc'); appear('wIntDyn');
        if (!R.length) return null;                                          // block intro / no style change
        return { reset: () => R.forEach(f => f()), apply: () => A.forEach(f => f()) };
    }
    function stopLoop() {
        loopGen++;                                          // invalidate any in-flight cycle frames
        if (loopRAF) { cancelAnimationFrame(loopRAF); loopRAF = null; }
        svg.classList.remove('st-no-anim');                 // never leave transitions globally disabled
        if (animBar) animBar.classList.remove('is-on');
    }
    function startLoop(beatIdx) {
        stopLoop();
        if ((story.dataset.forceP && !story.dataset.testLoop) || beatIdx <= 0) return;
        const rep = getReplay(beatIdx);
        if (!rep) return;
        const gen = ++loopGen;
        // One pass: jump to the start with transitions OFF, let that state PAINT (so it becomes the
        // transition baseline), then re-enable transitions and play to the end. A single synchronous
        // reflow is NOT enough — the start must actually paint, or the browser sees no change and the
        // transition never fires (the bug where the loop "ran" but nothing visibly animated).
        const cycle = () => {
            svg.classList.add('st-no-anim'); rep.reset();               // instant jump to the start
            requestAnimationFrame(() => {                               // frame A: paints the start (still no-anim)
                if (gen !== loopGen) return;
                requestAnimationFrame(() => {                           // frame B: enable transitions + play to end
                    if (gen !== loopGen) return;
                    svg.classList.remove('st-no-anim'); rep.apply();
                });
            });
        };
        if (animBar) animBar.classList.add('is-on');
        loopT0 = performance.now(); cycle();
        const step = (now) => {
            if (gen !== loopGen) return;
            if (animBarFill) animBarFill.style.width = (Math.min(1, (now - loopT0) / ANIM_MS) * 100) + '%';
            if (now - loopT0 >= LOOP_MS) { loopT0 = now; cycle(); }
            loopRAF = requestAnimationFrame(step);
        };
        loopRAF = requestAnimationFrame(step);
    }

    const videoEl = document.getElementById('story-video');
    function onScroll() {
        const rect = story.getBoundingClientRect();
        // narrated mode: no scrubbing; just pause the video once it scrolls out of view
        if (story.classList.contains('story--narrated')) {
            if (videoEl && (rect.bottom < 40 || rect.top > window.innerHeight - 40)) { try { videoEl.pause(); } catch (e) {} }
            return;
        }
        const range = story.offsetHeight - window.innerHeight;
        let p = range > 0 ? (-rect.top) / range : 0;
        p = Math.max(0, Math.min(1, p));
        if (story.dataset.forceP) p = parseFloat(story.dataset.forceP);
        const t = p * duration;
        // active beat / caption / chapter = last whose threshold <= current time
        let bi = 0; for (let i = 0; i < BEATS.length; i++) if (BEATS[i].t <= t + 0.01) bi = i;
        const scrolled = Math.abs(p - lastScrollP) > 1e-4;   // ignore stray onScroll (resize, etc.) that don't move
        lastScrollP = p;
        if (scrolled) stopLoop();           // an actual scroll cancels any running animation loop
        applyBeat(bi);
        let ci = -1; for (let i = 0; i < caps.length; i++) if (parseFloat(caps[i].dataset.t) <= t + 0.01) ci = i;
        caps.forEach((c, i) => c.classList.toggle('is-on', i === ci));
        let hi = -1; for (let i = 0; i < chips.length; i++) if (parseFloat(chips[i].dataset.t) <= t + 0.01) hi = i;
        chips.forEach((c, i) => c.classList.toggle('is-on', i === hi));
        setCite(hi);
        if (bar) bar.style.width = (p * 100) + '%';
        story.classList.toggle('is-scrolling', p > 0.008);
        if (scrolled) lastScrollAt = performance.now();   // the idle detector below restarts the loop
    }
    // Robustly run the current beat's animation loop whenever scrolling has been idle a moment.
    setInterval(() => {
        if (loopRAF || story.classList.contains('story--narrated')) return;        // already looping / narrated
        if (story.dataset.forceP && !story.dataset.testLoop) return;                // capture mode
        if (performance.now() - lastScrollAt < 240) return;                         // still settling
        if (!story.dataset.forceP) {                                                // only when the stage fills the view
            const r = story.getBoundingClientRect();
            if (r.bottom < window.innerHeight * 0.5 || r.top > window.innerHeight * 0.5) return;
        }
        startLoop(curBeat);
    }, 200);

    // dev: ?loopdebug shows a live HUD of the loop state so we can see why it does/doesn't fire.
    if (new URLSearchParams(location.search).has('loopdebug')) {
        const hud = document.createElement('div');
        hud.style.cssText = 'position:fixed;top:8px;left:8px;z-index:2147483647;background:rgba(0,0,0,.88);' +
            'color:#9effa0;font:12px/1.5 monospace;padding:8px 10px;border-radius:6px;white-space:pre;pointer-events:none;';
        document.body.appendChild(hud);
        setInterval(() => {
            const r = story.getBoundingClientRect();
            const gate = !(r.bottom < window.innerHeight * 0.5 || r.top > window.innerHeight * 0.5);
            const rep = curBeat > 0 ? getReplay(curBeat) : null;
            hud.textContent =
                'frame      ' + (curBeat + 1) + '  (beat ' + curBeat + ')\n' +
                'loops?     ' + (rep ? 'YES' : 'no (block intro / frame<=1)') + '\n' +
                'looping    ' + (loopRAF ? 'RUNNING' : 'stopped') + '\n' +
                'idle ms    ' + Math.round(performance.now() - lastScrollAt) + '  (need >240)\n' +
                'in view    ' + (gate ? 'yes' : 'NO  rect.top=' + Math.round(r.top)) + '\n' +
                'forceP     ' + (story.dataset.forceP || '-') + '   narrated ' + story.classList.contains('story--narrated');
        }, 120);
    }

    // dev verification hook: ?storyp=0.42 forces a fixed progress and pins the
    // sticky stage into view so a headless screenshot captures that beat.
    const sp = new URLSearchParams(location.search).get('storyp');
    if (sp !== null) {
        story.dataset.forceP = sp;
        story.classList.add('story--forced');   // pins the stage to the viewport for capture
    }
    // dev: ?testloop=N pins the stage on beat N and runs its animation loop (for verifying the loop)
    const tl = new URLSearchParams(location.search).get('testloop');
    if (tl !== null) {
        const n = parseInt(tl, 10);
        story.dataset.forceP = ((BEATS[n].t + 0.5) / duration).toString();   // pin onScroll to beat N
        story.dataset.testLoop = '1';
        story.classList.add('story--forced');
        // NOTE: no direct startLoop() — the idle interval must trigger it (verifies the real path)
    }
    // dev: ?autoloop=N scrolls to beat N (no forcing) so the real idle-interval loop must trigger it
    const al = new URLSearchParams(location.search).get('autoloop');
    if (al !== null) {
        const n = parseInt(al, 10);
        setTimeout(() => {
            const range = story.offsetHeight - window.innerHeight;
            window.scrollTo(0, story.offsetTop + ((BEATS[n].t + 0.5) / duration) * range);
        }, 200);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // ----- arrow-key navigation between beats -----
    // While the sticky stage is pinned, Up/Down (and Left/Right, PageUp/Down) snap to the
    // adjacent beat. Stepping past either end falls through to normal scrolling so the keys
    // still carry you out of the story.
    const beatScrollTarget = (i) => {
        const range = story.offsetHeight - window.innerHeight;
        const tNext = i < BEATS.length - 1 ? BEATS[i + 1].t : duration;
        const tMid = (BEATS[i].t + tNext) / 2;            // park mid-beat so it reads as active
        return story.offsetTop + Math.min(1, tMid / duration) * range;
    };
    const currentBeat = () => {
        const range = story.offsetHeight - window.innerHeight;
        let p = range > 0 ? (-story.getBoundingClientRect().top) / range : 0;
        const t = Math.max(0, Math.min(1, p)) * duration;
        let bi = 0; for (let i = 0; i < BEATS.length; i++) if (BEATS[i].t <= t + 0.01) bi = i;
        return bi;
    };
    const storyPinned = () => {
        const r = story.getBoundingClientRect();
        return r.top <= 1 && r.bottom >= window.innerHeight - 1;
    };
    window.addEventListener('keydown', (e) => {
        if (story.dataset.forceP || e.metaKey || e.ctrlKey || e.altKey) return;
        if (story.classList.contains('story--narrated')) return;
        const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown';
        const prev = e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp';
        if ((!next && !prev) || !storyPinned()) return;
        const tgt = currentBeat() + (next ? 1 : -1);
        if (tgt < 0 || tgt >= BEATS.length) return;        // let the page scroll out of the story
        e.preventDefault();
        window.scrollTo({ top: beatScrollTarget(tgt), behavior: 'smooth' });
    });

    // ----- click the chapter rail to jump to a method; Skip jumps to the end -----
    const scrollToT = (t) => {
        const range = story.offsetHeight - window.innerHeight;
        window.scrollTo({ top: story.offsetTop + Math.min(1, (t + 0.4) / duration) * range, behavior: 'smooth' });
    };
    chips.forEach(chip => chip.addEventListener('click', () => scrollToT(parseFloat(chip.dataset.t) || 0)));
    const skip = document.getElementById('story-skip');
    if (skip) skip.addEventListener('click', () => {
        const range = story.offsetHeight - window.innerHeight;
        window.scrollTo({ top: story.offsetTop + range, behavior: 'smooth' });
    });

    // ----- mode toggle: scroll-driven diagram vs. narrated overview video -----
    const modeWrap = document.getElementById('story-mode');
    const setMode = (mode) => {
        const narrated = mode === 'narrated';
        if (modeWrap) modeWrap.querySelectorAll('.story__mode-btn').forEach(btn => {
            const on = btn.dataset.mode === mode;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        if (narrated) {
            window.scrollTo(0, story.offsetTop);          // park at the section top before it shrinks
            story.classList.add('story--narrated');
            if (videoEl) { try { videoEl.muted = false; videoEl.currentTime = 0; const pr = videoEl.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {} }
        } else {
            story.classList.remove('story--narrated');
            if (videoEl) { try { videoEl.pause(); } catch (e) {} }
        }
        onScroll();
    };
    if (modeWrap) modeWrap.querySelectorAll('.story__mode-btn').forEach(btn =>
        btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    // deep-link straight to the narrated overview: ?storymode=narrated
    if (new URLSearchParams(location.search).get('storymode') === 'narrated') setMode('narrated');

    onScroll();
}

// Initialize sliders, dots, checkmarks, and video speed badges
function initializeInteractiveSections() {
    try { initBaselineDiagram(); } catch (e) { console.error('initBaselineDiagram failed:', e); }
    try { initStoryScrub(); } catch (e) { console.error('initStoryScrub failed:', e); }
    const dotsContainer = document.getElementById('slider-dots');
    const iterationSlider = document.getElementById('iteration-slider');
    const sliderHint = document.querySelector('#time-lapses-block .slider-hint');
    
    // Initialize for efficiency section (only if elements are present)
    if (dotsContainer && iterationSlider) {
        // Start at the first success checkmark (iteration 60)
        const initialIteration = 60;
        iterationSlider.max = 100;
        iterationSlider.value = initialIteration;
        
        // Create dots for efficiency slider
        if (!dotsContainer.hasChildNodes()) {
            for (let i = 0; i <= 100; i += 10) {
                const dot = document.createElement('div');
                dot.className = 'slider-dot' + (i <= initialIteration ? ' active' : '');
                dot.dataset.value = i;
                dotsContainer.appendChild(dot);
            }
        }
        const checkmarksContainer = document.getElementById('slider-checkmarks');
        if (checkmarksContainer && !checkmarksContainer.hasChildNodes()) {
            const pushCheckValues = [60, 70, 80, 90, 100];
            for (let i = 0; i <= 100; i += 10) {
                const span = document.createElement('span');
                span.textContent = pushCheckValues.includes(i) ? '✓' : '';
                checkmarksContainer.appendChild(span);
            }
        }
        // Ensure all dependent UI (labels, videos, time) match initial position
        updateIteration(initialIteration);

        // Show a one-time hint above the slider until the user interacts
        if (sliderHint) {
            sliderHint.classList.add('visible');
            const dismissHint = () => {
                sliderHint.classList.remove('visible');
            };
            iterationSlider.addEventListener('input', dismissHint, { once: true });
            iterationSlider.addEventListener('mousedown', dismissHint, { once: true });
            iterationSlider.addEventListener('touchstart', dismissHint, { once: true });
        }
    }

    // Initialize for transfer section
    const transferDotsContainer = document.getElementById('transfer-slider-dots');
    const transferSlider = document.getElementById('transfer-iteration-slider');
    const transferSliderHint = document.querySelector('#transfer-time-lapses-block .slider-hint');
    
    if (transferDotsContainer && transferSlider) {
        // Start at the first success checkmark (iteration 30)
        const initialTransferIteration = 30;
        transferSlider.max = 100;
        transferSlider.value = initialTransferIteration;
        
        // Create dots for transfer slider
        if (!transferDotsContainer.hasChildNodes()) {
            for (let i = 0; i <= 100; i += 10) {
                const dot = document.createElement('div');
                dot.className = 'slider-dot' + (i <= initialTransferIteration ? ' active' : '');
                dot.dataset.value = i;
                transferDotsContainer.appendChild(dot);
            }
        }
        const transferCheckmarksContainer = document.getElementById('transfer-slider-checkmarks');
        if (transferCheckmarksContainer && !transferCheckmarksContainer.hasChildNodes()) {
            const transferPushCheckValues = [30, 40, 50, 60, 80, 100];
            for (let i = 0; i <= 100; i += 10) {
                const span = document.createElement('span');
                span.textContent = transferPushCheckValues.includes(i) ? '✓' : '';
                transferCheckmarksContainer.appendChild(span);
            }
        }
        // Ensure all dependent UI (labels, videos, time) match initial position
        updateTransferIteration(initialTransferIteration);

        // Show a one-time hint above the transfer slider until the user interacts
        if (transferSliderHint) {
            transferSliderHint.classList.add('visible');
            const dismissTransferHint = () => {
                transferSliderHint.classList.remove('visible');
            };
            transferSlider.addEventListener('input', dismissTransferHint, { once: true });
            transferSlider.addEventListener('mousedown', dismissTransferHint, { once: true });
            transferSlider.addEventListener('touchstart', dismissTransferHint, { once: true });
        }
    }

    // Ensure comparison / transfer videos have speed badges and playback rate set
    document.querySelectorAll('.video-display').forEach(display => {
        const isDemo = display.closest('.demo-video-wrapper');
        const isTeaser = display.classList.contains('teaser-video');
        const isMethodCard = display.closest('.method-mppi-video') || display.closest('.method-card-media');
        if (isMethodCard) return;
        if (!isDemo && !isTeaser && !display.querySelector('.video-speed-badge')) {
            const badge = document.createElement('span');
            badge.className = 'video-speed-badge';
            badge.textContent = '3X';
            display.appendChild(badge);
        }
        display.querySelectorAll('video').forEach(v => {
            // Leave the method MPAIL2 video and the summary teaser at normal speed
            if (v.dataset.allowAudio !== undefined || isTeaser) {
                v.playbackRate = 1;
                return;
            }
            v.playbackRate = 3;
            v.addEventListener('loadeddata', function() { this.playbackRate = 3; });
        });
    });
    ['demonstrations-grid', 'initial-demonstrations-grid', 'transfer-demonstrations-grid'].forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (grid && !grid.querySelector('.video-speed-badge')) {
            const badge = document.createElement('span');
            badge.className = 'video-speed-badge';
            badge.textContent = '3X';
            grid.appendChild(badge);
        }
    });

    // Keep sample method and transfer demo in a consistent initial state
    updateSampleMethodVideo();
    switchTransferDemo('initial');
    initializeMethodVideos();
}

function initializeMethodVideos() {
    const methodVideoIds = ['method-mppi-video', 'method-card-video-right'];
    methodVideoIds.forEach(id => {
        const v = document.getElementById(id);
        if (!v || v.dataset.initialized === 'true') return;
        v.dataset.initialized = 'true';
        v.playbackRate = 1;
        v.muted = true;
        v.defaultMuted = true;

        const tryPlay = () => { if (v.paused) v.play().catch(() => {}); };
        if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            tryPlay();
        } else {
            v.addEventListener('loadeddata', tryPlay, { once: true });
            v.addEventListener('canplay', tryPlay, { once: true });
        }
    });

    const methodSection = document.getElementById('method-section');
    if (methodSection && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    methodVideoIds.forEach(id => {
                        const v = document.getElementById(id);
                        if (v && v.paused) v.play().catch(() => {});
                    });
                }
            });
        }, { threshold: 0.25 });
        observer.observe(methodSection);
    }
}

function updateIteration(value) {
    const iteration = parseInt(value);
    document.getElementById('iteration-display').textContent = iteration;
    
    // Update dots
    const dots = document.querySelectorAll('#slider-dots .slider-dot');
    dots.forEach(dot => {
        const dotValue = parseInt(dot.dataset.value);
        if (dotValue <= iteration) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Update time spent
    const timeSpent = document.getElementById('time-spent');
    if (iteration === 0) {
        timeSpent.textContent = '0';
    } else {
        const rate = currentTask === 'pick-place' ? (68 / 150) : (49 / 100);
        const minutes = Math.round(iteration * rate);
        timeSpent.textContent = `~${minutes} min`;
    }
    
    updateVideo();
    updateSampleMethodVideo();
}

// Task selection functionality
var currentTask = 'push';
window.currentTask = currentTask;

function selectTask(task) {
    currentTask = task;
    window.currentTask = task;

    // If there's an experiments sidebar hint showing, hide it when user changes tasks
    if (typeof window.dismissLeftSidebarHint === 'function') {
        window.dismissLeftSidebarHint();
    }
    
    // Update task buttons
    document.querySelectorAll('.task-btn').forEach(btn => {
        if (btn.dataset.task === task) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update task button wrappers
    document.querySelectorAll('.task-btn-wrapper').forEach(wrapper => {
        if (wrapper.dataset.task === task) {
            wrapper.classList.add('active');
        } else {
            wrapper.classList.remove('active');
        }
    });
    
    if (task === 'pick-place') {
        document.getElementById('efficiency-section').classList.add('task-pick-place');
        document.getElementById('transfer-section').classList.add('task-pick-place');
    } else {
        document.getElementById('efficiency-section').classList.remove('task-pick-place');
        document.getElementById('transfer-section').classList.remove('task-pick-place');
    }

    updateSliderRange();
    updateVideo();
    updateSampleMethodVideo();
    updateTransferVideo();
    updateDemonstrationVideos();
    updateTransferDemonstrationVideos();
    updateInitialDemonstrationVideos();
    updateResultsImages();
    if (typeof refreshCharts === 'function') refreshCharts();
}

function updateSliderRange() {
    const maxIter = currentTask === 'push' ? 100 : 150;

    const slider = document.getElementById('iteration-slider');
    slider.max = maxIter;
    if (parseInt(slider.value) > maxIter) slider.value = maxIter;
    rebuildDots('slider-dots', maxIter, parseInt(slider.value));
    updateIteration(slider.value);

    const transferSlider = document.getElementById('transfer-iteration-slider');
    transferSlider.max = maxIter;
    if (parseInt(transferSlider.value) > maxIter) transferSlider.value = maxIter;
    rebuildDots('transfer-slider-dots', maxIter, parseInt(transferSlider.value));
    updateTransferIteration(transferSlider.value);

}

function rebuildDots(containerId, maxIter, currentValue) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    for (let i = 0; i <= maxIter; i += 10) {
        const dot = document.createElement('div');
        dot.className = 'slider-dot' + (i <= currentValue ? ' active' : '');
        dot.dataset.value = i;
        container.appendChild(dot);
    }
    if (containerId === 'slider-dots') {
        const checkmarksContainer = document.getElementById('slider-checkmarks');
        if (checkmarksContainer) {
            const pushCheckValues = [60, 70, 80, 90, 100];
            const pickPlaceCheckValues = [60, 70, 100, 110, 120, 130, 140];
            const checkValues = currentTask === 'push' ? pushCheckValues : pickPlaceCheckValues;
            checkmarksContainer.innerHTML = '';
            for (let i = 0; i <= maxIter; i += 10) {
                const span = document.createElement('span');
                span.textContent = checkValues.includes(i) ? '✓' : '';
                checkmarksContainer.appendChild(span);
            }
        }
    }
    if (containerId === 'transfer-slider-dots') {
        const transferCheckmarksContainer = document.getElementById('transfer-slider-checkmarks');
        if (transferCheckmarksContainer) {
            const transferPushCheckValues = [30, 40, 50, 60, 80, 100];
            const transferPickPlaceCheckValues = [30, 40, 70, 80, 90, 100, 110, 130, 140, 150];
            const transferCheckValues = currentTask === 'push' ? transferPushCheckValues : transferPickPlaceCheckValues;
            transferCheckmarksContainer.innerHTML = '';
            for (let i = 0; i <= maxIter; i += 10) {
                const span = document.createElement('span');
                span.textContent = transferCheckValues.includes(i) ? '✓' : '';
                transferCheckmarksContainer.appendChild(span);
            }
        }
    }
}

function updateResultsImages() {
    const folder = currentTask === 'push' ? 'Push' : 'Pick';
    const tableImg = document.getElementById('results-table-img');
    if (tableImg) tableImg.src = `Media/Image/Results/${folder}_table.png`;
    const tTableImg = document.getElementById('transfer-results-table-img');
    if (tTableImg) tTableImg.src = `Media/Image/Results/Transfer_${folder}_table.png`;
}

function updateDemonstrationVideos() {
    const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
    const demoVideos = document.querySelectorAll('.demo-video');
    
    demoVideos.forEach((video, index) => {
        const demoNum = index + 1;
        const videoPath = `Media/Video/Demonstrations/${taskFolder}/demo_${demoNum}.mp4`;
        video.src = videoPath;
        video.load();
    });
}

function updateTransferDemonstrationVideos() {
    const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
    const demoVideos = document.querySelectorAll('.transfer-demo-video');
    
    demoVideos.forEach((video, index) => {
        const demoNum = index + 1;
        const videoPath = `Media/Video/Demonstrations/Transfer/${taskFolder}/demo_${demoNum}.mp4`;
        video.src = videoPath;
        video.load();
    });
}

function updateInitialDemonstrationVideos() {
    const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
    const demoVideos = document.querySelectorAll('.initial-demo-video');
    
    demoVideos.forEach((video, index) => {
        const demoNum = index + 1;
        const videoPath = `Media/Video/Demonstrations/${taskFolder}/demo_${demoNum}.mp4`;
        video.src = videoPath;
        video.load();
    });
}

function switchTransferDemo(mode) {
    const initialPanel = document.getElementById('transfer-demo-panel-initial');
    const newPanel = document.getElementById('transfer-demo-panel-new');
    const buttons = document.querySelectorAll('.transfer-demo-btn');
    if (!initialPanel || !newPanel) return;

    if (mode === 'initial') {
        initialPanel.classList.remove('hidden');
        newPanel.classList.add('hidden');
    } else {
        initialPanel.classList.add('hidden');
        newPanel.classList.remove('hidden');
    }

    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.transferDemo === mode);
    });
}

let currentSampleMethod = 'mpail2-p';
const sampleMethodFolderMap = {
    'mpail2-p': 'mpail2_p',
    'mpail2-pm': 'mpail2_pm',
    'rlpd': 'rlpd'
};
const sampleMethodLabelMap = {
    'mpail2-p': 'Without Planning',
    'mpail2-pm': 'Model-Free',
    'rlpd': 'RLPD'
};
function selectSampleMethod(method) {
    currentSampleMethod = method;
    document.querySelectorAll('.sample-method-btn').forEach(btn => {
        if (btn.dataset.method === method) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    const label = document.getElementById('sample-method-label');
    if (label) label.textContent = sampleMethodLabelMap[method] || method;
    updateSampleMethodVideo();
}
function updateSampleMethodVideo() {
    const iterationSliderEl = document.getElementById('iteration-slider');
    if (!iterationSliderEl) {
        // Sections (and slider) not yet loaded; nothing to update
        return;
    }
    const iteration = parseInt(iterationSliderEl.value);
    const folder = sampleMethodFolderMap[currentSampleMethod] || 'mpail2_p';
    const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
    const videoPath = `Media/Video/Comparison/${folder}/${taskFolder}/iter_${iteration}.mp4`;
    const video = document.getElementById('sample-method-video');
    if (!video) return;
    video.classList.add('loading');
    video.src = videoPath;
    video.load();
    video.oncanplay = function() {
        this.playbackRate = 3;
        this.classList.remove('loading');
        this.play();
        this.oncanplay = null;
    };
}

function updateVideo() {
    const iterationSliderEl = document.getElementById('iteration-slider');
    const videoLeft = document.getElementById('task-video');
    if (!iterationSliderEl || !videoLeft) {
        return;
    }
    const iteration = parseInt(iterationSliderEl.value);

    const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
    const videoPath = `Media/Video/${taskFolder}/iter_${iteration}.mp4`;

    videoLeft.classList.add('loading');

    setTimeout(() => {
        videoLeft.src = videoPath;
        videoLeft.load();

        videoLeft.oncanplay = function() {
            this.playbackRate = 3;
            videoLeft.classList.remove('loading');
            videoLeft.play();
            videoLeft.oncanplay = null;
        };
    }, 150);
}

// Transfer section functionality
function updateTransferIteration(value) {
    const iteration = parseInt(value);
    document.getElementById('transfer-iteration-display').textContent = iteration;
    
    // Update dots
    const dots = document.querySelectorAll('#transfer-slider-dots .slider-dot');
    dots.forEach(dot => {
        const dotValue = parseInt(dot.dataset.value);
        if (dotValue <= iteration) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Update time spent
    const timeSpent = document.getElementById('transfer-time-spent');
    if (iteration === 0) {
        timeSpent.textContent = '0';
    } else {
        const rate = currentTask === 'pick-place' ? (72 / 150) : (47 / 100);
        const minutes = Math.round(iteration * rate);
        timeSpent.textContent = `~${minutes} min`;
    }
    
    updateTransferVideo();
}

function updateTransferVideo() {
    const transferSliderEl = document.getElementById('transfer-iteration-slider');
    const videoLeft = document.getElementById('transfer-video-left');
    const videoRight = document.getElementById('transfer-video-right');
    if (!transferSliderEl || !videoLeft || !videoRight) {
        return;
    }
    const iteration = parseInt(transferSliderEl.value);
    
    // Determine task folder
    const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
    
    // Build video paths
    const videoPathLeft = `Media/Video/Transfer/${taskFolder}/iter_${iteration}.mp4`;
    const videoPathRight = `Media/Video/From%20Scratch/${taskFolder}/iter_${iteration}.mp4`;

    // Show loading states
    videoLeft.classList.add('loading');
    videoRight.classList.add('loading');
    
    setTimeout(() => {
        videoLeft.src = videoPathLeft;
        videoRight.src = videoPathRight;
        videoLeft.playbackRate = 3;
        videoRight.playbackRate = 3;
        videoLeft.load();
        videoRight.load();
        
        videoLeft.oncanplay = function() {
            this.playbackRate = 3;
            videoLeft.classList.remove('loading');
            videoLeft.play();
            videoLeft.oncanplay = null;
        };
        videoRight.oncanplay = function() {
            this.playbackRate = 3;
            videoRight.classList.remove('loading');
            videoRight.play();
            videoRight.oncanplay = null;
        };
    }, 150);
}

// Timeline navigation click handlers
document.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const sectionName = this.dataset.section;
        
        // Set navigation flag
        window.isTimelineNavigating = true;
        
        // Get sections
        const summarySection = document.getElementById('summary-section');
        const efficiencySection = document.getElementById('efficiency-section');
        const transferSection = document.getElementById('transfer-section');
        const generalizationSection = document.getElementById('generalization-section');
        const yourTurnSection = document.getElementById('your-turn-section');
        
        const methodSection = document.getElementById('method-section');
        const resultsOverviewSection = document.getElementById('results-overview-section');

        // Reset all classes
        summarySection.classList.remove('fade-out', 'instant-show');
        efficiencySection.classList.remove('fade-in', 'fade-out', 'hidden-below');
        transferSection.classList.remove('fade-in', 'fade-out', 'hidden-below');
        generalizationSection.classList.remove('fade-in', 'fade-out', 'hidden-below');
        if (yourTurnSection) {
            yourTurnSection.classList.remove('fade-in', 'fade-out', 'hidden-below');
        }
        
        // Update active timeline item
        document.querySelectorAll('.timeline-item').forEach(ti => {
            if (ti.dataset.section === sectionName) {
                ti.classList.add('active');
            } else {
                ti.classList.remove('active');
            }
        });
        
        // Determine scroll target and set section states
        let scrollTarget = 0;
        
        // Apply section states based on target
        if (sectionName === 'summary') {
            scrollTarget = window.innerHeight;
            summarySection.classList.add('instant-show');
            efficiencySection.classList.add('hidden-below');
            transferSection.classList.add('hidden-below');
            generalizationSection.classList.add('hidden-below');
            if (yourTurnSection) yourTurnSection.classList.add('hidden-below');
        } else if (sectionName === 'results-overview' && resultsOverviewSection) {
            scrollTarget = resultsOverviewSection.offsetTop;
        } else if (sectionName === 'side-by-side') {
            scrollTarget = efficiencySection.offsetTop;
            summarySection.classList.add('fade-out');
            efficiencySection.classList.add('fade-in');
            transferSection.classList.add('hidden-below');
            generalizationSection.classList.add('hidden-below');
            if (yourTurnSection) yourTurnSection.classList.add('hidden-below');
        } else if (sectionName === 'generalization') {
            scrollTarget = generalizationSection.offsetTop;
            summarySection.classList.add('fade-out');
            efficiencySection.classList.add('fade-out');
            transferSection.classList.add('fade-out');
            generalizationSection.classList.add('fade-in');
            if (yourTurnSection) yourTurnSection.classList.add('hidden-below');
        } else if (sectionName === 'your-turn' && yourTurnSection) {
            scrollTarget = yourTurnSection.offsetTop;
            summarySection.classList.add('fade-out');
            efficiencySection.classList.add('fade-out');
            transferSection.classList.add('fade-out');
            generalizationSection.classList.add('fade-out');
            yourTurnSection.classList.add('fade-in');
        } else if (sectionName === 'method' && methodSection) {
            scrollTarget = methodSection.offsetTop;
        }
        
        // Smooth scroll to target
        window.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
        });
        
        // Reset navigation flag after scroll
        setTimeout(() => {
            window.isTimelineNavigating = false;
            summarySection.classList.remove('instant-show');
        }, 800);
    });
});

function openVideoModal(section) {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('modal-video');
    
    // Determine video path based on section
    let videoPath;
    if (section === 'sample') {
        // Main sample videos
        if (currentTask === 'push') {
            videoPath = 'Media/Video/Full/MPAIL.mp4';
        } else {
            videoPath = 'Media/Video/Full/PickandPlace.mp4';
        }
    } else if (section === 'scratch') {
        // From scratch videos
        if (currentTask === 'push') {
            videoPath = 'Media/Video/Full/From_Scratch_Push.mp4';
        } else {
            videoPath = 'Media/Video/Full/From_Scratch_Pick.mp4';
        }
    } else if (section === 'transfer') {
        // Transfer videos
        if (currentTask === 'push') {
            videoPath = 'Media/Video/Full/Transfer_Push.mp4';
        } else {
            videoPath = 'Media/Video/Full/Transfer_PickandPlace.mp4';
        }
    } else if (section === 'comparison') {
        const methodFolder = sampleMethodFolderMap[currentSampleMethod] || 'mpail2_p';
        const taskFolder = currentTask === 'push' ? 'Push' : 'Pick';
        videoPath = `Media/Video/Comparison/Full/${methodFolder}_${taskFolder}.mp4`;
    }
    
    // Load video
    video.src = videoPath;
    video.load();
    video.playbackRate = 3;
    
    modal.classList.add('active');
    video.currentTime = 0;
    video.play();
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('modal-video');
    modal.classList.remove('active');
    video.pause();
    document.body.style.overflow = '';
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('video-modal');
    const backdrop = modal.querySelector('.modal-backdrop');
    backdrop.addEventListener('click', closeVideoModal);
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeVideoModal();
        }
    });
});

// Video synchronization and controls
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('video').forEach(function(video) {
        if (video.dataset.allowAudio !== undefined) return;
        video.muted = true;
        video.addEventListener('volumechange', function() {
            if (!this.muted) {
                this.muted = true;
            }
        });
    });

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'VIDEO') {
                    if (node.dataset.allowAudio !== undefined) return;
                    node.muted = true;
                    node.addEventListener('volumechange', function() {
                        if (!this.muted) this.muted = true;
                    });
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('video').forEach(function(v) {
                        if (v.dataset.allowAudio !== undefined) return;
                        v.muted = true;
                        v.addEventListener('volumechange', function() {
                            if (!this.muted) this.muted = true;
                        });
                    });
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Copy-to-clipboard for BibTeX
    document.addEventListener('click', function(e) {
        const btn = e.target.closest && e.target.closest('.copy-bibtex-btn');
        if (!btn) return;

        const targetSelector = btn.getAttribute('data-copy-target');
        if (!targetSelector) return;
        const targetEl = document.querySelector(targetSelector);
        if (!targetEl) return;

        const text = targetEl.textContent.trim();
        if (!text) return;

        const statusEl = btn.parentElement.querySelector('.copy-bibtex-status');

        function showCopied() {
            if (statusEl) {
                statusEl.textContent = 'Copied!';
            }
            const originalTitle = btn.getAttribute('title') || '';
            btn.setAttribute('data-original-title', originalTitle);
            btn.setAttribute('title', 'Copied!');
            btn.disabled = true;
            setTimeout(() => {
                const savedTitle = btn.getAttribute('data-original-title') || originalTitle;
                if (savedTitle) {
                    btn.setAttribute('title', savedTitle);
                } else {
                    btn.removeAttribute('title');
                }
                btn.removeAttribute('data-original-title');
                btn.disabled = false;
                if (statusEl) {
                    statusEl.textContent = '';
                }
            }, 1500);
        }

        const fallbackCopy = () => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showCopied();
            } catch (err) {
                console.error('Failed to copy BibTeX:', err);
            } finally {
                document.body.removeChild(textarea);
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showCopied).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    });
});

// Theme toggle functionality
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    
    // Save theme preference
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

// Load theme preference on page load
(function() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
    }
})();