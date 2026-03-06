// Map tile type names to loaded texture keys
const TILE_TEXTURE_MAP: Record<string, string> = {
  // Floors
  'Tile_Floor_Wood': 'tile_floor_wood',
  'Tile_Floor_Hatched': 'tile_floor_hatched',
  'Tile_Floor_Carpet': 'tile_floor_carpet',
  'Tile_Floor_Checkered': 'tile_floor_checkered',
  'Tile_Floor_Asphalt': 'tile_floor_asphalt',
  'Tile_Floor_Asphalt 2': 'tile_floor_asphalt2',
  'Tile_Floor_Brick': 'tile_floor_brick',
  'Tile_Floor_Sidewalk': 'tile_floor_sidewalk',
  'Tile_Floor_Shag': 'tile_floor_shag',
  'Tile_Floor_Stairs Down': 'tile_floor_stairs2',
  'Tile_Floor_Stairs Up': 'tile_floor_stairs',
  'Tile_Floor_Hatched 2': 'tile_floor_hatched2',
  'Tile_Floor_Stairs2': 'tile_floor_stairs2',

  // Walls
  'Tile_Wall': 'tile_wall',
  'Tile_Destructible Wall': 'tile_wall_destructible',
  'Tile_Invisible Wall': 'tile_wall_invisible',

  // Doors
  'Tile_Door1': 'tile_door1',
  'Tile_Door2': 'tile_door2',
  'Tile_Door3': 'tile_door3',
  'Tile_Door Locked': 'tile_door_locked',
  'Tile_Door Elevator': 'tile_door_elevator',
  'Tile_Door_Manhole': 'tile_door_manhole',

  // Windows
  'Tile_Window': 'tile_window',

  // Items
  'Tile_Item_Pistol': 'tile_item_pistol',
  'Tile_Item_Auto Pistol': 'tile_item_auto_pistol',
  'Tile_Item_Rifle': 'tile_item_rifle',
  'Tile_Item_Shotgun': 'tile_item_shotgun',
  'Tile_Item_TimeUp': 'tile_item_timeup',
  'Tile_Item_Key': 'tile_item_key',

  // Furniture with sprites
  'Tile_Chair': 'sprite_chair',
  'Tile_Chair2': 'sprite_chair1',
  'Tile_Dresser': 'sprite_dresser',
  'Tile_Fireplace L': 'sprite_fireplace',
  'Tile_Fireplace R': 'sprite_fireplace',
  'Tile_Lamp': 'sprite_lamp',
  'Tile_Toilet': 'sprite_toilet',
  'Tile_Vase': 'sprite_vase',
  'Tile_Planter': 'sprite_plant',
  'Tile_Barrel': 'sprite_barrel',
  'Tile_Tree': 'sprite_tree',
  'Tile_Bookshelf': 'tile_bookshelf',
  'Tile_End Table': 'tile_end_table',
  'Tile_Television': 'tile_television',
  'Tile_Sink': 'tile_sink',
  'Tile_Refrigerator': 'tile_refrigerator',
  'Tile_Stove': 'tile_stove',
  'Tile_Countertop': 'tile_countertop',
  'Tile_Sofa Straight': 'tile_sofa_straight',
  'Tile_Sofa Corner': 'tile_sofa_corner',
  'Tile_Sofa Corner 2': 'tile_sofa_corner2',
  'Tile_Bed Head L': 'tile_bed_head_l',
  'Tile_Bed Head R': 'tile_bed_head_r',
  'Tile_Bed Foot L': 'tile_bed_foot_l',
  'Tile_Bed Foot R': 'tile_bed_foot_r',
  'Tile_Table Top Edge': 'tile_table_top_edge',
  'Tile_Table Top Corner': 'tile_table_top_corner',
  'Tile_Table Bottom Edge': 'tile_table_bottom_edge',
  'Tile_Table Bottom L': 'tile_table_bottom_l',
  'Tile_Table Bottom R': 'tile_table_bottom_r',
  'Tile_Piano L': 'tile_piano_l',
  'Tile_Piano R': 'tile_piano_r',
  'Tile_Stool': 'tile_stool',
  'Tile_Hydrant': 'tile_hydrant',
  'Tile_Sign': 'tile_sign',
  'Tile_Dummy': 'tile_dummy',
};

export function getTileTexture(type: string): string | null {
  return TILE_TEXTURE_MAP[type] ?? null;
}
