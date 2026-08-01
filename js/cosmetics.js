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
  GG.COSMETICS = {
    head: [
      { id: "none", label: "Sin gorro", preview: "🚫" },
      { id: "penguin", label: "Pingüino", preview: "🐧", img: "assets/art/head-penguin.png", anchor: { top: 0, left: 22.2, width: 56 } },
      { id: "bunny", label: "Conejo", preview: "🐰", love: 35, img: "assets/art/head-bunny.png", anchor: { top: 0, left: 21.8, width: 56 } },
    ],
    body: [
      { id: "none", label: "Sin traje", preview: "🚫" },
      { id: "penguin", label: "Pingüino", preview: "🐧", img: "assets/art/body-penguin.png", anchor: { top: 33, left: 12, width: 76 } },
    ],
    hat: [
      { id: "none", label: "Ninguno", preview: "🚫" },
      { id: "party", label: "Fiesta", preview: "🎉", love: 15, img: "assets/art/hat-party.png", anchor: { top: -19, left: 33, width: 36 } },
    ],
    accessory: [{ id: "none", label: "Ninguno", preview: "🚫" }],
  };

  GG.DEFAULT_COSMETICS = { head: "penguin", body: "penguin", hat: "none", accessory: "none" };

  GG.findCosmetic = function (slot, id) {
    const list = GG.COSMETICS[slot] || [];
    return list.find((x) => x.id === id) || list[0];
  };

  // True while a slot has nothing real to equip yet (only the empty default).
  GG.slotComingSoon = function (slot) {
    const list = GG.COSMETICS[slot] || [];
    return list.every((x) => !x.img);
  };

  // A piece is wearable once enough hearts are earned. Anything already being
  // worn stays wearable, so introducing a cost never strips an existing look.
  GG.isUnlocked = function (state, slot, item) {
    if (!item || !item.love) return true;
    if (state.cosmetics && state.cosmetics[slot] === item.id) return true;
    return (state.love || 0) >= item.love;
  };

  // Pieces that just became available at this heart count (for the toast).
  GG.newlyUnlocked = function (before, after) {
    const out = [];
    Object.keys(GG.COSMETICS).forEach((slot) => {
      GG.COSMETICS[slot].forEach((it) => {
        if (it.love && before < it.love && after >= it.love) out.push({ slot, item: it });
      });
    });
    return out;
  };
})();
