import { useEffect } from "react";

/**
 * Accordion behavior matching original CSS transition on
 * .accordion-module__tWMLDa__body (height .6s --ease-out-expo).
 */
export function useFaqAccordion(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const onClick = (event) => {
      const button = event.target.closest(".faq-module__O8tnPq__faq__item > button");
      if (!button || !root.contains(button)) return;

      const item = button.parentElement;
      const body = item?.querySelector(".accordion-module__tWMLDa__body");
      const icon = button.querySelector("svg");
      if (!body) return;

      const isOpen = body.getAttribute("aria-hidden") === "false";

      root.querySelectorAll(".accordion-module__tWMLDa__body").forEach((el) => {
        if (el === body) return;
        el.style.height = "0px";
        el.setAttribute("aria-hidden", "true");
        el.parentElement?.removeAttribute("data-open");
        const otherButton = el.parentElement?.querySelector("button");
        otherButton?.setAttribute("aria-expanded", "false");
        const otherIcon = otherButton?.querySelector("svg");
        if (otherIcon) otherIcon.style.transform = "";
      });

      if (isOpen) {
        body.style.height = "0px";
        body.setAttribute("aria-hidden", "true");
        item.removeAttribute("data-open");
        button.setAttribute("aria-expanded", "false");
        if (icon) icon.style.transform = "";
      } else {
        body.style.height = `${body.scrollHeight}px`;
        body.setAttribute("aria-hidden", "false");
        item.setAttribute("data-open", "");
        button.setAttribute("aria-expanded", "true");
        if (icon) icon.style.transform = "rotate(180deg)";
      }
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootRef]);
}
