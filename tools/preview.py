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
# Las piezas cuyo PNG todavía no existe están declaradas igual: render() las
# saltea si falta el archivo, así este script sirve para calibrar el anchor
# apenas aparece el arte, sin editar nada acá.
A_HEAD = {"top": 0, "left": 22.2, "width": 56}
A_BODY = {"top": 33, "left": 12, "width": 76}
A_HAT = {"top": -19, "left": 33, "width": 36}
# Cada gorro tiene su forma: ver el comentario en js/cosmetics.js.
A_CORONA = {"top": -8, "left": 31.8, "width": 39}
A_FLOR = {"top": -8.2, "left": 33.6, "width": 32.9}
# Cada collar tiene el suyo: ver el comentario en js/cosmetics.js.

# Capas que van DETRÁS de la niña (espejo de `imgBack` en js/cosmetics.js).
BACK = {"head": {"miku": ("head-miku-back.png", A_HEAD)}}

CATALOG = {
    "body": {
        "penguin": ("body-penguin.png", A_BODY),
        "vestido": ("body-vestido.png", A_BODY),
        "gato": ("body-gato.png", A_BODY),
        "pijama": ("body-pijama.png", A_BODY),
        "conejo": ("body-conejo.png", A_BODY),
        "dino": ("body-dino.png", A_BODY),
        "overol": ("body-overol.png", A_BODY),
        "miku": ("body-miku.png", {"top": 34.1, "left": 15, "width": 70.1}),
    },
    "head": {
        "penguin": ("head-penguin.png", A_HEAD),
        "gato": ("head-gato.png", A_HEAD),
        "bunny": ("head-bunny.png", {"top": 0, "left": 21.8, "width": 56}),
        "dino": ("head-dino.png", A_HEAD),
        "oso": ("head-oso.png", A_HEAD),
        "miku": ("head-miku.png", {"top": 3, "left": 22.2, "width": 56}),
    },
    "accessory": {
        "corazon": ("necklace-corazon.png", {"top": 40.3, "left": 33.1, "width": 33.7}),
        "perla": ("necklace-perla.png", {"top": 42.9, "left": 34.3, "width": 31.4}),
        "estrella": ("necklace-estrella.png", {"top": 42.4, "left": 33.8, "width": 32.4}),
    },
    "hat": {
        "party": ("hat-party.png", A_HAT),
        "gorro": ("hat-gorro.png", A_HAT),
        "corona": ("hat-corona.png", A_CORONA),
        "flor": ("hat-flor.png", A_FLOR),
    },
}
BASE = "girl-base.png"  # the expression layer (girl face)


def paste(canvas, img, anchor):
    w = int(anchor["width"] / 100 * N)
    r = img.resize((w, w), Image.LANCZOS)
    canvas.alpha_composite(r, (int(anchor["left"] / 100 * N), int(anchor["top"] / 100 * N)))


def render(look, bg=(206, 235, 255, 255), size=480, base=BASE):
    cv = Image.new("RGBA", (N, N), bg)
    # Primero lo que va DETRÁS de la niña (pelo largo), después ella, después el
    # resto de las capas. Mismo orden que el juego.
    for slot, pieces in BACK.items():
        pid = look.get(slot)
        if pid in pieces:
            fname, anchor = pieces[pid]
            if (ART / fname).exists():
                paste(cv, Image.open(ART / fname).convert("RGBA"), anchor)
    cv.alpha_composite(Image.open(ART / base).convert("RGBA"), (0, 0))
    for slot in LAYER_ORDER:
        pid = look.get(slot)
        if not pid or pid not in CATALOG.get(slot, {}):
            continue
        fname, anchor = CATALOG[slot][pid]
        if not (ART / fname).exists():
            print(f"  (falta {fname}, se saltea)")
            continue
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
