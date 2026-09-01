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
    const cards = [
      ...root.querySelectorAll(".pricing-module__NXQy5G__card__wrapper > div"),
    ];

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
        if (priceEl) priceEl.textContent = data.price;
        if (noteEl) {
          noteEl.textContent = data.note;
          noteEl.style.display = data.note ? "" : "none";
        }
      });
    };

    const onClick = (event) => {
      const button = event.target.closest("button");
      if (!button || !tabs.contains(button)) return;
      const index = buttons.indexOf(button);
      if (index < 0) return;
      isYearly = index === 0;
      apply();
    };

    apply();
    window.addEventListener("resize", apply);
    tabs.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("resize", apply);
      tabs.removeEventListener("click", onClick);
    };
  }, [rootRef]);
}
