// Estrellas ⭐ — the reward for CONSISTENT care, as opposed to hearts ❤️.
//
// Hearts are farmable on purpose: they tick up with every tap, so a five-year-old
// gets a reward in the first thirty seconds. Stars are the opposite and can only
// be earned by looking after her well across a whole day:
//
//   · you cannot rush them   — they are granted once, at midnight
//   · you cannot grind them  — the goals measure what did NOT happen (no red
//                              bars, no illness) plus a real routine
//   · you cannot fake them   — the routine goal needs healthy meals and a bath,
//                              which cost time and cannot be spammed
//
// The three goals are visible all day in the "Tarjeta del día" so she can see
// what is still missing — it works like a chore chart, which is exactly the
// habit we are trying to build.
(function () {
  const GG = (window.GG = window.GG || {});

  GG.RED_LINE = 15;        // any need under this ruins the "sin rojo" goal
  GG.GOAL_HEALTHY = 2;     // healthy meals needed for the routine goal
  GG.GOAL_BATHS = 1;

  GG.CARE_GOALS = [
    {
      id: "sinRojo",
      icon: "📊",
      label: "No dejar ninguna barra en rojo",
      test: (t) => !t.red,
      progress: (t) => (t.red ? "se puso en rojo" : "todo bien"),
    },
    {
      id: "sana",
      icon: "💪",
      label: "Que no se enferme",
      test: (t) => !t.sick,
      progress: (t) => (t.sick ? "se enfermó" : "sanita"),
    },
    {
      id: "rutina",
      icon: "🥗",
      label: GG.GOAL_HEALTHY + " comidas sanas y " + GG.GOAL_BATHS + " baño",
      test: (t) => t.healthy >= GG.GOAL_HEALTHY && t.baths >= GG.GOAL_BATHS,
      progress: (t) => t.healthy + "/" + GG.GOAL_HEALTHY + " 🥗 · " + t.baths + "/" + GG.GOAL_BATHS + " 🛁",
    },
  ];

  GG.newToday = (day) => ({ day, red: false, sick: false, healthy: 0, baths: 0 });

  // Record something that happened today. Safe to call before migration.
  GG.trackCare = function (state, what, n) {
    const t = state.today;
    if (!t) return;
    if (what === "red") t.red = true;
    else if (what === "sick") t.sick = true;
    else t[what] = (t[what] || 0) + (n || 1);
  };

  GG.goalStatus = function (state) {
    const t = state.today || GG.newToday(state.day);
    return GG.CARE_GOALS.map((g) => ({
      id: g.id, icon: g.icon, label: g.label,
      ok: g.test(t), progress: g.progress(t),
    }));
  };

  // Close the finished day and hand out its stars. Returns a summary, or null
  // when there was nothing to close.
  GG.closeDay = function (state, newDay) {
    const t = state.today;
    if (!t || t.day === newDay) return null;
    const goals = GG.CARE_GOALS.map((g) => ({ id: g.id, label: g.label, ok: g.test(t) }));
    const earned = goals.filter((g) => g.ok).length;
    const before = state.stars || 0;
    state.stars = before + earned;
    if (earned === GG.CARE_GOALS.length) state.streak = (state.streak || 0) + 1;
    else state.streak = 0;
    state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
    state.today = GG.newToday(newDay);
    return {
      earned, goals, total: GG.CARE_GOALS.length, stars: state.stars, streak: state.streak,
      // Lo que estas estrellas acaban de abrir, para poder anunciarlo.
      buddies: GG.newlyUnlockedBuddies ? GG.newlyUnlockedBuddies(before, state.stars) : [],
      scenes: GG.SCENES ? GG.SCENES.filter((s) => s.stars > before && s.stars <= state.stars) : [],
    };
  };

  // Things gated behind stars (currently the places she can visit).
  GG.starsUnlocked = function (state, cost) {
    return !cost || (state.stars || 0) >= cost;
  };
})();
