import Phaser from 'phaser';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  private lifespan = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '__bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, angle: number, speed: number, fromPlayer: boolean) {
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    this.setData('fromPlayer', fromPlayer);
    this.lifespan = 1500;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.setVelocity(vx, vy);
    this.setRotation(angle);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.kill();
    }
  }

  kill() {
    this.setActive(false).setVisible(false);
    this.setVelocity(0, 0);
    this.setPosition(-100, -100);
  }
}

export class BulletPool extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene, {
      classType: Bullet,
      maxSize: 100,
      runChildUpdate: true,
      active: false,
      visible: false,
    });
  }

  fire(x: number, y: number, angle: number, speed: number, fromPlayer: boolean): Bullet | null {
    const bullet = this.getFirstDead(true, x, y) as Bullet | null;
    if (bullet) {
      bullet.fire(x, y, angle, speed, fromPlayer);
    }
    return bullet;
  }
}
