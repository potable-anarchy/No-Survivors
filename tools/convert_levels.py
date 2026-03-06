#!/usr/bin/env python3
"""Convert Clickteam Fusion MFU ARRAY (.arr) level files to JSON for the browser port."""

import json
import struct
import sys
from pathlib import Path


def parse_arr(filepath: Path) -> dict:
    with open(filepath, 'rb') as f:
        data = f.read()

    assert data[:10] == b'MFU ARRAY\x00', f"Not an MFU ARRAY file: {filepath}"

    xdim = struct.unpack_from('<I', data, 14)[0]
    ydim = struct.unpack_from('<I', data, 18)[0]
    zdim = struct.unpack_from('<I', data, 22)[0]

    pos = 34
    cells = []
    total = xdim * ydim * zdim
    for _ in range(total):
        if pos + 4 > len(data):
            cells.append('')
            continue
        strlen = struct.unpack_from('<I', data, pos)[0]
        pos += 4
        if strlen > 0 and pos + strlen * 2 <= len(data):
            s = data[pos:pos + strlen * 2].decode('utf-16-le', errors='replace')
            cells.append(s)
            pos += strlen * 2
        else:
            cells.append('')

    def get(x, y, z):
        idx = x * (ydim * zdim) + y * zdim + z
        return cells[idx] if idx < len(cells) else ''

    # Layers: x=1 floors, x=2 items, x=3 walls, x=4 furniture, x=5 misc, x=6 misc2
    # The last two layers can contain: enemies, player start, messages, teleporters
    # Player spawn can be at y=9999 with no coords (editor default) or with explicit coords

    level = {'name': filepath.stem, 'tileSize': 16, 'layers': {
        'floors': [], 'items': [], 'walls': [], 'furniture': [],
        'player': [], 'enemies': [], 'messages': [], 'teleporters': [],
    }}

    # Layers 1-4 contain mixed content; sort into output layers by tile type name
    def classify_tile(tile_name: str) -> str:
        if tile_name.startswith('Tile_Floor_'):
            return 'floors'
        if tile_name.startswith('Tile_Item_'):
            return 'items'
        if tile_name in ('Tile_Wall', 'Tile_Destructible Wall', 'Tile_Invisible Wall'):
            return 'walls'
        if tile_name.startswith('Tile_Door') or tile_name == 'Tile_Window':
            return 'walls'
        # Everything else is furniture
        return 'furniture'

    for layer_x in range(1, 5):
        for y in range(ydim):
            tile_name = get(layer_x, y, 6).strip()
            px = get(layer_x, y, 0)
            if not tile_name or not px:
                continue
            obj = {
                'x': int(px) if px else 0,
                'y': int(py) if (py := get(layer_x, y, 1)) else 0,
                'type': tile_name,
            }
            rot = get(layer_x, y, 2)
            if rot and rot != '0':
                obj['rotation'] = int(float(rot))
            target_layer = classify_tile(tile_name)
            level['layers'][target_layer].append(obj)

    # Dynamic layers (5 and 6) - sort by tile type
    for layer_x in [5, 6]:
        for y in range(ydim):
            tile_name = get(layer_x, y, 6).strip()
            px_str = get(layer_x, y, 0)
            if not tile_name:
                continue

            px = int(px_str) if px_str else 0
            py_str = get(layer_x, y, 1)
            py = int(py_str) if py_str else 0

            obj = {'x': px, 'y': py, 'type': tile_name}
            rot = get(layer_x, y, 2)
            if rot and rot != '0':
                obj['rotation'] = int(float(rot))

            if 'Player' in tile_name:
                # Only add if it has real coordinates
                if px_str and py_str:
                    level['layers']['player'].append(obj)
            elif 'Enemy' in tile_name:
                level['layers']['enemies'].append(obj)
            elif 'Message' in tile_name:
                level['layers']['messages'].append(obj)
            elif 'Teleporter' in tile_name:
                level['layers']['teleporters'].append(obj)
            else:
                # Unknown dynamic layer tiles -> classify by type name
                target = classify_tile(tile_name)
                level['layers'][target].append(obj)

    # Compute bounds from floors + walls only (not objects at 0,0)
    all_x = []
    all_y = []
    for layer_name in ['floors', 'walls']:
        for obj in level['layers'][layer_name]:
            all_x.append(obj['x'])
            all_y.append(obj['y'])

    if all_x:
        level['bounds'] = {
            'minX': min(all_x),
            'minY': min(all_y),
            'maxX': max(all_x),
            'maxY': max(all_y),
        }

    # If no player spawn, default to bottom-center of the level
    if not level['layers']['player'] and all_x:
        # Find floor tiles near max Y (bottom of level)
        max_y = max(all_y)
        bottom_xs = [obj['x'] for obj in level['layers']['floors'] if obj['y'] > max_y - 100]
        if bottom_xs:
            cx = (min(bottom_xs) + max(bottom_xs)) // 2
        else:
            cx = (min(all_x) + max(all_x)) // 2
        level['layers']['player'].append({
            'x': cx, 'y': max_y - 32, 'type': 'Tile_Player_Start'
        })

    return level


def main():
    levels_dir = Path(__file__).parent.parent / 'levels'
    output_dir = Path(__file__).parent.parent / 'browser' / 'public' / 'assets' / 'levels'
    output_dir.mkdir(parents=True, exist_ok=True)

    arr_files = list(levels_dir.glob('*.arr'))
    if not arr_files:
        print("No .arr files found in levels/")
        sys.exit(1)

    for arr_file in arr_files:
        print(f"Converting {arr_file.name}...")
        level = parse_arr(arr_file)
        out_path = output_dir / f"{arr_file.stem}.json"
        with open(out_path, 'w') as f:
            json.dump(level, f, separators=(',', ':'))
        spawn = level['layers']['player'][0] if level['layers']['player'] else None
        print(f"  -> {out_path.name} ({len(level['layers']['floors'])} floors, "
              f"{len(level['layers']['walls'])} walls, "
              f"{len(level['layers']['enemies'])} enemies, "
              f"spawn={spawn})")

    print(f"\nConverted {len(arr_files)} levels.")


if __name__ == '__main__':
    main()
