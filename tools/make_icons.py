#!/usr/bin/env python3
"""Generate the PWA / Apple touch icons from the real layered character.

The manifest already declares icon-192/512/512-maskable and index.html asks for
icon-180 (apple-touch-icon); this renders all of them from the SAME source of
truth as the game — the layer compositor in preview.py — so the home-screen icon
always matches whatever the default look is.

Icons are CROPPED to the head and shoulders: a full body at 192px is an
unreadable smudge on a home screen, the face is what she recognises.

Usage:  python3 tools/make_icons.py
"""
import pathlib

from PIL import Image, ImageDraw

import preview  # sibling module: layer catalog + game-accurate compositor

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"
N = preview.N  # 1254 native artwork square

# Default look for the icon: the penguin, no party hat (the hat is a costume,
# the penguin IS her identity).
LOOK = {"body": "penguin", "head": "penguin", "accessory": None, "hat": None}

# Crop window over the 1254² stage, framing hood + face + a little belly.
CROP = (250, 30, 1010, 790)

# Sky gradient matching the manifest theme/background colours.
TOP = (167, 224, 255)
BOTTOM = (143, 211, 255)


def sky(size):
    """Vertical gradient background, drawn at full icon size."""
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        g.putpixel((0, y), tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)))
    return g.resize((size, size), Image.BILINEAR).convert("RGBA")


def character():
    """Transparent-background render of the layered character, cropped to the face."""
    cv = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    cv.alpha_composite(Image.open(preview.ART / preview.BASE).convert("RGBA"), (0, 0))
    for slot in preview.LAYER_ORDER:
        pid = LOOK.get(slot)
        if not pid or pid not in preview.CATALOG.get(slot, {}):
            continue
        fname, anchor = preview.CATALOG[slot][pid]
        preview.paste(cv, Image.open(preview.ART / fname).convert("RGBA"), anchor)
    return cv.crop(CROP)


def icon(size, inset=1.0):
    """Compose the character over the sky. `inset` < 1 shrinks the art to leave
    the safe margin a maskable icon needs (Android crops up to 20% per side)."""
    bg = sky(size)
    art = character()
    w = max(1, round(size * inset))
    art = art.resize((w, w), Image.LANCZOS)
    bg.alpha_composite(art, ((size - w) // 2, (size - w) // 2))
    return bg


def rounded(im, radius_ratio=0.22):
    """Round the corners so the favicon/desktop icon isn't a hard square.
    iOS and Android mask their own shape, so this only affects other surfaces."""
    r = round(im.size[0] * radius_ratio)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        # name, size, inset, round corners?
        ("icon-192.png", 192, 1.0, True),
        ("icon-512.png", 512, 1.0, True),
        # Maskable: full-bleed background, art pulled into the 80% safe zone.
        ("icon-512-maskable.png", 512, 0.72, False),
        # Apple touch icon: iOS applies its own squircle and hates transparency.
        ("icon-180.png", 180, 1.0, False),
    ]
    for name, size, inset, round_it in jobs:
        im = icon(size, inset)
        im = rounded(im) if round_it else im.convert("RGB")
        im.save(OUT / name)
        print("wrote", OUT / name, im.size, im.mode)
