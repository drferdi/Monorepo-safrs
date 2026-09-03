# Motion Arc — Journey

The Journey is one continuous scroll from 2026 back to 879 and forward to
2026 again. Motion intensity is not constant: it is scored like a film.
Every section below carries one sentence of intent; the technique serves that
sentence and nothing else. Key statements (date, master line, name) are the
most animated moments; supporting beats stay quiet (`MOTION.read`).

Intensity scale: 1 = still, 5 = hardest cuts on the site.

## Act structure

| Movement | Sections | Emotion | Intensity | Motion language |
| --- | --- | --- | --- | --- |
| **Quiet opening** | Prologue, inscription interlude | Wonder, patience | 1–2 | Time-based credit (blur-to-sharp words), video surfaces; evidence cards wipe in under the reader's own scroll. Long holds, no hard edges |
| **The record begins** | Act I header, opening address, 879, 921, 1015, 1042 | Curiosity, recognition | 2–3 | Line-mask title card; typewriter breath; readability as an event (char sweep behind raking light); a name takes its seat (tracking collapse); stillness for the research hold; division done in space |
| **A capital that breathes** | Act II header, Daha, 1135, 1157, Panji | Confidence, growth | 3 | Media wipe on the title card; quiet rise over living video; convergence of words; the archive page turns |
| **Climax — the throne breaks** | Act III header, 1222, 1292, 1293 | Tension, rupture | 4–5 | Reflection first (scroll-synced word emphasis on black, the site's longest dwell), then the hardest cuts: snapped lines, tight staggers, surfaces pushed off-axis |
| **Afterlife of a kingdom** | Act IV header, jayabaya, shadow-archive; Act V header, 1678 | Memory, unease | 2–3 | Page turns and cuts return at lower amplitude; the river fortress keeps the fracture language but slower |
| **Iron and sugar** | Act VI header, sugar, 1869, 1906, 1912, people | Construction, momentum | 3–4 | Expansion from centre; assembly from the edges; page turn; lift |
| **Second climax — occupation and revolution** | Act VII header, 1942, 1947–1948, 1950 | Urgency | 4–5 | Fracture cuts, then the fastest machine-rhythm cuts on the site, then a page turn that closes the chapter in a document |
| **Industrial city** | Act VIII header, 1958, 1990 | Scale | 3 | Expansion; horizontal departure to the national market (distinct from 1958 by slug override) |
| **Resolution** | Act IX header, two-bridges, 2024–2026, finale | Calm, continuity | 2 → 1 | Assembly once more; a single line opens toward the horizon; the finale scales out slowly under scroll and settles into a still coda |

## Rules that keep the arc honest

1. **Scrubbed vs triggered is chosen per purpose.** Camera moves (surface,
   light, strokes, parallax, handoffs, finale image) are scrubbed with linear
   ease because they are the reader's hand on the dolly. Script moves (date,
   name, master line, beats, title cards) are triggered at progress thresholds
   with expressive eases and reverse honestly on scroll-back. The interlude and
   the Act III header are scrubbed on purpose: evidence and reflection are
   read at the reader's pace, not performed.
2. **No two adjacent sections share an entrance.** Choreography keys already
   alternate; the one adjacent duplicate (1958 → 1990) is broken by a
   code-owned slug override in the director.
3. **Reduced motion delivers everything, still.** Mobile and reduced-motion
   variants build no timelines; the composed reading state is the
   server-rendered DOM.
4. **Only transforms, opacity, clip-path, and CSS variables are animated.**
   Tracking effects are per-character `x` offsets, never `letter-spacing`.
5. **Intensity never rises twice in a row without a rest.** Each climax is
   followed by a text-led section (Act IV header, 1950 document) before the
   next build.
