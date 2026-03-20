export interface LevelObject {
  x: number;
  y: number;
  type: string;
  rotation?: number;
  text?: string;
}

export interface LevelData {
  name: string;
  tileSize: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  layers: {
    floors: LevelObject[];
    items: LevelObject[];
    walls: LevelObject[];
    furniture: LevelObject[];
    player: LevelObject[];
    enemies: LevelObject[];
    messages: LevelObject[];
    teleporters: LevelObject[];
  };
}

export async function loadLevel(name: string): Promise<LevelData> {
  const resp = await fetch(`./assets/levels/${name}.json`);
  if (!resp.ok) throw new Error(`Failed to load level: ${name}`);
  return resp.json();
}
