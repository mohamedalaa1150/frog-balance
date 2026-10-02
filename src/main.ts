import '@fontsource/baloo-bhaijaan-2/500.css';
import '@fontsource/baloo-bhaijaan-2/700.css';
import '@fontsource/baloo-bhaijaan-2/800.css';
import './styles.css';
import Phaser from 'phaser';
import { getViewport, installViewportController } from './layout/viewport';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { SandboxScene } from './scenes/SandboxScene';
import { DevLevelListScene } from './scenes/DevLevelListScene';
import { installTestApi } from './testing/testApi';
import { validateVoKeys } from './services/strings';

if (import.meta.env.DEV) {
  const [{ LevelsFile }, { default: levels }] = await Promise.all([
    import('./core/levelSchema'),
    import('../content/levels.json'),
  ]);
  validateVoKeys(LevelsFile.parse(levels).levels);
}

const parent = document.getElementById('game');
if (!parent) throw new Error('Missing game container');
const viewport = getViewport(parent);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#174d52',
  banner: false,
  // Sprite edges and text are already antialiased in render-scale textures.
  // Avoid a second multisample framebuffer, particularly costly on software GPUs.
  render: { antialias: true, antialiasGL: false },
  scale: {
    mode: Phaser.Scale.NONE,
    width: viewport.width,
    height: viewport.height,
    zoom: 1 / viewport.renderScale,
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    GameScene,
    SandboxScene,
    DevLevelListScene,
  ],
  input: { activePointers: 2 },
  audio: { disableWebAudio: true },
});

document
  .getElementById('game')
  ?.addEventListener('contextmenu', (event) => event.preventDefault());
installTestApi(game);
installViewportController(game, parent);
