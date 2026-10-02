import { GameScene } from './GameScene';
import { generateLevel } from '../core/generator';
import { unlockedModes } from '../core/progress';
import { readSave } from '../services/storage';
export class PracticeScene extends GameScene {
  constructor() {
    super('PracticeScene');
  }
  override init(): void {
    const save = readSave();
    const index =
      (this.game.registry.get('practice-index') as number | undefined) ?? 0;
    this.game.registry.set('practice-index', index + 1);
    super.init({
      definition: generateLevel(
        Date.now() + index,
        unlockedModes(save),
        save.practice.band,
        index,
      ),
    });
  }
}
