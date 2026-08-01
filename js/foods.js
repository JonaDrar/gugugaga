// Food catalog: what Gugugaga loves, tolerates and absolutely refuses.
//
// Design note (this is a game for a 6-year-old): a disliked food is FUNNY, never
// sad. Refusing it costs almost nothing and always plays a comedy beat — the
// point is discovering reactions, not being punished for a wrong choice.
//
// `favIfHead` is a secret: the food is only a favourite while wearing that hood
// (fish for the penguin, carrot for the bunny). Mixing the wardrobe with the
// tray is the reward for paying attention.
(function () {
  const GG = (window.GG = window.GG || {});

  // taste  : "fav" (loves it) | "ok" (fine) | "yuck" (spits it out)
  // health : "sana" | "normal" | "chatarra"
  //
  // The tension is deliberate and is the whole lesson: her FAVOURITES (galletita,
  // helado, chocolate) are the junk ones. Eating too much junk in a row gives her
  // a stomach ache and a trip to the doctor, who says out loud why. Healthy food
  // pays a small extra ❤️ so the good habit has a visible reward too.
  GG.FOODS = [
    { id: "leche", label: "Leche", emoji: "🍼", taste: "ok", health: "sana" },
    { id: "galletita", label: "Galletita", emoji: "🍪", taste: "fav", health: "chatarra" },
    { id: "frutilla", label: "Frutilla", emoji: "🍓", taste: "fav", health: "sana" },
    { id: "banana", label: "Banana", emoji: "🍌", taste: "ok", health: "sana" },
    { id: "manzana", label: "Manzana", emoji: "🍎", taste: "ok", health: "sana" },
    { id: "pizza", label: "Pizza", emoji: "🍕", taste: "ok", health: "chatarra" },
    { id: "fideos", label: "Fideos", emoji: "🍜", taste: "ok", health: "normal" },
    { id: "queso", label: "Queso", emoji: "🧀", taste: "ok", health: "normal" },
    { id: "helado", label: "Helado", emoji: "🍦", taste: "fav", health: "chatarra" },
    { id: "chocolate", label: "Chocolate", emoji: "🍫", taste: "fav", health: "chatarra" },
    { id: "papas", label: "Papas fritas", emoji: "🍟", taste: "fav", health: "chatarra" },
    { id: "pescado", label: "Pescado", emoji: "🐟", taste: "ok", health: "sana", favIfHead: "penguin" },
    { id: "zanahoria", label: "Zanahoria", emoji: "🥕", taste: "ok", health: "sana", favIfHead: "bunny" },
    { id: "brocoli", label: "Brócoli", emoji: "🥦", taste: "yuck", health: "sana" },
    { id: "limon", label: "Limón", emoji: "🍋", taste: "yuck", health: "sana" },
  ];

  GG.HEALTH_ICON = { sana: "🥗", normal: "", chatarra: "🍟" };

  GG.findFood = (id) => GG.FOODS.find((f) => f.id === id) || null;

  // Taste right now — the secret foods depend on the hood being worn.
  GG.tasteOf = function (food, state) {
    if (!food) return "ok";
    if (food.favIfHead && state.cosmetics && state.cosmetics.head === food.favIfHead) return "fav";
    return food.taste;
  };

  GG.TASTE_ICON = { fav: "😍", ok: "🙂", yuck: "😝" };

  // Has she tried this one yet? (drives the album's "?" cards)
  GG.foodTried = (state, id) => !!(state.foods && state.foods.tried && state.foods.tried.indexOf(id) >= 0);

  GG.foodsProgress = function (state) {
    const tried = (state.foods && state.foods.tried) || [];
    return { done: tried.length, total: GG.FOODS.length };
  };
})();
