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

## 0. Lista de lo que falta (checklist)

Todo lo de acá abajo **ya está registrado en el código**. El juego esconde lo que
no tiene archivo y lo muestra solo apenas el PNG aparece en `assets/art/`:
**no hay que tocar nada de código, sólo dejar el archivo con el nombre exacto.**

**Ropa** (§2.1–2.4) — se desbloquean con ❤️ en ese orden:

| archivo | slot | ❤️ | prompt | |
|---|---|---|---|---|
| `head-gato.png` | cabeza | 20 | §2.1 | ✅ listo |
| `head-dino.png` | cabeza | 50 | §2.1 | |
| `head-oso.png` | cabeza | 65 | §2.1 | |
| `body-vestido.png` | cuerpo | 25 | §2.2 | |
| `body-gato.png` | cuerpo | 30 | **§2.2-bis** | ← completa el gato 🐱 |
| `body-pijama.png` | cuerpo | 40 | §2.2 | |
| `body-conejo.png` | cuerpo | 45 | **§2.2-bis** | ← completa el conejo 🐰 |
| `body-dino.png` | cuerpo | 55 | **§2.2-bis** | ← completa el dino 🦕 |
| `body-overol.png` | cuerpo | 70 | §2.2 | |
| `hat-gorro.png` | gorro | 30 | §2.3 | |
| `hat-corona.png` | gorro | 45 | §2.3 | |
| `hat-flor.png` | gorro | 60 | §2.3 | |
| `necklace-corazon.png` | extra | 20 | §2.4 | |
| `necklace-perla.png` | extra | 40 | §2.4 | |
| `necklace-estrella.png` | extra | 55 | §2.4 | |

**Los cuerpos de animal van costeados justo por encima de su capucha** (gato
20→30, conejo 35→45, dino 50→55): el disfraz se completa poco después de
conseguir la cabeza. Andar con cabeza de gato y cuerpo de pingüino por semanas
no es un premio, es un pendiente.

**Mascotas** (§2.6) — 4 ánimos × 4 mascotas, pero **ninguno es obligatorio**:
`buddy-<mascota>-<ánimo>.png` con mascota ∈ `pollito · gatito · perrito · dino`
y ánimo ∈ `normal · feliz · dormido · triste`.

> **Por dónde empezar:** hacé `buddy-pollito-normal.png` solo. Con ese archivo el
> pollito ya deja de ser emoji en todo el juego. Después sumás `feliz`, y así.
> Nunca queda nada a medias: lo que falta cae al `normal`, y si falta el `normal`
> vuelve al emoji.

**Orden que yo sugeriría:** `head-gato` (es la primera ropa nueva que ella va a
alcanzar, con 20 ❤️) → `buddy-pollito-normal` → `body-vestido` → el resto.

---

## 2. Piezas sueltas (gorros, cabezas, cuerpos, accesorios)

Se generan como **objeto aislado** (no sobre la niña) y se posicionan con
`anchor {top,left,width}`. Ver la receta completa en `README.md` →
*Cómo agregar una pieza de arte nueva*.

Los anchors de las piezas nuevas ya están puestos, **copiados de su hermana ya
calibrada** (todas las cabezas comparten anchor, todos los cuerpos comparten
anchor, etc.). Por eso el prompt insiste tanto en *mismo encuadre, misma escala*:
si respetás eso, la pieza calza sin tocar nada. Si igual queda torcida:

```
python3 tools/preview.py            # componé y mirá el PNG que escribe
```
y se ajusta el anchor en `js/cosmetics.js` (y el espejo en `tools/preview.py`).

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
<OREJAS>. Replace the penguin face on the hood with a cute <ANIMAL> face above
the opening: <CARA>.
Keep the ears inside the frame — do not crop them. Do not change the size or
position of the face opening. No head inside the hood, no character, no body.
Isolated object, centered, transparent background, no shadow, no text.
```

Reemplazos para las tres que faltan:

**`head-gato.png` 🐱** — `<ANIMAL>` = `cat`, `<COLOR>` = `soft cream and orange
tabby`, `<OREJAS>` = `two small pointed triangular cat ears with pink inner
ears`, `<CARA>` = `two round black eyes, a tiny pink triangular nose and small
whiskers`.

**`head-dino.png` 🦕** — `<ANIMAL>` = `dinosaur`, `<COLOR>` = `bright mint green`,
`<OREJAS>` = `a row of small rounded pastel-yellow spikes along the top instead
of ears`, `<CARA>` = `two big round friendly eyes and two tiny nostrils`.

**`head-oso.png` 🐻** — `<ANIMAL>` = `bear`, `<COLOR>` = `warm caramel brown`,
`<OREJAS>` = `two big round bear ears on top with lighter beige inner ears`,
`<CARA>` = `two round black eyes and a beige oval muzzle with a small dark nose`.

Ojo: la capucha ocupa casi todo el cuadro, así que **orejas largas paradas no
entran** sin achicar la capucha. Si las querés paradas, pedilas igual y se
recalibra el anchor con `tools/preview.py`.

### 2.2 Cuerpos / trajes → slot `body`

**Referencia obligatoria: `assets/art/body-penguin.png`**, para que los hombros y
el largo caigan igual sobre la niña.

```
Using the attached image as reference, generate a plush costume BODY (torso,
arms and legs, NO head) with the EXACT same silhouette proportions, same size,
same camera framing, same neck opening position, same 3D Nendoroid figurine
style, same soft plush fabric texture and same soft frontal lighting.
CHANGE it into <PRENDA>.
Do not change the size or position of the neck opening. No head, no face,
no character. Isolated object, centered, transparent background, no shadow,
no text.
```

**`body-vestido.png` 👗** — `<PRENDA>` = `a puffy pink party dress with white
frilly trim at the hem, short puffed sleeves, a white sash bow at the waist, and
white tights with little black shoes`.

**`body-pijama.png` 🌙** — `<PRENDA>` = `a cozy light-blue footed pyjama onesie
covered in small white cloud and yellow star patterns, with a soft white collar
and white cuffs`.

**`body-overol.png` 👖** — `<PRENDA>` = `light blue denim dungarees with two
shoulder straps and a front pocket, worn over a white long-sleeve t-shirt, with
little red sneakers`.

### 2.2-bis Cuerpos de ANIMAL (los que hacen juego con una capucha)

Estos son distintos a los de §2.2 y **necesitan DOS imágenes de referencia**:

1. **`assets/art/body-penguin.png`** → manda la silueta, el largo y el cuello.
2. **La capucha que tiene que hacer juego** (`head-gato.png`, `head-bunny.png`,
   `head-dino.png`) → manda el **color y la textura**, que es lo único que hace
   que se lea como un disfraz entero y no como dos animales pegados.

El pingüino ya está resuelto (cabeza + cuerpo), así que este molde es para
cerrar los otros: **gato**, **conejo** y **dino**.

```
Using the FIRST attached image as the reference for SHAPE and the SECOND
attached image as the reference for COLOR AND MATERIAL, generate a plush
costume BODY (torso, arms and legs, NO head).
From the FIRST image keep: the EXACT same silhouette proportions, the same
size, the same camera framing, the same neck opening position and size, the
same 3D Nendoroid figurine style, the same soft plush fabric texture and the
same soft frontal lighting.
From the SECOND image keep: the EXACT same <COLOR> plush color and the same
material finish, so that the body and the hood read as ONE single costume.
Details for this costume: <DETALLES>.
Do not change the size or position of the neck opening. No head, no face,
no character, no ears. Isolated object, centered, transparent background,
no shadow, no text.
```

**`body-gato.png` 🐱** — 2ª referencia `head-gato.png`.
`<COLOR>` = `soft cream and orange tabby`, `<DETALLES>` = `a cream belly panel,
soft orange tabby stripes on the arms and on the back, small rounded cream paws
at the ends of the arms, chunky cream feet, and a thick striped orange cat tail
curving out to one side`.

**`body-conejo.png` 🐰** — 2ª referencia `head-bunny.png`.
`<COLOR>` = `soft white`, `<DETALLES>` = `a very light pink belly panel, small
rounded white paws at the ends of the arms, chunky white feet, and a small round
fluffy white bunny tail`.

**`body-dino.png` 🦕** — 2ª referencia `head-dino.png`.
`<COLOR>` = `bright mint green`, `<DETALLES>` = `a pale yellow belly panel, a row
of small rounded pastel-yellow spikes down the back, chunky green three-toed
feet, and a thick tapering green dinosaur tail curving out to one side`.

> **La cola:** el pingüino no tiene, así que es lo único que puede salirse del
> molde. Si queda muy larga y se corta en el borde del cuadro, pedila más corta
> y pegada al cuerpo — **no** agrandes el anchor, porque eso descoloca el cuello.
> Verificá el resultado con:
> ```
> python3 tools/preview.py     # editá LOOK arriba del archivo
> ```

### 2.3 Gorros → slot `hat`

**Referencia obligatoria: `assets/art/hat-party.png`**, para que el tamaño calce
con el anchor que ya está calibrado (el gorro va apoyado ARRIBA de la capucha).

```
Using the attached image as reference, generate a single <GORRO> with the EXACT
same size in frame, same camera framing, same scale and same soft frontal
lighting as the reference hat. Same 3D Nendoroid figurine style, glossy toy
look. The hat is seen from the front, sitting flat as if resting on top of a
head, with the opening at the bottom.
Isolated object, centered, transparent background, no shadow, no head,
no character, no text.
```

**`hat-gorro.png` 🧶** — `<GORRO>` = `a chunky knitted winter beanie in mustard
yellow with a big white fluffy pom-pom on top and a folded ribbed brim`.

**`hat-corona.png` 👑** — `<GORRO>` = `a small golden princess crown with five
rounded points, each tipped with a colored gem, and a band of pink and blue jewels`.

**`hat-flor.png` 🌸** — `<GORRO>` = `a flower crown headband made of small pink
and white daisies with green leaves, forming an arc`.

### 2.4 Collares → slot `accessory`

Acá NO hace falta referencia: es un objeto chico que se posiciona con su anchor.
Se genera solo, centrado y **de frente**.

> ⚠️ Este es el **único anchor sin calibrar** del proyecto (no hay arte todavía).
> Cuando llegue el primer collar, correr `python3 tools/preview.py` y ajustar
> `A_NECK` en `js/cosmetics.js` para que caiga sobre el pecho.

```
A single <COLLAR>, laid out flat and symmetrical, facing the viewer, as if worn
around a neck: an open horseshoe/U shape with the pendant hanging at the bottom
center. 3D Nendoroid figurine style, glossy toy plastic look, chunky cute
proportions, soft frontal lighting, centered, isolated object, transparent
background, no shadow, no neck, no character, no text.
```

**`necklace-corazon.png` ❤️** — `<COLLAR>` = `a gold chain necklace with a big
glossy red heart pendant`.

**`necklace-perla.png` 🦪** — `<COLLAR>` = `a white pearl necklace with a pink
ribbon bow pendant`.

**`necklace-estrella.png` ⭐** — `<COLLAR>` = `a beaded rainbow necklace with a
big yellow star pendant`.

### 2.5 Fondos de escenario 🏞️

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

### 2.6 Mascotas 🐾 — personaje aparte, con ánimos

La mascota **no va sobre la niña**: se para al lado en la escena, así que se
genera como personaje completo y chiquito, mirando al frente y **apoyada**
(no flotando).

**Nombre de archivo — es lo único que importa:**

```
assets/art/buddy-<mascota>-<ánimo>.png
```
`<mascota>` ∈ `pollito` `gatito` `perrito` `dino`
`<ánimo>` ∈ `normal` `feliz` `dormido` `triste`

Cuándo se ve cada ánimo:

| ánimo | cuándo aparece |
|---|---|
| `normal` | por defecto, paseándose |
| `feliz` | comer, jugar, bañarse, y cuando la acarician |
| `dormido` | mientras Gugugaga duerme |
| `triste` | mientras ella está enferma o sucia |

**Ninguno es obligatorio.** El respaldo es `<ánimo>` → `normal` → emoji, así que
podés hacer de a uno y siempre se ve bien.

**El primero (`normal`) se genera solo. Los otros tres van CON el `normal` de
referencia**, para que sea el mismo bicho y no tres animales distintos.

#### Primero: `buddy-<mascota>-normal.png`

```
A single tiny cute <ANIMAL> companion character, chibi proportions, big round
head, small body, standing on the ground facing the viewer, calm friendly
neutral expression, eyes open. 3D Nendoroid figurine style, glossy toy plastic
look, soft frontal lighting, full body, centered, isolated object, transparent
background, no shadow, no text.
```

`<ANIMAL>` por mascota:
- **pollito** → `fluffy yellow baby chick with a tiny orange beak and orange feet`
- **gatito** → `round orange tabby kitten with a white belly and a striped tail`
- **perrito** → `small cream-colored puppy with floppy brown ears and a stubby tail`
- **dino** → `chubby mint green baby dinosaur with pale yellow belly and small
  rounded spikes on its back`

#### Después: los otros tres ánimos

Adjuntá el `-normal.png` que acabás de guardar y usá:

```
Using the attached image as reference, generate the EXACT same tiny <ANIMAL>
companion character: same species, same colors, same markings, same chibi
proportions, same size and position in frame, same camera framing, same soft
frontal lighting, same 3D Nendoroid figurine style.
ONLY change the pose and expression to <ÁNIMO>.
Do not change the colors, the design, the crop or the size.
Full body, centered, isolated object, transparent background, no shadow, no text.
```

`<ÁNIMO>`:
- **feliz** → `VERY HAPPY AND EXCITED: eyes curved into happy upward arcs, open
  smiling mouth, both little arms raised up, hopping slightly off the ground`
- **dormido** → `SLEEPING: curled up lying on the ground, eyes closed as gentle
  curved lines, calm peaceful little smile` *(sin agregar Zzz: el juego ya pone
  el suyo)*
- **triste** → `SAD AND WORRIED: eyebrows angled up in the middle, big glossy
  worried eyes, small downturned mouth, ears/head drooping, sitting down`

**Tamaño:** cualquiera cuadrado sirve (512×512 alcanza y pesa poco); el juego la
escala a ~110px. Lo importante es que **las cuatro sean del mismo tamaño y
encuadre**, si no la mascota "salta" al cambiar de ánimo.
