# KEDIRI — A Living Civilization
## Master UX / Information Architecture & Interaction Bible

**Version:** 0.1  
**Experience model:** Two products sharing one historical truth

---

# 1. UX Thesis

The website contains two first-class experiences:

## A. THE JOURNEY
For visitors who want to feel, discover and understand the big story. It is cinematic, chronological and scroll-directed.

## B. THE ARCHIVE
For visitors who want to look something up, verify a claim, find a place, inspect an object or go deep into evidence.

The Journey answers:

> **Why should I care about Kediri's history?**

The Archive answers:

> **How do we know?**

Neither is secondary.

# CINEMATIC WHEN THE USER WANTS CINEMA. INSTANT WHEN THE USER WANTS INFORMATION.

---

# 2. Five Primary Visitor Intents

1. **EXPERIENCE** — take me through the story.
2. **JUMP** — take me to a specific period.
3. **EXPLORE** — show connected themes and places.
4. **VERIFY** — show evidence and sources.
5. **RETURN** — take me back exactly where I was.

Every major interaction should support one of these.

---

# 3. Primary IA

```text
/
├── /journey
├── /explore
│   ├── /timeline
│   ├── /places
│   └── /themes
├── /archive
│   ├── /events
│   ├── /people
│   ├── /places
│   ├── /objects
│   └── /sources
├── /sources
├── /methodology
├── /accessibility
├── /rights
└── /about
```

The navigation remains small even though the knowledge system is large.

---

# 4. Homepage

The homepage does not duplicate the Journey. It explains what this is and lets visitors choose a mode.

First view:

**KEDIRI**  
# A LIVING CIVILIZATION  
**879 → 2026**

Primary CTA: **BEGIN THE JOURNEY**  
Secondary: **Explore History**  
Tertiary: **Browse Sources**

Below, three clear entry cards:

1. Journey Through Time
2. Explore Kediri
3. Historical Archive

No forced intro, news carousel, bureaucratic mega-menu or compulsory speech.

---

# 5. Journey Route Model

All cinematic scenes live inside one continuous route:

# `/journey`

Scenes receive stable anchors:

```text
/journey#879-first-mark
/journey#921-kadhiri
/journey#1042-divided-kingdom
/journey#1135-panjalu-jayati
/journey#1157-bharatayuddha
/journey#1222-ganter
/journey#1293-last-kingdom
/journey#1869-brantas-bridge
/journey#1912-bridge-rise
/journey#1958-gudang-garam
/journey#2024-dhoho
/journey#2026-still-becoming
```

**26 scenes are not 26 separate routes.**

This preserves scroll continuity while keeping history linkable and shareable.

---

# 6. Scene Contract

Every scene contains six functional layers:

```text
Historical Canvas
Date + Title
Narrative Beat
Evidence Badge
Scene Navigation
Explore Layer
```

The casual visitor may use only the first three. Deeper information is progressive disclosure.

---

# 7. Three Content Depths

## Depth 1 — Glance
5–10 seconds: date, title, one statement, hero visual.

## Depth 2 — Story
30–90 seconds: short context, explanation, interpretation.

## Depth 3 — Evidence
Unlimited: objects, sources, provenance, transcription, bibliography, related research.

The visitor controls depth.

---

# 8. Global Journey Navigation

Desktop persistent controls:

`KEDIRI` left.

`Timeline · Explore · Sources · Sound` right.

They visually recede during cinema and become fully legible on user intent / keyboard focus.

---

# 9. Timeline Overlay

The Timeline is the main escape hatch from linear storytelling.

It opens as a vertical chronological navigator, not a horizontal carousel requiring precision swiping.

Major milestones:

879 · 921 · 1042 · 1135 · 1157 · 1222 · 1293 · 1678 · 1869 · 1906 · 1912 · 1948 · 1950 · 1958 · 1990 · 2024 · 2026

Supporting scenes appear subordinate.

Selecting a year:

1. closes timeline;
2. jumps directly;
3. establishes correct scene entry state;
4. updates anchor;
5. preserves Back semantics;
6. moves accessible focus to scene heading.

**Do not animate a trip through seven centuries because the visitor clicked 1869.** Navigation is immediate; scroll is cinematic.

---

# 10. Skipping

Do not cover every scene with “Skip Animation.”

Long hero scenes may provide a subtle:

**Next Chapter ↓**

Act openings may offer **Jump to next era →**.

Timeline remains the universal skip mechanism.

No user is trapped in a pinned sequence.

---

# 11. Orientation

Global progress is semantic, not percentage-based.

Prefer:

`ACT II / PANJALU RISES`  
`1135 → 1157`

Avoid:

`43% COMPLETE`

For a direct jump across large periods, a brief non-blocking context line may say:

> You jumped from The Land Remembers to The Industrial City.

Never force an explanation.

---

# 12. Evidence Interaction

Evidence must be one interaction away without breaking immersion.

Trigger examples:

`● PRIMARY RECORD`  
**View Evidence**

Desktop: right-side drawer.  
Mobile: bottom sheet / expandable full-screen reading view.

Opening evidence:

- preserves scroll position;
- pauses non-essential ambient motion;
- moves keyboard focus into panel;
- prevents interaction behind a true modal state;
- supports Escape / visible close;
- restores focus to trigger.

Small citation → inline disclosure.  
Medium object metadata → drawer/sheet.  
Long transcription/bibliography → full Archive route.

---

# 13. Evidence Drawer Content

Example:

**PRASASTI HANTANG**  
`● PRIMARY RECORD`

**Date** 1135 CE  
**Institution** Museum Nasional Indonesia  
**Inventory** D.9

**This evidence supports**  
The phrase *Pañjalu Jayati* and its immediate documentary context.

**This evidence does not establish**  
Jayabhaya's exact physical appearance or an eyewitness visual reconstruction of a battle.

Actions:

**View object**  
**Read source**  
**Full archive record →**

---

# 14. Archive

Route: `/archive`

The Archive is a curated historical catalogue, not a raw database grid.

Primary categories:

- Events
- People
- Places
- Objects / Artifacts
- Sources
- Photographs / media where appropriate

Archive home provides search, categories and curated collections.

---

# 15. Search

Search must handle aliases and historical spellings:

Jayabaya ↔ Jayabhaya  
Kadhiri ↔ Kediri  
Panjalu ↔ Pañjalu  
Dahanapura ↔ Daha

Search should not require specialist transliteration knowledge.

Result cards prioritize meaning:

**Prasasti Hantang**  
`1135 · Inscription`  
Short significance  
`PRIMARY RECORD`  
Museum / inventory

Filters remain limited and useful: period, material type, evidence type, institution only when needed.

---

# 16. Archive Object Page

Example route:

`/archive/objects/prasasti-hantang`

Structure:

1. hero object;
2. identity: name, date, institution, inventory;
3. historical significance;
4. what it establishes;
5. what it does not establish;
6. provenance;
7. transcription / translation if available;
8. related claims and sources;
9. **Used in Journey: 1135 — Panjalu Jayati →**;
10. related people/places/themes.

---

# 17. Journey ↔ Archive Symmetry

Journey → **View Full Record** → Archive.

Archive → **See this in the Journey** → exact scene anchor.

Browser Back returns to the same historical context.

**Browser Back is sacred.**

Flow that must work:

`Journey 1135 → Evidence → Hantang Archive → Back → exact 1135 scene`

No homepage reset. No intro replay.

---

# 18. Context Preservation

When leaving Journey for a full informational route, preserve minimal context:

```text
journeyScene
journeyAct
```

Use native browser history and scroll restoration wherever possible rather than building a fragile custom navigation universe.

---

# 19. Explore Layer

Route: `/explore`

Three major paths:

## Timeline
Full informational chronology, filterable and linkable.

## Places
Where history survives physically today.

## Themes
Non-linear connections through time.

This serves visitors who want neither a full cinematic journey nor a scholarly archive.

---

# 20. Timeline Page

Every event can link to:

- **Experience Scene →**
- **See Place →**
- **View Evidence →**

A historical event becomes a hub connecting experience, geography and proof.

---

# 21. Places

Place pages may include Jembatan Lama, Brantas, Gereja Merah, Selomangleng, station, industrial heritage and Dhoho regional context once geography is verified.

A place page contains:

**TODAY** — current photography / location context  
**THEN** — historical imagery  
**HISTORY** — key dates  
**RELATED JOURNEY** — deep links  
**EVIDENCE** — sources / objects

Map is an exploration tool, not the core narrative.

Ancient speculative geography and modern location pins must never share the same visual certainty language.

---

# 22. Themes

Initial curated themes:

- Brantas
- Kings & Power
- Words & Stories
- Bridges & Movement
- Work & Industry
- War & Resilience

Do not launch dozens of themes.

The Brantas theme is especially important because it can connect 1042, 1678, 1869, 1912, 1948, 2019 and 2026 into one non-linear history.

---

# 23. Sources

Route: `/sources`

Browse by:

- primary sources;
- institutions;
- secondary academic research;
- official modern data.

Cinematic scenes use subtle evidence markers rather than academic footnote clutter. Full citations remain one interaction away.

Every major source receives a stable internal permalink where useful.

---

# 24. Resume Experience

Three return modes:

## Browser Back
Exact context restoration — mandatory.

## Same session
Offer unobtrusively: **Continue from 1869?** with Continue / Start from beginning.

## Future visit
Optionally store last scene locally. No account required.

Never gamify with “62% complete.”

---

# 25. Bookmarkability / Sharing

Every scene, place, object, theme and source has a stable URL.

A student should be able to share Panjalu Jayati directly without telling someone to scroll six minutes.

Scene-specific social metadata should describe that event, not always the homepage.

---

# 26. Mobile North Star

# DESKTOP = CINEMATIC INSTALLATION

# MOBILE = CINEMATIC HISTORICAL GRAPHIC NOVEL

Mobile is first-class.

Use native vertical flow, fewer pins, large type, strong imagery, direct touch interactions, sequential frame logic.

No feature depends on hover, mouse position or custom cursor.

Never require landscape orientation.

---

# 27. Mobile Navigation

Compact top bar: `KEDIRI` + `Explore`.

Expanded menu: Timeline · Explore · Sources · Sound.

Mobile Timeline: full-screen vertical sheet with large targets.

Mobile Evidence: bottom sheet, expandable to full-screen for long content.

---

# 28. Reduced Motion

Reduced motion does not remove the Journey.

It transforms long scrubs into static compositions, short fades, progressive panels and direct state changes.

All history remains available.

---

# 29. Accessibility Architecture

Target: **WCAG 2.2 AA**.

Requirements include:

- first-focus skip link: **SKIP TO HISTORICAL CONTENT**;
- keyboard operation;
- meaningful focus order;
- semantic headings;
- split-text accessibility that preserves a readable semantic copy;
- no global arrow-key hijacking;
- captions/transcripts for spoken media;
- sound off by default;
- no meaning encoded only by color;
- text resizing/reflow;
- touch targets;
- screen-reader-friendly underlying document.

A screen reader should receive a coherent history article—not animation fragments.

---

# 30. JavaScript Failure Principle

Without JavaScript, Journey must still show:

- dates;
- headings;
- narrative;
- images;
- evidence links.

The cinema disappears; the historical website remains.

# BASE = DOCUMENT. ENHANCEMENT = EXPERIENCE.

---

# 31. Loading / Performance UX

Load semantic HTML first, then critical media, then current/next scene assets. Do not download eleven centuries before showing 879.

If a heavy future asset is not ready, show the scene's meaningful static baseline.

Archive routes should remain deliberately boring and reliable from a runtime perspective.

---

# 32. Route Transitions

Journey → Archive: short and functional.  
Archive → Journey: restore context, then subtle handoff.

No giant branded wipe every time someone reads a source.

---

# 33. URL State Rule

URLs represent meaningful navigation state:

Good:

`/journey#1869-brantas-bridge`  
`/archive/objects/prasasti-hantang`  
`/explore/places/jembatan-lama`

Bad:

animation-progress query parameters and internal playhead state.

---

# 34. Analytics Principle

Measure meaningful historical engagement:

- Journey starts;
- scene reach;
- evidence opens;
- archive transitions;
- timeline jumps;
- place exploration;
- mobile completion;
- performance/accessibility errors;
- return visits;
- deep-link use.

Abandoning the Journey is not necessarily failure if the visitor learned something meaningful.

---

# 35. Explicit Non-Goals for Core V1

No mandatory:

- gamification;
- user account;
- login to save progress;
- dark patterns;
- forced fullscreen;
- auto sound;
- AI chatbot;
- huge custom accessibility toolbar;
- infinite related-content carousel.

History itself is the product.

---

# 36. Language

Primary recommended language: Bahasa Indonesia. English can be a complete secondary locale.

`ID / EN` should preserve route and, where practical, scene context.

Translation does not duplicate facts; it changes editorial language only.

---

# 37. Error / Empty States

404 example:

# THIS PART OF HISTORY ISN'T HERE.

Then offer Journey / Search Archive.

Search no-result state must never fabricate content. Suggest aliases or Timeline.

---

# 38. Growth Model

The Journey stays curated. The Archive may grow to hundreds or thousands of records.

Community submissions may enter the Archive after provenance/rights review; they do not automatically enter the Journey.

---

# 39. 26-Scene Hierarchy

The system groups scenes by Acts, with hero and supporting status visible in Timeline. Optional folklore chapters remain clearly optional and return users to a known chronological point.

Every scene defines:

- start state;
- deep-link entry state;
- scroll state;
- stable reading/rest state;
- end state;
- exit transition.

Critical copy never exists only at one tiny scroll-progress instant.

---

# 40. Master Interaction Flow

```text
HOME
 ├── JOURNEY
 │    ├── Timeline
 │    ├── Evidence Drawer ──→ ARCHIVE
 │    └── Related Place/Theme
 │
 ├── EXPLORE
 │    ├── Timeline
 │    ├── Places
 │    └── Themes
 │
 ├── ARCHIVE
 └── SOURCES
```

Every deeper destination must be able to return to the exact historical context it came from.

---

# 41. MVP IA

Mandatory launch routes:

`/`  
`/journey`  
`/explore/timeline`  
`/explore/places`  
`/archive`  
`/sources`  
`/about`

Mandatory interactions:

- Journey scroll;
- Timeline jump;
- deep links;
- Evidence Drawer;
- Archive records;
- Place pages;
- search;
- Back restoration;
- sound toggle;
- reduced motion;
- keyboard;
- mobile adaptation.

---

# 42. Final UX Rule

The user must never need to understand ScrollTrigger, GSAP, route lifecycle, prefetch or scroll restoration.

They should experience only:

# I KNOW WHERE I AM.

# I KNOW WHAT HAPPENED.

# I CAN GO WHERE I WANT.

# I CAN SEE WHY THIS IS TRUE.

# I CAN COME BACK.

Final mandate:

# LET PEOPLE GET LOST IN THE STORY. NEVER LET THEM GET LOST IN THE WEBSITE.
