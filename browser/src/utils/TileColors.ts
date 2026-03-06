// 4-color palette: Dark Blue, Red, Orange, Gold
// #003049, #D62828, #F77F00, #FCBF49
const P = {
  dblue: 0x003049,
  red: 0xD62828,
  orange: 0xF77F00,
  gold: 0xFCBF49,
};

// Fallback colors for tiles without sprite textures
export const TILE_COLORS: Record<string, number> = {
  // Floors
  'Tile_Floor_Hatched': P.orange,
  'Tile_Floor_Wood': P.gold,
  'Tile_Floor_Carpet': P.red,
  'Tile_Floor_Checkered': P.gold,
  'Tile_Floor_Asphalt': P.dblue,
  'Tile_Floor_Asphalt 2': P.dblue,
  'Tile_Floor_Brick': P.orange,
  'Tile_Floor_Sidewalk': P.gold,
  'Tile_Floor_Shag': P.dblue,
  'Tile_Floor_Stairs Down': P.orange,
  'Tile_Floor_Stairs Up': P.orange,
  'Tile_Floor_Hatched 2': P.orange,
  'Tile_Floor_Stairs2': P.orange,

  // Walls
  'Tile_Wall': P.dblue,
  'Tile_Destructible Wall': P.dblue,
  'Tile_Invisible Wall': P.dblue,

  // Doors
  'Tile_Door1': P.orange,
  'Tile_Door2': P.gold,
  'Tile_Door3': P.orange,
  'Tile_Door Locked': P.red,
  'Tile_Door Elevator': P.gold,
  'Tile_Door_Manhole': P.dblue,

  // Windows
  'Tile_Window': P.gold,

  // Items
  'Tile_Item_Pistol': P.red,
  'Tile_Item_Auto Pistol': P.red,
  'Tile_Item_Rifle': P.orange,
  'Tile_Item_Shotgun': P.orange,
  'Tile_Item_TimeUp': P.gold,
  'Tile_Item_Key': P.gold,

  // Furniture
  'Tile_Chair': P.orange,
  'Tile_Chair2': P.orange,
  'Tile_Bookshelf': P.dblue,
  'Tile_Dresser': P.orange,
  'Tile_End Table': P.orange,
  'Tile_Lamp': P.gold,
  'Tile_Television': P.dblue,
  'Tile_Toilet': P.gold,
  'Tile_Sink': P.gold,
  'Tile_Vase': P.gold,
  'Tile_Planter': P.dblue,
  'Tile_Refrigerator': P.gold,
  'Tile_Stove': P.dblue,
  'Tile_Countertop': P.orange,
  'Tile_Fireplace L': P.orange,
  'Tile_Fireplace R': P.orange,
  'Tile_Sofa Straight': P.red,
  'Tile_Sofa Corner': P.red,
  'Tile_Sofa Corner 2': P.red,
  'Tile_Bed Head L': P.dblue,
  'Tile_Bed Head R': P.dblue,
  'Tile_Bed Foot L': P.dblue,
  'Tile_Bed Foot R': P.dblue,
  'Tile_Table Top Edge': P.orange,
  'Tile_Table Top Corner': P.orange,
  'Tile_Table Bottom Edge': P.orange,
  'Tile_Table Bottom L': P.orange,
  'Tile_Table Bottom R': P.orange,
  'Tile_Piano L': P.dblue,
  'Tile_Piano R': P.dblue,
  'Tile_Stool': P.orange,
  'Tile_Hydrant': P.red,
  'Tile_Sign': P.gold,
  'Tile_Dummy': P.red,

  // Enemies
  'Tile_Enemy': P.red,
};

export function getTileColor(type: string): number {
  return TILE_COLORS[type] ?? P.red;
}
