import type Phaser from 'phaser';
/** Pause the loop and remove hidden wall time from absolute scene deadlines. */
export function installVisibility(game: Phaser.Game): void {
  let hiddenAt: number | undefined;
  const changed = () => {
    if (document.hidden) {
      hiddenAt ??= Date.now();
      game.loop.sleep();
      game.sound.pauseAll();
    } else {
      const elapsed = hiddenAt === undefined ? 0 : Date.now() - hiddenAt;
      hiddenAt = undefined;
      for (const scene of game.scene.getScenes(true)) {
        // TweenManager uses Date.now rather than the paused scene delta.
        scene.tweens.prevTime += elapsed;
        scene.tweens.startTime += elapsed;
        scene.events.emit('visibility-resume', elapsed);
      }
      game.sound.resumeAll();
      game.loop.wake();
    }
    game.events.emit('gameplay-event', {
      type: 'visibility',
      data: { hidden: document.hidden },
    });
  };
  document.addEventListener('visibilitychange', changed);
  game.events.once('destroy', () =>
    document.removeEventListener('visibilitychange', changed),
  );
}
