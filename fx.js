// Belohnungs-Effekte: Partikel-Engine (Canvas) und Animations-Szenen.
(() => {
  const COLORS = ['#ff5c8a', '#ffb547', '#4cd3a0', '#5cb8ff', '#b57bff', '#ffd93d'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // Keine Vibration: Web-Apps auf dem Handy unterstützen sie nicht zuverlässig. tap/haptic bleiben als leere Funktionen,
  // damit die vielen Aufrufstellen nicht angefasst werden müssen.
  const tap = () => {};
  const haptic = () => {};

  // ---------- Partikel-Engine ----------
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:30';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0;
  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  const P = [];
  let raf = null;
  function add(p) {
    P.push(Object.assign({
      x: W / 2, y: H / 2, vx: 0, vy: 0, g: .25, drag: .99, rot: rnd(0, 6.28), vr: rnd(-.2, .2),
      size: 9, life: 220, age: 0, shape: 'rect', color: pick(COLORS), wobble: 0, phase: rnd(0, 6.28),
      bounce: 0, flutter: true, grow: 0
    }, p));
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.age++;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx + (p.wobble ? Math.sin(p.age * .05 + p.phase) * p.wobble : 0);
      p.y += p.vy;
      p.rot += p.vr;
      p.size += p.grow;
      if (p.emit) p.emit(p);
      if (p.bounce && p.y > H - p.size / 2 && p.vy > 0) {
        p.y = H - p.size / 2; p.vy *= -p.bounce; p.vx *= .85;
        if (Math.abs(p.vy) < 1) p.vy = 0;
      }
      if (p.age > p.life || p.y > H + 80 || p.y < -150 || p.size <= 0) { P.splice(i, 1); if (p.onEnd) p.onEnd(p); continue; }
      const fadeStart = p.life * .7;
      ctx.globalAlpha = (p.age > fadeStart ? Math.max(0, 1 - (p.age - fadeStart) / (p.life - fadeStart)) : 1)
        * (p.twinkle ? .35 + .65 * Math.abs(Math.sin(p.age * .15 + p.phase)) : 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size;
      if (p.shape === 'rect') {
        ctx.scale(1, p.flutter ? Math.cos(p.age * .18 + p.phase) : 1);
        ctx.fillStyle = p.color; ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      } else if (p.shape === 'circle') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 6.283); ctx.fill();
      } else if (p.shape === 'spark') {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
        g.addColorStop(0, '#fff'); g.addColorStop(.3, p.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.283); ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.283); ctx.stroke();
      } else if (p.shape === 'bubble') {
        const g = ctx.createRadialGradient(-s * .3, -s * .3, s * .05, 0, 0, s);
        g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.25, 'rgba(255,255,255,.15)');
        g.addColorStop(.85, `hsla(${(p.age * 3 + p.phase * 60) % 360},90%,70%,.35)`); g.addColorStop(1, 'rgba(255,255,255,.6)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.283); ctx.fill();
      } else if (p.shape === 'emoji') {
        if (p.flap) ctx.scale(.35 + .65 * Math.abs(Math.cos(p.age * .35)), 1);
        ctx.font = `${s}px system-ui, "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    raf = P.length ? requestAnimationFrame(loop) : (ctx.clearRect(0, 0, W, H), null);
  }

  // ---------- Bausteine ----------
  function cannon(fromLeft, n = 70) {
    const x = fromLeft ? -10 : W + 10, y = H * .85;
    for (let i = 0; i < n; i++) {
      const ang = rnd(.95, 1.3), sp = rnd(14, 24);
      add({ x, y, vx: (fromLeft ? 1 : -1) * Math.cos(ang) * sp, vy: -Math.sin(ang) * sp, g: .32, drag: .975, size: rnd(7, 13), life: rnd(160, 240) });
    }
  }
  function burst(x, y, n = 60, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), sp = rnd(2, opts.speed || 9);
      const q = typeof opts.p === 'function' ? opts.p() : (opts.p || {});
      add(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: .18, drag: .97, size: rnd(6, 11), life: rnd(90, 150) }, q));
    }
  }
  function rain(n, p = {}, spread = 1200) {
    for (let i = 0; i < n; i++) {
      const q = typeof p === 'function' ? p() : p;
      setTimeout(() => add(Object.assign({ x: rnd(0, W), y: -30, vx: rnd(-1, 1), vy: rnd(2, 5), g: .08, drag: .995, size: rnd(7, 12), life: 400, wobble: .6 }, q)), rnd(0, spread));
    }
  }
  function firework(x, y, delay = 0) {
    setTimeout(() => {
      const color = pick(COLORS);
      add({
        x, y: H + 10, vx: rnd(-.5, .5), vy: -Math.sqrt(2 * .22 * (H + 10 - y)), g: .22, drag: 1, shape: 'spark', size: 7, color: '#fff', life: 400,
        onEnd: null, flutter: false
      });
      const rocket = P[P.length - 1];
      const t = Math.abs(rocket.vy / rocket.g);
      rocket.life = t;
      rocket.onEnd = r => {
        tap();
        for (let i = 0; i < 70; i++) {
          const a = (i / 70) * 6.283, sp = rnd(3, 6.5);
          add({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: .06, drag: .965, shape: 'spark', size: rnd(4, 7), color, life: rnd(70, 100), flutter: false });
        }
      };
    }, delay);
  }
  const center = () => [W / 2, H * .38];

  // ---------- Die 10 Szenen ----------
  // emoji = Hauptfigur im Belohnungsfenster, anim = CSS-Animation, run = Partikel, buzz = Haptik-Muster (ms)
  const SCENES = {
    konfetti: {
      name: 'Konfetti-Kanone', emoji: '🎉', anim: 'pop',
      run() { cannon(true); cannon(false); setTimeout(() => rain(40, {}, 900), 500); },
      buzz: [0, 90, 180]
    },
    feuerwerk: {
      name: 'Feuerwerk', emoji: '🎆', anim: 'pop',
      run() { [0, 350, 700, 1050, 1500].forEach(d => firework(rnd(W * .2, W * .8), rnd(H * .15, H * .4), d)); },
      buzz: [0]
    },
    sterne: {
      name: 'Sternenregen', emoji: '⭐', anim: 'spin',
      run() {
        const [x, y] = center();
        burst(x, y, 24, { speed: 12, p: () => ({ shape: 'emoji', emoji: '⭐', size: rnd(18, 28), g: .25, flutter: false }) });
        setTimeout(() => rain(30, () => ({ shape: 'emoji', emoji: pick(['⭐', '✨', '🌟']), size: rnd(16, 26), flutter: false })), 300);
      },
      buzz: [0, 100, 200, 300, 400]
    },
    herzen: {
      name: 'Herzen', emoji: '💖', anim: 'heartbeat',
      run() {
        for (let i = 0; i < 34; i++) setTimeout(() => add({
          x: rnd(0, W), y: H + 30, vy: rnd(-4, -2.2), vx: 0, g: -.01, drag: 1, shape: 'emoji',
          emoji: pick(['💖', '💗', '❤️', '💕', '🩷']), size: rnd(20, 36), life: 360, wobble: 1.2, vr: 0, rot: 0, flutter: false
        }), rnd(0, 1500));
      },
      buzz: [0, 140, 700, 840, 1400, 1540]   // Herzschlag
    },
    muenzen: {
      name: 'Münzregen', emoji: '🪙', anim: 'flip',
      run() {
        for (let i = 0; i < 45; i++) setTimeout(() => add({
          x: rnd(20, W - 20), y: -30, vx: rnd(-1.5, 1.5), vy: rnd(1, 4), g: .35, drag: .995, shape: 'emoji', emoji: pick(['🪙', '🪙', '💰', '💶']),
          size: rnd(22, 32), life: 300, bounce: .45, vr: rnd(-.1, .1), flutter: false
        }), rnd(0, 1400));
      },
      buzz: [0, 120, 240, 360, 480, 600, 720, 840]
    },
    flamme: {
      name: 'Flammen-Serie', emoji: '🔥', anim: 'flame',
      run() {
        const [x, y] = center();
        for (let i = 0; i < 80; i++) setTimeout(() => add({
          x: x + rnd(-40, 40), y: y + 40, vx: rnd(-1, 1), vy: rnd(-5, -2), g: -.03, drag: .98, shape: 'spark',
          color: pick(['#ff9a3d', '#ffcf3d', '#ff5c3d']), size: rnd(4, 8), life: rnd(50, 90), flutter: false, grow: -.04
        }), rnd(0, 1600));
      },
      buzz: [0, 60, 120, 180, 240]
    },
    einhorn: {
      name: 'Einhorn-Hüpfer', emoji: '🦄', anim: 'hop',
      run() {
        const [x, y] = center();
        [0, 600, 1200].forEach(d => setTimeout(() => burst(x, y + 60, 40, { speed: 8, p: { g: .25 } }), d + 300));
      },
      buzz: [300, 900, 1500]
    },
    regenbogen: {
      name: 'Regenbogen', emoji: '🌈', anim: 'rainbow',
      run() {
        const [x, y] = center();
        setTimeout(() => burst(x, y, 50, { speed: 7, p: { shape: 'spark', g: .03, size: rnd(4, 7), flutter: false } }), 900);
      },
      buzz: [0, 300, 600, 900]
    },
    ballons: {
      name: 'Ballons', emoji: '🎈', anim: 'float',
      run() {
        for (let i = 0; i < 18; i++) setTimeout(() => add({
          x: rnd(20, W - 20), y: H + 40, vy: rnd(-3.5, -2), g: -.005, drag: 1, shape: 'emoji', emoji: pick(['🎈', '🎈', '🎈', '🎁']),
          size: rnd(34, 50), life: 400, wobble: .8, vr: 0, rot: rnd(-.15, .15), flutter: false,
          onEnd: b => { if (b.y > 0) burst(b.x, b.y, 14, { speed: 5 }); }
        }), rnd(0, 1200));
      },
      buzz: [0, 200, 400]
    },
    glanz: {
      name: 'Medaille', emoji: '🏅', anim: 'glow',
      run() {
        const [x, y] = center();
        [0, 250, 500].forEach(d => setTimeout(() => add({ x, y, shape: 'ring', size: 30, grow: 5, g: 0, drag: 1, vr: 0, life: 45, color: pick(COLORS), flutter: false }), d));
        setTimeout(() => burst(x, y, 40, { speed: 10, p: { shape: 'spark', g: .05, flutter: false, color: '#ffd93d' } }), 200);
      },
      buzz: [0, 40, 80, 500]
    },
    galaxie: {
      name: 'Galaxie', emoji: '🌌', anim: 'orbit', rays: true,
      run() {
        const [x, y] = center();
        for (let i = 0; i < 140; i++) setTimeout(() => {
          const a = i * .45, sp = 2 + i * .03;
          add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, drag: .99, shape: 'spark', size: rnd(3, 6),
                color: `hsl(${(i * 7) % 360},90%,65%)`, life: 110, flutter: false, twinkle: true });
        }, i * 10);
      },
      buzz: [0, 300, 600, 900, 1200]
    },
    seifenblasen: {
      name: 'Seifenblasen', emoji: '🫧', anim: 'float',
      run() {
        for (let i = 0; i < 26; i++) setTimeout(() => add({
          x: rnd(20, W - 20), y: H + 30, vx: 0, vy: rnd(-3.2, -1.6), g: -.004, drag: 1, shape: 'bubble', size: rnd(12, 30),
          wobble: 1.2, life: rnd(90, 220), vr: 0, flutter: false,
          onEnd: b => { tap(); burst(b.x, b.y, 10, { speed: 4, p: { shape: 'spark', color: '#bfe8ff', size: 3, g: .05, life: 30, flutter: false } }); }
        }), rnd(0, 1600));
      },
      buzz: [0]
    },
    blueten: {
      name: 'Blütenregen', emoji: '🌸', anim: 'pop', rays: true,
      run() {
        const [x, y] = center();
        burst(x, y, 30, { speed: 9, p: () => ({ shape: 'emoji', emoji: '🌸', size: rnd(16, 24), g: .12, flutter: false, wobble: .8 }) });
        setTimeout(() => rain(40, () => ({ shape: 'emoji', emoji: pick(['🌸', '🌷', '🌼', '💮']), size: rnd(16, 24), flutter: false, wobble: 1.4, vy: 1.5, g: .03 })), 400);
      },
      buzz: [0, 120, 240]
    },
    rakete: {
      name: 'Rakete', emoji: '🚀', anim: 'launch',
      run() {
        const tx = W * .78, ty = H * .2, frames = 70;
        add({
          x: -30, y: H + 30, vx: (tx + 30) / frames, vy: (ty - H - 30) / frames, g: 0, drag: 1, shape: 'emoji', emoji: '🚀', size: 46,
          rot: 0, vr: 0, life: frames, flutter: false,
          emit: r => add({ x: r.x - 14, y: r.y + 14, vx: rnd(-.6, .6), vy: rnd(.3, 1), g: -.01, drag: .97, shape: 'circle',
                           color: pick(['#ffffff', '#ffd1a6', '#ffb547']), size: rnd(8, 14), grow: .5, life: 40, flutter: false }),
          onEnd: r => {
            haptic([0, 60, 120]);
            burst(r.x, r.y, 90, { speed: 11, p: { shape: 'spark', g: .06, flutter: false } });
            burst(r.x, r.y, 14, { speed: 7, p: { shape: 'emoji', emoji: '⭐', size: 20, g: .15, flutter: false } });
          }
        });
      },
      buzz: [0, 100, 200, 300, 400]
    },
    diamanten: {
      name: 'Diamanten', emoji: '💎', anim: 'glow', rays: true,
      run() {
        rain(28, () => ({ shape: 'emoji', emoji: '💎', size: rnd(18, 28), flutter: false, vr: rnd(-.05, .05), g: .12, bounce: .35,
                   emit: d => { if (Math.random() < .08) add({ x: d.x + rnd(-12, 12), y: d.y + rnd(-12, 12), g: 0, vx: 0, vy: 0, shape: 'spark',
                                color: '#cdf3ff', size: rnd(3, 6), life: 25, flutter: false }); } }), 1400);
      },
      buzz: [0, 200, 400, 600]
    },
    schmetterlinge: {
      name: 'Schmetterlinge', emoji: '🦋', anim: 'flutter',
      run() {
        for (let i = 0; i < 16; i++) setTimeout(() => add({
          x: rnd(30, W - 30), y: H + 30, vx: rnd(-1, 1), vy: rnd(-3, -1.8), g: -.003, drag: 1, shape: 'emoji', emoji: '🦋',
          size: rnd(24, 36), wobble: 2.4, life: 360, vr: 0, rot: rnd(-.2, .2), flutter: false, flap: true
        }), rnd(0, 1400));
      },
      buzz: [0, 250, 500]
    },
    disco: {
      name: 'Disco', emoji: '🪩', anim: 'disco',
      run() {
        for (let i = 0; i < 40; i++) setTimeout(() => {
          add({ x: rnd(0, W), y: rnd(0, H), g: 0, vx: 0, vy: 0, shape: 'spark', size: rnd(40, 90), color: pick(COLORS), life: 30, flutter: false, grow: 1 });
          if (i % 5 === 0) tap();
        }, i * 50);
      },
      buzz: []
    },
    einhornflug: {
      name: 'Einhornflug', emoji: '🦄', anim: 'hop', rays: true,
      run() {
        const frames = 110;
        add({
          x: W + 40, y: H * .65, vx: -(W + 80) / frames, vy: -6, g: .11, drag: 1, shape: 'emoji', emoji: '🦄', size: 54,
          rot: 0, vr: 0, life: frames, flutter: false,
          emit: u => {
            for (let k = 0; k < 2; k++) add({ x: u.x + 18, y: u.y + rnd(-8, 8), vx: rnd(.5, 1.5), vy: rnd(-.5, .5), g: .02, drag: .98,
              shape: 'circle', color: `hsl(${(u.age * 9 + k * 40) % 360},95%,65%)`, size: rnd(8, 12), life: 55, flutter: false });
            if (Math.random() < .25) add({ x: u.x, y: u.y, vx: rnd(-1, 1), vy: rnd(-1, 1), g: .05, shape: 'emoji', emoji: '✨', size: 14, life: 40, flutter: false });
          },
          onEnd: () => haptic([0, 80])
        });
      },
      buzz: [0, 400, 800]
    },
    emojiboom: {
      name: 'Emoji-Explosion', emoji: '🤩', anim: 'pop', rays: true,
      run() {
        const [x, y] = center();
        burst(x, y, 45, { speed: 14, p: () => ({ shape: 'emoji', emoji: pick(['🤩', '🥳', '😍', '🎉', '💖', '✨', '🦄', '🌟', '🙌']), size: rnd(20, 32), g: .3, flutter: false }) });
      },
      buzz: [0, 50, 100, 150]
    },
    goldregen: {
      name: 'Goldregen', emoji: '✨', anim: 'spin', rays: true,
      run() {
        rain(180, () => ({ shape: 'spark', color: pick(['#ffd93d', '#ffcf3d', '#fff2a8']), size: rnd(2, 4.5), vy: rnd(1, 3), g: .03, wobble: .4,
                    flutter: false, twinkle: true }), 1800);
      },
      buzz: [0, 150, 300, 450, 600, 750]
    }
  };

  // ---------- 4 traurige Szenen (nicht geschafft) ----------
  const SAD = {
    regen: {
      name: 'Regenwolke', emoji: '🌧️', anim: 'sway',
      run() {
        for (let i = 0; i < 90; i++) setTimeout(() => add({
          x: rnd(0, W), y: -20, vx: -.6, vy: rnd(7, 10), g: .1, drag: 1, shape: 'rect', color: '#7fb2e5', size: rnd(8, 14),
          rot: 1.4, vr: 0, flutter: false, life: 200
        }), rnd(0, 1800));
      },
      buzz: [0, 900]
    },
    welk: {
      name: 'Welke Blume', emoji: '🥀', anim: 'droop',
      run() {
        for (let i = 0; i < 12; i++) setTimeout(() => add({
          x: W / 2 + rnd(-30, 30), y: H * .36, vx: rnd(-.6, .6), vy: .5, g: .02, drag: .99, shape: 'emoji', emoji: '🍂',
          size: rnd(16, 22), life: 380, wobble: 1, flutter: false
        }), 600 + i * 180);
      },
      buzz: [0, 700]
    },
    zucker: {
      name: 'Zucker-Attacke', emoji: '🍭', anim: 'shake',
      run() {
        for (let i = 0; i < 24; i++) setTimeout(() => add({
          x: rnd(20, W - 20), y: -30, vx: rnd(-1, 1), vy: rnd(2, 4), g: .3, drag: .995, shape: 'emoji', emoji: pick(['🍬', '🍫', '🥤', '🍩', '🍭']),
          size: rnd(22, 30), life: 260, bounce: .3, vr: rnd(-.08, .08), flutter: false
        }), rnd(0, 1000));
      },
      buzz: [0, 150, 300]
    },
    umarmung: {
      name: 'Umarmung', emoji: '🫂', anim: 'hug',
      run() {
        for (let i = 0; i < 14; i++) setTimeout(() => add({
          x: rnd(W * .2, W * .8), y: H + 20, vy: rnd(-1.8, -1.2), g: 0, drag: 1, shape: 'emoji', emoji: pick(['💛', '🤍', '🩵']),
          size: rnd(18, 26), life: 420, wobble: .7, vr: 0, rot: 0, flutter: false
        }), rnd(0, 2200));
      },
      buzz: [0, 600]
    }
  };

  function play(name) {
    const s = SCENES[name] || SAD[name];
    if (!s) return;
    s.run();
    haptic(s.buzz);
  }

  const clear = () => { P.length = 0; };
  // Easter Egg: Einhorn-Mega-Modus – Einhörner regnen vom Himmel und hüpfen am Boden
  function megaUnicorns() {
    for (let i = 0; i < 90; i++) setTimeout(() => {
      add({ x: rnd(10, W - 10), y: -60, vx: rnd(-2, 2), vy: rnd(2, 6), g: .32, drag: .995, shape: 'emoji',
            emoji: Math.random() < .85 ? '🦄' : pick(['🌈', '✨', '💖', '⭐']), size: rnd(28, 60), life: 420, bounce: .6,
            vr: rnd(-.12, .12), flutter: false,
            emit: u => { if (Math.random() < .3) add({ x: u.x, y: u.y, vx: rnd(-1, 1), vy: rnd(-1, 1), g: .02, shape: 'circle',
                          color: `hsl(${(u.age * 12) % 360},95%,65%)`, size: rnd(4, 8), life: 30, flutter: false }); } });
      if (i % 6 === 0) tap();
    }, i * 35 + rnd(0, 200));
    [400, 1200, 2000].forEach(d => firework(rnd(W * .2, W * .8), rnd(H * .15, H * .35), d));
  }
  // kleine Funken an einer Stelle (z. B. Zähler erreicht 0)
  function sparkle(x, y, color) {
    burst(x, y, 16, { speed: 4.5, p: () => ({ shape: 'spark', color, size: rnd(2.5, 5), g: .04, life: rnd(25, 40), flutter: false }) });
  }
  // Funkeln in einem Bereich (z. B. oben im Check-in-Blatt)
  function twinkle(x, y, w, h, n = 12) {
    for (let i = 0; i < n; i++) setTimeout(() => add({ x: x + rnd(10, w - 10), y: y + rnd(5, h), vx: 0, vy: rnd(-.3, -.1), g: 0, drag: 1,
      shape: 'emoji', emoji: pick(['✨', '⭐', '✦']), size: rnd(9, 15), life: 70, twinkle: true, flutter: false, vr: 0, rot: 0 }), rnd(0, 600));
  }
  window.FX = { SCENES, SAD, play, clear, megaUnicorns, sparkle, twinkle, tap, haptic, firework, rain };
})();
