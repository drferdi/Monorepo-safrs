/** Sentra-GSAP Standard v1.0.0 repository configuration. */
export default {
  // Keep only paths that contain frontend/GSAP source in this repository.
  scanPaths: ['apps', 'packages', 'src'],

  // Strict by default. Disable a required gate only with explicit human approval.
  requiredGates: {
    staticAudit: true,
    typecheck: true,
    lint: true,
    test: true,
    build: true,
    browser: true,
    visualReview: true,
    independentVisualReview: true,
  },

  // "auto" resolves common package.json script names. Set an explicit command when the repo differs.
  commands: {
    typecheck: 'auto',
    lint: 'auto',
    test: 'auto',
    build: 'auto',
  },

  browser: {
    url: process.env.SENTRA_GSAP_URL || null,
    routes: ['/'],
    // Multi-route/page-transition sites MUST add at least one round-trip journey.
    journeys: [],
  },
};
