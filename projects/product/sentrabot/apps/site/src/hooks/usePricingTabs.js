import { useEffect } from "react";

/**
 * Pricing yearly/monthly toggle — prices taken verbatim from original chunk data.
 * Professional: yearly $20/bulan + "Ditagih tahunan sebesar $240" | monthly $25/bulan
 * Unlimited: yearly $39/bulan + "Ditagih tahunan sebesar $470" | monthly $49/bulan
 */
const PLANS = [
  {
    yearly: { price: "$20/bulan", note: "Ditagih tahunan sebesar $240" },
    monthly: { price: "$25/bulan", note: "" },
  },
  {
    yearly: { price: "$39/bulan", note: "Ditagih tahunan sebesar $470" },
    monthly: { price: "$49/bulan", note: "" },
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
