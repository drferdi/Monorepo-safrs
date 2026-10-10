# Testing Guide: Sentra Web Harvester

## Unit Tests
Dijalankan via built-in test runner Node 24:
```powershell
pnpm run test
```
Cakupan:
- `resolveHttrackBinary`: Memverifikasi ketersediaan binary `httrack.exe`.
- `buildHttrackArgs`: Memverifikasi flag optimasi website teknologi, spoofing User-Agent, bypass robots, dan filter MIME.
- `htmlToCleanMarkdown`: Memverifikasi pembersihan cookie/ads dan retensi block code technical (mis. Rust, Python, TypeScript).

## Smoke Verification
```powershell
pnpm run smoke
```
Memverifikasi integrasi UI diagnostic, status runtime, dan parameter generator.
