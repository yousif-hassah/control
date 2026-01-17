/**
 * CONTROL PERFORMANCE INFRASTRUCTURE v3.4.0
 * Optimized Scroll Management & Intersection API
 */

// Navbar Scroll Management with Throttling
let lastScrollY = window.scrollY;
let ticking = false;

function updateNavbar() {
  const nav = document.getElementById("navbar");
  if (window.scrollY > 40) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }
  ticking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateNavbar();
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true },
);

// High-Performance Reveal Animations using IntersectionObserver
const revealOnScroll = () => {
  const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        // Unobserve after revealing to save performance
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
};

// Character Micro-Interactions
const initCharInteractions = () => {
  document.querySelectorAll(".audit-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      const img = card.querySelector(".char-anim");
      if (img) img.style.transform = "scale(1.1) rotate(5deg)";
    });
    card.addEventListener("mouseleave", () => {
      const img = card.querySelector(".char-anim");
      if (img) img.style.transform = "scale(1) rotate(0deg)";
    });
  });
};

// --- Scroll Sequence & Storytelling Engine ---
const initScrollSequence = async () => {
  const canvas = document.getElementById("sequence-canvas");
  const context = canvas.getContext("2d");
  const container = document.getElementById("scroll-sequence");
  const loader = document.getElementById("loader");
  const overlays = document.querySelectorAll(".story-overlay");

  const frameCount = 192;
  const images = [];

  // Preload Images with Promise
  const preloadImages = () => {
    return new Promise((resolve) => {
      let loadedCount = 0;
      for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = `vedio.c/${i.toString().padStart(5, "0")}.jpg`;
        img.onload = () => {
          loadedCount++;
          if (loadedCount === frameCount) resolve();
        };
        images.push(img);
      }
    });
  };

  const render = (frameIndex) => {
    const img = images[frameIndex];
    if (!img) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const isMobile = window.innerWidth <= 768;

    // Calculate scaling to fill screen (cover) on mobile, fit (contain) on desktop
    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;
    const scale = isMobile
      ? Math.max(scaleX, scaleY)
      : Math.min(scaleX, scaleY);

    const x = canvas.width / 2 - (img.width / 2) * scale;
    const y = canvas.height / 2 - (img.height / 2) * scale;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  const updateUI = (progress) => {
    // Story Mapping: 0% -> Start, 30% -> Mid-Left, 60% -> Mid-Right, 90% -> End
    overlays.forEach((overlay) => overlay.classList.remove("visible"));

    if (progress < 0.2) overlays[0].classList.add("visible");
    else if (progress >= 0.25 && progress < 0.45)
      overlays[1].classList.add("visible");
    else if (progress >= 0.55 && progress < 0.75)
      overlays[2].classList.add("visible");
    else if (progress >= 0.85) overlays[3].classList.add("visible");
  };

  // Wait for images then hide loader
  await preloadImages();
  loader.style.opacity = "0";
  setTimeout(() => (loader.style.display = "none"), 800);

  const handleScroll = () => {
    const rect = container.getBoundingClientRect();
    const scrollHeight = container.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;

    let progress = Math.max(0, Math.min(1, scrolled / scrollHeight));

    const frameIndex = Math.min(
      frameCount - 1,
      Math.max(0, Math.floor(progress * frameCount)),
    );

    render(frameIndex);
    updateUI(progress);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll(); // Initial call
};

// Mobile Menu Toggle
const initMobileMenu = () => {
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const links = navLinks.querySelectorAll("a");

  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    navLinks.classList.toggle("active");
    document.body.style.overflow = navLinks.classList.contains("active")
      ? "hidden"
      : "";
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      navLinks.classList.remove("active");
      document.body.style.overflow = "";
    });
  });
};

// Execution Chain
window.addEventListener("DOMContentLoaded", () => {
  initScrollSequence();
  revealOnScroll();
  initCharInteractions();
  initMobileMenu();
  updateNavbar(); // Initial state
});

// Smooth scroll optimization for performance
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
