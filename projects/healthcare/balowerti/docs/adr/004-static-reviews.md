<!-- Drferdi's vision, brought to life. -->

# ADR-004: Google Reviews Stored as Static JSON

**Date:** 2025-12-01
**Status:** Accepted
**Deciders:** dr. Ferdi Iskandar, Sentra Healthcare Solutions

---

## Context

The Testimonials section displays real patient reviews from Google. The team
needed to decide how to fetch and display these reviews.

## Decision

Fetch Google Places reviews **once** via a build-time Node.js script
(`scripts/sync-google-reviews.mjs`) and store the result as
`public/data/google-reviews.json`. The React component fetches this static
file at runtime with `cache: 'no-store'`.

## Rationale

- **Security:** `GOOGLE_MAPS_API_KEY` is never exposed to the browser bundle.
  It is only used in the sync script, which runs in a trusted Node.js environment.
- **Performance:** No Google API round-trip on page load. Reviews load from the
  same static file server as all other assets.
- **Reliability:** Page works even if Google Places API is temporarily unavailable.
- **Cost:** Avoids per-page-view Google Places API charges.

## Consequences

**Positive:**
- Zero risk of API key exposure in browser.
- Eliminates Google API as a runtime dependency.
- Consistent review data (not affected by Google API rate limits).

**Negative:**
- Reviews are stale until `npm run sync:reviews` is run and the site is redeployed.
- Automated freshness requires a scheduled CI workflow (not yet implemented — see `CHANGELOG.md [Unreleased]`).

## Sync Script

```bash
GOOGLE_MAPS_API_KEY=your_key npm run sync:reviews
# Output: public/data/google-reviews.json
# Then commit and redeploy to update displayed reviews.
```

## Future Improvement

Add a scheduled GitHub Actions workflow that runs `sync:reviews` weekly,
commits the updated JSON, and triggers a Railway redeploy.
