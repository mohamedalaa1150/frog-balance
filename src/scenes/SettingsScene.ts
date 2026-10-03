import Phaser from 'phaser';
import { MenuScene, menuLabel } from './MenuScene';
import { readSave, writeSave } from '../services/storage';
import { defaults, type SaveV1 } from '../core/progress';
import { Slider } from '../ui/Slider';
import { bindButton } from '../ui/Button';
import { formatNumber } from '../core/numerals';
import { NinePanel } from '../ui/NinePanel';

/** Game-style row card: parchment with a wooden rim and soft drop shadow. */
function rowCard(scene: Phaser.Scene, w: number, h: number) {
  return scene.add
    .graphics()
    .fillStyle(0x5a3414, 0.28)
    .fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 24)
    .fillStyle(0xfff6dc, 1)
    .fillRoundedRect(-w / 2, -h / 2, w, h, 24)
    .lineStyle(5, 0xb7864a, 1)
    .strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
}
/** Green "chip" behind the current value, so it reads as a tappable toggle. */
function valueChip(scene: Phaser.Scene, w: number, h: number) {
  return scene.add
    .graphics()
    .fillStyle(0x2e7d32, 1)
    .fillRoundedRect(-w / 2, -h / 2 + 4, w, h, h / 2)
    .fillStyle(0x5cb85c, 1)
    .fillRoundedRect(-w / 2, -h / 2, w, h, h / 2)
    .fillStyle(0xffffff, 0.25)
    .fillRoundedRect(-w / 2 + 10, -h / 2 + 4, w - 20, h * 0.35, h * 0.17);
}

export class SettingsScene extends MenuScene {
  private rows: Phaser.GameObjects.Container[] = [];
  private footer: Phaser.GameObjects.Image[] = [];
  private confirmed = false;
  private board?: NinePanel;
  constructor() {
    super('SettingsScene');
  }
  create(): void {
    this.rows = [];
    this.footer = [];
    this.board = undefined;
    if (
      !this.game.registry.get('grown-up-unlocked') &&
      new URLSearchParams(location.search).get('test') !== '1'
    ) {
      this.scene.start('GrownUpGateScene');
      return;
    }
    const save = readSave();
    const changed = <K extends keyof SaveV1['settings']>(
      key: K,
      value: SaveV1['settings'][K],
    ) => {
      const next = readSave();
      next.settings[key] = value;
      writeSave(next);
      this.game.events.emit('settings-changed', next.settings);
      this.game.events.emit('gameplay-event', {
        type: 'settings',
        data: { key, value },
      });
    };
    const choices = <K extends keyof SaveV1['settings']>(
      key: K,
      values: readonly SaveV1['settings'][K][],
      labels: readonly string[],
    ) => {
      const title = this.text(
        `settings_${key}`,
        `setting-${key}-label`,
        26,
      ).setPosition(0, -26);
      const value = this.text(
        labels[Math.max(0, values.indexOf(save.settings[key]))]!,
        `setting-${key}-value`,
        24,
      )
        .setColor('#FFFFFF')
        .setStroke('#2E7D32', 5)
        .setPosition(0, 22);
      const row = this.add
        .container(0, 0, [
          this.add.zone(0, 0, 340, 112),
          rowCard(this, 400, 118),
          valueChip(this, 230, 44).setPosition(0, 22),
          title,
          value,
        ])
        .setName(`setting-${key}`)
        .setSize(340, 112)
        .setInteractive(
          new Phaser.Geom.Rectangle(0, 0, 340, 112),
          Phaser.Geom.Rectangle.Contains,
        );
      bindButton(this, row, `settings_${key}`, () => {
        const current = readSave().settings[key] ?? values[0]!;
        const index = (values.indexOf(current) + 1) % values.length;
        changed(key, values[index]!);
        value.setText(menuLabel(labels[index]!));
        if (key === 'numerals') {
          this.scene.restart();
        }
      });
      this.rows.push(row);
    };
    choices(
      'numerals',
      ['arabic-indic', 'western'],
      ['numerals_arabic', 'numerals_western'],
    );
    choices(
      'equationDirection',
      ['rtl', 'ltr'],
      ['direction_rtl', 'direction_ltr'],
    );
    choices('voCount', [true, false], ['setting_on', 'setting_off']);
    choices(
      'reducedMotion',
      ['system', 'on', 'off'],
      ['setting_system', 'setting_on', 'setting_off'],
    );
    choices(
      'idleHintSec',
      [8, 12, 20, 0],
      ['idle_8', 'idle_12', 'idle_20', 'setting_off'],
    );
    for (const channel of ['music', 'sfx', 'vo'] as const) {
      const label = this.text(
        `settings_${channel}`,
        `setting-${channel}-label`,
        28,
      ).setPosition(0, -32);
      const number = this.text(
        `settings_${channel}`,
        `setting-${channel}-value`,
        25,
      )
        .setText(
          formatNumber(
            Math.round(save.settings[channel] * 100),
            save.settings.numerals,
          ),
        )
        .setPosition(165, 14);
      const slider = new Slider(
        this,
        `setting-${channel}`,
        save.settings[channel],
        (v) => {
          changed(channel, v);
          number.setText(
            formatNumber(Math.round(v * 100), readSave().settings.numerals),
          );
        },
      );
      slider.setPosition(-26, 16);
      this.rows.push(
        this.add
          .container(0, 0, [rowCard(this, 400, 118), label, slider, number])
          .setName(`row-${channel}`),
      );
    }
    const reset = this.icon('btn-reset', 'btn_replay', 'settings_reset', () => {
      if (!this.confirmed) {
        this.confirmed = true;
        this.header.setText(menuLabel('settings_reset_confirm'));
        return;
      }
      const fresh = defaults();
      fresh.settings = readSave().settings;
      writeSave(fresh);
      this.confirmed = false;
      this.scene.restart();
    });
    const dashboard = this.icon(
      'btn-dashboard',
      'btn_dashboard',
      'ui_dashboard',
      () => this.scene.start('DashboardScene'),
    );
    this.footer = [reset, dashboard];
    this.board = new NinePanel(this, 'panel_board')
      .setDepth(-5)
      .setName('settings-board');
    this.setup('ui_settings', 'TitleScene');
  }
  protected override layout(): void {
    const f = this.frame(),
      columns = f.portrait ? 1 : f.height / f.r < 500 ? 3 : 2,
      rows = Math.ceil(this.rows.length / columns);
    const available = f.height - f.button * 2.8;
    const scale = Math.min(
      (f.width / columns - 24 * f.r) / 420,
      available / (rows * 140),
    );
    // Pack the columns together (no empty gutter in the middle of the board).
    const step = Math.min(f.width / columns, 420 * scale + 20 * f.r);
    const boardTop = f.button * 1.25 - 12 * f.r,
      boardBottom = f.button * 1.45 + available;
    this.board
      ?.setPosition(f.width / 2, (boardTop + boardBottom) / 2)
      .resize(
        Math.min(
          f.width - 16 * f.r,
          (columns - 1) * step + 400 * scale + 70 * f.r,
        ),
        boardBottom - boardTop,
        0.6 * f.scale,
      );
    this.rows.forEach((row, i) =>
      row
        .setPosition(
          f.width / 2 + ((columns - 1) / 2 - (i % columns)) * step,
          f.button * 1.35 +
            ((Math.floor(i / columns) + 0.5) * available) / rows,
        )
        .setScale(scale),
    );
    this.footer.forEach((b, i) =>
      b
        .setPosition(
          f.width / 2 + (i - 0.5) * f.button * 1.6,
          f.height - f.button * 0.65,
        )
        .setDisplaySize(f.button, f.button),
    );
  }
}
