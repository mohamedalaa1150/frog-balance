# خطة التنفيذ: المراحل ومعايير القبول والبرومبتات الجاهزة لـ Codex

## كيف ندير المشروع (دورة العمل)

```
┌──────────┐  1. برومبت المرحلة   ┌──────────┐  2. ينفّذ ويفتح PR  ┌──────────┐
│  محمد    │ ───────────────────▶ │  Codex   │ ─────────────────▶ │  GitHub  │
└──────────┘                      └──────────┘                    └──────────┘
     ▲                                                                 │
     │ 5. تقرير QA = برومبت إصلاح جاهز                                 │ 3. «المرحلة X جاهزة»
     │                                                                 ▼
┌──────────┐  4. clone + npm run check + لعب آلي (Playwright) + لقطات ┌──────────┐
│  Claude  │ ◀──────────────────────────────────────────────────────── │  محمد    │
└──────────┘
       تتكرر 1→5 حتى تنجح كل معايير القبول ✅ → دمج PR → المرحلة التالية
```

### خطوات الإعداد (مرة واحدة)
1. **اعمل Repository جديد على GitHub** باسم `frog-balance`، ويفضّل يكون Private.
2. **ارفع محتويات الحزمة دي في الـ repo كما هي:**
   - `AGENTS.md`
   - فولدر `docs/` بالكامل
   - فولدر `content/` بالكامل
   - فولدر `tools/` بالكامل
3. **وصّل Codex بالـ repo:** من ChatGPT ← Codex ← Connect GitHub ← اختار `frog-balance`.
4. **ابدأ أول مرحلة:** الصق في Codex «برومبت المرحلة 0» اللي تحت.
5. **لما Codex يفتح PR:** ابعتلي جملة واحدة: «المرحلة 0 جاهزة»، ومعاها لينك الـ repo. ساعتها هسحب الفرع وأختبره وأرجّعلك تقرير.
6. **التقرير اللي هيرجعلك:** هيبقى **برومبت إصلاح** جاهز تلصقه في Codex على نفس الـ PR. ولو مفيش أخطاء هقولك: «ادمج وابدأ المرحلة التالية».

> **ملاحظة:** الملف `AGENTS.md` Codex بيقراه لوحده في كل مهمة. علشان كده البرومبتات قصيرة نسبيًا، وبتحيل للوثائق بدل ما تكرر محتواها.

---

## جدول المراحل

| # | المرحلة | الناتج | تقدير الجهد (دورات Codex) |
|---|---|---|---|
| 0 | التأسيس والأدوات | مشروع شغّال، فيه نص عربي سليم، وكل السكربتات والاختبارات بتعدّي | 1–2 |
| 1 | المنطق الأساسي (core) | دوال الميزان والمستويات والتلميحات والنجوم والمولّد، وكلها مغطاة باختبارات | 1–2 |
| 2 | الشريحة الرأسية | ميزان حقيقي فيه سحب وإفلات، ووضع العدّ، واللعب الحر، ورسومات مؤقتة | 2–3 |
| 3 | كل أوضاع اللعب | الأوضاع الخمسة، والتلميحات، والتغذية الراجعة، والنجوم، والـ 48 مستوى | 3–4 |
| 4 | الهيكل والتقدّم | الشاشات، والخرائط، والحفظ، والإعدادات، وبوابة الكبار، ولوحة المتابعة، والتدريب | 2–3 |
| 5 | الجودة عبر المنصات | تجاوب الـ Portrait، وإمكانية الوصول، والأوفلاين PWA، والأداء | 2 |
| 6 | الفن والصوت النهائي | استبدال الرسومات والأصوات المؤقتة، وتلميع الحركة | 1–2 بعد ما الأصول تجهز |
| 7 | التغليف والإطلاق (اختياري) | Android/iOS عن طريق Capacitor، وحزمة SCORM، ونشر | 1–2 |
| UAT | اختبار مع أطفال | 5 أطفال، وتقرير، وتعديلات | — |

**بالتوازي مع المراحل من 1 لـ 5:** فريق التصميم يجهّز الرسومات والأصوات حسب `docs/05-assets.md`.

---

## المرحلة 0: التأسيس والأدوات

### معايير القبول
| ID | المعيار |
|---|---|
| P0-1 | الأوامر `npm ci` ثم `npm run dev` بتفتح شاشة فيها خلفية ونص عربي بخط Baloo Bhaijaan 2، والحروف متصلة صح واتجاهها RTL، والأرقام مشرقية «١٢٣». |
| P0-2 | كل السكربتات في spec بند 15 موجودة، والأمر `npm run check` بينجح بالكامل. |
| P0-3 | الأمر `window.__FROG__.ready` بيشتغل في وضع `?test=1`، والأمر `version` بيرجّع رقم الإصدار. والـ API **مش متاح** في build الإنتاج من غير `?test=1`، وده عليه اختبار E2E. |
| P0-4 | فيه 4 مشاريع Playwright متعرّفة، واختبار `boot.spec.ts` بيعدّي على الأربعة. |
| P0-5 | سكربت `validate:content` بيقرأ `content/levels.json` ويتحقق منه بـ zod (48 مستوى). |
| P0-6 | فيه README بالإنجليزي، وفيه طريقة التشغيل. |
| P0-7 | مفيش أخطاء في الـ console. |

### البرومبت (الصقه في Codex كما هو)
```text
Read AGENTS.md, then docs/02-technical-spec.md fully, and skim docs/01-game-design.md.

TASK — Phase 0: Project scaffold & tooling (branch: phase-0-scaffold).

Build the empty but production-grade foundation:
1. Vite + TypeScript (strict) + Phaser 3 (latest 3.x, pinned). index.html with lang="ar" dir="rtl", mobile viewport, theme-color, no-zoom, touch-action none on the game container, safe-area padding.
2. Folder structure exactly as spec §3 (create empty modules with TODO headers where later phases fill them).
3. Self-hosted font @fontsource/baloo-bhaijaan-2 (500/700/800). BootScene must await document.fonts.load before creating any text.
4. src/core/numerals.ts with formatNumber(n, 'arabic-indic'|'western') + unit tests.
5. A temporary TitleScene showing a gradient pond background (Graphics), the Arabic title "ميزان ضفدوع" (rtl:true) and the digits ١٢٣٤٥٦٧٨٩١٠ rendered via formatNumber, scaled with Scale.RESIZE.
6. src/testing/testApi.ts implementing at least: ready, version, gotoScene, events — enabled only in DEV or with ?test=1 (spec §9). Remaining methods can throw "not implemented in phase 0".
7. src/core/levelSchema.ts with the zod schema from spec §6, and `npm run validate:content` that validates content/levels.json (expects 48 levels; solvability check comes in Phase 1).
8. ESLint (flat config, typescript-eslint) + Prettier; Vitest with coverage config (threshold 90% for src/core/**); Playwright config with the 4 projects from spec §16 and webServer running `npm run preview`.
9. All npm scripts from spec §15, including `check`.
10. E2E: tests/e2e/boot.spec.ts (title visible via __FROG__.ready, no console errors) and tests/e2e/test-api-gating.spec.ts (API absent on production preview without ?test=1, present with it).
11. README.md (English): setup, scripts, how test mode works.

Acceptance criteria P0-1 … P0-7 are in docs/03-roadmap.md. Finish with the summary format from AGENTS.md and open a PR "Phase 0: Scaffold".
```

---

## المرحلة 1: المنطق الأساسي (src/core)

### معايير القبول
| ID | المعيار |
|---|---|
| P1-1 | فيه `balance.ts` بيطبّق المعادلة اللي في spec بند 5 بالظبط، ومعاه جدول اختبارات: الفرق 0 يدّي 0°، والفرق ±1 يدّي ±6°، والفرق ±2 يدّي ±9°، والفرق ±5 يدّي ±18°، والفرق ±9 يدّي ±20°. |
| P1-2 | الدالة `canPlace` بتطبّق قيود السعة: 3 أرقام، أو 10 ضفادع، أو في الحالة المختلطة رقمين و6 ضفادع. |
| P1-3 | فيه `levelLogic.ts` بيقيّم الأهداف `balance` و`balanceMulti` و`predict`، وبيطلّع الحلول القانونية للوضع `bond`، والحلول المكررة مش بتتحسب. |
| P1-4 | فحص قابلية الحل بينجح على الـ 48 مستوى، وبيفشل على 5 مستويات خربانة متعمّدة جوه الاختبارات. |
| P1-5 | فيه `hints.ts` كآلة حالات: الخمول، و3 محاولات، والطلب اليدوي، كلهم بيرفعوا المستوى خطوة خطوة لحد 3، والوقت بيتحقن (injectable clock). |
| P1-6 | فيه `scoring.ts`: النجوم، وتصنيف الأخطاء الأربعة اللي في spec بند 7. |
| P1-7 | فيه `generator.ts`: نفس الـ seed بيطلّع نفس النتيجة، وكل مستوى بيطلع قابل للحل، والتكيّف بيشتغل: النطاق بيكبر بعد 3 صح، ويصغر بعد 2 غلط. |
| P1-8 | فيه `progress.ts`: قواعد الفتح، و`migrate` بتتعامل مع null وJSON بايظ ونسخة قديمة. |
| P1-9 | تغطية `src/core` 90% أو أكتر (lines وbranches)، ومفيش أي import لـ Phaser جوه core. وده متطبّق كقاعدة ESLint `no-restricted-imports`. |

### البرومبت
```text
Read AGENTS.md and docs/02-technical-spec.md §4–§8 carefully; read docs/01-game-design.md §5–§7 for behaviour.

TASK — Phase 1: Pure core logic (branch: phase-1-core). No rendering work in this phase.

Implement in src/core/ (pure TS, zero Phaser/DOM imports — add an ESLint no-restricted-imports rule that enforces this for src/core/**):
- types.ts (spec §4)
- balance.ts: weightOf, panWeight, diff, beamAngle (spec §5 exactly: base 6°, step 3°, max 20°, positive = right side down), canPlace (capacity rules), isBalanced.
- levelLogic.ts: createLevelState(level), applyAction(state, action) as a pure reducer for actions place/remove/predict/requestHint/settle/tick; goal evaluation for 'balance', 'balanceMulti' (canonical solution strings, duplicates detected), 'predict'; enumerateSolutions(level); isSolvable(level) per spec §6.
- hints.ts: hint state machine (idle threshold from settings, 3 failed attempts, manual request; levels 0→3; reset rules) with injectable clock.
- scoring.ts: stars + error classification (spec §7).
- generator.ts: seeded generator for practice mode producing valid Level objects for any unlocked mode, with adaptive band (3 correct → harder, 2 wrong → easier). Every generated level must pass isSolvable.
- progress.ts: SaveV1 model, defaults, migrate(raw), unlock rules (spec §8).
- rng.ts: mulberry32.

Extend `npm run validate:content` to run isSolvable on all 48 levels and print a table.

Tests (Vitest): table-driven tests for every function; property-style loops for generator (1 000 seeds); fixtures with 5 intentionally broken levels that must fail validation; reducer tests that replay full play-throughs of one level per mode. Coverage ≥ 90% lines AND branches for src/core.

Acceptance criteria P1-1 … P1-9 in docs/03-roadmap.md. Return the AGENTS.md summary and open PR "Phase 1: Core logic".
```

---

## المرحلة 2: الشريحة الرأسية (الميزان + العدّ + اللعب الحر)

### معايير القبول
| ID | المعيار |
|---|---|
| P2-1 | فيه `placeholderArt.ts` بيولّد كل الـ texture keys اللي في `05-assets.md` بند 1، ومفيش أي texture ناقص («__MISSING»). |
| P2-2 | الميزان شكله صح: ضفدوع كقاعدة، والذراع بيلف حوالين المحور، والكفوف **أفقية دايمًا** ومعلّقة في أطراف الذراع. |
| P2-3 | حركة الزنبرك بتستقر في أقل من 700 مللي ثانية. وفي وضع تقليل الحركة، الانتقال tween واحد مدته 200 مللي ثانية. والفرق بين `getBeamAngle()` بعد الاستقرار وقيمة `beamAngle(diff)` أقل من 0.5°. |
| P2-4 | السحب بالماوس واللمس شغال حقيقي، ومتختبر بـ `page.mouse` و`touchscreen` عن طريق `getPointerTarget`. ومنطقة الإفلات = الكفة × 1.5. والإفلات برّه بيرجّع العنصر لمكانه بحركة. |
| P2-5 | النقر على كومة الضفادع بيحط ضفدع في الكفة النشطة، والنقر على عنصر جوه الكفة بيرجّعه. |
| P2-6 | العناصر الثابتة عليها قفل، ومش بتتسحب، وبتهتز لو الطفل حاول. |
| P2-7 | العناصر جوه الكفة بتترتب في شبكة من غير تداخل، لحد الحد الأقصى للسعة، ولو زادت بيظهر تأثير «الكفة اتملت». |
| P2-8 | وضع العدّ شغال للمستويات من w1-l1 لـ w2-l5: العدّ الصوتي بيشتغل (بـ speechSynthesis أو بصوت مؤقت)، والنجاح بيتحسب بعد ثانية استقرار، وبيظهر احتفال مؤقت. |
| P2-9 | اللعب الحر شغال: كل الأرقام والضفادع متاحة على الكفتين، وزرار «اقرأ لي» بيقرأ الحالة. |
| P2-10 | ضفدوع بيبص ناحية الكفة الأتقل، وبيبتسم عند التوازن (تبديل frames مؤقتة). |
| P2-11 | اختبارات E2E للعدّ والسحب الحقيقي بتعدّي على الـ 4 مشاريع، ومفيش أخطاء في الـ console. |

### البرومبت
```text
Read AGENTS.md, docs/02-technical-spec.md §3, §5, §9–§13, docs/01-game-design.md §4, §5.1, §5.6, §6.1, §7, §8, §9.1 and docs/05-assets.md §1.

TASK — Phase 2: Vertical slice — the balance, drag & drop, Count mode, Sandbox (branch: phase-2-vertical-slice).

1. src/placeholder/placeholderArt.ts: generate every texture key in docs/05-assets.md §1 with Graphics.generateTexture at the listed size (simple, friendly shapes; number tiles render digits via formatNumber and the Baloo font; frog = rounded green body + eyes). Must be swappable later by an atlas with the same keys.
2. objects/Balance.ts: mascot base, beam rotating around pivot, two pans hanging level from beam ends at all times; spring animation per spec §5 (stiffness 120, damping 14) driven from LevelState diff; reduced-motion path.
3. objects/Pan.ts: drop zone (1.5× bounds), grid layout of items without overlap, capacity rejection feedback, active-pan glow.
4. objects/PlaceableItem.ts, FrogPile.ts, NumberTray.ts: drag (mouse/touch/pen) with lift scale + shadow, drop to pan → dispatch 'place' to the core reducer; invalid drop → tween back; tap-to-place on pile/tray (goes to the active work pan); tap item on pan → return. Infinite sources. Fixed items show lock badge, shake on drag attempt.
5. objects/Mascot.ts: looks toward heavier side, smiles when balanced.
6. GameScene + LevelController wiring core reducer ↔ view; settle detection (1 000 ms, 0 in fast mode); success → placeholder celebration (particles + mascot jump) → for now return to a simple level list.
7. AudioManager (spec §12) with speechSynthesis fallback; counting VO on each frog placed/removed when voCount is on.
8. SandboxScene: all numbers 1–10 + frogs, both pans active, "read to me" button composing the equation phrase from VO keys.
9. Temporary dev level list (all count levels w1-l1…w2-l5 + sandbox) — real menus come in Phase 4.
10. Complete window.__FROG__: gotoLevel, getLevelState, getBeamAngle, place, removeLast, setFastMode, solveCurrent, getPointerTarget, events. Stable object names per spec §9.
11. E2E: count-mode.spec.ts (solve w1-l3 via API; overshoot then remove; success fires once), drag-real-pointer.spec.ts (real mouse drag AND touch tap flows using getPointerTarget), sandbox.spec.ts, no-console-errors.spec.ts. Run on all 4 Playwright projects.

Acceptance criteria P2-1 … P2-11 in docs/03-roadmap.md. Return the AGENTS.md summary and open PR "Phase 2: Vertical slice".
```

---

## المرحلة 3: كل أوضاع اللعب + التلميحات + التغذية الراجعة

### معايير القبول
| ID | المعيار |
|---|---|
| P3-1 | الوضع `compare`: الأزرار التلاتة، والقفل، وكشف الحقيقة. التوقّع الصح بيدّي رمز > أو < أو =، والتوقّع الغلط بيشغّل الشرح الصوتي وبعده سؤال شقيق، والمستوى بيكمل بعد توقّع صحيح واحد. |
| P3-2 | الوضع `bond`: الطفل لازم يحط بالظبط `childNumbersExactly` رقم ومفيش ضفادع. كل حل جديد بيتسجّل في لوحة الحلول والعناصر بترجع للصينية، والحل المكرر بيشغّل رسالته، والمستوى بيكمل عند الوصول لـ `requiredSolutions`. |
| P3-3 | الوضعين `missing` و`equation`: `EquationBar` بيتعرض فوق الكفوف حسب GDD بند 7.3، و«؟» بتتحوّل للرقم الصح عند النجاح. |
| P3-4 | الكفة غير المستهدفة بترفض الإفلات وبتشغّل `feedback_wrong_pan`. |
| P3-5 | التلميحات بمستوياتها التلاتة لكل وضع (GDD بند 6.2)، بما فيها: الضفادع الشفافة، والترقيم على الضفادع، وخط الأعداد، وضفدوع بيحط ضفدع بنفسه. |
| P3-6 | النجوم بتتحسب صح، وفيه شاشة نتيجة مؤقتة بأزرار: التالي، وإعادة، وقائمة. |
| P3-7 | الأخطاء بتتصنّف وبتتسجّل في `events` و`LevelState.errors`. |
| P3-8 | اختبار `all-levels-solvable.spec.ts`: الـ 48 مستوى بيتحلّوا بـ `solveCurrent()` في الوضع السريع، وكل مستوى بيوصل لـ success. |
| P3-9 | اختبارات E2E لكل وضع بتعدّي على الـ 4 مشاريع. |

### البرومبت
```text
Read AGENTS.md, docs/01-game-design.md §5.2–§5.5, §6, §7.3 and docs/02-technical-spec.md §6–§7, §9.

TASK — Phase 3: All game modes, hints, feedback, stars (branch: phase-3-modes).

1. Compare mode (predict): beam locked with a cute wooden peg, three big predict buttons (predict-left / predict-equal / predict-right), unlock + animate, correct → show >,<,= symbol between the numbers + VO; wrong → explanation VO assembled from phrase/count keys, then a sibling question from generator.ts in the same difference band; level completes after one correct prediction.
2. Bond mode (balanceMulti): enforce childNumbersExactly & no frogs, solutions board at top showing found canonical solutions as mini equations, new solution → mini celebration and child tiles fly back to tray, duplicate → 'bond_already_found', complete at requiredSolutions.
3. Missing & Equation modes with objects/EquationBar.ts exactly per GDD §7.3 (terms drawn above their own pan, '=' above the mascot, '؟' placeholder morphs into the correct number on success; respects numerals setting).
4. Non-target pan rejects drops with 'feedback_wrong_pan'.
5. objects/HintOverlay.ts implementing the 3 hint levels per mode (GDD §6.2 table): verbal VO; visual (count badges on frogs, number line, ghost frogs); modelling (mascot places one frog / highlights the right pair). Hint button 'btn-hint'. Idle timer from settings.
6. Scoring + placeholder ResultScene (stars, next/replay/menu). Error tags recorded per spec §7.
7. Extend the dev level list to all 48 levels.
8. E2E: compare-mode.spec.ts, bond-mode.spec.ts (incl. duplicate solution), missing-equation.spec.ts (equation text positions: left terms x < mascot x < right terms x), hints.spec.ts (idle → level 1 → 2 → 3 with fake timers/fast mode), all-levels-solvable.spec.ts (48 levels via solveCurrent).

Acceptance criteria P3-1 … P3-9 in docs/03-roadmap.md. Return the AGENTS.md summary and open PR "Phase 3: Game modes".
```

---

## المرحلة 4: الهيكل والتقدّم والإعدادات ولوحة المتابعة

### معايير القبول
| ID | المعيار |
|---|---|
| P4-1 | التدفق الكامل حسب GDD بند 9: البداية، ثم خريطة العوالم، ثم المستويات، ثم اللعب، ثم النتيجة. وزرار ▶ بيفتح الصوت (unlock) على iOS. |
| P4-2 | الحفظ والفتح التدريجي (spec بند 8) بيفضلوا موجودين بعد إعادة تحميل الصفحة، والـ Storage المعطّل مش بيوقّع اللعبة. |
| P4-3 | بوابة الكبار بتفتح بضغط مستمر 3 ثواني بس، والنقر العادي مش بيفتحها. |
| P4-4 | الإعدادات كلها (GDD بند 12) شغالة فورًا، بما فيها تبديل نظام الأرقام في كل الشاشات. |
| P4-5 | لوحة المتابعة: نسبة الإتقان لكل عالم، ومتوسط التلميحات، وأكتر 3 أخطاء، وتوصية واحدة، وتصدير CSV. |
| P4-6 | وضع التدريب اللانهائي متكيّف، ووضع اللعب الحر بقى من القائمة. |
| P4-7 | ظهور «فتحت جزيرة جديدة!» عند فتح عالم جديد. |
| P4-8 | اختبار `progress-persist.spec.ts` واختبار البوابة والإعدادات بيعدّوا. |

### البرومبت
```text
Read AGENTS.md, docs/01-game-design.md §6.3, §8–§12 and docs/02-technical-spec.md §8, §11–§12.

TASK — Phase 4: Meta-game, progress, settings, grown-up area (branch: phase-4-meta).

1. TitleScene (mascot wave, ▶ unlocks audio), WorldMapScene (6 islands, lock/stars, world colours), LevelSelectScene (8 lily pads/world with star rows), real ResultScene (stars animation, next/replay/map, VO result_stars_n), world-unlock celebration.
2. services/storage.ts + core/progress.ts integration: save after each level, unlock rules, migration, in-memory fallback if storage throws (test this by stubbing localStorage to throw).
3. GrownUpGateScene: 3-second press-and-hold lock icon with progress ring; short taps do nothing.
4. SettingsScene: every setting in GDD §12, applied live (numerals switch re-renders number tiles and equation bar everywhere), reset progress with confirm step.
5. DashboardScene: per-world mastery %, avg hints, top-3 error patterns (Arabic labels), one auto recommendation sentence per weakest area, CSV export via Blob download.
6. PracticeScene: endless adaptive questions from generator.ts across unlocked modes; band/streak saved.
7. Remove the temporary dev level list (keep it reachable only via ?test=1).
8. E2E: progress-persist.spec.ts (reload keeps stars/unlocks), grown-up-gate.spec.ts, settings.spec.ts (numerals switch), practice.spec.ts, dashboard-csv.spec.ts.

Acceptance criteria P4-1 … P4-8 in docs/03-roadmap.md. Return the AGENTS.md summary and open PR "Phase 4: Meta".
```

---

## المرحلة 5: الجودة عبر المنصات (التجاوب، والوصول، والأوفلاين، والأداء)

### معايير القبول
| ID | المعيار |
|---|---|
| P5-1 | تخطيط Portrait وLandscape بيتبدّلوا لحظيًا عند تدوير الجهاز، ومن غير قص ولا تداخل، على المقاسات دي: 360×640، و390×844، و768×1024، و1024×768، و1366×768، و1920×1080، و2560×1440. |
| P5-2 | احترام الـ safe-area، ومفيش zoom ولا scroll ولا تحديد نص ولا قائمة سياقية. |
| P5-3 | PWA: الـ manifest والأيقونات موجودين، واللعبة قابلة للتثبيت، وبعد أول زيارة بتشتغل **أوفلاين بالكامل**، وده بيتأكد بـ `context.setOffline(true)` في Playwright. |
| P5-4 | الأداء: حجم الحزمة جوه الميزانية (spec بند 14)، وتقرير حجم بيتطبع في `build`، وFPS متوسطه 55 أو أكتر على مدار 30 ثانية من السحب المتواصل في Chromium مع CPU throttle ×4. |
| P5-5 | إمكانية الوصول: كل الأهداف 64 بكسل أو أكتر، وتقليل الحركة متطبّق في كل مكان، والضغط الطويل على أي زرار بيقول اسمه صوتيًا، والتباين 4.5:1 أو أكتر للأرقام. |
| P5-6 | إيقاف وتشغيل: لما التبويب يتخفي الصوت والمؤقتات بيقفوا، ولما يرجع بيكملوا. |
| P5-7 | اختبار `layout-viewports.spec.ts` بيطلّع لقطات لكل مقاس ويقارن bounding boxes. |

### البرومبت
```text
Read AGENTS.md and docs/02-technical-spec.md §10–§14, §16.

TASK — Phase 5: Cross-platform quality (branch: phase-5-quality).

1. layout/layout.ts: full landscape + portrait anchor maps for every scene (GDD §9.2 for portrait game layout), live re-layout on resize/orientation change, safe-area insets.
2. Lock down browser behaviours: no pinch/double-tap zoom, no overscroll, no text selection, no context menu, no long-press callout on iOS.
3. vite-plugin-pwa: manifest (Arabic name/short_name, RTL, theme colours), icons (192, 512, maskable — generate placeholders), precache everything, autoUpdate with a gentle "تحديث جديد" toast only on Title screen.
4. Performance: object pools for frogs/particles, no allocations in update loops, single gameplay atlas, print a gzip size report in `build`, add a perf E2E that drags continuously for 30 s under CDP CPU throttling ×4 and asserts mean FPS ≥ 55 (read from game.loop.actualFps via __FROG__).
5. Accessibility: audit every interactive element ≥ 64 design px, long-press = speak label, reducedMotion respected everywhere, number tile contrast ≥ 4.5:1.
6. Pause/resume on visibilitychange (audio, timers, hint idle clock).
7. E2E: layout-viewports.spec.ts (7 viewports from roadmap P5-1: no element outside viewport, no overlapping interactive bounds; save screenshots), offline-pwa.spec.ts, perf.spec.ts, visibility.spec.ts.

Acceptance criteria P5-1 … P5-7 in docs/03-roadmap.md. Return the AGENTS.md summary and open PR "Phase 5: Quality".
```

---

## المرحلة 6: دمج الفن والصوت النهائي (بعد تجهيز الأصول)

### معايير القبول
| ID | المعيار |
|---|---|
| P6-1 | الـ atlas والخلفيات النهائية حلّت محل الرسومات المؤقتة بنفس الـ keys، ومن غير أي تعديل في منطق اللعب. |
| P6-2 | الـ spritesheets بتاعة ضفدوع شغالة: idle، وlook-left/right، وstrain، وhappy، وjump، وclap. |
| P6-3 | كل ملفات VO الموجودة في `strings.ar.json` متربطة، ومفيش fallback لـ speechSynthesis في الإنتاج. |
| P6-4 | فيه موسيقى لكل عالم، ومستوى الصوت بيوطى تلقائي (ducking) وقت التعليمات. |
| P6-5 | الحجم لسه جوه الميزانية، والـ FPS لسه محقق. |

### البرومبت
```text
Read AGENTS.md and docs/05-assets.md.

TASK — Phase 6: Final art & audio integration (branch: phase-6-assets). Final assets are in /assets-source (provided by the design team).

1. Pack gameplay sprites into public/assets/images/atlas.png/.json using free-tex-packer-cli (dev dependency), keeping the exact texture keys from docs/05-assets.md §1; backgrounds as WebP.
2. Mascot animations from the provided spritesheets (idle loop, look-left/right, strain-left/right, happy, jump, clap) mapped to balance state.
3. Wire all VO files (public/assets/audio/vo/<key>.mp3), SFX and per-world music; speechSynthesis fallback disabled in production builds.
4. Keep placeholderArt.ts as fallback for any missing key (log a dev warning only).
5. Re-run perf and size checks; all E2E must still pass.

Return the AGENTS.md summary and open PR "Phase 6: Assets".
```

---

## المرحلة 7 (اختيارية): التغليف والإطلاق

### البرومبت
```text
TASK — Phase 7: Packaging & release (branch: phase-7-release).
1. Capacitor: add Android and iOS platforms wrapping dist/, landscape+portrait, splash + icons, fullscreen/immersive on Android, disable WebView zoom. Document build steps in docs/RELEASE.md.
2. SCORM 1.2 build target (`npm run build:scorm`) using scorm-again: imsmanifest.xml, report completion when World 1 is finished and score = total stars / 144 × 100. Zip output in dist-scorm/.
3. GitHub Actions: on PR run `npm run check`; on tag build web, upload dist as artifact.
Return the AGENTS.md summary and open PR "Phase 7: Release".
```

---

## اختبار المستخدم (UAT) مع أطفال: بروتوكول مختصر
- **العيّنة:** 5 أطفال، من 4 لـ 7 سنين، وكل طفل في جلسة منفردة مدتها 15 دقيقة على تابلت.
- **المهام:**
  1. يلعب العالم 1 من غير مساعدة.
  2. يلعب 3 مستويات من العالم 3.
  3. يلعب لعب حر لمدة دقيقتين.
- **المقاييس:**
  - نسبة إكمال المهام من غير مساعدة.
  - عدد مرات طلب مساعدة من الكبار.
  - علامات الإحباط: الضغط العشوائي، أو إن الطفل يبعد عن الجهاز.
  - سؤال للطفل في الآخر: «الميزان بيعمل إيه؟» علشان نقيس فهم المفهوم.
- **معيار النجاح:** 4 من 5 أطفال يكمّلوا العالم 1 لوحدهم، وكل طفل يقدر يشرح إن «الكفة اللي فيها أكتر بتنزل».
