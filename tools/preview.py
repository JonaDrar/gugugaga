#!/usr/bin/env python3
"""Game-accurate layer compositor for tuning cosmetic anchors.

The game stacks transparent PNG layers over a square character stage:
    girl-base (expression)  ->  body  ->  head  ->  accessory  ->  hat
Each layer piece has an anchor {top,left,width} in PERCENT of the square
stage (the same 1254x1254 space as the artwork). This script reproduces
that math EXACTLY so you can preview/tune a new piece's anchor locally
(Read the output PNG) before touching js/cosmetics.js — no browser needed.

Usage:
    python3 tools/preview.py                 # render the default look
    python3 tools/preview.py --out p.png
    # tweak the LOOK dict below (or the anchors) and re-run to iterate.

IMPORTANT: keep the anchors here in sync with js/cosmetics.js.
"""
import argparse
import pathlib
from PIL import Image

ART = pathlib.Path(__file__).resolve().parent.parent / "assets" / "art"
N = 1254  # native artwork square; anchors are % of this

# --- current equipped look (edit ids to preview combinations) -----------------
LOOK = {"body": "penguin", "head": "penguin", "accessory": None, "hat": "party"}
LAYER_ORDER = ["body", "head", "accessory", "hat"]  # back -> front

# --- catalog: mirror of js/cosmetics.js (file + anchor per piece) --------------
CATALOG = {
    "body": {
        "penguin": ("body-penguin.png", {"top": 33, "left": 12, "width": 76}),
    },
    "head": {
        "penguin": ("head-penguin.png", {"top": 0, "left": 22.2, "width": 56}),
        "bunny": ("head-bunny.png", {"top": 0, "left": 21.8, "width": 56}),
    },
    "accessory": {},
    "hat": {
        "party": ("hat-party.png", {"top": -19, "left": 33, "width": 36}),
    },
}
BASE = "girl-base.png"  # the expression layer (girl face)


def paste(canvas, img, anchor):
    w = int(anchor["width"] / 100 * N)
    r = img.resize((w, w), Image.LANCZOS)
    canvas.alpha_composite(r, (int(anchor["left"] / 100 * N), int(anchor["top"] / 100 * N)))


def render(look, bg=(206, 235, 255, 255), size=480, base=BASE):
    cv = Image.new("RGBA", (N, N), bg)
    cv.alpha_composite(Image.open(ART / base).convert("RGBA"), (0, 0))
    for slot in LAYER_ORDER:
        pid = look.get(slot)
        if not pid or pid not in CATALOG.get(slot, {}):
            continue
        fname, anchor = CATALOG[slot][pid]
        paste(cv, Image.open(ART / fname).convert("RGBA"), anchor)
    return cv.resize((size, size), Image.LANCZOS).convert("RGB")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ART / "_preview.png"))
    ap.add_argument("--size", type=int, default=480)
    ap.add_argument("--base", default=BASE, help="expression layer, e.g. girl-happy.png")
    args = ap.parse_args()
    render(LOOK, size=args.size, base=args.base).save(args.out)
    print("wrote", args.out, "look:", LOOK, "base:", args.base)
