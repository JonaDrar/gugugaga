#!/usr/bin/env python3
"""Genera las piezas de arte que faltan con la API de imágenes de OpenAI.

Es el mismo flujo que hacíamos a mano (prompt + imágenes de referencia), pero
scripteado, así se puede iterar sin ir y volver por el chat.

    python3 tools/gen_art.py --list                     # qué falta
    python3 tools/gen_art.py body-conejo --dry-run      # ver qué se mandaría
    python3 tools/gen_art.py body-conejo --model gpt-image-1-mini
    python3 tools/gen_art.py body-gato head-dino        # varias de una

La API devuelve PNG con fondo transparente (`background=transparent`), así que
NO hace falta pasar `clean_green.py`: eso era necesario sólo cuando las imágenes
venían del chat con croma verde.

Seguridad y plata:
  · La key sale de la variable OPENAI_API_KEY o del archivo .env (gitignoreado).
    Nunca se imprime ni se guarda en el repo.
  · Cada corrida tiene tope de gasto (--budget, por defecto USD 0.50) y se lleva
    un acumulado en tools/.gen_art_spend.json para no perderle el rastro.
  · --dry-run muestra el prompt, las referencias y el costo estimado sin gastar.
"""
import argparse
import base64
import io
import json
import os
import pathlib
import sys
import time

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART = ROOT / "assets" / "art"
SPEND_FILE = pathlib.Path(__file__).resolve().parent / ".gen_art_spend.json"
API = "https://api.openai.com/v1/images/edits"
GEN_API = "https://api.openai.com/v1/images/generations"

# Precios por 1M de tokens (docs de OpenAI). gpt-image-2 cobra la salida por
# imagen en vez de por token, así que va aparte.
PRICES = {
    "gpt-image-1":      {"text_in": 5.0, "img_in": 10.0, "img_out": 40.0},
    "gpt-image-1.5":    {"text_in": 5.0, "img_in": 8.0,  "img_out": 32.0},
    "gpt-image-1-mini": {"text_in": 2.0, "img_in": 2.5,  "img_out": 8.0},
    "gpt-image-2":      {"text_in": 5.0, "img_in": 8.0,  "img_out": None},
}
# Modelos que aceptan `input_fidelity`. mini lo rechaza con 400, y gpt-image-2
# procesa las referencias en alta fidelidad siempre, así que tampoco lo acepta.
FIDELITY_MODELS = {"gpt-image-1", "gpt-image-1.5"}

# gpt-image-2: USD por imagen de salida, según calidad y tamaño.
IMAGE2_OUT = {
    ("low", "1024x1024"): 0.006, ("low", "1024x1536"): 0.005, ("low", "1536x1024"): 0.005,
    ("medium", "1024x1024"): 0.053, ("medium", "1024x1536"): 0.041, ("medium", "1536x1024"): 0.041,
    ("high", "1024x1024"): 0.211, ("high", "1024x1536"): 0.165, ("high", "1536x1024"): 0.165,
}

# ---------------------------------------------------------------- prompts ----
# Espejo de tools/art-prompts.md. `refs` son las imágenes de referencia, EN
# ORDEN: para los cuerpos de animal, primero la silueta y después el color.

_BODY = (
    "Using the attached image as reference, generate a plush costume BODY (torso, "
    "arms and legs, NO head) with the EXACT same silhouette proportions, same size, "
    "same camera framing, same neck opening position, same 3D Nendoroid figurine "
    "style, same soft plush fabric texture and same soft frontal lighting. "
    "CHANGE it into {d}. "
    "Do not change the size or position of the neck opening. No head, no face, "
    "no character. Isolated object, centered, transparent background, no shadow, no text."
)

_BODY_ANIMAL = (
    "Using the FIRST attached image as the reference for SHAPE and the SECOND attached "
    "image as the reference for COLOR AND MATERIAL, generate a plush costume BODY "
    "(torso, arms and legs, NO head). "
    "From the FIRST image keep: the EXACT same silhouette proportions, the same size, "
    "the same camera framing, the same neck opening position and size, the same 3D "
    "Nendoroid figurine style, the same soft plush fabric texture and the same soft "
    "frontal lighting. "
    "From the SECOND image keep: the EXACT same {color} plush color and the same "
    "material finish, so that the body and the hood read as ONE single costume. "
    "Details for this costume: {d}. "
    "Do not change the size or position of the neck opening. No head, no face, "
    "no character, no ears. Isolated object, centered, transparent background, "
    "no shadow, no text."
)

_HEAD = (
    "Using the attached image as reference, generate a plush costume HOOD with the "
    "EXACT same overall shape, same size, same camera framing, and — most important — "
    "the SAME round face opening in the same position and the same size as the "
    "reference. Same 3D Nendoroid figurine style, same soft plush fabric texture, "
    "same soft frontal lighting. "
    "CHANGE it into a {animal} hood instead of a penguin: {color} plush, and {ears}. "
    "Replace the penguin face on the hood with a cute {animal} face above the opening: "
    "{face}. "
    "Keep the ears inside the frame — do not crop them. Do not change the size or "
    "position of the face opening. No head inside the hood, no character, no body. "
    "Isolated object, centered, transparent background, no shadow, no text."
)

_HAT = (
    "Using the attached image as reference, generate a single {d} with the EXACT same "
    "size in frame, same camera framing, same scale and same soft frontal lighting as "
    "the reference hat. Same 3D Nendoroid figurine style, glossy toy look. The hat is "
    "seen from the front, sitting flat as if resting on top of a head, with the opening "
    "at the bottom. Isolated object, centered, transparent background, no shadow, "
    "no head, no character, no text."
)

_NECK = (
    "A single {d}, laid out flat and symmetrical, facing the viewer, as if worn around "
    "a neck: an open horseshoe/U shape with the pendant hanging at the bottom center. "
    "3D Nendoroid figurine style, glossy toy plastic look, chunky cute proportions, "
    "soft frontal lighting, centered, isolated object, transparent background, "
    "no shadow, no neck, no character, no text."
)

_BUDDY = (
    "A single tiny cute {d} companion character, chibi proportions, big round head, "
    "small body, standing on the ground facing the viewer, calm friendly neutral "
    "expression, eyes open. 3D Nendoroid figurine style, glossy toy plastic look, "
    "soft frontal lighting, full body, centered, isolated object, transparent "
    "background, no shadow, no text."
)

_BUDDY_MOOD = (
    "Using the attached image as reference, generate the EXACT same tiny {animal} "
    "companion character: same species, same colors, same markings, same chibi "
    "proportions, same size and position in frame, same camera framing, same soft "
    "frontal lighting, same 3D Nendoroid figurine style. "
    "ONLY change the pose and expression to {mood}. "
    "Do not change the colors, the design, the crop or the size. "
    "Full body, centered, isolated object, transparent background, no shadow, no text."
)

BUDDY_LOOK = {
    "pollito": "fluffy yellow baby chick with a tiny orange beak and orange feet",
    "gatito": "round orange tabby kitten with a white belly and a striped tail",
    "perrito": "small cream-colored puppy with floppy brown ears and a stubby tail",
    "dino": "chubby mint green baby dinosaur with pale yellow belly and small rounded "
            "spikes on its back",
}
BUDDY_MOODS = {
    "feliz": "VERY HAPPY AND EXCITED: eyes curved into happy upward arcs, open smiling "
             "mouth, both little arms raised up, hopping slightly off the ground",
    "dormido": "SLEEPING: curled up lying on the ground, eyes closed as gentle curved "
               "lines, calm peaceful little smile",
    "triste": "SAD AND WORRIED: eyebrows angled up in the middle, big glossy worried "
              "eyes, small downturned mouth, ears drooping, sitting down",
}


def _recipes():
    r = {}

    # --- cuerpos de animal: 2 referencias (silueta + color) ---
    for name, hood, color, det in [
        ("body-gato", "head-gato.png", "soft cream and orange tabby",
         "a cream belly panel, soft orange tabby stripes on the arms and on the back, "
         "small rounded cream paws at the ends of the arms, chunky cream feet, and a "
         "thick striped orange cat tail curving out to one side"),
        ("body-conejo", "head-bunny.png", "soft white",
         "a very light pink belly panel, small rounded white paws at the ends of the "
         "arms, chunky white feet, and a small round fluffy white bunny tail"),
        ("body-dino", "head-dino.png", "bright mint green",
         "a pale yellow belly panel, a row of small rounded pastel-yellow spikes down "
         "the back, chunky green three-toed feet, and a thick tapering green dinosaur "
         "tail curving out to one side"),
    ]:
        r[name] = {"refs": ["body-penguin.png", hood],
                   "prompt": _BODY_ANIMAL.format(color=color, d=det)}

    # --- ropa normal: 1 referencia ---
    for name, det in [
        ("body-vestido", "a puffy pink party dress with white frilly trim at the hem, "
         "short puffed sleeves, a white sash bow at the waist, and white tights with "
         "little black shoes"),
        ("body-pijama", "a cozy light-blue footed pyjama onesie covered in small white "
         "cloud and yellow star patterns, with a soft white collar and white cuffs"),
        ("body-overol", "light blue denim dungarees with two shoulder straps and a front "
         "pocket, worn over a white long-sleeve t-shirt, with little red sneakers"),
    ]:
        r[name] = {"refs": ["body-penguin.png"], "prompt": _BODY.format(d=det)}

    for name, animal, color, ears, face in [
        ("head-dino", "dinosaur", "bright mint green",
         "a row of small rounded pastel-yellow spikes along the top instead of ears",
         "two big round friendly eyes and two tiny nostrils"),
        ("head-oso", "bear", "warm caramel brown",
         "two big round bear ears on top with lighter beige inner ears",
         "two round black eyes and a beige oval muzzle with a small dark nose"),
    ]:
        r[name] = {"refs": ["head-penguin.png"],
                   "prompt": _HEAD.format(animal=animal, color=color, ears=ears, face=face)}

    # --- traje de diva vocaloid (Miku) ---------------------------------------
    # Se genera con las referencias que dejó el dueño en miku-referencias/, y el
    # prompt describe el DISEÑO en vez de nombrar al personaje: los modelos de
    # imagen suelen rechazar los nombres propios, y describiéndolo sale igual.
    #
    # Las coletas van cortas a propósito. Las originales llegan a los tobillos,
    # pero la capa `head` se escala por el ANCHO de su cuadro: coletas largas
    # obligarían a agrandar el cuadro y con él el hueco de la cara, que dejaría
    # de calzar con las expresiones. Cortas y gorditas es además como se ven en
    # las figuras chibi, así que no se pierde nada.
    r["head-miku"] = {
        "refs": ["head-penguin.png", "../../miku-referencias/e3b404m7t5.png.webp"],
        "prompt": (
            "Using the FIRST attached image as the reference, generate a HAIR WIG that "
            "has the EXACT SAME outer silhouette as that hood — the same size, the same "
            "outline, the same rounded mass covering the top, the back and BOTH SIDES of "
            "the head down past the chin — and the EXACT SAME round face opening in the "
            "same position and the same size. "
            "The ONLY thing that changes is what it is made of: instead of black plush "
            "fabric it is now bright turquoise/aqua HAIR, with soft visible hair strands, "
            "plus a straight turquoise fringe hanging over the top edge of the face "
            "opening, ending just above where the eyes would be. "
            "Remove the penguin face and beak completely. "
            "Then add, on top of that same silhouette: two thick turquoise twintails, one "
            "on each side, each tied at the top with a black and hot-pink band; and a "
            "black futuristic headset over the ears with a hot-pink stripe and a small "
            "microphone arm curving toward the mouth. Use the SECOND attached image only "
            "as a colour and style guide for the hair, the bands and the headset. "
            "Keep the twintails SHORT and chunky and FULLY inside the frame. "
            "Do not change the size or position of the face opening. Do not shrink the "
            "silhouette. No head inside the wig, no face, no character, no body. "
            "Isolated object, centered, transparent background, no shadow, no text."
        ),
    }
    r["body-miku"] = {
        "refs": ["body-penguin.png", "../../miku-referencias/images-14.jpeg"],
        "prompt": (
            "Using the FIRST attached image as the reference for SHAPE and the SECOND "
            "attached image as the reference for the OUTFIT DESIGN, generate a costume "
            "BODY (torso, arms and legs, NO head) for a chibi figurine. "
            "From the FIRST image keep: the EXACT same silhouette proportions, the same "
            "size, the same camera framing, the same neck opening position and size, the "
            "same 3D Nendoroid figurine style and the same soft frontal lighting. "
            "The outfit: a light grey sleeveless top with a turquoise collar and a long "
            "turquoise necktie down the chest, black detached sleeves on both arms with a "
            "turquoise band at the top, a short black pleated skirt with a thin turquoise "
            "trim at the hem, and tall black thigh-high boots with turquoise trim. "
            "Chibi proportions: short and chunky limbs, not slender. "
            "Do not change the size or position of the neck opening. No head, no face, "
            "no hair, no character. Isolated object, centered, transparent background, "
            "no shadow, no text."
        ),
    }

    for name, det in [
        ("hat-gorro", "chunky knitted winter beanie in mustard yellow with a big white "
         "fluffy pom-pom on top and a folded ribbed brim"),
        ("hat-corona", "small golden princess crown with five rounded points, each tipped "
         "with a colored gem, and a band of pink and blue jewels"),
        ("hat-flor", "flower crown headband made of small pink and white daisies with "
         "green leaves, forming an arc"),
    ]:
        r[name] = {"refs": ["hat-party.png"], "prompt": _HAT.format(d=det)}

    # --- collares: sin referencia (objeto suelto) ---
    for name, det in [
        ("necklace-corazon", "gold chain necklace with a big glossy red heart pendant"),
        ("necklace-perla", "white pearl necklace with a pink ribbon bow pendant"),
        ("necklace-estrella", "beaded rainbow necklace with a big yellow star pendant"),
    ]:
        r[name] = {"refs": [], "prompt": _NECK.format(d=det)}

    # --- mascotas: el `normal` es suelto, los otros van CON el normal de ref ---
    for bid, look in BUDDY_LOOK.items():
        r[f"buddy-{bid}-normal"] = {"refs": [], "prompt": _BUDDY.format(d=look)}
        for mood, desc in BUDDY_MOODS.items():
            r[f"buddy-{bid}-{mood}"] = {
                "refs": [f"buddy-{bid}-normal.png"],
                "prompt": _BUDDY_MOOD.format(animal=look, mood=desc),
            }
    return r


RECIPES = _recipes()


# ------------------------------------------------------------------ plata ----
def cost_of(model, usage, quality, size):
    """Costo en USD a partir del `usage` que devuelve la API."""
    p = PRICES.get(model)
    if not p or not usage:
        return None
    ti = usage.get("input_tokens_details", {}) or {}
    text_in = ti.get("text_tokens", 0)
    img_in = ti.get("image_tokens", 0)
    out = usage.get("output_tokens", 0)
    c = text_in / 1e6 * p["text_in"] + img_in / 1e6 * p["img_in"]
    if p["img_out"] is None:  # gpt-image-2 cobra la salida por imagen
        c += IMAGE2_OUT.get((quality, size), 0.211)
    else:
        c += out / 1e6 * p["img_out"]
    return c


def load_spend():
    if SPEND_FILE.exists():
        try:
            return json.loads(SPEND_FILE.read_text())
        except Exception:
            pass
    return {"total_usd": 0.0, "runs": []}


def save_spend(d):
    SPEND_FILE.write_text(json.dumps(d, indent=2))


def api_key():
    k = os.environ.get("OPENAI_API_KEY")
    if not k:
        env = ROOT / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.strip().startswith("OPENAI_API_KEY"):
                    k = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not k:
        sys.exit("No encuentro OPENAI_API_KEY (ni en el entorno ni en .env)")
    return k


# ------------------------------------------------------------------- api -----
def generate(name, model, quality, size, out_path, key, timeout=300, clean_alpha=True):
    rec = RECIPES[name]
    refs = [ART / f for f in rec["refs"]]
    missing = [str(f.name) for f in refs if not f.exists()]
    if missing:
        return {"error": f"faltan las referencias: {', '.join(missing)}"}

    data = {
        "model": model,
        "prompt": rec["prompt"],
        "size": size,
        "quality": quality,
        "background": "transparent",  # PNG con alpha: nada de croma verde
        "output_format": "png",
        "n": "1",
    }
    halo = None
    files = []
    if refs:
        # input_fidelity alto = respeta encuadre y escala del original, que es
        # justo lo que hace que las capas calcen. Sólo algunos modelos lo
        # aceptan: mini lo rechaza, y gpt-image-2 ya procesa las referencias en
        # alta fidelidad siempre, así que el parámetro le sobra (y da error 400).
        if model in FIDELITY_MODELS:
            data["input_fidelity"] = "high"
        # El tipo MIME tiene que ser el real: las referencias del dueño pueden
        # venir en .webp o .jpeg, y mandarlas rotuladas como PNG da un 400.
        mimes = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                 ".webp": "image/webp"}
        for f in refs:
            mime = mimes.get(f.suffix.lower(), "image/png")
            files.append(("image[]", (f.name, f.open("rb"), mime)))
        url = API
    else:
        url = GEN_API

    t0 = time.time()
    try:
        if files:
            r = requests.post(url, headers={"Authorization": f"Bearer {key}"},
                              data=data, files=files, timeout=timeout)
        else:
            r = requests.post(url, headers={"Authorization": f"Bearer {key}",
                                            "Content-Type": "application/json"},
                              json={k: (int(v) if k == "n" else v) for k, v in data.items()},
                              timeout=timeout)
    finally:
        for _, (_, fh, _) in files:
            fh.close()

    if r.status_code != 200:
        return {"error": f"HTTP {r.status_code}: {r.text[:400]}"}

    j = r.json()
    b64 = j["data"][0]["b64_json"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(base64.b64decode(b64))
    if clean_alpha:
        halo = clean_halo(out_path)
    return {"usage": j.get("usage"), "secs": time.time() - t0, "path": out_path,
            "halo": halo if clean_alpha else None}


def clean_halo(path, thresh=40):
    """Borra el aura semitransparente que deja `background=transparent`.

    Las piezas generadas traen ~2% de píxeles con alpha bajo alrededor del
    objeto (las hechas a mano traen 0%). Sobre el cielo celeste no se nota, pero
    sobre el fondo de noche esa aura brilla. Se tira todo lo que está por debajo
    del umbral y se deja el resto intacto, así el antialias del borde no se come.
    """
    from PIL import Image
    import numpy as np

    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    al = a[..., 3]
    before = float(((al > 0) & (al < 250)).mean() * 100)
    a[..., 3] = np.where(al < thresh, 0, al)
    Image.fromarray(a).save(path)
    after = float(((a[..., 3] > 0) & (a[..., 3] < 250)).mean() * 100)
    return (before, after)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="piezas a generar (ver --list)")
    ap.add_argument("--model", default="gpt-image-1.5")
    ap.add_argument("--quality", default="high", choices=["low", "medium", "high", "auto"])
    ap.add_argument("--size", default="1024x1024",
                    choices=["1024x1024", "1024x1536", "1536x1024", "auto"])
    ap.add_argument("--out-dir", default=str(ART),
                    help="dónde escribir (por defecto assets/art/)")
    ap.add_argument("--suffix", default="", help="sufijo para no pisar el bueno")
    ap.add_argument("--budget", type=float, default=0.50,
                    help="tope de gasto de ESTA corrida, en USD")
    ap.add_argument("--no-clean-alpha", action="store_true",
                    help="no borrar el aura semitransparente del borde")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()

    if a.list:
        print(f"{'pieza':26s} {'refs':>4s}  estado")
        for n in sorted(RECIPES):
            exists = (ART / f"{n}.png").exists()
            print(f"{n:26s} {len(RECIPES[n]['refs']):>4d}  {'ya está' if exists else 'FALTA'}")
        return

    if not a.names:
        ap.error("decime qué generar, o usá --list")
    unknown = [n for n in a.names if n not in RECIPES]
    if unknown:
        sys.exit(f"No conozco: {', '.join(unknown)}. Probá --list")

    est = {"gpt-image-1-mini": 0.04, "gpt-image-1.5": 0.16,
           "gpt-image-2": 0.24, "gpt-image-1": 0.20}.get(a.model, 0.20)
    print(f"modelo={a.model} calidad={a.quality} tamaño={a.size}")
    print(f"{len(a.names)} imagen(es), estimado ~USD {est * len(a.names):.2f} "
          f"(tope de la corrida: {a.budget:.2f})\n")

    if a.dry_run:
        for n in a.names:
            rec = RECIPES[n]
            print(f"── {n}.png")
            print(f"   refs: {', '.join(rec['refs']) or '(ninguna)'}")
            print(f"   prompt: {rec['prompt'][:300]}...\n")
        print("dry-run: no se gastó nada.")
        return

    key = api_key()
    spend = load_spend()
    run_total = 0.0
    for n in a.names:
        if run_total >= a.budget:
            print(f"⛔ corté: la corrida ya gastó USD {run_total:.3f}")
            break
        out = pathlib.Path(a.out_dir) / f"{n}{a.suffix}.png"
        print(f"→ {n} ... ", end="", flush=True)
        res = generate(n, a.model, a.quality, a.size, out, key,
                       clean_alpha=not a.no_clean_alpha)
        if "error" in res:
            print(f"ERROR: {res['error']}")
            continue
        c = cost_of(a.model, res["usage"], a.quality, a.size)
        run_total += c or 0
        print(f"ok  {res['secs']:.0f}s  USD {c:.4f}" if c else f"ok  {res['secs']:.0f}s")
        if res.get("halo"):
            print(f"   halo semitransparente: {res['halo'][0]:.1f}% → {res['halo'][1]:.1f}%")
        print(f"   → {out}")
        spend["runs"].append({"name": n, "model": a.model, "quality": a.quality,
                              "usd": c, "usage": res["usage"]})

    spend["total_usd"] = round(spend.get("total_usd", 0) + run_total, 6)
    save_spend(spend)
    print(f"\nesta corrida: USD {run_total:.4f}   ·   acumulado: USD {spend['total_usd']:.4f}")


if __name__ == "__main__":
    main()
