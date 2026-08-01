// Core pet state, need-decay and actions for Gugugaga
(function () {
  const GG = (window.GG = window.GG || {});

  GG.clamp = (v) => Math.max(0, Math.min(100, v));
  GG.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Days are CALENDAR days, not 24h blocks: "Día 2" starts at midnight, the same
  // moment the day changes for the kid playing. Counting elapsed milliseconds
  // instead made the day flip at whatever time she first opened the game.
  const startOfDay = (ts) => {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  GG.dayNumber = function (state, now) {
    const diff = startOfDay(now || Date.now()) - startOfDay(state.createdAt);
    return Math.max(1, Math.round(diff / 86400000) + 1);
  };

  // Need decay in points per minute (higher = drains faster). Gentle for kids.
  GG.DECAY = { hunger: 0.35, happiness: 0.3, energy: 0.25, cleanliness: 0.18 };
  GG.SLEEP_REGEN = 4; // energy points per minute while sleeping

  // Hearts earned per action. Love only ever goes UP: it is a reward track, not
  // a fifth chore. Four decaying bars is already plenty to look after at six.
  GG.LOVE_GAIN = { feed: 2, favFood: 4, yuckFood: 1, newFood: 5, healthy: 2, play: 3, clean: 2, pet: 1 };

  // Petting is the one action with no cost, so hearts from it are rate-limited:
  // without this, holding a finger on her farms the whole wardrobe in a minute.
  GG.PET_LOVE_COOLDOWN = 45000;

  GG.TIRED_LIMIT = 25;   // below this she is too sleepy to play
  GG.DIRTY_SLEEP = 30;   // below this she refuses to go to bed filthy

  GG.createPet = function (saved) {
    const now = Date.now();
    const defaults = Object.assign({}, GG.DEFAULT_COSMETICS);
    if (saved && saved.stats) {
      // migrate older saves that predate the wardrobe / audio / love / foods
      saved.cosmetics = Object.assign({}, defaults, saved.cosmetics);
      if (typeof saved.muted !== "boolean") saved.muted = false;
      if (typeof saved.love !== "number") saved.love = 0;
      if (!saved.foods || !Array.isArray(saved.foods.tried)) saved.foods = { tried: [] };
      if (!saved.scene) saved.scene = "cielo";
      if (!saved.name) saved.name = "Gugugaga";
      if (!saved.health) saved.health = GG.defaultHealth();
      // `buddy: null` es "no quiero mascota", por eso se pregunta por la CLAVE y
      // no por el valor — si no, cada carga le devolvería el pollito.
      if (!("buddy" in saved)) saved.buddy = "pollito";
      if (typeof saved.stars !== "number") saved.stars = 0;
      if (typeof saved.streak !== "number") saved.streak = 0;
      if (!saved.today) saved.today = GG.newToday(GG.dayNumber(saved, Date.now()));
      return saved;
    }
    return {
      version: 2,
      day: 1,
      createdAt: now,
      lastTick: now,
      sleeping: false,
      muted: false,
      love: 0,
      stars: 0,
      streak: 0,
      bestStreak: 0,
      today: GG.newToday(1),
      name: "Gugugaga",
      scene: "cielo",
      buddy: "pollito", // el primer amigo viene incluido (0 ⭐)
      foods: { tried: [] },
      health: GG.defaultHealth(),
      stats: { hunger: 80, happiness: 80, energy: 80, cleanliness: 80 },
      cosmetics: Object.assign({}, defaults),
    };
  };

  // Add hearts and report anything the new total just unlocked.
  GG.addLove = function (state, n) {
    const before = state.love || 0;
    state.love = before + n;
    return GG.newlyUnlocked(before, state.love);
  };

  // Advance the simulation for however much real time has passed since lastTick.
  // Returns a health event (warning / got sick) when one fires, else null.
  GG.applyElapsed = function (state, now) {
    now = now || Date.now();
    const minutes = (now - state.lastTick) / 60000;
    const s = state.stats;
    const sick = GG.isSick(state);
    if (minutes > 0) {
      if (state.sleeping) {
        s.energy = GG.clamp(s.energy + GG.SLEEP_REGEN * minutes);
        s.hunger = GG.clamp(s.hunger - GG.DECAY.hunger * 0.5 * minutes);
        s.happiness = GG.clamp(s.happiness - GG.DECAY.happiness * 0.4 * minutes);
        s.cleanliness = GG.clamp(s.cleanliness - GG.DECAY.cleanliness * 0.5 * minutes);
        if (s.energy >= 100) state.sleeping = false; // wakes up rested
      } else {
        s.hunger = GG.clamp(s.hunger - GG.DECAY.hunger * minutes);
        // Being sick makes her mopey faster — a visible reason to take her to the doctor.
        s.happiness = GG.clamp(s.happiness - GG.DECAY.happiness * (sick ? 1.7 : 1) * minutes);
        s.energy = GG.clamp(s.energy - GG.DECAY.energy * minutes);
        s.cleanliness = GG.clamp(s.cleanliness - GG.DECAY.cleanliness * minutes);
      }
      state.lastTick = now;
    }

    // Any need in the red spoils today's first star.
    if (Math.min(s.hunger, s.happiness, s.energy, s.cleanliness) < GG.RED_LINE) {
      GG.trackCare(state, "red");
    }

    state.day = GG.dayNumber(state, now);
    return {
      health: minutes > 0 ? GG.tickHealth(state, minutes) : null,
      dayEnd: GG.closeDay(state, state.day),
    };
  };

  // Compute the "resting" facial mood from current needs.
  GG.computeMood = function (state) {
    if (state.sleeping) return "sleep";
    if (GG.isSick(state)) return "sad";
    const s = state.stats;
    const care = [
      ["hunger", s.hunger],
      ["happiness", s.happiness],
      ["energy", s.energy],
    ];
    const worst = care.reduce((a, b) => (b[1] < a[1] ? b : a));
    if (worst[1] < 25) return worst[0] === "hunger" ? "hungry" : "sad";
    return "idle";
  };

  GG.overallEmoji = function (state) {
    if (GG.isSick(state)) return GG.illnessOf(state).emoji;
    if (state.sleeping) return "😴";
    const s = state.stats;
    const avg = (s.hunger + s.happiness + s.energy + s.cleanliness) / 4;
    if (avg > 70) return "😊";
    if (avg > 45) return "🙂";
    if (avg > 25) return "😟";
    return "😢";
  };

  // Perform an action. Returns an event describing feedback for the UI.
  // `opts` carries action detail: { foodId } for feed, { popped, total } for clean.
  GG.doAction = function (state, name, opts) {
    const s = state.stats;
    opts = opts || {};

    if (state.sleeping && name !== "sleep") {
      return { blocked: true, speech: "zzz... (shhh, está durmiendo)" };
    }

    switch (name) {
      case "feed": {
        const food = GG.findFood(opts.foodId);
        const taste = GG.tasteOf(food, state);
        const isNew = food && !GG.foodTried(state, food.id);
        if (food && isNew) state.foods.tried.push(food.id);

        let love = GG.LOVE_GAIN.feed;
        if (taste === "fav") love = GG.LOVE_GAIN.favFood;
        if (taste === "yuck") love = GG.LOVE_GAIN.yuckFood;
        if (isNew) love += GG.LOVE_GAIN.newFood;
        // Eating well pays a little extra — the good habit has its own reward.
        if (food && food.health === "sana") love += GG.LOVE_GAIN.healthy;
        const unlocked = GG.addLove(state, love);
        const label = food ? food.label.toLowerCase() : "comida";
        if (food && food.health === "sana") GG.trackCare(state, "healthy");
        const health = GG.registerMeal(state, food);

        if (taste === "yuck") {
          // Comedy beat, not a punishment: barely any cost, big funny reaction.
          s.hunger = GG.clamp(s.hunger + 6);
          s.happiness = GG.clamp(s.happiness - 2);
          return {
            mood: "eating", hold: 1500, shake: true, love, unlocked, isNew, health,
            voice: "llorando",
            speech: GG.pick([
              "¡PUAJ! ¡" + label + " no! 😝",
              "¡buag! escupió el " + label + " 🤢",
              "¡nooo! ¡" + label + " no le gusta! 😝",
            ]),
            fx: ["😝", "💨", food ? food.emoji : "🍽️"],
          };
        }

        const steal = Math.random() < 0.22; // mañosa: a veces se lo come TODO
        if (taste === "fav") {
          s.hunger = GG.clamp(s.hunger + 38);
          s.happiness = GG.clamp(s.happiness + 16);
          s.cleanliness = GG.clamp(s.cleanliness - 4);
          return {
            mood: "love", hold: 1700, love, unlocked, isNew, health, voice: "feliz",
            speech: GG.pick([
              "¡GUGU GAGA! ¡su favorita! 😍",
              "¡" + (food ? food.label : "Ñam") + "! ¡la que más le gusta! 💖",
            ]),
            fx: ["😍", "💖", food ? food.emoji : "🍪"],
          };
        }
        s.hunger = GG.clamp(s.hunger + (steal ? 46 : 30));
        s.cleanliness = GG.clamp(s.cleanliness - 4);
        s.happiness = GG.clamp(s.happiness + (steal ? 8 : 3));
        return {
          mood: "eating", hold: 1400, love, unlocked, isNew, health,
          speech: steal
            ? "¡Ñam! ¡Se comió TODO el " + label + "! 😋"
            : GG.pick(["gugu gaga~ ñam", "¡ñam ñam!", "guu~ rico"]),
          fx: steal ? ["🍰", "🍗", "🍪"] : [food ? food.emoji : "🍼", "🍪"],
        };
      }
      case "play": {
        if (GG.isSick(state)) {
          const ill = GG.illnessOf(state);
          return {
            blocked: true,
            speech: "guu... no tiene ganas de jugar, está enfermita " + ill.emoji + " ¡llevala al doctor! 🩺",
          };
        }
        if (s.energy < GG.TIRED_LIMIT) {
          return {
            blocked: true,
            speech: "guu... está muy cansada para jugar 😩 ¡tiene que dormir! 😴",
          };
        }
        // `dryRun` asks "would this be allowed?" without applying anything —
        // used to decide whether to even open the mini-game chooser.
        if (opts.dryRun) return {};
        // Mini-game result: `score` of `total`. Playing with no game still works.
        const ratio = opts.total ? Math.max(0, Math.min(1, (opts.score || 0) / opts.total)) : 1;
        s.happiness = GG.clamp(s.happiness + 18 + 16 * ratio);
        s.energy = GG.clamp(s.energy - 12);
        s.hunger = GG.clamp(s.hunger - 6);
        const unlocked = GG.addLove(state, GG.LOVE_GAIN.play);
        return {
          mood: "happy", hold: 1400, love: GG.LOVE_GAIN.play, unlocked, voice: "feliz",
          speech: ratio > 0.85
            ? GG.pick(["¡GANARON! 🎉", "¡lo hiciste perfecto! ⭐"])
            : GG.pick(["¡yupi! 🎈", "gugu gaga ¡juega!", "¡otra vez! 🎉"]),
          fx: ["🎈", "⭐", "🎉"],
        };
      }
      // Doctor visit — only offered while she is actually sick.
      case "doctor": {
        return GG.cure(state) || { blocked: true, speech: "¡está sanita! 💪" };
      }
      // The bath is now the bubble mini-game: `popped` of `total` bubbles burst.
      case "clean": {
        const total = opts.total || 1;
        const popped = Math.max(0, Math.min(total, opts.popped || 0));
        const ratio = popped / total;
        s.cleanliness = GG.clamp(s.cleanliness + 30 + 24 * ratio);
        s.happiness = GG.clamp(s.happiness + 4 + 10 * ratio);
        GG.trackCare(state, "baths");
        const unlocked = GG.addLove(state, GG.LOVE_GAIN.clean);
        return {
          mood: "happy", hold: 1500, love: GG.LOVE_GAIN.clean, unlocked, voice: "feliz",
          speech: ratio > 0.8
            ? "¡TODAS las burbujas! ¡limpiecita! ✨"
            : ratio > 0.4
              ? GG.pick(["¡pop pop! 🫧", "¡qué divertido el baño! 🛁"])
              : GG.pick(["guu~ 🫧", "¡burbujas!"]),
          fx: ["🫧", "✨", "💧"],
        };
      }
      case "sleep": {
        // Going to bed filthy is not allowed; waking up always is.
        if (!state.sleeping && s.cleanliness < GG.DIRTY_SLEEP) {
          return {
            blocked: true,
            speech: "¡así de sucia no se puede dormir! 🛁 Primero el baño.",
          };
        }
        state.sleeping = !state.sleeping;
        return {
          toggleSleep: true,
          voice: state.sleeping ? "dormir" : null,
          speech: state.sleeping ? "zzz... buenas noches 🌙" : "¡buenos días! ☀️",
        };
      }
      case "pet": {
        s.happiness = GG.clamp(s.happiness + 4);
        const now = Date.now();
        const earns = !state.lastPetLove || now - state.lastPetLove >= GG.PET_LOVE_COOLDOWN;
        let love = 0, unlocked = [];
        if (earns) {
          state.lastPetLove = now;
          love = GG.LOVE_GAIN.pet;
          unlocked = GG.addLove(state, love);
        }
        return {
          mood: "love", hold: 1000, love, unlocked, voice: "mimos",
          speech: GG.pick(["gugu gaga♡", "guu~ ♡", "¡jiji!"]),
          fx: ["❤️", "💕"],
        };
      }
    }
    return {};
  };
})();
