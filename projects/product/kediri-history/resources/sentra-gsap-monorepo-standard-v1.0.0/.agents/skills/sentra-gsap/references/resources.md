# GSAP Resource Stack

Curated and link-verified during research on 2026-08-25. Official GSAP documentation is the authority for API behavior. Community/tutorial material is inspiration or implementation guidance, not API truth.

## Official GSAP — Bookmark First

| Resource | URL | Use |
|---|---|---|
| GSAP Docs | https://gsap.com/docs/v3/ | Core API, plugins, utilities |
| Installation | https://gsap.com/docs/v3/Installation/ | npm/CDN, plugin registration, current 3.13+ distribution |
| Plugins overview | https://gsap.com/docs/v3/Plugins/ | Decide which capability is actually needed |
| ScrollTrigger | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | Scroll architecture |
| ScrollTrigger mistakes | https://gsap.com/resources/st-mistakes/ | Failure diagnosis and architecture pitfalls |
| `gsap.matchMedia()` | https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/ | Responsive/reduced-motion lifecycle |
| SplitText | https://gsap.com/docs/v3/Plugins/SplitText/ | Responsive splitting, masking, ARIA |
| ScrollSmoother | https://gsap.com/docs/v3/Plugins/ScrollSmoother/ | Native-scroll-based smoothing |
| CSS/Transforms | https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/ | Transform aliases and rendering behavior |
| GSAP demos | https://gsap.com/demos/ | Official implementation examples |
| GSAP Learn | https://gsap.com/learn/ | Structured learning |
| GSAP Community | https://gsap.com/community/ | Edge cases; always reproduce with minimal demo |
| GreenSock CodePen | https://codepen.io/GreenSock | Isolated prototypes/patterns |
| GSAP GitHub | https://github.com/greensock/GSAP | Source, releases, types |
| `@gsap/react` | https://github.com/greensock/react | React lifecycle, `useGSAP`, `contextSafe` |
| Official GSAP skills | https://github.com/greensock/gsap-skills | Agent-oriented GSAP reference patterns |

### Current distribution note
GSAP's installation docs state that the legacy private npm repository is no longer maintained and all plugins are available directly from npm for GSAP 3.13+. Do not create new `npm.greensock.com` configuration.

## Smooth Scrolling

| Resource | URL | Use |
|---|---|---|
| Lenis repository/docs | https://github.com/darkroomengineering/lenis | Current integration and limitations |

Current Lenis documentation shows the GSAP integration as: `lenis.on('scroll', ScrollTrigger.update)`, feed `lenis.raf(time * 1000)` from `gsap.ticker`, and `gsap.ticker.lagSmoothing(0)`. Verify version-specific options before copying older tutorials.

## Performance & Accessibility

| Resource | URL | Use |
|---|---|---|
| Chrome DevTools Performance | https://developer.chrome.com/docs/devtools/performance/ | Frames, long tasks, layout, paint, CPU profiling |
| web.dev animation guidance | https://web.dev/articles/animations-guide | Browser animation performance concepts |
| MDN `prefers-reduced-motion` | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | Accessibility semantics |
| WebPageTest | https://www.webpagetest.org/ | Network/device performance validation |

## Asset Preparation

| Tool | URL | Best use | Access |
|---|---|---|---|
| SVGOMG | https://svgomg.net/ | Optimize SVG before DrawSVG/MorphSVG | Free |
| SVG Path Editor | https://yqnn.github.io/svg-path-editor/ | Inspect/edit motion paths | Free |
| Clippy | https://bennettfeely.com/clippy/ | Prototype clip-path reveal geometry | Free |
| Squoosh | https://squoosh.app/ | Compress/convert images locally | Free |
| Polypane | https://polypane.app/ | Multi-viewport responsive QA | Paid/trial |

## Advanced Learning

| Resource | URL | Level | Note |
|---|---|---|---|
| Creative Coding Club | https://www.creativecodingclub.com/ | Intermediate–advanced | Strong GSAP-focused sequencing/creative coding material |
| Codrops | https://tympanus.net/codrops/ | Intermediate–advanced | Excellent creative-tech inspiration; verify APIs against official docs |

## Research Rules for Future Agents

1. For API behavior, cite official GSAP docs first.
2. Reject tutorials using deprecated `ScrollTrigger.matchMedia()` when `gsap.matchMedia()` is appropriate.
3. Reject new-project instructions requiring private Club GSAP npm access; 3.13+ public npm changed this.
4. Verify framework/plugin versions before copying integration snippets.
5. Label a showcase/reference site as “GSAP verified” only when credible evidence exists; otherwise call it motion/design inspiration.
6. Prefer a minimal CodePen reproduction when diagnosing ScrollTrigger behavior.
7. Treat old smooth-scroll integration articles cautiously; compare them with the current library README.

## Agent-standard references (verified 2026-08-25)

- Agent Skills specification: https://agentskills.io/specification
- OpenAI Codex: AGENTS.md is aggregated as repository user instructions: https://openai.com/index/unrolling-the-codex-agent-loop/
- OpenAI Codex skills overview: https://openai.com/index/introducing-the-codex-app/
- Claude Agent Skills overview: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Claude Code skills/commands current guidance: https://support.claude.com/en/articles/14553413-claude-code-cheatsheet
- Official GreenSock agent skills: https://github.com/greensock/gsap-skills
