const weddingDate = new Date("2027-06-18T14:30:00+08:00");
const galleryImages = Array.from(document.querySelectorAll(".gallery__item img")).map((img) => ({
  src: img.src,
  alt: img.alt,
}));

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

window.addEventListener("load", () => {
  $(".loader")?.classList.add("is-hidden");
});

const nav = $(".nav");
const navToggle = $(".nav__toggle");

const syncNav = () => {
  nav?.classList.toggle("is-scrolled", window.scrollY > 24);
};

window.addEventListener("scroll", syncNav, { passive: true });
syncNav();

navToggle?.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

$$(".nav__links a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const memoryUploadLink = $("#memoryUploadLink");
const memoryQr = $("#memoryQr");

if (memoryUploadLink && memoryQr) {
  const uploadUrl = new URL("upload.html", window.location.href).href;
  memoryUploadLink.href = uploadUrl;
  memoryQr.src = `https://quickchart.io/qr?size=320&margin=2&text=${encodeURIComponent(uploadUrl)}`;
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
);

$$(".reveal").forEach((element) => revealObserver.observe(element));

const parallaxTarget = $("[data-parallax]");
const hero = $(".hero");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let parallaxTicking = false;
let pointerX = 0;
let pointerY = 0;

const updateHeroParallax = () => {
  if (!parallaxTarget || reduceMotion.matches) return;

  const heroHeight = hero?.offsetHeight || window.innerHeight;
  const scrollDepth = Math.min(window.scrollY / heroHeight, 1);
  const scrollOffset = scrollDepth * 42;
  const pointerOffsetX = pointerX * 14;
  const pointerOffsetY = pointerY * 10;

  parallaxTarget.style.setProperty("--hero-parallax-x", `${pointerOffsetX}px`);
  parallaxTarget.style.setProperty("--hero-parallax-y", `${scrollOffset + pointerOffsetY}px`);
  parallaxTicking = false;
};

const requestHeroParallax = () => {
  if (parallaxTicking) return;
  parallaxTicking = true;
  requestAnimationFrame(updateHeroParallax);
};

if (parallaxTarget && !reduceMotion.matches) {
  window.addEventListener("scroll", requestHeroParallax, { passive: true });
  window.addEventListener("resize", requestHeroParallax);
  hero?.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = hero.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    requestHeroParallax();
  });
  hero?.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    requestHeroParallax();
  });
  requestHeroParallax();
}

const pad = (value) => String(value).padStart(2, "0");

const updateCountdown = () => {
  const diff = weddingDate - new Date();
  const seconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  $("#days").textContent = String(days).padStart(3, "0");
  $("#hours").textContent = pad(hours);
  $("#minutes").textContent = pad(minutes);
  $("#seconds").textContent = pad(remainingSeconds);
};

updateCountdown();
setInterval(updateCountdown, 1000);

const music = $("#weddingMusic");
const musicToggle = $(".music-toggle");

const setMusicToggleState = (isPlaying) => {
  musicToggle?.classList.toggle("is-playing", isPlaying);
  musicToggle?.setAttribute("aria-pressed", String(isPlaying));
  musicToggle?.setAttribute(
    "aria-label",
    isPlaying ? "Pause background music" : "Play background music"
  );
};

const playMusic = async () => {
  if (!music) return;

  try {
    await music.play();

    setMusicToggleState(true);
  } catch {
    setMusicToggleState(false);
  }
};

const toggleMusic = async () => {
  if (!music) return;

  if (music.paused) {
    await music.play();

    setMusicToggleState(true);
  } else {
    music.pause();

    setMusicToggleState(false);
  }
};

musicToggle?.addEventListener("click", toggleMusic);

window.addEventListener("load", playMusic);

$$(".accordion button").forEach((button) => {
  button.addEventListener("click", () => {
    const isOpen = button.classList.toggle("is-open");
    button.querySelector("span").textContent = isOpen ? "-" : "+";
  });
});

const form = $("#rsvpForm");
const formStatus = $(".form-status");

const RSVP_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyEoqUea7GZCrat9hjqD2JeFRFm73BvhbG6uQMVKGHf6nzhr9Mzt5-5n7v7VNsMIC7J-w/exec";

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { status: "success" };
  }
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const invalid = $$("[required]", form).find((field) => !field.value.trim());

  if (invalid) {
    invalid.focus();
    formStatus.textContent = "Please complete the required fields before sending.";
    formStatus.style.color = "#9a5d4c";
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  const payload = {
    ...data,
    email: data.email?.trim().toLowerCase(),
    submittedAt: new Date().toISOString(),
  };

  formStatus.textContent = "Sending your RSVP...";
  formStatus.style.color = "#776a5c";

  try {
    const result = await postJson(RSVP_ENDPOINT, payload);

    if (result?.status === "duplicate") {
      formStatus.textContent = "This email has already submitted an RSVP.";
      formStatus.style.color = "#9a5d4c";
      return;
    }

    localStorage.setItem("wedding-rsvp", JSON.stringify(payload));

    formStatus.textContent = "Thank you. Your RSVP has been sent.";
    formStatus.style.color = "#8d9a7c";

    form.reset();
  } catch {
    localStorage.setItem("wedding-rsvp-pending", JSON.stringify(payload));

    formStatus.textContent = "We saved your response on this device. Please try again later.";

    formStatus.style.color = "#9a5d4c";
  }
});

let activeImage = 0;
let touchStartX = 0;
const lightbox = $(".lightbox");
const lightboxImage = $(".lightbox__image");

const showImage = (index) => {
  activeImage = (index + galleryImages.length) % galleryImages.length;
  lightboxImage.src = galleryImages[activeImage].src;
  lightboxImage.alt = galleryImages[activeImage].alt;
};

const openLightbox = (index) => {
  showImage(index);
  lightbox?.classList.add("is-open");
  lightbox?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  lightbox?.classList.remove("is-open");
  lightbox?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

$$(".gallery__item").forEach((button) => {
  button.addEventListener("click", () => openLightbox(Number(button.dataset.gallery)));
});

$(".lightbox__close")?.addEventListener("click", closeLightbox);
$(".lightbox__prev")?.addEventListener("click", () => showImage(activeImage - 1));
$(".lightbox__next")?.addEventListener("click", () => showImage(activeImage + 1));

lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

lightbox?.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].screenX;
});

lightbox?.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(delta) < 45) return;
  showImage(activeImage + (delta < 0 ? 1 : -1));
});

document.addEventListener("keydown", (event) => {
  if (!lightbox?.classList.contains("is-open")) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") showImage(activeImage - 1);
  if (event.key === "ArrowRight") showImage(activeImage + 1);
});
