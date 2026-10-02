import Phaser from 'phaser';
import { MenuScene } from './MenuScene';
import { THEME } from '../theme';
export class GrownUpGateScene extends MenuScene {
  private lock!: Phaser.GameObjects.Image;
  private ring!: Phaser.GameObjects.Graphics;
  private held = false;
  private progress = 0;
  private timer?: Phaser.Time.TimerEvent;
  constructor() {
    super('GrownUpGateScene');
  }
  create(): void {
    this.progress = 0;
    this.held = false;
    this.lock = this.add
      .image(0, 0, 'btn_lock')
      .setName('gate-lock')
      .setInteractive();
    this.ring = this.add.graphics().setName('gate-progress');
    const cancel = () => {
      this.held = false;
      this.progress = 0;
      this.timer?.remove();
      this.ring.clear();
    };
    this.lock.on('pointerdown', () => {
      cancel();
      this.held = true;
      this.timer = this.time.addEvent({
        delay: 30,
        loop: true,
        callback: () => {
          if (!this.held) return;
          this.progress += 30;
          if (this.progress >= 700 && this.progress < 730) {
            this.audio.unlock();
            void this.audio.play('gate_hold', 'vo', 'interrupt');
          }
          const f = this.frame();
          this.ring
            .clear()
            .lineStyle(8 * f.r, THEME.gold)
            .beginPath()
            .arc(
              this.lock.x,
              this.lock.y,
              f.button * 1.1,
              -Math.PI / 2,
              -Math.PI / 2 + (Math.PI * 2 * this.progress) / 3000,
            )
            .strokePath();
          if (this.progress >= 3000) {
            cancel();
            this.game.registry.set('grown-up-unlocked', true);
            this.scene.start('SettingsScene');
          }
        },
      });
    });
    this.lock.on('pointerout', cancel);
    this.input.on('pointerup', cancel);
    this.input.on('pointerupoutside', cancel);
    this.input.on('gameout', cancel);
    this.setup('gate_hold', 'TitleScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cancel();
      this.input.off('pointerup', cancel);
      this.input.off('pointerupoutside', cancel);
      this.input.off('gameout', cancel);
    });
  }
  protected override layout(): void {
    if (!this.lock) return;
    const f = this.frame();
    this.lock
      .setPosition(f.width / 2, f.height / 2)
      .setDisplaySize(f.button * 1.8, f.button * 1.8);
    this.header
      .setPosition(f.width / 2, f.height * 0.22)
      .setWordWrapWidth(f.width * 0.8);
  }
}
