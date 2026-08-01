// Layered "paper-doll" catalog for the dress-up system.
//
// The character is built from stacked layers over a base GIRL:
//   girl-base (face + expressions)  <- the only layer with expressions
//   + body  (costume torso)         <- swappable
//   + head  (hood / ears)           <- swappable
//   + accessory (glasses, etc.)     <- swappable
//   + hat                           <- swappable
// Because the face lives on the girl layer, ONE set of expressions works
// under every costume combination.
//
// Each layer piece: `img` + `anchor` = {top,left,width} in % of the square
// character stage (tuned by compositing previews). Swap `img` for real art.
(function () {
  const GG = (window.GG = window.GG || {});

  // Expression -> girl-base image. null = always use the neutral base.
  // Files that don't exist yet fall back to `base` automatically (see exprSrc),
  // so you can just drop the PNG in assets/art/ and it starts being used.
  GG.EXPR_IMG = {
    base: "assets/art/girl-base.png",
    idle: null,
    hungry: null,
    happy: "assets/art/girl-happy.png",
    eating: "assets/art/girl-happy.png",
    love: "assets/art/girl-happy.png",
    sleep: "assets/art/girl-sleep.png",
    sad: "assets/art/girl-sad.png",
    dirty: null,
  };

  // Expression images that failed to load (art not drawn yet) -> fall back.
  const missingExpr = new Set();
  GG.markExprMissing = function (src) {
    if (src) missingExpr.add(src);
  };
  // True when this mood has its own artwork available right now.
  GG.exprHasArt = function (mood) {
    const src = GG.EXPR_IMG[mood];
    return !!src && !missingExpr.has(src);
  };
  // Image to show for a mood (its own art, or the neutral base).
  GG.exprSrc = function (mood) {
    return GG.exprHasArt(mood) ? GG.EXPR_IMG[mood] : GG.EXPR_IMG.base;
  };
  // Unique expression images worth preloading (skips the base, already in DOM).
  GG.exprSources = function () {
    return [...new Set(Object.entries(GG.EXPR_IMG)
      .filter(([k, v]) => k !== "base" && v)
      .map(([, v]) => v))];
  };

  // Paint order over the girl base (back -> front).
  GG.LAYER_ORDER = ["body", "head", "accessory", "hat"];

  // `love` = hearts needed to unlock the piece (absent/0 = available from day 1).
  //
  // Las piezas cuyo PNG TODAVÍA NO EXISTE se declaran igual acá: el juego las
  // esconde del clóset hasta que el archivo aparece en assets/art/, y entonces
  // se muestran solas (ver pieceHasArt más abajo). Así generar el arte no
  // requiere tocar código, y la nena nunca ve un casillero roto ni una lista de
  // "próximamente" que no puede tocar — la ropa nueva aparece como sorpresa.
  //
  // Los anchors nuevos son los MISMOS que su hermano ya calibrado, porque el
  // prompt de arte exige encuadre y escala idénticos al de referencia. Si una
  // pieza igual queda torcida, se recalibra con `python3 tools/preview.py`.
  const A_HEAD = { top: 0, left: 22.2, width: 56 };
  const A_BODY = { top: 33, left: 12, width: 76 };
  const A_HAT = { top: -19, left: 33, width: 36 };
  // Los gorros NO pueden compartir un solo anchor: a diferencia de cabezas y
  // cuerpos, que el prompt obliga a copiar el encuadre de su referencia, cada
  // gorro tiene su propia forma. El de fiesta ocupa el 94% de alto de su cuadro
  // y una corona apenas el 46%, así que con el anchor del cono la corona salía
  // chiquita y flotando arriba de la cabeza. Este se calculó para que el borde
  // inferior caiga donde apoya el de fiesta (15.9% del stage).
  const A_CORONA = { top: -8, left: 31.8, width: 39 };
  // Calibrado con tools/preview.py contra necklace-corazon.png: la cadena queda
  // justo bajo el borde de la capucha y el dije sobre la panza blanca.
  const A_NECK = { top: 40, left: 34, width: 32 };

  GG.COSMETICS = {
    head: [
      { id: "none", label: "Sin gorro", preview: "🚫" },
      { id: "penguin", label: "Pingüino", preview: "🐧", img: "assets/art/head-penguin.png", anchor: A_HEAD },
      { id: "gato", label: "Gatito", preview: "🐱", love: 20, img: "assets/art/head-gato.png", anchor: A_HEAD },
      { id: "bunny", label: "Conejo", preview: "🐰", love: 35, img: "assets/art/head-bunny.png", anchor: { top: 0, left: 21.8, width: 56 } },
      { id: "dino", label: "Dino", preview: "🦕", love: 50, img: "assets/art/head-dino.png", anchor: A_HEAD },
      { id: "oso", label: "Osito", preview: "🐻", love: 65, img: "assets/art/head-oso.png", anchor: A_HEAD },
    ],
    // Los cuerpos de animal están costeados JUSTO por encima de su capucha
    // (gato 20→30, conejo 35→45, dino 50→55) para que el disfraz se complete
    // poco después de conseguir la cabeza: tener media cabeza de gato sobre un
    // cuerpo de pingüino durante semanas no es un premio, es un pendiente.
    body: [
      { id: "none", label: "Sin traje", preview: "🚫" },
      { id: "penguin", label: "Pingüino", preview: "🐧", img: "assets/art/body-penguin.png", anchor: A_BODY },
      { id: "vestido", label: "Vestido", preview: "👗", love: 25, img: "assets/art/body-vestido.png", anchor: A_BODY },
      { id: "gato", label: "Gatito", preview: "🐱", love: 30, img: "assets/art/body-gato.png", anchor: A_BODY },
      { id: "pijama", label: "Pijama", preview: "🌙", love: 40, img: "assets/art/body-pijama.png", anchor: A_BODY },
      // ojo: la capucha de conejo quedó con el id inglés `bunny` de antes; el
      // cuerpo usa `conejo`. No se emparejan por id, así que no molesta.
      { id: "conejo", label: "Conejo", preview: "🐰", love: 45, img: "assets/art/body-conejo.png", anchor: A_BODY },
      { id: "dino", label: "Dino", preview: "🦕", love: 55, img: "assets/art/body-dino.png", anchor: A_BODY },
      { id: "overol", label: "Overol", preview: "👖", love: 70, img: "assets/art/body-overol.png", anchor: A_BODY },
    ],
    hat: [
      { id: "none", label: "Ninguno", preview: "🚫" },
      { id: "party", label: "Fiesta", preview: "🎉", love: 15, img: "assets/art/hat-party.png", anchor: A_HAT },
      { id: "gorro", label: "Gorrito", preview: "🧶", love: 30, img: "assets/art/hat-gorro.png", anchor: A_HAT },
      { id: "corona", label: "Corona", preview: "👑", love: 45, img: "assets/art/hat-corona.png", anchor: A_CORONA },
      { id: "flor", label: "Florcita", preview: "🌸", love: 60, img: "assets/art/hat-flor.png", anchor: A_HAT },
    ],
    accessory: [
      { id: "none", label: "Ninguno", preview: "🚫" },
      { id: "corazon", label: "Corazón", preview: "❤️", love: 20, img: "assets/art/necklace-corazon.png", anchor: A_NECK },
      { id: "perla", label: "Perlas", preview: "🦪", love: 40, img: "assets/art/necklace-perla.png", anchor: A_NECK },
      { id: "estrella", label: "Estrella", preview: "⭐", love: 55, img: "assets/art/necklace-estrella.png", anchor: A_NECK },
    ],
  };

  // ---------- disponibilidad del arte ----------
  // Igual que con las expresiones: si el PNG no está, la pieza no existe para el
  // juego. Se descubre con un <img> de prueba al arrancar (ver game.js).
  const missingPiece = new Set();
  GG.markPieceMissing = function (src) {
    if (src) missingPiece.add(src);
  };
  GG.pieceHasArt = function (item) {
    if (!item) return false;
    if (!item.img) return true; // "ninguno" no necesita archivo
    return !missingPiece.has(item.img);
  };
  // Todos los PNG de piezas, para precargarlos y detectar los que faltan.
  GG.pieceSources = function () {
    const out = [];
    Object.keys(GG.COSMETICS).forEach((slot) => {
      GG.COSMETICS[slot].forEach((it) => { if (it.img) out.push(it.img); });
    });
    return [...new Set(out)];
  };
  // Piezas que se pueden mostrar hoy. La que está puesta nunca se esconde, para
  // que borrar un archivo por accidente no la deje a medio vestir.
  GG.availablePieces = function (state, slot) {
    const worn = state && state.cosmetics ? state.cosmetics[slot] : null;
    return (GG.COSMETICS[slot] || []).filter((it) => it.id === worn || GG.pieceHasArt(it));
  };

  GG.DEFAULT_COSMETICS = { head: "penguin", body: "penguin", hat: "none", accessory: "none" };

  GG.findCosmetic = function (slot, id) {
    const list = GG.COSMETICS[slot] || [];
    return list.find((x) => x.id === id) || list[0];
  };

  // True while a slot has nothing real to equip yet (sólo el "ninguno"), ya sea
  // porque no hay piezas o porque a todas les falta el PNG.
  GG.slotComingSoon = function (state, slot) {
    return GG.availablePieces(state, slot).every((x) => !x.img);
  };

  // A piece is wearable once enough hearts are earned. Anything already being
  // worn stays wearable, so introducing a cost never strips an existing look.
  GG.isUnlocked = function (state, slot, item) {
    if (!item || !item.love) return true;
    if (state.cosmetics && state.cosmetics[slot] === item.id) return true;
    return (state.love || 0) >= item.love;
  };

  // Pieces that just became available at this heart count (for the toast).
  // Se saltan las que todavía no tienen PNG: anunciar un premio que después no
  // aparece en el clóset es peor que no anunciarlo.
  GG.newlyUnlocked = function (before, after) {
    const out = [];
    Object.keys(GG.COSMETICS).forEach((slot) => {
      GG.COSMETICS[slot].forEach((it) => {
        if (it.love && before < it.love && after >= it.love && GG.pieceHasArt(it)) {
          out.push({ slot, item: it });
        }
      });
    });
    return out;
  };
})();
