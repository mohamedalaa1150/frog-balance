import type { LevelState } from '../core/types';
import { MASCOT_ANCHORS } from '../assets';
import { CONFIG } from '../config';
import { getLayout } from './layout';
import { getPanGrid, legalStacks, panHangLength } from './panGrid';

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
  const pileHeight = short
    ? Math.min(142 * uiScale, height * 0.22 - margin)
    : 142 * uiScale;
  const pileWidth = pileHeight * (240 / 142);
  const availableWidth = width - 2 * margin;
  const trayWidth =
    availableWidth - (!portrait && frogs ? pileWidth + 16 * uiScale : 0);
  const desiredTileWidth =
    !portrait && numberCount
      ? Math.max(
          64 * renderScale,
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
  const bottomMargin = short
    ? Math.max(0, Math.min(margin, height * 0.22 - sourceHeight))
    : margin;
  const sourceBottom = height - bottomMargin;
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
  void extraHeader;
  // Balance geometry is calculated in CSS pixels, then presented at renderScale.
  // The dish, hanging strings, beam and mascot have independent dimensions.
  const w = width / renderScale,
    h = height / renderScale;
  const frogWidth =
    portrait || short ? 36 : Math.max(36, 48 * Math.min(w / 1366, h / 768));
  const tileWidthOnPan = (frogWidth * 4) / 3;
  const dishWidth = portrait
    ? Math.max(144, w * 0.34)
    : Math.max(5 * frogWidth, 2 * tileWidthOnPan + 3 * frogWidth);
  const grid = {
    portrait,
    width: dishWidth,
    frogWidth,
    tileWidth: tileWidthOnPan,
  };
  const shapes = level
    ? legalStacks(level)
    : [
        Array<'number'>(3).fill('number'),
        Array<'frog'>(10).fill('frog'),
        [
          ...Array<'number'>(2).fill('number'),
          ...Array<'frog'>(6).fill('frog'),
        ],
      ];
  const stackHeight = Math.max(
    0,
    ...shapes.flatMap((kinds) =>
      getPanGrid(kinds, grid).map((c) => -c.y + c.height / 2),
    ),
  );
  const angle = ((CONFIG.beam.maxAngle + 2) * Math.PI) / 180;
  // Rings retain their readable size while only the navy shaft stretches.
  const beamHeight = 56;
  const halfSpan = portrait
    ? (w - dishWidth) / 2 - 8
    : ((w * (short ? 0.45 : 0.62) - beamHeight * Math.sin(angle)) /
        Math.cos(angle) -
        40) /
      2;
  const rise = halfSpan * Math.sin(angle);
  const dishBottom = short ? 12 : 20;
  const upperItem = (buttonSize + 6 * renderScale) / renderScale + 8;
  const lower = sourceTop / renderScale - 8;
  // Suspensions follow the actual stack and tilt, so a low full pan does not
  // inherit the extra string length only needed by a high full pan.
  let minPivot = Math.max(8 + rise + beamHeight / 2, upperItem + rise - 34);
  let maxPivot = lower - rise - stackHeight - 34 - dishBottom;
  if (short) {
    // Short screens need the actual grid clearances, rather than a guessed
    // hanging offset. Rings are 40 px tall; the central pivot is 56 px tall.
    minPivot = Math.max(8 + rise + 20, 8 + beamHeight / 2);
    maxPivot = Infinity;
    const settled = (CONFIG.beam.maxAngle * Math.PI) / 180;
    for (const kinds of shapes) {
      const cells = getPanGrid(kinds, grid);
      const top = Math.max(0, ...cells.map((c) => -c.y + c.height / 2));
      for (const side of ['left', 'right'] as const)
        for (const tilt of [-settled, settled]) {
          const ringY = (side === 'left' ? -1 : 1) * halfSpan * Math.sin(tilt);
          const hang = panHangLength(cells, side, tilt);
          if (cells.length)
            minPivot = Math.max(minPivot, upperItem - ringY - hang + top);
          maxPivot = Math.min(
            maxPivot,
            lower - ringY - hang - Math.max(dishBottom, 16),
          );
        }
    }
  }
  const pivotY = minPivot + Math.max(0, maxPivot - minPivot) / 2;
  const innerGap = 2 * halfSpan * Math.cos(angle) - dishWidth;
  const mascotWidth = Math.min(
    innerGap,
    portrait ? w * 0.25 : (h * 0.38 * 440) / 460,
    ((lower - pivotY) * 440) / (460 - MASCOT_ANCHORS.pivotY),
  );
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
      y: pivotY * renderScale,
      scale: renderScale,
      grid,
      dishBottom,
      beamHeight,
      mascotWidth,
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
