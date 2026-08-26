import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTextFiles } from '../../scripts/sentra-gsap/lib/rules.mjs';

function audit(files) {
  return auditTextFiles(files.map(([path, text]) => ({ path, text })));
}

test('flags deprecated and production-dangerous GSAP patterns', () => {
  const findings = audit([
    ['src/a.ts', 'ScrollTrigger.matchMedia({}); const x={scrollTrigger:{markers:true}};'],
    ['.npmrc', 'registry=https://npm.greensock.com'],
  ]);
  const ids = findings.filter(f => f.severity === 'error').map(f => f.ruleId);
  assert.ok(ids.includes('deprecated-scrolltrigger-matchmedia'));
  assert.ok(ids.includes('production-markers'));
  assert.ok(ids.includes('legacy-private-gsap-registry'));
});

test('flags raw React effect ownership and unsafe ticker lifecycle', () => {
  const findings = audit([
    ['src/Hero.tsx', `import {useEffect} from 'react'; import gsap from 'gsap';\nuseEffect(()=>{ gsap.to('.x',{x:10}) },[])`],
    ['src/lenis.ts', `gsap.ticker.add(update); const lenis = new Lenis({autoRaf:true});`],
  ]);
  const ids = findings.filter(f => f.severity === 'error').map(f => f.ruleId);
  assert.ok(ids.includes('react-raw-effect-gsap'));
  assert.ok(ids.includes('ticker-add-without-remove'));
  assert.ok(ids.includes('lenis-double-raf'));
});

test('accepts scoped useGSAP and explicit ticker cleanup', () => {
  const findings = audit([
    ['src/Hero.tsx', `import {useGSAP} from '@gsap/react'; useGSAP(()=>{gsap.to('.x',{x:10})},{scope:root});`],
    ['src/scroll.ts', `gsap.ticker.add(update); gsap.ticker.remove(update);`],
  ]);
  assert.equal(findings.filter(f => f.severity === 'error').length, 0);
});

test('requires reduced-motion evidence when smooth scrolling is present', () => {
  const findings = audit([['src/scroll.ts', `const lenis = new Lenis(); lenis.on('scroll', ScrollTrigger.update);`]]);
  assert.ok(findings.some(f => f.ruleId === 'smooth-scroll-without-reduced-motion' && f.severity === 'error'));
});
