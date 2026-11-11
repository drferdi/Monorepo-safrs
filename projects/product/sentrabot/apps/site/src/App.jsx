import { useRef } from "react";
import { useBriefSequence } from "./hooks/useBriefSequence.js";
import { useDemoSequence } from "./hooks/useDemoSequence.js";
import { useFaqAccordion } from "./hooks/useFaqAccordion.js";
import { useHeaderState } from "./hooks/useHeaderState.js";
import { useMascot } from "./hooks/useMascot.js";
import { useMascotScenes } from "./hooks/useMascotScenes.js";
import { usePricingTabs } from "./hooks/usePricingTabs.js";
import briefHtml from "./html/Brief.html?raw";
import demoDesktopHtml from "./html/DemoDesktop.html?raw";
import demoMobileHtml from "./html/DemoMobile.html?raw";
import faqHtml from "./html/Faq.html?raw";
import featuresHtml from "./html/Features.html?raw";
import footerHtml from "./html/Footer.html?raw";
import headerHtml from "./html/Header.html?raw";
import heroHtml from "./html/Hero.html?raw";
import mainPreambleHtml from "./html/MainPreamble.html?raw";
import mainTailHtml from "./html/MainTail.html?raw";
import postMainHtml from "./html/PostMain.html?raw";
import preHeaderHtml from "./html/PreHeader.html?raw";
import pricingHtml from "./html/Pricing.html?raw";
import privacyHtml from "./html/Privacy.html?raw";
import testimonialsHtml from "./html/Testimonials.html?raw";

/**
 * Compose exact original body markup in section order.
 * Single innerHTML parse keeps wrapper tags balanced (PreHeader/PostMain).
 */
const PAGE_HTML = [
  preHeaderHtml,
  headerHtml,
  '<main class="relative flex flex-col grow">',
  mainPreambleHtml,
  heroHtml,
  testimonialsHtml,
  demoDesktopHtml,
  demoMobileHtml,
  briefHtml,
  featuresHtml,
  privacyHtml,
  pricingHtml,
  faqHtml,
  footerHtml,
  mainTailHtml,
  "</main>",
  postMainHtml,
].join("");

export function App() {
  const pageRef = useRef(null);
  useFaqAccordion(pageRef);
  usePricingTabs(pageRef);
  useDemoSequence(pageRef);
  useBriefSequence(pageRef);
  useHeaderState(pageRef);
  useMascot(pageRef);
  useMascotScenes(pageRef);

  return (
    <div
      ref={pageRef}
      style={{ display: "contents" }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: PAGE_HTML is assembled at build time from static src/html/*.html modules (verbatim Webflow markup); no user input reaches it, so there is no XSS path.
      dangerouslySetInnerHTML={{ __html: PAGE_HTML }}
    />
  );
}

/** Section markup modules live in `src/html/*.html` (verbatim from original). */
