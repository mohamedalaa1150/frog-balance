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
    // The first unlocked level without stars glows as "play me next".
    let currentIndex = 0;
    for (let index = 1; index <= 8; index++)
      if (
        isLevelUnlocked(save, this.world, index) &&
        !save.levels[`w${this.world}-l${index}`]?.bestStars
      ) {
        currentIndex = index;
        break;
      }
    for (let index = 1; index <= 8; index++) {
      const id = `w${this.world}-l${index}`,
        unlocked = isLevelUnlocked(save, this.world, index);
      // Generated lily-pad art: plain, glowing "current", or stone + padlock.
      const image = this.add.image(
        0,
        0,
        !unlocked
          ? 'lily_level_locked'
          : index === currentIndex
            ? 'lily_level_current'
            : 'lily_level',
      );
      const source = image.texture.getSourceImage();
      const fit = 150 / Math.max(source.width, source.height);
      image.setDisplaySize(source.width * fit, source.height * fit);
      const digit = this.text('map_choose_level', `level-${id}-number`, 58)
        .setText(formatNumber(index, save.settings.numerals))
        .setColor('#FFFFFF')
        .setStroke(unlocked ? '#2F6B1F' : '#5B6670', 10)
        .setY(12);
      const pad = this.add
        .container(0, 0, [image, digit])
        .setName(`level-${id}`)
        .setSize(150, 150);
      for (let i = 0; i < 3; i++)
        pad.add(
          this.add
            .image(
              (i - 1) * 38,
              92,
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
      185 * f.scale,
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
