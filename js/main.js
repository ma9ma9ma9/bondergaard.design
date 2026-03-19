/* ============================================================
   BONDERGAARD.DESIGN — Main JS
   ============================================================ */

(function () {
  'use strict';

  /* --- State --- */
  const SESSION_KEY = 'bd_welcomed';

  /* ============================================================
     WELCOME ANIMATION
     Only plays once per browser session (sessionStorage flag).
  ============================================================ */

  function initWelcome() {
    const welcome = document.getElementById('welcome');
    const main = document.getElementById('main');

    if (!welcome || !main) return;

    const alreadySeen = sessionStorage.getItem(SESSION_KEY);

    if (alreadySeen) {
      // Skip animation — show main immediately
      welcome.remove();
      main.classList.add('is-visible');
      main.removeAttribute('aria-hidden');
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
      return;
    }

    // Total animation: name fades in at 0.1s, bar fills 0.4s–1.8s
    // Then hold 200ms, then transition out
    const HOLD_MS = 200;
    const BAR_DURATION_MS = 1400; // matches CSS animation duration
    const BAR_DELAY_MS = 400;     // matches CSS animation delay
    const TOTAL_MS = BAR_DELAY_MS + BAR_DURATION_MS + HOLD_MS;

    setTimeout(() => {
      // Mark seen
      sessionStorage.setItem(SESSION_KEY, '1');

      // Dismiss welcome overlay
      welcome.classList.add('is-done');

      // Reveal main content
      main.classList.add('is-visible');
      main.removeAttribute('aria-hidden');
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');

      // Remove from DOM after fade
      setTimeout(() => {
        if (welcome.parentNode) welcome.remove();
      }, 700);

    }, TOTAL_MS);
  }

  /* ============================================================
     GRID / LIST TOGGLE
  ============================================================ */

  function initViewToggle() {
    const gridBtn = document.getElementById('grid-btn');
    const listBtn = document.getElementById('list-btn');
    const projects = document.getElementById('projects');

    if (!gridBtn || !listBtn || !projects) return;

    // Restore preference
    const savedView = localStorage.getItem('bd_view') || 'grid';
    if (savedView === 'list') {
      setView('list', false);
    }

    gridBtn.addEventListener('click', () => setView('grid', true));
    listBtn.addEventListener('click', () => setView('list', true));

    function setView(view, animate) {
      if (projects.dataset.view === view) return;

      if (animate) {
        // Quick fade-out cards, swap layout, fade back in
        projects.classList.add('is-switching');

        // Wait for cards to fade out
        setTimeout(() => {
          applyView(view);

          // Force reflow so transition fires
          void projects.offsetHeight;

          projects.classList.remove('is-switching');
        }, 200);
      } else {
        applyView(view);
      }

      localStorage.setItem('bd_view', view);
    }

    function applyView(view) {
      projects.dataset.view = view;

      // Update button states
      gridBtn.classList.toggle('toggle-btn--active', view === 'grid');
      listBtn.classList.toggle('toggle-btn--active', view === 'list');
    }
  }

  /* ============================================================
     PAGE ENTRY ANIMATION
     Stagger-in cards after main content becomes visible.
  ============================================================ */

  function initPageEntry() {
    const main = document.getElementById('main');
    if (!main) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          if (main.classList.contains('is-visible') || document.body.classList.contains('loaded')) {
            animateCardsIn();
            observer.disconnect();
          }
        }
      });
    });

    observer.observe(main, { attributes: true });

    // If already visible (about page, no welcome screen)
    if (document.body.classList.contains('loaded')) {
      animateCardsIn();
    }
  }

  function animateCardsIn() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
      card.style.transition = `opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms`;

      // Force paint
      void card.offsetHeight;

      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }

  /* ============================================================
     ABOUT PAGE: fade in content
  ============================================================ */

  function initAboutEntry() {
    const about = document.querySelector('.about');
    if (!about) return;

    const els = about.querySelectorAll('.about__image, .about__text, .about__detail-group');
    els.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = `opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60 + 100}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60 + 100}ms`;

      void el.offsetHeight;

      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }

  /* ============================================================
     HEADER: subtle scroll behavior
  ============================================================ */

  function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastY = 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y > 80 && y > lastY) {
            // Scrolling down — dim border slightly
            header.style.borderBottomColor = 'rgba(245,245,245,0.06)';
          } else {
            header.style.borderBottomColor = '';
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ============================================================
     INIT
  ============================================================ */

  document.addEventListener('DOMContentLoaded', () => {
    initWelcome();
    initViewToggle();
    initPageEntry();
    initAboutEntry();
    initHeader();
  });

})();
