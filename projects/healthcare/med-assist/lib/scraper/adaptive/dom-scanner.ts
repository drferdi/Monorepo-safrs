// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Data Ascension System (DAS) - DOM Scanner
 *
 * Extracts form fields from the page and builds structured signatures
 * for AI-powered semantic mapping.
 *
 * @module lib/scraper/adaptive/dom-scanner
 */

import type {
  FieldAttributes,
  FieldContext,
  FieldPosition,
  FieldSignature,
  FieldType,
  ScanOptions,
  ScanResult,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<ScanOptions> = {
  includeHidden: false,
  includeDisabled: true,
  maxDepth: 10,
  formSelector: '',
  includeOrphanFields: true,
};

/** Selectors for interactive form fields */
const FIELD_SELECTORS = [
  'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  'select',
  'textarea',
].join(', ');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique ID for a field
 */
function generateFieldId(element: HTMLElement, index: number): string {
  const tagName = element.tagName.toLowerCase();
  const name = (element as HTMLInputElement).name || '';
  const id = element.id || '';
  const timestamp = Date.now();

  return `das_${tagName}_${name || id || index}_${timestamp}`;
}

/**
 * Classify the type of a form field
 */
export function classifyFieldType(element: HTMLElement): FieldType {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'select') return 'select';
  if (tagName === 'textarea') return 'textarea';

  if (tagName === 'input') {
    const inputType = (element as HTMLInputElement).type.toLowerCase();

    switch (inputType) {
      case 'number':
      case 'range':
        return 'number';
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      case 'date':
        return 'date';
      case 'time':
      case 'datetime-local':
        return 'time';
      case 'hidden':
        return 'hidden';
      default:
        return 'text';
    }
  }

  return 'text';
}

/**
 * Check if a field should be included based on options
 */
function shouldIncludeField(
  element: HTMLElement,
  fieldType: FieldType,
  options: Required<ScanOptions>
): boolean {
  const input = element as HTMLInputElement;

  // Check hidden
  if (fieldType === 'hidden' && !options.includeHidden) {
    return false;
  }

  // Check disabled
  if (input.disabled && !options.includeDisabled) {
    return false;
  }

  // Check visibility (if not including hidden)
  if (!options.includeHidden) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
  }

  return true;
}

/**
 * Compute a unique CSS selector for an element
 */
export function computeUniqueSelector(element: HTMLElement): string {
  // Priority 1: ID selector
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // Priority 2: Name attribute
  const name = (element as HTMLInputElement).name;
  if (name) {
    const tagName = element.tagName.toLowerCase();
    return `${tagName}[name="${CSS.escape(name)}"]`;
  }

  // Priority 3: Build path selector
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }

    // Add nth-child for uniqueness
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

/**
 * Extract HTML attributes from a field
 */
export function getFieldAttributes(element: HTMLElement): FieldAttributes {
  const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  return {
    name: input.name || null,
    id: element.id || null,
    placeholder: (input as HTMLInputElement).placeholder || null,
    ariaLabel: element.getAttribute('aria-label'),
    className: element.className || '',
    required: input.required || false,
    disabled: input.disabled || false,
    readonly: (input as HTMLInputElement).readOnly || false,
    value: input.value || '',
  };
}

/**
 * Find the associated label for a form field
 */
export function findAssociatedLabel(element: HTMLElement): string | null {
  const input = element as HTMLInputElement;

  // Method 1: Look for <label for="id">
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label?.textContent) {
      return label.textContent.trim();
    }
  }

  // Method 2: Look for wrapping <label>
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // Get text content excluding the input itself
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => input.remove());
    const text = clone.textContent?.trim();
    if (text) return text;
  }

  // Method 3: aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Method 4: aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement?.textContent) {
      return labelElement.textContent.trim();
    }
  }

  // Method 5: Look for adjacent text (sibling or previous)
  const prevSibling = element.previousElementSibling;
  if (prevSibling?.tagName === 'LABEL' || prevSibling?.tagName === 'SPAN') {
    const text = prevSibling.textContent?.trim();
    if (text && text.length < 100) return text;
  }

  // Method 6: placeholder as fallback
  if (input.placeholder) {
    return input.placeholder;
  }

  return null;
}

/**
 * Extract contextual information about a field
 */
export function extractContext(element: HTMLElement): FieldContext {
  const context: FieldContext = {
    formId: null,
    sectionHeader: null,
    siblingLabels: [],
    parentClasses: [],
  };

  // Find parent form
  const form = element.closest('form');
  if (form) {
    context.formId = form.id || form.getAttribute('name') || null;
  }

  // Find nearest section header
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    // Look for heading siblings or parents
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const heading = parent.querySelector(
        'h1, h2, h3, h4, h5, h6, .section-title, .form-section-header'
      );
      if (heading && heading.textContent) {
        context.sectionHeader = heading.textContent.trim().substring(0, 100);
        break;
      }
    }
    current = parent;
  }

  // Collect sibling labels
  const parent = element.parentElement;
  if (parent) {
    const labels = parent.querySelectorAll('label, span.label, .field-label');
    labels.forEach((label) => {
      const text = label.textContent?.trim();
      if (text && text.length < 100) {
        context.siblingLabels.push(text);
      }
    });
  }

  // Collect parent classes (useful for grouping)
  current = element.parentElement;
  let depth = 0;
  while (current && depth < 3) {
    if (current.className) {
      context.parentClasses.push(current.className);
    }
    current = current.parentElement;
    depth++;
  }

  return context;
}

/**
 * Get position and visibility information for a field
 */
export function getFieldPosition(element: HTMLElement): FieldPosition {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    isVisible: rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight,
  };
}

/**
 * Extract complete signature for a single field
 */
function extractFieldSignature(element: HTMLElement, index: number): FieldSignature {
  const fieldType = classifyFieldType(element);

  return {
    id: generateFieldId(element, index),
    tagName: element.tagName.toLowerCase(),
    selector: computeUniqueSelector(element),
    fieldType,
    attributes: getFieldAttributes(element),
    label: findAssociatedLabel(element),
    context: extractContext(element),
    position: getFieldPosition(element),
  };
}

// ============================================================================
// MAIN SCANNER FUNCTION
// ============================================================================

/**
 * Scan the current page for form fields and build signatures
 *
 * @param options - Scanning options
 * @returns ScanResult with all detected field signatures
 *
 * @example
 * const result = scanPageFields({ includeHidden: false });
 * console.warn(`Found ${result.fields.length} fields`);
 */
export function scanPageFields(options?: ScanOptions): ScanResult {
  const startTime = performance.now();
  const opts: Required<ScanOptions> = { ...DEFAULT_OPTIONS, ...options };

  const fields: FieldSignature[] = [];
  let elements: NodeListOf<HTMLElement>;

  // Get elements based on formSelector option
  if (opts.formSelector) {
    const form = document.querySelector(opts.formSelector);
    if (form) {
      elements = form.querySelectorAll(FIELD_SELECTORS);
    } else {
      elements = document.querySelectorAll('never-match'); // Empty NodeList
    }
  } else if (opts.includeOrphanFields) {
    // Scan entire document
    elements = document.querySelectorAll(FIELD_SELECTORS);
  } else {
    // Scan only within forms
    elements = document.querySelectorAll(`form ${FIELD_SELECTORS}`);
  }

  // Extract signatures
  elements.forEach((element, index) => {
    const fieldType = classifyFieldType(element);

    if (shouldIncludeField(element, fieldType, opts)) {
      const signature = extractFieldSignature(element, index);
      fields.push(signature);
    }
  });

  // Count forms
  const formCount = document.querySelectorAll('form').length;

  const endTime = performance.now();

  return {
    fields,
    pageUrl: window.location.href,
    pageTitle: document.title,
    timestamp: Date.now(),
    formCount,
    scanDuration: Math.round(endTime - startTime),
  };
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

/**
 * Serialize a field signature for logging (removes circular refs)
 */
export function serializeForLogging(signature: FieldSignature): object {
  return {
    id: signature.id,
    selector: signature.selector,
    fieldType: signature.fieldType,
    label: signature.label,
    name: signature.attributes.name,
    placeholder: signature.attributes.placeholder,
    sectionHeader: signature.context.sectionHeader,
    isVisible: signature.position.isVisible,
  };
}

/**
 * Check if a field is interactive (not hidden/disabled)
 */
export function isInteractiveField(element: HTMLElement): boolean {
  const input = element as HTMLInputElement;
  const style = window.getComputedStyle(element);

  return !input.disabled && style.display !== 'none' && style.visibility !== 'hidden';
}
