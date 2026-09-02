/**
 * Mascot motion for the static pages (tentang / privasi / ketentuan), which
 * do not load the React hooks. Same data-state contract and CSS as the app
 * (see src/hooks/useMascot.js and polish.css):
 *
 *   [data-mascot-scene]  wrapper that walks in once it scrolls into view
 *   .sb-mascot           the figure; data-state drives the CSS
 *
 * Choreography: walk in from the left (bob), settle, greet once, then idle
 * with breathing, randomised blinks, pointer-following pupils, and a small
 * gesture every nine seconds. Reduced-motion shows the settled figure only.
 */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const ONE_SHOT = new Set(["greet", "celebrate"]);
  const WALK_MS = 950;
  const GESTURE_MS = 9000;

  const scenes = Array.from(document.querySelectorAll("[data-mascot-scene]"));
  if (scenes.length === 0) return;

  const mascots = [];

  for (const scene of scenes) {
    const mascot = scene.querySelector(".sb-mascot");
    if (!mascot) continue;
    mascot.classList.remove("sb-mascot--auto");
    mascots.push(mascot);

    const set = (state) => {
      if (ONE_SHOT.has(state)) {
        if (reduce) return;
        mascot.dataset.state = "";
        void mascot.offsetWidth;
      }
      mascot.dataset.state = state;
    };
    mascot.addEventListener("animationend", (event) => {
      if (event.target === mascot && ONE_SHOT.has(mascot.dataset.state)) set("idle");
    });

    const enter = () => {
      scene.setAttribute("data-in", "");
      if (reduce) {
        set("idle");
        return;
      }
      set("walk");
      window.setTimeout(() => set("greet"), WALK_MS);
      window.setInterval(() => {
        if (document.hidden || mascot.dataset.state !== "idle") return;
        set(Math.random() < 0.7 ? "greet" : "celebrate");
      }, GESTURE_MS);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        enter();
      },
      { threshold: 0.5 },
    );
    io.observe(scene);

    if (!reduce) {
      const blink = () => {
        window.setTimeout(() => {
          if (!document.hidden && mascot.dataset.state !== "sleep") {
            mascot.setAttribute("data-blink", "");
            window.setTimeout(() => mascot.removeAttribute("data-blink"), 120);
          }
          blink();
        }, 4000 + Math.random() * 3000);
      };
      blink();
    }
  }

  if (reduce || !canHover || mascots.length === 0) return;

  let frame = 0;
  let pointer = null;
  const gaze = () => {
    frame = 0;
    for (const mascot of mascots) {
      const r = mascot.getBoundingClientRect();
      const gx = (pointer.x - (r.left + r.width / 2)) / 220;
      const gy = (pointer.y - (r.top + r.height / 2)) / 220;
      mascot.style.setProperty("--gx", Math.max(-1, Math.min(1, gx)).toFixed(2));
      mascot.style.setProperty("--gy", Math.max(-1, Math.min(1, gy)).toFixed(2));
    }
  };
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = window.requestAnimationFrame(gaze);
    },
    { passive: true },
  );
})();
