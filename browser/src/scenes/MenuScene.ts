import Phaser from 'phaser';

const LEVELS = [
  { key: 'Tutorial Level', name: 'Tutorial' },
  { key: 'alley', name: 'Alley' },
  { key: 'hotel', name: 'Hotel' },
  { key: 'maze2', name: 'Maze' },
  { key: 'diner', name: 'Diner' },
  { key: 'Big run', name: 'Big Run' },
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    this.add.text(cx, 80, 'NO SURVIVORS', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#FCBF49',
    }).setOrigin(0.5);

    this.add.text(cx, 130, 'SELECT LEVEL', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#F77F00',
    }).setOrigin(0.5);

    LEVELS.forEach((level, i) => {
      const btn = this.add.text(cx, 200 + i * 50, level.name, {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#FCBF49',
        backgroundColor: '#003049',
        padding: { x: 20, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#F77F00'));
      btn.on('pointerout', () => btn.setColor('#FCBF49'));
      btn.on('pointerdown', () => {
        this.scene.start('Game', { levelKey: level.key });
      });
    });

    const editorBtn = this.add.text(cx, 200 + LEVELS.length * 50 + 20, 'LEVEL EDITOR', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#F77F00',
      backgroundColor: '#003049',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    editorBtn.on('pointerover', () => editorBtn.setColor('#FCBF49'));
    editorBtn.on('pointerout', () => editorBtn.setColor('#F77F00'));
    editorBtn.on('pointerdown', () => {
      window.location.href = './editor.html';
    });
  }
}
