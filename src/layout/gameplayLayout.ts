import type { LevelState } from '../core/types';
import { MASCOT_ANCHORS, PAN_ANCHORS, PAN_HANG_OFFSET } from '../assets';
import { CONFIG } from '../config';
import { getLayout } from './layout';
import {
  getPanGrid,
  legalStacks,
  PAN_STACK_HALF_WIDTH,
  PAN_STACK_RISE,
} from './panGrid';

/** Shared physical-pixel anchors, including the tallest legal pan stack at either
 * tilt extreme. Source targets keep their asset size, wrapping before shrinking. */
export function getGameplayLayout(
  width: number,
  height: number,
  numberCount: number,
  frogs: boolean,
  extraHeader = 0,
  level?: LevelState['level'],
) {
  const { uiScale, renderScale, orientation, centerX } = getLayout(
    width,
    height,
  );
  const portrait = orientation === 'portrait';
  const short = !portrait && height / renderScale < 500;
  const margin = Math.max(8 * uiScale, 8 * renderScale);
  const gap = Math.max(6 * uiScale, 4 * renderScale);
  const pileHeight =
    short && level
      ? Math.min(142 * uiScale, height * 0.22 - margin)
      : 142 * uiScale;
  const pileWidth = pileHeight * (240 / 142);
  const availableWidth = width - 2 * margin;
  const trayWidth =
    availableWidth - (!portrait && frogs ? pileWidth + 16 * uiScale : 0);
  const desiredTileWidth =
    level && !portrait && numberCount
      ? Math.max(
          short ? 64 * uiScale : 64 * renderScale,
          Math.min(
            short ? (height * 0.22 - margin) / 1.25 : 120 * uiScale,
            (trayWidth - (numberCount - 1) * gap) / numberCount,
          ),
        )
      : Math.max(120 * uiScale, 64 * renderScale);
  let columns = Math.min(
    numberCount,
    portrait
      ? 5
      : Math.max(
          1,
          Math.floor((trayWidth + gap) / (desiredTileWidth + gap) + 1e-6),
        ),
  );
  let tileWidth = desiredTileWidth;
  if (portrait && columns) {
    columns = Math.min(
      columns,
      Math.max(1, Math.floor((trayWidth + gap) / (64 * renderScale + gap))),
    );
    tileWidth = Math.max(
      64 * renderScale,
      Math.min(tileWidth, (trayWidth - (columns - 1) * gap) / columns),
    );
  }
  const tileHeight = tileWidth * 1.25;
  const rows = columns ? Math.ceil(numberCount / columns) : 0;
  const trayHeight = rows ? rows * tileHeight + (rows - 1) * gap : 0;
  let sourceHeight = portrait
    ? trayHeight + (frogs ? pileHeight + (rows ? 12 * uiScale : 0) : 0)
    : Math.max(trayHeight, frogs ? pileHeight : 0);
  if (level?.mode === 'compare')
    sourceHeight = Math.max(
      sourceHeight,
      128 * uiScale,
      64 * renderScale + (short ? margin : 2 * margin),
    );
  const sourceBottom = height - margin;
  const sourceTop = sourceBottom - sourceHeight;
  const trayCenterX = portrait || !frogs ? centerX : margin + trayWidth / 2;
  const positions = Array.from({ length: numberCount }, (_, i) => {
    const row = Math.floor(i / columns);
    const countInRow = Math.min(columns, numberCount - row * columns);
    return {
      x:
        trayCenterX +
        ((i % columns) - (countInRow - 1) / 2) * (tileWidth + gap),
      y: sourceTop + tileHeight / 2 + row * (tileHeight + gap),
    };
  });
  const buttonSize = short ? 56 * renderScale : 88 * uiScale;
  const hudBottom = level ? buttonSize + 12 * renderScale : (70 + 44) * uiScale;
  const headerBottom = hudBottom + (short ? 10 : 40 + extraHeader) * uiScale;
  const upper = headerBottom + 8 * renderScale;
  const lower = sourceTop - 8 * renderScale;
  let halfSpan = portrait ? 260 : 396;
  // Reserve spring overshoot and the placement hop as well as the target angle.
  const endRise =
    halfSpan * Math.sin(((CONFIG.beam.maxAngle + 6) * Math.PI) / 180);
  const topExtent = endRise + Math.max(14, PAN_STACK_RISE - PAN_HANG_OFFSET);
  const bottomExtent = Math.max(
    endRise + PAN_HANG_OFFSET + PAN_ANCHORS.bottom,
    (MASCOT_ANCHORS.height - MASCOT_ANCHORS.pivotY) * 1.02,
  ); // Includes the mascot below the pivot.
  let balanceScale = Math.min(
    uiScale,
    (lower - upper) / (topExtent + bottomExtent),
    availableWidth /
      (2 * (halfSpan + Math.max(PAN_STACK_HALF_WIDTH, PAN_ANCHORS.width / 2))),
  );
  let actualTop = topExtent,
    actualBottom = bottomExtent;
  if (level) {
    const vertical = portrait && level.mode !== 'sandbox';
    const space = lower - upper;
    balanceScale = Math.min(
      uiScale * 1.3,
      (space * 0.62) / 434,
      availableWidth / 600,
    );
    const grid = legalStacks(level).flatMap((kinds) =>
      getPanGrid(kinds, balanceScale / renderScale, !portrait, vertical),
    );
    const stackRise = Math.max(
      14 * balanceScale,
      ...grid.map((c) => (-c.y + c.height / 2 + 12) * balanceScale),
    );
    const stackWidth = Math.max(
      vertical ? 33 * renderScale : 160 * balanceScale,
      ...grid.map(
        (c) =>
          (Math.abs(c.x) + c.width / 2) * balanceScale +
          (vertical ? 9 * renderScale : 0),
      ),
    );
    let low = 0,
      high = Math.max(
        0,
        Math.min(
          (width * (portrait ? 0.88 : 0.62)) / 2,
          (vertical
            ? width / 2 - 0.1 * renderScale
            : availableWidth / 2 - 12 * renderScale) - stackWidth,
        ),
      );
    const extent = (span: number) => {
      const rise = span * Math.sin((26 * Math.PI) / 180);
      const top =
        rise +
        Math.max(14 * balanceScale, stackRise - PAN_HANG_OFFSET * balanceScale);
      const bottom = Math.max(
        rise + (PAN_HANG_OFFSET + 60) * balanceScale,
        434 * balanceScale,
      );
      return { top, bottom };
    };
    // Width is used until either a legal stack or a tilt extreme reaches a boundary.
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      const e = extent(mid);
      if (e.top + e.bottom <= space) low = mid;
      else high = mid;
    }
    halfSpan = low / balanceScale;
    const e = extent(low);
    actualTop = e.top / balanceScale;
    actualBottom = e.bottom / balanceScale;
  }
  return {
    uiScale,
    orientation,
    hud: {
      bottom: hudBottom,
      subtitleY: hudBottom + (short ? 4 : 16) * uiScale,
      buttonSize,
    },
    balance: {
      x: centerX,
      y: (upper + lower + (actualTop - actualBottom) * balanceScale) / 2,
      scale: balanceScale,
      halfSpan,
    },
    tray: {
      positions,
      itemWidth: tileWidth,
      itemHeight: tileHeight,
      top: sourceTop,
    },
    pile: {
      x: portrait || !numberCount ? centerX : width - margin - pileWidth / 2,
      y: sourceBottom - pileHeight / 2,
      width: pileWidth,
      height: pileHeight,
    },
  };
}
