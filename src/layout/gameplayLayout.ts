import { MASCOT_ANCHORS, PAN_ANCHORS, PAN_HANG_OFFSET } from '../assets';
import { CONFIG } from '../config';
import { getLayout } from './layout';
import { PAN_STACK_HALF_WIDTH, PAN_STACK_RISE } from './panGrid';

/** Shared physical-pixel anchors, including the tallest legal pan stack at either
 * tilt extreme. Source targets keep their asset size, wrapping before shrinking. */
export function getGameplayLayout(
  width: number,
  height: number,
  numberCount: number,
  frogs: boolean,
  extraHeader = 0,
) {
  const { uiScale, renderScale, orientation, centerX } = getLayout(
    width,
    height,
  );
  const portrait = orientation === 'portrait';
  const margin = Math.max(8 * uiScale, 8 * renderScale);
  const gap = Math.max(6 * uiScale, 4 * renderScale);
  const pileWidth = 240 * uiScale;
  const pileHeight = 142 * uiScale;
  const availableWidth = width - 2 * margin;
  const trayWidth =
    availableWidth - (!portrait && frogs ? pileWidth + 16 * uiScale : 0);
  const desiredTileWidth = Math.max(120 * uiScale, 64 * renderScale);
  let columns = Math.min(
    numberCount,
    portrait
      ? 5
      : Math.max(1, Math.floor((trayWidth + gap) / (desiredTileWidth + gap))),
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
  const sourceHeight = portrait
    ? trayHeight + (frogs ? pileHeight + (rows ? 12 * uiScale : 0) : 0)
    : Math.max(trayHeight, frogs ? pileHeight : 0);
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
  const hudBottom = (70 + 44) * uiScale;
  const headerBottom = hudBottom + (40 + extraHeader) * uiScale;
  const upper = headerBottom + 8 * renderScale;
  const lower = sourceTop - 8 * renderScale;
  const halfSpan = portrait ? 200 : 396;
  // Reserve spring overshoot and the placement hop as well as the target angle.
  const endRise =
    halfSpan * Math.sin(((CONFIG.beam.maxAngle + 6) * Math.PI) / 180);
  const topExtent = endRise + Math.max(14, PAN_STACK_RISE - PAN_HANG_OFFSET);
  const bottomExtent = Math.max(
    endRise + PAN_HANG_OFFSET + PAN_ANCHORS.bottom,
    (MASCOT_ANCHORS.height - MASCOT_ANCHORS.pivotY) * 1.02,
  ); // Includes the mascot below the pivot.
  const balanceScale = Math.min(
    uiScale,
    (lower - upper) / (topExtent + bottomExtent),
    availableWidth /
      (2 * (halfSpan + Math.max(PAN_STACK_HALF_WIDTH, PAN_ANCHORS.width / 2))),
  );
  return {
    uiScale,
    orientation,
    hud: { bottom: hudBottom, subtitleY: hudBottom + 16 * uiScale },
    balance: {
      x: centerX,
      y: (upper + lower + (topExtent - bottomExtent) * balanceScale) / 2,
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
