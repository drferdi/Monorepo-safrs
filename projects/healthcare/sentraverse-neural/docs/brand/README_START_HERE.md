# SENTRAVERSE / COMPLETE BRAND IDENTITY KIT v1.0

**Deliverable:** identity guidelines, practical brand files, editable templates and digital-ready assets.  
**Date:** 09 October 2026  
**Owner/creator:** dr. Ferdi Iskandar (Drferdi)  
**Site:** https://sentrahai.com  
**Status:** **PROPOSED FOR APPROVAL** (not an assertion of final corporate adoption).

## First files to open

1. **`01_Brand_Guidelines/Sentraverse_Brandbook_v1.pdf`** - illustrated 20-page overview with logo usage, palette, type, editorial standards, product architecture and release rules.
2. **`01_Brand_Guidelines/Sentraverse_Quick_Reference_1page.pdf`** - practical brand overview on one landscape page.
3. **`01_Brand_Guidelines/Sentraverse_Brand_Standards_Editable.docx`** - editable long-form handbook; **`Sentraverse_Full_Standards.md`** is an additional plain-text source.
4. **`02_Logo_Assets/01_Source/Sentraverse_Original_Supplied_RGBA.png`** - exact master image from the user, with no modifications.
5. **`04_Brand_Templates/Sentraverse_Corporate_Deck_Editable.pptx`** - 10-slide, editable PowerPoint narrative deck.

## Directory guide

| Folder | Contents |
|---|---|
| `01_Brand_Guidelines/` | Brandbook PDF, quick reference, full written manual (DOCX and Markdown). |
| `02_Logo_Assets/` | Original master, approved-looking PNG monochrome outputs, traced SVG approximations, icon PNGs. |
| `03_Design_System/` | CSS custom properties, JSON token values and integration instructions. |
| `04_Brand_Templates/` | Editable corporate PPTX deck and DOCX letterhead, HTML email signature. |
| `05_Communication_Assets/` | Open Graph art, LinkedIn banner, social tile and bilingual messaging guidance. |
| `06_Governance/` | Provenance ledger, official approval checklist, package checksum manifest. |

## Important usage decisions

- **Primary authority:** use the PNG in `01_Source/` for exact original shape, color and lettering. PNG variants are recolored/cropped derivatives.
- **SVG accuracy:** the supplied artwork was PNG. Included SVGs are pixel-contour traces (silhouette approximations), **not** official native vector source files. Ask the creator for AI/SVG/EPS master if one exists.
- **Design palette:** Graphite and monochrome are inspired by the supplied artwork. Signal teal, type system, language recommendations, layout and usage values are **new proposals**, not an already-approved Sentra standard.
- **Fonts:** Inter is recommended but deliberately **not redistributed**. Obtain fonts from an authorized font distributor.
- **Clinical integrity:** do not publish unverified clinical results, certifications, or promises of medical outcomes.
- **Routing integrity:** this branding ZIP is non-destructive and does **not** change the Next.js application. Keep rewrites for `/dashboard/*` to MedBoard and `/asisten-medis/*` to Assistverse.

## Standard workflows

**For designers:** start with the brandbook, then select PNG or traced SVG based on reproduction needs. Use white reverse on Void/Graphite; use ink on Paper/White.

**For marketing:** review the bilingual messaging playbook and obtain product-owner confirmation for new claims.

**For engineering:** read `03_Design_System/README_Integration.md` before adding any proposed token. Verify responsive behavior, typography, WCAG contrast, keyboard focus, motion preference and the original reverse proxy configuration.

## Acceptance and handoff

Use the governance checklist for sign-off. The files are ready to review; official approval, trademark research, font licenses, clinical/regulatory review and deployment verification are **outside** this asset-creation task.

_Architect & Built by dr Ferdi Iskandar (the Gaffer)._ 
