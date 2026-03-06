#!/usr/bin/env python3
"""Export .aseprite files to PNG. Supports RGBA (depth=32) files."""

import struct
import zlib
from pathlib import Path
from PIL import Image


def parse_aseprite(filepath: Path) -> list[Image.Image]:
    with open(filepath, 'rb') as f:
        data = f.read()

    magic = struct.unpack_from('<H', data, 4)[0]
    assert magic == 0xA5E0

    num_frames = struct.unpack_from('<H', data, 6)[0]
    width = struct.unpack_from('<H', data, 8)[0]
    height = struct.unpack_from('<H', data, 10)[0]
    color_depth = struct.unpack_from('<H', data, 12)[0]

    if color_depth != 32:
        print(f"  Skipping {filepath.name}: unsupported color depth {color_depth}")
        return []

    frames = []
    pos = 128  # after header

    for frame_idx in range(num_frames):
        frame_size = struct.unpack_from('<I', data, pos)[0]
        frame_magic = struct.unpack_from('<H', data, pos + 4)[0]
        num_chunks_old = struct.unpack_from('<H', data, pos + 6)[0]
        frame_duration = struct.unpack_from('<H', data, pos + 8)[0]
        num_chunks_new = struct.unpack_from('<I', data, pos + 12)[0]
        num_chunks = num_chunks_new if num_chunks_new != 0 else num_chunks_old

        canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        chunk_pos = pos + 16

        for _ in range(num_chunks):
            chunk_size = struct.unpack_from('<I', data, chunk_pos)[0]
            chunk_type = struct.unpack_from('<H', data, chunk_pos + 4)[0]

            if chunk_type == 0x2005:  # Cel chunk
                layer_idx = struct.unpack_from('<H', data, chunk_pos + 6)[0]
                cel_x = struct.unpack_from('<h', data, chunk_pos + 8)[0]
                cel_y = struct.unpack_from('<h', data, chunk_pos + 10)[0]
                opacity = data[chunk_pos + 12]
                cel_type = struct.unpack_from('<H', data, chunk_pos + 13)[0]

                if cel_type == 0:  # Raw cel
                    cel_w = struct.unpack_from('<H', data, chunk_pos + 22)[0]
                    cel_h = struct.unpack_from('<H', data, chunk_pos + 24)[0]
                    pixel_data = data[chunk_pos + 26:chunk_pos + 26 + cel_w * cel_h * 4]
                    cel_img = Image.frombytes('RGBA', (cel_w, cel_h), pixel_data)
                    canvas.paste(cel_img, (cel_x, cel_y), cel_img)

                elif cel_type == 2:  # Compressed cel
                    cel_w = struct.unpack_from('<H', data, chunk_pos + 22)[0]
                    cel_h = struct.unpack_from('<H', data, chunk_pos + 24)[0]
                    compressed = data[chunk_pos + 26:chunk_pos + chunk_size]
                    pixel_data = zlib.decompress(compressed)
                    cel_img = Image.frombytes('RGBA', (cel_w, cel_h), pixel_data)
                    canvas.paste(cel_img, (cel_x, cel_y), cel_img)

            chunk_pos += chunk_size

        frames.append(canvas)
        pos += frame_size

    return frames


def main():
    assets_dir = Path(__file__).parent.parent / 'assets'
    output_dir = Path(__file__).parent.parent / 'browser' / 'public' / 'assets' / 'sprites'
    output_dir.mkdir(parents=True, exist_ok=True)

    for ase_file in sorted(assets_dir.glob('*.aseprite')):
        frames = parse_aseprite(ase_file)
        if not frames:
            continue

        if len(frames) == 1:
            out = output_dir / f"{ase_file.stem}.png"
            frames[0].save(out)
            print(f"  {ase_file.name} -> {out.name} ({frames[0].size[0]}x{frames[0].size[1]})")
        else:
            # Spritesheet
            w, h = frames[0].size
            sheet = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
            for i, frame in enumerate(frames):
                sheet.paste(frame, (i * w, 0))
            out = output_dir / f"{ase_file.stem}.png"
            sheet.save(out)
            print(f"  {ase_file.name} -> {out.name} ({len(frames)} frames, {w}x{h} each)")


if __name__ == '__main__':
    main()
