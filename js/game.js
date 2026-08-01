// Main game controller: loop, rendering (image-based 3D character) and input.
(function () {
  const GG = window.GG;

  const $ = (id) => document.getElementById(id);
  const el = {
    char: $("char"),
    charImg: $("charImg"),
    charAcc: $("charAcc"),
    charBack: $("charBack"),
    day: $("petDay"),
    name: $("petName"),
    mood: $("petMood"),
    speech: $("speech"),
    speechText: $("speechText"),
    fx: $("fx"),
    actions: $("actions"),
    sleepBtn: document.querySelector('.action[data-action="sleep"]'),
    sceneDeco: $("sceneDeco"),
    loveFill: $("loveFill"),
    loveGoal: $("loveGoal"),
    toast: $("toast"),
    closet: $("closet"),
    closetBtn: $("closetBtn"),
    closetClose: $("closetClose"),
    closetItems: $("closetItems"),
    closetSoon: $("closetSoon"),
    closetTabs: document.querySelectorAll(".closet-tab"),
    tray: $("tray"),
    trayItems: $("trayItems"),
    album: $("album"),
    albumItems: $("albumItems"),
    albumProgress: $("albumProgress"),
    albumBtn: $("albumBtn"),
    scenes: $("scenes"),
    sceneBtn: $("sceneBtn"),
    sceneItems: $("sceneItems"),
    buddyLayer: $("buddyLayer"),
    buddyBtn: $("buddyBtn"),
    buddies: $("buddies"),
    buddyItems: $("buddyItems"),
    photo: $("photo"),
    photoBtn: $("photoBtn"),
    photoCanvas: $("photoCanvas"),
    stickerRow: $("stickerRow"),
    photoUndo: $("photoUndo"),
    photoSave: $("photoSave"),
    photoDownload: $("photoDownload"),
    photoGallery: $("photoGallery"),
    voice: $("voice"),
    voiceBtn: $("voiceBtn"),
    voiceItems: $("voiceItems"),
    voiceNote: $("voiceNote"),
    bubbleGame: $("bubbleGame"),
    play: $("play"),
    playTitle: $("playTitle"),
    playChooser: $("playChooser"),
    playArea: $("playArea"),
    doctor: $("doctor"),
    docEmoji: $("docEmoji"),
    docTitle: $("docTitle"),
    docCause: $("docCause"),
    docExplain: $("docExplain"),
    docTreat: $("docTreat"),
    docAdvice: $("docAdvice"),
    sickBadge: $("sickBadge"),
    doctorBtn: document.querySelector('.action[data-action="doctor"]'),
    starsBtn: $("starsBtn"),
    starsVal: $("starsVal"),
    stars: $("stars"),
    starsTotal: $("starsTotal"),
    starsStreak: $("starsStreak"),
    starsNext: $("starsNext"),
    goalList: $("goalList"),
    bellBtn: $("bellBtn"),
    muteBtn: $("muteBtn"),
    bars: {
      hunger: $("bar-hunger"),
      happiness: $("bar-happiness"),
      energy: $("bar-energy"),
      cleanliness: $("bar-cleanliness"),
    },
  };

  const state = GG.createPet(GG.Save.load());
  const bootHealth = GG.applyElapsed(state, Date.now());
  GG.Audio.setMuted(!!state.muted);
  GG.Voice.muted = !!state.muted;
  GG.Voice.init().then(() => renderVoice());

  let holdMood = null; // { name, until } transient expression from an action
  let currentMood = "idle";
  let speechTimer = null;
  let toastTimer = null;
  let nextIdleChatter = Date.now() + 6000;
  let greeted = false;

  applyCosmetics();
  GG.applyScene(state, el.sceneDeco);
  el.name.textContent = state.name || "Gugugaga";

  // ---------- rendering ----------
  function getCss(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function barColor(v) {
    if (v > 50) return getCss("--ok");
    if (v > 25) return getCss("--warn");
    return getCss("--bad");
  }
  function updateCharImage() {
    const src = GG.exprSrc(currentMood);
    if (el.charImg.getAttribute("src") !== src) el.charImg.setAttribute("src", src);
    // Fake tells (tears/zzz) only while the mood has no real face art yet.
    el.char.classList.toggle("has-expr", GG.exprHasArt(currentMood));
  }

  // If an expression PNG isn't in assets/art/ yet, remember it and use the base.
  el.charImg.addEventListener("error", () => {
    GG.markExprMissing(el.charImg.getAttribute("src"));
    updateCharImage();
  });
  GG.exprSources().forEach((src) => {
    const probe = new Image();
    probe.addEventListener("error", () => { GG.markExprMissing(src); updateCharImage(); });
    probe.src = src;
  });

  // Lo mismo para la ropa y para las mascotas: el catálogo declara piezas cuyo
  // PNG puede no existir todavía. Se prueba cada archivo al arrancar y lo que
  // falta simplemente no se ofrece — así generar arte nunca requiere tocar
  // código, y nada aparece roto mientras tanto.
  //
  // Se usa HEAD y no un <img>: son ~29 archivos posibles y GitHub Pages
  // responde cada 404 con una página de ~9 KB, o sea 266 KB tirados en CADA
  // apertura del juego. Con HEAD el cuerpo viene vacío y el costo es ~0.
  // Si `fetch` falla (sin conexión), no se marca nada como faltante: mejor
  // reintentar en la próxima apertura que esconderle la ropa por estar offline.
  function probeArt(src, onMissing) {
    fetch(src, { method: "HEAD" })
      .then((res) => { if (!res.ok) onMissing(); })
      .catch(() => { /* sin red: se reintenta al abrir de nuevo */ });
  }
  // Las sondas se lanzan al final del archivo (buscar `probeArt(`), cuando ya
  // existe todo lo que sus callbacks necesitan tocar.

  // All heart costs in the catalog, ascending — drives the "next unlock" goal.
  function thresholds() {
    const out = [];
    Object.keys(GG.COSMETICS).forEach((slot) => {
      GG.COSMETICS[slot].forEach((it) => { if (it.love) out.push({ slot, item: it }); });
    });
    return out.sort((a, b) => a.item.love - b.item.love);
  }

  function renderLove() {
    const love = state.love || 0;
    const all = thresholds();
    const next = all.find((t) => love < t.item.love);
    if (!next) {
      el.loveFill.style.width = "100%";
      el.loveGoal.textContent = love + " ¡todo!";
      return;
    }
    const prev = all.filter((t) => t.item.love <= love).pop();
    const from = prev ? prev.item.love : 0;
    const pct = Math.max(0, Math.min(100, ((love - from) / (next.item.love - from)) * 100));
    el.loveFill.style.width = pct + "%";
    el.loveGoal.textContent = love + "/" + next.item.love + " " + next.item.preview;
  }

  function render() {
    const s = state.stats;
    for (const k in el.bars) {
      el.bars[k].style.width = s[k].toFixed(1) + "%";
      el.bars[k].style.backgroundColor = barColor(s[k]);
    }
    renderLove();

    if (holdMood && Date.now() < holdMood.until) {
      currentMood = holdMood.name;
    } else {
      holdMood = null;
      currentMood = GG.computeMood(state);
      if (!state.sleeping && s.cleanliness < 35) currentMood = "dirty";
    }
    el.char.setAttribute("data-state", currentMood);
    // Dirt smudges + flies are driven by the actual stat, not by the mood, so
    // they still show while she is sick or being fed.
    el.char.classList.toggle("is-dirty", !state.sleeping && s.cleanliness < 35);
    el.starsVal.textContent = state.stars || 0;
    updateCharImage();

    el.mood.textContent = GG.overallEmoji(state);
    el.day.textContent = state.day;
    el.sleepBtn.classList.toggle("active", state.sleeping);
    document.body.classList.toggle("night", state.sleeping);

    const ill = GG.illnessOf(state);
    el.doctorBtn.classList.toggle("hidden", !ill);
    el.actions.classList.toggle("sick", !!ill);
    el.sickBadge.classList.toggle("hidden", !ill);
    if (ill) el.sickBadge.textContent = ill.emoji;

    Buddies.watch();
  }

  // ---------- speech + fx + toast ----------
  function say(text, ms = 2600) {
    el.speechText.textContent = text;
    el.speech.classList.remove("hidden");
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => el.speech.classList.add("hidden"), ms);
  }
  function toast(text, ms = 3200) {
    el.toast.textContent = text;
    el.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.add("hidden"), ms);
  }
  function burst(emojis) {
    if (!emojis) return;
    emojis.forEach((e, i) => setTimeout(() => spawnFloat(e), i * 140));
  }
  function spawnFloat(emoji) {
    const span = document.createElement("span");
    span.className = "float-emoji";
    span.textContent = emoji;
    span.style.left = 30 + Math.random() * 40 + "%";
    span.style.top = 40 + Math.random() * 20 + "%";
    el.fx.appendChild(span);
    setTimeout(() => span.remove(), 1300);
  }

  // ---------- actions ----------
  function tap() {
    el.char.classList.remove("tap");
    void el.char.offsetWidth; // restart animation
    el.char.classList.add("tap");
  }
  function playActionSound(name, ev) {
    if (ev.voice && GG.Voice.play(ev.voice)) return; // her real voice wins
    if (name === "sleep") GG.Audio.play(state.sleeping ? "sleep" : "wake");
    else if (ev.mood === "sad" || ev.shake) GG.Audio.play("cry");
    else GG.Audio.play(name); // feed / play / clean / pet
  }
  // Qué comenta la mascota según la acción. `pet` queda afuera a propósito:
  // acariciarla es el gesto más repetido del juego y el amigo hablando en cada
  // toque se vuelve ruido.
  const BUDDY_REACTS = { feed: "feed", play: "play", clean: "clean", sleep: "sleep" };

  function handle(name, opts) {
    const ev = GG.doAction(state, name, opts);
    if (!ev) return;
    if (ev.speech) say(ev.speech);
    if (ev.blocked) return;
    playActionSound(name, ev);
    if (ev.mood) holdMood = { name: ev.mood, until: Date.now() + (ev.hold || 1200) };
    if (ev.fx) burst(ev.fx);
    tap();
    if (ev.shake) {
      el.char.classList.remove("shake");
      void el.char.offsetWidth;
      el.char.classList.add("shake");
      setTimeout(() => el.char.classList.remove("shake"), 700);
    }
    if (ev.unlocked && ev.unlocked.length) {
      const names = ev.unlocked.map((u) => u.item.preview + " " + u.item.label).join(", ");
      setTimeout(() => toast("🎁 ¡Desbloqueaste " + names + "!"), 700);
      GG.Audio.play("play");
    } else if (ev.isNew) {
      const p = GG.foodsProgress(state);
      setTimeout(() => toast("📖 ¡Comida nueva! " + p.done + " de " + p.total), 900);
    }
    if (ev.health) applyHealthEvent(ev.health, 1800);
    // La mascota comenta lo que acaba de pasar, un toque después que ella para
    // que se lean como dos personajes y no como un solo cartel.
    if (BUDDY_REACTS[name]) setTimeout(() => Buddies.react(BUDDY_REACTS[name]), 900);
    GG.Save.save(state);
    render();
    nextIdleChatter = Date.now() + 8000;
  }

  // A health event is always delivered AFTER the action's own feedback, so the
  // kid reads it as a consequence of what she just did.
  function applyHealthEvent(h, delay) {
    if (!h) return;
    setTimeout(() => {
      say(h.speech, 3800);
      if (h.gotSick) {
        holdMood = { name: "sad", until: Date.now() + 2600 };
        burst(h.fx);
        if (!GG.Voice.play("llorando")) GG.Audio.play("cry");
        setTimeout(() => toast("🩺 Se enfermó. ¡Tocá el botón Doctor!", 4200), 1200);
      }
      render();
      GG.Save.save(state);
    }, delay || 0);
  }

  el.actions.addEventListener("click", (e) => {
    const btn = e.target.closest(".action");
    if (!btn) return;
    const name = btn.dataset.action;
    if (name === "feed") return openFeed();
    if (name === "clean") return startBath();
    if (name === "play") return openPlay();
    if (name === "doctor") return openDoctor();
    handle(name);
  });
  el.char.addEventListener("click", () => {
    if (state.sleeping) { say("zzz... shhh 🌙"); return; }
    handle("pet");
  });

  // Greet with her recorded voice on the first tap (autoplay needs a gesture).
  document.addEventListener("click", () => {
    if (greeted) return;
    greeted = true;
    GG.Voice.play("hola");
  }, { once: false });

  // ---------- sheets ----------
  function openSheet(node) { node.classList.remove("hidden"); }
  function closeSheet(node) { node.classList.add("hidden"); }
  document.querySelectorAll(".sheet-close").forEach((b) => {
    b.addEventListener("click", () => closeSheet($(b.dataset.close)));
  });
  document.querySelectorAll(".sheet").forEach((s) => {
    s.addEventListener("click", (e) => { if (e.target === s) closeSheet(s); });
  });

  // ---------- wardrobe ----------
  function applyCosmetics() {
    const c = state.cosmetics || GG.DEFAULT_COSMETICS;
    el.charAcc.innerHTML = "";
    el.charBack.innerHTML = "";
    const put = (host, src, anchor, slot) => {
      const img = document.createElement("img");
      img.className = "acc-img acc-" + slot;
      img.src = src;
      img.draggable = false;
      const a = anchor || {};
      if (a.top != null) img.style.top = a.top + "%";
      if (a.left != null) img.style.left = a.left + "%";
      if (a.width != null) img.style.width = a.width + "%";
      host.appendChild(img);
    };
    GG.LAYER_ORDER.forEach((slot) => {
      const it = GG.findCosmetic(slot, c[slot]);
      // `pieceHasArt` evita el ícono de imagen rota si el PNG de una pieza
      // equipada desaparece (por ejemplo al borrarlo del repo).
      if (!it || !it.img || !GG.pieceHasArt(it)) return;
      // Una pieza puede traer una SEGUNDA imagen que va detrás de la niña
      // (`imgBack`): es lo que permite que una peluca tape el pelo por atrás
      // sin tener que ser enorme por delante. Sigue siendo UNA sola pieza en
      // el clóset — la nena elige "Diva" y se ponen las dos capas.
      if (it.imgBack) put(el.charBack, it.imgBack, it.anchorBack || it.anchor, slot + "-back");
      put(el.charAcc, it.img, it.anchor, slot);
    });
    updateCharImage();
  }

  function renderCloset(tab) {
    // Sólo las piezas que ya tienen su PNG: el catálogo declara más de las que
    // están dibujadas, y una fila de casilleros vacíos que no se pueden tocar
    // sólo genera frustración. Aparecen solas cuando el archivo existe.
    const items = GG.availablePieces(state, tab);
    el.closetItems.innerHTML = "";
    items.forEach((it) => {
      const unlocked = GG.isUnlocked(state, tab, it);
      const b = document.createElement("button");
      const selected = (state.cosmetics[tab] || "") === it.id;
      b.className = "citem" + (selected ? " sel" : "") + (unlocked ? "" : " locked");
      b.innerHTML =
        '<span class="cico">' + (unlocked ? it.preview || "∅" : "🔒") + "</span>" +
        '<span class="cname">' + (unlocked ? it.label : it.love + " ❤️") + "</span>";
      b.addEventListener("click", () => {
        if (!unlocked) {
          const falta = it.love - (state.love || 0);
          toast("🔒 Te faltan " + falta + " ❤️ para " + it.label);
          return;
        }
        state.cosmetics[tab] = it.id;
        applyCosmetics();
        GG.Save.save(state);
        renderCloset(tab);
      });
      el.closetItems.appendChild(b);
    });
    el.closetSoon.textContent = GG.slotComingSoon(state, tab)
      ? "🎨 Estamos creando más piezas en 3D. ¡Pronto habrá mucho para vestir a Gugugaga!"
      : "";
  }

  function openCloset() {
    const active = document.querySelector(".closet-tab.active");
    renderCloset(active ? active.dataset.tab : "hat");
    el.closet.classList.remove("hidden");
  }
  el.closetBtn.addEventListener("click", openCloset);
  el.closetClose.addEventListener("click", () => el.closet.classList.add("hidden"));
  el.closet.addEventListener("click", (e) => { if (e.target === el.closet) el.closet.classList.add("hidden"); });
  el.closetTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      el.closetTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      renderCloset(tab.dataset.tab);
    });
  });

  // ---------- food tray + album ----------
  function openFeed() {
    if (state.sleeping) return handle("feed");
    el.trayItems.innerHTML = "";
    GG.FOODS.forEach((f) => {
      const tried = GG.foodTried(state, f.id);
      const taste = GG.tasteOf(f, state);
      const b = document.createElement("button");
      b.className = "food-item" + (tried ? " " + taste : "");
      // The 🥗 / 🍟 mark is always visible, even before tasting: the point is
      // that she can SEE which is which and choose, not discover it by accident.
      b.innerHTML =
        '<span class="fico">' + f.emoji + "</span>" +
        '<span class="cname">' + f.label + "</span>" +
        (GG.HEALTH_ICON[f.health] ? '<span class="food-health">' + GG.HEALTH_ICON[f.health] + "</span>" : "") +
        (tried ? '<span class="food-taste">' + GG.TASTE_ICON[taste] + "</span>" : "");
      b.addEventListener("click", () => {
        closeSheet(el.tray);
        handle("feed", { foodId: f.id });
      });
      el.trayItems.appendChild(b);
    });
    openSheet(el.tray);
  }

  function openAlbum() {
    const p = GG.foodsProgress(state);
    el.albumProgress.textContent = "Descubriste " + p.done + " de " + p.total +
      ". Probá comidas distintas… ¡y fijate qué pasa según el disfraz que lleve puesto! 🐧🐰";
    el.albumItems.innerHTML = "";
    GG.FOODS.forEach((f) => {
      const tried = GG.foodTried(state, f.id);
      const taste = GG.tasteOf(f, state);
      const d = document.createElement("div");
      d.className = "food-item" + (tried ? " " + taste : " unknown");
      d.innerHTML =
        '<span class="fico">' + (tried ? f.emoji : "❔") + "</span>" +
        '<span class="cname">' + (tried ? f.label : "???") + "</span>" +
        (tried ? '<span class="food-taste">' + GG.TASTE_ICON[taste] + "</span>" : "");
      el.albumItems.appendChild(d);
    });
    openSheet(el.album);
  }
  el.albumBtn.addEventListener("click", openAlbum);

  // ---------- mascotas 🐾 ----------
  // Se pasean solas, reaccionan a lo que pasa y se dejan acariciar. No tienen
  // barras (ver js/buddies.js): existir y responder es todo lo que hacen.
  //
  // Son VARIAS a la vez: el estado guarda una lista, no una elegida. Cada una
  // tiene su propio elemento, su propio paseo y su propio ánimo, y se arman y
  // desarman solas cuando cambia la selección.
  const Buddies = (() => {
    // id -> { root, art, zzz, speech, moodHold, lastX, x, animT, sayT }
    const live = new Map();
    let walkTimer = null;

    // Franjas laterales: no se DETIENEN encima de Gugugaga (ocupa ~29-76% del
    // stage). Cruzarla al caminar sí, y ahora pasan por delante.
    function bands() {
      return [[-26, -2], [76, 100]];
    }
    // Elige una posición libre: reintenta hasta separarse de las demás, si no
    // dos amigas se paran una encima de la otra y parecen una sola.
    function pickX(id) {
      const others = [...live.entries()].filter(([k]) => k !== id).map(([, v]) => v.x);
      let best = null, bestGap = -1;
      for (let i = 0; i < 10; i++) {
        const [lo, hi] = GG.pick(bands());
        const x = lo + Math.random() * (hi - lo);
        const gap = others.length ? Math.min(...others.map((o) => Math.abs(o - x))) : 99;
        if (gap > bestGap) { bestGap = gap; best = x; }
        if (gap >= 20) break;
      }
      return best;
    }

    function place(b, x) {
      b.art.style.setProperty("--flip", x < b.x ? -1 : 1);
      b.x = x;
      b.root.style.left = x + "%";
    }

    function moodNow(b) {
      if (GG.buddyResting(state)) return "dormido";
      if (b.moodHold && Date.now() < b.moodHold.until) return b.moodHold.name;
      b.moodHold = null;
      if (GG.illnessOf(state)) return "triste";
      if (state.stats.cleanliness < 35) return "triste";
      return "normal";
    }

    // Crea el DOM de una mascota. Se hace acá y no en index.html porque la
    // cantidad depende de cuántas eligió.
    function build(def) {
      const root = document.createElement("div");
      root.className = "buddy";
      root.dataset.buddy = def.id;
      const speech = document.createElement("div");
      speech.className = "buddy-speech hidden";
      const zzz = document.createElement("span");
      zzz.className = "buddy-zzz hidden";
      zzz.textContent = "💤";
      const art = document.createElement("span");
      art.className = "buddy-art";
      root.append(speech, zzz, art);

      const b = { def, root, art, zzz, speech, moodHold: null, x: 78, animT: null, sayT: null };
      root.addEventListener("click", (e) => {
        e.stopPropagation(); // no cuenta como caricia a Gugugaga
        if (GG.buddyResting(state)) { say(b, "shhh... 💤"); return; }
        react("tap", b);
        // Un amiguito contento también la alegra a ella, pero poquito: la
        // mascota es compañía, no un atajo para llenar la barra de felicidad.
        state.stats.happiness = GG.clamp(state.stats.happiness + 1);
        GG.Save.save(state);
      });
      el.buddyLayer.appendChild(root);
      place(b, 78);
      return b;
    }

    function say(b, text) {
      b.speech.textContent = text;
      b.speech.classList.remove("hidden");
      clearTimeout(b.sayT);
      b.sayT = setTimeout(() => b.speech.classList.add("hidden"), 2400);
    }

    function anim(b, name) {
      clearTimeout(b.animT);
      b.root.classList.remove("hop", "wiggle", "worry");
      if (!name || name === "nap") return;
      void b.root.offsetWidth; // reinicia la animación
      b.root.classList.add(name);
      b.animT = setTimeout(() => b.root.classList.remove(name), 1400);
    }

    function fx(b, list) {
      if (!list) return;
      list.forEach((e, i) =>
        setTimeout(() => {
          const s = document.createElement("span");
          s.className = "float-emoji";
          s.textContent = e;
          s.style.left = "0%";
          s.style.top = "-40%";
          s.style.fontSize = "20px";
          b.root.appendChild(s);
          setTimeout(() => s.remove(), 1300);
        }, i * 150)
      );
    }

    function paint(b) {
      const src = GG.buddyArtSrc(b.def, moodNow(b));
      if (src) {
        let img = b.art.querySelector("img");
        if (!img) {
          b.art.textContent = "";
          img = document.createElement("img");
          img.className = "buddy-img";
          img.alt = "";
          img.draggable = false;
          img.addEventListener("error", () => {
            GG.markBuddyArtMissing(img.getAttribute("src"));
            b.art.innerHTML = "";
            paint(b);
          });
          b.art.appendChild(img);
        }
        if (img.getAttribute("src") !== src) img.setAttribute("src", src);
      } else if (b.art.textContent !== b.def.emoji) {
        b.art.innerHTML = "";
        b.art.textContent = b.def.emoji;
      }
      const resting = GG.buddyResting(state);
      b.root.classList.toggle("nap", resting);
      b.zzz.classList.toggle("hidden", !resting);
      if (resting) b.speech.classList.add("hidden");
    }

    // Sincroniza el DOM con la selección: crea las nuevas, borra las que sacó.
    function render() {
      const want = GG.activeBuddies(state);
      const ids = new Set(want.map((d) => d.id));
      live.forEach((b, id) => {
        if (!ids.has(id)) { b.root.remove(); live.delete(id); }
      });
      want.forEach((def, i) => {
        let b = live.get(def.id);
        if (!b) {
          b = build(def);
          live.set(def.id, b);
          // Repartidas de entrada para que no aparezcan todas en el mismo punto.
          place(b, i % 2 === 0 ? 78 + i * 8 : -14 - i * 6);
        }
        b.def = def;
        paint(b);
      });
      if (GG.buddyResting(state)) {
        // De noche se acurrucan al lado de ella, en fila y sin pisarse.
        [...live.values()].forEach((b, i) => place(b, 66 + i * 13));
      }
    }

    // Reacción a algo que pasó. `only` limita la reacción a una sola mascota
    // (el toque). Si no, reaccionan TODAS pero habla UNA: cuatro burbujas a la
    // vez no se leen, y el grupo entero moviéndose ya comunica la emoción.
    function react(kind, only) {
      if (GG.buddyResting(state) && kind !== "sleep") return;
      const list = only ? [only] : [...live.values()];
      if (!list.length) return;
      const talker = only || GG.pick(list);
      list.forEach((b) => {
        const r = GG.buddyReact(state, kind, b.def);
        if (!r) return;
        if (r.mood && r.mood !== "normal") b.moodHold = { name: r.mood, until: Date.now() + 2200 };
        paint(b);
        anim(b, r.anim);
        fx(b, r.fx);
        if (b === talker && r.speech) say(b, r.speech);
      });
    }

    function walk() {
      clearTimeout(walkTimer);
      walkTimer = setTimeout(() => {
        if (!GG.buddyResting(state) && !document.hidden && live.size) {
          // Se mueve UNA por vez: si se mudaran todas juntas la escena parece
          // un desfile en vez de unos bichos dando vueltas.
          const b = GG.pick([...live.values()]);
          place(b, pickX(b.def.id));
          if (Math.random() < 0.3) react("idle", b);
        }
        walk();
      }, 2600 + Math.random() * 3200);
    }

    // Reacciones que nacen de un ESTADO, no de un botón: sólo se disparan en el
    // flanco (cuando la cosa empieza), si no hablarían cada segundo mientras
    // ella siga enferma o sucia.
    let wasSick = false;
    let wasDirty = false;
    function watch() {
      render();
      const sick = !!GG.illnessOf(state);
      const dirty = !state.sleeping && state.stats.cleanliness < 35;
      if (sick && !wasSick) react("sick");
      else if (dirty && !wasDirty) react("dirty");
      wasSick = sick;
      wasDirty = dirty;
    }

    walk();
    return { render, react, watch, imgs: () => [...live.values()].map((b) => b.art.querySelector("img")) };
  })();

  // ---------- mascotas: elegir cuáles ----------
  // Multi-selección a propósito: se prenden y apagan las que quiera y andan
  // todas juntas. Elegir "cuál" convertía cada amiga nueva en el reemplazo de
  // la anterior, que es lo contrario a coleccionar.
  function openBuddies() {
    el.buddyItems.innerHTML = "";
    GG.BUDDIES.forEach((b) => {
      const unlocked = GG.buddyUnlocked(state, b);
      const on = GG.buddyActive(state, b.id);
      const btn = document.createElement("button");
      btn.className = "citem" + (on ? " sel" : "") + (unlocked ? "" : " locked");
      btn.innerHTML =
        '<span class="cico">' + (unlocked ? b.emoji : "🔒") + "</span>" +
        '<span class="cname">' + (unlocked ? b.label : b.stars + " ⭐") + "</span>" +
        (unlocked ? '<span class="ctick">' + (on ? "✓" : "") + "</span>" : "");
      btn.addEventListener("click", () => {
        if (!unlocked) {
          toast("🔒 " + b.label + " llega con " + b.stars + " ⭐. ¡Cuidala bien todo el día!", 4600);
          return;
        }
        const now = GG.toggleBuddy(state, b.id);
        GG.Save.save(state);
        Buddies.render();
        if (now) {
          Buddies.react("tap");
          GG.Audio.play("pet");
        }
        openBuddies();
      });
      el.buddyItems.appendChild(btn);
    });
    openSheet(el.buddies);
  }
  el.buddyBtn.addEventListener("click", openBuddies);


  // ---------- scenes ----------
  function openScenes() {
    el.sceneItems.innerHTML = "";
    GG.SCENES.forEach((sc) => {
      const unlocked = GG.sceneUnlocked(state, sc);
      const b = document.createElement("button");
      b.className = "citem" + (state.scene === sc.id ? " sel" : "") + (unlocked ? "" : " locked");
      b.innerHTML =
        '<span class="cico">' + (unlocked ? sc.preview : "🔒") + "</span>" +
        '<span class="cname">' + (unlocked ? sc.label : sc.stars + " ⭐") + "</span>";
      b.addEventListener("click", () => {
        if (!unlocked) {
          toast("🔒 " + sc.label + " se abre con " + sc.stars + " ⭐. ¡Cuidala bien todo el día!", 4600);
          return;
        }
        state.scene = sc.id;
        GG.applyScene(state, el.sceneDeco);
        GG.Save.save(state);
        openScenes();
      });
      el.sceneItems.appendChild(b);
    });
    openSheet(el.scenes);
  }
  el.sceneBtn.addEventListener("click", openScenes);

  // ---------- photo mode ----------
  const STICKERS = ["⭐", "❤️", "🎉", "🌸", "👑", "🍰", "🌈", "🐾"];
  let sticker = STICKERS[0];
  let stamped = [];

  // Scene background pictures, preloaded so the photo can include them.
  const sceneBg = {};
  GG.SCENES.forEach((sc) => {
    if (!sc.img) return;
    const im = new Image();
    im.src = sc.img;
    sceneBg[sc.id] = im;
  });

  function drawPhoto() {
    GG.Photo.draw(el.photoCanvas, state, {
      img: el.charImg,
      accImgs: [...el.charAcc.querySelectorAll("img")],
      backImgs: [...el.charBack.querySelectorAll("img")],
      bg: sceneBg[state.scene] || null,
      // La mascota también sale en la foto: si es parte de la escena, es parte
      // del recuerdo. Se la pone a un lado fijo para que nunca tape la cara.
      buddies: GG.activeBuddies(state),
      buddyImgs: Buddies.imgs(),
    }, stamped);
  }

  async function refreshGallery() {
    const shots = await GG.Store.all("photo");
    el.photoGallery.innerHTML = "";
    shots.slice(0, 12).forEach((s) => {
      const wrap = document.createElement("div");
      wrap.className = "gal-item";
      const img = document.createElement("img");
      img.src = s.value;
      const del = document.createElement("button");
      del.className = "gal-del";
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        await GG.Store.del("photo", s.key);
        refreshGallery();
      });
      wrap.appendChild(img);
      wrap.appendChild(del);
      el.photoGallery.appendChild(wrap);
    });
  }

  function openPhoto() {
    stamped = [];
    el.stickerRow.innerHTML = "";
    STICKERS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "sticker" + (s === sticker ? " sel" : "");
      b.textContent = s;
      b.addEventListener("click", () => {
        sticker = s;
        [...el.stickerRow.children].forEach((c) => c.classList.toggle("sel", c.textContent === s));
      });
      el.stickerRow.appendChild(b);
    });
    drawPhoto();
    refreshGallery();
    openSheet(el.photo);
  }
  el.photoBtn.addEventListener("click", openPhoto);
  el.photoCanvas.addEventListener("click", (e) => {
    const r = el.photoCanvas.getBoundingClientRect();
    stamped.push({ e: sticker, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, size: 90 });
    drawPhoto();
  });
  el.photoUndo.addEventListener("click", () => { stamped.pop(); drawPhoto(); });
  el.photoSave.addEventListener("click", async () => {
    const data = el.photoCanvas.toDataURL("image/jpeg", 0.82);
    await GG.Store.put("photo", String(Date.now()), data);
    await refreshGallery();
    toast(GG.Store.isMemoryOnly() ? "📸 Guardada (solo por esta vez)" : "📸 ¡Foto guardada!");
  });
  el.photoDownload.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = el.photoCanvas.toDataURL("image/png");
    a.download = "gugugaga-dia" + state.day + ".png";
    a.click();
  });

  // ---------- voice ----------
  let recordingSlot = null;

  function renderVoice() {
    const why = GG.Voice.unsupportedReason();
    el.voiceNote.textContent = why
      ? "⚠️ " + why + " Probá abriendo el juego en su propia pestaña o instalado en la pantalla de inicio."
      : "Grabá tu voz para cada momento. Se guarda solo en este dispositivo, así que descargá las que quieras conservar.";
    el.voiceItems.innerHTML = "";
    GG.VOICE_SLOTS.forEach((slot) => {
      const has = GG.Voice.has(slot.id);
      const row = document.createElement("div");
      row.className = "voice-item";
      row.innerHTML =
        '<span class="v-emoji">' + slot.emoji + "</span>" +
        '<div class="v-main"><div class="v-label">' + slot.label + "</div>" +
        '<div class="v-hint">' + (has ? "grabada ✅" : slot.hint) + "</div></div>";

      const btns = document.createElement("div");
      btns.className = "v-btns";

      const rec = document.createElement("button");
      rec.className = "rec-btn" + (recordingSlot === slot.id ? " recording" : "");
      rec.textContent = recordingSlot === slot.id ? "⏹️" : "🎤";
      rec.disabled = !!why || (recordingSlot && recordingSlot !== slot.id);
      rec.addEventListener("click", () => toggleRecord(slot.id));
      btns.appendChild(rec);

      const play = document.createElement("button");
      play.textContent = "▶️";
      play.disabled = !has;
      play.addEventListener("click", () => GG.Voice.play(slot.id));
      btns.appendChild(play);

      const dl = document.createElement("button");
      dl.textContent = "⬇️";
      dl.disabled = !has;
      dl.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = GG.Voice.url(slot.id);
        a.download = "gugugaga-" + slot.id;
        a.click();
      });
      btns.appendChild(dl);

      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.disabled = !has;
      del.addEventListener("click", async () => { await GG.Voice.remove(slot.id); renderVoice(); });
      btns.appendChild(del);

      row.appendChild(btns);
      el.voiceItems.appendChild(row);
    });
  }

  async function toggleRecord(slotId) {
    try {
      if (recordingSlot === slotId) {
        await GG.Voice.stop(slotId);
        recordingSlot = null;
        renderVoice();
        toast("🎤 ¡Voz guardada!");
        return;
      }
      await GG.Voice.start();
      recordingSlot = slotId;
      renderVoice();
    } catch (err) {
      recordingSlot = null;
      GG.Voice.cancel();
      renderVoice();
      toast("🎤 " + (err && err.message ? err.message : "No se pudo grabar."));
    }
  }
  el.voiceBtn.addEventListener("click", () => { renderVoice(); openSheet(el.voice); });

  // ---------- daily care card ----------
  function openStars() {
    el.starsTotal.textContent = state.stars || 0;
    el.starsStreak.textContent = state.streak || 0;
    el.goalList.innerHTML = "";
    GG.goalStatus(state).forEach((g) => {
      const d = document.createElement("div");
      d.className = "goal" + (g.ok ? " ok" : "");
      d.innerHTML =
        '<span class="goal-check">' + (g.ok ? "✅" : "⬜") + "</span>" +
        '<div class="goal-main"><div class="goal-label">' + g.icon + " " + g.label + "</div>" +
        '<div class="goal-progress">' + g.progress + "</div></div>";
      el.goalList.appendChild(d);
    });
    const locked = GG.SCENES.filter((sc) => !GG.sceneUnlocked(state, sc))
      .sort((a, b) => a.stars - b.stars)[0];
    el.starsNext.textContent = locked
      ? "Con " + locked.stars + " ⭐ se abre un lugar nuevo: " + locked.preview + " " + locked.label
      : "¡Ya abriste todos los lugares! 🎉";
    openSheet(el.stars);
  }
  el.starsBtn.addEventListener("click", openStars);

  function celebrateDay(res) {
    const done = res.goals.filter((g) => g.ok).length;
    if (res.earned > 0) {
      toast("⭐".repeat(res.earned) + " ¡Ganaste " + res.earned + " estrella" + (res.earned > 1 ? "s" : "") +
        " por cuidarla bien ayer!", 5200);
      GG.Audio.play("play");
    } else {
      toast("Ayer fue difícil… ¡hoy es un día nuevo! 💪", 4600);
    }
    // Los avisos se encolan uno detrás de otro: dos toasts encimados se pisan y
    // el premio se pierde justo cuando más importa que lo vea.
    let at = 5400;
    const queue = (msg, ms) => { setTimeout(() => toast(msg, ms), at); at += ms + 300; };
    (res.buddies || []).forEach((b) => {
      queue("🐾 ¡Llegó un amigo nuevo! " + b.emoji + " " + b.label + " — tocá 🐾 para elegirlo", 5200);
    });
    (res.scenes || []).forEach((sc) => {
      queue("🗺️ ¡Se abrió un lugar nuevo! " + sc.preview + " " + sc.label, 4800);
    });
    if (res.streak >= 2) queue("🔥 ¡" + res.streak + " días seguidos perfectos!", 4200);
    return done;
  }

  // ---------- notifications ----------
  function refreshBell() {
    const on = !!state.notify && GG.Notify.permission() === "granted";
    el.bellBtn.textContent = on ? "🔔" : "🔕";
    el.bellBtn.style.opacity = on ? "1" : ".6";
  }
  el.bellBtn.addEventListener("click", async () => {
    const why = GG.Notify.reason();
    if (why) return toast("🔕 " + why, 5200);
    if (state.notify) {
      state.notify = false;
      refreshBell();
      GG.Save.save(state);
      return toast("🔕 Avisos apagados");
    }
    try {
      const ok = await GG.Notify.request();
      state.notify = ok;
      refreshBell();
      GG.Save.save(state);
      if (ok) {
        toast("🔔 ¡Listo! Te va a avisar cuando te necesite.");
        GG.Notify.show("🔔 ¡Avisos activados!", "Gugugaga te va a avisar cuando necesite algo.", "welcome");
      } else {
        toast("🔕 No diste permiso para los avisos.");
      }
    } catch (e) {
      toast("🔕 No se pudieron activar los avisos.");
    }
  });
  refreshBell();

  // ---------- doctor ----------
  function openDoctor() {
    const ill = GG.illnessOf(state);
    if (!ill) { say("¡está sanita! 💪"); return; }
    el.docEmoji.textContent = ill.emoji;
    el.docTitle.textContent = ill.label;
    el.docCause.textContent = ill.cause;
    el.docExplain.textContent = ill.explain;
    el.docTreat.textContent = ill.treatment.emoji + " " + ill.treatment.label;
    el.docTreat.disabled = false;
    el.docAdvice.classList.add("hidden");
    openSheet(el.doctor);
  }
  el.docTreat.addEventListener("click", () => {
    const ill = GG.illnessOf(state);
    if (!ill) return;
    el.docTreat.disabled = true;
    el.docExplain.textContent = ill.treatment.text;
    el.docAdvice.textContent = "💡 " + ill.advice;
    el.docAdvice.classList.remove("hidden");
    el.docEmoji.textContent = "😊";
    el.docTitle.textContent = "¡Ya está mejor!";
    el.docCause.textContent = "";
    handle("doctor");
    setTimeout(() => closeSheet(el.doctor), 5200);
  });

  // ---------- play: mini-game chooser ----------
  let stopGame = null;

  function openPlay() {
    // Let doAction own every refusal rule (sick / asleep / too tired) so the
    // chooser and the action can never disagree about whether she may play.
    const check = GG.doAction(state, "play", { dryRun: true });
    if (check.blocked) return handle("play");
    el.playTitle.textContent = "¿A qué jugamos?";
    el.playArea.classList.add("hidden");
    el.playChooser.classList.remove("hidden");
    el.playChooser.innerHTML = "";
    GG.PLAY_MENU.forEach((g) => {
      const b = document.createElement("button");
      b.className = "citem";
      b.innerHTML = '<span class="cico">' + g.emoji + '</span><span class="cname">' + g.label + "</span>";
      b.addEventListener("click", () => startGame(g));
      el.playChooser.appendChild(b);
    });
    openSheet(el.play);
  }

  function startGame(g) {
    el.playTitle.textContent = g.emoji + " " + g.label;
    el.playChooser.classList.add("hidden");
    el.playArea.classList.remove("hidden");
    stopGame = GG.MiniGames[g.id](el.playArea, (res) => {
      stopGame = null;
      closeSheet(el.play);
      el.playArea.classList.add("hidden");
      handle("play", res);
    });
  }
  // Closing the sheet mid-game must not leave timers running.
  el.play.addEventListener("click", (e) => { if (e.target === el.play && stopGame) stopGame(); });
  el.play.querySelector(".sheet-close").addEventListener("click", () => { if (stopGame) stopGame(); });

  // ---------- bath: bubble mini-game inside the scene ----------
  let bathing = false;
  function startBath() {
    if (state.sleeping) return handle("clean");
    if (bathing) return;
    bathing = true;
    el.bubbleGame.classList.remove("hidden");
    GG.Audio.play("clean");
    say("¡a reventar burbujas! 🫧");
    GG.MiniGames.burbujas(el.bubbleGame, (res) => {
      bathing = false;
      el.bubbleGame.classList.add("hidden");
      handle("clean", { popped: res.score, total: res.total });
    });
  }

  // ---------- mute toggle ----------
  function refreshMute() {
    el.muteBtn.textContent = state.muted ? "🔇" : "🔊";
    GG.Audio.setMuted(!!state.muted);
    GG.Voice.muted = !!state.muted;
  }
  el.muteBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    refreshMute();
    if (!state.muted) GG.Audio.play("pet"); // little confirmation blip
    GG.Save.save(state);
  });
  refreshMute();

  // ---------- idle chatter ----------
  const IDLE_LINES = ["gugu gaga~", "guu?", "gaga!", "¡gugu!", "guu~ ♪"];
  function maybeChatter() {
    if (Date.now() < nextIdleChatter) return;
    nextIdleChatter = Date.now() + (9000 + Math.random() * 9000);
    if (state.sleeping) return;
    const s = state.stats;
    if (s.hunger < 25) {
      say(GG.pick(["guu... ¡tengo hambre! 🍼", "¡gugu gaga hambre!"]));
      GG.Voice.play("hambre");
    } else if (s.happiness < 25) say(GG.pick(["buaa... ¡juega conmigo! 😢", "guu... aburrido"]));
    else if (s.energy < 25) say("guu... tengo sueñito 😴");
    else if (s.cleanliness < 30) say("guu... estoy sucio 🫧");
    else say(GG.pick(IDLE_LINES));
  }

  // ---------- main loop ----------
  let lastDay = state.day;
  function tick() {
    const ev = GG.applyElapsed(state, Date.now());
    if (ev.health) applyHealthEvent(ev.health, 0);
    if (ev.dayEnd) celebrateDay(ev.dayEnd);
    if (state.day !== lastDay) {
      lastDay = state.day;
      setTimeout(() => toast("☀️ ¡Empezó el día " + state.day + "!", 4000), ev.dayEnd ? 5600 : 0);
    }
    GG.Notify.check(state);
    maybeChatter();
    render();
  }
  setInterval(tick, 1000);
  setInterval(() => GG.Save.save(state), 5000);
  window.addEventListener("beforeunload", () => GG.Save.save(state));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { GG.applyElapsed(state, Date.now()); render(); }
  });

  render();

  // Averiguar qué arte existe hoy. Va acá abajo, y no junto a probeArt(), porque
  // los callbacks tocan `Buddy` y el clóset: recién a esta altura están armados.
  GG.pieceSources().forEach((src) =>
    probeArt(src, () => {
      GG.markPieceMissing(src);
      if (!el.closet.classList.contains("hidden")) openCloset();
    })
  );
  GG.buddyArtSources().forEach((src) =>
    probeArt(src, () => {
      GG.markBuddyArtMissing(src);
      Buddies.render();
    })
  );

  // She may have fallen ill, or a day may have rolled over, while the app was
  // closed — report both once, on arrival.
  if (bootHealth.dayEnd) celebrateDay(bootHealth.dayEnd);
  if (bootHealth.health) applyHealthEvent(bootHealth.health, bootHealth.dayEnd ? 5600 : 1400);
  GG.state = state;
})();
