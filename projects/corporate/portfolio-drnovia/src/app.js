/* NOVIA STUDIO — React 18 runtime shell.
 * The preserved Framer page uses its own 100vh internal scroll container.
 * Lenis owns that nested scroller (.framer-bpy7lj), never window.
 */
(() => {
  const React = window.React;
  const ReactDOM = window.ReactDOM;

  function loadScript(src, id, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (id && document.getElementById(id)) return resolve();
      const script = document.createElement("script");
      if (id) script.id = id;
      script.src = src;
      script.async = true;
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`timeout: ${src}`));
      }, timeoutMs || 3000);
      script.onload = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(new Error(`load failed: ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  function getScroller() {
    return document.querySelector(".framer-bpy7lj");
  }

  function installAnchorNavigation() {
    function handleClick(event) {
      const anchor = event.target.closest?.('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
      if (window.history?.replaceState) {
        window.history.replaceState(null, "", href);
      }
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }

  function installInteractiveCards() {
    const container = document.getElementById("1np9dlm");
    if (!container) return () => {};

    const cards = [
      {
        id: 0,
        name: "Mantra",
        wrapper: document.querySelector(".framer-uxc0rs"),
        inner: document.querySelector(".framer-1upsiy3"),
      },
      {
        id: 1,
        name: "MedLink",
        wrapper: document.querySelector(".framer-kp9014"),
        inner: document.querySelector(".framer-1eyqovy"),
      },
      {
        id: 2,
        name: "SideLab",
        wrapper: document.querySelector(".framer-1wvt0y2"),
        inner: document.querySelector(".framer-12n68jw"),
      },
    ];

    const validCards = cards.filter((c) => c.wrapper && c.inner);
    if (validCards.length < 3) return () => {};

    let activeIndex = 0;

    function renderStack(targetIndex) {
      activeIndex = (targetIndex + validCards.length) % validCards.length;

      validCards.forEach((c, i) => {
        const relPos =
          (i - activeIndex + validCards.length) % validCards.length;
        const w = c.wrapper;
        const inner = c.inner;

        if (relPos === 0) {
          // ACTIVE FRONT CARD
          w.style.zIndex = "10";
          w.style.bottom = "0px";
          w.style.left = "0px";
          w.style.right = "0px";
          w.style.width = "100%";
          w.style.transform = "translateY(0px) scale(1)";
          w.style.filter = "none";
          w.style.opacity = "1";
          w.style.pointerEvents = "auto";
          w.setAttribute("aria-selected", "true");
          w.classList.add("novia-card-active");
          w.classList.remove("novia-card-back-1", "novia-card-back-2");

          inner.style.opacity = "1";
          inner.style.pointerEvents = "auto";
        } else if (relPos === 1) {
          // MIDDLE CARD (BEHIND 1)
          w.style.zIndex = "5";
          w.style.bottom = "12px";
          w.style.left = "8px";
          w.style.right = "8px";
          w.style.width = "calc(100% - 16px)";
          w.style.transform = "translateY(0px) scale(0.97)";
          w.style.filter = "brightness(0.92)";
          w.style.opacity = "1";
          w.style.pointerEvents = "auto";
          w.setAttribute("aria-selected", "false");
          w.classList.add("novia-card-back-1");
          w.classList.remove("novia-card-active", "novia-card-back-2");

          inner.style.opacity = "0";
          inner.style.pointerEvents = "none";
        } else {
          // BACK CARD (BEHIND 2)
          w.style.zIndex = "2";
          w.style.bottom = "24px";
          w.style.left = "16px";
          w.style.right = "15px";
          w.style.width = "calc(100% - 31px)";
          w.style.transform = "translateY(0px) scale(0.94)";
          w.style.filter = "brightness(0.85)";
          w.style.opacity = "1";
          w.style.pointerEvents = "auto";
          w.setAttribute("aria-selected", "false");
          w.classList.add("novia-card-back-2");
          w.classList.remove("novia-card-active", "novia-card-back-1");

          inner.style.opacity = "0";
          inner.style.pointerEvents = "none";
        }
      });
    }

    renderStack(0);

    const listeners = [];

    validCards.forEach((c, index) => {
      const clickHandler = (e) => {
        // If clicking "Lihat Proyek" link/row, scroll to #project
        if (
          e.target.closest?.('[data-framer-name="Row 2"]') ||
          e.target.closest?.(".framer-1nhr0z3") ||
          e.target.closest?.(".framer-1ejefme") ||
          e.target.closest?.(".framer-1kv3t0f")
        ) {
          e.preventDefault();
          e.stopPropagation();
          const proj = document.querySelector("#project");
          if (proj) {
            proj.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (activeIndex === index) {
          // Click on active card cycles to next card
          renderStack(activeIndex + 1);
        } else {
          // Click on background card tab switches directly to it
          renderStack(index);
        }
      };

      const keyHandler = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          renderStack(activeIndex + 1);
        }
      };

      c.wrapper.addEventListener("click", clickHandler);
      c.wrapper.addEventListener("keydown", keyHandler);
      listeners.push({ element: c.wrapper, clickHandler, keyHandler });
    });

    return () => {
      listeners.forEach(({ element, clickHandler, keyHandler }) => {
        element.removeEventListener("click", clickHandler);
        element.removeEventListener("keydown", keyHandler);
      });
    };
  }

  function installCtaButtons() {
    const ctas = document.querySelectorAll(
      '.framer-IEAQE, .framer-1rmmc8, [data-framer-name*="Desktop: Bottom"]',
    );
    const handler = (e) => {
      const href = e.currentTarget.getAttribute("href");
      if (!href || href === "#" || href.startsWith("#")) {
        e.preventDefault();
        const footer = document.querySelector("#footer");
        if (footer) {
          const reduce = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          footer.scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "start",
          });
        }
      }
    };

    ctas.forEach((cta) => {
      cta.addEventListener("click", handler);
    });

    return () => {
      ctas.forEach((cta) => {
        cta.removeEventListener("click", handler);
      });
    };
  }

  function installFloatingDock() {
    const dockContainer = document.querySelector(".framer-1dh82ue");
    if (!dockContainer) return () => {};

    const items = Array.from(dockContainer.querySelectorAll(".framer-6f740l"));
    if (!items.length) return () => {};

    let toastTimer = null;
    let toastEl = document.querySelector(".novia-dock-toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "novia-dock-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }

    function showToast(message) {
      if (!toastEl) return;
      toastEl.innerHTML = message;
      toastEl.classList.add("active");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.classList.remove("active");
      }, 3200);
    }

    // Interactive macOS Fisheye Magnification
    function handleMouseMove(e) {
      const mouseX = e.clientX;
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const dist = Math.abs(mouseX - itemCenterX);
        const maxDist = 120;

        if (dist < maxDist) {
          const factor = 1 - dist / maxDist;
          const scale = 1 + factor * 0.28;
          const translateY = -factor * 10;
          item.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`;
          item.style.zIndex = "10";
        } else {
          item.style.transform = "";
          item.style.zIndex = "";
        }
      });
    }

    function handleMouseLeave() {
      items.forEach((item) => {
        item.style.transform = "";
        item.style.zIndex = "";
      });
    }

    // Click handler with bounce animation and email copy action
    const clickListeners = [];
    items.forEach((item) => {
      const clickHandler = () => {
        item.classList.remove("novia-dock-bouncing");
        void item.offsetWidth;
        item.classList.add("novia-dock-bouncing");
        setTimeout(() => {
          item.classList.remove("novia-dock-bouncing");
        }, 700);

        const email = item.getAttribute("data-email");
        if (email || item.classList.contains("novia-dock-mail-btn")) {
          const emailAddr = email || "noviaanggraini054@gmail.com";
          if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
          ) {
            navigator.clipboard.writeText(emailAddr).catch(() => {});
          }
          showToast(
            `✉️ <b>${emailAddr}</b> tersalin ke clipboard! Membuka email...`,
          );
        }
      };

      item.addEventListener("click", clickHandler);
      clickListeners.push({ item, clickHandler });
    });

    dockContainer.addEventListener("mousemove", handleMouseMove, {
      passive: true,
    });
    dockContainer.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      dockContainer.removeEventListener("mousemove", handleMouseMove);
      dockContainer.removeEventListener("mouseleave", handleMouseLeave);
      clickListeners.forEach(({ item, clickHandler }) => {
        item.removeEventListener("click", clickHandler);
      });
      if (toastTimer) clearTimeout(toastTimer);
      if (toastEl?.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    };
  }

  function installMacTerminal() {
    const linesContainer = document.getElementById("novia-terminal-lines");
    const terminalEl = document.getElementById("novia-mac-terminal");
    const bodyEl = document.getElementById("novia-terminal-body");
    if (!linesContainer || !terminalEl) return () => {};

    let isRunning = true;
    let currentTimer = null;
    let isPaused = false;

    const command = "sentra-stack run --pipeline=multistack-agent --env=prod";

    const steps = [
      {
        html: '<span class="term-time">[22:52:01]</span> <span class="term-tag term-tag-sys">[SAFRS/Core]</span> <span class="term-info">Initializing multi-stack agent runtime (v2.4.0)...</span>',
        delay: 380,
      },
      {
        html: '<span class="term-time">[22:52:02]</span> <span class="term-tag term-tag-vision">[Agent/Vision]</span> <span class="term-info">Verifying layout contracts & design tokens...</span> <span class="term-success">PASS</span>',
        delay: 420,
      },
      {
        html: '<span class="term-time">[22:52:03]</span> <span class="term-tag term-tag-neural">[Agent/Neural]</span> <span class="term-info">Loading domain graph embeddings & memory...</span> <span class="term-success">OK (4.2ms)</span>',
        delay: 440,
      },
      {
        html: '<span class="term-time">[22:52:04]</span> <span class="term-tag term-tag-arch">[Agent/Architect]</span> <span class="term-info">Spawning reactive workers & edge pipeline...</span> <span class="term-success">DEPLOYED</span>',
        delay: 400,
      },
      {
        html: '<span class="term-time">[22:52:05]</span> <span class="term-tag term-tag-qa">[Agent/Auditor]</span> <span class="term-info">Auditing 32 capsule security boundaries...</span> <span class="term-success">32/32 PASS</span>',
        delay: 380,
      },
      {
        html: '<span class="term-time">[22:52:06]</span> <span class="term-tag term-tag-success">[SUCCESS]</span> <span class="term-ready">All 4 agents synchronized. Pipeline active (zero-latency).</span>',
        delay: 500,
      },
    ];

    function schedule(fn, ms) {
      if (!isRunning) return;
      currentTimer = setTimeout(() => {
        if (!isRunning) return;
        if (isPaused) {
          schedule(fn, 200);
          return;
        }
        fn();
      }, ms);
    }

    function scrollToBottom() {
      if (bodyEl) {
        bodyEl.scrollTop = bodyEl.scrollHeight;
      }
    }

    function runScenario() {
      if (!isRunning) return;
      linesContainer.innerHTML = "";

      const promptLine = document.createElement("div");
      promptLine.className = "novia-term-prompt-line";
      promptLine.innerHTML =
        '<span class="term-prompt-user">novia@Novia-MBP</span> <span class="term-prompt-path">~/sentra</span> <span class="term-prompt-symbol">%</span> <span class="term-cmd"></span><span class="novia-term-cursor"></span>';
      linesContainer.appendChild(promptLine);
      const cmdSpan = promptLine.querySelector(".term-cmd");
      const cursorSpan = promptLine.querySelector(".novia-term-cursor");

      let charIdx = 0;
      function typeChar() {
        if (!isRunning) return;
        if (charIdx < command.length) {
          if (cmdSpan) cmdSpan.textContent += command[charIdx];
          charIdx++;
          scrollToBottom();
          schedule(typeChar, Math.floor(Math.random() * 20) + 26);
        } else {
          if (cursorSpan) cursorSpan.remove();
          schedule(() => playSteps(0), 260);
        }
      }

      function playSteps(stepIdx) {
        if (!isRunning) return;
        if (stepIdx < steps.length) {
          const step = steps[stepIdx];
          const line = document.createElement("div");
          line.className = "novia-term-line";
          line.innerHTML = step.html;
          linesContainer.appendChild(line);
          scrollToBottom();
          schedule(() => playSteps(stepIdx + 1), step.delay);
        } else {
          const trailLine = document.createElement("div");
          trailLine.className = "novia-term-prompt-line";
          trailLine.innerHTML =
            '<span class="term-prompt-user">novia@Novia-MBP</span> <span class="term-prompt-path">~/sentra</span> <span class="term-prompt-symbol">%</span> <span class="novia-term-cursor"></span>';
          linesContainer.appendChild(trailLine);
          scrollToBottom();

          schedule(() => {
            runScenario();
          }, 8000);
        }
      }

      schedule(typeChar, 350);
    }

    runScenario();

    const handleMouseEnter = () => {
      isPaused = true;
    };
    const handleMouseLeave = () => {
      isPaused = false;
    };
    const handleClick = () => {
      if (currentTimer) clearTimeout(currentTimer);
      isPaused = false;
      runScenario();
    };

    terminalEl.addEventListener("mouseenter", handleMouseEnter);
    terminalEl.addEventListener("mouseleave", handleMouseLeave);
    terminalEl.addEventListener("click", handleClick);

    return () => {
      isRunning = false;
      if (currentTimer) clearTimeout(currentTimer);
      terminalEl.removeEventListener("mouseenter", handleMouseEnter);
      terminalEl.removeEventListener("mouseleave", handleMouseLeave);
      terminalEl.removeEventListener("click", handleClick);
    };
  }

  function installEyeFollower() {
    const eyeSvg = document.querySelector(".framer-1xhn0ls-container svg");
    if (!eyeSvg) return () => {};
    const pupils = eyeSvg.querySelectorAll("circle");
    if (pupils.length < 4) return () => {};
    const leftPupil = pupils[2];
    const rightPupil = pupils[3];
    const baseLeft = { cx: 12.28, cy: 13.82 };
    const baseRight = { cx: 48.4, cy: 14.12 };

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = null;

    function handleMouseMove(e) {
      const rect = eyeSvg.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      targetX = Math.max(-1, Math.min(1, dx)) * 4.5;
      targetY = Math.max(-1, Math.min(1, dy)) * 3.5;
    }

    function animate() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      leftPupil.setAttribute("cx", String(baseLeft.cx + currentX));
      leftPupil.setAttribute("cy", String(baseLeft.cy + currentY));
      rightPupil.setAttribute("cx", String(baseRight.cx + currentX));
      rightPupil.setAttribute("cy", String(baseRight.cy + currentY));

      rafId = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }

  function initLenis() {
    const LenisCtor = window.Lenis;
    const wrapper = getScroller();
    if (typeof LenisCtor !== "function" || !wrapper) return null;
    const content = wrapper.firstElementChild;
    if (!content) return null;

    const lenis = new LenisCtor({
      wrapper: wrapper,
      content: content,
      eventsTarget: wrapper,
      autoRaf: true,
      anchors: { offset: 24, duration: 0.8 },
      naiveDimensions: true,
      stopInertiaOnNavigate: true,
      lerp: 0.12,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.2,
      syncTouch: false,
      respectReducedMotion: true,
      overscroll: true,
      smoothWheel: true,
    });

    document.documentElement.classList.add("novia-lenis-ready");

    return () => {
      if (lenis && typeof lenis.destroy === "function") lenis.destroy();
      document.documentElement.classList.remove("novia-lenis-ready");
    };
  }

  function installHeroVideo() {
    const video = document.querySelector(".novia-hero-bg-video");
    if (!video) return () => {};
    video.muted = true;
    video.playsInline = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        /* Autoplay policy fallback: video poster remains visible */
      });
    }
    return () => {};
  }

  function initMotion() {
    const cleanupFns = [];
    const lenisCleanup = initLenis();
    if (lenisCleanup) {
      cleanupFns.push(lenisCleanup);
    } else {
      cleanupFns.push(installAnchorNavigation());
    }

    // Install hero video, dock, terminal & tactile handlers
    cleanupFns.push(installHeroVideo());
    cleanupFns.push(installInteractiveCards());
    cleanupFns.push(installFloatingDock());
    cleanupFns.push(installMacTerminal());
    cleanupFns.push(installCtaButtons());

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      return () => {
        cleanupFns.forEach((fn) => {
          fn();
        });
      };
    }

    const eyeCleanup = installEyeFollower();
    if (eyeCleanup) cleanupFns.push(eyeCleanup);

    let disposed = false;
    let gsapContext = null;

    /* GSAP is visual-only. It does not register ScrollTrigger, wheel handlers,
       RAF-based smooth scrolling, or preventDefault on pointer/wheel events. */
    loadScript(
      "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
      "novia-gsap",
      2500,
    )
      .then(() => {
        if (disposed || !window.gsap) return;
        try {
          const gsap = window.gsap;
          const scroller = getScroller();
          let observer = null;

          gsapContext = gsap.context(() => {
            document.documentElement.classList.add("novia-motion-ready");
            const cards = Array.from(
              document.querySelectorAll('[data-framer-name="Project"]'),
            );

            if ("IntersectionObserver" in window && cards.length) {
              observer = new IntersectionObserver(
                (entries, io) => {
                  entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const target = entry.target;

                    if (target.classList.contains("novia-editorial-row")) {
                      const fromSide = target.classList.contains(
                        "novia-editorial-row-reverse",
                      )
                        ? 36
                        : -36;
                      const media = target.querySelector(
                        ".novia-editorial-media",
                      );
                      const copyItems = target.querySelectorAll(
                        ".novia-editorial-copy > *",
                      );

                      if (media) {
                        gsap.fromTo(
                          media,
                          { x: fromSide, opacity: 0 },
                          {
                            x: 0,
                            opacity: 1,
                            duration: 0.9,
                            ease: "power3.out",
                            clearProps: "transform,opacity",
                          },
                        );
                      }
                      if (copyItems.length) {
                        gsap.fromTo(
                          copyItems,
                          { y: 18, opacity: 0 },
                          {
                            y: 0,
                            opacity: 1,
                            duration: 0.6,
                            ease: "power2.out",
                            stagger: 0.08,
                            delay: 0.15,
                            clearProps: "transform,opacity",
                          },
                        );
                      }
                    } else {
                      gsap.fromTo(
                        target,
                        { y: 14, opacity: 0.97 },
                        {
                          y: 0,
                          opacity: 1,
                          duration: 0.6,
                          ease: "power2.out",
                          clearProps: "transform,opacity",
                        },
                      );
                    }

                    io.unobserve(target);
                  });
                },
                {
                  root: scroller || null,
                  rootMargin: "0px 0px -5% 0px",
                  threshold: 0.06,
                },
              );
              cards.forEach((card) => {
                observer.observe(card);
              });
              cleanupFns.push(() => {
                if (observer) observer.disconnect();
              });
            }
          }, document.getElementById("main"));
        } catch (err) {
          console.warn(
            "NOVIA STUDIO: visual motion enhancement unavailable.",
            err,
          );
        }
      })
      .catch(() => {
        /* Offline/CDN failure is intentionally silent: the site remains fully functional. */
      });

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => {
        fn();
      });
      if (gsapContext && typeof gsapContext.revert === "function")
        gsapContext.revert();
      document.documentElement.classList.remove("novia-motion-ready");
    };
  }

  function App() {
    React.useEffect(() => {
      document.documentElement.lang = "id";
      document.title =
        "Novia Studio — Arsitektur Kecerdasan Buatan & Desain Digital";
      return initMotion();
    }, []);

    return React.createElement("div", {
      id: "main",
      dangerouslySetInnerHTML: { __html: window.NOVIA_PORTFOLIO_MARKUP || "" },
    });
  }

  const rootNode = document.getElementById("root");
  if (!rootNode || !React || !ReactDOM) {
    throw new Error("NOVIA STUDIO: React runtime could not start.");
  }
  ReactDOM.createRoot(rootNode).render(React.createElement(App));
})();
