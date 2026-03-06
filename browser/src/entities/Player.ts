import Phaser from 'phaser';
import { BulletPool } from './Bullet';

export type WeaponType = 'pistol' | 'auto_pistol' | 'rifle' | 'shotgun';

interface WeaponStats {
  fireRate: number; // ms between shots
  bulletSpeed: number;
  spread: number; // radians
  pellets: number;
  auto: boolean;
}

const WEAPONS: Record<WeaponType, WeaponStats> = {
  pistol: { fireRate: 300, bulletSpeed: 600, spread: 0.03, pellets: 1, auto: false },
  auto_pistol: { fireRate: 120, bulletSpeed: 600, spread: 0.06, pellets: 1, auto: true },
  rifle: { fireRate: 80, bulletSpeed: 800, spread: 0.04, pellets: 1, auto: true },
  shotgun: { fireRate: 500, bulletSpeed: 500, spread: 0.15, pellets: 5, auto: false },
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private speed = 200;
  private bullets: BulletPool;
  private lastFired = 0;
  weapon: WeaponType = 'pistol';
  private mouseDown = false;
  health = 100;
  alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number, bullets: BulletPool) {
    super(scene, x, y, 'player_walk', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(12, 12);
    this.setOffset(2, 2);
    this.setDepth(10);
    this.bullets = bullets;

    const kb = scene.input.keyboard!;
    this.cursors = {
      up: kb.addKey('W'),
      down: kb.addKey('S'),
      left: kb.addKey('A'),
      right: kb.addKey('D'),
    };

    scene.input.on('pointerdown', () => { this.mouseDown = true; });
    scene.input.on('pointerup', () => { this.mouseDown = false; });
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    // Movement
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown) vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown) vy -= 1;
    if (this.cursors.down.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * this.speed;
      vy = (vy / len) * this.speed;
      this.anims.play('player_walk', true);
    } else {
      this.anims.stop();
      this.setFrame(0);
    }
    this.setVelocity(vx, vy);

    // Aim toward mouse
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
    this.setRotation(angle - Math.PI / 2);

    // Shooting
    const stats = WEAPONS[this.weapon];
    const canFire = stats.auto ? this.mouseDown : (this.mouseDown && time - this.lastFired > stats.fireRate);
    if (canFire && time - this.lastFired > stats.fireRate) {
      this.shoot(angle, stats, time);
    }
  }

  private shoot(baseAngle: number, stats: WeaponStats, time: number) {
    this.lastFired = time;
    for (let i = 0; i < stats.pellets; i++) {
      const spread = (Math.random() - 0.5) * stats.spread * 2;
      const angle = baseAngle + spread;
      const ox = Math.cos(angle) * 10;
      const oy = Math.sin(angle) * 10;
      this.bullets.fire(this.x + ox, this.y + oy, angle, stats.bulletSpeed, true);
    }
  }

  takeDamage(amount: number) {
    if (!this.alive) return;
    this.health -= amount;
    this.setTint(0xD62828);
    this.scene.time.delayedCall(100, () => { if (this.alive) this.clearTint(); });
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.setVelocity(0, 0);
      this.body!.enable = false;
      this.clearTint();
      this.setRotation(0);
      this.anims.stop();
      this.setTexture('player_dead', 0);
      this.anims.play('player_dead');
      this.setDepth(1);
    }
  }

  equipWeapon(type: WeaponType) {
    this.weapon = type;
  }
}
