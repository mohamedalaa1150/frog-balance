import { presentBackground } from '../layout/background';
import Phaser from 'phaser';
import { MenuScene } from './MenuScene';
import { isWorldUnlocked } from '../core/progress';
import { readSave } from '../services/storage';
import { formatNumber } from '../core/numerals';
import { THEME } from '../theme';

interface Island {
  world: number;
  x: number;
  y: number;
}
export class WorldMapScene extends MenuScene {
  private islands: Phaser.GameObjects.Container[] = [];
  constructor() {
    super('WorldMapScene');
  }
  create(): void {
    this.islands = [];
    const save = readSave();
    const meta = this.cache.json.get('map-meta') as { islands: Island[] };
    const currentWorld = Math.max(
      ...meta.islands
        .filter((a) => isWorldUnlocked(save, a.world))
        .map((a) => a.world),
    );
    for (const anchor of meta.islands) {
      const unlocked = isWorldUnlocked(save, anchor.world);
      const image = this.add
        .image(0, 0, `island_${anchor.world}${unlocked ? '' : '_locked'}`)
        .setName(`world-${anchor.world}-art`)
        .setDisplaySize(280, 220);
      const label = this.text(
        `world_${anchor.world}`,
        `world-${anchor.world}-label`,
        25,
      ).setPosition(0, -75);
      const stars = Object.entries(save.levels)
        .filter(([id]) => id.startsWith(`w${anchor.world}-`))
        .reduce((sum, [, v]) => sum + v.bestStars, 0);
      const total = this.text(
        'map_choose_world',
        `world-${anchor.world}-stars`,
        26,
      )
        .setText(
          `${formatNumber(stars, save.settings.numerals)} / ${formatNumber(24, save.settings.numerals)}`,
        )
        .setPosition(0, 85);
      const container = this.add
        .container(0, 0, [image, label, total])
        .setName(`world-${anchor.world}`)
        .setSize(280, 220);
      container.setData('anchor', anchor);
      if (unlocked) {
        if (anchor.world === currentWorld)
          container.addAt(
            this.add
              .image(0, 0, 'world-current-glow')
              .setName(`world-${anchor.world}-glow`),
            0,
          );
        if (!this.reduced)
          this.tweens.add({
            targets: image,
            y: -3 * this.frame().r,
            duration: 1400 + anchor.world * 80,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        container.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, 280, 220),
          Phaser.Geom.Rectangle.Contains,
        );
        // The entire island is the touch target.
        bindIsland(this, container, `world_${anchor.world}`, () =>
          this.scene.start('LevelSelectScene', { world: anchor.world }),
        );
      } else {
        image.setAlpha(0.85);
        container.add(
          this.add
            .image(0, 0, 'lock_badge')
            .setName(`world-${anchor.world}-lock`)
            .setDisplaySize(80, 80),
        );
      }
      this.islands.push(container);
    }
    this.setup('map_choose_world', 'TitleScene');
    this.background.setTexture(this.frame().portrait ? 'map_bg_p' : 'map_bg');
    this.children.sendToBack(this.background);
    const f = this.frame();
    for (const [i, key] of [
      'ui_sandbox',
      'ui_practice',
      'ui_settings',
    ].entries()) {
      const button = this.icon(
        ['btn-sandbox', 'btn-practice', 'btn-settings'][i]!,
        ['btn_sandbox', 'btn_practice', 'btn_lock'][i]!,
        key,
        () =>
          this.scene.start(
            ['SandboxScene', 'PracticeScene', 'GrownUpGateScene'][i]!,
          ),
      );
      button
        .setPosition((i + 1) * f.button * 1.2, f.height - f.button * 0.6)
        .setDisplaySize(f.button, f.button);
      button.setData('footer-index', i);
    }
    this.layout();
    const pending = this.game.registry.get('world-unlocked') as
      number[] | undefined;
    if (pending?.length) {
      this.game.registry.remove('world-unlocked');
      const toast = this.text('world_unlocked', 'world-unlocked');
      toast.setPosition(f.width / 2, f.height * 0.5);
      void this.audio.play('sfx_unlock');
      void this.audio.play('world_unlocked', 'vo');
      this.game.events.emit('gameplay-event', {
        type: 'world-unlocked',
        data: { worlds: pending },
      });
      this.time.delayedCall(2500, () => toast.destroy());
      if (!this.reduced) {
        const emitter = this.add.particles(
          f.width / 2,
          f.height / 2,
          'particle_confetti',
          {
            tint: [THEME.gold, THEME.coral, THEME.frog],
            speed: 200,
            lifespan: 800,
            emitting: false,
          },
        );
        emitter.explode(30);
        this.time.delayedCall(900, () => emitter.destroy());
      }
    }
  }
  protected override layout(): void {
    const f = this.frame();
    if (this.background) {
      this.background
        .setTexture(f.portrait ? 'map_bg_p' : 'map_bg')
        .setDisplaySize(f.width, f.height);
      presentBackground(this.background);
    }
    // The same centred cover transform as the compositor background.
    const coverScale = Math.max(f.width / 1680, f.height / 944);
    const offsetX = (f.width - 1680 * coverScale) / 2;
    const offsetY = (f.height - 944 * coverScale) / 2;
    const islandWidth = f.portrait
      ? Math.max(120 * f.r, f.width * 0.32)
      : (f.height * 0.22 * 280) / 220;
    const islandHeight = (islandWidth * 220) / 280;
    for (const [i, island] of this.islands.entries()) {
      const a = island.getData('anchor') as Island;
      const x = f.portrait
        ? f.width * (i % 2 ? 0.25 : 0.75)
        : offsetX + a.x * 1680 * coverScale;
      const mappedY = f.portrait
        ? f.height * 0.78 - i * f.height * 0.118
        : offsetY + a.y * 944 * coverScale;
      // At wide phone ratios the cover crop cuts the top/bottom painted pads.
      // Keep the whole island on screen, within QA's 6%-of-width anchor tolerance;
      // footer controls move away from the pads rather than lifting world 1.
      const y = Math.max(
        islandHeight / 2 + 8 * f.r,
        Math.min(f.height - islandHeight / 2 - 8 * f.r, mappedY),
      );
      island.setPosition(x, y).setScale(1).setSize(islandWidth, islandHeight);
      if (island.input)
        (island.input.hitArea as Phaser.Geom.Rectangle).setTo(
          0,
          0,
          islandWidth,
          islandHeight,
        );
      for (const child of island.list) {
        if (child instanceof Phaser.GameObjects.Text)
          child
            .setFontSize(Math.max(16 * f.r, 21 * f.scale))
            .setWordWrapWidth(islandWidth - 8 * f.r)
            .setPadding(4 * f.r, 0, 4 * f.r, 0)
            .setPosition(
              0,
              child.name.endsWith('-stars')
                ? islandHeight * 0.33
                : -islandHeight * 0.33,
            );
        else if (child instanceof Phaser.GameObjects.Image)
          child.setDisplaySize(
            child.name.endsWith('-lock') ? 40 * f.r : islandWidth,
            child.name.endsWith('-lock') ? 40 * f.r : islandHeight,
          );
      }
    }
    if (f.portrait) this.header.setOrigin(0.5);
    else
      this.header
        .setOrigin(0.5, 0)
        .setFontSize(18 * f.r)
        .setStroke('#FFF6DC', 3)
        .setWordWrapWidth(f.width - 2 * f.button - 24 * f.r)
        .setPosition(f.width / 2, 8 * f.r);
    // Readable islands can have intersecting corner bounds even when their
    // painted centres differ. Resolve the smallest visual displacement within
    // the reviewer's anchor tolerance; never reserve footer space by moving pads.
    const placed: Phaser.GameObjects.Container[] = [];
    for (const island of this.islands) {
      let bounds = island.getBounds();
      if (bounds.top < 8 * f.r) island.y += 8 * f.r - bounds.top;
      if (bounds.bottom > f.height - 8 * f.r)
        island.y -= bounds.bottom - (f.height - 8 * f.r);
      bounds = island.getBounds();
      for (const other of placed) {
        const b = other.getBounds();
        if (!Phaser.Geom.Intersects.RectangleToRectangle(bounds, b)) continue;
        const options = [
          { x: b.left - bounds.right - 4 * f.r, y: 0 },
          { x: b.right - bounds.left + 4 * f.r, y: 0 },
          { x: 0, y: b.top - bounds.bottom - 4 * f.r },
          { x: 0, y: b.bottom - bounds.top + 4 * f.r },
        ].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
        for (const shift of options) {
          const candidate = new Phaser.Geom.Rectangle(
            bounds.x + shift.x,
            bounds.y + shift.y,
            bounds.width,
            bounds.height,
          );
          if (
            candidate.left >= 8 * f.r &&
            candidate.right <= f.width - 8 * f.r &&
            candidate.top >= 8 * f.r &&
            candidate.bottom <= f.height - 8 * f.r &&
            placed.every(
              (o) =>
                !Phaser.Geom.Intersects.RectangleToRectangle(
                  candidate,
                  o.getBounds(),
                ),
            )
          ) {
            island.x += shift.x;
            island.y += shift.y;
            bounds = candidate;
            break;
          }
        }
      }
      placed.push(island);
    }
    for (const object of this.children.list) {
      if (
        object instanceof Phaser.GameObjects.Image &&
        typeof object.getData('footer-index') === 'number'
      ) {
        const i = object.getData('footer-index') as number;
        object
          .setPosition(
            f.portrait
              ? f.width / 2 + (i - 1) * f.button * 1.4
              : (i + 0.6) * f.button * 1.25,
            f.height - f.button * 0.65,
          )
          .setDisplaySize(f.button, f.button);
      }
    }
  }
}
import { bindButton } from '../ui/Button';
const bindIsland = (
  scene: Phaser.Scene,
  island: Phaser.GameObjects.Container,
  label: string,
  action: () => void,
) => bindButton(scene, island, label, action);
