/** Mirrors original RealViewport CSS custom properties. */
export function initViewportVars() {
  const root = document.documentElement;

  const update = () => {
    const width = window.innerWidth;
    const vv = window.visualViewport;
    const height = vv?.height ?? window.innerHeight;
    root.style.setProperty("--vw", `${width / 100}px`);
    root.style.setProperty("--dvh", `${height / 100}px`);
    root.style.setProperty("--svh", `${window.innerHeight / 100}px`);
    root.style.setProperty("--lvh", "1vh");
    root.style.setProperty(
      "--scrollbar-width",
      `${window.innerWidth - document.documentElement.clientWidth}px`,
    );
  };

  update();
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
}
