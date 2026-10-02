/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';
import { installVisibility } from './services/visibility';
import { SettingsScene } from './scenes/SettingsScene';
import { DashboardScene } from './scenes/DashboardScene';
import { PracticeScene } from './scenes/PracticeScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GrownUpGateScene } from './scenes/GrownUpGateScene';
import '@fontsource/baloo-bhaijaan-2/500.css';
import '@fontsource/baloo-bhaijaan-2/700.css';
import '@fontsource/baloo-bhaijaan-2/800.css';
import './styles.css';
import { THEME, cssColor } from './theme';
document.documentElement.style.setProperty('--sky', cssColor(THEME.sky));
document
  .querySelector('meta[name=theme-color]')
  ?.setAttribute('content', cssColor(THEME.sky));
import Phaser from 'phaser';
import { getViewport, installViewportController } from './layout/viewport';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { ResultScene } from './scenes/ResultScene';
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
  type: Phaser.CANVAS,
  transparent: true,
  parent: 'game',
  backgroundColor: cssColor(THEME.sky),
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
    WorldMapScene,
    LevelSelectScene,
    GrownUpGateScene,
    SettingsScene,
    DashboardScene,
    PracticeScene,
    GameScene,
    SandboxScene,
    ResultScene,
    ...(new URLSearchParams(location.search).get('test') === '1'
      ? [DevLevelListScene]
      : []),
  ],
  input: { activePointers: 2 },
  audio: { disableWebAudio: true },
});

document
  .getElementById('game')
  ?.addEventListener('contextmenu', (event) => event.preventDefault());
installTestApi(game);
installViewportController(game, parent);

installVisibility(game);
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    registration?.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (
          worker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          game.registry.set('update-ready', true);
          game.events.emit('update-ready');
        }
      });
    });
  },
});
