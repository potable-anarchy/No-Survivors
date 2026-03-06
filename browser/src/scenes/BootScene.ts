import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Player sprites
    this.load.spritesheet('player_walk', './assets/sprites/shooter_walking.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('player_shoot', './assets/sprites/shooter_shooting.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('player_dead', './assets/sprites/shooter_crawling.png', {
      frameWidth: 16,
      frameHeight: 20,
    });

    // Enemy sprites
    this.load.spritesheet('enemy_walk', './assets/sprites/enemy_walk.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('enemy_dead', './assets/sprites/enemy_dead.png');

    // Floor tiles
    this.load.image('tile_floor_wood', './assets/tiles/floor_wood.png');
    this.load.image('tile_floor_hatched', './assets/tiles/floor_hatched.png');
    this.load.image('tile_floor_carpet', './assets/tiles/floor_carpet.png');
    this.load.image('tile_floor_checkered', './assets/tiles/floor_checkered.png');
    this.load.image('tile_floor_asphalt', './assets/tiles/floor_asphalt.png');
    this.load.image('tile_floor_asphalt2', './assets/tiles/floor_asphalt2.png');
    this.load.image('tile_floor_brick', './assets/tiles/floor_brick.png');
    this.load.image('tile_floor_sidewalk', './assets/tiles/floor_sidewalk.png');
    this.load.image('tile_floor_shag', './assets/tiles/floor_shag.png');
    this.load.image('tile_floor_stairs', './assets/tiles/floor_stairs.png');
    this.load.image('tile_floor_hatched2', './assets/tiles/floor_hatched2.png');
    this.load.image('tile_floor_stairs2', './assets/tiles/floor_stairs2.png');

    // Wall/door/window tiles
    this.load.image('tile_wall', './assets/tiles/wall.png');
    this.load.image('tile_wall_destructible', './assets/tiles/wall_destructible.png');
    this.load.image('tile_wall_invisible', './assets/tiles/wall_invisible.png');
    this.load.image('tile_door1', './assets/tiles/door1.png');
    this.load.image('tile_door2', './assets/tiles/door2.png');
    this.load.image('tile_door3', './assets/tiles/door3.png');
    this.load.image('tile_door_locked', './assets/tiles/door_locked.png');
    this.load.image('tile_door_elevator', './assets/tiles/door_elevator.png');
    this.load.image('tile_door_manhole', './assets/tiles/door_manhole.png');
    this.load.image('tile_window', './assets/tiles/window.png');

    // Weapon/item tiles
    this.load.image('tile_item_pistol', './assets/tiles/item_pistol.png');
    this.load.image('tile_item_auto_pistol', './assets/tiles/item_auto_pistol.png');
    this.load.image('tile_item_rifle', './assets/tiles/item_rifle.png');
    this.load.image('tile_item_shotgun', './assets/tiles/item_shotgun.png');
    this.load.image('tile_item_timeup', './assets/tiles/item_timeup.png');
    this.load.image('tile_item_key', './assets/tiles/item_key.png');

    // Furniture sprites
    this.load.image('sprite_chair', './assets/sprites/Chair.png');
    this.load.image('sprite_chair1', './assets/sprites/Chair1.png');
    this.load.image('sprite_dresser', './assets/sprites/Dresser.png');
    this.load.image('sprite_fireplace', './assets/sprites/Fireplace.png');
    this.load.image('sprite_lamp', './assets/sprites/Lamp.png');
    this.load.image('sprite_toilet', './assets/sprites/toilet.png');
    this.load.image('sprite_vase', './assets/sprites/Vase.png');
    this.load.image('sprite_plant', './assets/sprites/Plant.png');
    this.load.image('sprite_barrel', './assets/sprites/Barrel.png');
    this.load.image('sprite_tree', './assets/sprites/Tree.png');
    this.load.image('sprite_crate', './assets/sprites/Crate.png');

    // Generated furniture/object tiles
    this.load.image('tile_bookshelf', './assets/tiles/bookshelf.png');
    this.load.image('tile_end_table', './assets/tiles/end_table.png');
    this.load.image('tile_television', './assets/tiles/television.png');
    this.load.image('tile_sink', './assets/tiles/sink.png');
    this.load.image('tile_refrigerator', './assets/tiles/refrigerator.png');
    this.load.image('tile_stove', './assets/tiles/stove.png');
    this.load.image('tile_countertop', './assets/tiles/countertop.png');
    this.load.image('tile_sofa_straight', './assets/tiles/sofa_straight.png');
    this.load.image('tile_sofa_corner', './assets/tiles/sofa_corner.png');
    this.load.image('tile_sofa_corner2', './assets/tiles/sofa_corner2.png');
    this.load.image('tile_bed_head_l', './assets/tiles/bed_head_l.png');
    this.load.image('tile_bed_head_r', './assets/tiles/bed_head_r.png');
    this.load.image('tile_bed_foot_l', './assets/tiles/bed_foot_l.png');
    this.load.image('tile_bed_foot_r', './assets/tiles/bed_foot_r.png');
    this.load.image('tile_table_top_edge', './assets/tiles/table_top_edge.png');
    this.load.image('tile_table_top_corner', './assets/tiles/table_top_corner.png');
    this.load.image('tile_table_bottom_edge', './assets/tiles/table_bottom_edge.png');
    this.load.image('tile_table_bottom_l', './assets/tiles/table_bottom_l.png');
    this.load.image('tile_table_bottom_r', './assets/tiles/table_bottom_r.png');
    this.load.image('tile_piano_l', './assets/tiles/piano_l.png');
    this.load.image('tile_piano_r', './assets/tiles/piano_r.png');
    this.load.image('tile_stool', './assets/tiles/stool.png');
    this.load.image('tile_hydrant', './assets/tiles/hydrant.png');
    this.load.image('tile_sign', './assets/tiles/sign.png');
    this.load.image('tile_dummy', './assets/tiles/dummy.png');
  }

  create() {
    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player_walk', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: 'player_shoot',
      frames: this.anims.generateFrameNumbers('player_shoot', { start: 0, end: 3 }),
      frameRate: 12,
      repeat: 0,
    });

    this.anims.create({
      key: 'player_dead',
      frames: this.anims.generateFrameNumbers('player_dead', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: 0,
    });

    this.anims.create({
      key: 'enemy_walk',
      frames: this.anims.generateFrameNumbers('enemy_walk', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.start('Menu');
  }
}
