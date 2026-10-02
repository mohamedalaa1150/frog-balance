import Phaser from 'phaser';
import { getRenderScale } from '../layout/viewport';

/** Atlas contract, in design pixels. Number textures deliberately contain no digits. */
export const TEXTURE_SIZES: Record<string, readonly [number, number]> = {
  bg_title: [1280, 720],
  bg_map: [1280, 720],
  mascot_base: [360, 380],
  mascot_sheet: [2880, 380],
  beam: [820, 36],
  pan: [240, 56],
  pan_post: [24, 70],
  pan_glow: [300, 100],
  frog_token: [64, 64],
  frog_token_ghost: [64, 64],
  frog_pile: [240, 140],
  lock_badge: [40, 40],
  peg_lock: [90, 90],
  tray_bg: [1280, 170],
  predict_left: [160, 160],
  predict_right: [160, 160],
  predict_equal: [160, 160],
  symbol_gt: [110, 110],
  symbol_lt: [110, 110],
  symbol_eq: [110, 110],
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
const colors = [
  0x2e5aac, 0x318247, 0xb34f17, 0x8d459d, 0xa23051, 0x176d78, 0x725126,
  0x4659a8, 0x8b3a17, 0x38692c,
];

function frog(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  gaze = 0,
  happy = false,
) {
  g.fillStyle(0x5cc85a).fillRoundedRect(
    x + w * 0.08,
    y + h * 0.23,
    w * 0.84,
    h * 0.7,
    w * 0.23,
  );
  for (const eye of [0.28, 0.72]) {
    g.fillStyle(0x5cc85a).fillCircle(x + w * eye, y + h * 0.26, w * 0.19);
    g.fillStyle(0xfff6e5).fillCircle(x + w * eye, y + h * 0.26, w * 0.13);
    g.fillStyle(0x174d52).fillCircle(
      x + w * (eye + gaze * 0.035),
      y + h * 0.27,
      w * 0.055,
    );
  }
  g.lineStyle(Math.max(2, w * 0.025), 0x27633e);
  g.beginPath();
  g.moveTo(x + w * 0.32, y + h * 0.59);
  g.lineTo(x + w * 0.5, y + h * (happy ? 0.72 : 0.64));
  g.lineTo(x + w * 0.68, y + h * 0.59);
  g.strokePath();
  g.fillStyle(0xffd23f).fillEllipse(
    x + w * 0.5,
    y + h * 0.82,
    w * 0.35,
    h * 0.13,
  );
}
function icon(
  g: Phaser.GameObjects.Graphics,
  key: string,
  w: number,
  h: number,
) {
  g.fillStyle(0xffd23f).fillCircle(w / 2, h / 2, w * 0.48);
  g.lineStyle(w * 0.065, 0x174d52);
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
    g.fillStyle(0x174d52).fillRoundedRect(
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
        frog(
          g,
          frame * 360 * r,
          0,
          360 * r,
          h,
          [0, -1, 1, -1, 1, 0, 0, 0][frame],
          frame >= 5,
        );
    } else if (/frog_token|mascot_base|app_icon/.test(key)) {
      if (key.endsWith('ghost')) g.setAlpha(0.35);
      frog(g, 0, 0, w, h);
      g.setAlpha(1);
    } else if (key === 'frog_pile') {
      for (let i = 0; i < 5; i++)
        frog(
          g,
          (i % 3) * w * 0.28 + w * 0.06,
          (i < 3 ? 0.4 : 0.02) * h,
          w * 0.3,
          h * 0.58,
        );
    } else if (key.startsWith('num_tile')) {
      g.fillStyle(0x174d52, 0.18).fillRoundedRect(
        w * 0.06,
        h * 0.06,
        w * 0.94,
        h * 0.94,
        w * 0.15,
      );
      g.fillStyle(colors[Number(key.split('_').at(-1)) - 1]!).fillRoundedRect(
        0,
        0,
        w * 0.94,
        h * 0.94,
        w * 0.15,
      );
      g.fillStyle(0xffffff, 0.15).fillRoundedRect(
        w * 0.08,
        h * 0.07,
        w * 0.76,
        h * 0.1,
        w * 0.04,
      );
    } else if (key.startsWith('bg_')) {
      g.fillStyle(0xfff6e5).fillRect(0, 0, w, h);
      g.fillStyle(0xd3ead7).fillEllipse(w * 0.5, h * 1.1, w * 1.7, h * 0.8);
      g.fillStyle(0x87c9be, 0.4).fillEllipse(
        w * 0.13,
        h * 0.85,
        w * 0.2,
        h * 0.08,
      );
    } else if (/btn_|predict_|symbol_|lock/.test(key)) icon(g, key, w, h);
    else if (/star/.test(key)) {
      const points = Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          radius = w * (i % 2 ? 0.2 : 0.48);
        return new Phaser.Geom.Point(
          w / 2 + Math.cos(a) * radius,
          h / 2 + Math.sin(a) * radius,
        );
      });
      g.fillStyle(key.includes('empty') ? 0x9bb5a3 : 0xffd23f).fillPoints(
        points,
        true,
      );
    } else if (key === 'number_line') {
      g.lineStyle(4 * r, 0x2e5aac).lineBetween(
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
    } else {
      const color =
        key === 'beam' || key === 'pan_post'
          ? 0x2e5aac
          : key.includes('pan')
            ? 0xffd23f
            : 0x5cc85a;
      g.fillStyle(color, key === 'pan_glow' ? 0.28 : 1).fillRoundedRect(
        0,
        0,
        w,
        h,
        Math.min(w, h) * 0.35,
      );
      g.lineStyle(3 * r, 0x27633e, 0.4).strokeRoundedRect(
        2 * r,
        2 * r,
        w - 4 * r,
        h - 4 * r,
        Math.min(w, h) * 0.3,
      );
    }
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
      textures: Object.keys(TEXTURE_SIZES).map((key) => {
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
