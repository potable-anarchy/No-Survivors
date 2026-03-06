#!/usr/bin/env python3
"""Extract tile textures from MFA file and map them to tile type names.

Parses the Clickteam Fusion MFA image bank to extract all tile sprites
with proper handle-based mapping to tile names.
"""

import json
import struct
import sys
import zlib
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("pip install Pillow")
    sys.exit(1)


# 4-color palette for snapping
PALETTE = [
    (0x00, 0x30, 0x49),  # Dark Blue
    (0xD6, 0x28, 0x28),  # Red
    (0xF7, 0x7F, 0x00),  # Orange
    (0xFC, 0xBF, 0x49),  # Gold
]

MAGENTA_16BIT = (0xF8, 0x00, 0xF8)  # Magenta in 16-bit (5-bit per channel, shifted to 8)


def snap_to_palette(r, g, b):
    if r == 0 and g == 0 and b == 0:
        return None  # black = transparent in this game
    best = min(PALETTE, key=lambda p: sum((a - c) ** 2 for a, c in zip((r, g, b), p)))
    return best


def decode_16bit(data, w, h):
    """Decode 16-bit RGB555 image data (2 bytes per pixel)."""
    img = Image.new('RGBA', (w, h))
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            offset = (y * w + x) * 2
            if offset + 2 > len(data):
                break
            val = struct.unpack_from('<H', data, offset)[0]
            r = ((val >> 10) & 0x1F) << 3
            g = ((val >> 5) & 0x1F) << 3
            b = (val & 0x1F) << 3
            # Magenta transparency
            if r >= 248 and g == 0 and b >= 248:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (r, g, b, 255)
    return img


def decode_24bit(data, w, h):
    """Decode 24-bit BGR image data (3 bytes per pixel)."""
    img = Image.new('RGBA', (w, h))
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            offset = (y * w + x) * 3
            if offset + 3 > len(data):
                break
            b, g, r = data[offset], data[offset + 1], data[offset + 2]
            if (r, g, b) == (255, 0, 255):  # magenta
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (r, g, b, 255)
    return img


def find_tile_handles(data):
    """Find Tile_ object names and their image handles in the MFA."""
    search = b'T\x00i\x00l\x00e\x00_\x00'
    pos = 0
    tile_handles = {}

    while True:
        pos = data.find(search, pos)
        if pos == -1:
            break
        end = pos
        while end < len(data) - 1:
            ch = data[end] | (data[end + 1] << 8)
            if ch == 0 or ch > 127:
                break
            end += 2
        name = data[pos:end].decode('utf-16-le', errors='replace').rstrip('\x00\x01\x02\x03\x04\x05\x06\x07\x08')
        if len(name) < 60 and name.startswith('Tile_'):
            after = data[end:end + 44]
            # Check for the 0x39b8 marker at offset 26 after name end
            if len(after) >= 30 and after[26:28] == b'\x39\xb8':
                handle = struct.unpack_from('<I', after, 22)[0]
                if name not in tile_handles:
                    tile_handles[name] = handle
        pos += 2

    return tile_handles


def parse_image_bank(data):
    """Parse the MFA image bank to extract all images."""
    # Find the image bank by looking for zlib stream preceded by valid image headers
    # The bank has a count (uint32) followed by entries with 40-byte headers
    # Each entry: handle(4) checksum(4) refcount(4) comp_size(4) w(2) h(2) flags(2) pad(2) hotspot(8) decomp_size(4) + zlib
    bank_offset = None

    # Search for zlib streams and verify the header structure
    for pos in range(2900000, 3100000):
        if data[pos] == 0x78 and data[pos + 1] in (0x9C, 0x01, 0xDA, 0x5E):
            # Check if -40 has a valid image header
            hdr = pos - 40
            if hdr < 4:
                continue
            handle = struct.unpack_from('<I', data, hdr)[0]
            refcount = struct.unpack_from('<I', data, hdr + 8)[0]
            w = struct.unpack_from('<H', data, hdr + 16)[0]
            h = struct.unpack_from('<H', data, hdr + 18)[0]
            if handle < 200 and refcount == 1 and 1 <= w <= 512 and 1 <= h <= 512:
                # Found first image entry; count should be 4 bytes before it
                bank_offset = hdr - 4
                break

    if bank_offset is None:
        print("Could not find image bank!")
        return {}

    count = struct.unpack_from('<I', data, bank_offset)[0]
    print(f"Image bank at offset {bank_offset}, count={count}")

    pos = bank_offset + 4
    images = {}

    for i in range(count):
        if pos + 40 > len(data):
            break

        handle = struct.unpack_from('<I', data, pos)[0]
        checksum = struct.unpack_from('<I', data, pos + 4)[0]
        refcount = struct.unpack_from('<I', data, pos + 8)[0]
        comp_size = struct.unpack_from('<I', data, pos + 12)[0]
        w = struct.unpack_from('<H', data, pos + 16)[0]
        h = struct.unpack_from('<H', data, pos + 18)[0]
        flags = struct.unpack_from('<H', data, pos + 20)[0]
        decomp_size = struct.unpack_from('<I', data, pos + 36)[0]

        zlib_start = pos + 40

        try:
            deobj = zlib.decompressobj()
            decompressed = deobj.decompress(data[zlib_start:zlib_start + comp_size + 1000])
            actual_end = zlib_start + (comp_size + 1000) - len(deobj.unused_data)

            bpp = 16 if flags == 0x0807 else 24
            images[handle] = {
                'w': w, 'h': h, 'bpp': bpp,
                'data': decompressed,
            }
            pos = actual_end
        except Exception as e:
            print(f"  Failed to decompress handle {handle}: {e}")
            break

    return images


# Tile name -> output filename mapping
TILE_FILENAMES = {
    'Tile_Wall': 'wall',
    'Tile_Destructible Wall': 'wall_destructible',
    'Tile_Invisible Wall': 'wall_invisible',
    'Tile_Window': 'window',
    'Tile_Floor_Hatched': 'floor_hatched',
    'Tile_Floor_Hatched 2': 'floor_hatched2',
    'Tile_Floor_Brick': 'floor_brick',
    'Tile_Floor_Wood': 'floor_wood',
    'Tile_Floor_Checkered': 'floor_checkered',
    'Tile_Floor_Carpet': 'floor_carpet',
    'Tile_Floor_Shag': 'floor_shag',
    'Tile_Floor_Sidewalk': 'floor_sidewalk',
    'Tile_Floor_Asphalt': 'floor_asphalt',
    'Tile_Floor_Asphalt 2': 'floor_asphalt2',
    'Tile_Floor_Stairs Up': 'floor_stairs',
    'Tile_Floor_Stairs Down': 'floor_stairs2',
    'Tile_Door1': 'door1',
    'Tile_Door2': 'door2',
    'Tile_Door3': 'door3',
    'Tile_Door Locked': 'door_locked',
    'Tile_Door Elevator': 'door_elevator',
    'Tile_Door_Manhole': 'door_manhole',
    'Tile_Item_Pistol': 'item_pistol',
    'Tile_Item_Auto Pistol': 'item_auto_pistol',
    'Tile_Item_Shotgun': 'item_shotgun',
    'Tile_Item_Rifle': 'item_rifle',
    'Tile_Item_Key': 'item_key',
    'Tile_Item_TimeUp': 'item_timeup',
    'Tile_Countertop': 'countertop',
    'Tile_End Table': 'end_table',
    'Tile_Bookshelf': 'bookshelf',
    'Tile_Refrigerator': 'refrigerator',
    'Tile_Dresser': 'dresser',
    'Tile_Table Top Edge': 'table_top_edge',
    'Tile_Table Top Corner': 'table_top_corner',
    'Tile_Table Bottom Edge': 'table_bottom_edge',
    'Tile_Table Bottom L': 'table_bottom_l',
    'Tile_Table Bottom R': 'table_bottom_r',
    'Tile_Bed Head L': 'bed_head_l',
    'Tile_Bed Head R': 'bed_head_r',
    'Tile_Bed Foot L': 'bed_foot_l',
    'Tile_Bed Foot R': 'bed_foot_r',
    'Tile_Television': 'television',
    'Tile_Sink': 'sink',
    'Tile_Stove': 'stove',
    'Tile_Sofa Straight': 'sofa_straight',
    'Tile_Sofa Corner': 'sofa_corner',
    'Tile_Sofa Corner 2': 'sofa_corner2',
    'Tile_Piano L': 'piano_l',
    'Tile_Piano R': 'piano_r',
    'Tile_Stool': 'stool',
    'Tile_Hydrant': 'hydrant',
    'Tile_Sign': 'sign',
    'Tile_Dummy': 'dummy',
    'Tile_Barrel': 'barrel',
    'Tile_Chair': 'chair',
    'Tile_Chair2': 'chair2',
    'Tile_Toilet': 'toilet',
    'Tile_Fireplace L': 'fireplace_l',
    'Tile_Fireplace R': 'fireplace_r',
    'Tile_Teleporter': 'teleporter',
    'Tile_Player_Start': 'player_start',
    'Tile_Timer': 'timer',
    'Tile_Enemy': 'enemy',
    'Tile_Vase': 'vase',
    'Tile_Planter': 'planter',
    'Tile_Lamp': 'lamp',
}


def main():
    mfa_path = Path(__file__).parent.parent / 'source' / 'NoSurvivors.mfa'
    output_dir = Path(__file__).parent.parent / 'browser' / 'public' / 'assets' / 'tiles'
    output_dir.mkdir(parents=True, exist_ok=True)

    debug_dir = output_dir / 'extracted'
    debug_dir.mkdir(exist_ok=True)

    print(f"Reading MFA: {mfa_path}")
    data = mfa_path.read_bytes()

    # Step 1: Find tile objects and their image handles
    print("\n--- Finding Tile_ objects ---")
    tile_handles = find_tile_handles(data)
    for name, handle in sorted(tile_handles.items(), key=lambda x: x[1]):
        print(f"  {name} -> handle {handle}")

    # Step 2: Parse image bank
    print("\n--- Parsing image bank ---")
    images = parse_image_bank(data)
    print(f"Found {len(images)} images")

    # Step 3: Extract and save tile images
    print("\n--- Extracting tiles ---")
    mapped = 0
    for name, handle in sorted(tile_handles.items(), key=lambda x: x[1]):
        if handle not in images:
            print(f"  SKIP {name}: handle {handle} not in image bank")
            continue

        img_data = images[handle]
        w, h, bpp = img_data['w'], img_data['h'], img_data['bpp']
        raw = img_data['data']

        # Decode based on bit depth
        if bpp == 16:
            img = decode_16bit(raw, w, h)
        else:
            img = decode_24bit(raw, w, h)

        # If not 16x16, resize/pad to 16x16 for consistent tile rendering
        if w != 16 or h != 16:
            canvas = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
            # Center the image on the 16x16 canvas
            ox = (16 - w) // 2
            oy = (16 - h) // 2
            canvas.paste(img, (ox, oy))
            img = canvas

        filename = TILE_FILENAMES.get(name, name.replace('Tile_', '').lower().replace(' ', '_'))
        out_path = output_dir / f"{filename}.png"
        img.save(out_path)
        print(f"  {name} (handle {handle}, {w}x{h}) -> {filename}.png")
        mapped += 1

        # Also save to debug dir with handle number
        debug_path = debug_dir / f"handle_{handle:03d}_{filename}_{w}x{h}.png"
        img.save(debug_path)

    print(f"\nExtracted {mapped}/{len(tile_handles)} tiles")

    # Save mapping for reference
    mapping = {}
    for name, handle in tile_handles.items():
        filename = TILE_FILENAMES.get(name, name.replace('Tile_', '').lower().replace(' ', '_'))
        img_info = images.get(handle, {})
        mapping[name] = {
            'handle': handle,
            'filename': filename + '.png',
            'original_size': f"{img_info.get('w', '?')}x{img_info.get('h', '?')}",
        }
    with open(output_dir / 'tile_mapping.json', 'w') as f:
        json.dump(mapping, f, indent=2)


if __name__ == '__main__':
    main()
