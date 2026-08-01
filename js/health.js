// Getting sick — the educational half of the game.
//
// Two habits have consequences, and the game always SAYS WHY out loud:
//   · too much junk food in a row  -> stomach ache -> syrup at the doctor
//   · staying dirty for too long   -> germs / cold  -> a jab at the doctor
//
// Three deliberate design rules, because the player is six:
//
// 1. WARN BEFORE PUNISHING. She always gets a "me duele un poquito la panza"
//    warning first, so the illness reads as a consequence she could have
//    avoided, not as bad luck.
// 2. THE DOCTOR IS THE GOOD GUY. The visit is short, it always works, and the
//    jab is described as quick and painless ("fue un segundito"). A game that
//    frames injections as a punishment for being bad would teach a child to
//    fear real ones — the opposite of what we want.
// 3. NOTHING IS PERMANENT. She never dies, never regresses; being sick just
//    makes her a bit sad and she does not feel like playing until she is cured.
(function () {
  const GG = (window.GG = window.GG || {});

  // How much junk in a row before her stomach complains, and how many real
  // minutes of being filthy before germs win.
  GG.JUNK_WARN = 3;
  GG.JUNK_LIMIT = 5;
  GG.JUNK_FORGIVE_MIN = 40;   // one junk point forgiven every 40 min of real time
  GG.DIRTY_WARN_MIN = 12;
  GG.DIRTY_LIMIT_MIN = 25;
  GG.DIRTY_THRESHOLD = 25;    // cleanliness below this counts as "filthy"

  GG.ILLNESSES = {
    panza: {
      id: "panza",
      label: "Dolor de panza",
      emoji: "🤢",
      cause: "Comió mucha comida chatarra 🍟🍫🍦",
      explain: "Cuando comemos muchos dulces y frituras seguidos, la panza se enoja y duele.",
      treatment: {
        id: "jarabe", label: "Darle el jarabe", emoji: "💊",
        text: "El doctor le dio una cucharadita de jarabe. ¡Sabía a frutilla! 😋",
      },
      advice: "Para que no le pase de nuevo: más frutas y verduras 🍎🥦, y los dulces de vez en cuando. 🙂",
    },
    microbios: {
      id: "microbios",
      label: "Resfrío",
      emoji: "🤧",
      cause: "Estuvo mucho tiempo sucia 🦠",
      explain: "En la suciedad viven microbios. Son tan chiquitos que no se ven, y nos hacen enfermar.",
      treatment: {
        id: "vacuna", label: "Ponerle la vacuna", emoji: "💉",
        text: "El doctor le puso la vacuna. Fue un segundito, casi no lo sintió… ¡y ya se siente mucho mejor! 💪",
      },
      advice: "Para que no le pase de nuevo: bañarse seguido 🛁 y lavarse las manos 🧼 antes de comer.",
    },
  };

  GG.defaultHealth = () => ({ sick: null, junk: 0, dirtyMin: 0, warned: null, cured: 0 });

  GG.isSick = (state) => !!(state.health && state.health.sick);
  GG.illnessOf = (state) => (GG.isSick(state) ? GG.ILLNESSES[state.health.sick] : null);

  // Called from applyElapsed. Returns a warning/illness event for the UI, or null.
  GG.tickHealth = function (state, minutes) {
    const h = state.health;
    if (!h) return null;

    // Junk is forgiven slowly over time — she is not doomed by one bad afternoon.
    if (minutes > 0 && h.junk > 0) {
      h.junkClock = (h.junkClock || 0) + minutes;
      while (h.junkClock >= GG.JUNK_FORGIVE_MIN && h.junk > 0) {
        h.junkClock -= GG.JUNK_FORGIVE_MIN;
        h.junk -= 1;
      }
    }

    if (h.sick) return null;

    if (state.stats.cleanliness < GG.DIRTY_THRESHOLD) h.dirtyMin += minutes;
    else h.dirtyMin = Math.max(0, h.dirtyMin - minutes * 2); // a bath cleans the slate fast

    if (h.dirtyMin >= GG.DIRTY_LIMIT_MIN) return GG.makeSick(state, "microbios");
    if (h.dirtyMin >= GG.DIRTY_WARN_MIN && h.warned !== "microbios") {
      h.warned = "microbios";
      return { warning: true, speech: "guu... me pica todo, estoy muy sucia 🦠" };
    }
    return null;
  };

  GG.makeSick = function (state, kind) {
    const h = state.health;
    h.sick = kind;
    h.sickSince = Date.now();
    GG.trackCare(state, "sick");
    h.warned = null;
    h.dirtyMin = 0;
    const ill = GG.ILLNESSES[kind];
    return {
      gotSick: true,
      mood: "sad",
      hold: 2600,
      voice: "llorando",
      speech: "¡buaaa! " + ill.emoji + " " + (kind === "panza" ? "¡le duele la panza!" : "¡se resfrió!"),
      fx: [ill.emoji, "😢"],
    };
  };

  // Record a meal and decide whether it tipped her over.
  GG.registerMeal = function (state, food) {
    const h = state.health;
    if (!h || !food) return null;
    if (food.health === "chatarra") h.junk += 1;
    else if (food.health === "sana") h.junk = Math.max(0, h.junk - 1);

    if (h.sick) return null;
    if (h.junk >= GG.JUNK_LIMIT) return GG.makeSick(state, "panza");
    if (h.junk >= GG.JUNK_WARN && h.warned !== "panza") {
      h.warned = "panza";
      return { warning: true, speech: "guu... me duele un poquito la panza 😖" };
    }
    return null;
  };

  // The doctor visit always works.
  GG.cure = function (state) {
    const ill = GG.illnessOf(state);
    if (!ill) return null;
    const h = state.health;
    h.sick = null;
    h.junk = 0;
    h.dirtyMin = 0;
    h.warned = null;
    h.cured += 1;
    state.stats.happiness = GG.clamp(state.stats.happiness + 25);
    if (ill.id === "microbios") state.stats.cleanliness = GG.clamp(state.stats.cleanliness + 30);
    const unlocked = GG.addLove(state, 5);
    return {
      cured: true, illness: ill, unlocked, love: 5,
      mood: "happy", hold: 2000, voice: "feliz",
      speech: "¡gugu gaga! ¡ya se siente bien! 💪",
      fx: ["✨", "💪", "❤️"],
    };
  };
})();
