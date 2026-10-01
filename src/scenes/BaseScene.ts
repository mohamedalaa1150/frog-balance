import Phaser from 'phaser';

export type SceneReadyEvent = { key: string } & Record<string, unknown>;

/** Every subclass reports readiness after create completes and its first frame renders. */
export class BaseScene extends Phaser.Scene {
  private rendered?: () => void;

  constructor(key: string) {
    super(key);
  }

  // Phaser injects scene events after construction. Overrides must call super.init().
  init(): void {
    this.events.once(Phaser.Scenes.Events.CREATE, () => this.markReady());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cancelReady, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cancelReady, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cancelReady, this);
  }

  protected getReadyData(): Record<string, unknown> {
    return {};
  }
  protected onReady(data: SceneReadyEvent): void {
    void data;
  }

  protected markReady(data: Record<string, unknown> = {}): void {
    this.cancelReady();
    this.rendered = () => {
      this.rendered = undefined;
      if (!this.scene.isActive()) return;
      const event = { ...this.getReadyData(), ...data, key: this.scene.key };
      this.game.events.emit('scene-ready', event);
      this.onReady(event);
    };
    this.game.events.once(Phaser.Core.Events.POST_RENDER, this.rendered);
  }

  private cancelReady(): void {
    if (this.rendered)
      this.game.events.off(Phaser.Core.Events.POST_RENDER, this.rendered);
    this.rendered = undefined;
  }
}
