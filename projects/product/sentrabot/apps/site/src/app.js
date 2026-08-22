/* global gsap, ScrollTrigger */
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const mobile = window.matchMedia("(max-width: 640px)").matches;

function initFallbackInteractions() {
  const nav = document.querySelector("[data-nav]");
  window.addEventListener(
    "scroll",
    () => nav?.classList.toggle("scrolled", window.scrollY > 24),
    { passive: true },
  );

  const card = document.querySelector("[data-permission-card]");
  const status = card?.querySelector(".permission-status");
  document.querySelector("[data-allow]")?.addEventListener("click", () => {
    card?.classList.add("approved");
    if (status)
      status.textContent = "Approved once. The agent may continue this action.";
  });
  document.querySelector("[data-deny]")?.addEventListener("click", () => {
    card?.classList.remove("approved");
    if (status) status.textContent = "Denied. No files were modified.";
  });

  const agentCopy = {
    avery: [
      "AVERY / FOUNDER OPERATIONS",
      "I found three decisions. Developer is already inspecting the highest-risk change.",
    ],
    developer: [
      "DEVELOPER / ENGINEERING",
      "I inspected the repository. Three files are ready, and one action needs approval.",
    ],
    research: [
      "RESEARCH / KNOWLEDGE",
      "I compared the sources and shared a concise evidence brief with Avery.",
    ],
    operator: [
      "OPERATOR / EXECUTION",
      "The routine is queued. I will begin when the scheduled boundary is reached.",
    ],
  };
  document.querySelectorAll("[data-agent-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-agent-tab]").forEach((item) => {
        item.classList.toggle("active", item === tab);
      });
      const [name, reply] = agentCopy[tab.dataset.agentTab];
      const nameNode = document.querySelector("[data-chat-name]");
      const replyNode = document.querySelector(".message-agent");
      if (nameNode) nameNode.textContent = name;
      if (replyNode)
        replyNode.innerHTML = `<span>${tab.dataset.agentTab.toUpperCase()}</span>${reply}`;
    });
  });
  document
    .querySelector(".shell-main form")
    ?.addEventListener("submit", (event) => event.preventDefault());
}

function initMagnetic() {
  if (mobile || reduceMotion) return;
  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      gsap.to(element, {
        x: (event.clientX - bounds.left - bounds.width / 2) * 0.16,
        y: (event.clientY - bounds.top - bounds.height / 2) * 0.16,
        duration: 0.35,
        ease: "power3.out",
      });
    });
    element.addEventListener("pointerleave", () =>
      gsap.to(element, { x: 0, y: 0, duration: 0.6, ease: "power3.out" }),
    );
  });
}

function initGsap() {
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) return;
  gsap.registerPlugin(ScrollTrigger);
  const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
  entrance
    .from(".hero .hero-mascot-img", {
      opacity: 0,
      scale: 0.86,
      x: 40,
      filter: "blur(10px)",
      duration: 1.4,
    })
    .from(
      ".hero h1 .line i",
      { yPercent: 110, stagger: 0.13, duration: 1 },
      "-=1",
    )
    .from(
      ".hero .reveal",
      { opacity: 0, y: 22, stagger: 0.12, duration: 0.8 },
      "-=0.55",
    )
    .from(".hero-index", { opacity: 0, duration: 0.6 }, "-=0.3");
  gsap.from(".hero .mascot-wordmark, .hero .mascot-attributes", {
    opacity: 0,
    y: 18,
    stagger: 0.14,
    duration: 0.8,
    ease: "power3.out",
  });
  gsap.to(".hero .hero-mascot-float", {
    y: -10,
    duration: 3.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  const mascotStage = document.querySelector("[data-mascot-stage]");
  mascotStage?.addEventListener("pointermove", (event) => {
    if (mobile) return;
    const bounds = mascotStage.getBoundingClientRect();
    gsap.to(mascotStage.querySelector(".hero-mascot-img"), {
      rotateY: ((event.clientX - bounds.left) / bounds.width - 0.5) * 5,
      rotateX: -((event.clientY - bounds.top) / bounds.height - 0.5) * 4,
      duration: 0.8,
      ease: "power2.out",
    });
  });

  gsap.to(".hero .hero-visual", {
    scale: 0.9,
    y: 100,
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 1.2,
    },
  });
  gsap.utils
    .toArray(
      ".editorial-copy, .agent-roster article, .computer-copy, .permission-card, .memory-visual li, .workflow-list article, .conversation, .highlight-grid article",
    )
    .forEach((item) => {
      gsap.from(item, {
        opacity: 0,
        y: 40,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: item, start: "top 86%" },
      });
    });

  if (!mobile) {
    const network = gsap.timeline({
      scrollTrigger: {
        trigger: ".network-story",
        start: "top top",
        end: "bottom bottom",
        pin: ".network-pin",
        scrub: 1,
      },
    });
    network
      .to(".node-1,.node-2,.node-3,.node-4", {
        opacity: 1,
        scale: 1,
        stagger: 0.1,
        ease: "power2.out",
      })
      .to(".network-phase", { opacity: 0, y: -10, duration: 0.15 })
      .set(".network-phase", { textContent: "A TEAM", y: 10 })
      .to(".network-phase", { opacity: 1, y: 0, duration: 0.15 })
      .to(".constellation path", {
        strokeDashoffset: 0,
        duration: 1,
        ease: "none",
      })
      .to(".network-phase", { opacity: 0, duration: 0.1 })
      .set(".network-phase", { textContent: "SHARED CONTEXT" })
      .to(".network-phase", { opacity: 1, duration: 0.1 })
      .to(".task-packet", { opacity: 1, stagger: 0.2 })
      .to(".packet-a", { x: 190, y: 100, duration: 1 })
      .to(".packet-b", { x: -180, y: -80, duration: 1 }, "<")
      .to(".network-phase", { opacity: 0, duration: 0.1 })
      .set(".network-phase", { textContent: "COORDINATED EXECUTION" })
      .to(".network-phase", { opacity: 1, duration: 0.1 });

    const track = document.querySelector(".tools-track");
    gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth + 120),
      ease: "none",
      scrollTrigger: {
        trigger: ".tools-story",
        start: "top top",
        end: "bottom bottom",
        pin: ".tools-intro",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  }

  gsap.from(".window", {
    opacity: 0,
    z: -300,
    rotateY: 20,
    stagger: 0.2,
    scrollTrigger: {
      trigger: ".computer-scene",
      start: "top 75%",
      end: "center 45%",
      scrub: 1,
    },
  });
  gsap.to(".scene-core", {
    x: 120,
    y: 80,
    rotate: 135,
    scrollTrigger: {
      trigger: ".computer-story",
      start: "30% center",
      end: "80% center",
      scrub: 1,
    },
  });
  gsap.utils.toArray(".memory-visual li").forEach((item, index) => {
    gsap.from(item, {
      opacity: 0.15,
      x: 80,
      scrollTrigger: {
        trigger: item,
        start: "top 75%",
        end: "top 50%",
        scrub: true,
      },
      delay: index * 0.05,
    });
  });
  gsap.to(".wave i", {
    scaleY: () => gsap.utils.random(1.5, 5),
    duration: 0.55,
    repeat: -1,
    yoyo: true,
    stagger: { each: 0.06, from: "center" },
    ease: "sine.inOut",
  });
  gsap.from(".architecture-map li", {
    opacity: 0,
    z: -180,
    y: 45,
    stagger: 0.15,
    scrollTrigger: {
      trigger: ".architecture-map",
      start: "top 75%",
      end: "center 45%",
      scrub: 1,
    },
  });
  gsap.from(".trust-boundary", {
    scale: 0.82,
    opacity: 0,
    scrollTrigger: {
      trigger: ".architecture-map",
      start: "top 60%",
      end: "center 40%",
      scrub: 1,
    },
  });
  gsap.utils
    .toArray(".permission-illustration, .architecture-illustration")
    .forEach((item) => {
      gsap.from(item, {
        opacity: 0,
        y: 36,
        scale: 0.96,
        scrollTrigger: {
          trigger: item,
          start: "top 82%",
        },
      });
    });
  gsap.from(".product-shell", {
    scale: 0.9,
    rotateX: 8,
    transformOrigin: "center top",
    scrollTrigger: {
      trigger: ".product-moment",
      start: "top bottom",
      end: "35% center",
      scrub: 1,
    },
  });
  gsap.from(".final-cta .cta-mascot", {
    opacity: 0,
    scale: 1.18,
    rotateY: 14,
    scrollTrigger: {
      trigger: ".final-cta",
      start: "top bottom",
      end: "center center",
      scrub: 1,
    },
  });
  initMagnetic();
}

initFallbackInteractions();
window.addEventListener("load", initGsap);
