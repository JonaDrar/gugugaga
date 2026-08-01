// Scenes (where Gugugaga lives) + photo mode.
//
// Scenes are pure CSS: four colours driving the page gradient plus a handful of
// decorative emoji. No artwork needed, and swapping one repaints the whole
// screen — the cheapest "this feels new" lever in the game.
//
// The scene variables are set on <html>, NOT on <body>, so the `body.night`
// rule can still override them while she sleeps (an inline style on body would
// otherwise beat the class).
(function () {
  const GG = (window.GG = window.GG || {});

  // Each scene = 4 gradient colours + optional decorative emoji.
  //
  // `img` (optional): a real background picture, e.g. "assets/art/bg-playa.png".
  // It is painted OVER the gradient with `cover`, so the gradient keeps showing
  // through if the aspect ratio does not match and stays as the fallback while
  // the file does not exist yet. Recommended: 1080×1920 (portrait 9:16), with
  // the horizon around 60% of the height and the lower third fairly empty —
  // that is where Gugugaga stands.
  //
  // `stars` (optional): how many ⭐ are needed to visit. Stars come from
  // consistent daily care (js/care.js), not from tapping.
  GG.SCENES = [
    {
      id: "cielo", label: "Cielo", preview: "☁️", img: "assets/art/bg-cielo.webp",
      c: ["#a7e0ff", "#d9f2ff", "#bfeaff", "#a9e0fb"],
      deco: [
        { e: "☁️", left: 8, top: 10, size: 42 },
        { e: "☁️", left: 72, top: 20, size: 32 },
        { e: "🌈", left: 78, top: 46, size: 34 },
      ],
    },
    {
      id: "cuarto", label: "Cuarto", preview: "🧸", img: "assets/art/bg-cuarto.webp", stars: 2,
      c: ["#ffe3ef", "#fff5f9", "#e8c9a0", "#d3aa7c"],
      deco: [
        { e: "🪟", left: 10, top: 12, size: 46 },
        { e: "🖼️", left: 76, top: 14, size: 36 },
        { e: "🧸", left: 82, top: 60, size: 40 },
      ],
    },
    {
      id: "playa", label: "Playa", preview: "🏖️", img: "assets/art/bg-playa.webp", stars: 5,
      c: ["#8fd8ff", "#dff4ff", "#ffe7b3", "#f3cd85"],
      deco: [
        { e: "☀️", left: 78, top: 8, size: 44 },
        { e: "🌴", left: 6, top: 30, size: 54 },
        { e: "🐚", left: 84, top: 74, size: 28 },
      ],
    },
    {
      id: "jardin", label: "Jardín", preview: "🌷", img: "assets/art/bg-jardin.webp", stars: 9,
      c: ["#bfe9ff", "#e8f8ff", "#8fd97a", "#66bf58"],
      deco: [
        { e: "🦋", left: 74, top: 26, size: 32 },
        { e: "🌷", left: 8, top: 72, size: 34 },
        { e: "🌼", left: 88, top: 78, size: 30 },
      ],
    },
  ];

  GG.findScene = (id) => GG.SCENES.find((s) => s.id === id) || GG.SCENES[0];

  GG.sceneUnlocked = (state, sc) => GG.starsUnlocked(state, sc.stars);

  GG.applyScene = function (state, decoEl) {
    const sc = GG.findScene(state.scene);
    const r = document.documentElement.style;
    r.setProperty("--sky-top", sc.c[0]);
    r.setProperty("--sky-bot", sc.c[1]);
    r.setProperty("--floor", sc.c[2]);
    r.setProperty("--floor-bot", sc.c[3]);
    // Custom picture, if this scene has one. Missing files simply never paint,
    // leaving the gradient — no broken-image box.
    //
    // La ruta se pasa ABSOLUTA a propósito. Un `url()` dentro de una variable
    // CSS se resuelve relativo a la HOJA DE ESTILOS donde se usa, no al
    // documento: "assets/art/x.webp" terminaba pidiendo "css/assets/art/x.webp"
    // y el fondo no aparecía nunca. `new URL(...)` lo resuelve contra la página,
    // que además funciona igual servido desde un subdirectorio (GitHub Pages).
    r.setProperty(
      "--scene-img",
      sc.img ? 'url("' + new URL(sc.img, document.baseURI).href + '")' : "none"
    );
    if (!decoEl) return;
    decoEl.innerHTML = "";
    // Los emoji decorativos eran el sustituto de no tener fondo dibujado. Con
    // una foto de verdad estorban: nubes de emoji flotando sobre nubes pintadas.
    if (sc.img) return;
    sc.deco.forEach((d) => {
      const s = document.createElement("span");
      s.className = "deco";
      s.textContent = d.e;
      s.style.left = d.left + "%";
      s.style.top = d.top + "%";
      s.style.fontSize = d.size + "px";
      decoEl.appendChild(s);
    });
  };

  // ---------- photo mode ----------
  // Repaints the current scene + the layered character onto a canvas, reading
  // the live <img> layers so the photo always matches what is on screen.
  const W = 720, H = 900;

  GG.Photo = {
    width: W,
    height: H,

    // charEls = { img, accImgs: [<img>...] }; stickers = [{e,x,y,size}]
    draw(canvas, state, charEls, stickers) {
      const ctx = canvas.getContext("2d");
      canvas.width = W;
      canvas.height = H;
      const sc = GG.findScene(state.scene);
      const night = !!state.sleeping;
      const cols = night ? ["#2a2f5a", "#3b3f75", "#4a4f8a", "#343a6b"] : sc.c;

      const horizon = H * 0.62;
      let g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, cols[0]);
      g.addColorStop(1, cols[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, horizon);
      g = ctx.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, cols[2]);
      g.addColorStop(1, cols[3]);
      ctx.fillStyle = g;
      ctx.fillRect(0, horizon, W, H - horizon);

      // Custom background picture, cover-fitted like CSS `background-size: cover`.
      const bg = charEls.bg;
      if (!night && bg && bg.complete && bg.naturalWidth) {
        const scale = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
        const bw = bg.naturalWidth * scale, bh = bg.naturalHeight * scale;
        try { ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh); } catch (e) { /* ignore */ }
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (!sc.img) {
        sc.deco.forEach((d) => {
          ctx.font = d.size * 1.5 + "px serif";
          ctx.fillText(d.e, (d.left / 100) * W, (d.top / 100) * H);
        });
      }

      // Character: square stage, same anchor math as the live game.
      const S = W * 0.78;
      const x0 = (W - S) / 2;
      const y0 = H * 0.60 - S * 0.62;
      const safe = (img, dx, dy, dw, dh) => {
        if (img && img.complete && img.naturalWidth) {
          try { ctx.drawImage(img, dx, dy, dw, dh); } catch (e) { /* ignore */ }
        }
      };
      // Capas de atrás (pelo largo, cola) ANTES de la niña; el resto, después.
      const layer = (im) => {
        const top = parseFloat(im.style.top) || 0;
        const left = parseFloat(im.style.left) || 0;
        const w = parseFloat(im.style.width) || 100;
        safe(im, x0 + (left / 100) * S, y0 + (top / 100) * S, (w / 100) * S, (w / 100) * S);
      };
      (charEls.backImgs || []).forEach(layer);
      safe(charEls.img, x0, y0, S, S);
      (charEls.accImgs || []).forEach((im) => {
        const top = parseFloat(im.style.top) || 0;
        const left = parseFloat(im.style.left) || 0;
        const w = parseFloat(im.style.width) || 100;
        safe(im, x0 + (left / 100) * S, y0 + (top / 100) * S, (w / 100) * S, (w / 100) * S);
      });

      // Las mascotas, paradas al lado de ella sobre la misma línea de piso.
      // Los pies dibujados están al 93% del cuadrado del personaje (el arte deja
      // aire abajo), así que ese es el "suelo" al que hay que apoyarlas.
      //
      // Se reparten a los dos costados alternando, para que la foto quede
      // equilibrada y ninguna le tape la cara aunque tenga las cuatro puestas.
      const buddies = charEls.buddies || [];
      const feet = y0 + S * 0.93;
      const SPOTS = [0.82, 0.16, 0.94, 0.05];
      buddies.slice(0, SPOTS.length).forEach((buddy, i) => {
        const cx = SPOTS[i] * W;
        // Si hay ilustración se usa la MISMA <img> que está en pantalla, así la
        // foto sale con el ánimo que tenía en ese momento.
        const bi = (charEls.buddyImgs || [])[i];
        if (bi && bi.complete && bi.naturalWidth) {
          const bs = W * 0.17;
          try { ctx.drawImage(bi, cx - bs / 2, feet - bs, bs, bs); } catch (e) { /* ignore */ }
        } else {
          const fs = W * 0.12;
          ctx.font = fs + "px serif";
          ctx.fillText(buddy.emoji, cx, feet - fs / 2);
        }
      });

      (stickers || []).forEach((st) => {
        ctx.font = st.size + "px serif";
        ctx.fillText(st.e, st.x * W, st.y * H);
      });

      // Polaroid frame + caption
      const b = 26;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = b * 2;
      ctx.strokeRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, H - 108, W, 108);
      ctx.fillStyle = "#3a3550";
      ctx.font = "700 40px ui-rounded, system-ui, sans-serif";
      ctx.fillText((state.name || "Gugugaga") + "  ·  Día " + state.day, W / 2, H - 54);
      return canvas;
    },
  };
})();
