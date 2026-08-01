#!/usr/bin/env python3
"""Inline the project into a single self-contained HTML file for the Artifact link.

Reads the split project (index.html + css + js) and writes one standalone file
with <style> and <script> inlined, stripping the PWA-only <head> bits and the
service-worker registration (not needed inside the Artifact sandbox).
"""
import base64
import io
import pathlib
import re

from PIL import Image

ROOT = pathlib.Path(__file__).parent
PREVIEW_MAXDIM = 720  # downscale art for the web link only (project keeps full res)
_uri_cache = {}


def _data_uri(rel):
    if rel in _uri_cache:
        return _uri_cache[rel]
    im = Image.open(ROOT / rel).convert("RGBA")
    if max(im.size) > PREVIEW_MAXDIM:
        im.thumbnail((PREVIEW_MAXDIM, PREVIEW_MAXDIM), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    _uri_cache[rel] = uri
    return uri


def inline_art(text):
    """Replace any quoted "assets/art/xxx" path (HTML attr or JS string) with a
    downscaled data: URI so the single-file build works inside the Artifact
    sandbox and stays small."""

    def repl(m):
        rel = m.group(1)
        if not (ROOT / rel).exists():
            return m.group(0)
        return '"' + _data_uri(rel) + '"'

    return re.sub(r'"(assets/art/[^"]+)"', repl, text)
OUT = pathlib.Path(
    "/private/tmp/claude-502/-Users-jonathanaraya-dev-lia-gugugaga/"
    "f31af615-83cd-4680-8a78-f70bb2cccf5a/scratchpad/gugugaga-preview.html"
)

JS_ORDER = [
    "js/save.js",
    "js/store.js",
    "js/audio.js",
    "js/voice.js",
    "js/cosmetics.js",
    "js/foods.js",
    "js/care.js",
    "js/notify.js",
    "js/health.js",
    "js/scene.js",
    "js/minigames.js",
    "js/pet.js",
    "js/game.js",
]

css = (ROOT / "css/style.css").read_text(encoding="utf-8")
js = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in JS_ORDER)

html = (ROOT / "index.html").read_text(encoding="utf-8")
start = html.index('<div id="app">')
end = html.index('<script src="js/save.js"')
markup = html[start:end].strip()

out = (
    "<title>Gugugaga — Cuida a tu pingüino</title>\n"
    f"<style>\n{css}\n</style>\n\n"
    f"{markup}\n\n"
    f"<script>\n{js}\n</script>\n"
)

out = inline_art(out)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(out, encoding="utf-8")
print(f"Built {OUT} ({len(out):,} bytes)")
