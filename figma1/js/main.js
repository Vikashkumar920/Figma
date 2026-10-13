'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ==========================================================================
   Mobile navigation + active link
   ========================================================================== */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  const links = [...menu.querySelectorAll('.nav-link')];

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('.nav-link')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  const setActive = (id) => {
    // several labels can share a target; highlight the one named after the section
    const match =
      links.find((l) => l.getAttribute('href') === `#${id}` && l.textContent.trim().toLowerCase() === id) ||
      links.find((l) => l.getAttribute('href') === `#${id}`);
    if (!match) return;
    links.forEach((l) => {
      l.classList.toggle('is-active', l === match);
      if (l === match) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  };

  const sections = ['home', 'projects', 'recommendations', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => observer.observe(s));
}

/* ==========================================================================
   Testimonial carousel — the active card is centred in the viewport,
   cloned cards on each side keep the edges filled while looping.
   ========================================================================== */
function initCarousel() {
  const viewport = document.querySelector('.reviews-viewport');
  const track = document.querySelector('.reviews-track');
  const dots = [...document.querySelectorAll('.slider-dot')];
  if (!viewport || !track || !dots.length) return;

  const slides = [...track.children];
  const total = slides.length;
  // a clone sits in the centre mid-wrap; it needs a full and a partial card on each side
  const CLONES = 3;
  const AUTOPLAY_MS = 5000;

  const makeClone = (slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.classList.add('is-clone');
    return clone;
  };
  slides.slice(-CLONES).reverse().forEach((s) => track.prepend(makeClone(s)));
  slides.slice(0, CLONES).forEach((s) => track.append(makeClone(s)));

  let currentIndex = dots.findIndex((d) => d.classList.contains('active'));
  if (currentIndex < 0) currentIndex = 0;
  let timer = null;
  let isAnimating = false;

  const offsetFor = (index) => {
    const card = track.children[index + CLONES];
    return viewport.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
  };

  const render = (index, animate = true) => {
    track.classList.toggle('no-transition', !animate);
    track.style.transform = `translateX(${offsetFor(index)}px)`;
    const real = ((index % total) + total) % total;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === real);
      if (i === real) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', String(i !== real));
    });
  };

  let settleTimer;

  function updateSlide(index, animate = true) {
    if (isAnimating && animate) return;
    currentIndex = index;
    isAnimating = animate && !prefersReducedMotion.matches;
    render(index, isAnimating);
    if (isAnimating) {
      // transitionend never fires if nothing moved or the tab is in the background
      settleTimer = setTimeout(normalise, 700);
    } else {
      normalise();
    }
  }

  // after sliding onto a clone, jump to the matching real slide without animating
  function normalise() {
    clearTimeout(settleTimer);
    isAnimating = false;
    if (currentIndex < 0 || currentIndex >= total) {
      currentIndex = ((currentIndex % total) + total) % total;
      render(currentIndex, false);
      void track.offsetWidth; // flush so the next move animates again
    }
  }

  track.addEventListener('transitionend', (e) => {
    if (e.target === track) normalise();
  });

  const next = () => updateSlide(currentIndex + 1);
  const prev = () => updateSlide(currentIndex - 1);

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      updateSlide(index);
      restart();
    });
  });

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { next(); restart(); }
    if (e.key === 'ArrowLeft') { prev(); restart(); }
  });

  // swipe / drag
  let startX = null;
  viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next(); else prev();
      restart();
    }
  });
  viewport.addEventListener('pointercancel', () => { startX = null; });

  // autoplay, paused while the user is hovering, focused inside, or the tab is hidden
  const carousel = viewport.closest('.reviews');
  let hovered = false;
  let focused = false;

  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const start = () => {
    if (prefersReducedMotion.matches || timer || hovered || focused || document.hidden) return;
    timer = setInterval(next, AUTOPLAY_MS);
  };
  function restart() {
    stop();
    start();
  }

  carousel.addEventListener('mouseenter', () => { hovered = true; stop(); });
  carousel.addEventListener('mouseleave', () => { hovered = false; start(); });
  carousel.addEventListener('focusin', () => { focused = true; stop(); });
  carousel.addEventListener('focusout', (e) => {
    if (carousel.contains(e.relatedTarget)) return;
    focused = false;
    start();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => render(currentIndex, false));
  });

  render(currentIndex, false);
  // fonts change card heights/widths slightly; re-centre once they are in
  document.fonts?.ready.then(() => render(currentIndex, false));
  start();
}

/* ==========================================================================
   Contact form validation — the form is not connected to a message service
   ========================================================================== */
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  const status = contactForm.querySelector('.form-status');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = {
    fullName: (v) => (v ? '' : 'Please enter your full name.'),
    email: (v) => {
      if (!v) return 'Please enter your email address.';
      return EMAIL_RE.test(v) ? '' : 'Please enter a valid email, like name@example.com.';
    },
  };

  const validateField = (input) => {
    const message = rules[input.id](input.value.trim());
    const error = document.getElementById(`${input.id}-error`);
    error.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  };

  Object.keys(rules).forEach((id) => {
    const input = contactForm.querySelector(`#${id}`);
    // re-check while typing only after the field has been flagged once
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validateField(input);
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) validateField(input);
    });
  });

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';

    const fields = Object.keys(rules).map((id) => contactForm.querySelector(`#${id}`));
    const invalid = fields.filter((input) => !validateField(input));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    status.textContent = 'This demo form is not connected to a message service, so your message was not sent.';
  });
}

/* ==========================================================================
   Dev only: open the page with ?overlay to compare against the Figma export
   ========================================================================== */
function initOverlay() {
  if (!new URLSearchParams(location.search).has('overlay')) return;
  const img = document.createElement('img');
  img.src = 'design/figma-home.png';
  img.alt = '';
  Object.assign(img.style, {
    position: 'absolute', top: '0', left: '0',
    width: '1440px', maxWidth: 'none', opacity: '0.5', pointerEvents: 'none', zIndex: '9999',
  });
  document.body.style.position = 'relative';
  document.body.append(img);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'o') img.hidden = !img.hidden;
  });
}

initNav();
initCarousel();
initContactForm();
initOverlay();
