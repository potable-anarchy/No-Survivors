#!/usr/bin/env python3
"""Extract GIF animation frames into PNG sprite sheets for Phaser."""

from pathlib import Path
from PIL import Image


def gif_to_spritesheet(gif_path: Path, output_path: Path):
    img = Image.open(gif_path)
    frames = []
    try:
        while True:
            frame = img.copy().convert('RGBA')
            frames.append(frame)
            img.seek(img.tell() + 1)
    except EOFError:
        pass

    if not frames:
        return

    w, h = frames[0].size
    sheet = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * w, 0))

    sheet.save(output_path)
    print(f"  {gif_path.name} -> {output_path.name} ({len(frames)} frames, {w}x{h} each)")


def main():
    assets_dir = Path(__file__).parent.parent / 'assets'
    output_dir = Path(__file__).parent.parent / 'browser' / 'public' / 'assets' / 'sprites'
    output_dir.mkdir(parents=True, exist_ok=True)

    for gif in assets_dir.glob('*.gif'):
        out = output_dir / f"{gif.stem}.png"
        gif_to_spritesheet(gif, out)

    # Copy PNGs directly
    for png in assets_dir.glob('*.png'):
        out = output_dir / png.name
        img = Image.open(png).convert('RGBA')
        img.save(out)
        print(f"  {png.name} -> copied ({img.size[0]}x{img.size[1]})")


if __name__ == '__main__':
    main()
