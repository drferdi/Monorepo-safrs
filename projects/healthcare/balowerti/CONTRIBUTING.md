Architected and built by the one and only Drferdi.
# Contributing

**Puskesmas Balowerti Website — Development Guidelines**

---

## Table of Contents

1. [Development Environment](#development-environment)
2. [Branch Strategy](#branch-strategy)
3. [Code Conventions](#code-conventions)
4. [Styling Guidelines](#styling-guidelines)
5. [Commit Messages](#commit-messages)
6. [Pull Request Process](#pull-request-process)

---

## Development Environment

### Prerequisites

- Node.js >= 20.9.0
- npm (included with Node.js)
- Git

### Initial Setup

```bash
git clone <repository-url>
cd website
npm install
cp .env.example .env.local  # Configure environment variables (optional)
npm run dev
```

Server starts at `http://localhost:5173`.

---

## Branch Strategy

```
main          — Production-ready code only
feature/*     — New features (e.g., feature/add-news-section)
fix/*         — Bug fixes (e.g., fix/mobile-nav-overlap)
chore/*       — Maintenance (e.g., chore/update-doctor-profiles)
```

Branch from `main`. Merge back to `main` via Pull Request.

---

## Code Conventions

### TypeScript

- Strict mode is enabled — no `any` without justification
- Explicit types on all exported functions and components
- Use `unknown` + type guards instead of `any`
- All component props must have explicit interface

### React

- Functional components only
- Props interface defined at top of file
- Custom hooks prefixed with `use`
- No prop drilling beyond 2 levels
- Event handlers named `handleVerbNoun`

### Naming

- Components & sections: **PascalCase** filenames (`Hero.tsx`, `PatientFlow.tsx`)
- Hooks: **camelCase** with `use` prefix
- Utilities: **lowercase** (`utils.ts`)
- Constants: **UPPER_CASE**

### Import Order

```tsx
// 1. React / third-party
import React, { useState } from 'react';
import { motion } from 'framer-motion';

// 2. UI components
import { Button } from '@/components/ui/button';

// 3. Custom hooks
import { useSmoothImage } from '@/hooks/useSmoothImage';

// 4. Utilities + types
import { cn } from '@/lib/utils';
```

Use `@/` path alias for all `src/` imports.

---

## Styling Guidelines

- **Tailwind CSS** utility classes as primary approach
- Custom classes in `index.css`: `.neo-card`, `.frosted-glass`, etc.
- Color palette: cream-based, primary `#C9A87C` — defined as CSS variables in `:root`
- Use `cn()` from `@/lib/utils` for conditional class merging
- **Do not introduce any additional CSS framework**
- Responsive design via Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)

---

## Commit Messages

Follow [Conventional Commits v1.0](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

Types: feat, fix, refactor, docs, chore, perf, style
Scopes: hero, nav, services, doctors, testimonials, reservation, footer, chatbox
```

Examples:
```bash
feat(doctors): add dr. Siti Rahayu profile and schedule
fix(testimonials): handle empty reviews gracefully
docs(readme): update installation instructions
chore(deps): update shadcn/ui components
```

---

## Pull Request Process

1. Ensure `npm run build` passes (TypeScript + Vite)
2. Ensure `npm run lint` returns 0 errors in `src/` files
3. Test on both mobile (375px) and desktop (1280px+) viewports
4. PR title follows Conventional Commits format
5. PR description explains: what changed, why, and how to test
6. Request review from at least one team member

### PR Checklist

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (src/ files only)
- [ ] Tested on mobile viewport
- [ ] No hardcoded credentials or API keys
- [ ] Content is in Bahasa Indonesia
- [ ] No new CSS framework introduced
