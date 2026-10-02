import type Phaser from 'phaser';
/** Phaser's sleeping loop pauses scene clocks; resume resets the frame delta. */
export function installVisibility(game: Phaser.Game): void {
  const changed = () => {
    if (document.hidden) {
      game.loop.sleep();
      game.sound.pauseAll();
    } else {
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
