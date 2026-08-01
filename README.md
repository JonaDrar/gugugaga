# Gugugaga 🐧 — juego de cuidado (Tamagotchi/dress-up)

Juego web de cuidado de mascota tipo **Tamagotchi / Pou** protagonizado por el
personaje viral **Gugugaga** (una niña chibi con traje de pingüino). Hecho como
**PWA** para instalarse en un iPad (Safari → "Añadir a pantalla de inicio"),
funciona offline y guarda el progreso solo. Es un proyecto personal (para la
hija del dueño; no comercial).

> **Handoff:** este README documenta todo para continuar el proyecto con otro
> agente/persona. Empieza por *Arquitectura* y *Cómo agregar una pieza de arte*.

---

## Estado actual (qué funciona)

- **4 necesidades** que decaen en tiempo real: hambre 🍼, felicidad 🎈, energía ⚡, limpieza 🛁.
- **Cariño ❤️**: el único medidor que **solo sube**. Se gana cuidándola y
  **desbloquea piezas del clóset**. No es una quinta obligación a propósito.
- **Comidas con gustos** (14): favoritas 😍, normales 🙂 y las que escupe 😝, con
  **álbum de descubrimiento** y dos secretos que dependen del disfraz.
- **Se enferma** 🤒 si come mucha chatarra o pasa mucho tiempo sucia, y hay que
  **llevarla al doctor**, que explica *por qué* pasó. Es la parte educativa.
- **Acciones**: bandeja de comida, jugar, dormir (modo noche) y **baño con
  minijuego de burbujas**. Personalidad "mañosa": a veces se come todo.
- **4 minijuegos** de géneros distintos: burbujas 🫧 (reflejos, en el baño),
  Simón dice 🎵 (memoria de secuencia), memotest 🃏 (parejas) y globos 🎈
  (atención selectiva: reventar solo el color pedido).
- **Personaje por capas (dress-up)**: niña base + cuerpo + capucha + gorro, todo
  intercambiable y **combinable** (ver *Arquitectura*).
- **Escenarios** intercambiables (cielo, cuarto, playa, jardín) hechos solo con CSS.
- **Mascotas** 🐾: hasta **cuatro amigos a la vez** paseándose por la escena y
  reaccionando a todo, con 4 ánimos ilustrados cada uno. Sin barras propias — son
  compañía, no otra obligación. Se ganan con ⭐.
- **Modo foto** 📸: postal tipo polaroid con stickers, guardada en un álbum local.
- **Voces grabadas** 🎤: la nena graba su propia voz para cada emoción.
- **Sonidos** sintetizados (WebAudio, sin archivos) + botón de silencio.
- **Guardado** en localStorage (sigue "viviendo" offline; el decaimiento se calcula
  por tiempo transcurrido).
- **PWA** instalable + offline (service worker).

### Expresiones: "drop-in" (sin tocar código)
Las **expresiones** viven en la capa de la niña, así que **una sola** tanda de caras
sirve para TODOS los disfraces. Agregar una es solo dejar el PNG en `assets/art/`
con el nombre que espera `js/cosmetics.js` — sin tocar código. Si un archivo no
existe, el juego lo detecta al precargar y cae limpiamente a la cara neutral
(`girl-base.png`), sin imagen rota.

Las 3 caras ya están hechas ✅. Quedan "pistas" en CSS para lo que no tiene arte
propio: **Zzz** al dormir 😴 y **tinte sepia** cuando está sucio. Las lágrimas de
CSS ya no se usan (se apagan solas vía `#char.has-expr` porque `girl-sad.png`
las trae dibujadas).

| mood | imagen |
|---|---|
| happy / eating / love | `girl-happy.png` |
| sleep | `girl-sleep.png` |
| sad | `girl-sad.png` |
| idle / hungry / dirty | `girl-base.png` (neutral) |

---

## Tecnología y estructura

HTML/CSS/JS puro, **sin framework y sin paso de compilación** para la app. Un
único script de Python (`build.py`) genera una versión de **un solo archivo** para
publicarla como link (Artifact de claude.ai).

```
gugugaga/
├── index.html            # markup + registro del service worker
├── css/style.css         # todos los estilos
├── js/
│   ├── save.js           # localStorage load/save (estado JSON chico)
│   ├── store.js          # IndexedDB para binarios: voces y fotos
│   ├── audio.js          # motor de sonido WebAudio + mute
│   ├── voice.js          # grabar/reproducir la voz real (MediaRecorder)
│   ├── cosmetics.js      # CATÁLOGO de piezas + expresiones + anchors  ← se edita seguido
│   ├── foods.js          # CATÁLOGO de comidas, gustos y si son sanas ← se edita seguido
│   ├── care.js           # ⭐ estrellas: objetivos del día y cierre a medianoche
│   ├── buddies.js        # CATÁLOGO de mascotas + sus frases y reacciones ← se edita seguido
│   ├── notify.js         # avisos locales
│   ├── health.js         # enfermarse, doctor y mensajes educativos
│   ├── minigames.js      # burbujas / Simón dice / memotest / globos
│   ├── scene.js          # escenarios (CSS) + render de la foto (canvas)
│   ├── pet.js            # estado, decaimiento, cariño, acciones
│   └── game.js           # loop, render por capas, input, todas las pantallas
├── manifest.webmanifest  # PWA
├── sw.js                 # service worker (cache offline) ← subir CACHE al cambiar el shell
├── assets/
│   ├── art/              # PNGs del personaje y piezas (1254×1254, transparentes)
│   └── icons/            # favicon.svg + íconos PWA generados
├── build.py              # inlinea css+js y EMBEBE las imágenes → 1 archivo para el link
└── tools/
    ├── gen_art.py        # GENERA las piezas con la API de OpenAI (prompts + referencias)
    ├── fit_anchor.py     # calcula el anchor a partir de dónde querés que caiga la pieza
    ├── preview.py        # compositor que replica EXACTO el juego (para calibrar anchors)
    ├── make_icons.py     # genera los íconos PWA desde las mismas capas del juego
    └── clean_green.py    # quita fondo verde (sólo para arte hecho por chat, no por API)
```

---

## Arquitectura

### Necesidades (`js/pet.js`)
Estado: `{ day, createdAt, lastTick, sleeping, muted, stats:{hunger,happiness,energy,cleanliness}, cosmetics }`.
Cada stat 0–100 (100 = lleno). `GG.applyElapsed()` aplica el decaimiento según el
tiempo real transcurrido desde `lastTick` (así "vive" aunque cierres la app).
`GG.doAction()` aplica los efectos de cada botón y devuelve un evento para la UI
(mood transitorio, texto, fx). `GG.computeMood()` deriva la cara de reposo.

### Render por capas — el corazón del dress-up (`js/game.js` + `js/cosmetics.js`)
El personaje se arma apilando **PNGs transparentes** sobre una **niña base**:

```
girl-base (cara + expresiones)   ← ÚNICA capa con expresiones
  + body      (traje/torso)      ← intercambiable
  + head      (capucha/orejas)   ← intercambiable
  + accessory (lentes, collar…)  ← intercambiable
  + hat       (gorros)           ← intercambiable
```
Orden de pintado: `GG.LAYER_ORDER = ['body','head','accessory','hat']` (atrás→adelante),
todo sobre `#charImg` (la niña).

**Por qué así:** como la cara vive en la niña, **una sola** tanda de expresiones
funciona con **todas** las combinaciones de disfraz (no hay explosión combinatoria).
Y se pueden **mezclar** cabezas/cuerpos = personajes distintos.

**Posicionamiento (anchors):** cada pieza tiene `anchor {top,left,width}` en
**porcentaje del stage cuadrado** (mismo espacio 1254×1254 del arte). El contenedor
`#char` es **cuadrado** (`aspect-ratio:1/1`) a propósito: así los % mapean 1:1 al
arte en cualquier pantalla (esto arregló el bug del "gorro chueco"). En el DOM cada
capa es un `<img>` posicionado absoluto dentro de `#charAcc`.

**Anchors actuales** (en `js/cosmetics.js`):
| pieza | top | left | width |
|---|---|---|---|
| body (pingüino) | 33 | 12 | 76 |
| head (pingüino) | 0 | 22.2 | 56 |
| hat (fiesta) | -19 | 33 | 36 |

### Expresiones (`GG.EXPR_IMG` en `js/cosmetics.js`)
Mapa `mood → imagen de la niña`. `null` = cae a `base`. Estados: `idle, hungry,
happy, eating, love, sleep, sad, dirty`. Hoy solo `base` existe; el resto son `null`.
Pistas visuales (mientras no haya arte): `.char-tears` (sad), `.char-zzz` (sleep),
filtro sepia (dirty), definidas en `css/style.css`.

### Cariño y desbloqueos (`js/pet.js` + `js/cosmetics.js`)
`state.love` es un entero que **nunca baja**. Cada acción suma (`GG.LOVE_GAIN`);
descubrir una comida nueva suma extra. Cada pieza del clóset puede llevar
`love: N` = corazones necesarios. `GG.isUnlocked()` decide si se puede poner, y
**respeta lo que ya está puesto**, así que agregarle precio a una pieza nunca le
saca a la nena algo que ya usaba. `GG.newlyUnlocked(antes, después)` alimenta el
cartelito de "¡Desbloqueaste…!".

**Diseño:** es una barra de premio, no una quinta tarea. Cuatro barras que bajan
ya son suficientes obligaciones para una nena de 6 años.

### El arte entra SOLO (regla general del proyecto)

Vale para las tres cosas que necesitan PNG — **expresiones**, **ropa** y
**mascotas**. El catálogo declara más piezas de las que están dibujadas; el juego
prueba cada archivo al arrancar con un `<img>` de sonda y:

| falta el PNG | está el PNG |
|---|---|
| la pieza **no se ofrece** en el clóset | aparece sola, en su lugar del orden |
| el ánimo de la mascota cae a `normal`, y si falta, al emoji | se dibuja |
| la expresión cae a `girl-base.png` | se usa |
| no se anuncia como premio (`newlyUnlocked` la saltea) | se anuncia |

**Generar arte no requiere tocar código: sólo dejar el archivo con el nombre
exacto en `assets/art/`.** La lista completa de nombres pendientes está en
`tools/art-prompts.md` §0, con el prompt de cada uno.

Se eligió **esconder** las piezas sin arte en vez de mostrarlas grises: una fila
de casilleros que no se pueden tocar sólo frustra, y así la ropa nueva le aparece
a la nena como sorpresa. La pieza que tiene puesta nunca se esconde, para que
borrar un archivo por accidente no la deje a medio vestir.

Funciones: `GG.pieceHasArt` / `GG.availablePieces` / `GG.pieceSources`
(`cosmetics.js`), `GG.buddyArtSrc` / `GG.buddyArtSources` (`buddies.js`),
`GG.exprSrc` / `GG.exprSources` (`cosmetics.js`).

**Dos detalles que costaron plata en bytes y conviene no deshacer:**

1. **Las sondas usan `fetch(src, {method:'HEAD'})`, no un `<img>`.** Son ~33
   archivos posibles y GitHub Pages contesta cada 404 con una página de ~9 KB:
   con `<img>` eran **~266 KB tirados en cada apertura del juego**. Con HEAD el
   cuerpo viene vacío. Si `fetch` falla (sin conexión) no se marca nada como
   faltante — mejor reintentar después que esconderle la ropa por estar offline.
2. **El service worker sólo cachea respuestas `res.ok`.** Antes guardaba
   cualquier cosa, incluidos esos 404. Un 404 cacheado es una trampa: agregar el
   PNG después **no servía de nada** en un iPad ya instalado, porque el SW
   seguía sirviendo el 404 viejo y la pieza no aparecía nunca.

### Comidas (`js/foods.js`)
Cada comida tiene `taste`: `fav` 😍 / `ok` 🙂 / `yuck` 😝. La que no le gusta es
**graciosa, nunca triste**: casi no penaliza y siempre da una reacción cómica
(escupe + temblequeo). Si fuera un castigo, la nena deja de experimentar.

`favIfHead` es un **secreto**: la comida se vuelve favorita solo con esa capucha
puesta (pescado 🐟 con la de pingüino, zanahoria 🥕 con la de conejo). Es el
premio por combinar el clóset con la bandeja.

`state.foods.tried` guarda lo descubierto y alimenta el álbum.

### Salud y doctor (`js/health.js`) — la parte educativa

Dos hábitos tienen consecuencia, y el juego **siempre dice por qué**:

| causa | enfermedad | tratamiento |
|---|---|---|
| 5 comidas chatarra sin compensar | dolor de panza 🤢 | jarabe 💊 |
| 25 min real con limpieza < 25 | resfrío / microbios 🤧 | vacuna 💉 |

Tres reglas de diseño, porque la jugadora tiene 6 años:

1. **Avisar antes de castigar.** Siempre hay un "me duele un poquito la panza"
   antes de enfermarse, para que se lea como consecuencia evitable y no como
   mala suerte.
2. **El doctor es el bueno.** La visita es corta, siempre funciona, y la inyección
   se describe como rápida e indolora ("fue un segundito"). Un juego que use la
   inyección como castigo por portarse mal le enseñaría a **temerle a las
   inyecciones reales** — exactamente lo contrario de lo que queremos.
3. **Nada es permanente.** No se muere ni retrocede: estar enferma solo la pone
   triste y sin ganas de jugar hasta que la curan.

La tensión está puesta a propósito en `foods.js`: **sus favoritas son las
chatarra** (galletita, helado, chocolate, papas). Comer sano baja el contador de
chatarra y da ❤️ extra, así que el hábito bueno también tiene premio visible.

### Días
`GG.dayNumber()` cuenta **días de calendario**, no bloques de 24 h: el día cambia
a la medianoche, igual que para la nena. Antes se contaban milisegundos desde
`createdAt`, así que el día saltaba a la hora en que abrió el juego por primera vez.

### Minijuegos (`js/minigames.js`)
Cada uno recibe un elemento anfitrión y llama `done({score, total})`; devuelve una
función para cortarlo si cierra la pantalla a mitad de partida. Son **géneros
distintos a propósito**, no el mismo juego repintado. Todos tienen un botón
"Listo ✋" visible: a los 6 años, quedar atrapado en un juego que no podés
terminar es la forma más rápida de que suelte la tablet.

### Dos monedas distintas: ❤️ Cariño y ⭐ Estrellas

Son a propósito opuestas, y esa es toda la gracia:

| | ❤️ Cariño | ⭐ Estrellas |
|---|---|---|
| cómo se gana | cada acción | al cerrar el día |
| ritmo | inmediato | 1 vez por día |
| ¿se puede farmear? | sí, a propósito | **no** |
| desbloquea | ropa del clóset | lugares (escenarios) y **mascotas** |

El cariño existe para dar recompensa en los primeros 30 segundos. Las estrellas
(`js/care.js`) miden **constancia**: los objetivos son cosas que *no* pasaron
(ninguna barra en rojo, no se enfermó) más una rutina real (2 comidas sanas + 1
baño), que lleva tiempo y no se puede spamear. Se otorgan a la medianoche.

Los tres objetivos se ven todo el día en la **Tarjeta del día** ⭐, así ella sabe
qué le falta — funciona como un cuadro de tareas, que es justo el hábito buscado.

También hay `GG.PET_LOVE_COOLDOWN`: los mimos dan ❤️ como mucho cada 45 s. Sin
eso, dejar el dedo apoyado desbloqueaba todo el vestuario en un minuto.

### Mascotas 🐾 (`js/buddies.js`)

Un amigo que vive en la escena junto a Gugugaga: se pasea solo, comenta lo que
va pasando y se deja acariciar. Botón 🐾 en la barra lateral.

> El archivo se llama `buddies.js` y **no** `pets.js` porque `js/pet.js` ya es el
> motor de estado de Gugugaga misma.

**No tiene barras propias, y es la decisión de diseño central.** Darle hambre,
sueño y limpieza duplicaría la tarea diaria: una nena de seis años que ya cuida
cuatro barras no necesita ocho, y la segunda mascota se convertiría en culpa en
vez de compañía. Nunca se enferma, nunca reclama, no se puede perder.

**Se desbloquean con ⭐, no con ❤️**, y eso también es a propósito: un amigo nuevo
es exactamente el premio que corresponde a la constancia, no al toqueteo. Los
costos se **intercalan** con los de las escenas (2/5/9 ⭐) para que siempre haya
algo próximo por abrir:

| mascota | ⭐ |
|---|---|
| 🐤 Pollito | 0 — viene incluido, nunca está sola |
| 🐱 Gatito | 3 |
| 🐶 Perrito | 7 |
| 🦕 Dino | 12 |

**Reacciona a lo que pasa**, con frases propias por mascota (`lines` en el
catálogo): comer, jugar, bañarse, dormir, que se enferme, que esté sucia, y que
la toquen. Las reacciones de *estado* (enferma / sucia) se disparan **sólo en el
flanco** — si no, el amigo hablaría una vez por segundo mientras dure. Mientras
Gugugaga duerme, la mascota también duerme (`GG.buddyResting`): la escena de
noche queda quieta y se entiende que es hora de parar.

Tocar la mascota suma **+1 de felicidad y nada de ❤️**: es compañía, no un atajo
para llenar barras. El `stopPropagation` evita que ese toque cuente además como
caricia a Gugugaga.

También **sale en las fotos**, apoyada sobre la misma línea de piso que ella.

**Arte por ánimo — drop-in por nombre de archivo.** Hoy cada mascota es un emoji
y funciona sin generar nada. Cuando exista el PNG entra solo:

```
assets/art/buddy-<mascota>-<ánimo>.png      ej. buddy-gatito-feliz.png
```

Son **4 ánimos**, y ninguno es obligatorio:

| ánimo | cuándo se ve |
|---|---|
| `normal` | por defecto, paseándose |
| `feliz` | comer, jugar, bañarse, que la acaricien |
| `dormido` | mientras Gugugaga duerme |
| `triste` | mientras ella está enferma o sucia (**estado**, no un flash) |

Respaldo: `<ánimo>` → `normal` → emoji. Con **un solo archivo**
(`buddy-<id>-normal.png`) la mascota ya deja de ser emoji en todo el juego, y
cada ánimo que se agregue después se suma sin romper nada. Prompts listos en
`tools/art-prompts.md` §2.6.

Los ánimos transitorios duran 2,2 s; los de estado (enferma/sucia) se mantienen
mientras dure la causa, que es justo la señal que queremos que ella lea.

**Agregar una mascota:** una entrada nueva en `GG.BUDDIES` con `id`, `label`,
`emoji`, `stars` y `lines`. No hay que tocar nada más.

**Capas:** la mascota va **detrás** de Gugugaga (`z-index` 1 contra 2 de `#char`).
Se pasea cruzando la escena, y por delante le taparía la cara justo cuando la
nena la está mirando; por detrás el mismo paseo se lee natural. Los rangos de
`pickX()` además evitan que se *detenga* tapada.

### Bloqueos de cuidado
- **No puede dormir sucia** (limpieza < `GG.DIRTY_SLEEP`): primero el baño.
- **No puede jugar cansada** (energía < `GG.TIRED_LIMIT`): primero dormir.
- **No puede jugar enferma**: primero el doctor.

Todas las reglas viven en `GG.doAction`. El menú de minijuegos pregunta con
`{dryRun:true}` en vez de repetir las condiciones, así la pantalla y la acción
nunca pueden estar en desacuerdo.

### Suciedad visible (solo CSS, sin arte)
Con limpieza < 35 se activa `#char.is-dirty`: 6 manchas marrones con radios
irregulares, 3 moscas con alitas aleteando en órbitas distintas, y 2 rayitas de
olor subiendo. Los porcentajes son del cuadro cuadrado del personaje, así que
caen sobre su cuerpo con cualquier disfraz.

### Notificaciones (`js/notify.js`)
**Lo que sí puede:** con la app abierta o recién minimizada, avisa cuando una
necesidad llega a rojo (una por vez, con 25 min de espera entre avisos iguales).

**Lo que no, y por qué:** la web **no tiene forma confiable de programar una
notificación futura con la app cerrada** (la API de Notification Triggers nunca
se lanzó). Llegar a un iPad bloqueado requiere la Push API, y Push necesita un
**servidor** con claves VAPID. No hay atajo sin servidor.

En iOS además: solo funciona con la PWA instalada en la pantalla de inicio (iOS
16.4+), el permiso se pide desde un toque, y **no funciona dentro del iframe del
Artifact**.

### Escenarios y foto (`js/scene.js`)
Los escenarios son 4 colores + emojis decorativos, aplicados como **custom
properties en `<html>`** (no en `<body>`: si no, el modo noche no podría pisarlos).
`GG.Photo.draw()` repinta escenario + capas del personaje en un `<canvas>`
leyendo los `<img>` vivos, así la foto siempre coincide con la pantalla.

### Voces (`js/voice.js` + `js/store.js`)
`getUserMedia` → `MediaRecorder` → `Blob` → **IndexedDB**. Sin servidor ni cuenta.
Necesita **https** y, dentro de un iframe, un `allow="microphone"` del padre — por
eso **puede no funcionar en el link de Artifact**; la UI detecta el caso y muestra
un aviso en vez de romperse. Los clips viven solo en ese dispositivo: hay botón de
descarga para respaldarlos. Si `GG.Voice.play(slot)` devuelve `false`, el juego cae
al sonido sintetizado.

### Sonido (`js/audio.js`)
WebAudio sintetizado (sin archivos). `GG.Audio.play('feed'|'play'|'clean'|'pet'|'sleep'|'wake'|'cry')`.
Mute persistido en `state.muted`. Se puede reemplazar por grabaciones reales en el futuro.

### Guardado / PWA
`js/save.js` (localStorage, clave `gugugaga.save.v1`). `pet.js` migra saves viejos
(agrega campos nuevos con defaults). `sw.js` cachea el app-shell para offline.

---

## Flujo de arte (IMPORTANTE)

**Estilo:** figura 3D tipo Nendoroid, brillante. Todas las piezas: **PNG 1254×1254,
fondo transparente** (o verde `#00FF00` que limpiamos), sin sombra.

**Consistencia (la clave):** para que las capas/expresiones calcen, hay que
mantener **misma pose, escala, encuadre y luz**. Método probado:
- **Expresiones**: generar usando `girl-base.png` como **imagen de referencia**
  ("same girl, same pose/framing/size, ONLY change the face to…").
- **Piezas sueltas** (gorros, cabezas, cuerpos, accesorios): generar como **objeto
  aislado** ("a single … , isolated object, transparent/green background, no shadow,
  3D figurine style"). Luego se posicionan con `anchor` (ver abajo).

**Limpiar verde:** si la pieza salió con fondo verde, córrelo:
```
python3 tools/clean_green.py assets/art/mi-pieza.png
```

---

## Cómo agregar una pieza de arte nueva (receta)

Ej.: un collar (accesorio) o una cabeza de conejo.

1. **Generar** el PNG (1254², estilo 3D, objeto aislado, fondo transparente/verde).
2. **Limpiar** el verde si hace falta: `python3 tools/clean_green.py assets/art/collar.png`
3. **Guardar** en `assets/art/`.
4. **Calibrar la posición** sin browser: edita el `CATALOG`/`LOOK` en
   `tools/preview.py` con un anchor tentativo, corre `python3 tools/preview.py`,
   abre `assets/art/_preview.png`, ajusta `{top,left,width}` e itera hasta que calce.
   *(Consejo: para centrar en la cara, calcula el centro del hueco de la pieza y
   despeja `left/top` como en las iteraciones del historial.)*
5. **Registrar** la pieza en `js/cosmetics.js` dentro de `GG.COSMETICS[slot]`:
   ```js
   { id: "collar-1", label: "Collar", preview: "📿",
     img: "assets/art/collar.png", anchor: { top: 40, left: 34, width: 32 } }
   ```
   (para expresiones, en cambio, apunta `GG.EXPR_IMG.happy = "assets/art/girl-happy.png"`.)
6. **Compilar y publicar** (ver abajo). Mantén el anchor de `tools/preview.py` y
   `js/cosmetics.js` sincronizados.

El clóster (botón 🎩) muestra automáticamente las piezas del `slot`; si un slot solo
tiene "none", muestra un aviso de "próximamente".

---

## Compilar, probar y publicar

### 🌐 Sitio en vivo — https://jonadrar.github.io/gugugaga/

Ese es el juego **de verdad**: PWA completa, servida por **GitHub Pages** desde
la rama `main` del repo `JonaDrar/gugugaga` (carpeta raíz). Deployar = `git push`:

```
git push          # Pages reconstruye solo, ~1 min
```

Es https propio y sin iframe, así que **acá sí funcionan el micrófono (voces) y
las notificaciones**, cosa que el link de Artifact no permite.

**Instalar en el iPad:** abrir https://jonadrar.github.io/gugugaga/ en **Safari**
→ Compartir → "Añadir a pantalla de inicio". Se abre a pantalla completa
(`display: standalone`) y funciona offline gracias al service worker.
El ícono de la pantalla de inicio sale de `assets/icons/` (ver abajo).

> Si cambiás archivos del *shell* (html/css/js), **subí el número de `CACHE` en
> `sw.js`** o los iPads ya instalados seguirán con la versión vieja en caché.

### Íconos PWA

```
python3 tools/make_icons.py
```
Genera `icon-192/512/512-maskable/180.png` en `assets/icons/` componiendo las
mismas capas que usa el juego (vía `tools/preview.py`), recortadas a la cara —
un cuerpo entero a 192px no se lee en una pantalla de inicio. Si cambia el look
por defecto, volvé a correrlo.

### Link de Artifact (preview rápido, opcional)

**Compilar el archivo único** (inlinea css+js y embebe las imágenes, reducidas a
720px solo para el link; el proyecto conserva la resolución full):
```
python3 build.py
# → escribe el .html de preview en el scratchpad de la sesión (ver la ruta que imprime)
```

El asistente publica ese archivo con la tool `Artifact` (mismo `file_path` →
mismo URL): `https://claude.ai/code/artifact/40b2ecc8-d4ac-4b64-a2c9-74fecfb92786`
Sirve para mirar rápido, **no** para jugar en serio (sin micrófono ni notificaciones).

**Probar local en el navegador:**
```
python3 -m http.server 4173 --directory .
# abre http://localhost:4173/index.html
```

**Chequeo de sintaxis JS antes de publicar:**
```
for f in js/*.js; do node --check "$f"; done
```

---

## Roadmap / TODO

- [x] **Caras de la niña**: `girl-happy.png`, `girl-sleep.png`, `girl-sad.png` ✅ (2026-07-28).

**Contenido de dress-up** — ✅ **COMPLETO** (2026-08-01). No falta ninguna pieza:
6 cabezas, 8 cuerpos, 4 gorros y 3 collares, todas con su PNG. Se generaron con
`tools/gen_art.py` (ver *Generar arte*).

**Ideas futuras pedidas por el dueño:**
- [x] **Collares** 📿 ✅ (2026-07-31).
- [x] **Mascotas** 🐾 ✅ (2026-07-31) — `js/buddies.js`, ver *Mascotas*.
- [x] Ilustraciones de las mascotas ✅ (2026-08-01) — las 16 (4 ánimos × 4).
- [x] **Traje de diva vocaloid** ✅ (2026-08-01) — peluca + outfit, mezclables
      con el resto. Se puede por la Piapro Character License de Crypton, que
      autoriza obras derivadas sin fines comerciales hechas por particulares.
- [ ] Fondos de escenario de verdad (hoy son gradientes CSS). Prompt en
      `tools/art-prompts.md` §2.5; costo estimado ~USD 0.05 cada uno.
- [x] Grabaciones reales de voz ✅ (2026-07-28) — ver *Voces*.
- [x] **Hosting estático propio** ✅ (2026-07-31) — GitHub Pages en
      https://jonadrar.github.io/gugugaga/ ; habilita micrófono y notificaciones.
- [ ] Ponerle nombre ella misma (`state.name` ya existe, falta la UI para editarlo).
- [ ] Color de ojos (difícil en 3D porque va "horneado"; requeriría variantes de imagen).
- [x] Íconos PWA definitivos ✅ (2026-07-31) — `tools/make_icons.py`.

---

## Notas / decisiones

- Las imágenes horneadas viejas (`gugugaga-base/happy/sleep/sad/dirty.png`) quedaron
  **sin uso** al pasar al sistema por capas (se pueden borrar; se dejaron por si acaso).
- CSS muerto del pingüino-SVG anterior sigue en `style.css` pero es inofensivo.
- Los anchors se calibraron replicando el render del juego en `tools/preview.py`
  (no adivinando). Úsalo siempre para piezas nuevas.
