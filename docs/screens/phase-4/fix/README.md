# Phase 4 — QA review round 1

Production-preview screenshots at deviceScaleFactor 2, saved at CSS resolution.
Each gameplay case uses fast mode and waits 2.5 seconds after placement.

The 392 gameplay images cover all 48 authored levels at their own worst-case
legal stack (fixed side unchanged), seven Sandbox arrangements, and Practice,
at 844×390, 1366×768, 1024×768, 1920×1080, 390×844, 360×740 and 768×1024.
Sandbox filenames identify the filled side and shape; `both-full` is left
10+9+8 versus right 7+6 plus six frogs. Result navigation is held through the
hidden test API so completed levels remain available for inspection; success
and beam physics still evaluate normally.

Six additional images show Title and World Map at 1366×768, 844×390 and 390×844.

Regenerate with:

```bash
QA_SCREENSHOTS=1 npm run test:e2e -- --project=chromium-desktop --workers=2 \
  tests/e2e/qa-gameplay-layout.spec.ts tests/e2e/qa-meta-layout.spec.ts
```

Geometry regressions use the actual rotated beam shaft and the end rings.
The enclosing axis-aligned beam bounds include empty triangular space under
its tilt, so that rectangle alone cannot detect a visual collision.

See PR #5 and its QA summary for the accepted layout rules and full CI results.
