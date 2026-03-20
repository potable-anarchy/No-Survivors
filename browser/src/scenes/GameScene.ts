import Phaser from 'phaser';
import { LevelData, LevelObject, loadLevel } from '../utils/LevelParser';
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
  private lockedDoors!: Phaser.Physics.Arcade.StaticGroup;
  private dummyGroup!: Phaser.Physics.Arcade.StaticGroup;
  private itemSprites: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[] = [];
  private teleporterZones: { zone: Phaser.GameObjects.Zone; pairName: string; x: number; y: number }[] = [];
  private messageZones: { zone: Phaser.GameObjects.Zone; text: string }[] = [];
  private levelData!: LevelData;
  private hud!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private enemyCount = 0;
  private totalEnemies = 0;
  private levelKey = '';
  private ready = false;
  private keys = 0;
  private missionTimer = 0;
  private timerActive = false;
  private activeMessage = '';
  private messageFadeEvent: Phaser.Time.TimerEvent | null = null;
  private teleportCooldown = 0;

  constructor() {
    super('Game');
  }

  init(data: { levelKey: string }) {
    this.levelKey = data.levelKey;
    this.ready = false;
    this.enemies = [];
    this.itemSprites = [];
    this.teleporterZones = [];
    this.messageZones = [];
    this.enemyCount = 0;
    this.totalEnemies = 0;
    this.keys = 0;
    this.missionTimer = 120;
    this.timerActive = false;
    this.activeMessage = '';
    this.messageFadeEvent = null;
    this.teleportCooldown = 0;
  }

  create() {
    this.generateTextures();

    const loadingText = this.add.text(
      this.cameras.main.centerX, this.cameras.main.centerY,
      'LOADING...', { fontSize: '16px', fontFamily: 'monospace', color: '#FCBF49' }
    ).setOrigin(0.5).setScrollFactor(0);

    loadLevel(this.levelKey)
      .then((data) => {
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
    this.renderTeleporters();
    this.renderMessages();

    // Collisions
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.lockedDoors);
    this.physics.add.collider(this.player, this.furnitureGroup);
    this.physics.add.collider(this.player, this.dummyGroup);
    this.physics.add.collider(this.enemyGroup, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.lockedDoors);
    this.physics.add.collider(this.enemyGroup, this.furnitureGroup);

    this.physics.add.collider(this.playerBullets, this.wallGroup, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.playerBullets, this.lockedDoors, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.playerBullets, this.furnitureGroup, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.playerBullets, this.destructibleWalls, (bullet, wall) => {
      (bullet as Bullet).kill();
      (wall as Phaser.Physics.Arcade.Sprite).destroy();
    });
    this.physics.add.collider(this.playerBullets, this.dummyGroup, (bullet, dummy) => {
      (bullet as Bullet).kill();
      (dummy as Phaser.Physics.Arcade.Sprite).destroy();
    });
    this.physics.add.collider(this.enemyBullets, this.wallGroup, (bullet) => {
      (bullet as Bullet).kill();
    });
    this.physics.add.collider(this.enemyBullets, this.lockedDoors, (bullet) => {
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

    // All HUD elements are world-space text repositioned each frame
    this.hud = this.add.text(0, 0, '', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#FCBF49',
      backgroundColor: '#003049',
      padding: { x: 3, y: 2 },
    }).setDepth(200);

    this.messageText = this.add.text(0, 0, '', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#FCBF49',
      backgroundColor: '#003049',
      padding: { x: 4, y: 3 },
      align: 'center',
      wordWrap: { width: 200 },
    }).setOrigin(0.5, 1).setDepth(200).setAlpha(0);

    this.timerText = this.add.text(0, 0, '', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#D62828',
      backgroundColor: '#003049',
      padding: { x: 3, y: 2 },
    }).setOrigin(1, 0).setDepth(200);

    // Check if level has timer tiles — activate mission timer
    const hasTimer = this.levelData.layers.furniture.some(o => o.type === 'Tile_Timer');
    if (hasTimer) {
      this.timerActive = true;
    }

    // Keys
    this.input.keyboard!.on('keydown-R', () => {
      this.scene.restart({ levelKey: this.levelKey });
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('Menu');
    });
  }

  update(_time: number, delta: number) {
    if (!this.ready) return;

    // Mission timer countdown
    if (this.timerActive && this.player.alive) {
      this.missionTimer -= delta / 1000;
      if (this.missionTimer <= 0) {
        this.missionTimer = 0;
        this.player.takeDamage(999);
      }
      this.timerText.setText(`TIME: ${Math.ceil(this.missionTimer)}`);
      if (this.missionTimer <= 10) {
        this.timerText.setColor('#D62828');
      }
    }

    // Teleport cooldown
    if (this.teleportCooldown > 0) {
      this.teleportCooldown -= delta;
    }

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
        if (item.getData('isKey')) {
          this.keys++;
        }
        if (item.getData('isTimeUp')) {
          this.missionTimer += 15;
        }
        item.destroy();
        this.itemSprites.splice(i, 1);
      }
    }

    // Teleporter check
    if (this.teleportCooldown <= 0) {
      for (const tp of this.teleporterZones) {
        if (!tp.pairName) continue;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tp.x, tp.y);
        if (dist < 10) {
          const dest = this.teleporterZones.find(
            other => other.pairName === tp.pairName && other !== tp
          );
          if (dest) {
            this.player.setPosition(dest.x, dest.y);
            this.teleportCooldown = 500;
          }
          break;
        }
      }
    }

    // Locked door interaction (player walks into locked door while holding key)
    this.lockedDoors.getChildren().forEach(door => {
      if (!door.active) return;
      const d = door as Phaser.GameObjects.GameObject & { x: number; y: number };
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y);
      if (dist < 14 && this.keys > 0) {
        this.keys--;
        door.destroy();
      }
    });

    // Message zone proximity
    let nearMessage = '';
    for (const mz of this.messageZones) {
      if (!mz.text) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mz.zone.x, mz.zone.y);
      if (dist < 24) {
        nearMessage = mz.text;
        break;
      }
    }
    if (nearMessage && nearMessage !== this.activeMessage) {
      this.activeMessage = nearMessage;
      this.messageText.setText(nearMessage);
      this.messageText.setAlpha(1);
      if (this.messageFadeEvent) this.messageFadeEvent.destroy();
      this.messageFadeEvent = this.time.delayedCall(3000, () => {
        this.tweens.add({
          targets: this.messageText,
          alpha: 0,
          duration: 500,
          onComplete: () => { this.activeMessage = ''; }
        });
      });
    }
    // Position message text above player in world space
    if (this.messageText.alpha > 0) {
      this.messageText.setPosition(this.player.x, this.player.y - 24);
    }

    // Position HUD elements relative to camera viewport
    const cam = this.cameras.main;
    const vx = cam.scrollX;
    const vy = cam.scrollY;
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;

    this.hud.setPosition(vx + 4, vy + 4);
    this.timerText.setPosition(vx + vw - 4, vy + 4);

    // HUD text
    const weaponName = this.player.weapon.replace('_', ' ').toUpperCase();
    let hudStr = `HP: ${this.player.health} | ${weaponName} | KILLS: ${this.enemyCount}/${this.totalEnemies}`;
    if (this.keys > 0) hudStr += ` | KEYS: ${this.keys}`;
    hudStr += ' | R:restart ESC:menu';
    this.hud.setText(hudStr);

    if (!this.player.alive) {
      this.hud.setText('YOU DIED - Press R to restart');
      this.timerText.setText('');
    } else if (this.totalEnemies > 0 && this.enemyCount >= this.totalEnemies) {
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
    this.lockedDoors = this.physics.add.staticGroup();

    for (const obj of this.levelData.layers.walls) {
      const isDestructible = obj.type === 'Tile_Destructible Wall';
      const isInvisible = obj.type === 'Tile_Invisible Wall';
      const isLocked = obj.type === 'Tile_Door Locked';
      const tex = getTileTexture(obj.type);

      let gameObj: Phaser.GameObjects.GameObject;
      if (isInvisible) {
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

      let group: Phaser.Physics.Arcade.StaticGroup;
      if (isLocked) {
        group = this.lockedDoors;
      } else if (isDestructible) {
        group = this.destructibleWalls;
      } else {
        group = this.wallGroup;
      }
      group.add(gameObj);
      const body = gameObj.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(TILE, TILE);
      body.setOffset(-TILE / 2, -TILE / 2);
    }
  }

  private renderFurniture() {
    this.furnitureGroup = this.physics.add.staticGroup();
    this.dummyGroup = this.physics.add.staticGroup();

    for (const obj of this.levelData.layers.furniture) {
      if (obj.type === 'Tile_Timer') continue;

      const isDummy = obj.type === 'Tile_Dummy';
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

      const group = isDummy ? this.dummyGroup : this.furnitureGroup;
      group.add(gameObj);
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
      if (obj.type === 'Tile_Item_Key') {
        item.setData('isKey', true);
      }
      if (obj.type === 'Tile_Item_TimeUp') {
        item.setData('isTimeUp', true);
      }

      this.itemSprites.push(item);
    }
  }

  private renderTeleporters() {
    for (const obj of this.levelData.layers.teleporters) {
      const tex = getTileTexture(obj.type);
      if (tex) {
        this.add.image(obj.x, obj.y, tex).setDepth(2);
      } else {
        this.add.rectangle(obj.x, obj.y, TILE, TILE, 0xF77F00, 0.6).setDepth(2);
      }

      const zone = this.add.zone(obj.x, obj.y, TILE, TILE);
      this.teleporterZones.push({
        zone,
        pairName: obj.text || '',
        x: obj.x,
        y: obj.y,
      });
    }
  }

  private renderMessages() {
    for (const obj of this.levelData.layers.messages) {
      if (!obj.text || (obj.x === 0 && obj.y === 0)) continue;

      const tex = getTileTexture('Tile_Sign');
      if (tex) {
        this.add.image(obj.x, obj.y, tex).setDepth(2).setAlpha(0.7);
      } else {
        this.add.rectangle(obj.x, obj.y, TILE, TILE, 0xFCBF49, 0.3).setDepth(2);
      }

      const zone = this.add.zone(obj.x, obj.y, TILE * 2, TILE * 2);
      this.messageZones.push({ zone, text: obj.text });
    }
  }
}
