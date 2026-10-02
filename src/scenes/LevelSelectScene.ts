import Phaser from 'phaser';
import { MenuScene } from './MenuScene';
import { readSave } from '../services/storage';
import { isLevelUnlocked } from '../core/progress';
import { formatNumber } from '../core/numerals';
import { bindButton } from '../ui/Button';
export class LevelSelectScene extends MenuScene {
  private pads: Phaser.GameObjects.Container[] = [];
  constructor() {
    super('LevelSelectScene');
  }
  override init(data: { world?: number } = {}): void {
    super.init();
    this.world = data.world ?? 1;
  }
  create(): void {
    this.pads = [];
    const save = readSave();
    for (let index = 1; index <= 8; index++) {
      const id = `w${this.world}-l${index}`,
        unlocked = isLevelUnlocked(save, this.world, index);
      const image = this.add
        .image(0, 0, unlocked ? 'lily_level' : 'lily_level_locked')
        .setDisplaySize(150, 150);
      const digit = this.text(
        'map_choose_level',
        `level-${id}-number`,
        54,
      ).setText(formatNumber(index, save.settings.numerals));
      const pad = this.add
        .container(0, 0, [image, digit])
        .setName(`level-${id}`)
        .setSize(150, 150);
      for (let i = 0; i < 3; i++)
        pad.add(
          this.add
            .image(
              (i - 1) * 38,
              85,
              i < (save.levels[id]?.bestStars ?? 0)
                ? 'star_full'
                : 'star_empty',
            )
            .setDisplaySize(32, 32),
        );
      if (unlocked) {
        pad.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, 150, 150),
          Phaser.Geom.Rectangle.Contains,
        );
        bindButton(this, pad, `count_${String(index).padStart(2, '0')}`, () =>
          this.scene.start('GameScene', { levelId: id }),
        );
      }
      this.pads.push(pad);
    }
    this.setup('map_choose_level');
  }
  protected override layout(): void {
    const f = this.frame(),
      columns = f.portrait ? 2 : 4,
      rows = 8 / columns;
    const size = Math.min(
      140 * f.scale,
      ((f.width - 40 * f.r) / columns) * 0.8,
      (f.height - f.button * 2) / (rows * 1.5),
    );
    this.pads.forEach((pad, i) =>
      pad
        .setPosition(
          f.width / 2 + ((columns - 1) / 2 - (i % columns)) * (size * 1.35),
          f.button * 1.5 +
            ((Math.floor(i / columns) + 0.6) * (f.height - f.button * 1.8)) /
              rows,
        )
        .setScale(size / 150),
    );
  }
}
