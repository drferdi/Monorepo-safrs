# Rebrand log — Cora layout → Sentra Bot 2026

Design, CSS, class names, spacing, and assets stay original.
Only visible copy (and destination URLs) change, wave by wave.

## Wave 1 — Hero + Header + document meta (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| `<title>` | Give Cora your inbox. Take back your life. | Sentra Bot \| Agen Otonom untuk Indonesia |
| meta description | Cora is your $150,000 chief of staff… | Sentra Bot membantu Anda deploy agen AI otonom… |
| author link | darkroom.engineering | sentrahai.com |
| Logo `alt` | Cora logo | Logo Sentra Bot |
| Logo `aria-label` | Scroll to top | Kembali ke atas |
| Nav link | Log in → cora.computer/sign_in | Masuk → /workspace |
| Nav CTA | Start free trial → cora.computer/sign_up | Ajukan akses beta → /workspace |
| Hero H1 | Give Cora your inbox. / Take back your life. | Agen yang bekerja, / bukan sekadar chat. |
| Hero sub | Cora is the $150,000 chief of staff… | Sentra Bot — platform multi-agen local-first… |
| Hero CTA | Get Started → cora.computer/sign_up | Mulai → /workspace |

## Wave 2 — Testimonials marquee (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| 8 unique quotes (×10 each for marquee loop) | Cora / email / Every / cora.computer | Sentra Bot / agents / routines / Brief / sentrahai.com |
| Attribution names | Brett, Andrew, Mike, … | Raka Putra, Sari Wijaya, Andi Pratama, … (text only; photos unchanged until image wave) |
| Roles | Founder at / CPO at / … | Operator di / Lead produk di / … |

**Next wave:** Demo sections (`DemoDesktop` + `DemoMobile`) — still say “Cora screens your email”.

## Wave 3 — Demo desktop + mobile (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| H3 #1 | Cora screens your email | Sentra Bot triages your work |
| Body #1 | …emails…inbox… | …tasks…human decision…in view… |
| CTA #1 | Start your free trial | Ajukan akses beta |
| H3 #2 | Cora drafts responses in your voice | Agents draft actions in your voice |
| Body #2 | …email history… | …history…next step… |
| CTA #2 | Get Started | Mulai |
| Mock label | Cora Draft | Agent Draft |
| Mock subject / body | DSA / DocuSign email | Permission card / sandbox Allow–Deny |
| Links | cora.computer/sign_up | /workspace |

**Next wave:** Brief section (`The rest gets Briefed`).

## Wave 4 — Brief (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| Body | Twice a day, Cora… inbox… | Twice a day, Sentra Bot… agents handled… ops… |
| CTA | Get Started → cora.computer | Mulai → /workspace |
| Chip | All accounts | All agents |
| Image alts | /images/emails/N.png | Brief card N |
| Kept | “The rest gets *Briefed*”, “Today’s Brief”, Morning/Afternoon | Product vocabulary (Brief) |

**Next wave:** Features (`Cora learns you inside and out`).

## Wave 5 — Features (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| H2 | Cora learns you inside and out | Sentra Bot learns you inside and out |
| Item 1 title | Cora gets to know you, automatically | Agents get to know you, automatically |
| Item 1 body | …email patterns… | …work patterns…ops… |
| Item 2 title | Shape Cora through conversation | Shape agents through conversation |
| Item 2 body | …chief of staff…email… | …teammates…tasks… |
| CTA | Get Started → cora.computer | Mulai → /workspace |

**Next wave:** Privacy (`Security and privacy are built in`).

## Wave 6 — Privacy (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| Kept | Security and privacy are built in / We never train… / Top security standards | — |
| LLM line | …share your emails with LLMs… | …call LLMs with your BYOK keys… |
| Visibility | No one can see your emails | …transcripts / local data |
| Permissions | Cora can’t send or delete emails | Agents can’t act without permission / Allow–Deny card |
| Compliance | Google Verified / CASA Tier 2 | local-first, sandboxed, human-gated |

**Next wave:** Pricing.

## Wave 7 — Pricing (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| Kept | Pick a plan / Yearly–Monthly / Professional–Unlimited / $20–$39 | Price UI structure |
| Features | email accounts / AI Inbox / Pre-drafted… | agent seats / triage & routines / permission-gated drafts / Brief |
| Unlimited note | Everything in Basic | Everything in Professional |
| CTA | Start free trial → cora.computer | Ajukan akses beta → /workspace |
| Bundle | Every + Cora/Spiral/Sparkle | self-host full Sentra Bot stack… BYOK |
| Footer CTA | Subscribe to → every.to | Kunjungi → sentrahai.com |

**Next wave:** FAQ.

## Wave 8 — FAQ (2026-08-21)

All 12 Q&A rebranded to Sentra Bot (permission broker, BYOK, local-first, Brief, agent seats).  
“What is Every?” → “What is Sentra?” with sentrahai.com.  
Heading kept: Frequently asked questions.

**Next wave:** Footer.

## Wave 9 — Footer (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| H3 | Free Yourself from Email | Free Yourself from Busywork |
| Body | Let Cora handle your emails… | Let Sentra Bot handle the busywork… |
| CTA | Start your free trial → cora.computer | Ajukan akses beta → /workspace |
| Nav | Log In / Privacy / Terms → cora/every | Masuk → /workspace; Privacy/Terms → sentrahai.com |

## End-to-end status (2026-08-21)

- Waves 1–9 complete on `src/html/**` + `index.html` meta.
- Verified: **0** matches for `Cora`, `cora.computer`, `Gmail`, `Get Started`, `Start free trial`, `Log in` under `src/` and root `index.html`.
- Left intentionally: `original/` archive, `content-clean.md` capture notes, unused root `assets/*.js` Next chunks (not loaded by Vite app).
- Images/logo PNG rebranded to Sentra Bot in waves 11-16 — see `IMAGE-SWAP.md`.

## Wave 10 — Bahasa Indonesia penuh (2026-08-21)

Seluruh copy visible di `src/html/**` + meta `index.html` dialihkan ke Bahasa Indonesia.
Istilah produk teknis yang dipertahankan: Sentra Bot, BYOK, Brief, LLM, sandbox, local-first, self-hosted, Professional/nama paket yang sudah diganti ke Profesional / Tanpa batas.
`lang="id"` pada dokumen.
