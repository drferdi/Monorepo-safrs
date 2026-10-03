// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

import { createLogger } from '@/utils/logger';

const scraperLog = createLogger('DomUtils', 'content');

/**
 * Utility untuk menunggu elemen DOM muncul (Anti-Flaky)
 * @param selector CSS Selector
 * @param timeout Max wait time (ms)
 */
export const waitForElement = (selector: string, timeout = 5000): Promise<Element | null> => {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      scraperLog.debug(`[DOM] Timeout waiting for: ${selector}`);
      resolve(null);
    }, timeout);
  });
};

/**
 * getInputValue
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-02-04
 */

export const getInputValue = (selector: string): string => {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
  return el ? el.value.trim() : '';
};

/**
 * getTextContent
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-02-04
 */

export const getTextContent = (selector: string): string => {
  const el = document.querySelector(selector);
  return el ? el.textContent?.trim() || '' : '';
};
