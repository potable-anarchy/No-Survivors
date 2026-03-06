import Phaser from 'phaser';
import { BulletPool } from './Bullet';

type EnemyState = 'idle' | 'patrol' | 'chase' | 'shoot';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private _speed = 80;
  private _detectionRange = 200;
  private _shootRange = 160;
  private _bullets: BulletPool;
  private _lastFired = 0;
  private _fireRate = 800;
  private _aiState: EnemyState = 'idle';
  private _player: Phaser.Physics.Arcade.Sprite;
  health = 30;
  alive = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.Physics.Arcade.Sprite,
    bullets: BulletPool,
  ) {
    super(scene, x, y, 'enemy_walk', 0);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

    this.setSize(12, 12);
    this.setOffset(2, 2);
    this.setDepth(9);
    this._player = player;
    this._bullets = bullets;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._player.x, this._player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this._player.x, this._player.y);

    if (dist < this._shootRange) {
      this._aiState = 'shoot';
    } else if (dist < this._detectionRange) {
      this._aiState = 'chase';
    } else {
      this._aiState = 'idle';
    }

    switch (this._aiState) {
      case 'idle':
        this.setVelocity(0, 0);
        this.anims.stop();
        break;

      case 'chase':
        this.setVelocity(Math.cos(angle) * this._speed, Math.sin(angle) * this._speed);
        this.setRotation(angle - Math.PI / 2);
        this.anims.play('enemy_walk', true);
        break;

      case 'shoot':
        this.setVelocity(0, 0);
        this.setRotation(angle - Math.PI / 2);
        this.anims.stop();
        if (time - this._lastFired > this._fireRate) {
          this._lastFired = time;
          const spread = (Math.random() - 0.5) * 0.15;
          const ox = Math.cos(angle) * 10;
          const oy = Math.sin(angle) * 10;
          this._bullets.fire(this.x + ox, this.y + oy, angle + spread, 400, false);
        }
        break;
    }
  }

  takeDamage(amount: number) {
    if (!this.alive) return;
    this.health -= amount;
    this.setTint(0xD62828);
    this.scene.time.delayedCall(80, () => { if (this.alive) this.clearTint(); });
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    this.health = 0;
    this.setVelocity(0, 0);
    this.anims.stop();
    this.setTexture('enemy_dead');
    this.clearTint();
    this.setAlpha(0.8);
    this.setDepth(1);
    this.body!.enable = false;
  }
}
