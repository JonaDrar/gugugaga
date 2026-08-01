#!/usr/bin/env python3
"""Remove green-screen background + green fringe from a generated PNG, in place.

Some image generators export "transparent" PNGs that actually keep a green
(#00FF00-ish) color under the alpha, which shows as a green halo when the art
is scaled/overlaid. This strips it: strong green -> fully transparent, and any
lingering green spill on edges is de-spilled (green clamped to max(r,b)).

The Gugugaga art has no legitimately-green content (pastel dots on the hat are
yellow/blue/pink, not pure green), so this is safe for every asset.

Usage:
    python3 tools/clean_green.py assets/art/new-piece.png [more.png ...]
"""
import sys
import numpy as np
from PIL import Image


def clean(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im).astype(np.int16)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    green = (g > 100) & (g > r * 1.4) & (g > b * 1.4)
    al[green] = 0
    mx = np.maximum(r, b)
    spill = g > mx
    g[spill] = mx[spill]
    trans = al == 0
    r[trans] = 0; g[trans] = 0; b[trans] = 0
    a[..., 0], a[..., 1], a[..., 2], a[..., 3] = r, g, b, al
    Image.fromarray(a.astype(np.uint8), "RGBA").save(path)
    print("cleaned", path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python3 tools/clean_green.py <file.png> [...]")
    for p in sys.argv[1:]:
        clean(p)
