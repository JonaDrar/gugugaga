// Mini-games. Each one renders into a host element and calls done({score,total}).
//
// They are deliberately DIFFERENT genres rather than one game re-skinned:
//   · burbujas  -> reflexes (bath)
//   · simón     -> sequence memory
//   · memotest  -> pair memory
//   · globos    -> selective attention (only pop the colour asked for)
//
// Every game has a visible way out: at six, being trapped in a game you can't
// finish is the fastest way to make a kid put the tablet down.
(function () {
  const GG = (window.GG = window.GG || {});

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  GG.MiniGames = {};

  // ---------------------------------------------------------------- burbujas
  // Bath game: bubbles rise, pop as many as you can.
  GG.MiniGames.burbujas = function (host, done) {
    const TOTAL = 12;
    let popped = 0, alive = true, timers = [];
    host.innerHTML = "";
    const hud = el("div", "mg-hud", '<span id="mgScore">0</span> 🫧');
    const field = el("div", "bubble-field");
    host.appendChild(hud);
    host.appendChild(field);

    for (let i = 0; i < TOTAL; i++) {
      timers.push(setTimeout(() => {
        if (!alive) return;
        const b = el("div", "bubble", '<span class="bubble-skin"></span>');
        const size = 34 + Math.random() * 38;
        b.style.width = b.style.height = size + "px";
        b.style.left = 6 + Math.random() * 78 + "%";
        b.style.animationDuration = 3.4 + Math.random() * 1.6 + "s";
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          if (b.classList.contains("pop")) return;
          b.classList.add("pop");
          popped++;
          hud.querySelector("#mgScore").textContent = String(popped);
          GG.Audio.play("pet");
          setTimeout(() => b.remove(), 240);
        });
        field.appendChild(b);
        timers.push(setTimeout(() => b.remove(), 5200));
      }, i * 320));
    }

    timers.push(setTimeout(finish, TOTAL * 320 + 2200));
    function finish() {
      if (!alive) return;
      alive = false;
      timers.forEach(clearTimeout);
      host.innerHTML = "";
      done({ score: popped, total: TOTAL });
    }
    return finish;
  };

  // ------------------------------------------------------------------ simón
  // Watch the sequence, repeat it. One extra step each round.
  GG.MiniGames.simon = function (host, done) {
    const PADS = [
      { id: 0, cls: "p-red", tone: 330 },
      { id: 1, cls: "p-yellow", tone: 392 },
      { id: 2, cls: "p-green", tone: 494 },
      { id: 3, cls: "p-blue", tone: 587 },
    ];
    const ROUNDS = 4;
    let seq = [], input = [], round = 0, accepting = false, alive = true, timers = [];

    host.innerHTML = "";
    const title = el("div", "mg-title", "Mirá y repetí 🎵");
    const grid = el("div", "simon-grid");
    const pads = PADS.map((p) => {
      const b = el("button", "pad " + p.cls);
      b.addEventListener("click", () => tapPad(p));
      grid.appendChild(b);
      return b;
    });
    host.appendChild(title);
    host.appendChild(grid);
    host.appendChild(quitBtn(finish));

    function flash(p, ms) {
      pads[p.id].classList.add("lit");
      GG.Audio.tone(p.tone, ms / 1000);
      timers.push(setTimeout(() => pads[p.id].classList.remove("lit"), ms));
    }

    function nextRound() {
      if (!alive) return;
      round++;
      if (round > ROUNDS) return finish();
      title.textContent = "Ronda " + round + " de " + ROUNDS + " — mirá 👀";
      seq.push(PADS[Math.floor(Math.random() * 4)]);
      input = [];
      accepting = false;
      seq.forEach((p, i) => timers.push(setTimeout(() => flash(p, 420), 700 + i * 620)));
      timers.push(setTimeout(() => {
        if (!alive) return;
        accepting = true;
        title.textContent = "¡Ahora vos! 👆";
      }, 700 + seq.length * 620));
    }

    function tapPad(p) {
      if (!accepting || !alive) return;
      flash(p, 220);
      input.push(p.id);
      const i = input.length - 1;
      if (input[i] !== seq[i].id) {
        accepting = false;
        title.textContent = "¡Casi! 😅";
        GG.Audio.play("cry");
        return timers.push(setTimeout(finish, 900));
      }
      if (input.length === seq.length) {
        accepting = false;
        title.textContent = "¡Muy bien! ⭐";
        GG.Audio.play("clean");
        timers.push(setTimeout(nextRound, 800));
      }
    }

    function finish() {
      if (!alive) return;
      alive = false;
      timers.forEach(clearTimeout);
      host.innerHTML = "";
      done({ score: Math.max(0, round - 1), total: ROUNDS });
    }

    timers.push(setTimeout(nextRound, 400));
    return finish;
  };

  // --------------------------------------------------------------- memotest
  // Find the pairs. No timer and no way to lose — at six, finishing IS the win.
  GG.MiniGames.memo = function (host, done) {
    const FACES = ["🍓", "🍪", "🐧", "🐰", "🎈", "⭐"];
    const cards = shuffle(FACES.concat(FACES));
    let first = null, lock = false, found = 0, moves = 0, alive = true, timers = [];

    host.innerHTML = "";
    const title = el("div", "mg-title", "Encontrá las parejas 🃏");
    const grid = el("div", "memo-grid");
    host.appendChild(title);
    host.appendChild(grid);
    host.appendChild(quitBtn(finish));

    cards.forEach((face) => {
      const c = el("button", "memo-card", "<span>" + face + "</span>");
      c.dataset.face = face;
      c.addEventListener("click", () => flip(c));
      grid.appendChild(c);
    });

    function flip(c) {
      if (lock || !alive || c.classList.contains("open") || c.classList.contains("done")) return;
      c.classList.add("open");
      GG.Audio.tone(520, 0.1);
      if (!first) { first = c; return; }
      moves++;
      if (first.dataset.face === c.dataset.face) {
        first.classList.add("done");
        c.classList.add("done");
        first = null;
        found++;
        GG.Audio.play("clean");
        title.textContent = "¡Pareja! " + found + " de " + FACES.length + " ⭐";
        if (found === FACES.length) timers.push(setTimeout(finish, 700));
      } else {
        lock = true;
        const a = first;
        first = null;
        timers.push(setTimeout(() => {
          a.classList.remove("open");
          c.classList.remove("open");
          lock = false;
        }, 750));
      }
    }

    function finish() {
      if (!alive) return;
      alive = false;
      timers.forEach(clearTimeout);
      host.innerHTML = "";
      done({ score: found, total: FACES.length, moves });
    }
    return finish;
  };

  // ----------------------------------------------------------------- globos
  // Only pop the colour she was asked for. Popping a wrong one costs a point,
  // so it trains paying attention rather than tapping everything.
  GG.MiniGames.globos = function (host, done) {
    const COLORS = [
      { id: "rojo", e: "🔴", name: "rojos" },
      { id: "azul", e: "🔵", name: "azules" },
      { id: "verde", e: "🟢", name: "verdes" },
      { id: "amarillo", e: "🟡", name: "amarillos" },
    ];
    const TOTAL = 10;
    const target = COLORS[Math.floor(Math.random() * COLORS.length)];
    let score = 0, spawned = 0, alive = true, timers = [];

    host.innerHTML = "";
    const title = el("div", "mg-title", "¡Reventá solo los " + target.name + " " + target.e + "!");
    const hud = el("div", "mg-hud", '<span id="mgScore">0</span> ' + target.e);
    const field = el("div", "bubble-field");
    host.appendChild(title);
    host.appendChild(hud);
    host.appendChild(field);
    host.appendChild(quitBtn(finish));

    const spawn = setInterval(() => {
      if (!alive) return;
      if (spawned >= TOTAL + 8) return;
      spawned++;
      // Guarantee a healthy share of the target colour.
      const c = Math.random() < 0.5 ? target : COLORS[Math.floor(Math.random() * COLORS.length)];
      const b = el("div", "balloon", c.e);
      b.style.left = 6 + Math.random() * 78 + "%";
      b.style.animationDuration = 3.6 + Math.random() * 1.4 + "s";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (b.dataset.gone) return;
        b.dataset.gone = "1";
        if (c.id === target.id) { score++; GG.Audio.tone(700, 0.12); }
        else { score = Math.max(0, score - 1); GG.Audio.tone(180, 0.18); }
        hud.querySelector("#mgScore").textContent = String(score);
        b.classList.add("pop");
        setTimeout(() => b.remove(), 220);
      });
      field.appendChild(b);
      timers.push(setTimeout(() => b.remove(), 5400));
    }, 480);

    timers.push(setTimeout(finish, 9500));
    function finish() {
      if (!alive) return;
      alive = false;
      clearInterval(spawn);
      timers.forEach(clearTimeout);
      host.innerHTML = "";
      done({ score: Math.min(score, TOTAL), total: TOTAL });
    }
    return finish;
  };

  function quitBtn(fn) {
    const b = el("button", "mg-quit", "Listo ✋");
    b.addEventListener("click", fn);
    return b;
  }

  GG.PLAY_MENU = [
    { id: "simon", label: "Simón dice", emoji: "🎵" },
    { id: "memo", label: "Memotest", emoji: "🃏" },
    { id: "globos", label: "Globos", emoji: "🎈" },
  ];
})();
