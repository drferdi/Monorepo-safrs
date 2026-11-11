import { useEffect } from "react";

/**
 * Pricing yearly/monthly toggle — four Rupiah tiers.
 *
 * Monthly figures are the ones Sentra publishes. Yearly figures are the monthly
 * price less the 20% the tab itself advertises ("Tahunan (hemat 20%)"), rounded
 * to the nearest thousand, with the annual total spelled out so the discount is
 * checkable rather than merely claimed.
 */
const PLANS = [
  {
    yearly: { price: "Rp0", note: "Selamanya gratis" },
    monthly: { price: "Rp0", note: "Selamanya gratis" },
  },
  {
    yearly: { price: "Rp63.000", note: "per bulan · ditagih Rp756.000/tahun" },
    monthly: { price: "Rp79.000", note: "per bulan" },
  },
  {
    yearly: { price: "Rp159.000", note: "per bulan · ditagih Rp1.908.000/tahun" },
    monthly: { price: "Rp199.000", note: "per bulan" },
  },
  {
    yearly: { price: "Rp399.000", note: "per bulan · ditagih Rp4.788.000/tahun" },
    monthly: { price: "Rp499.000", note: "per bulan" },
  },
];

export function usePricingTabs(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const tabs = root.querySelector(".pricing-module__NXQy5G__tabs");
    if (!tabs) return undefined;

    const pill = tabs.querySelector("span.absolute");
    const buttons = [...tabs.querySelectorAll("button")];
    const cards = [...root.querySelectorAll(".pricing-module__NXQy5G__card__wrapper > div")];

    let isYearly = true;

    const apply = () => {
      buttons.forEach((btn, index) => {
        const active = isYearly ? index === 0 : index === 1;
        btn.classList.toggle("text-black", active);
        btn.classList.toggle("text-white", !active);
        btn.classList.toggle("hover:text-black", !active);
      });

      if (pill && buttons[0] && buttons[1]) {
        const activeBtn = isYearly ? buttons[0] : buttons[1];
        const tabsRect = tabs.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        pill.style.left = `${btnRect.left - tabsRect.left}px`;
        pill.style.width = `${btnRect.width}px`;
      }

      cards.forEach((card, index) => {
        const plan = PLANS[index];
        if (!plan) return;
        const data = isYearly ? plan.yearly : plan.monthly;
        const priceEl = card.querySelector(".dr-h-68 > .h3");
        const noteEl = card.querySelector(".dr-h-68 > .cta-md-l");
        if (priceEl) tweenPrice(priceEl, data.price);
        if (noteEl) {
          noteEl.textContent = data.note;
          noteEl.style.display = data.note ? "" : "none";
        }
      });
    };

    // Prices count from the old value to the new one (320 ms, ease-out) so
    // the 20% delta is legible; instant under reduced-motion or first paint.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rupiah = new Intl.NumberFormat("id-ID");
    const parse = (text) => Number(String(text).replace(/[^\d]/g, "")) || 0;
    const frames = new Map();
    const tweenPrice = (el, target) => {
      const from = parse(el.textContent);
      const to = parse(target);
      if (reduceMotion || from === to || !el.dataset.live) {
        el.textContent = target;
        el.dataset.live = "1";
        return;
      }
      window.cancelAnimationFrame(frames.get(el) || 0);
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 320);
        const e = 1 - (1 - k) ** 3;
        el.textContent = `Rp${rupiah.format(Math.round(from + (to - from) * e))}`;
        if (k < 1) frames.set(el, window.requestAnimationFrame(step));
        else el.textContent = target;
      };
      frames.set(el, window.requestAnimationFrame(step));
    };

    const mascot = root.querySelector(".sb-price-mascot");

    const onClick = (event) => {
      const button = event.target.closest("button");
      if (!button || !tabs.contains(button)) return;
      const index = buttons.indexOf(button);
      if (index < 0) return;
      const wasYearly = isYearly;
      isYearly = index === 0;
      apply();
      if (isYearly && !wasYearly && mascot) window.sbMascot?.set(mascot, "celebrate");
    };

    apply();
    window.addEventListener("resize", apply);
    tabs.addEventListener("click", onClick);
    return () => {
      for (const id of frames.values()) window.cancelAnimationFrame(id);
      window.removeEventListener("resize", apply);
      tabs.removeEventListener("click", onClick);
    };
  }, [rootRef]);
}
