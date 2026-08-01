#!/usr/bin/env python3
"""Calcula el `anchor` de una pieza a partir de DÓNDE querés que se vea.

El problema que resuelve: el anchor posiciona el CUADRO de la imagen, pero lo
que uno quiere colocar es el DIBUJO, y cada PNG deja un margen transparente
distinto. Mientras las piezas se generan copiando el encuadre de una referencia
(cabezas, cuerpos) eso no importa y todas comparten anchor. Pero las que se
generan sueltas —gorros, collares— salen cada una con su propio margen, y ahí
el anchor compartido las descuadra: la corona quedaba flotando sobre la cabeza y
los collares arriba del borde del traje.

    python3 tools/fit_anchor.py necklace-perla.png --top 45.6 --width 27
    python3 tools/fit_anchor.py hat-corona.png --bottom 15.9 --width 30

Imprime el anchor listo para pegar en js/cosmetics.js (y en preview.py).

Referencias útiles del stage (en % del cuadrado del personaje):
    borde superior del traje ....... 45.6   (donde apoyan los collares)
    borde inferior del gorro ....... 15.9   (donde apoyan los gorros)
"""
import argparse
import pathlib

import numpy as np
from PIL import Image

ART = pathlib.Path(__file__).resolve().parent.parent / "assets" / "art"


def bbox_pct(path):
    """Caja del dibujo dentro de su propio cuadro, en % (top, left, w, h)."""
    im = Image.open(path).convert("RGBA")
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 10)
    if not len(xs):
        raise SystemExit(f"{path.name} está vacía")
    n = im.size[0]
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)
    return dict(top=y0 / n * 100, left=x0 / n * 100,
                w=(x1 - x0) / n * 100, h=(y1 - y0) / n * 100)


def fit(bb, visible_width, center_x=50.0, top=None, bottom=None):
    """Anchor tal que el DIBUJO quede del ancho pedido y con su borde superior en
    `top` (o el inferior en `bottom`), centrado en `center_x`."""
    w = visible_width / (bb["w"] / 100)          # ancho del CUADRO
    left = center_x - (bb["left"] + bb["w"] / 2) / 100 * w
    if top is not None:
        t = top - bb["top"] / 100 * w
    elif bottom is not None:
        t = bottom - (bb["top"] + bb["h"]) / 100 * w
    else:
        raise SystemExit("dame --top o --bottom")
    return dict(top=round(t, 1), left=round(left, 1), width=round(w, 1))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="PNG(s) en assets/art/")
    ap.add_argument("--width", type=float, required=True,
                    help="ancho VISIBLE deseado, en % del stage")
    ap.add_argument("--center", type=float, default=50.0)
    ap.add_argument("--top", type=float, help="dónde debe quedar el borde de ARRIBA")
    ap.add_argument("--bottom", type=float, help="dónde debe quedar el borde de ABAJO")
    a = ap.parse_args()

    for f in a.files:
        p = ART / f
        bb = bbox_pct(p)
        an = fit(bb, a.width, a.center, a.top, a.bottom)
        print(f"{f:26s} bbox(top={bb['top']:.1f} left={bb['left']:.1f} "
              f"w={bb['w']:.1f} h={bb['h']:.1f})")
        print(f"{'':26s} anchor: {{ top: {an['top']}, left: {an['left']}, "
              f"width: {an['width']} }}")
