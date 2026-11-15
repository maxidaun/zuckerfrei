// Gamifizierte Check-in-Varianten, Ehrenschwur, Rubbellos, Glücksrad.
// Alle laufen im Vollbild-Overlay #game. Die App übergibt einen Kontext (ctx) und bekommt Werte zurück.
(() => {
  const $ = id => document.getElementById(id);
  // Ansprache: "{weiblich|männlich|neutral}" in Texten je nach Einstellung auflösen
  const gtx = str => str.replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, (_, f, m, n) => window.zfGender === 'f' ? f : window.zfGender === 'm' ? m : n);
  const pick = a => { const v = a[Math.floor(Math.random() * a.length)]; return typeof v === 'string' ? gtx(v) : v; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cap = (el, ev) => { try { el.setPointerCapture(ev.pointerId); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Overlay ----------
  let onCancel = null, dirty = false, comboN = 0, session = 0;
  // Kurze Bedienungshilfe, die immer oben im Fenster steht
  const HOW = {
    'Einhorny fragt nach 🦄': 'Tipp auf die passende Zahl. ↩︎ ändert die letzte Antwort.',
    'Wisch dich durch 👆': 'Rechts wischen = nix gehabt · links = hatte was (dann Anzahl wählen). Oder die Knöpfe unten.',
    'Füttere Einhorny 🍽️': '1× tippen = 1 Stück. Gesundes → Einhorny, Zuckerzeug → Monster. „−“ nimmt eins zurück.',
    'Knack den Tresor 🔐': '▲▼ oder wischen zum Einstellen. Zahl stimmt schon? Antippen. Dann den Griff drehen.',
    'Tagebuch 📔': '„nix ✓“ wenn nichts · „+“ klebt einen Sticker pro Stück. Jede Zeile ausfüllen.',
    'Regenbogen-Regler 🌈': 'Einhorny auf die richtige Zahl ziehen – oder antippen, wenn sie schon stimmt.',
    'Ballon-Pop 🎈': 'Tipp den Ballon mit deiner Anzahl an. ↩︎ = eine Frage zurück.',
    'Wer wird Zuckerfrei-Millionär? 💰': 'Antwort antippen, dann nochmal tippen zum Einloggen. ↩︎ = zurück.',
    'Wählscheibe ☎️': 'Tipp auf das Loch mit deiner Zahl – die Scheibe wählt von selbst. Danach mit −/+ korrigieren.',
    'Zielscheibe 🎯': 'Tipp in den Ring mit deiner Zahl: Mitte = 0, nach außen mehr. Danach kannst du mit −/+ korrigieren.',
    'Rubbellos 🎟️': 'Mit dem Finger über das goldene Feld rubbeln.',
    'Glücksrad 🎡': 'Über das Rad wischen oder auf „Drehen“ tippen.',
    'Geschenkbox 🎁': 'Schnell auf die Box tippen (oder mit „Schütteln“ das iPhone schütteln), bis der Balken voll ist.',
    'Kapselautomat 🥚': 'Griff drehen, dann die Kapsel 3× antippen. Darin steckt ein Sammel-Einhorn – oder ein Joker!',
    'Dein Tag 📝': 'Kurz prüfen, ggf. Joker wählen, dann speichern. ✏️ öffnet die Zähler zum Korrigieren.',
    'Wochen-Boss ⚔️': 'Tippen zum Weiter.',
    'Wochen-Garten 🌱': 'Tippen zum Weiter.'
  };
  function open(title, html, cancel, how) {
    const ov = $('game');
    const hw = how || HOW[title];
    $('gameHow').textContent = hw ? '💡 ' + hw : '';
    $('gameHow').hidden = true;                    // Tipp nur auf Bedarf (💡-Knopf)
    $('gameHelp').hidden = !hw;
    $('gameHelp').classList.remove('on');
    session++;                                   // alte Timer früherer Fenster werden ungültig
    $('gameTitle').textContent = title;
    $('gameBody').innerHTML = html;
    onCancel = cancel || null;
    dirty = false; comboN = 0;
    progress(null);
    $('gameCombo').hidden = true;
    ov.classList.remove('closing');
    ov.hidden = false;
    $('gameBody').scrollTop = 0;
    return $('gameBody');
  }
  function close(cb) {
    const ov = $('game');
    if (!ov.hidden && ov.classList.contains('closing')) return;   // Doppelklick: nicht zweimal abschließen
    dirty = false; session++;
    if (ov.hidden) { if (cb) cb(); return; }
    ov.classList.add('closing');
    setTimeout(() => { ov.hidden = true; ov.classList.remove('closing'); $('gameBody').innerHTML = ''; if (cb) cb(); }, 260);
  }
  function init() {
    $('gameHelp').onclick = () => { const h = $('gameHow'); h.hidden = !h.hidden; $('gameHelp').classList.toggle('on', !h.hidden); };
    $('gameX').onclick = () => {
      if (dirty && !confirm('Check-in abbrechen? Deine Eingaben gehen verloren.')) return;
      const c = onCancel; close(c);
    };
  }
  // Fortschrittsbalken oben (wie bei Duolingo)
  function progress(k, n) {
    const p = $('gameProg');
    if (k == null) { p.hidden = true; return; }
    p.hidden = false;
    $('gameProgFill').style.width = Math.round(k / n * 100) + '%';
    $('gameProgTxt').textContent = `${k}/${n}`;
    p.classList.toggle('full', k >= n);
  }
  // Combo: mehrere zuckerfreie Antworten am Stück
  function combo(c, v, tap, haptic) {
    const o = okVal(c, v);
    if (o === false) { comboN = 0; $('gameCombo').hidden = true; return; }
    if (o !== true) return;
    comboN++;
    if (comboN < 2) return;
    const el = $('gameCombo');
    el.textContent = `Combo ×${comboN} 🔥`;
    el.hidden = false; el.classList.remove('pop'); el.offsetHeight; el.classList.add('pop');
    haptic(comboN >= 3 ? [0, 40, 80, 120] : [0, 40, 80]);
  }
  const markDirty = () => { dirty = true; };
  // Fenster nach kurzer Pause schließen – aber nur, wenn es noch dasselbe Fenster ist
  const finishLater = (ms, fn) => { const s0 = session; setTimeout(() => { if (s0 === session) close(fn); }, ms); };

  const okVal = (c, v) => c.count ? !v : c.limit != null ? v <= c.limit : null;
  const label = (c, v) => c.choice ? (v <= c.limit ? `0–${c.limit}` : `${c.limit + 1}+`) : v >= 5 ? '5+' : v;
  const options = c => c.choice ? c.choice.map(o => ({ v: o.v, t: o.label })) : [0, 1, 2, 3, 4, 5].map(v => ({ v, t: v === 5 ? '5+' : String(v) }));

  const REACT_OK = ['{Ehrenfrau 💅|Ehrenmann 💪|Ehrenmensch ✨}', 'Sauber! ✨', 'Stark 💪', 'Zucker? Nie gehört 😎', '{Slay 💅|Stabil 😎|Slay ✨}', 'So muss das!', 'Bombe! 💣', 'Läuft 😎',
    '{Zucker ist so letztes Jahr 💅|Zucker ist so letztes Jahr 😎|Zucker ist so letztes Jahr ✨}', 'Die Haribo-Aktie fällt 📉😎', 'Die Gummibärchen weinen gerade 🐻😭', 'Zuckerfrei und trotzdem süß 😏'];
  const REACT_KO = ['Hmm… okay 😬', 'Notiert. Ehrlich währt am längsten 🫡', 'Autsch 🙈', 'Passiert. Weiter geht\'s 💛', 'Danke für die Ehrlichkeit 🫶',
    'Uff. Die Gummibärchen feiern gerade Party 🐻🎉', 'Ich sag\'s keinem. Fast keinem. 🤐', 'Der Zuckerdämon lacht. Noch. 😈', 'Okay, Naschkatze 🐱🍬'];
  const REACT_TRACK = ['Notiert 📝', 'Nice 💧', 'Gute Wahl!', 'Alles klar 👍', 'Top 👌'];
  const react = (c, v) => { const o = okVal(c, v); return o === true ? pick(REACT_OK) : o === false ? pick(REACT_KO) : (v ? pick(REACT_TRACK) : 'Okay, notiert 📝'); };

  // ================= 1) Interview mit Einhorny =================
  function interview(ctx, done) {
    const body = open('Einhorny fragt nach 🦄', `<div class="chat" id="chat"></div><div class="chat-answers" id="chatAns"></div>`, ctx.cancel);
    const chat = $('chat'), ans = $('chatAns');
    const vals = {}, marks = [], n = ctx.counters.length;
    let i = 0, gen = 0;                          // gen: verwirft alte Timer nach "Zurück"
    const mySession = session;
    const later = (ms, fn) => { const g = gen; setTimeout(() => { if (g === gen && mySession === session && !$('game').hidden) fn(); }, ms); };
    const say = (html, who = 'bot') => {
      const b = document.createElement('div');
      b.className = 'msg ' + who;
      b.innerHTML = who === 'bot' ? `<span class="av">🦄</span><span class="tx">${html}</span>` : `<span class="tx">${html}</span>`;
      chat.appendChild(b);
      body.scrollTop = body.scrollHeight;
    };
    const typing = (ms, then) => {
      const t = document.createElement('div');
      t.className = 'msg bot typing'; t.innerHTML = '<span class="av">🦄</span><span class="tx"><i></i><i></i><i></i></span>';
      chat.appendChild(t); body.scrollTop = body.scrollHeight;
      later(ms, () => { t.remove(); then(); });
    };
    const ask = () => {
      progress(i, n);
      if (i >= n) {
        ans.innerHTML = '';
        typing(350, () => { say(pick(['Danke dir! Lass mal zusammenrechnen… 🧮', 'Perfekt, das war\'s schon! ✨', 'Merci! Mal sehen, was rauskommt 👀'])); later(800, () => close(() => done(vals))); });
        return;
      }
      const c = ctx.counters[i];
      marks[i] = chat.children.length;
      typing(300, () => {
        say(`<span class="q-ico">${c.icon}</span> ${c.q}`);
        ans.innerHTML = options(c).map(o => `<button data-v="${o.v}" class="${c.choice ? 'wide' : ''}">${o.t}</button>`).join('')
          + (i > 0 ? `<button class="undo" id="chatUndo" aria-label="Zurück">↩︎</button>` : '');
        requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
        ans.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
          const v = Number(b.dataset.v);
          vals[c.id] = v; ctx.tap(); markDirty();
          ans.innerHTML = '';
          say(`${c.icon} ${label(c, v)}`, 'me');
          combo(c, v, ctx.tap, ctx.haptic);
          i++;
          progress(i, n);
          typing(220, () => { say(react(c, v)); later(150, ask); });
        });
        const u = $('chatUndo');
        if (u) u.onclick = () => {
          gen++; i--;
          delete vals[ctx.counters[i].id];
          while (chat.children.length > marks[i]) chat.lastChild.remove();
          ctx.tap(); comboN = 0; $('gameCombo').hidden = true;
          ask();
        };
      });
    };
    say(pick([`Na${ctx.name ? ' ' + esc(ctx.name) : ''}? Kurzes Interview, ${n} Fragen 🎤`, 'Okay, ich frag, du antwortest. Ehrlich bleiben! 😇', 'Abendrunde! Ich hab ein paar Fragen 🗒️']));
    later(300, ask);
  }

  // ================= 2) Swipe-Karten =================
  function swipe(ctx, done) {
    const cards = ctx.counters.slice().reverse(), n = ctx.counters.length;
    open('Wisch dich durch 👆', `
      <div class="swipe-hint"><span>👈 hatte was</span><span>nix 👉</span></div>
      <div class="stack" id="stack">${cards.map((c, i) => `
        <div class="card-s" data-id="${c.id}" style="--i:${cards.length - 1 - i}">
          <div class="cs-stamp l">HATTE WAS</div><div class="cs-stamp r">NIX ✓</div>
          <div class="cs-icon">${c.icon}</div>
          <div class="cs-q">${c.q}</div>
          <div class="cs-pick" hidden></div>
        </div>`).join('')}</div>
      <div class="swipe-btns">
        <button class="sw-b l" id="swL">👈 Hatte was</button>
        <button class="sw-b u" id="swU" aria-label="Zurück" disabled>↩︎</button>
        <button class="sw-b r" id="swR">Nix 👉</button>
      </div>`, ctx.cancel);
    progress(0, n);
    const vals = {}, history = [];
    const top = () => { const all = [...$('stack').querySelectorAll('.card-s:not(.gone)')]; return all[all.length - 1]; };
    const cOf = el => ctx.counters.find(c => c.id === el.dataset.id);
    function fly(el, dir, v) {
      const c = cOf(el);
      vals[c.id] = v; markDirty();
      history.push(el);
      el.classList.add('gone'); el.classList.remove('picking', 'lean-l', 'lean-r');
      el.style.transition = 'transform .4s ease-in, opacity .4s';
      el.style.transform = `translate(${dir * 140}%, -10%) rotate(${dir * 30}deg)`;
      el.style.opacity = '0';
      ctx.tap();
      combo(c, v, ctx.tap, ctx.haptic);
      progress(history.length, n);
      $('swU').disabled = false;
      const r = el.getBoundingClientRect();
      if (okVal(c, v) === true) ctx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 'good');
      setTimeout(() => {
        el.style.visibility = 'hidden';
        if (!top()) { ctx.fx('konfetti-mini'); finishLater(450, () => done(vals)); }
      }, 380);
    }
    function left(el) {
      const c = cOf(el);
      if (c.choice) return fly(el, -1, c.choice[1].v);
      const p = el.querySelector('.cs-pick');
      p.hidden = false;
      p.innerHTML = `<div class="cs-pq">${pick(['Wie viele? Ehrlich jetzt 👀', 'Raus mit der Sprache – wie viele? 🍬', 'Beichte bitte: wie viele? 🙏'])}</div>` + [1, 2, 3, 4, 5].map(v => `<button data-v="${v}">${v === 5 ? '5+' : v}</button>`).join('')
        + `<button class="cs-back" data-back="1">↩︎ doch nix</button>`;
      el.classList.add('picking');
      p.querySelectorAll('[data-v]').forEach(b => b.onclick = ev => { ev.stopPropagation(); fly(el, -1, Number(b.dataset.v)); });
      p.querySelector('[data-back]').onclick = ev => { ev.stopPropagation(); p.hidden = true; el.classList.remove('picking'); ctx.tap(); };
      ctx.tap();
    }
    const right = el => { const c = cOf(el); fly(el, 1, c.choice ? c.choice[0].v : 0); };
    $('swL').onclick = () => { const t = top(); if (t && !t.classList.contains('picking')) left(t); };
    $('swR').onclick = () => { const t = top(); if (t) right(t); };
    $('swU').onclick = () => {
      const el = history.pop(); if (!el) return;
      delete vals[el.dataset.id];
      el.classList.remove('gone', 'picking'); el.querySelector('.cs-pick').hidden = true;
      el.style.visibility = ''; el.style.transition = 'transform .35s cubic-bezier(.2,1.4,.4,1), opacity .3s';
      el.style.transform = ''; el.style.opacity = '';
      progress(history.length, n); comboN = 0; $('gameCombo').hidden = true;
      $('swU').disabled = !history.length; ctx.tap();
    };
    // Ziehen mit dem Finger (mit Stempel-Vorschau)
    let drag = null;
    $('stack').addEventListener('pointerdown', ev => {
      const t = top();
      if (!t || !t.contains(ev.target) || t.classList.contains('picking')) return;
      drag = { el: t, x: ev.clientX, dx: 0 };
      cap(t, ev);
      t.style.transition = 'none';
    });
    $('stack').addEventListener('pointermove', ev => {
      if (!drag) return;
      drag.dx = ev.clientX - drag.x;
      const k = Math.max(-1, Math.min(1, drag.dx / 110));
      drag.el.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 14}deg)`;
      drag.el.style.setProperty('--l', Math.max(0, -k));
      drag.el.style.setProperty('--r', Math.max(0, k));
      drag.el.classList.toggle('lean-l', drag.dx < -40);
      drag.el.classList.toggle('lean-r', drag.dx > 40);
    });
    const end = () => {
      if (!drag) return;
      const { el, dx } = drag; drag = null;
      el.classList.remove('lean-l', 'lean-r');
      el.style.setProperty('--l', 0); el.style.setProperty('--r', 0);
      if (dx > 90) return right(el);
      if (dx < -90) { el.style.transition = 'transform .25s'; el.style.transform = ''; return left(el); }
      el.style.transition = 'transform .3s cubic-bezier(.2,1.6,.4,1)'; el.style.transform = '';
    };
    $('stack').addEventListener('pointerup', end);
    $('stack').addEventListener('pointercancel', end);
  }

  // ================= 3) Einhorny füttern =================
  function feed(ctx, done) {
    const vals = {};
    ctx.counters.forEach(c => { vals[c.id] = 0; });
    const good = c => c.count === false && c.limit == null;   // Zero, Protein → zu Einhorny
    open('Füttere Einhorny 🍽️', `
      <div class="feed-targets">
        <div class="ft" id="ftGood"><div class="ft-e" id="feGood">🦄</div><div class="ft-l">Einhorny · <b id="fgN">0</b></div></div>
        <div class="ft bad" id="ftBad"><div class="ft-e" id="feBad">👾</div><div class="ft-l">Zuckermonster · <b id="fbN">0</b></div></div>
      </div>
      <div class="feed-tray">${ctx.counters.map(c => `
        <div class="fi ${good(c) ? 'g' : 'b'}" data-id="${c.id}">
          <button class="fi-btn" data-id="${c.id}">${c.icon}<span class="fi-n" id="fn_${c.id}" hidden>0</span></button>
          <div class="fi-l">${c.short}</div>
          <button class="fi-minus" data-id="${c.id}" aria-label="eins zurück">−</button>
        </div>`).join('')}</div>
      <button class="big primary sweet" id="feedDone" style="width:100%;margin-top:14px">Fertig – heute nix mit Zucker ✨</button>`, ctx.cancel);
    const sugar = () => ctx.counters.filter(c => !good(c)).reduce((a, c) => a + vals[c.id], 0);
    const health = () => ctx.counters.filter(good).reduce((a, c) => a + vals[c.id], 0);
    const sweetNow = () => ctx.counters.every(c => okVal(c, vals[c.id]) !== false);
    function update(id) {
      const n = $('fn_' + id); n.textContent = vals[id]; n.hidden = !vals[id];
      n.classList.remove('bump'); n.offsetHeight; n.classList.add('bump');
      $('feBad').style.transform = `scale(${1 + Math.min(sugar(), 8) * .12})`;
      $('feBad').textContent = sugar() >= 4 ? '👹' : sugar() >= 1 ? '😈' : '👾';
      $('feGood').style.transform = `scale(${1 + Math.min(health(), 6) * .06})`;
      $('fgN').textContent = health(); $('fbN').textContent = sugar();
      const d = $('feedDone');
      d.textContent = sweetNow() ? 'Fertig – heute nix mit Zucker ✨' : 'Fertig – das war alles';
      d.classList.toggle('sweet', sweetNow());
    }
    function chomp(target) { const e = target.querySelector('.ft-e'); e.classList.remove('chomp'); e.offsetHeight; e.classList.add('chomp'); }
    function give(c, viaTarget, from) {
      const want = good(c) ? $('ftGood') : $('ftBad');
      if (viaTarget && viaTarget !== want) {
        viaTarget.classList.remove('nope'); viaTarget.offsetHeight; viaTarget.classList.add('nope');
        ctx.tap(); return;
      }
      vals[c.id] = Math.min(20, vals[c.id] + 1); markDirty();
      if (from) {
        const r1 = from.getBoundingClientRect(), r2 = want.getBoundingClientRect();
        const f = document.createElement('div');
        f.className = 'flyer'; f.textContent = c.icon;
        f.style.left = r1.left + r1.width / 2 + 'px'; f.style.top = r1.top + r1.height / 2 + 'px';
        document.body.appendChild(f);
        requestAnimationFrame(() => { f.style.transform = `translate(${r2.left + r2.width / 2 - r1.left - r1.width / 2}px, ${r2.top + r2.height / 3 - r1.top - r1.height / 2}px) scale(.5)`; f.style.opacity = '.2'; });
        setTimeout(() => f.remove(), 450);
      }
      setTimeout(() => { chomp(want); update(c.id); ctx.tap(); }, from ? 380 : 0);
    }
    const cOf = id => ctx.counters.find(c => c.id === id);
    $('gameBody').querySelectorAll('.fi-minus').forEach(b => b.onclick = () => { const id = b.dataset.id; vals[id] = Math.max(0, vals[id] - 1); update(id); ctx.tap(); });
    $('gameBody').querySelectorAll('.fi-btn').forEach(btn => {
      let g = null, sx = 0, sy = 0;
      btn.addEventListener('pointerdown', ev => {
        sx = ev.clientX; sy = ev.clientY;
        cap(btn, ev);
        g = document.createElement('div'); g.className = 'flyer drag'; g.textContent = cOf(btn.dataset.id).icon;
        g.style.left = sx + 'px'; g.style.top = sy + 'px'; g.style.opacity = '0';
        document.body.appendChild(g);
      });
      btn.addEventListener('pointermove', ev => {
        if (!g) return;
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) g.style.opacity = '1';
        g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px';
        ['ftGood', 'ftBad'].forEach(id => { const r = $(id).getBoundingClientRect(); $(id).classList.toggle('over', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom); });
      });
      const up = ev => {
        if (!g) return;
        const moved = Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8;
        g.remove(); g = null;
        let hit = null;
        ['ftGood', 'ftBad'].forEach(id => { const r = $(id).getBoundingClientRect(); $(id).classList.remove('over'); if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) hit = $(id); });
        const c = cOf(btn.dataset.id);
        if (!moved) give(c, null, btn);
        else if (hit) give(c, hit, null);
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', () => { if (g) { g.remove(); g = null; } });
    });
    $('feedDone').onclick = () => {
      const d = $('feedDone'); d.disabled = true;
      const m = $('feBad');
      if (sugar() === 0) { m.textContent = '💨'; m.classList.add('poof'); $('ftBad').querySelector('.ft-l').textContent = 'verhungert 😂'; ctx.fx('konfetti-mini'); }
      else { m.classList.add('burp'); $('ftBad').querySelector('.ft-l').textContent = pick(['BURP! Danke für den Zucker 😈', 'BURP! Mehr davon! 😈', 'Mjam, Zucker! 😈🍬']); }
      ctx.haptic([0, 60, 120]);
      finishLater(1100, () => done(vals));
    };
  }

  // ================= 4) Zahlen-Tresor =================
  function tresor(ctx, done) {
    const vals = {}, touched = new Set(), n = ctx.counters.length;
    ctx.counters.forEach(c => { vals[c.id] = c.choice ? c.choice[Math.floor(Math.random() * 2)].v : 1 + Math.floor(Math.random() * 3); });
    open('Knack den Tresor 🔐', `
      <div class="safe" id="safe">
        <div class="safe-door" id="safeDoor">
          <div class="dials">${ctx.counters.map(c => `
            <div class="dial todo" id="dl_${c.id}">
              <div class="dl-i">${c.icon}</div>
              <button class="dl-a" data-id="${c.id}" data-d="1" aria-label="mehr">▲</button>
              <div class="dl-w" data-id="${c.id}"><span id="dv_${c.id}"></span></div>
              <button class="dl-a" data-id="${c.id}" data-d="-1" aria-label="weniger">▼</button>
              <div class="dl-l">${c.short}</div>
            </div>`).join('')}</div>
          <button class="handle" id="safeHandle" disabled><span>⟳</span></button>
          <div class="handle-l" id="handleL"></div>
        </div>
        <div class="safe-inside" id="safeIn">💰</div>
      </div>`, ctx.cancel);
    const show = id => {
      const c = ctx.counters.find(x => x.id === id);
      $('dv_' + id).textContent = label(c, vals[id]);
      const o = okVal(c, vals[id]);
      $('dl_' + id).classList.toggle('good', touched.has(id) && o === true);
      $('dl_' + id).classList.toggle('bad', touched.has(id) && o === false);
      const left = n - touched.size;
      $('safeHandle').disabled = left > 0;
      $('safeHandle').classList.toggle('ready', left === 0);
      $('handleL').textContent = left ? `Noch ${left} ${left === 1 ? 'Rad' : 'Räder'} einstellen` : 'Griff drehen! 👆';
      progress(touched.size, n);
    };
    const confirmDial = id => { if (!touched.has(id)) { touched.add(id); $('dl_' + id).classList.remove('todo'); markDirty(); } };
    const turn = (id, d) => {
      const c = ctx.counters.find(x => x.id === id);
      if (c.choice) vals[id] = vals[id] === c.choice[0].v ? c.choice[1].v : c.choice[0].v;
      else vals[id] = Math.max(0, Math.min(9, vals[id] + d));
      confirmDial(id);
      const w = $('dv_' + id); w.classList.remove('up', 'down'); w.offsetHeight; w.classList.add(d > 0 ? 'up' : 'down');
      ctx.tap(); show(id);
    };
    ctx.counters.forEach(c => show(c.id));
    $('gameBody').querySelectorAll('.dl-a').forEach(b => b.onclick = () => turn(b.dataset.id, Number(b.dataset.d)));
    $('gameBody').querySelectorAll('.dl-w').forEach(w => {
      let y0 = null, moved = false;
      w.addEventListener('pointerdown', ev => { y0 = ev.clientY; moved = false; cap(w, ev); });
      w.addEventListener('pointermove', ev => { if (y0 == null) return; const dy = ev.clientY - y0; if (Math.abs(dy) > 22) { moved = true; turn(w.dataset.id, dy < 0 ? 1 : -1); y0 = ev.clientY; } });
      w.addEventListener('pointerup', () => {
        if (y0 != null && !moved) { confirmDial(w.dataset.id); ctx.tap(); show(w.dataset.id); const s = $('dv_' + w.dataset.id); s.classList.remove('up', 'down'); s.offsetHeight; s.classList.add('up'); }
        y0 = null;
      });
    });
    $('safeHandle').onclick = () => {
      const h = $('safeHandle'); h.disabled = true; h.classList.add('turn');
      const sweet = ctx.counters.every(c => okVal(c, vals[c.id]) !== false);
      $('safeIn').innerHTML = sweet ? '💰' : '<span style="font-size:30px;text-align:center;color:#ddd;line-height:1.3">🕸️<br><small>Der Zucker hat alles gefressen</small></span>';
      ctx.haptic([0, 120, 240]);
      setTimeout(() => { $('safeDoor').classList.add('open'); ctx.tap(); if (sweet) ctx.fx('muenzen'); }, 600);
      finishLater(1600, () => done({ ...vals }));
    };
  }

  // ================= 5) Sticker-Tagebuch =================
  function sticker(ctx, done) {
    const vals = {}, touched = new Set(), n = ctx.counters.length;
    ctx.counters.forEach(c => { vals[c.id] = 0; });
    open('Tagebuch 📔', `
      <div class="diary" id="diary">
        <div class="diary-date">Liebes Tagebuch, heute war ${ctx.dayName}…</div>
        ${ctx.counters.map(c => `
          <div class="drow todo" id="dr_${c.id}">
            <div class="dr-top"><div class="dr-h">${c.icon} ${c.short}</div><div class="dr-st" id="ds_${c.id}"></div></div>
            <div class="dr-b">${c.choice
              ? c.choice.map(o => `<button data-ch="${c.id}" data-v="${o.v}">${o.label}</button>`).join('')
              : `<button data-none="${c.id}">nix ✓</button><button data-add="${c.id}">+ ${c.icon}</button><button data-rm="${c.id}">−</button>`}</div>
          </div>`).join('')}
        <div class="stamp" id="stamp" hidden></div>
      </div>
      <button class="big primary" id="diaryDone" style="width:100%;margin-top:14px" disabled>Noch ${n} Zeilen ausfüllen</button>`, ctx.cancel);
    progress(0, n);
    const cOf = id => ctx.counters.find(c => c.id === id);
    const paint = id => {
      const c = cOf(id), st = $('ds_' + id);
      if (c.choice) st.innerHTML = touched.has(id) ? `<span class="stk">${c.icon}</span><b>${label(c, vals[id])}</b>` : '';
      else st.innerHTML = vals[id] ? Array.from({ length: Math.min(vals[id], 4) }, (_, i) => `<span class="stk" style="--r:${(i * 37 % 30) - 15}deg">${c.icon}</span>`).join('') + (vals[id] > 4 ? `<b>×${vals[id]}</b>` : '') : touched.has(id) ? '<span class="none">nichts ✓</span>' : '';
      const o = okVal(c, vals[id]);
      $('dr_' + id).classList.toggle('good', touched.has(id) && o === true);
      $('dr_' + id).classList.toggle('bad', touched.has(id) && o === false);
      const left = n - touched.size, btn = $('diaryDone');
      btn.disabled = left > 0;
      btn.textContent = left ? `Noch ${left} ${left === 1 ? 'Zeile' : 'Zeilen'} ausfüllen` : 'Seite abschließen ✍️';
      progress(touched.size, n);
    };
    const touch = id => { touched.add(id); $('dr_' + id).classList.remove('todo'); markDirty(); };
    const B = $('gameBody');
    B.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const id = b.dataset.add; vals[id] = Math.min(12, vals[id] + 1); touch(id); paint(id); ctx.tap(); });
    B.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const id = b.dataset.rm; vals[id] = Math.max(0, vals[id] - 1); touch(id); paint(id); ctx.tap(); });
    B.querySelectorAll('[data-none]').forEach(b => b.onclick = () => {
      const id = b.dataset.none; vals[id] = 0; touch(id); paint(id); ctx.tap();
      const c = cOf(id); if (okVal(c, 0) === true) { const r = b.getBoundingClientRect(); ctx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 'good'); }
    });
    B.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { const id = b.dataset.ch; vals[id] = Number(b.dataset.v); touch(id); paint(id); ctx.tap(); });
    $('diaryDone').onclick = () => {
      const sweet = ctx.counters.every(c => okVal(c, vals[c.id]) !== false);
      const s = $('stamp');
      s.textContent = sweet ? 'ZUCKERFREI' : 'EHRLICH ✍️';
      s.className = 'stamp ' + (sweet ? 'gold' : 'blue');
      s.hidden = false;
      $('diaryDone').disabled = true;
      s.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => { ctx.haptic([0, 60]); if (sweet) { const r = s.getBoundingClientRect(); ctx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 'gold'); } }, 280);
      finishLater(1400, () => done({ ...vals }));
    };
  }

  // ================= Gerüst für Frage-für-Frage-Varianten =================
  // render(stage, counter, answer) zeichnet eine Frage; answer(v) speichert und geht weiter.
  function sequential(ctx, title, hint, cls, render, done) {
    const n = ctx.counters.length, vals = {};
    let i = 0, busy = false;
    open(title, `<div class="seq ${cls}" id="seq"></div>
      <div class="seq-foot"><button class="sw-b u" id="seqU" aria-label="Zurück" disabled>↩︎</button><div class="seq-react" id="seqR"><span class="av">🦄</span><span id="seqRt">Los geht's!</span></div></div>`, ctx.cancel);
    const s0 = session;
    const next = () => {
      if (s0 !== session) return;
      busy = false;
      progress(i, n);
      $('seqU').disabled = i === 0;
      if (i >= n) { busy = true; ctx.fx('konfetti-mini'); return finishLater(550, () => done(vals)); }
      const c = ctx.counters[i];
      const stage = $('seq');
      stage.innerHTML = '';
      stage.classList.remove('in'); stage.offsetHeight; stage.classList.add('in');
      render(stage, c, v => {
        if (s0 !== session || busy) return;
        busy = true;
        vals[c.id] = v; markDirty();
        combo(c, v, ctx.tap, ctx.haptic);
        const r = $('seqRt'); r.textContent = react(c, v);
        const rb = $('seqR'); rb.classList.remove('pop'); rb.offsetHeight; rb.classList.add('pop');
        i++; progress(i, n);
        setTimeout(next, 700);
      }, i);
    };
    $('seqU').onclick = () => {
      if (i === 0 || busy) return;
      i--; delete vals[ctx.counters[i].id];
      comboN = 0; $('gameCombo').hidden = true; $('seqRt').textContent = 'Okay, nochmal 🔄';
      ctx.tap(); next();
    };
    next();
  }
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // ---------- Freche Nachfrage mit Korrektur (für Wurstfinger 😏) ----------
  const ASK_ZERO = ['Echt jetzt, {v}? Ehrenwort? 😇', 'Null? Respekt! Aber nicht geschummelt, oder? 🤨', '{v}! Ich glaub dir. Fast. 😏',
    'Null?! Wer bist du und was hast du mit der Naschkatze gemacht? 😳', '{v} – ich hab Zeugen. Die Gummibärchen reden. 🐻👀',
    '{v}? Dann zeig mal deine Zunge. Keine Schoko-Spuren? 👅🔍'];
  const ASK_MORE = ['Echt jetzt, {v}? Oder sind die Wurstfinger abgerutscht? 😏', '{v}? Sicher? Ich kenn deine Finger… 🌭', 'Hmm, {v}. Getroffen oder geschätzt? 🤔', '{v}?! Nicht dass du dich vertippt hast 😬',
    'Bist du im Überzucker von deinen ganzen Gummibärchen oder was? {v}?! 🍬😵', '{v}? Hast du mit dem Ellbogen getippt? 💪😂',
    'Zitterfinger vom Zuckerentzug? {v}, ganz sicher? 🤭', '{v}… die Gummibärchen-Mafia lässt grüßen 🐻🕶️', 'Ich zähl mit: {v}. Und jetzt bitte die Wahrheit 👀'];
  const MISS = ['Daneben! Schon zu viel Zucker im Blut? 🎯😵', 'Das war nicht mal die Scheibe, Digga 😂', 'Zielwasser statt Cola trinken! 💧🎯', 'Wurstfinger-Alarm! 🌭🚨'];
  const RETRY = ['Na los, diesmal mit Brille 🤓', 'Zweiter Versuch – ohne Zuckerzittern bitte 😏', 'Okay, nochmal. Ich schau weg. (Nicht.) 👀'];
  function confirmPick(stage, c, v, ctx, answer, retry) {
    const box = document.createElement('div');
    box.className = 'askbox';
    stage.appendChild(box);
    const opts = options(c), idxOf = x => opts.findIndex(o => o.v === x);
    let k = Math.max(0, idxOf(v));
    const draw = (first) => {
      const val = opts[k].v, line = pick(okVal(c, val) === true && !c.choice ? ASK_ZERO : ASK_MORE).replace('{v}', `<b>${opts[k].t}</b>`);
      box.innerHTML = `<div class="ask-say"><span class="av">🦄</span><span>${first ? line : `Okay, also <b>${opts[k].t}</b>? 🤔`}</span></div>
        <div class="ask-row">
          <button class="ask-pm" data-d="-1" ${k === 0 ? 'disabled' : ''}>−</button>
          <div class="ask-v ${okVal(c, val) === true ? 'good' : okVal(c, val) === false ? 'bad' : ''}">${c.icon} ${opts[k].t}</div>
          <button class="ask-pm" data-d="1" ${k === opts.length - 1 ? 'disabled' : ''}>+</button>
        </div>
        <div class="ask-btns"><button class="small" data-retry>${retry.label}</button><button class="big primary" data-ok>Passt ✓</button></div>`;
      box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { k = Math.max(0, Math.min(opts.length - 1, k + Number(b.dataset.d))); ctx.tap(); draw(false); });
      box.querySelector('[data-ok]').onclick = () => { ctx.haptic([0, 40]); box.querySelectorAll('button').forEach(x => x.disabled = true); answer(opts[k].v); };
      box.querySelector('[data-retry]').onclick = () => {
        ctx.tap(); box.remove(); retry.fn();
        const t = $('seqRt'); if (t) { t.textContent = pick(RETRY); const rb = $('seqR'); rb.classList.remove('pop'); rb.offsetHeight; rb.classList.add('pop'); }
      };
    };
    draw(true);
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ================= 6) Ballon-Pop =================
  const HUES = [340, 30, 50, 150, 205, 270, 0];
  function balloon(ctx, done) {
    sequential(ctx, 'Ballon-Pop 🎈', 'Lass den Ballon mit der richtigen Zahl platzen!', 'sq-balloon', (stage, c, answer) => {
      const opts = options(c);
      stage.innerHTML = `<div class="seq-q">${c.icon} ${c.q}</div>
        <div class="sky ${opts.length <= 2 ? 'two' : ''}">${opts.map((o, k) => `<button class="balloon" data-v="${o.v}" style="--h:${HUES[k % HUES.length]};--d:${(k * .09).toFixed(2)}s;--bob:${(2 + (k % 3) * .4).toFixed(1)}s"><span>${o.t}</span></button>`).join('')}</div>`;
      stage.querySelectorAll('.balloon').forEach(b => b.onclick = () => {
        const v = Number(b.dataset.v);
        b.classList.add('popped');
        stage.querySelectorAll('.balloon:not(.popped)').forEach(x => x.classList.add('away'));
        const [x, y] = centerOf(b);
        ctx.sparkle(x, y, okVal(c, v) === true ? 'good' : 'gold');
        ctx.haptic([0, 30]);
        setTimeout(() => answer(v), 280);
      });
    }, done);
  }

  // ================= 7) Quiz-Show =================
  const LADDER = [50, 100, 300, 1000, 5000, 32000, 1000000];
  function quiz(ctx, done) {
    sequential(ctx, 'Wer wird Zuckerfrei-Millionär? 💰', 'Antwort antippen – dann <b>nochmal tippen</b> zum Einloggen.', 'sq-quiz', (stage, c, answer, i) => {
      const L = ['A', 'B', 'C', 'D'];
      const opts = c.choice ? c.choice.map(o => ({ v: o.v, t: o.label })) : [{ v: 0, t: '0' }, { v: 1, t: '1' }, { v: 2, t: '2' }, { v: 3, t: '3 oder mehr', more: true }];
      stage.innerHTML = `<div class="quiz-lad">Frage ${i + 1} · um <b>${LADDER[Math.min(i, LADDER.length - 1)].toLocaleString('de-DE')}</b> Glitzerpunkte ✨</div>
        <div class="quiz-q">${c.icon} ${c.q}</div>
        <div class="quiz-opts">${opts.map((o, k) => `<button class="qo" data-k="${k}"><b>${L[k]}:</b> ${o.t}</button>`).join('')}</div>
        <div class="quiz-more" id="qMore" hidden></div>
        <div class="quiz-hint" id="qHint"></div>`;
      let sel = null;
      stage.querySelectorAll('.qo').forEach(b => b.onclick = () => {
        const k = Number(b.dataset.k), o = opts[k];
        if (sel !== k) {
          sel = k;
          stage.querySelectorAll('.qo').forEach(x => x.classList.toggle('locked', x === b));
          $('qHint').textContent = pick(['Ist das deine endgültige Antwort? Nochmal tippen ✓', 'Der Moderator guckt streng 🧐 Endgültig? Nochmal tippen ✓',
            'Publikumsjoker gibt\'s nicht. Sicher? Nochmal tippen ✓', 'Die Gummibärchen im Publikum tuscheln… Nochmal tippen ✓']);
          $('qMore').hidden = true;
          ctx.tap(); return;
        }
        if (o.more) {                                       // "3 oder mehr" → genaue Zahl
          const m = $('qMore'); m.hidden = false;
          m.innerHTML = `<span>Wie viele genau?</span>` + [3, 4, 5].map(v => `<button data-v="${v}">${v === 5 ? '5+' : v}</button>`).join('');
          m.querySelectorAll('button').forEach(x => x.onclick = () => { b.classList.add('right'); ctx.haptic([0, 50, 100]); setTimeout(() => answer(Number(x.dataset.v)), 450); });
          ctx.tap(); return;
        }
        b.classList.remove('locked'); b.classList.add('right');
        $('qHint').textContent = okVal(c, o.v) === true ? 'Richtig! ✨' : 'Eingeloggt ✓';
        ctx.haptic([0, 50, 100]);
        if (okVal(c, o.v) === true) { const [x, y] = centerOf(b); ctx.sparkle(x, y, 'good'); }
        setTimeout(() => answer(o.v), 550);
      });
    }, done);
  }

  // ================= 8) Wählscheibe =================
  function dial(ctx, done) {
    sequential(ctx, 'Wählscheibe ☎️', 'Wähl die richtige Zahl – tipp aufs Loch.', 'sq-dial', (stage, c, answer) => {
      if (c.choice) {                                      // Plätzchen: zwei große Tasten
        stage.innerHTML = `<div class="seq-q">${c.icon} ${c.q}</div><div class="dial-choice">${c.choice.map(o => `<button data-v="${o.v}">☎️ ${o.label}</button>`).join('')}</div>`;
        stage.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { ctx.haptic([0, 40]); answer(Number(b.dataset.v)); });
        return;
      }
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
      const STOP = 60, R = 104;
      const pos = idx => { const a = (STOP - 40 - idx * 30) * Math.PI / 180; return [150 + R * Math.cos(a), 150 + R * Math.sin(a)]; };
      stage.innerHTML = `<div class="seq-q">${c.icon} ${c.q}</div>
        <div class="rotary">
          <svg viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" class="rt-base"/>
            ${digits.map((d, k) => { const [x, y] = pos(k); return `<text x="${x}" y="${y}" class="rt-num" text-anchor="middle" dominant-baseline="central">${d}</text>`; }).join('')}
            <g id="rtWheel">
              <circle cx="150" cy="150" r="132" class="rt-wheel"/>
              ${digits.map((d, k) => { const [x, y] = pos(k); return `<circle cx="${x}" cy="${y}" r="21" class="rt-hole" data-k="${k}"/>`; }).join('')}
              <circle cx="150" cy="150" r="52" class="rt-hub"/><text x="150" y="150" text-anchor="middle" dominant-baseline="central" font-size="34">🦄</text>
            </g>
            <path d="M ${150 + 138 * Math.cos(STOP * Math.PI / 180)} ${150 + 138 * Math.sin(STOP * Math.PI / 180)} l -14 -18" class="rt-stop"/>
          </svg>
        </div>
        <div class="rt-show" id="rtShow">&nbsp;</div>`;
      let spinning = false;
      stage.querySelectorAll('.rt-hole').forEach(h => h.addEventListener('click', () => {
        if (spinning) return;
        spinning = true;
        const k = Number(h.dataset.k), d = digits[k], rot = 40 + k * 30;
        const g = $('rtWheel');
        const t = 220 + rot * 2.2;
        g.style.transition = `transform ${t}ms cubic-bezier(.4,0,.6,1)`;
        g.style.transform = `rotate(${rot}deg)`;
        const ticks = Math.round(rot / 30);
        for (let j = 0; j < ticks; j++) setTimeout(ctx.tap, (j + 1) * t / ticks);
        setTimeout(() => {
          $('rtShow').textContent = `☎️ ${d}`;
          g.style.transition = `transform ${t * 1.3}ms cubic-bezier(.3,0,.3,1)`;
          g.style.transform = 'rotate(0deg)';
          for (let j = 0; j < ticks; j++) setTimeout(ctx.tap, (j + 1) * t * 1.3 / ticks);
          setTimeout(() => confirmPick(stage, c, d, ctx, answer, { label: 'Nochmal wählen ☎️', fn: () => { spinning = false; $('rtShow').innerHTML = '&nbsp;'; } }), t * 1.3 + 80);
        }, t + 120);
      }));
    }, done);
  }

  // ================= 9) Zielscheibe =================
  function darts(ctx, done) {
    sequential(ctx, 'Zielscheibe 🎯', 'Triff den richtigen Ring – <b>Mitte = 0</b>, nach außen 1, 2, 3 …', 'sq-darts', (stage, c, answer) => {
      const opts = options(c);                             // innen → außen
      const n = opts.length, R = 140, step = R / n;
      const cols = ['#ffd93d', '#ff6b6b', '#ffffff', '#3d3d3d', '#ff6b6b', '#ffffff'];
      stage.innerHTML = `<div class="seq-q">${c.icon} ${c.q}</div>
        <div class="board-wrap"><svg viewBox="0 0 300 300" class="board" id="board">
          ${opts.map((o, k) => n - 1 - k).map(k => `<circle cx="150" cy="150" r="${step * (k + 1)}" fill="${cols[k % cols.length]}" stroke="#222" stroke-width="2"/>`).join('')}
          ${opts.map((o, k) => `<text x="150" y="${k === 0 ? 150 : 150 - step * k - step / 2}" text-anchor="middle" dominant-baseline="central" class="bd-l ${k === 3 ? 'inv' : ''}">${o.t}</text>`).join('')}
        </svg><div class="dart" id="dart">📍</div></div>`;
      let done1 = false;
      $('board').addEventListener('click', ev => {
        if (done1) return;
        const r = $('board').getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width * 300 - 150, y = (ev.clientY - r.top) / r.height * 300 - 150;
        const dist = Math.hypot(x, y);
        if (dist > R + 4) { ctx.tap(); const t = $('seqRt'); if (t) { t.textContent = pick(MISS); const rb = $('seqR'); rb.classList.remove('pop'); rb.offsetHeight; rb.classList.add('pop'); } return; }
        done1 = true;
        const k = Math.min(n - 1, Math.floor(dist / step));
        const d = $('dart');
        d.style.left = (ev.clientX - r.left) + 'px'; d.style.top = (ev.clientY - r.top) + 'px';
        d.style.opacity = ''; d.classList.remove('hit'); d.offsetHeight; d.classList.add('hit');
        ctx.haptic([0, 40]);
        const v = opts[k].v;
        if (k === 0) { $('board').classList.add('bull'); ctx.sparkle(ev.clientX, ev.clientY, okVal(c, v) === true ? 'good' : 'gold'); }
        setTimeout(() => confirmPick(stage, c, v, ctx, answer, { label: 'Nochmal werfen 🎯', fn: () => {
          done1 = false; d.classList.remove('hit'); d.style.opacity = '0'; $('board').classList.remove('bull');
        } }), 450);
      });
    }, done);
  }

  // ================= 10) Regenbogen-Regler =================
  function slider(ctx, done) {
    const vals = {}, touched = new Set(), n = ctx.counters.length;
    const steps = c => c.choice ? c.choice.map(o => o.v) : [0, 1, 2, 3, 4, 5];
    ctx.counters.forEach(c => { const s = steps(c); vals[c.id] = c.choice ? s[Math.floor(Math.random() * 2)] : s[1 + Math.floor(Math.random() * 3)]; });
    open('Regenbogen-Regler 🌈', `
      ${ctx.counters.map(c => `
        <div class="sl-row todo" id="sr_${c.id}">
          <div class="sl-h"><span>${c.icon} ${c.short}</span><b id="sv_${c.id}"></b></div>
          <div class="sl-track" data-id="${c.id}"><div class="sl-fill" id="sf_${c.id}"></div>
            ${steps(c).map((v, k, a) => `<i class="sl-dot" style="left:${k / (a.length - 1) * 100}%"></i>`).join('')}
            <div class="sl-thumb" id="st_${c.id}">🦄</div></div>
          <div class="sl-ticks">${steps(c).map(v => `<span>${label(c, v)}</span>`).join('')}</div>
        </div>`).join('')}
      <button class="big primary" id="slDone" style="width:100%;margin-top:12px" disabled></button>`, ctx.cancel);
    const draw = id => {
      const c = ctx.counters.find(x => x.id === id), s = steps(c), k = s.indexOf(vals[id]), p = k / (s.length - 1) * 100;
      $('st_' + id).style.left = p + '%'; $('sf_' + id).style.width = p + '%';
      $('sv_' + id).textContent = label(c, vals[id]);
      const o = okVal(c, vals[id]);
      $('sr_' + id).classList.toggle('good', touched.has(id) && o === true);
      $('sr_' + id).classList.toggle('bad', touched.has(id) && o === false);
      const left = n - touched.size, btn = $('slDone');
      btn.disabled = left > 0;
      const sweet = ctx.counters.every(x => okVal(x, vals[x.id]) !== false);
      btn.textContent = left ? `Noch ${left} ${left === 1 ? 'Regler' : 'Regler'} prüfen` : sweet ? 'Fertig – zuckerfrei! ✨' : 'Fertig';
      btn.classList.toggle('sweet', !left && sweet);
      progress(touched.size, n);
    };
    const touch = id => { if (!touched.has(id)) { touched.add(id); $('sr_' + id).classList.remove('todo'); markDirty(); } };
    ctx.counters.forEach(c => draw(c.id));
    $('gameBody').querySelectorAll('.sl-track').forEach(tr => {
      const id = tr.dataset.id, c = ctx.counters.find(x => x.id === id), s = steps(c);
      let active = false, moved = false, last = vals[id];
      const setFrom = ev => {
        const r = tr.getBoundingClientRect();
        const k = Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * (s.length - 1));
        if (s[k] !== vals[id]) { vals[id] = s[k]; ctx.tap(); moved = true; }
        touch(id); draw(id);
      };
      tr.addEventListener('pointerdown', ev => { active = true; moved = false; last = vals[id]; cap(tr, ev); setFrom(ev); $('st_' + id).classList.add('grab'); });
      tr.addEventListener('pointermove', ev => { if (active) setFrom(ev); });
      const end = () => {
        if (!active) return; active = false; $('st_' + id).classList.remove('grab');
        if (okVal(c, vals[id]) === true && last !== vals[id]) { const [x, y] = centerOf($('st_' + id)); ctx.sparkle(x, y, 'good'); }
        if (!moved) { const th = $('st_' + id); th.classList.remove('ok'); th.offsetHeight; th.classList.add('ok'); ctx.tap(); }
      };
      tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
    });
    $('slDone').onclick = () => { ctx.haptic([0, 60]); ctx.fx('konfetti-mini'); finishLater(400, () => done({ ...vals })); $('slDone').disabled = true; };
  }

  // ================= Ehrenschwur: Horn 2 s gedrückt halten =================
  function swear(container, onDone, tap) {
    container.innerHTML = `
      <div class="swear">
        <div class="sw-t">Ehrenschwur 🤞</div>
        <div class="sw-s">Halte Einhornys Horn 2 Sekunden gedrückt, um zu schwören, dass alles stimmt.</div>
        <button class="sw-btn" id="swBtn">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="sw-bg"/><circle cx="60" cy="60" r="52" class="sw-ring" id="swRing"/></svg>
          <span class="sw-u">🦄</span>
        </button>
        <div class="sw-l" id="swL">gedrückt halten…</div>
      </div>`;
    const btn = $('swBtn'), ring = $('swRing');
    const C = 2 * Math.PI * 52;
    ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C;
    let t0 = null, raf = null, lastTick = 0, finished = false;
    const step = now => {
      const k = Math.min(1, (now - t0) / 2000);
      ring.style.strokeDashoffset = C * (1 - k);
      btn.style.setProperty('--glow', k);
      const every = 260 - k * 200;                      // Haptik wird schneller
      if (now - lastTick > every) { tap(); lastTick = now; }
      if (k >= 1) { finished = true; btn.classList.add('done'); $('swL').textContent = 'Geschworen! ✨'; setTimeout(onDone, 500); return; }
      raf = requestAnimationFrame(step);
    };
    const start = ev => { if (finished) return; ev.preventDefault(); t0 = performance.now(); lastTick = 0; btn.classList.add('hold'); raf = requestAnimationFrame(step); };
    const stop = () => {
      if (finished || t0 == null) return;
      cancelAnimationFrame(raf); t0 = null; btn.classList.remove('hold');
      ring.style.transition = 'stroke-dashoffset .3s'; ring.style.strokeDashoffset = C;
      setTimeout(() => { ring.style.transition = ''; }, 300);
      $('swL').textContent = 'Länger halten! 😤';
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ================= Ritual: Einhorn-High-Five (Timing) =================
  function highfive(container, onDone, ctx) {
    container.innerHTML = `
      <div class="swear">
        <div class="sw-t">Einhorn-High-Five ✋</div>
        <div class="sw-s">Tipp genau dann, wenn der Ring die Hand berührt!</div>
        <button class="hf" id="hfBtn"><span class="hf-ring" id="hfRing"></span><span class="hf-hand">✋</span><span class="hf-u">🦄</span></button>
        <div class="sw-l" id="hfL">Warte auf den Ring…</div>
      </div>`;
    const ring = $('hfRing'), lab = $('hfL'), btn = $('hfBtn');
    let t0 = performance.now(), raf, tries = 0, over = false;
    const PERIOD = 1300;
    const scaleAt = now => 2.3 - ((now - t0) % PERIOD) / PERIOD * 1.8;   // 2.3 → 0.5
    const loop = now => { if (over) return; const s = scaleAt(now); ring.style.transform = `scale(${s})`; ring.classList.toggle('near', s < 1.2 && s > .85); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    btn.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if (over) return;
      const s = scaleAt(performance.now());
      tries++;
      const hit = s > .82 && s < 1.22;
      if (hit || tries >= 3) {
        over = true; cancelAnimationFrame(raf);
        ring.style.transform = 'scale(1)'; btn.classList.add('clap');
        lab.textContent = hit ? (Math.abs(s - 1) < .1 ? 'PERFEKT! 🙌' : 'Gut getroffen! ✋') : 'Gut genug 😄 High-Five!';
        ctx.haptic([0, 40, 90]);
        const [x, y] = centerOf(btn); ctx.sparkle(x, y, 'gold');
        setTimeout(() => onDone(), 700);
      } else {
        lab.textContent = s >= 1.22 ? pick(['Zu früh! Zuckerschock-Reflexe? 😅', 'Zu früh, Hibbelinchen! 🐿️']) : pick(['Zu spät! Eingeschlafen im Zuckerkoma? 😴', 'Zu spät, Schneckchen 🐌']);
        btn.classList.remove('miss'); btn.offsetHeight; btn.classList.add('miss'); ctx.tap();
      }
    });
  }

  // ================= Ritual: Unterschrift =================
  function signature(container, onDone, ctx) {
    container.innerHTML = `
      <div class="swear">
        <div class="sw-t">Unterschreib's ✍️</div>
        <div class="sw-s">„Ich war heute ehrlich.“ – unterschreib mit dem Finger auf der Linie.</div>
        <div class="sig-pad"><canvas id="sigC"></canvas><div class="sig-line">✕ ___________________________</div></div>
        <div class="row" style="justify-content:center;margin-top:10px">
          <button class="small" id="sigClear">Neu</button>
          <button class="big primary" id="sigOk" disabled style="padding:12px 22px">Unterschreiben ✓</button>
        </div>
      </div>`;
    const cv = $('sigC'), g = cv.getContext('2d');
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr; g.scale(dpr, dpr);
    g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#2b1f22';
    let down = false, last = null, len = 0, lastTap = 0;
    const pos = ev => { const b = cv.getBoundingClientRect(); return { x: ev.clientX - b.left, y: ev.clientY - b.top }; };
    cv.addEventListener('pointerdown', ev => { down = true; last = pos(ev); cap(cv, ev); });
    cv.addEventListener('pointermove', ev => {
      if (!down) return;
      const p = pos(ev);
      g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
      len += Math.hypot(p.x - last.x, p.y - last.y); last = p;
      const now = performance.now(); if (now - lastTap > 90) { ctx.tap(); lastTap = now; }
      $('sigOk').disabled = len < 120;
    });
    const up = () => { down = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    $('sigClear').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); len = 0; $('sigOk').disabled = true; ctx.tap(); };
    $('sigOk').onclick = () => {
      // kleine Kopie speichern (spart Platz)
      const sm = document.createElement('canvas'); sm.width = 180; sm.height = Math.round(180 * r.height / r.width);
      sm.getContext('2d').drawImage(cv, 0, 0, sm.width, sm.height);
      ctx.haptic([0, 60]);
      $('sigOk').disabled = true; $('sigOk').textContent = 'Unterschrieben ✨';
      setTimeout(() => onDone({ sig: sm.toDataURL('image/png') }), 450);
    };
  }

  // ================= Ritual: Kerze auspusten =================
  function candle(container, onDone, ctx) {
    container.innerHTML = `
      <div class="swear">
        <div class="sw-t">Kerze auspusten 🕯️</div>
        <div class="sw-s">Puste ins Mikro – oder halte den Finger auf die Flamme, bis sie ausgeht.</div>
        <button class="cdl" id="cdl"><span class="flame" id="flame"></span><span class="wick"></span><span class="wax"></span></button>
        <div class="row" style="justify-content:center;margin-top:6px"><button class="small" id="cdlMic">🎤 Pusten</button></div>
        <div class="sw-l" id="cdlL">&nbsp;</div>
      </div>`;
    let life = 1, holding = false, out = false, stream = null, raf;
    const flame = $('flame');
    const draw = () => { flame.style.transform = `scale(${.25 + life * .75})`; flame.style.opacity = .3 + life * .7; };
    const extinguish = () => {
      if (out) return; out = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(t => t.stop());
      flame.classList.add('out'); $('cdl').classList.add('smoke');
      $('cdlL').textContent = 'Gute Nacht 🌙';
      ctx.haptic([0, 80]);
      setTimeout(() => onDone(), 900);
    };
    const tick = () => {
      if (out) return;
      if (holding) life -= .014;
      else life = Math.min(1, life + .004);
      draw();
      if (life <= 0) return extinguish();
      if (holding && Math.random() < .2) ctx.tap();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const c = $('cdl');
    c.addEventListener('pointerdown', ev => { ev.preventDefault(); holding = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => c.addEventListener(t, () => { holding = false; }));
    c.addEventListener('contextmenu', e => e.preventDefault());
    $('cdlMic').onclick = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const an = ac.createAnalyser(); an.fftSize = 512;
        ac.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize);
        $('cdlL').textContent = 'Jetzt pusten! 💨';
        const listen = () => {
          if (out) { ac.close(); return; }
          an.getByteTimeDomainData(buf);
          let sum = 0; for (const v of buf) sum += (v - 128) * (v - 128);
          const vol = Math.sqrt(sum / buf.length);
          if (vol > 18) { life -= .035; flame.classList.add('blow'); } else flame.classList.remove('blow');
          requestAnimationFrame(listen);
        };
        listen();
      } catch (e) { $('cdlL').textContent = 'Kein Mikro – einfach den Finger auf die Flamme halten 👆'; }
    };
  }

  // ================= Belohnung: Geschenkbox schütteln =================
  function shake(prize, ctx, done) {
    open('Geschenkbox 🎁', `
      <div class="gift-wrap"><div class="gift" id="gift">🎁</div></div>
      <div class="gp-bar gift-bar"><i id="giftFill"></i></div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="small" id="giftMotion">📳 Mit Schütteln spielen</button></div>
      <div class="gift-res" id="giftRes" hidden><div class="sp-e">${prize.emoji}</div><div class="sp-t">${prize.title}</div><div class="sp-s">${prize.sub || ''}</div></div>
      <button class="big primary" id="giftGo" style="width:100%;margin-top:14px" hidden>Einlösen 🎉</button>`, () => done(prize));
    let energy = 0, opened = false, lastShake = 0;
    const box = $('gift');
    const add = amt => {
      if (opened) return;
      energy = Math.min(1, energy + amt);
      $('giftFill').style.width = energy * 100 + '%';
      box.style.setProperty('--w', 4 + energy * 16 + 'deg');
      box.classList.remove('jig'); box.offsetHeight; box.classList.add('jig');
      ctx.tap();
      if (energy >= 1) burst();
    };
    function burst() {
      opened = true;
      box.classList.add('boom');
      ctx.haptic([0, 60, 120, 180]);
      ctx.fx('konfetti-mini');
      setTimeout(() => { $('giftRes').hidden = false; $('giftGo').hidden = false; $('giftMotion').hidden = true; }, 350);
      window.removeEventListener('devicemotion', onMotion);
    }
    box.addEventListener('pointerdown', ev => { ev.preventDefault(); add(.09); });
    const onMotion = ev => {
      const a = ev.accelerationIncludingGravity || ev.acceleration; if (!a) return;
      const m = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      const now = performance.now();
      if (m > 28 && now - lastShake > 120) { lastShake = now; add(.12); }
    };
    $('giftMotion').onclick = async () => {
      try {
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
          const p = await DeviceMotionEvent.requestPermission(); if (p !== 'granted') throw 0;
        }
        window.addEventListener('devicemotion', onMotion);
        $('giftMotion').textContent = '📳 Jetzt schütteln!';
      } catch (e) { $('giftMotion').textContent = 'Kein Schütteln möglich – einfach tippen 👆'; }
    };
    $('giftGo').onclick = () => { window.removeEventListener('devicemotion', onMotion); close(() => done(prize)); };
  }

  // ================= Belohnung: Kapselautomat (Sammel-Einhörner) =================
  const RARITY = { common: { n: 'Gewöhnlich', c: '#9aa3ad' }, rare: { n: 'Selten', c: '#3f8cff' }, epic: { n: 'Episch', c: '#a855f7' }, legend: { n: 'Legendär', c: '#f5b301' } };
  function gacha(prize, ctx, done) {
    const caps = ['#ff8fab', '#ffd166', '#7bdcb5', '#8ecae6', '#cdb4db', '#ffb4a2'];
    open('Kapselautomat 🥚', `
      <div class="gacha">
        <div class="g-dome">${Array.from({ length: 14 }, (_, i) => `<i style="--c:${caps[i % caps.length]};--x:${(i * 37) % 80 + 6}%;--y:${(i * 53) % 55 + 20}%"></i>`).join('')}</div>
        <div class="g-body"><button class="g-handle" id="gHandle" aria-label="Drehen">✚</button><div class="g-slot"><span class="g-cap" id="gCap" hidden></span></div></div>
      </div>
      <div class="sw-l" id="gL" style="text-align:center">Dreh den Griff!</div>
      <div class="g-card" id="gCard" hidden></div>
      <button class="big primary" id="gGo" style="width:100%;margin-top:12px" hidden>In die Sammlung 🎉</button>`, () => done(prize));
    const cap = $('gCap');
    let stage = 0, taps = 0;
    $('gHandle').onclick = () => {
      if (stage) return; stage = 1;
      $('gHandle').classList.add('turn');
      [0, 150, 300].forEach(t => setTimeout(ctx.tap, t));
      $('gameBody').querySelector('.g-dome').classList.add('shake');
      setTimeout(() => {
        cap.style.setProperty('--c', prize.rarity ? RARITY[prize.rarity].c : '#ffd166');
        cap.hidden = false; cap.classList.add('roll');
        $('gL').textContent = 'Tipp die Kapsel 3× an, um sie zu öffnen!';
        ctx.haptic([0, 60]); stage = 2;
      }, 650);
    };
    cap.addEventListener('click', () => {
      if (stage !== 2) return;
      taps++;
      cap.classList.remove('crack1', 'crack2', 'wob'); cap.offsetHeight;
      cap.classList.add('wob', taps === 1 ? 'crack1' : 'crack2');
      ctx.haptic(taps >= 3 ? [0, 50, 100, 150] : [0, 30]);
      if (taps < 3) return;
      stage = 3;
      cap.classList.add('open');
      const rr = prize.rarity ? RARITY[prize.rarity] : null;
      const card = $('gCard');
      card.innerHTML = `<div class="gc-e">${prize.emoji}</div><div class="gc-t">${prize.title}</div>${rr ? `<div class="gc-r" style="--c:${rr.c}">${rr.n}</div>` : ''}<div class="gc-s">${prize.sub || ''}</div>`;
      card.className = 'g-card ' + (prize.rarity || 'joker');
      card.hidden = false;
      const [x, y] = centerOf(cap); ctx.sparkle(x, y, 'gold');
      if (prize.rarity === 'legend' || prize.rarity === 'epic') ctx.fx(prize.rarity === 'legend' ? 'goldregen' : 'sterne');
      $('gL').textContent = '';
      $('gGo').hidden = false;
      if (prize.key === 'joker') $('gGo').textContent = 'Joker einsacken 🃏';
    });
    $('gGo').onclick = () => close(() => done(prize));
  }

  // ================= Rubbellos =================
  function scratch(prize, ctx, done) {
    open('Rubbellos 🎟️', `
      <div class="feed-hint">Du warst zuckerfrei – rubbel dein Los frei!</div>
      <div class="scratch" id="scr">
        <div class="scr-prize"><div class="sp-e">${prize.emoji}</div><div class="sp-t">${prize.title}</div><div class="sp-s">${prize.sub || ''}</div></div>
        <canvas id="scrC"></canvas>
      </div>
      <button class="big primary" id="scrGo" style="width:100%;margin-top:16px" hidden>Einlösen 🎉</button>`, () => done(prize));
    const box = $('scr'), cv = $('scrC'), g = cv.getContext('2d');
    const r = box.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr; g.scale(dpr, dpr);
    const grad = g.createLinearGradient(0, 0, r.width, r.height);
    grad.addColorStop(0, '#f6d365'); grad.addColorStop(.5, '#fff1b8'); grad.addColorStop(1, '#e0a400');
    g.fillStyle = grad; g.fillRect(0, 0, r.width, r.height);
    g.fillStyle = 'rgba(90,60,0,.55)'; g.font = '700 22px system-ui'; g.textAlign = 'center';
    g.fillText('✨ Hier rubbeln ✨', r.width / 2, r.height / 2 + 8);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .5})`; g.fillRect(Math.random() * r.width, Math.random() * r.height, 2, 2); }
    g.globalCompositeOperation = 'destination-out';
    let down = false, last = null, moves = 0, revealed = false, lastTap = 0;
    const scrapeAt = (x, y) => {
      g.beginPath(); g.arc(x, y, 22, 0, 6.283); g.fill();
      if (last) { g.lineWidth = 44; g.lineCap = 'round'; g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(x, y); g.stroke(); }
      last = { x, y };
      const now = performance.now();
      if (now - lastTap > 70) { ctx.tap(); lastTap = now; }
      if (++moves % 8 === 0) check();
    };
    const pos = ev => { const b = cv.getBoundingClientRect(); return { x: ev.clientX - b.left, y: ev.clientY - b.top }; };
    cv.addEventListener('pointerdown', ev => { down = true; last = null; cap(cv, ev); const p = pos(ev); scrapeAt(p.x, p.y); });
    cv.addEventListener('pointermove', ev => { if (!down) return; const p = pos(ev); scrapeAt(p.x, p.y); });
    cv.addEventListener('pointerup', () => { down = false; last = null; check(); });
    function check() {
      if (revealed) return;
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, n = 0;
      for (let i = 3; i < d.length; i += 4 * 16) { n++; if (d[i] === 0) clear++; }
      if (clear / n > .5) reveal();
    }
    function reveal() {
      revealed = true;
      cv.style.transition = 'opacity .5s'; cv.style.opacity = '0';
      box.classList.add('won');
      ctx.haptic([0, 80, 160]);
      const b = box.getBoundingClientRect();
      ctx.sparkle(b.left + b.width / 2, b.top + b.height / 2, 'gold');
      $('scrGo').hidden = false;
    }
    $('scrGo').onclick = () => close(() => done(prize));
  }

  // ================= Glücksrad =================
  function wheel(segments, winIdx, ctx, done) {
    const n = segments.length, seg = 360 / n;
    const colors = ['#ff8fab', '#ffd166', '#7bdcb5', '#8ecae6', '#cdb4db', '#ffb4a2', '#b9fbc0', '#ffe5a5'];
    const R = 140;
    const path = i => {
      const a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180;
      return `M150 150 L${150 + R * Math.cos(a0)} ${150 + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${150 + R * Math.cos(a1)} ${150 + R * Math.sin(a1)} Z`;
    };
    const lab = i => { const a = ((i + .5) * seg - 90) * Math.PI / 180; return [150 + R * .66 * Math.cos(a), 150 + R * .66 * Math.sin(a)]; };
    open('Glücksrad 🎡', `
      <div class="wheel-wrap">
        <div class="wheel-ptr" id="wPtr">▼</div>
        <svg class="wheel" id="wheel" viewBox="0 0 300 300">
          <g id="wRot">${segments.map((s, i) => `<path d="${path(i)}" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="3"/>
            <text x="${lab(i)[0]}" y="${lab(i)[1]}" font-size="30" text-anchor="middle" dominant-baseline="central">${s.emoji}</text>`).join('')}
            <circle cx="150" cy="150" r="26" fill="#fff"/><text x="150" y="150" font-size="26" text-anchor="middle" dominant-baseline="central">🦄</text>
          </g>
        </svg>
      </div>
      <div class="wheel-res" id="wRes"></div>
      <button class="big primary" id="wGo" style="width:100%;margin-top:10px">Drehen! 🎡</button>`, () => done(segments[winIdx]));
    let spinning = false, finished = false;
    const spin = () => {
      if (spinning || finished) return;
      spinning = true; $('wGo').disabled = true;
      const end = 360 * (5 + Math.floor(Math.random() * 2)) + (360 - (winIdx * seg + seg / 2)) + rnd(-seg * .3, seg * .3);
      const dur = 4200, t0 = performance.now();
      let lastSeg = -1;
      const ease = k => 1 - Math.pow(1 - k, 4);
      const frame = now => {
        const k = Math.min(1, (now - t0) / dur);
        const a = end * ease(k);
        $('wRot').setAttribute('transform', `rotate(${a} 150 150)`);
        const s = Math.floor(((a % 360) + 360) % 360 / seg);
        if (s !== lastSeg) { lastSeg = s; ctx.tap(); const p = $('wPtr'); p.classList.remove('tick'); p.offsetHeight; p.classList.add('tick'); }
        if (k < 1) return requestAnimationFrame(frame);
        finished = true;
        const w = segments[winIdx];
        $('wRes').innerHTML = `<div class="wr-e">${w.emoji}</div><b>${w.title}</b><div>${w.sub || ''}</div>`;
        $('wRes').classList.add('show');
        ctx.haptic([0, 80, 160]);
        $('wGo').disabled = false; $('wGo').textContent = 'Einlösen 🎉';
        $('wGo').onclick = () => close(() => done(w));
      };
      requestAnimationFrame(frame);
    };
    $('wGo').onclick = spin;
    let x0 = null;
    $('wheel').addEventListener('pointerdown', ev => { x0 = [ev.clientX, ev.clientY]; });
    $('wheel').addEventListener('pointerup', ev => { if (x0 && Math.hypot(ev.clientX - x0[0], ev.clientY - x0[1]) > 30) spin(); x0 = null; });
  }

  window.Games = { init, open, close, progress, highfive, signature, candle, shake, gacha, RARITY, interview, swipe, feed, tresor, sticker, balloon, quiz, dial, darts, slider, swear, scratch, wheel };
})();
