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
          container.addAt(this.add.image(0, 0, 'world-current-glow'), 0);
        if (!this.reduced)
          this.tweens.add({
            targets: image,
            y: -5,
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
          this.add.image(0, 0, 'lock_badge').setDisplaySize(80, 80),
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
        ['btn_read', 'btn_play', 'btn_lock'][i]!,
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
    for (const [i, island] of this.islands.entries()) {
      const a = island.getData('anchor') as Island;
      const s = Math.min(
        f.portrait ? f.width / 700 : f.width / 1500,
        f.height / (f.portrait ? 1900 : 1300),
      );
      const y = f.portrait
        ? f.height * 0.78 - i * f.height * 0.118
        : Math.max(
            f.button * 1.4,
            Math.min(
              f.height - f.button * 1.5 - 110 * s - 8 * f.r,
              a.y * f.height,
            ),
          );
      island
        .setPosition(
          f.portrait ? f.width * (i % 2 ? 0.35 : 0.65) : a.x * f.width,
          y,
        )
        .setScale(s);
    }
    for (const object of this.children.list) {
      if (
        object instanceof Phaser.GameObjects.Image &&
        typeof object.getData('footer-index') === 'number'
      ) {
        const i = object.getData('footer-index') as number;
        object
          .setPosition(
            f.width / 2 + (i - 1) * f.button * 1.4,
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
