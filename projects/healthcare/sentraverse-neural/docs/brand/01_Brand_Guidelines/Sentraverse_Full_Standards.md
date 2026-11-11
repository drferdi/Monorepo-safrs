# SENTRAVERSE BRAND IDENTITY SYSTEM
**Brand standards & usage manual | Version 1.0 / 09 October 2026**

**Status:** Working proposal for owner approval. Logo geometry comes from the provided master artwork. Palette, typography, spacing and messaging guidance are newly proposed directions.

**Prepared for:** Sentra Healthcare AI  
**Creator / owner:** dr. Ferdi Iskandar (Drferdi)  
**Domain:** sentrahai.com

## 01 — Strategic identity

**Brand role.** Sentraverse is the public-facing brand and navigation gateway for Sentra Healthcare AI. It tells the story, introduces the ecosystem and helps users reach separate products. It is **not** the clinical decision engine and must not be described as offering autonomous clinical decisions.

**North star.** An unmistakable entry point to an interconnected healthcare intelligence ecosystem built around Indonesian clinical realities.

**Purpose.** Make Sentra Healthcare AI understandable, trustworthy, and discoverable - without positioning the public gateway as the clinical decision engine.

**Promise.** Clinical technology explained with clarity. Human decisions remain central.

**Vision.** A connected healthcare future, grounded in the needs of Indonesia.

**Primary tagline:** One connected vision.  
**Supporting line:** Healthcare intelligence, built for Indonesia.

**Positioning sentence.** Sentraverse is the public brand and navigation gateway for Sentra Healthcare AI; it introduces connected products, research priorities, and the people behind the mission.

## 02 — Brand architecture

| Layer / property | Position | Branding implication |
|---|---|---|
| Sentra Healthcare AI | Parent organization / ecosystem | Parent endorsement in corporate materials |
| Sentraverse | Public gateway | Master identity for sentrahai.com pages |
| MedBoard | Clinical cockpit | Distinct product identity; gateway linking to /dashboard |
| Assistverse / Asisten Medis | Medical-assistant access | Distinct product identity; gateway linking to /asisten-medis |
| Avery | Hermes agent | Product-specific narrative, only confirmed capabilities |
| SideLab | Research engine | Differentiate scientific ambition from published evidence |
| MANTRA | Hospital ERP | Product claims to be confirmed before publication |

**Infrastructure rule:** The Sentraverse public website is a navigation and marketing layer. Existing rewrites for `/dashboard` (MedBoard via `SENTRA_DASHBOARD_URL`) and `/asisten-medis` (Assistverse via `SENTRA_ASSISTVERSE_URL`) are critical and must remain intact in `next.config.mjs`. Brand assets and CSS tokens have no authority to change routing or backend functions.

## 03 — Logo and optical use

**Primary asset:** the user-supplied transparent PNG is authoritative for original geometry and custom lettering. The central aperture and branching terminals are signature identifying features.

**Delivered variants:** source RGBA master; ink and reverse-white lockups; monochrome neuron-only mark; wordmark-only; traced SVG versions. SVG is a **vector silhouette traced from pixels**, not an authenticated original vector master. Use the original PNG for high-fidelity reproduction until an original outline file is approved.

**Clear space (proposed):** at least **0.5× the diameter of the central neuron aperture** on all sides of the artwork's visible bounds. Increase to 1× on banners and busy layouts.

**Minimum sizes (proposed):** stacked logo 180 px wide digital / 35 mm print; icon 32 px for UI only, 48 px when brand recognition matters; wordmark 120 px digital. Confirm legibility on each actual background and screen class. The supplied stacked primary artwork is not suitable for 16 px favicons; simplified rendered favicon assets need optical review.

**Backgrounds:** use graphite on Paper/White; use reverse White on Void/Graphite. Deep Signal on light canvas can be used as a campaign variant, not as default master. No stretching, distortion, extra node shapes, gradient fills or improper low-contrast overlays.

## 04 — Color

| Name | HEX | Use |
|---|---|---|
| Void | `#0B0D10` | Primary dark canvas |
| Graphite | `#151515` | Master artwork ink |
| Paper | `#F7F8F8` | Primary light canvas |
| White | `#FFFFFF` | Reverse surface |
| Slate | `#52616B` | Secondary body text |
| Silver | `#ADB9BD` | Decorative and metadata |
| Mist | `#DCE4E5` | Borders and dividers |
| Signal | `#21BFAE` | Accent - never white body text |
| Signal Deep | `#086F66` | Accessible action/link option |

**Contrast checkpoints (WCAG calculation):** Ink/Paper **17.16:1**, Paper/Void **18.29:1**, White/Signal Deep **6.04:1**. White on bright Signal **2.3:1**; never use that pairing for small body text. All pairings must be checked in their final type size.

**Usage ratio:** ~70% neutral surfaces, ~20% deep typographic contrast, <=10% Signal accent. Accent is for states, lines and selective calls to action, not dense paragraphs.

## 05 — Typography and hierarchy

**Proposed family:** Inter with system fallback Arial / Helvetica / sans-serif. Acquire fonts from the font vendor/source directly; the brand package does not redistribute font binaries.

**Type scale:** Display 64–88 px/1.02; H1 48–64 px/1.10; H2 32–40 px/1.15; H3 24–28 px/1.25; body 16–18 px/1.55; labels 12–14 px/1.35. Desktop values are starting points, to be made responsive.

**Editorial rules:** sentence case headings; maximum 65–75 characters per long-form line; strong contrast; consistent left edges; one high-impact idea per panel. Use 400/500 weight for paragraphs, 600/700 for headings. Avoid text over the fine terminal nodes of the neuron.

## 06 — Layout and shape language

**Grid:** 12 columns above 1024 px, 6 columns on tablets, 4 columns on mobile. Use a 4 px spacing unit, 1200 px max content width, and responsive side gutters of 20–64 px. The hero should have one statement, one meaningful action and one supporting visual.

**Surfaces:** light Paper, dark Void, Mist borders. Corner radii: 6 px (small controls), 12 px (cards), 20 px (feature containers). Thin connector lines and orbital paths may quote the neuron without becoming a decorative network of random dots.

**Motion:** 160 ms micro interaction, 240 ms standard transition, 420 ms entrance; honor reduced-motion preference. Clinical credibility depends on restraint: no constant pulsing or frantic particle animation near decision-sensitive copy.

## 07 — Imagery and graphic direction

Prioritize authentic care settings, human-centered clinical teamwork, and precise industrial or scientific still life. When artificial or conceptual visuals are used, label them clearly when factual interpretation is possible. Maintain neutral, natural color and spatial calm. Avoid stereotyped robot doctors, unsupported clinical dashboards or images implying deployment or validated outcome when the image is illustrative.

**Graphic signature:** curved branching connections, discrete terminal dots, negative-space apertures, and orthogonal layout grids. The neuron's geometry is the primary identifier; derivative pattern artwork should be subordinate.

## 08 — Verbal identity (Bahasa Indonesia first)

**Hero ID:** Satu visi, layanan kesehatan yang lebih terhubung.  
**Hero EN:** One connected vision for healthcare.  
**Subheading ID:** Jelajahi ekosistem Sentra Healthcare AI yang dibangun dengan memahami kebutuhan layanan kesehatan Indonesia.  
**Subheading EN:** Explore a connected healthcare AI ecosystem grounded in Indonesian care workflows.

**Primary CTA ID:** Jelajahi Ekosistem / Pelajari MedBoard.  
**Primary CTA EN:** Explore the ecosystem / Discover MedBoard.

**Microcopy:** Use "Pelajari cara kerja" rather than "AI paling cerdas"; use "Dirancang untuk mendukung tenaga kesehatan" rather than "Menggantikan keputusan dokter".

**Taglines** are creative proposals and should be reviewed for legal clearance / exclusivity before external use.

## 09 — Voice principles

- **Confident, not absolute:** Write specific capabilities and verified outcomes; avoid claims of guaranteed accuracy or patient benefit.
- **Human, not robotic:** Lead with clinician and patient needs; use technology as the enabling subject.
- **Precise, not dense:** Replace inflated AI terminology with short explanations and concrete examples.
- **Local, not insular:** Use Indonesian healthcare context authentically while remaining accessible to international audiences.

## 10 — Trust, responsibility and regulated-context writing

Marketing claims must not imply diagnosis, treatment, surveillance or safety performance without verified documentation. Sentraverse is a public gateway, not a clinical decision tool. In product descriptions, distinguish "designed to support" from "clinically validated". Do not expose health data, patient imagery, names, or records in demonstrations without proper consent and controls.

Before release: verify product availability and claims with product owners, confirm local legal/privacy requirements, review image permissions, check disclaimers, perform contrast/keyboard navigation checks, and verify the proxy routes still work.

## 11 — Digital design application

**Buttons:** primary on light = Void background / White text; primary on dark = Paper background / Ink text; teal accent may highlight icon/indicator, not substitute tested body text. 44x44 CSS px recommended minimum interactive target size for touch controls. Use an explicit focus ring and readable hover states.

**Hero structure:** Eyebrow (SENTRA HEALTHCARE AI), human-first headline, one short supporting paragraph, primary CTA, restrained secondary CTA and neuron artwork in safe negative space.

**Implementation:** use `03_Design_System/Sentraverse_Tokens.css` and token JSON. These assets can be integrated into Next.js 16 / React 19 / Tailwind CSS without changing `next.config.mjs` or importing product source from sibling capsules.

## 12 — Applications and templates

Logo master is suitable for web navigation, pitch decks, letterhead, signed public documents and social covers when adequate clear space is reserved. Included deliverables: editable PPTX, editable DOCX guidelines and letterhead, HTML signature, social cards, Open Graph image and web-ready assets. Avoid presenting draft templates as operational approval or official legal stationery without stakeholder sign-off.

## 13 — QA acceptance criteria

1. Original master PNG byte-for-byte preserved and present in source folder.
2. All PNG derivatives retain transparency as needed and crop without removing branching terminals.
3. Dark/light lockups remain readable on intended surfaces.
4. SVG derivative is identified as traced and visually checked against master silhouette.
5. All PDF/DOCX/PPTX pages render without clipped titles, hidden copy or overlap.
6. Color contrast and hover/focus states are verified for actual UI components.
7. Public marketing wording avoids unverified efficacy and regulatory claims.
8. Website routing for `/dashboard` and `/asisten-medis` remains untouched in the shipped brand package.

## 14 — Approval and stewardship

**Decision owner:** dr. Ferdi Iskandar / Sentra Healthcare AI.  
**Status:** Proposed; pending owner acceptance.  
**Review on change:** logo geometry, primary palette, product taxonomy, naming, regulated claims, or brand positioning.  
**Version convention:** major (system or master identity), minor (approved guideline update), patch (typos/assets only).  
**Asset source hierarchy:** supplied original PNG > approved master vector (if subsequently provided) > supplied PNG-derived variants > traced silhouette (approximation).

_Architect & Built by dr Ferdi Iskandar (the Gaffer)._  
_Guidelines packaged 09 October 2026 for review._
