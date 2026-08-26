function finding(ruleId, severity, file, message, evidence = '') {
  return { ruleId, severity, file, message, evidence: evidence.slice(0, 240) };
}

const codeExtensions = /\.(?:[cm]?[jt]sx?|vue|svelte|css|scss|sass|less|md|npmrc)$/i;

export function auditTextFiles(files) {
  const relevant = files.filter(f => codeExtensions.test(f.path) || f.path.endsWith('.npmrc'));
  const findings = [];
  const all = relevant.map(f => f.text).join('\n');

  for (const { path, text } of relevant) {
    if (/ScrollTrigger\.matchMedia\s*\(/.test(text)) {
      findings.push(finding('deprecated-scrolltrigger-matchmedia', 'error', path,
        'Use gsap.matchMedia(); ScrollTrigger.matchMedia() is deprecated.', 'ScrollTrigger.matchMedia(...)'));
    }
    if (/npm\.greensock\.com|registry\.greensock\.com/i.test(text)) {
      findings.push(finding('legacy-private-gsap-registry', 'error', path,
        'GSAP 3.13+ uses public npm; remove legacy private GreenSock registry configuration.'));
    }
    if (/markers\s*:\s*true\b/.test(text) && !/(test|spec|fixture|example)/i.test(path)) {
      findings.push(finding('production-markers', 'error', path,
        'ScrollTrigger markers:true must not ship in production source.'));
    }
    if (/\buse(?:Layout)?Effect\s*\([\s\S]{0,2500}?\bgsap\./m.test(text) && !/\buseGSAP\s*\(/.test(text)) {
      findings.push(finding('react-raw-effect-gsap', 'error', path,
        'React/Next GSAP work must use @gsap/react useGSAP() with owned cleanup/scoping.'));
    }
    if (/\buseGSAP\s*\(/.test(text) && /gsap\.(?:to|from|fromTo|set)\s*\(\s*['"][.#\[]/.test(text) && !/\bscope\s*:/.test(text)) {
      findings.push(finding('unscoped-react-selector', 'error', path,
        'String selectors inside useGSAP() require scope to prevent cross-component selection.'));
    }
    if (/gsap\.ticker\.add\s*\(/.test(text) && !/gsap\.ticker\.remove\s*\(/.test(text)) {
      findings.push(finding('ticker-add-without-remove', 'error', path,
        'Every gsap.ticker.add() owner must remove the callback during teardown.'));
    }
    if (/new\s+Lenis\s*\([\s\S]{0,600}?autoRaf\s*:\s*true/.test(text) && /gsap\.ticker\.add\s*\(/.test(text)) {
      findings.push(finding('lenis-double-raf', 'error', path,
        'Do not use Lenis autoRaf:true while also feeding Lenis from gsap.ticker.'));
    }
    if (/transition\s*:\s*all\b/i.test(text)) {
      findings.push(finding('css-transition-all', 'warn', path,
        'transition: all can conflict with GSAP-owned properties; scope transitions to CSS-owned properties.'));
    }
    if (/(?:gsap\.(?:to|from|fromTo)|\.(?:to|from))\s*\([\s\S]{0,1200}?\b(?:top|left|right|bottom|width|height|margin|padding)\s*:/m.test(text)) {
      findings.push(finding('layout-property-animation', 'warn', path,
        'Layout-property animation detected; prefer transforms when the same visual result is possible.'));
    }
    if (/(?:gsap\.(?:to|from|fromTo)|\.(?:to|from))\s*\([\s\S]{0,1200}?\bfilter\s*:/m.test(text)) {
      findings.push(finding('paint-heavy-filter-animation', 'warn', path,
        'Animated CSS filters can be paint-heavy; profile and replace with cheaper techniques when possible.'));
    }
    if (/\*\s*\{[\s\S]{0,500}?will-change\s*:/m.test(text) || /(?:html|body)\s*\{[\s\S]{0,500}?will-change\s*:/mi.test(text)) {
      findings.push(finding('global-will-change', 'error', path,
        'Do not apply will-change globally; reserve compositor layers for actively animating elements.'));
    }
    if (/SplitText\.(?:create|new)|new\s+SplitText/.test(text) && /type\s*:\s*['"][^'"]*lines/i.test(text) && !/autoSplit\s*:\s*true/.test(text)) {
      findings.push(finding('splittext-lines-without-autosplit', 'warn', path,
        'Line-based SplitText should usually use autoSplit/onSplit when responsive line wrapping can change.'));
    }
  }

  const usesSmoothing = /new\s+Lenis\s*\(|ScrollSmoother\.create\s*\(/.test(all);
  const hasReducedMotion = /prefers-reduced-motion|respectReducedMotion|reduceMotion|reducedMotion/.test(all);
  if (usesSmoothing && !hasReducedMotion) {
    findings.push(finding('smooth-scroll-without-reduced-motion', 'error', '(repository)',
      'Smooth scrolling is present but no reduced-motion handling was found. Do not instantiate smoothing when reduced motion is requested.'));
  }

  const importsPlugin = /from\s+['"]gsap\/(?:ScrollTrigger|SplitText|Flip|Draggable|Observer|MotionPathPlugin|MorphSVGPlugin|DrawSVGPlugin|CustomEase|ScrollSmoother)/.test(all);
  if (importsPlugin && !/gsap\.registerPlugin\s*\(/.test(all)) {
    findings.push(finding('plugin-not-registered', 'error', '(repository)',
      'GSAP plugin imports found without gsap.registerPlugin(). Explicit registration is required in build environments.'));
  }

  return dedupe(findings);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.ruleId}|${item.file}|${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
