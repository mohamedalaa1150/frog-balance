import '@fontsource/baloo-bhaijaan-2/500.css';
import '@fontsource/baloo-bhaijaan-2/700.css';
import '@fontsource/baloo-bhaijaan-2/800.css';
import './styles.css';
import Phaser from 'phaser';
import { getViewport, installViewportController } from './layout/viewport';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { installTestApi } from './testing/testApi';

if (import.meta.env.DEV) {
  const [{ LevelsFile }, { default: levels }] = await Promise.all([
    import('./core/levelSchema'),
    import('../content/levels.json'),
  ]);
  LevelsFile.parse(levels);
}

const parent = document.getElementById('game');
if (!parent) throw new Error('Missing game container');
const viewport = getViewport(parent);
const game = new Phaser.Game({
  // Phase 0 only draws Graphics/Text; Canvas avoids GPU readback probes on software renderers.
  // TODO: Phase 2: evaluate WebGL when adding atlases and gameplay effects.
  type: Phaser.CANVAS,
  parent: 'game',
  backgroundColor: '#174d52',
  banner: false,
  scale: {
    mode: Phaser.Scale.NONE,
    width: viewport.width,
    height: viewport.height,
    zoom: 1 / viewport.renderScale,
  },
  scene: [BootScene, PreloadScene, TitleScene],
  input: { activePointers: 2 },
  // Audio assets and interaction arrive in Phase 2.
  audio: { noAudio: true },
});

document
  .getElementById('game')
  ?.addEventListener('contextmenu', (event) => event.preventDefault());
installTestApi(game);
installViewportController(game, parent);
