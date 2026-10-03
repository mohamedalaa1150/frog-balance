# Audio pack (final) — VO, SFX, music

All files are ready in `public/assets/audio/`. Generated with ElevenLabs (voice "Wiam – Confident", model eleven_v3; SFX eleven_text_to_sound_v2; music eleven_music_v2) and post-processed with ffmpeg.

## 1. Voice-over — `audio/vo/<key>.mp3` (88 files, ≈2 MB)
- One file per spoken key of `content/strings.ar.json`; `vo/manifest.json` lists key, text, delivery tags and duration.
- Mono 44.1 kHz 64 kbps, −16 LUFS, 150 ms silence at start and end (05-assets §4.3).
- **Text-only keys (no VO by design):** the 39 keys listed in `manifest.json → no_vo_by_design` (settings, dashboard, error/recommend labels, CSV headers, update toast). They are read by adults; never fall back to speechSynthesis for them.
- Counting (`count_01…count_20`) and the explanation phrases (`phrase_*`) are recorded with the same energy so they can be chained; play chained clips back-to-back with ≤ 60 ms gap.

## 2. Sound effects — `audio/sfx/<key>.mp3` (16 files)
Mono, −20 LUFS, ≤ 1.6 s (success ≈ 2 s).
`sfx_pickup`, `sfx_drop_pan_a`, `sfx_drop_pan_b` (pick one at random), `sfx_bounce_back`, `sfx_beam_creak`, `sfx_balanced_ding`, `sfx_success`, `sfx_star_1/2/3`, `sfx_button`, `sfx_pan_full`, `sfx_lock_shake`, `sfx_unlock`, `sfx_ribbit` (idle, at most every 20 s), `sfx_hint_chime` (NEW — play just before a hint VO).

## 3. Music — `audio/music/<key>.ogg` + `.mp3` (4 loops × 58 s)
Stereo, −23 LUFS, already crossfaded so the end flows into the start (seamless loop).
| Key | Used for |
|---|---|
| `music_title` | Title, World map, Level select, Result, Practice |
| `music_worlds_1_2` | Worlds 1–2 gameplay + Sandbox |
| `music_worlds_3_4` | Worlds 3–4 gameplay |
| `music_worlds_5_6` | Worlds 5–6 gameplay |
Load as `[key.ogg, key.mp3]` so each browser downloads ONE format. Music is NOT part of the first load: lazy-load per scene and cache it at runtime (Workbox CacheFirst), so the precache stays < 8 MB.
