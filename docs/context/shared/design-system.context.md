# Shared Context: Sentra Design System

## Overview

This document establishes the canonical design system for all Sentra AI products. It defines the visual language, component patterns, typography, color system, and accessibility standards that must be applied consistently across every product capsule.

The design system is implemented through `@sentra/token` — a semantic token-based system that replaces ad-hoc color values, font choices, and spacing with named, purposeful tokens. Every Sentra product must consume these tokens; direct use of raw hex values, arbitrary spacing, or non-canonical fonts is prohibited.

## Design Philosophy

Sentra AI products serve Indonesian communities — health workers, teachers, parents, children. The design philosophy reflects this context:

1. **Clarity over cleverness**: Interfaces must be immediately understandable by users with varying digital literacy levels. Avoid hidden gestures, ambiguous icons, and non-standard patterns.

2. **Calm and trustworthy**: Health and education products require emotional stability. Avoid aggressive colors, flashing animations, and urgency-driven UI patterns.

3. **Progressive disclosure**: Show the essential first; reveal advanced capabilities only when needed. Never overwhelm the user with options.
4. **Accessibility as default**: WCAG 2.1 AA compliance is the minimum, not the aspiration. All color combinations must pass contrast ratios. All interactions must be keyboard-navigable.

## Typography

### Canonical Fonts
| Font | Role | Weight | Usage |
|------|------|--------|-------|
| **Archivo** | Primary sans-serif, one family | 400 (Regular), 500 (Medium), 600 (SemiBold) — three weights only | Body text, headings, UI labels, buttons. Display voice from the width axis: `wdth` 112 display, 108 wordmark/module names, 100 body |
| **JetBrains Mono** | Primary monospace | 400 (Regular), 500 (Medium) | Machine-produced values: IDs, paths, measurements, data tables, timestamps |

### Deprecated Fonts (DO NOT USE)
| Font | Status | Replacement | Reason |
|------|--------|-------------|--------|
| Plus Jakarta Sans | **DEPRECATED** | Archivo | Not part of Sentra brand; inconsistent with semantic token system |
| IBM Plex | **DEPRECATED** | JetBrains Mono | Not part of Sentra brand; inconsistent with semantic token system |

### Typography Scale
```
Text size tokens (semantic):
  --text-xs     → 0.75rem  (12px)    — captions, badges, timestamps
  --text-sm     → 0.875rem (14px)    — secondary text, helper labels
  --text-base   → 1rem     (16px)    — body text, default readable size
  --text-lg     → 1.125rem (18px)    — emphasis body, card descriptions
  --text-xl     → 1.25rem  (20px)    — subsection headings
  --text-2xl    → 1.5rem   (24px)    — section headings
  --text-3xl    → 1.875rem (30px)    — page headings
  --text-4xl    → 2.25rem  (36px)    — hero headings
  --text-5xl    → 3rem     (48px)    — display text (marketing only)
```

### Line Height
```
  --leading-none    → 1       — headings, tight compositions
  --leading-tight   → 1.25    — dense UI, data tables
  --leading-snug    → 1.375   — compact body text
  --leading-normal  → 1.5     — standard body text (default)
  --leading-relaxed → 1.625   — comfortable reading, long paragraphs
  --leading-loose   → 2       — spacious, accessibility-enhanced text
```

## Color System

### Semantic Token Categories
Colors are defined by purpose, not by hue. This enables automatic dark mode, theme customization, and consistent meaning across the product.

#### Background Tokens
| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--bg-default` | white (#ffffff) | gray-900 (#111827) | Primary page background |
| `--bg-subtle` | gray-50 (#f9fafb) | gray-800 (#1f2937) | Card backgrounds, elevated surfaces |
| `--bg-muted` | gray-100 (#f3f4f6) | gray-700 (#374151) | Disabled states, inactive areas |
| `--bg-inset` | gray-200 (#e5e7eb) | gray-600 (#4b5563) | Input fields, nested containers |
| `--bg-primary` | blue-600 (#2563eb) | blue-500 (#3b82f6) | Primary action backgrounds |
| `--bg-danger` | red-600 (#dc2626) | red-500 (#ef4444) | Error, destructive actions |
| `--bg-success` | green-600 (#16a34a) | green-500 (#22c55e) | Success states, confirmations |
| `--bg-warning` | amber-500 (#f59e0b) | amber-400 (#fbbf24) | Warning states |

#### Text Tokens
| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--text-default` | gray-900 (#111827) | gray-100 (#f3f4f6) | Primary body text |
| `--text-secondary` | gray-500 (#6b7280) | gray-400 (#9ca3af) | Secondary text, descriptions |
| `--text-muted` | gray-400 (#9ca3af) | gray-500 (#6b7280) | Placeholder, disabled text |
| `--text-inverse` | white (#ffffff) | gray-900 (#111827) | Text on dark backgrounds |
| `--text-primary` | blue-600 (#2563eb) | blue-400 (#60a5fa) | Primary action text, links |
| `--text-danger` | red-600 (#dc2626) | red-400 (#f87171) | Error messages |
| `--text-success` | green-600 (#16a34a) | green-400 (#4ade80) | Success messages |
| `--text-warning` | amber-600 (#d97706) | amber-400 (#fbbf24) | Warning messages |

#### Border Tokens
| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--border-default` | gray-200 (#e5e7eb) | gray-700 (#374151) | Standard borders |
| `--border-subtle` | gray-100 (#f3f4f6) | gray-800 (#1f2937) | Subtle dividers |
| `--border-primary` | blue-500 (#3b82f6) | blue-400 (#60a5fa) | Focus rings, active states |
| `--border-danger` | red-500 (#ef4444) | red-400 (#f87171) | Error field borders |

### Raw Color Values (For Reference Only — Always Use Semantic Tokens)
```
Gray scale:
  gray-50  → #f9fafb
  gray-100 → #f3f4f6
  gray-200 → #e5e7eb
  gray-300 → #d1d5db
  gray-400 → #9ca3af
  gray-500 → #6b7280
  gray-600 → #4b5563
  gray-700 → #374151
  gray-800 → #1f2937
  gray-900 → #111827

Primary (Blue):
  blue-50  → #eff6ff
  blue-100 → #dbeafe
  blue-200 → #bfdbfe
  blue-300 → #93c5fd
  blue-400 → #60a5fa
  blue-500 → #3b82f6
  blue-600 → #2563eb
  blue-700 → #1d4ed8
  blue-800 → #1e40af
  blue-900 → #1e3a8a

Accent colors (use sparingly, with semantic tokens):
  Red scale    → errors, destructive actions, alerts
  Green scale  → success, confirmations, positive trends
  Amber scale  → warnings, pending states, cautions
  Purple scale → features, premium, special highlights
```

## Spacing System

### Base Unit
The spacing system is based on `0.25rem` (4px at 16px root font size).

```
  --space-0   → 0px     — none, collapse
  --space-1   → 4px     — tight internal padding, icon gaps
  --space-2   → 8px     — small gaps, inline spacing
  --space-3   → 12px    — compact padding, small card gutters
  --space-4   → 16px    — standard padding, default gap
  --space-5   → 20px    — comfortable padding
  --space-6   → 24px    — section internal padding
  --space-8   → 32px    — section separation
  --space-10  → 40px    — component separation
  --space-12  → 48px    — large component separation
  --space-16  → 64px    — section vertical padding
  --space-20  → 80px    — page section separation
  --space-24  → 96px    — major section breaks
```

### Layout Tokens
```
  --container-sm   → 640px   — narrow content (forms, focused tasks)
  --container-md   → 768px   — standard content width
  --container-lg   → 1024px  — wide content (dashboards, tables)
  --container-xl   → 1280px  — maximum content width
  --container-full → 100%    — full-width layouts
```

## Component Patterns

### Button Variants
| Variant | Background | Text | Border | Hover | Use Case |
|---------|-----------|------|--------|-------|----------|
| Primary | `--bg-primary` | `--text-inverse` | none | Darken 10% | Main action on page |
| Secondary | `--bg-subtle` | `--text-default` | `--border-default` | `--bg-muted` | Alternative action |
| Ghost | transparent | `--text-primary` | none | `--bg-primary` + `--text-inverse` | Low-emphasis action |
| Danger | `--bg-danger` | `--text-inverse` | none | Darken 10% | Destructive action |
| Disabled | `--bg-muted` | `--text-muted` | none | none (cursor: not-allowed) | Unavailable action |

### Input States
| State | Border | Background | Text | Ring | Note |
|-------|--------|-----------|------|------|------|
| Default | `--border-default` | `--bg-default` | `--text-default` | none | — |
| Focus | `--border-primary` | `--bg-default` | `--text-default` | 2px `--border-primary` | Keyboard and mouse focus |
| Error | `--border-danger` | `--bg-default` | `--text-danger` | 2px `--border-danger` | Validation failed |
| Disabled | `--border-subtle` | `--bg-muted` | `--text-muted` | none | Not interactive |
| Read-only | `--border-subtle` | `--bg-subtle` | `--text-secondary` | none | Display-only |

### Card Pattern
```
Card:
  Background: --bg-subtle
  Border: 1px solid --border-default
  Border-radius: --radius-lg (8px)
  Padding: --space-4 (16px)
  Shadow: --shadow-sm (0 1px 2px rgba(0,0,0,0.05))
  Hover (if interactive):
    Shadow: --shadow-md (0 4px 6px rgba(0,0,0,0.1))
    Border: --border-primary
```

## Accessibility Standards

### Contrast Requirements
| Element | Minimum Contrast | Preferred Contrast |
|---------|-----------------|-------------------|
| Normal text (< 18px) | 4.5:1 | 7:1 |
| Large text (>= 18px or bold >= 14px) | 3:1 | 4.5:1 |
| UI components, graphical objects | 3:1 | 4.5:1 |

### Focus Visibility
- All interactive elements must have a visible focus indicator
- Focus ring: 2px solid `--border-primary`, offset 2px
- Never remove focus outline without providing an equivalent visible indicator

### Motion and Animation
- Respect `prefers-reduced-motion: reduce`
- Essential animations (loading spinners, progress indicators) may continue but should be simplified
- Decorative animations (entrance effects, parallax) must be disabled
- Transition durations should not exceed 300ms for UI feedback

### Screen Reader Support
- All images must have meaningful `alt` text (empty string for decorative images)
- All form inputs must have associated `<label>` elements
- All interactive elements must have accessible names
- Dynamic content changes must be announced with ARIA live regions

## Responsive Breakpoints

```
  --breakpoint-sm → 640px   — Large phones, small tablets
  --breakpoint-md → 768px   — Tablets, small laptops
  --breakpoint-lg → 1024px  — Laptops, desktops
  --breakpoint-xl → 1280px  — Large desktops
```

Mobile-first approach: default styles target mobile; use `min-width` media queries to enhance for larger screens.

## Usage Rules

### DO
- Use semantic tokens for all colors, spacing, typography, and shadows
- Use Archivo and JetBrains Mono exclusively (Geist was used 2026-08-11 → 2026-09-22 and is superseded)
- Test contrast ratios for all color combinations
- Respect `prefers-reduced-motion` and `prefers-color-scheme`
- Document custom component patterns in capsule-specific design docs

### DO NOT
- Use raw hex values, rgb, or hsl directly in component styles
- Use Plus Jakarta Sans, IBM Plex, or any non-canonical font
- Hardcode spacing values (px, rem) outside the token system
- Remove focus outlines without replacement
- Assume dark mode is optional — implement from day one
