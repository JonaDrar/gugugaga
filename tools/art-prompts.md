# Prompts de arte

Copia/pega en el generador de imágenes. **Siempre adjunta la imagen de referencia**
que se indica: es lo que mantiene misma pose, escala, encuadre y luz (si no calza,
las capas se desalinean).

Reglas comunes: **1254×1254 px**, fondo **transparente** (o verde puro `#00FF00`,
que se limpia con `python3 tools/clean_green.py <archivo>`), **sin sombra en el
piso**, estilo figura 3D tipo Nendoroid, brillante, luz suave frontal.

---

## 1. Caras de la niña (expresiones)

Referencia obligatoria: **`assets/art/girl-base.png`**.
Guardar como `assets/art/girl-happy.png`, `girl-sleep.png`, `girl-sad.png`.
No hay que tocar código: el juego los toma solos.

### girl-happy.png 😄
```
Using the attached image as reference, generate the EXACT same 3D chibi figurine
of the girl: same character, same short black bob with bangs and the black hair
clip on her left, same plain light-gray footed onesie, same standing pose with
arms down, same body proportions, same camera framing, same scale and position in
frame, same soft frontal lighting, same 3D Nendoroid figurine style.
ONLY change the facial expression to VERY HAPPY: big joyful open smile showing a
happy mood, eyes curved into happy upward arcs (^ ^ closed-eye smile), rosy blush
on the cheeks.
Do not change the hair, the outfit, the pose, the crop or the size.
Full body, centered, transparent background, no shadow, no text.
```

### girl-sleep.png 😴
```
Using the attached image as reference, generate the EXACT same 3D chibi figurine
of the girl: same character, same short black bob with bangs and the black hair
clip on her left, same plain light-gray footed onesie, same standing pose with
arms down, same body proportions, same camera framing, same scale and position in
frame, same soft frontal lighting, same 3D Nendoroid figurine style.
ONLY change the facial expression to SLEEPING: eyes gently closed (soft downward
curved lines), calm relaxed little smile, a tiny sleepy blush, mouth slightly open
in a small peaceful "o".
Do not change the hair, the outfit, the pose, the crop or the size. Do not add Zzz
symbols or props.
Full body, centered, transparent background, no shadow, no text.
```

### girl-sad.png 😢
```
Using the attached image as reference, generate the EXACT same 3D chibi figurine
of the girl: same character, same short black bob with bangs and the black hair
clip on her left, same plain light-gray footed onesie, same standing pose with
arms down, same body proportions, same camera framing, same scale and position in
frame, same soft frontal lighting, same 3D Nendoroid figurine style.
ONLY change the facial expression to CRYING like a cranky baby: eyebrows angled
up in the middle, big teary glossy eyes with a few tear drops running down the
cheeks, open wailing mouth, flushed cheeks.
Do not change the hair, the outfit, the pose, the crop or the size.
Full body, centered, transparent background, no shadow, no text.
```

---

## 2. Piezas sueltas (gorros, cabezas, cuerpos, accesorios)

Se generan como **objeto aislado** (no sobre la niña) y se posicionan con
`anchor {top,left,width}`. Ver la receta completa en `README.md` →
*Cómo agregar una pieza de arte nueva*.

Molde genérico:
```
A single <PIEZA>, isolated object, 3D Nendoroid figurine style, glossy toy
plastic look, soft frontal lighting, centered, transparent background, no shadow,
no character, no text.
```

### 2.1 Capuchas / cabezas nuevas → slot `head`

**Referencia obligatoria: `assets/art/head-penguin.png`.** Es lo que mantiene el
**agujero de la cara** en el mismo lugar y tamaño; si se mueve, la capucha no
calza con las expresiones. Funcionó exacto con el conejo.

```
Using the attached image as reference, generate a plush costume HOOD with the
EXACT same overall shape, same size, same camera framing, and — most important —
the SAME round face opening in the same position and the same size as the
reference. Same 3D Nendoroid figurine style, same soft plush fabric texture,
same soft frontal lighting.
CHANGE it into a <ANIMAL> hood instead of a penguin: <COLOR> plush, and
<DESCRIPCIÓN DE LAS OREJAS>. Replace the penguin face on the hood with a cute
<ANIMAL> face above the opening: <OJOS Y NARIZ>.
Keep the ears inside the frame — do not crop them. Do not change the size or
position of the face opening. No head inside the hood, no character, no body.
Isolated object, centered, transparent background, no shadow, no text.
```
Ojo: la capucha ocupa casi todo el cuadro, así que **orejas largas paradas no
entran** sin achicar la capucha. Si las querés paradas, pedilas igual y se
recalibra el anchor con `tools/preview.py`.

Guardar como `head-<animal>.png`.

### 2.2 Cuerpos / trajes → slot `body`

**Referencia obligatoria: `assets/art/body-penguin.png`**, para que los hombros y
el largo caigan igual sobre la niña.

```
Using the attached image as reference, generate a plush costume BODY (torso,
arms and legs, NO head) with the EXACT same silhouette proportions, same size,
same camera framing, same neck opening position, same 3D Nendoroid figurine
style, same soft plush fabric texture and same soft frontal lighting.
CHANGE it into <PRENDA>: <DESCRIPCIÓN Y COLORES>.
Do not change the size or position of the neck opening. No head, no face,
no character. Isolated object, centered, transparent background, no shadow,
no text.
```
Ideas: `a pink puffy party dress with white frills`, `a yellow raincoat with
matching boots`, `light blue denim overalls over a white shirt`, `a strawberry
costume with green leaf collar`.

Guardar como `body-<nombre>.png`.

### 2.3 Collares → slot `accessory`

Acá NO hace falta referencia: es un objeto chico que se posiciona con su anchor.
Se genera solo, centrado y **de frente**.

```
A single <TIPO DE COLLAR>, laid out flat and symmetrical, facing the viewer, as
if worn around a neck: an open horseshoe/U shape with the pendant hanging at the
bottom center. 3D Nendoroid figurine style, glossy toy plastic look, chunky
cute proportions, soft frontal lighting, centered, isolated object,
transparent background, no shadow, no neck, no character, no text.
```
Reemplazá `<TIPO DE COLLAR>` por:
- `a gold chain necklace with a big red heart pendant`
- `a pearl necklace with a pink bow pendant`
- `a beaded rainbow necklace with a yellow star pendant`

Guardar como `necklace-<nombre>.png`. Yo lo registro en el slot `accessory` y
calibro el anchor sobre el pecho.

### 2.4 Fondos de escenario 🏞️

Van en `js/scene.js`, campo `img` de cada escena. **Especificación técnica:**

- **1080×1920 px** (vertical 9:16). Se pinta con `cover`, así que se recorta por
  los costados en pantallas más anchas → **nada importante en los bordes laterales**.
- **Horizonte al ~60% de la altura.** Ahí es donde el juego apoya a Gugugaga.
- **El tercio inferior casi vacío** (piso, arena, pasto, alfombra): es donde ella
  se para y donde aparecen las burbujas del baño.
- **Centro despejado**: no pongas el elemento principal en el medio, queda tapado.
- Sin texto, sin personajes.

```
A cute empty <LUGAR> background for a children's game, vertical 9:16 portrait
composition. Soft 3D toy-diorama look, pastel colors, gentle soft lighting,
matching a Nendoroid figurine world. The horizon sits about 60% down the image.
The bottom third is a clean simple floor with almost nothing on it. The center
of the image is open and uncluttered. Keep all important elements away from the
left and right edges. No characters, no people, no animals, no text, no logos.
```
Reemplazá `<LUGAR>`: `cozy kid bedroom with a window and toys on shelves`,
`sunny tropical beach with palm trees at the sides`, `flower garden with a wooden
fence`, `snowy landscape with pine trees`, `birthday party room with balloons
and garlands on the walls`.

Guardar como `assets/art/bg-<escena>.png` y avisame para engancharlo (o poné el
nombre en el campo `img` de la escena en `js/scene.js` — es una línea).

### 2.5 Mascota 🐾 → personaje aparte (no es una capa)

La mascota **no va sobre la niña**: se para al lado en la escena, así que se
genera como personaje completo y chiquito. Debe mirar hacia adelante y estar
apoyada (no flotando).

```
A single tiny cute <ANIMAL> companion character, chibi proportions, big round
head, small body, standing on the ground facing the viewer, friendly happy
expression. 3D Nendoroid figurine style, glossy toy plastic look, soft frontal
lighting, full body, centered, isolated object, transparent background,
no shadow, no text.
```
Ideas de `<ANIMAL>`: `baby seal`, `round orange cat`, `small white bunny`,
`baby penguin chick`.

Guardar como `pet-<animal>.png`.
