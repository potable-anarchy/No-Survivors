import Phaser from 'phaser';
import { LevelData } from '../utils/LevelParser';
import { getTileColor } from '../utils/TileColors';
import { getTileTexture } from '../utils/TileSprites';
import { Player, WeaponType } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet, BulletPool } from '../entities/Bullet';

const TILE = 16;

const ITEM_TO_WEAPON: Record<string, WeaponType> = {
  'Tile_Item_Pistol': 'pistol',
  'Tile_Item_Auto Pistol': 'auto_pistol',
  'Tile_Item_Rifle': 'rifle',
  'Tile_Item_Shotgun': 'shotgun',
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private playerBullets!: BulletPool;
  private enemyBullets!: BulletPool;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private furnitureGroup!: Phaser.Physics.Arcade.StaticGroup;
  private destructibleWalls!: Phaser.Physics.Arcade.StaticGroup;
  private itemSprites: Phaser.GameObjects.Rectangle[] = [];
  private levelData!: LevelData;
  private hud!: Phaser.GameObjects.Text;
  private enemyCount = 0;
  private totalEnemies = 0;
  private levelKey = '';
  private ready = false;

  constructor() {
    super('Game');
  }

  init(data: { levelKey: string }) {
    this.levelKey = data.levelKey;
    this.ready = false;
    this.enemies = [];
    this.itemSprites = [];
    this.enemyCount = 0;
    this.totalEnemies = 0;
  }

  create() {
    this.generateTextures();

    // Show loading text while fetching level
    const loadingText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY,
      'LOADING...', { fontSize: '16px', fontFamily: 'monospace', color: '#FCBF49' }
    ).setOrigin(0.5).setScrollFactor(0);

    fetch(`./assets/levels/${this.levelKey}.json`)
      .then(r => r.json())
      .then((data: LevelData) => {
        loadingText.destroy();
        this.levelData = data;
        this.buildLevel();
        this.ready = true;
      })
      .catch(err => {
        loadingText.setText(`FAILED TO LOAD LEVEL\n${err.message}`);
        console.error('Level load failed:', err);
      });
  }

  private buildLevel() {
    const bounds = this.levelData.bounds;
    const pad = 64;
    this.physics.world.setBounds(
      bounds.minX - pad, bounds.minY - pad,
      bounds.maxX - bounds.minX + TILE + pad * 2,
      bounds.maxY - bounds.minY + TILE + pad * 2,
    );

    this.renderFloors();
    this.renderWalls();
    this.renderFurniture();

    this.playerBullets = new BulletPool(this);
    this.enemyBullets = new BulletPool(this);

    const spawn = this.levelData.layers.player[0];
    const px = spawn?.x ?? this.levelData.bounds.minX + 100;
    const py = spawn?.y ?? this.levelData.bounds.minY + 100;
    this.player = new Player(this, px, py, this.playerBullets);
    this.player.setCollideWorldBounds(true);

    this.enemyGroup = this.physics.add.group();
    this.totalEnemies = this.levelData.layers.enemies.length;
    for (const e of this.levelData.layers.enemies) {
      const enemy = new Enemy(this, e.x, e.y, this.player, this.enemyBullets);
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
    }

    this.renderItems();

    // Collisions
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.furnitureGroup);
    this.physics.add.collider(this.enemyGroup, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.furnitureGroup);

    this.physics.add.collider(this.playerBullets, this.wallGroup, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.playerBullets, this.furnitureGroup, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.playerBullets, this.destructibleWalls, (bullet, wall) => {
      (bullet as Bullet).kill();
      (wall as Phaser.Physics.Arcade.Sprite).destroy();
    });
    this.physics.add.collider(this.enemyBullets, this.wallGroup, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.enemyBullets, this.furnitureGroup, (bullet) => {
      (bullet as Bullet).kill();
    });

    this.physics.add.overlap(this.playerBullets, this.enemyGroup, (bullet, enemy) => {
      const b = bullet as Bullet;
      const e = enemy as unknown as Enemy;
      if (b.active && e.alive) {
        b.kill();
        e.takeDamage(15);
        if (!e.alive) this.enemyCount++;
      }
    });

    this.physics.add.overlap(this.enemyBullets, this.player, (_, bullet) => {
      const b = bullet as Bullet;
      if (b.active && this.player.alive) {
        b.kill();
        this.player.takeDamage(10);
      }
    });

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
    this.cameras.main.setBackgroundColor('#003049');

    // HUD
    this.hud = this.add.text(10, 10, '', {
      fontSize: '4px',
      fontFamily: 'monospace',
      color: '#FCBF49',
      backgroundColor: '#003049',
      padding: { x: 2, y: 1 },
    }).setScrollFactor(0).setDepth(100);

    // Keys
    this.input.keyboard!.on('keydown-R', () => {
      this.scene.restart({ levelKey: this.levelKey });
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('Menu');
    });
  }

  update() {
    if (!this.ready) return;

    // Item pickups
    for (let i = this.itemSprites.length - 1; i >= 0; i--) {
      const item = this.itemSprites[i];
      if (!item.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (dist < 12) {
        const weaponType = item.getData('weaponType') as WeaponType | undefined;
        if (weaponType) {
          this.player.equipWeapon(weaponType);
        }
        item.destroy();
        this.itemSprites.splice(i, 1);
      }
    }

    // HUD
    const weaponName = this.player.weapon.replace('_', ' ').toUpperCase();
    this.hud.setText(
      `HP: ${this.player.health} | ${weaponName} | KILLS: ${this.enemyCount}/${this.totalEnemies} | R:restart ESC:menu`
    );

    if (!this.player.alive) {
      this.hud.setText('YOU DIED - Press R to restart');
    } else if (this.enemyCount >= this.totalEnemies) {
      this.hud.setText('LEVEL CLEAR! - Press ESC for menu');
    }
  }

  private generateTextures() {
    if (!this.textures.exists('__bullet')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xFCBF49, 1);
      g.fillCircle(2, 2, 2);
      g.generateTexture('__bullet', 4, 4);
      g.destroy();
    }
  }

  private renderFloors() {
    for (const obj of this.levelData.layers.floors) {
      const tex = getTileTexture(obj.type);
      if (tex) {
        const sprite = this.add.image(obj.x, obj.y, tex).setDepth(0);
        if (obj.rotation) sprite.setAngle(obj.rotation);
      } else {
        const color = getTileColor(obj.type);
        const rect = this.add.rectangle(obj.x, obj.y, TILE, TILE, color).setDepth(0);
        if (obj.rotation) rect.setAngle(obj.rotation);
      }
    }
  }

  private renderWalls() {
    this.wallGroup = this.physics.add.staticGroup();
    this.destructibleWalls = this.physics.add.staticGroup();

    for (const obj of this.levelData.layers.walls) {
      const isDestructible = obj.type === 'Tile_Destructible Wall';
      const isInvisible = obj.type === 'Tile_Invisible Wall';
      const tex = getTileTexture(obj.type);

      let gameObj: Phaser.GameObjects.GameObject;
      if (isInvisible) {
        // Invisible wall — no visual, just physics
        const rect = this.add.rectangle(obj.x, obj.y, TILE, TILE, 0x000000, 0);
        rect.setDepth(5);
        gameObj = rect;
      } else if (tex) {
        const sprite = this.add.image(obj.x, obj.y, tex).setDepth(5);
        if (obj.rotation) sprite.setAngle(obj.rotation);
        gameObj = sprite;
      } else {
        const color = getTileColor(obj.type);
        const rect = this.add.rectangle(obj.x, obj.y, TILE, TILE, color).setDepth(5);
        if (obj.rotation) rect.setAngle(obj.rotation);
        gameObj = rect;
      }

      const group = isDestructible ? this.destructibleWalls : this.wallGroup;
      group.add(gameObj);
      const body = gameObj.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(TILE, TILE);
      body.setOffset(-TILE / 2, -TILE / 2);
    }
  }

  private renderFurniture() {
    this.furnitureGroup = this.physics.add.staticGroup();

    for (const obj of this.levelData.layers.furniture) {
      const tex = getTileTexture(obj.type);
      let gameObj: Phaser.GameObjects.GameObject;
      if (tex) {
        const sprite = this.add.image(obj.x, obj.y, tex).setDepth(4);
        if (obj.rotation) sprite.setAngle(obj.rotation);
        gameObj = sprite;
      } else {
        const color = getTileColor(obj.type);
        const rect = this.add.rectangle(obj.x, obj.y, TILE, TILE, color).setDepth(4);
        if (obj.rotation) rect.setAngle(obj.rotation);
        gameObj = rect;
      }

      this.furnitureGroup.add(gameObj);
      const body = gameObj.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(TILE, TILE);
      body.setOffset(-TILE / 2, -TILE / 2);
    }
  }

  private renderItems() {
    for (const obj of this.levelData.layers.items) {
      const tex = getTileTexture(obj.type);
      let item: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
      if (tex) {
        item = this.add.image(obj.x, obj.y, tex).setDepth(3);
      } else {
        const color = getTileColor(obj.type);
        item = this.add.rectangle(obj.x, obj.y, TILE, TILE, color, 0.8).setDepth(3);
      }

      const weaponType = ITEM_TO_WEAPON[obj.type];
      if (weaponType) {
        item.setData('weaponType', weaponType);
      }
      if (obj.type === 'Tile_Item_TimeUp') {
        item.setData('health', 25);
      }

      this.itemSprites.push(item as Phaser.GameObjects.Rectangle);
    }
  }
}
