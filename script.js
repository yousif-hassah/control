/**
 * CONTROL SYSTEMS v4.0 — Interactive Infrastructure
 */

// ── Custom Cursor ──
const initCursor = () => {
  const dot  = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;
  let rafId;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.left  = mx + "px";
    dot.style.top   = my + "px";
  }, { passive: true });

  const animateRing = () => {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + "px";
    ring.style.top  = ry + "px";
    rafId = requestAnimationFrame(animateRing);
  };
  animateRing();

  // Hover state on interactive elements
  const hoverTargets = "a, button, .project-card, .audit-card, .card, .footer-cta";
  document.querySelectorAll(hoverTargets).forEach(el => {
    el.addEventListener("mouseenter", () => ring.classList.add("hovered"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hovered"));
  });

  document.addEventListener("mousedown", () => ring.classList.add("clicking"));
  document.addEventListener("mouseup",   () => ring.classList.remove("clicking"));

  // Hide on page leave
  document.addEventListener("mouseleave", () => { dot.style.opacity = "0"; ring.style.opacity = "0"; });
  document.addEventListener("mouseenter", () => { dot.style.opacity = "1"; ring.style.opacity = "1"; });
};

// ── Scroll Progress Bar ──
const initScrollProgress = () => {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = ((window.scrollY / total) * 100) + "%";
  }, { passive: true });
};

// ── Navbar Scroll State ──
let ticking = false;
const updateNavbar = () => {
  const nav = document.getElementById("navbar");
  nav.classList.toggle("scrolled", window.scrollY > 40);
  ticking = false;
};
window.addEventListener("scroll", () => {
  if (!ticking) { requestAnimationFrame(updateNavbar); ticking = true; }
}, { passive: true });

// ── Reveal on Scroll (staggered) ──
const revealOnScroll = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  // Stagger siblings in a grid automatically
  document.querySelectorAll(".grid-base, .projects-grid, .audit-grid").forEach(grid => {
    [...grid.children].forEach((child, i) => {
      child.style.transitionDelay = (i * 0.1) + "s";
    });
  });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
};

// ── Section Title Underline Animation ──
const initSectionTitles = () => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll(".section-title").forEach(el => observer.observe(el));
};

// ── Audit Card Micro-Interactions ──
const initCharInteractions = () => {
  document.querySelectorAll(".audit-card").forEach(card => {
    card.addEventListener("mouseenter", () => {
      const img = card.querySelector(".char-anim");
      if (img) img.style.transform = "scale(1.1) rotate(4deg)";
    });
    card.addEventListener("mouseleave", () => {
      const img = card.querySelector(".char-anim");
      if (img) img.style.transform = "";
    });
  });
};

// ── Scroll Sequence Engine ──
const initScrollSequence = async () => {
  const canvas    = document.getElementById("sequence-canvas");
  const context   = canvas.getContext("2d");
  const container = document.getElementById("scroll-sequence");
  const loader    = document.getElementById("loader");
  const overlays  = document.querySelectorAll(".story-overlay");

  const frameCount = 192;
  const images = [];

  const preloadImages = () => new Promise(resolve => {
    let loaded = 0;
    const onSettle = () => { if (++loaded === frameCount) resolve(); };
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = `vedio.c/${i.toString().padStart(5, "0")}.jpg`;
      img.onload = onSettle;
      img.onerror = onSettle;
      images.push(img);
    }
  });

  const render = (frameIndex) => {
    const img = images[frameIndex];
    if (!img || !img.complete || !img.naturalWidth) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const isMobile = window.innerWidth <= 768;
    const scaleX = canvas.width  / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    const scale  = isMobile ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    const x = canvas.width  / 2 - (img.naturalWidth  / 2) * scale;
    const y = canvas.height / 2 - (img.naturalHeight / 2) * scale;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
  };

  const updateUI = (progress) => {
    overlays.forEach(o => o.classList.remove("visible"));
    if      (progress < 0.20)                             overlays[0]?.classList.add("visible");
    else if (progress >= 0.25 && progress < 0.45)         overlays[1]?.classList.add("visible");
    else if (progress >= 0.55 && progress < 0.75)         overlays[2]?.classList.add("visible");
    else if (progress >= 0.85)                            overlays[3]?.classList.add("visible");
  };

  await preloadImages();
  loader.style.opacity = "0";
  setTimeout(() => (loader.style.display = "none"), 800);

  const handleScroll = () => {
    const rect        = container.getBoundingClientRect();
    const scrollHeight = container.offsetHeight - window.innerHeight;
    const scrolled    = -rect.top;
    const progress    = Math.max(0, Math.min(1, scrolled / scrollHeight));
    const frameIndex  = Math.min(frameCount - 1, Math.max(0, Math.floor(progress * frameCount)));
    render(frameIndex);
    updateUI(progress);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
};

// ── Mobile Menu ──
const initMobileMenu = () => {
  const toggle   = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const links    = navLinks.querySelectorAll("a");

  toggle.addEventListener("click", () => {
    toggle.classList.toggle("active");
    navLinks.classList.toggle("active");
    document.body.style.overflow = navLinks.classList.contains("active") ? "hidden" : "";
  });
  links.forEach(link => link.addEventListener("click", () => {
    toggle.classList.remove("active");
    navLinks.classList.remove("active");
    document.body.style.overflow = "";
  }));
};

// ── Smooth Anchor Scroll ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ── Boot ──
window.addEventListener("DOMContentLoaded", () => {
  initScrollSequence();
  revealOnScroll();
  initSectionTitles();
  initCharInteractions();
  initMobileMenu();
  initCursor();
  initScrollProgress();
  updateNavbar();
});