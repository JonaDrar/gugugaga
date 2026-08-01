// Mascotas 🐾 — el amigo que vive en la escena junto a Gugugaga.
//
// (El archivo se llama buddies.js y no pets.js porque `js/pet.js` ya es el motor
//  de estado de Gugugaga misma. Acá "buddy" = mascota/compañero.)
//
// DECISIÓN DE DISEÑO: la mascota NO tiene barras propias.
// Darle hambre/sueño/limpieza duplicaría la tarea diaria: una nena de seis años
// que ya cuida cuatro barras no necesita ocho, y la segunda mascota se
// convertiría en culpa en vez de compañía. La mascota es puro afecto: se pasea,
// reacciona a lo que pasa y se deja acariciar. Nunca se enferma, nunca reclama.
//
// SE DESBLOQUEAN CON ⭐ ESTRELLAS (no con ❤️ cariño) a propósito:
//   · ❤️ es farmeable con toques → paga la ropa (gratificación inmediata)
//   · ⭐ sólo llega cuidándola bien un día entero → paga los lugares y los amigos
// Un amigo nuevo es exactamente el premio que corresponde a la constancia. Los
// costos se intercalan con los de las escenas (2/5/9 ⭐) para que SIEMPRE haya
// algo próximo por abrir: 0 / 3 / 7 / 12.
//
// ARTE: cada mascota funciona hoy con un emoji y NO hace falta generar nada.
// Cuando exista el PNG entra solo, por NOMBRE DE ARCHIVO — no hay que tocar
// código. Convención:
//
//     assets/art/buddy-<id>-<ánimo>.png     ej. buddy-gatito-feliz.png
//
// Son sólo CUATRO ánimos por mascota, y ninguno es obligatorio:
//
//     normal   parada, tranquila          ← el único que conviene hacer primero
//     feliz    comer / jugar / bañarse / que la acaricien
//     dormido  mientras Gugugaga duerme
//     triste   cuando ella se enferma o está sucia
//
// La cadena de respaldo es: <ánimo> → normal → emoji. O sea que con UN solo
// archivo (`buddy-<id>-normal.png`) la mascota ya deja de ser emoji, y cada
// ánimo que agregues después se suma sin romper nada.
(function () {
  const GG = (window.GG = window.GG || {});

  GG.BUDDIES = [
    {
      id: "pollito",
      label: "Pollito",
      emoji: "🐤",
      stars: 0, // el primer amigo es gratis: nunca está sola
      call: "¡pío pío!",
      lines: {
        feed: ["¡pío! ¿me convidás? 🐤", "¡pío pío! qué rico"],
        play: ["¡pío! ¡yo también juego!", "¡píiiii! 🎈"],
        clean: ["¡pío! ¡burbujas! 🫧"],
        sleep: ["pío... buenas noches 🌙"],
        sick: ["¿pío? ¿estás malita?"],
        dirty: ["¿pío? qué olorcito raro..."],
        tap: ["¡pío!", "¡pío pío! ♡", "jiji ¡pío!"],
        idle: ["pío~", "¡pío pío!", "pío... pío..."],
      },
    },
    {
      id: "gatito",
      label: "Gatito",
      emoji: "🐱",
      stars: 3,
      call: "¡miau!",
      lines: {
        feed: ["¡miau! ¿y lo mío? 🐟", "miauuu ¡huele rico!"],
        play: ["¡miau! ¡a jugar! 🧶", "¡miau miau!"],
        clean: ["miau... el agua no, gracias 😾"],
        sleep: ["mrrr... zzz 🌙"],
        sick: ["miau... te cuido acá al lado"],
        dirty: ["¡miau! hay que bañarse 🛁"],
        tap: ["mrrrr ♡", "¡miau!", "prrr prrr ♡"],
        idle: ["miau~", "prrr...", "¡miau!"],
      },
    },
    {
      id: "perrito",
      label: "Perrito",
      emoji: "🐶",
      stars: 7,
      call: "¡guau!",
      lines: {
        feed: ["¡GUAU! ¡yo también quiero! 🦴", "¡guau guau! ñam"],
        play: ["¡GUAU GUAU! ¡juguemos! 🎾", "¡guau! ¡otra vez!"],
        clean: ["¡guau! ¡me encanta el agua! 💦"],
        sleep: ["guau... zzz, cuido la puerta 🌙"],
        sick: ["guau... 🐶 (te lame la mano)"],
        dirty: ["¡guau! ¡al baño los dos! 🛁"],
        tap: ["¡guau! ♡", "¡guau guau!", "(mueve la cola) 🐶"],
        idle: ["guau~", "¡guau!", "(olfatea) 🐶"],
      },
    },
    {
      id: "dino",
      label: "Dino",
      emoji: "🦕",
      stars: 12,
      call: "¡ROAR!",
      lines: {
        feed: ["¡ROAR! ¿hay hojitas? 🌿", "¡ñom ñom ROAR!"],
        play: ["¡ROOOAR! ¡jugamos! 🦕", "¡roar roar!"],
        clean: ["¡roar! (chapotea) 💦"],
        sleep: ["roar... zzz 🌙"],
        sick: ["¿roar? te acompaño 🦕"],
        dirty: ["roar... 🦕 (se tapa la nariz)"],
        tap: ["¡ROAR! ♡", "¡roar!", "(te da un cabezazo suave) 🦕"],
        idle: ["roar~", "¡roar!", "(mira las nubes) 🦕"],
      },
    },
  ];

  GG.findBuddy = (id) => GG.BUDDIES.find((b) => b.id === id) || null;

  // ---------- arte por ánimo (drop-in) ----------
  GG.BUDDY_MOODS = ["normal", "feliz", "dormido", "triste"];

  // Qué ánimo DIBUJADO corresponde a cada reacción. Varias reacciones caen en el
  // mismo ánimo a propósito: son cuatro ilustraciones por mascota, no ocho.
  GG.BUDDY_MOOD_OF = {
    feed: "feliz", play: "feliz", clean: "feliz", tap: "feliz",
    sleep: "dormido",
    sick: "triste", dirty: "triste",
    idle: "normal",
  };

  GG.buddyArtPath = (b, mood) => "assets/art/buddy-" + b.id + "-" + mood + ".png";

  const missingBuddyArt = new Set();
  GG.markBuddyArtMissing = function (src) {
    if (src) missingBuddyArt.add(src);
  };

  // Imagen para este ánimo, con respaldo a `normal`. null = todavía no hay arte
  // para esta mascota y se dibuja el emoji.
  GG.buddyArtSrc = function (b, mood) {
    if (!b) return null;
    const has = (m) => {
      const src = GG.buddyArtPath(b, m);
      return missingBuddyArt.has(src) ? null : src;
    };
    return has(mood || "normal") || has("normal");
  };

  // Todas las rutas posibles, para probarlas al arrancar y saber cuáles faltan.
  GG.buddyArtSources = function () {
    const out = [];
    GG.BUDDIES.forEach((b) => GG.BUDDY_MOODS.forEach((m) => out.push(GG.buddyArtPath(b, m))));
    return out;
  };

  GG.buddyUnlocked = (state, b) => GG.starsUnlocked(state, b.stars);

  // Las mascotas NO son excluyentes: se eligen las que se quieran y andan todas
  // dando vueltas juntas. Elegir "cuál" en vez de "cuáles" convertía cada amigo
  // nuevo en el reemplazo del anterior, que es justo lo contrario a coleccionar.
  GG.activeBuddies = function (state) {
    const ids = Array.isArray(state.buddies) ? state.buddies : [];
    return ids.map(GG.findBuddy).filter(Boolean).filter((b) => GG.buddyUnlocked(state, b));
  };

  GG.buddyActive = (state, id) =>
    Array.isArray(state.buddies) && state.buddies.indexOf(id) >= 0;

  // Prende/apaga una mascota. Devuelve true si quedó puesta.
  GG.toggleBuddy = function (state, id) {
    if (!Array.isArray(state.buddies)) state.buddies = [];
    const i = state.buddies.indexOf(id);
    if (i >= 0) {
      state.buddies.splice(i, 1);
      return false;
    }
    // Se mantiene el orden del catálogo para que siempre se paseen igual.
    state.buddies.push(id);
    state.buddies.sort((a, b) => GG.BUDDIES.findIndex((x) => x.id === a) -
                                 GG.BUDDIES.findIndex((x) => x.id === b));
    return true;
  };

  // Amigos que se acaban de abrir al pasar de `before` a `after` estrellas.
  // Se usa igual que newlyUnlocked() de la ropa, pero con ⭐ en vez de ❤️.
  GG.newlyUnlockedBuddies = function (before, after) {
    return GG.BUDDIES.filter((b) => b.stars > before && b.stars <= after);
  };

  // ---------- reacciones ----------
  // `kind` es lo que acaba de pasar: feed | play | clean | sleep | sick | dirty |
  // tap | idle. Devuelve qué hace el amigo, o null si no hay nada que decir.
  //
  // `anim` es una clase CSS en #buddy; `fx` son emojis que flotan sobre él.
  const REACTION = {
    feed: { anim: "hop", fx: ["😋"] },
    play: { anim: "hop", fx: ["🎉"] },
    clean: { anim: "wiggle", fx: ["🫧"] },
    sleep: { anim: "nap", fx: null },
    sick: { anim: "worry", fx: ["💧"] },
    dirty: { anim: "worry", fx: ["💨"] },
    tap: { anim: "hop", fx: ["💕"] },
    idle: { anim: "wiggle", fx: null },
  };

  GG.buddyReact = function (state, kind, buddy) {
    const b = buddy || GG.activeBuddies(state)[0];
    if (!b) return null;
    const r = REACTION[kind] || REACTION.idle;
    const lines = b.lines[kind] || b.lines.idle;
    return {
      buddy: b,
      anim: r.anim,
      fx: r.fx,
      mood: GG.BUDDY_MOOD_OF[kind] || "normal",
      speech: GG.pick(lines),
    };
  };

  // Mientras Gugugaga duerme el amigo también duerme: no se pasea ni habla, así
  // la escena de noche queda quieta y la nena entiende que es hora de parar.
  GG.buddyResting = (state) => !!state.sleeping;
})();
