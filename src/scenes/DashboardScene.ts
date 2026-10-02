import Phaser from 'phaser';
import { MenuScene, menuLabel } from './MenuScene';
import { readSave } from '../services/storage';
import { dashboard, progressCsv } from '../core/dashboard';
import { formatNumber } from '../core/numerals';
export class DashboardScene extends MenuScene {
  private rows: Phaser.GameObjects.Text[] = [];
  private exportButton!: Phaser.GameObjects.Image;
  constructor() {
    super('DashboardScene');
  }
  create(): void {
    this.rows = [];
    const save = readSave(),
      data = dashboard(save),
      number = (n: number) =>
        formatNumber(Math.round(n * 10) / 10, save.settings.numerals);
    for (const world of data.worlds) {
      const row = this.text(
        `world_${world.world}`,
        `dashboard-world-${world.world}`,
        28,
      );
      row.setText(
        `${menuLabel(`world_${world.world}`)}  ${menuLabel('dashboard_mastery')} ${number(world.mastery)}%  ${menuLabel('dashboard_hints')} ${number(world.averageHints)}`,
      );
      this.rows.push(row);
    }
    for (const error of data.topErrors) {
      this.rows.push(
        this.text(
          `error_${error.tag}`,
          `dashboard-error-${error.tag}`,
          25,
        ).setText(`${menuLabel(`error_${error.tag}`)}: ${number(error.count)}`),
      );
    }
    this.rows.push(
      this.text(data.recommendation, 'dashboard-recommendation', 28),
    );
    this.exportButton = this.icon(
      'btn-export',
      'btn_download',
      'dashboard_csv',
      () => {
        const csv = progressCsv(
          readSave(),
          [
            'csv_level',
            'csv_stars',
            'csv_plays',
            'csv_attempts',
            'csv_hints',
            'csv_errors',
          ].map(menuLabel),
        );
        const url = URL.createObjectURL(
          new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'frog-balance-progress.csv';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.game.events.emit('gameplay-event', {
          type: 'csv-export',
          data: { csv },
        });
      },
    );
    this.setup('ui_dashboard', 'SettingsScene');
  }
  protected override layout(): void {
    const f = this.frame(),
      step = (f.height - f.button * 2.8) / this.rows.length;
    this.rows.forEach((row, i) =>
      row
        .setPosition(f.width / 2, f.button * 1.35 + (i + 0.5) * step)
        .setFontSize(Math.min(28 * f.scale, step * 0.65))
        .setWordWrapWidth(f.width * 0.9),
    );
    this.exportButton
      .setPosition(f.width / 2, f.height - f.button * 0.65)
      .setDisplaySize(f.button, f.button);
  }
}
