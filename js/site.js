(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const publicationYears = {
    stoppability: '2026',
    lambda_reachability: '2026',
    spark: '2025',
    dexterous: '2025',
    wbcd: '2025',
    koopman: '2025',
    s3po: '2025',
    lego_manipulation: '2024',
    ascpo: '2024',
    apo: '2024',
    scpo: '2024',
    guard: '2024',
    htcp: '2024',
    lego2dlfd: '2023',
    jpc: '2022'
  };

  const cards = Array.from(document.querySelectorAll('.publication-list > tbody > tr'));
  const searchInput = document.getElementById('publication-search');
  const filterButtons = Array.from(document.querySelectorAll('.filter-button'));
  const countLabel = document.getElementById('publication-count');
  const noResults = document.getElementById('no-results');
  const clearFiltersButton = document.getElementById('clear-filters');
  let activeFilter = 'all';

  cards.forEach((card) => {
    const paper = card.querySelector('.paper');
    const year = paper ? publicationYears[paper.id] : '';
    const mediaCell = card.querySelector('td:first-child');

    card.classList.add('publication-card');
    card.dataset.year = year;

    if (year && mediaCell) {
      const yearBadge = document.createElement('span');
      yearBadge.className = 'year-badge';
      yearBadge.textContent = year;
      mediaCell.prepend(yearBadge);
    }
  });

  function updatePublications() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
      const year = Number(card.dataset.year);
      const matchesYear = activeFilter === 'all'
        || card.dataset.year === activeFilter
        || (activeFilter === 'earlier' && year < 2025);
      const shouldShow = matchesQuery && matchesYear;

      card.hidden = !shouldShow;
      if (shouldShow) visibleCount += 1;
    });

    if (countLabel) {
      countLabel.textContent = `${visibleCount} ${visibleCount === 1 ? 'paper' : 'papers'}`;
    }

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', updatePublications);
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      filterButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle('is-active', isActive);
        candidate.setAttribute('aria-pressed', String(isActive));
      });
      updatePublications();
    });
  });

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', () => {
      activeFilter = 'all';
      if (searchInput) searchInput.value = '';
      filterButtons.forEach((button) => {
        const isActive = button.dataset.filter === 'all';
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
      updatePublications();
      if (searchInput) searchInput.focus();
    });
  }

  if (typeof window.hideallbibs === 'function') {
    window.hideallbibs();
  }

  document.querySelectorAll('[id$="_abs"]').forEach((abstract) => {
    const panel = abstract.closest('p') || abstract;
    abstract.style.display = '';
    panel.style.display = 'none';
  });

  document.querySelectorAll('a[href^="javascript:toggleblock"]').forEach((link) => {
    const match = link.getAttribute('href').match(/toggleblock\('([^']+)'\)/);
    if (!match) return;

    const target = document.getElementById(match[1]);
    if (!target) return;
    const panel = target.closest('p') || target;

    link.setAttribute('role', 'button');
    link.setAttribute('aria-controls', target.id);
    link.setAttribute('aria-expanded', 'false');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const willOpen = panel.style.display === 'none';
      panel.style.display = willOpen ? 'block' : 'none';
      link.setAttribute('aria-expanded', String(willOpen));
    });
  });

  document.querySelectorAll('a[href^="javascript:togglebib"]').forEach((link) => {
    const match = link.getAttribute('href').match(/togglebib\('([^']+)'\)/);
    if (!match) return;

    const paper = document.getElementById(match[1]);
    const target = paper ? paper.querySelector('pre') : null;
    if (!target) return;

    if (!target.id) target.id = `${match[1]}_bib`;
    link.setAttribute('role', 'button');
    link.setAttribute('aria-controls', target.id);
    link.setAttribute('aria-expanded', 'false');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const willOpen = target.style.display === 'none';
      target.style.display = willOpen ? 'block' : 'none';
      link.setAttribute('aria-expanded', String(willOpen));
    });
  });

  const themeToggle = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function syncThemeControl() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    if (themeMeta) themeMeta.content = isDark ? '#101614' : '#f5f2eb';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nextTheme;
      try {
        localStorage.setItem('theme', nextTheme);
      } catch (error) {
        // Theme persistence is optional when storage is unavailable.
      }
      syncThemeControl();
    });
  }

  syncThemeControl();

  const topbar = document.querySelector('.topbar');
  const progressBar = document.querySelector('.reading-progress span');
  const backToTop = document.getElementById('back-to-top');
  let scrollTicking = false;

  function updateScrollUI() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollRange > 0 ? Math.min(1, scrollTop / scrollRange) : 0;

    if (progressBar) progressBar.style.width = `${progress * 100}%`;
    if (topbar) topbar.classList.toggle('is-scrolled', scrollTop > 12);
    if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 650);
    scrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScrollUI);
      scrollTicking = true;
    }
  }, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const yearLabel = document.getElementById('current-year');
  if (yearLabel) yearLabel.textContent = String(new Date().getFullYear());

  const revealElements = document.querySelectorAll('.hero-media, .hero-copy, .section-heading, .publication-card, .visitor-card');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealElements.forEach((element) => {
      element.classList.add('reveal-ready');
      observer.observe(element);
    });
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }

  updatePublications();
  updateScrollUI();
}());
