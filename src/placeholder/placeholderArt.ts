import Phaser from 'phaser';
import { MASCOT_FRAMES, RASTER_KEYS } from '../assets';
import { THEME, WORLD_SKIES, tileColor } from '../theme';
import { getRenderScale } from '../layout/viewport';

/** Atlas contract, in design pixels. Number textures deliberately contain no digits. */
export const TEXTURE_SIZES: Record<string, readonly [number, number]> = {
  bg_title: [1280, 720],
  bg_map: [1280, 720],
  mascot_base: [360, 380],
  mascot_sheet: [2880, 380],
  beam: [840, 70],
  pan: [260, 220],
  pan_post: [24, 70],
  pan_glow: [320, 120],
  frog_token: [64, 70],
  frog_token_ghost: [64, 70],
  frog_pile: [240, 142],
  lock_badge: [40, 40],
  peg_lock: [90, 90],
  tray_bg: [1280, 180],
  predict_left: [160, 160],
  predict_right: [160, 160],
  predict_equal: [160, 160],
  symbol_gt: [120, 110],
  symbol_lt: [120, 110],
  symbol_eq: [120, 110],
  star_full: [96, 96],
  star_empty: [96, 96],
  lily_level: [150, 150],
  lily_level_locked: [150, 150],
  island_locked: [280, 220],
  number_line: [1000, 90],
  particle_star: [24, 24],
  particle_bubble: [24, 24],
  particle_confetti: [24, 24],
  hint_hand: [110, 110],
  app_icon: [1024, 1024],
};
for (const frame of MASCOT_FRAMES)
  TEXTURE_SIZES[`mascot_${frame}`] = [440, 460];
for (let n = 1; n <= 6; n++) {
  TEXTURE_SIZES[`bg_world_${n}`] = [1280, 720];
  TEXTURE_SIZES[`bg_world_${n}_p`] = [720, 1280];
  TEXTURE_SIZES[`island_${n}`] = [280, 220];
}
for (let n = 1; n <= 10; n++) TEXTURE_SIZES[`num_tile_${n}`] = [120, 150];
for (const icon of [
  'play',
  'home',
  'hint',
  'replay',
  'next',
  'sound_on',
  'sound_off',
  'settings',
  'lock',
  'read',
  'back',
])
  TEXTURE_SIZES[`btn_${icon}`] = [112, 112];
function frog(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  frame = 0,
  mascot = false,
) {
  const ellipse = (
    cx: number,
    cy: number,
    ew: number,
    eh: number,
    fill: number,
    outline: number = THEME.frogOutline,
  ) => {
    g.fillStyle(fill).fillEllipse(x + cx * w, y + cy * h, ew * w, eh * h);
    g.lineStyle(Math.max(2, w * 0.011), outline).strokeEllipse(
      x + cx * w,
      y + cy * h,
      ew * w,
      eh * h,
    );
  };
  g.fillStyle(THEME.shadow, 0.18).fillEllipse(
    x + w * 0.5,
    y + h * 0.96,
    w * 0.83,
    h * 0.06,
  );
  if (mascot) {
    ellipse(0.13, frame === 6 ? 0.15 : 0.24, 0.17, 0.38, THEME.frog);
    ellipse(0.87, frame === 6 ? 0.15 : 0.24, 0.17, 0.38, THEME.frog);
  }
  ellipse(0.18, 0.84, 0.29, 0.23, THEME.frog);
  ellipse(0.82, 0.84, 0.29, 0.23, THEME.frog);
  ellipse(0.5, 0.65, 0.7, 0.6, THEME.frog);
  ellipse(0.5, 0.71, 0.41, 0.39, THEME.belly, THEME.belly);
  ellipse(0.5, 0.37, 0.88, 0.5, THEME.frog);
  for (const eye of [0.28, 0.72]) {
    ellipse(eye, 0.21, 0.35, 0.32, THEME.frog);
    ellipse(eye, 0.21, 0.26, 0.24, THEME.white, THEME.frogOutline);
    const happy = frame === 5 || frame === 7;
    const gaze =
      frame === 1 || frame === 3
        ? -0.035
        : frame === 2 || frame === 4
          ? 0.035
          : 0;
    if (happy)
      g.lineStyle(w * 0.018, THEME.navy).lineBetween(
        x + (eye - 0.07) * w,
        y + h * 0.21,
        x + (eye + 0.07) * w,
        y + h * 0.21,
      );
    else {
      g.fillStyle(THEME.navy).fillCircle(
        x + (eye + gaze) * w,
        y + h * 0.23,
        w * (frame === 3 || frame === 4 ? 0.045 : 0.06),
      );
      g.fillStyle(THEME.white).fillCircle(
        x + (eye + gaze + 0.018) * w,
        y + h * 0.205,
        w * 0.019,
      );
    }
  }
  ellipse(0.18, 0.4, 0.13, 0.09, THEME.cheek, THEME.cheek);
  ellipse(0.82, 0.4, 0.13, 0.09, THEME.cheek, THEME.cheek);
  g.lineStyle(Math.max(2, w * 0.012), THEME.frogOutline)
    .beginPath()
    .arc(x + w * 0.5, y + h * 0.39, w * 0.12, 0.1, Math.PI - 0.1)
    .strokePath();
  if (mascot) {
    ellipse(0.49, 0.1, 0.1, 0.05, THEME.sun, THEME.goldOutline);
    g.fillStyle(THEME.scarf).fillTriangle(
      x + w * 0.3,
      y + h * 0.55,
      x + w * 0.7,
      y + h * 0.55,
      x + w * 0.5,
      y + h * 0.65,
    );
    g.fillStyle(THEME.scarf).fillTriangle(
      x + w * 0.5,
      y + h * 0.59,
      x + w * 0.64,
      y + h * 0.73,
      x + w * 0.68,
      y + h * 0.58,
    );
    if (frame === 7) ellipse(0.5, 0.6, 0.2, 0.11, THEME.frog);
  }
}
function lily(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  g.fillStyle(THEME.shadow, 0.18).fillEllipse(x, y + h * 0.07, w, h);
  g.fillStyle(THEME.frog).fillEllipse(x, y, w, h);
  g.lineStyle(Math.max(3, h * 0.025), THEME.leaf).strokeEllipse(x, y, w, h);
  g.fillStyle(THEME.water).fillTriangle(
    x,
    y,
    x - w * 0.5,
    y - h * 0.08,
    x - w * 0.43,
    y + h * 0.23,
  );
  g.lineStyle(Math.max(2, h * 0.018), THEME.leaf, 0.55);
  for (const angle of [-2.3, -1.3, -0.3, 0.7, 1.7])
    g.lineBetween(
      x,
      y,
      x + Math.cos(angle) * w * 0.4,
      y + Math.sin(angle) * h * 0.4,
    );
}
function icon(
  g: Phaser.GameObjects.Graphics,
  key: string,
  w: number,
  h: number,
) {
  const gold = /hint|replay|equal/.test(key);
  g.fillStyle(THEME.shadow, 0.18).fillCircle(w / 2, h * 0.54, w * 0.44);
  g.fillStyle(gold ? THEME.gold : THEME.coral).fillCircle(
    w / 2,
    h / 2,
    w * 0.43,
  );
  g.lineStyle(
    w * 0.035,
    gold ? THEME.goldOutline : THEME.coralOutline,
  ).strokeCircle(w / 2, h / 2, w * 0.43);
  g.lineStyle(w * 0.016, THEME.white, 0.45)
    .beginPath()
    .arc(w / 2, h / 2, w * 0.38, Math.PI, Math.PI * 1.75)
    .strokePath();
  g.lineStyle(w * 0.065, THEME.white);
  const line = (points: number[][]) => {
    g.beginPath();
    points.forEach(([x, y], i) =>
      i ? g.lineTo(x! * w, y! * h) : g.moveTo(x! * w, y! * h),
    );
    g.strokePath();
  };
  if (/equal|symbol_eq/.test(key)) {
    line([
      [0.27, 0.4],
      [0.73, 0.4],
    ]);
    line([
      [0.27, 0.6],
      [0.73, 0.6],
    ]);
  } else if (/symbol_gt|symbol_lt/.test(key)) {
    const right = key === 'symbol_gt';
    line([
      [right ? 0.35 : 0.65, 0.25],
      [right ? 0.7 : 0.3, 0.5],
      [right ? 0.35 : 0.65, 0.75],
    ]);
  } else if (/home/.test(key)) {
    line([
      [0.23, 0.48],
      [0.5, 0.25],
      [0.77, 0.48],
      [0.77, 0.76],
      [0.23, 0.76],
      [0.23, 0.48],
    ]);
  } else if (/lock/.test(key)) {
    g.strokeRoundedRect(w * 0.34, h * 0.24, w * 0.32, h * 0.4, w * 0.12);
    g.fillStyle(THEME.white).fillRoundedRect(
      w * 0.25,
      h * 0.46,
      w * 0.5,
      h * 0.32,
      w * 0.05,
    );
  } else if (key === 'btn_read') {
    g.strokeRoundedRect(w * 0.2, h * 0.2, w * 0.6, h * 0.5, w * 0.1);
    line([
      [0.32, 0.7],
      [0.3, 0.82],
      [0.5, 0.7],
    ]);
    line([
      [0.34, 0.4],
      [0.66, 0.4],
    ]);
    line([
      [0.34, 0.54],
      [0.66, 0.54],
    ]);
  } else if (/sound/.test(key)) {
    line([
      [0.24, 0.42],
      [0.42, 0.42],
      [0.62, 0.24],
      [0.62, 0.76],
      [0.42, 0.58],
      [0.24, 0.58],
      [0.24, 0.42],
    ]);
    if (key === 'btn_sound_off') {
      line([
        [0.73, 0.38],
        [0.88, 0.62],
      ]);
      line([
        [0.88, 0.38],
        [0.73, 0.62],
      ]);
    } else
      line([
        [0.75, 0.35],
        [0.85, 0.5],
        [0.75, 0.65],
      ]);
  } else if (/hint/.test(key)) {
    g.strokeCircle(w * 0.5, h * 0.4, w * 0.21);
    line([
      [0.4, 0.65],
      [0.6, 0.65],
      [0.6, 0.77],
      [0.4, 0.77],
      [0.4, 0.65],
    ]);
  } else if (key === 'btn_settings') {
    g.strokeCircle(w * 0.5, h * 0.5, w * 0.2);
    g.strokeCircle(w * 0.5, h * 0.5, w * 0.07);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      line([
        [0.5 + Math.cos(angle) * 0.2, 0.5 + Math.sin(angle) * 0.2],
        [0.5 + Math.cos(angle) * 0.31, 0.5 + Math.sin(angle) * 0.31],
      ]);
    }
  } else if (key === 'btn_replay') {
    g.beginPath();
    g.arc(w * 0.5, h * 0.5, w * 0.25, Math.PI * 0.2, Math.PI * 1.7);
    g.strokePath();
    line([
      [0.45, 0.18],
      [0.65, 0.25],
      [0.58, 0.45],
    ]);
  } else if (/back/.test(key))
    line([
      [0.65, 0.25],
      [0.3, 0.5],
      [0.65, 0.75],
    ]);
  else if (/predict/.test(key))
    line([
      [0.5, 0.22],
      [0.5, 0.72],
      [0.28, 0.5],
      [0.5, 0.72],
      [0.72, 0.5],
    ]);
  else {
    line([
      [0.38, 0.25],
      [0.73, 0.5],
      [0.38, 0.75],
      [0.38, 0.25],
    ]);
    if (key === 'btn_next')
      line([
        [0.8, 0.25],
        [0.8, 0.75],
      ]);
  }
}
export function generatePlaceholderArt(scene: Phaser.Scene): void {
  const r = getRenderScale();
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (const [key, [width, height]] of Object.entries(TEXTURE_SIZES)) {
    if (scene.textures.exists(key)) continue;
    const w = width * r,
      h = height * r;
    g.clear();
    if (key === 'mascot_sheet') {
      for (let frame = 0; frame < 8; frame++)
        frog(g, frame * 360 * r, 0, 360 * r, h, frame, true);
    } else if (/frog_token|mascot_|app_icon/.test(key)) {
      frog(g, 0, 0, w, h, 0, !key.startsWith('frog_token'));
      if (key.endsWith('ghost')) {
        // Fade the generated canvas below; graphic alpha isn't baked by generateTexture.
        g.lineStyle(2 * r, THEME.navy, 0.7);
        for (let i = 0; i < 12; i++)
          g.beginPath()
            .arc(
              w / 2,
              h / 2,
              w * 0.46,
              (i * Math.PI) / 6,
              ((i + 0.55) * Math.PI) / 6,
            )
            .strokePath();
      }
    } else if (key === 'frog_pile') {
      for (let i = 0; i < 8; i++)
        frog(
          g,
          (i < 3 ? (i + 0.8) * 0.21 : (i - 3) * 0.19) * w,
          (i < 3 ? 0 : 0.4) * h,
          w * 0.23,
          h * 0.59,
        );
    } else if (key.startsWith('num_tile')) {
      const border = tileColor(Number(key.split('_').at(-1)));
      g.fillStyle(THEME.shadow, 0.18).fillRoundedRect(
        w * 0.04,
        h * 0.05,
        w * 0.92,
        h * 0.94,
        w * 0.15,
      );
      g.fillStyle(THEME.cream).fillRoundedRect(
        w * 0.035,
        h * 0.025,
        w * 0.93,
        h * 0.93,
        w * 0.15,
      );
      g.lineStyle(5 * r, border).strokeRoundedRect(
        w * 0.035,
        h * 0.025,
        w * 0.93,
        h * 0.93,
        w * 0.15,
      );
      g.lineStyle(2 * r, THEME.white, 0.65).lineBetween(
        w * 0.18,
        h * 0.07,
        w * 0.81,
        h * 0.07,
      );
    } else if (key.startsWith('bg_')) {
      const world = Number(key.match(/world_(\d)/)?.[1] ?? 2);
      g.fillStyle(WORLD_SKIES[world - 1]!).fillRect(0, 0, w, h);
      g.fillStyle(THEME.sun, 0.7).fillCircle(
        w * 0.78,
        h * 0.16,
        Math.min(w, h) * 0.075,
      );
      for (const [cx, cy] of [
        [0.16, 0.24],
        [0.43, 0.12],
        [0.9, 0.32],
      ]) {
        g.fillStyle(THEME.white, 0.65).fillRoundedRect(
          w * cx!,
          h * cy!,
          w * 0.12,
          h * 0.035,
          h * 0.018,
        );
        g.fillCircle(w * (cx! + 0.06), h * cy!, h * 0.025);
      }
      g.fillStyle(THEME.water).fillRect(0, h * 0.53, w, h * 0.47);
      g.fillStyle(THEME.waterDeep, 0.32).fillRect(0, h * 0.78, w, h * 0.22);
      for (const side of [0.03, 0.94]) {
        for (let i = 0; i < 4; i++) {
          const x = w * (side + i * 0.012),
            y = h * (0.4 + i * 0.04);
          g.lineStyle(5 * r, THEME.leaf).lineBetween(
            x,
            h * 0.66,
            x + (side < 0.5 ? 1 : -1) * 10 * r,
            y,
          );
          g.fillStyle(THEME.wood).fillRoundedRect(
            x - 4 * r,
            y - 25 * r,
            10 * r,
            36 * r,
            5 * r,
          );
        }
        lily(g, w * (side + 0.035), h * 0.83, w * 0.14, h * 0.045);
        for (let i = -1; i <= 1; i++) {
          g.fillStyle(THEME.cheek).fillEllipse(
            w * (side + 0.035) + i * 12 * r,
            h * 0.79 + Math.abs(i) * 5 * r,
            18 * r,
            35 * r,
          );
        }
      }
      g.lineStyle(2 * r, THEME.cream, 0.25);
      for (let i = 0; i < 12; i++)
        g.lineBetween(
          w * ((i * 0.27) % 1),
          h * (0.6 + (i % 4) * 0.08),
          w * ((i * 0.27) % 1) + 30 * r,
          h * (0.6 + (i % 4) * 0.08),
        );
    } else if (key === 'beam') {
      g.fillStyle(THEME.navy).fillRoundedRect(0, h * 0.12, w, h * 0.76, h / 2);
      g.lineStyle(3 * r, THEME.blue, 0.7).lineBetween(
        h,
        h * 0.25,
        w - h,
        h * 0.25,
      );
      for (const x of [h / 2, w / 2, w - h / 2]) {
        g.fillStyle(THEME.gold).fillCircle(x, h / 2, h * 0.36);
        g.lineStyle(3 * r, THEME.goldOutline).strokeCircle(x, h / 2, h * 0.36);
      }
    } else if (key === 'pan') {
      g.lineStyle(3 * r, THEME.navy);
      for (const x of [22, 130, 238])
        g.lineBetween(130 * r, 14 * r, x * r, 172 * r);
      g.fillStyle(THEME.pan).fillEllipse(130 * r, 184 * r, 246 * r, 54 * r);
      g.lineStyle(4 * r, THEME.panOutline).strokeEllipse(
        130 * r,
        184 * r,
        246 * r,
        54 * r,
      );
      g.fillStyle(THEME.gold).fillEllipse(130 * r, 172 * r, 244 * r, 30 * r);
    } else if (key === 'pan_post') {
      g.lineStyle(3 * r, THEME.navy).lineBetween(w / 2, 0, w / 2, h);
    } else if (key === 'peg_lock') {
      g.fillStyle(THEME.shadow, 0.18).fillRoundedRect(
        w * 0.18,
        h * 0.1,
        w * 0.68,
        h * 0.84,
        w * 0.1,
      );
      g.fillStyle(THEME.wood).fillRoundedRect(
        w * 0.16,
        h * 0.06,
        w * 0.68,
        h * 0.84,
        w * 0.1,
      );
      g.lineStyle(4 * r, THEME.woodOutline).strokeRoundedRect(
        w * 0.16,
        h * 0.06,
        w * 0.68,
        h * 0.84,
        w * 0.1,
      );
      g.lineStyle(3 * r, THEME.belly, 0.6).lineBetween(
        w * 0.32,
        h * 0.17,
        w * 0.28,
        h * 0.65,
      );
    } else if (/btn_|predict_|symbol_|lock/.test(key)) icon(g, key, w, h);
    else if (/star/.test(key)) {
      const points = Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          radius = w * (i % 2 ? 0.22 : 0.43);
        return new Phaser.Geom.Point(
          w / 2 + Math.cos(a) * radius,
          h / 2 + Math.sin(a) * radius,
        );
      });
      g.fillStyle(key.includes('empty') ? THEME.cream : THEME.gold).fillPoints(
        points,
        true,
      );
      g.lineStyle(3 * r, THEME.goldOutline).strokePoints(points, true);
    } else if (key === 'number_line') {
      g.lineStyle(4 * r, THEME.navy).lineBetween(
        w * 0.04,
        h * 0.5,
        w * 0.96,
        h * 0.5,
      );
      for (let i = 0; i <= 10; i++)
        g.lineBetween(
          w * (0.04 + 0.092 * i),
          h * 0.3,
          w * (0.04 + 0.092 * i),
          h * 0.7,
        );
    } else if (key === 'pan_glow') {
      g.fillStyle(THEME.gold, 0.22).fillEllipse(w / 2, h / 2, w, h);
    } else if (key === 'particle_confetti') {
      g.fillStyle(THEME.white).fillRoundedRect(
        w * 0.2,
        h * 0.15,
        w * 0.6,
        h * 0.7,
        3 * r,
      );
    } else lily(g, w / 2, h * 0.47, w * 0.97, h * 0.85);
    g.generateTexture(key, w, h);
    if (key === 'mascot_sheet')
      for (let frame = 0; frame < 8; frame++)
        scene.textures
          .get(key)
          .add(frame, 0, frame * 360 * r, 0, 360 * r, 380 * r);
  }
  g.destroy();
  scene.game.events.emit('gameplay-event', {
    type: 'placeholder-textures',
    data: {
      renderScale: r,
      textures: [
        ...new Set([...Object.keys(TEXTURE_SIZES), ...RASTER_KEYS]),
      ].map((key) => {
        const texture = scene.textures.get(key);
        return {
          key,
          width: texture.source[0]!.width,
          height: texture.source[0]!.height,
        };
      }),
    },
  });
}
