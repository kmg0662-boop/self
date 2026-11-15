/* 말랑몬 선생님 — 게임 진행
   흐름: 알 부화 → (모르는 채로 배틀해서 져 봄) → 가르치기 → 배틀 → 진화 → 도감
   아이는 '선생님'이고, 짝꿍 말랑몬은 보여 준 예시만큼만 아는 작은 AI예요. */
(function () {
  'use strict';

  var B = window.MMBrain, A = window.MMArt, S = window.MMAudio;
  var T = A.TYPE, TYPES = B.TYPES;
  var stage = document.getElementById('stage');
  var root = stage, scale = 1, token = 0, STALE = { stale: true };
  var FAST = /[?&]fast=1/.test(location.search);
  var speed = FAST ? 0.04 : 1;
  var rnd = B.rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);

  /* ---------- 저장 ---------- */
  var KEY = 'mallangmon.v1';
  function fresh() {
    return { v: 1, egg: null, xp: 0, memory: [], dex: {}, review: [], phase: 'new', lessons: 0, trips: 0, friends: 0, muted: false, seenTricky: false, last: '' };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { /* 저장이 막힌 기기 */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장이 막혀도 놀 수는 있음 */ } }
  var state = load();
  S.setMuted(state.muted);

  /* ---------- 레벨 ---------- */
  var LV = [0, 4, 9, 15, 22, 30, 40, 52, 66, 82, 100, 120, 142, 166, 192];
  function level(xp) { var l = 1; for (var i = 1; i < LV.length; i++) if (xp >= LV[i]) l = i + 1; return l; }
  function form(lv) { return lv >= 6 ? 3 : lv >= 3 ? 2 : 1; }
  function lvProgress(xp) {
    var l = level(xp);
    if (l >= LV.length) return 1;
    return (xp - LV[l - 1]) / (LV[l] - LV[l - 1]);
  }
  function maxHearts() { return 2 + form(level(state.xp)); }
  function myForm() { return form(level(state.xp)); }

  /* ---------- 작은 도구 ---------- */
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function q(sel) { return root.querySelector(sel); }
  function wait(ms) {
    var t = token;
    return new Promise(function (res, rej) { setTimeout(function () { if (t === token) res(); else rej(STALE); }, ms * speed); });
  }
  function go(fn) {
    token++;
    S.hush();
    var p;
    try { p = fn(); } catch (e) { console.error(e); }
    if (p && p.catch) p.catch(function (e) { if (e !== STALE) console.error(e); });
  }
  function anim(node, frames, opt) {
    if (!node || !node.animate) return Promise.resolve();
    if (typeof opt === 'number') opt = { duration: opt };
    opt.duration = Math.max(1, opt.duration * speed);
    var a = node.animate(frames, opt);
    return new Promise(function (res) { a.onfinish = res; a.oncancel = res; });
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }
  function tname(type) { return '<span class="t-' + type + '">' + T[type].name + ' 타입</span>'; }
  function pt(e) { var r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
  function delay() { return 'style="--d:-' + (rnd() * 3).toFixed(2) + 's"'; }

  function mw(svg, x, y, size, cls) {
    return '<div class="mw ' + (cls || '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;transform-origin:50% 90%;--d:-' + (rnd() * 3).toFixed(2) + 's">' + svg + '</div>';
  }
  function mini(svg, cls) { return '<div class="mini ' + (cls || '') + '" ' + delay() + '>' + svg + '</div>'; }
  function partnerSvg(expr, f) { return A.partner(state.egg || 'berry', f || myForm(), { expr: expr }); }
  function setFace(wrap, expr) { if (wrap) A.setFace(wrap.querySelector('svg'), expr); }

  /* ---------- 그림 조각 ---------- */
  var ICON = {
    home: '<svg viewBox="0 0 48 48"><path d="M6 24 L24 7 L42 24 L37 24 L37 41 L28 41 L28 30 L20 30 L20 41 L11 41 L11 24 Z" fill="#ffb04d" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    soundOn: '<svg viewBox="0 0 48 48"><path d="M8 19 L16 19 L26 10 L26 38 L16 29 L8 29 Z" fill="#7fd0ff" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 17 C36 21 36 27 32 31 M36 11 C44 19 44 29 36 37" stroke="#2d2440" stroke-width="3.5" stroke-linecap="round" fill="none"/></svg>',
    soundOff: '<svg viewBox="0 0 48 48"><path d="M8 19 L16 19 L26 10 L26 38 L16 29 L8 29 Z" fill="#d9d5e3" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 18 L42 30 M42 18 L32 30" stroke="#ff4f6d" stroke-width="4" stroke-linecap="round"/></svg>',
    heart: '<svg viewBox="0 0 40 40"><path d="M20 35 C6 25 3 16 6 10 C9 4 17 4 20 10 C23 4 31 4 34 10 C37 16 34 25 20 35 Z" fill="#ff4f6d" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M11 11 C12 9 14 9 15 10" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
    bulb: '<svg viewBox="0 0 48 48"><path d="M24 4 C14 4 8 11 8 19 C8 25 11 28 14 32 L14 37 L34 37 L34 32 C37 28 40 25 40 19 C40 11 34 4 24 4 Z" fill="#ffe24a" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><rect x="16" y="37" width="16" height="7" rx="3" fill="#b9b2c9" stroke="#2d2440" stroke-width="3.5"/><path d="M17 17 C18 13 21 11 24 11" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
    teach: '<svg viewBox="0 0 110 110"><path d="M12 28 C30 20 44 22 55 30 C66 22 80 20 98 28 L98 86 C80 78 66 80 55 88 C44 80 30 78 12 86 Z" fill="#fff" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/><path d="M55 30 L55 88" stroke="#2d2440" stroke-width="5"/><path d="M24 42 C32 40 38 41 44 44 M24 56 C32 54 38 55 44 58 M66 44 C72 41 78 40 86 42 M66 58 C72 55 78 54 86 56" stroke="#ffb04d" stroke-width="5" stroke-linecap="round" fill="none"/><path transform="translate(84 24) scale(1.2)" d="' + A.STAR + '" fill="#ffd84a" stroke="#2d2440" stroke-width="3" stroke-linejoin="round"/></svg>',
    explore: '<svg viewBox="0 0 110 110"><path d="M10 92 C30 60 46 60 55 76 C66 52 84 50 100 92 Z" fill="#7ed36f" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/><path d="M52 78 L52 16" stroke="#2d2440" stroke-width="6" stroke-linecap="round"/><path d="M52 18 L90 30 L52 46 Z" fill="#ff4f6d" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/></svg>',
    dex: '<svg viewBox="0 0 110 110"><rect x="20" y="12" width="72" height="88" rx="12" fill="#fff" stroke="#2d2440" stroke-width="5"/><rect x="20" y="12" width="18" height="88" rx="8" fill="#ffd84a" stroke="#2d2440" stroke-width="5"/><circle cx="64" cy="48" r="16" fill="#ff8fb3" stroke="#2d2440" stroke-width="4.5"/><circle cx="58" cy="46" r="3" fill="#2d2440"/><circle cx="70" cy="46" r="3" fill="#2d2440"/><path d="M50 78 L80 78 M50 88 L72 88" stroke="#b9b2c9" stroke-width="5" stroke-linecap="round"/></svg>',
    hand: '<svg viewBox="0 0 96 96"><path d="M40 10 C46 10 50 14 50 20 L50 44 L66 47 C76 49 82 56 80 66 L78 78 C76 86 70 90 62 90 L44 90 C36 90 30 86 26 78 L16 58 C14 52 20 47 26 51 L30 56 L30 20 C30 14 34 10 40 10 Z" fill="#fff" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/></svg>',
    berry: '<svg viewBox="0 0 100 100"><path d="M50 24 C74 14 94 34 86 58 C80 78 62 93 50 95 C38 93 20 78 14 58 C6 34 26 14 50 24 Z" fill="#ff4f6d" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/><path d="M50 26 C40 10 26 12 22 20 C34 20 42 28 50 26 C58 28 66 20 78 20 C74 12 60 10 50 26 Z" fill="#52c443" stroke="#2c8a2a" stroke-width="4" stroke-linejoin="round"/><g fill="#ffe24a"><ellipse cx="36" cy="48" rx="3" ry="4.5"/><ellipse cx="54" cy="44" rx="3" ry="4.5"/><ellipse cx="70" cy="52" rx="3" ry="4.5"/><ellipse cx="44" cy="66" rx="3" ry="4.5"/><ellipse cx="62" cy="68" rx="3" ry="4.5"/></g><ellipse cx="32" cy="40" rx="7" ry="4" transform="rotate(-30 32 40)" fill="#fff" opacity=".5"/></svg>'
  };

  var CLOUD = 'M40 62 C8 62 8 24 44 26 C52 0 98 -2 106 26 C140 14 164 46 138 62 Z';

  function skyBits() {
    var rays = '';
    for (var i = 0; i < 12; i++) rays += '<rect x="-7" y="-112" width="14" height="34" rx="7" fill="#ffe680" transform="rotate(' + (i * 30) + ')"/>';
    return '<defs><linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74caff"/><stop offset="1" stop-color="#e6f9ff"/></linearGradient></defs>' +
      '<rect width="1280" height="800" fill="url(#g-sky)"/>' +
      '<g transform="translate(1110 150)"><g class="sun-rays">' + rays + '</g><circle r="64" fill="#ffd84a" stroke="#f2a81d" stroke-width="6"/></g>' +
      '<g class="cloud"><path transform="translate(0 90) scale(1.3)" d="' + CLOUD + '" fill="#fff" opacity=".95"/></g>' +
      '<g class="cloud c2"><path transform="translate(0 210) scale(.9)" d="' + CLOUD + '" fill="#fff" opacity=".85"/></g>' +
      '<g class="cloud c3"><path transform="translate(0 40) scale(.7)" d="' + CLOUD + '" fill="#fff" opacity=".8"/></g>';
  }

  function flowers(list) {
    return list.map(function (f) {
      return '<g transform="translate(' + f[0] + ' ' + f[1] + ')"><g class="sway" style="animation-delay:-' + (f[0] % 7) / 2 + 's"><path d="M0 0 L0 -22" stroke="#3f9a3a" stroke-width="5" stroke-linecap="round"/>' +
        '<g transform="translate(0 -26)"><circle cx="-8" r="7" fill="' + f[2] + '"/><circle cx="8" r="7" fill="' + f[2] + '"/><circle cy="-8" r="7" fill="' + f[2] + '"/><circle cy="8" r="7" fill="' + f[2] + '"/><circle r="5.5" fill="#ffe24a"/></g></g></g>';
    }).join('');
  }

  function sceneSky() {
    return '<svg class="bg" viewBox="0 0 1280 800" preserveAspectRatio="none">' + skyBits() +
      '<path d="M0 560 C200 470 380 520 560 500 C760 478 900 430 1280 520 L1280 800 L0 800 Z" fill="#b3ebaa"/>' +
      '<path d="M0 640 C260 560 520 600 760 620 C980 640 1120 590 1280 610 L1280 800 L0 800 Z" fill="#86d977"/>' +
      '<path d="M0 716 C300 684 900 696 1280 712 L1280 800 L0 800 Z" fill="#62c257"/>' +
      flowers([[90, 690, '#ff8fb3'], [210, 730, '#fff'], [1050, 700, '#ffb04d'], [1190, 742, '#ff8fb3'], [380, 760, '#b99bff'], [900, 764, '#fff']]) +
      '</svg>';
  }

  function sceneBattle() {
    return '<svg class="bg" viewBox="0 0 1280 800" preserveAspectRatio="none">' + skyBits() +
      '<path d="M0 420 C240 360 420 400 640 380 C860 360 1040 330 1280 390 L1280 800 L0 800 Z" fill="#b3ebaa"/>' +
      '<path d="M0 480 C300 430 700 470 1280 440 L1280 800 L0 800 Z" fill="#86d977"/>' +
      '<ellipse cx="955" cy="440" rx="200" ry="42" fill="#6cc65f"/><ellipse cx="955" cy="436" rx="186" ry="34" fill="#a5e38f"/>' +
      '<ellipse cx="310" cy="596" rx="236" ry="50" fill="#6cc65f"/><ellipse cx="310" cy="591" rx="220" ry="41" fill="#a5e38f"/>' +
      flowers([[640, 560, '#fff'], [720, 610, '#ff8fb3'], [1180, 560, '#ffb04d'], [560, 500, '#b99bff']]) +
      '</svg>';
  }

  var ZONE_ART = {
    fire: '<svg class="zone-art" viewBox="0 0 384 244" preserveAspectRatio="none"><rect width="384" height="244" fill="#ffc48a"/><circle cx="318" cy="52" r="30" fill="#ffe9a8" opacity=".8"/>' +
      '<circle cx="222" cy="46" r="14" fill="#fff" opacity=".55"/><circle cx="238" cy="26" r="10" fill="#fff" opacity=".45"/>' +
      '<path d="M-10 244 L96 126 C104 118 116 118 124 124 L152 146 L196 84 C204 74 220 74 228 84 L400 244 Z" fill="#8a4a3a"/>' +
      '<path class="lava" d="M196 86 C204 74 220 74 228 86 L238 112 C230 104 224 120 214 108 C208 102 200 118 188 104 Z" fill="#ffd23c"/>' +
      '<path class="lava" d="M0 244 C60 210 130 224 200 216 C270 208 330 202 384 218 L384 244 Z" fill="#ff7a3c"/>' +
      '<path d="M0 244 C80 230 150 238 220 232 C290 226 340 226 384 234 L384 244 Z" fill="#ffd23c"/></svg>',
    water: '<svg class="zone-art" viewBox="0 0 384 244" preserveAspectRatio="none"><rect width="384" height="244" fill="#cdf1ff"/>' +
      '<path transform="translate(200 20) scale(.6)" d="' + CLOUD + '" fill="#fff"/>' +
      '<path class="wave" d="M-40 132 C0 112 40 152 80 132 C120 112 160 152 200 132 C240 112 280 152 320 132 C360 112 400 152 440 132 L440 260 L-40 260 Z" fill="#8ad9ff"/>' +
      '<path class="wave w2" d="M-40 168 C0 148 40 188 80 168 C120 148 160 188 200 168 C240 148 280 188 320 168 C360 148 400 188 440 168 L440 260 L-40 260 Z" fill="#4dbaf6"/>' +
      '<path class="wave" d="M-40 206 C0 186 40 226 80 206 C120 186 160 226 200 206 C240 186 280 226 320 206 C360 186 400 226 440 206 L440 260 L-40 260 Z" fill="#2a93e0"/>' +
      '<circle cx="300" cy="96" r="9" fill="none" stroke="#fff" stroke-width="4"/><circle cx="330" cy="70" r="6" fill="none" stroke="#fff" stroke-width="3.5"/></svg>',
    grass: '<svg class="zone-art" viewBox="0 0 384 244" preserveAspectRatio="none"><rect width="384" height="244" fill="#e3f9cf"/>' +
      '<path d="M-10 244 C40 150 130 150 190 200 C240 150 330 140 400 220 L400 244 Z" fill="#9be283"/>' +
      '<rect x="290" y="130" width="16" height="70" rx="6" fill="#8a5a3a"/><g class="sway"><circle cx="298" cy="104" r="48" fill="#4fb848"/><circle cx="278" cy="90" r="12" fill="#7ad66a" opacity=".7"/></g>' +
      '<rect x="222" y="160" width="12" height="46" rx="5" fill="#8a5a3a"/><g class="sway" style="animation-delay:-1.2s"><circle cx="228" cy="142" r="32" fill="#62c257"/></g>' +
      '<path d="M0 244 C100 200 280 212 384 224 L384 244 Z" fill="#62c257"/></svg>'
  };

  /* ---------- 화면 틀 ---------- */
  function setScreen(name, html, opts) {
    opts = opts || {};
    var top = '<button class="ico-btn ico-sound" id="snd" aria-label="소리">' + (state.muted ? ICON.soundOff : ICON.soundOn) + '</button>' +
      (opts.home ? '<button class="ico-btn ico-home" id="hm" aria-label="집으로">' + ICON.home + '</button>' : '');
    stage.innerHTML = '<div class="scr scr-' + name + '">' + html + top + '</div>';
    root = stage.firstChild;
    q('#snd').addEventListener('click', function () {
      state.muted = !state.muted; S.setMuted(state.muted); save();
      this.innerHTML = state.muted ? ICON.soundOff : ICON.soundOn;
      S.sfx('tap');
    });
    if (opts.home) q('#hm').addEventListener('click', function () { S.sfx('tap'); go(home); });
    return root;
  }

  function talk(text, o) {
    o = o || {};
    var b = q('.bubble');
    if (!b) return Promise.resolve();
    b.classList.remove('on');
    void b.offsetWidth;
    b.innerHTML = '<span>' + text + '</span>';
    b.classList.add('on');
    S.say(strip(text));
    if (o.next) return nextTap();
    return wait(o.hold != null ? o.hold : 0);
  }
  function hideTalk() { var b = q('.bubble'); if (b) b.classList.remove('on'); }

  function nextTap() {
    var t = token, r = root;
    return new Promise(function (res) {
      var btn = el('<button class="btn yellow next pulse" aria-label="다음">▶</button>');
      r.appendChild(btn);
      btn.addEventListener('click', function () { if (t !== token) return; S.sfx('tap'); btn.remove(); res(); }, { once: true });
      if (FAST) setTimeout(function () { btn.click(); }, 30);
    });
  }

  function hand(x, y, mode, hx, hy) {
    clearHand();
    var down = / down/.test(mode); // 아래를 가리키는 손: 손끝이 (x, y)에 오도록
    var h = el('<div class="hand ' + mode + '" style="left:' + (x - (down ? 56 : 40)) + 'px;top:' + (y - (down ? 86 : 10)) + 'px;--hx:' + (hx || 0) + 'px;--hy:' + (hy || 0) + 'px">' + ICON.hand + '</div>');
    root.appendChild(h);
    return h;
  }
  function clearHand() { var h = q('.hand'); if (h) h.remove(); }

  /* ---------- 반짝이 ---------- */
  var CONFETTI = ['#ffd84a', '#ff8fb3', '#7fe08a', '#7fd0ff', '#b99bff', '#fff'];
  function burst(x, y, o) {
    o = o || {};
    var n = o.n || 14, colors = o.colors || CONFETTI, dist = o.dist || 170;
    for (var i = 0; i < n; i++) {
      var size = (o.size || 14) * (0.6 + rnd() * 0.9), c = colors[i % colors.length];
      var p = document.createElement('div');
      p.className = 'p' + (o.star ? ' star' : '');
      p.style.cssText = 'left:' + (x - size / 2) + 'px;top:' + (y - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px;background:' + c;
      if (o.star) p.innerHTML = '<svg viewBox="-15 -15 30 30"><path d="' + A.STAR + '" fill="' + c + '" stroke="#2d2440" stroke-width="2.5" stroke-linejoin="round"/></svg>';
      if (o.heart) { p.style.background = 'none'; p.innerHTML = ICON.heart; }
      root.appendChild(p);
      var ang = rnd() * Math.PI * 2, d = dist * (0.45 + rnd() * 0.75);
      var dx = Math.cos(ang) * d, dy = Math.sin(ang) * d - (o.up || 30);
      (function (p) {
        anim(p, [
          { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(' + (rnd() * 360) + 'deg)', opacity: 1, offset: 0.65 },
          { transform: 'translate(' + dx * 1.12 + 'px,' + (dy + 50) + 'px) scale(.2) rotate(' + (rnd() * 720) + 'deg)', opacity: 0 }
        ], { duration: 650 + rnd() * 500, easing: 'cubic-bezier(.2,.8,.3,1)' }).then(function () { p.remove(); });
      })(p);
    }
  }

  function hop(node, h) {
    h = h || 70;
    return anim(node, [
      { transform: 'translateY(0) scale(1,1)' },
      { transform: 'translateY(0) scale(1.12,.84)', offset: 0.16 },
      { transform: 'translateY(-' + h + 'px) scale(.93,1.09)', offset: 0.5 },
      { transform: 'translateY(0) scale(1.1,.88)', offset: 0.84 },
      { transform: 'translateY(0) scale(1,1)' }
    ], { duration: 540, easing: 'ease-out' });
  }
  function popIn(node) {
    return anim(node, [
      { transform: 'scale(0) translateY(40px)', opacity: 0 },
      { transform: 'scale(1.15,.9)', opacity: 1, offset: 0.6 },
      { transform: 'scale(.96,1.05)', offset: 0.8 },
      { transform: 'scale(1)' }
    ], { duration: 520, easing: 'ease-out' });
  }
  function shakeScreen() { var r = root; r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); }
  function flashOf(node) { node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash'); }

  /* ---------- 끌기 ---------- */
  function draggable(node, h) {
    var sx, sy, ox, oy, moved, active = false, pid;
    node.addEventListener('pointerdown', function (e) {
      if (h.locked && h.locked()) return;
      active = true; pid = e.pointerId; moved = false;
      try { node.setPointerCapture(pid); } catch (_) { /* 일부 브라우저 */ }
      var p = pt(e); sx = p.x; sy = p.y;
      ox = parseFloat(node.style.left); oy = parseFloat(node.style.top);
      node.style.transition = 'none';
      node.classList.add('grab');
      S.unlock();
      if (h.start) h.start();
      e.preventDefault();
    });
    node.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== pid) return;
      var p = pt(e), dx = p.x - sx, dy = p.y - sy;
      if (Math.abs(dx) + Math.abs(dy) > 16) moved = true;
      if (!moved) return;
      node.style.left = (ox + dx) + 'px'; node.style.top = (oy + dy) + 'px';
      if (h.move) h.move(ox + dx + node.offsetWidth / 2, oy + dy + node.offsetHeight / 2);
    });
    function end(e) {
      if (!active || e.pointerId !== pid) return;
      active = false;
      node.classList.remove('grab');
      h.drop(parseFloat(node.style.left) + node.offsetWidth / 2, parseFloat(node.style.top) + node.offsetHeight / 2, moved);
    }
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
  }
  function glide(node, x, y, ms) {
    node.style.transition = 'left ' + (ms || 350) * speed + 'ms cubic-bezier(.34,1.4,.64,1), top ' + (ms || 350) * speed + 'ms cubic-bezier(.34,1.4,.64,1)';
    node.style.left = x + 'px'; node.style.top = y + 'px';
    return wait(ms || 350);
  }

  /* ================================================================
     1. 타이틀
     ================================================================ */
  function title() {
    var cont = state.egg && state.phase !== 'new';
    var e = state.egg || 'berry';
    setScreen('title', sceneSky() +
      '<h1 class="logo"><span>말</span><span>랑</span><span>몬</span><em>선생님</em></h1>' +
      '<p class="tagline">내가 가르치면 점점 똑똑해져요!</p>' +
      mw(A.wild({ type: 'fire', shape: 0, hue: 14, head: 0, tail: 0, eyes: 0 }), 190, 380, 230) +
      mw(A.partner(e, cont ? myForm() : 2, { expr: 'happy' }), 500, 340, 280, 'title-me') +
      mw(A.wild({ type: 'water', shape: 1, hue: 210, head: 1, tail: 1, eyes: 1 }), 850, 390, 220) +
      mw(A.wild({ type: 'grass', shape: 2, hue: 118, head: 2, tail: 2, eyes: 2 }), 1030, 470, 180) +
      '<button class="btn btn-start pulse" id="start">' + (cont ? '이어서 하기' : '시작!') + '</button>');
    var me = q('.title-me');
    var loop = setInterval(function () { if (!document.body.contains(me)) return clearInterval(loop); hop(me, 40); }, 2600);
    q('#start').addEventListener('click', function () {
      S.unlock(); S.sfx('pop');
      try {
        var d = document.documentElement;
        if (d.requestFullscreen && !FAST) d.requestFullscreen().then(function () {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () { /* 잠글 수 없는 기기 */ });
        }).catch(function () { /* 전체 화면이 안 되는 브라우저 */ });
      } catch (err) { /* 무시 */ }
      go(resume);
    });
  }

  function resume() {
    if (!state.egg || state.phase === 'new') return eggScreen();
    if (state.phase === 'hatched') return firstBattle();
    if (state.phase === 'needTeach') return lesson();
    if (state.phase === 'firstTrip') return explore();
    return home();
  }

  /* ================================================================
     2. 알 고르기 → 부화 → 열매 먹이기 (누르기와 끌기 연습)
     ================================================================ */
  async function eggScreen() {
    var kinds = ['berry', 'grape', 'cloud'], xs = [200, 520, 840];
    var nest = '<svg viewBox="0 0 260 70"><ellipse cx="130" cy="36" rx="124" ry="30" fill="#c98d4f" stroke="#2d2440" stroke-width="5"/><ellipse cx="130" cy="28" rx="96" ry="16" fill="#8a5a3a"/><path d="M20 40 C60 60 200 60 240 40" stroke="#e8b06e" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';
    var html = sceneSky() + '<div class="bubble tail-none" style="left:240px;top:60px;width:800px;justify-content:center;text-align:center"></div>';
    kinds.forEach(function (k, i) {
      html += '<div class="nest" style="left:' + (xs[i] - 10) + 'px;top:560px">' + nest + '</div>' +
        '<div class="egg-w" data-k="' + k + '" style="left:' + xs[i] + 'px;top:350px;--d:-' + i * 0.7 + 's">' + A.egg(k, 0) + '</div>';
    });
    setScreen('egg', html);
    await wait(300);
    talk('마음에 드는 알을 하나 골라 봐!');
    hand(640, 500, 'tap');

    var chosen = await new Promise(function (res) {
      Array.prototype.forEach.call(root.querySelectorAll('.egg-w'), function (n) {
        n.addEventListener('click', function () { res(n); }, { once: true });
      });
      if (FAST) setTimeout(function () { root.querySelectorAll('.egg-w')[0].click(); }, 30);
    });
    clearHand(); S.sfx('pick');
    var kind = chosen.getAttribute('data-k');
    state.egg = kind;
    Array.prototype.forEach.call(root.querySelectorAll('.egg-w'), function (n) { if (n !== chosen) { n.style.opacity = 0; n.style.transform = 'scale(.4)'; n.style.pointerEvents = 'none'; } });
    Array.prototype.forEach.call(root.querySelectorAll('.nest'), function (n, i) { if (kinds[i] !== kind) n.style.opacity = 0; n.style.transition = 'opacity .4s, left .5s'; });
    chosen.style.transition = 'left .5s cubic-bezier(.34,1.4,.64,1), transform .5s cubic-bezier(.34,1.4,.64,1)';
    chosen.style.left = '520px'; chosen.style.transform = 'scale(1.25)'; chosen.style.transformOrigin = '50% 90%';
    root.querySelectorAll('.nest')[kinds.indexOf(kind)].style.left = '510px';
    await wait(600);
    talk('알을 <b>톡톡톡</b> 두드려 봐!');
    hand(640, 520, 'tap');

    var crack = 0;
    await new Promise(function (res) {
      function knock() {
        crack++;
        clearHand();
        S.sfx('crack');
        chosen.innerHTML = A.egg(kind, Math.min(crack, 4));
        chosen.classList.remove('knock'); void chosen.offsetWidth; chosen.classList.add('knock');
        burst(640, 470, { n: 5, dist: 90, colors: ['#fff8ec', A.EGGS[kind].body], size: 10 });
        if (crack >= 5) { chosen.removeEventListener('pointerdown', knock); res(); }
      }
      chosen.addEventListener('pointerdown', knock);
      if (FAST) { var iv = setInterval(function () { if (crack >= 5) return clearInterval(iv); knock(); }, 20); }
    });
    await wait(250);

    // 부화!
    var white = el('<div style="position:absolute;inset:0;background:#fff;z-index:25;pointer-events:none;opacity:0"></div>');
    root.appendChild(white);
    S.sfx('fanfare');
    await anim(white, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' });
    chosen.remove();
    var me = el(mw(A.partner(kind, 1, { expr: 'happy' }), 490, 330, 300, 'me'));
    root.appendChild(me);
    anim(white, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).then(function () { white.remove(); });
    burst(640, 480, { n: 26, star: true, size: 30, dist: 300 });
    await popIn(me);
    state.phase = 'new'; save();
    hop(me);
    await talk('안녕! 나는 <b>말랑몬</b>이야!', { next: true });
    setFace(me, 'normal');
    await talk('배가 고파… 열매를 <b>끌어다</b> 줘!');

    // 끌기 연습
    var berry = el('<div class="berry wait" style="left:980px;top:420px">' + ICON.berry + '</div>');
    root.appendChild(berry);
    popIn(berry);
    hand(1040, 500, 'dragging', -380, 0);
    var taps = 0;
    await new Promise(function (res) {
      function eat() { res(); }
      draggable(berry, {
        start: function () { clearHand(); berry.classList.remove('wait'); setFace(me, 'wow'); },
        drop: function (x, y, moved) {
          var near = Math.abs(x - 640) < 190 && Math.abs(y - 500) < 200;
          if (near) return eat();
          if (!moved) {
            taps++;
            if (taps >= 3) return glide(berry, 580, 440, 500).then(eat, function () { /* 화면이 바뀜 */ });
            talk('꾹 누른 채로 <b>끌어</b> 봐!');
          }
          glide(berry, 980, 420, 350).catch(function () { /* 화면이 바뀜 */ });
          setFace(me, 'normal');
          hand(1040, 500, 'dragging', -380, 0);
        }
      });
      if (FAST) setTimeout(eat, 30);
    });
    clearHand();
    S.sfx('good');
    anim(berry, [{ transform: 'scale(1)' }, { transform: 'scale(0)' }], { duration: 250, fill: 'forwards' }).then(function () { berry.remove(); });
    setFace(me, 'happy');
    burst(640, 430, { n: 8, heart: true, size: 40, dist: 150, up: 90 });
    await hop(me);
    await talk('냠냠! 고마워, <b>선생님</b>!', { next: true });
    setFace(me, 'wow');
    await talk('어? 밖에 누가 있나 봐. 나가 보자!', { next: true });
    state.phase = 'hatched'; save();
    go(firstBattle);
  }

  /* ================================================================
     3. 배틀 화면
     ================================================================ */
  var ME = { x: 150, y: 300, size: 320, cx: 310, cy: 470 };
  var FOE = { x: 820, y: 190, size: 270, cx: 955, cy: 330 };

  function heartsHtml(n, max) {
    var s = '';
    for (var i = 0; i < max; i++) s += ICON.heart.replace('<svg ', '<svg ' + (i < n ? '' : 'class="off" '));
    return s;
  }

  function battleScreen(canLeave) {
    setScreen('battle', sceneBattle() +
      '<div class="hud me"><div class="nm">내 짝꿍 · Lv.' + level(state.xp) + '</div><div class="hearts" id="hearts"></div></div>' +
      '<div class="hud foe"><div class="nm" id="foe-nm">???</div><div class="hpbar"><i id="foe-hp"></i></div></div>' +
      '<div class="think" id="think" style="left:70px;top:128px;height:176px"></div>' +
      mw(partnerSvg('normal'), ME.x, ME.y, ME.size, 'me') +
      '<div class="bubble battle-bubble tail-none" style="left:50px;right:400px;bottom:30px"></div>', { home: canLeave });
    var bs = {
      me: q('.me'), foe: null, hearts: maxHearts(), max: maxHearts(),
      setHearts: function (n) { bs.hearts = n; q('#hearts').innerHTML = heartsHtml(n, bs.max); },
      setHp: function (pct) { var i = q('#foe-hp'); i.style.width = pct + '%'; i.className = pct < 50 ? 'low' : ''; },
      think: function (html) { var t = q('#think'); t.innerHTML = html; t.classList.add('on'); },
      unthink: function () { q('#think').classList.remove('on'); },
      spawn: async function (m) {
        if (bs.foe) bs.foe.remove();
        q('#foe-nm').innerHTML = '???';
        bs.setHp(100);
        bs.foe = el(mw(A.wild(m), FOE.x, FOE.y, FOE.size, 'foe'));
        bs.foe.querySelector('svg').setAttribute('data-eyes', m.eyes);
        bs.foe.querySelector('svg').setAttribute('data-face-y', 116);
        root.appendChild(bs.foe);
        S.sfx('pop');
        await anim(bs.foe, [
          { transform: 'translate(360px,-40px) scale(.6)', opacity: 0 },
          { transform: 'translate(-20px,0) scale(1.08,.92)', opacity: 1, offset: 0.7 },
          { transform: 'translate(0,0) scale(1)' }
        ], { duration: 600, easing: 'ease-out' });
      },
      // 공격: 누가(from) 누구에게(to) 무슨 타입 공격을, 세게(strong)?
      shoot: async function (type, mine, strong) {
        var a = mine ? ME : FOE, b = mine ? FOE : ME;
        var attacker = mine ? bs.me : bs.foe, target = mine ? bs.foe : bs.me;
        var dir = mine ? 1 : -1;
        await anim(attacker, [
          { transform: 'translate(0,0) scale(1)' },
          { transform: 'translate(' + (-26 * dir) + 'px,8px) scale(1.08,.9)', offset: 0.3 },
          { transform: 'translate(' + (70 * dir) + 'px,' + (-24 * dir) + 'px) scale(.95,1.06)', offset: 0.6 },
          { transform: 'translate(0,0) scale(1)' }
        ], { duration: 420, easing: 'ease-in-out' });
        var s = el('<div class="shot" style="left:' + (a.cx - 48) + 'px;top:' + (a.cy - 48) + 'px">' + A.typeIcon(type) + '</div>');
        root.appendChild(s);
        S.sfx('whoosh');
        var dx = b.cx - a.cx, dy = b.cy - a.cy;
        await anim(s, [
          { transform: 'translate(0,0) scale(.4) rotate(0deg)' },
          { transform: 'translate(' + dx / 2 + 'px,' + (dy / 2 - 110) + 'px) scale(1.25) rotate(' + 300 * dir + 'deg)', offset: 0.5 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (strong ? 1.7 : 0.8) + ') rotate(' + 600 * dir + 'deg)' }
        ], { duration: 480, easing: 'ease-in' });
        s.remove();
        burst(b.cx, b.cy, { colors: [T[type].color, '#fff', T[type].soft, T[type].color], n: strong ? 24 : 7, dist: strong ? 240 : 90, size: strong ? 22 : 12 });
        S.sfx(strong ? 'bighit' : (mine ? 'weak' : 'hit'));
        if (strong || !mine) { flashOf(target); shakeScreen(); }
        await anim(target, [
          { transform: 'translate(0,0)' },
          { transform: 'translate(' + (strong ? 34 : 12) * dir + 'px,-6px) rotate(' + (strong ? 8 : 3) * dir + 'deg)', offset: 0.3 },
          { transform: 'translate(0,0)' }
        ], { duration: 320, easing: 'ease-out' });
      },
      callout: function (text, cls) {
        var c = el('<div class="callout ' + (cls || '') + '">' + text + '</div>');
        root.appendChild(c);
        setTimeout(function () { c.remove(); }, 1150);
      }
    };
    bs.setHearts(bs.hearts);
    return bs;
  }

  function attackTap() {
    var t = token, r = root;
    return new Promise(function (res) {
      var btn = el('<button class="btn yellow btn-attack pulse" style="left:auto;right:44px;margin:0;width:320px">가라!</button>');
      r.appendChild(btn);
      popIn(btn);
      btn.addEventListener('click', function () { if (t !== token) return; S.sfx('pop'); btn.remove(); res(); }, { once: true });
      if (FAST) setTimeout(function () { btn.click(); }, 30);
    });
  }

  /* 맨 처음 배틀: 배운 게 없어서 져 본다 → "가르쳐 줘!" (왜 배워야 하는지 먼저 느끼기) */
  async function firstBattle() {
    var bs = battleScreen(false);
    var m = B.makeMonster(rnd, { type: 'fire', shape: 0, mode: 'clear' });
    await wait(400);
    await bs.spawn(m);
    setFace(bs.me, 'wow');
    await talk('야생 말랑몬이야! 친구가 되고 싶어!', { next: true });
    await talk('<b>딱 맞는 공격</b>을 하면 친구가 될 수 있대.', { next: true });
    hideTalk();
    await attackTap();
    setFace(bs.me, 'think'); bs.me.classList.add('glow'); S.sfx('think');
    bs.think('<div class="dotty"><i></i><i></i><i></i></div>');
    await wait(1100);
    bs.think('<span class="q">?</span><span class="q" style="animation-delay:.15s">?</span><span class="q" style="animation-delay:.3s">?</span>');
    bs.me.classList.remove('glow');
    setFace(bs.me, 'ouch');
    await talk('으앙… 무슨 타입인지 <b>하나도 모르겠어!</b>', { hold: 2400 });
    bs.unthink();
    await bs.shoot(m.type, false, false);
    bs.setHearts(bs.hearts - 1);
    await wait(500);
    S.sfx('whoosh');
    await anim(bs.foe, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(420px,-60px) scale(.6)', opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' });
    await talk('아야… 나는 아직 <b>배운 게 없어서</b> 몰랐어.', { next: true });
    setFace(bs.me, 'normal');
    await talk('선생님! 나한테 <b>타입</b>을 가르쳐 줘!', { next: true });
    state.phase = 'needTeach'; save();
    go(lesson);
  }

  /* ================================================================
     4. 수업: 말랑몬을 타입별 집으로 끌어다 놓으면, 짝꿍이 그걸 보고 기억한다
     ================================================================ */
  var ZONES = [{ type: 'fire', x: 40 }, { type: 'water', x: 448 }, { type: 'grass', x: 856 }];
  var HEAD_HINT = ['불꽃', '지느러미', '새싹'];

  function hueFamily(h) { return h >= 340 || h < 62 ? 'fire' : h < 168 ? 'grass' : 'water'; }

  function buildCards(first) {
    var cards = [];
    if (first) {
      TYPES.forEach(function (t) { cards.push({ m: B.makeMonster(rnd, { type: t, mode: 'clear' }), labeled: false }); });
      return shuffle(cards);
    }
    // 배틀에서 헷갈렸던 친구를 먼저 가르친다 (틀린 문제 다시 보기)
    while (state.review.length && cards.length < 2) cards.push({ m: state.review.shift(), labeled: true });
    var types = shuffle(TYPES.slice());
    var i = 0;
    while (cards.length < 4) { cards.push({ m: B.makeMonster(rnd, { type: types[i % 3], mode: 'wild' }), labeled: false }); i++; }
    return shuffle(cards);
  }

  async function lesson() {
    var first = state.memory.length === 0;
    var cards = buildCards(first);
    var before = { xp: state.xp, smart: B.smartness(state.memory) };
    var html = sceneSky();
    ZONES.forEach(function (z) {
      var have = state.memory.filter(function (e) { return e.type === z.type; }).slice(-5);
      html += '<div class="zone" data-t="' + z.type + '" style="left:' + z.x + 'px">' + ZONE_ART[z.type] +
        '<div class="shelf">' + have.map(function (e) { return mini(A.wild(e)); }).join('') + '</div>' +
        '<div class="zone-label">' + A.typeIcon(z.type) + T[z.type].name + '</div></div>';
    });
    html += mw(partnerSvg('normal'), 24, 96, 210, 'me') +
      '<div class="bubble tail-left" style="left:262px;top:112px;width:700px"></div>' +
      '<div class="dots">' + cards.map(function () { return '<i></i>'; }).join('') + '</div>' +
      '<div class="pill lesson-smart">' + ICON.bulb + '<div class="bar smart"><i id="sm-bar" style="width:' + before.smart + '%"></i></div><span class="num" id="sm-num">' + before.smart + '</span></div>';
    setScreen('lesson', html, { home: state.phase === 'free' });
    var me = q('.me');
    await wait(400);
    if (first) await talk('여기는 말랑몬 학교야! 친구들이 사는 곳을 알려 줘.', { hold: 3000 });

    for (var i = 0; i < cards.length; i++) {
      await teachOne(cards[i], i, me, first && i === 0);
      root.querySelectorAll('.dots i')[i].classList.add('done');
    }

    state.lessons++; state.last = 'teach';
    if (state.phase === 'needTeach') state.phase = 'firstTrip';
    save();
    setFace(me, 'happy'); hop(me);
    await talk('수업 끝! 나 <b>더 똑똑해졌어!</b>', { hold: 1600 });
    var after = B.smartness(state.memory);
    await reward({
      title: '수업 끝!', before: before,
      lines: first ? ['많이 보여 줄수록 짝꿍이 똑똑해져요!']
        : after < before.smart ? ['새 친구가 낯설어서 조금 헷갈리나 봐. 더 보여 주면 정리돼요!']
          : after >= 100 && before.smart < 100 ? ['우와, 100점! 정말 훌륭한 선생님이에요!'] : []
    });
    go(state.phase === 'firstTrip' ? explore : home);
  }

  function zoneAt(x, y) {
    if (y < 470) return null;
    return x < 436 ? ZONES[0] : x < 844 ? ZONES[1] : ZONES[2];
  }

  async function teachOne(c, idx, me, showHow) {
    var m = c.m, HOME_X = 505, HOME_Y = 252, headName = HEAD_HINT[TYPES.indexOf(m.type)];
    var card = el('<div class="card" style="left:' + HOME_X + 'px;top:' + HOME_Y + 'px">' + mw(A.wild(m), 0, 0, 270) +
      (c.labeled ? '<div class="tag">' + A.typeIcon(m.type) + T[m.type].name + '</div>' : '') + '</div>');
    root.appendChild(card);
    S.sfx('pop');
    await popIn(card);
    if (c.labeled) talk('아까 헷갈린 친구야! 이름표를 보고 알려 줘.');
    else if (showHow) talk('이 친구는 어디에 살까? <b>끌어서</b> 집에 데려다 줘!');
    else talk(['이 친구는 어디에 살까?', '이 친구는 무슨 타입일까?', '머리를 잘 보고 알려 줘!'][idx % 3]);
    if (showHow) hand(HOME_X + 135, HOME_Y + 170, 'dragging', 0, 260);

    var tries = 0, busy = false, picked = false;
    var zoneEls = root.querySelectorAll('.zone');
    function clearHot() { Array.prototype.forEach.call(zoneEls, function (z) { z.classList.remove('hot'); }); }
    function zel(type) { return root.querySelector('.zone[data-t="' + type + '"]'); }

    await new Promise(function (res) {
      function judge(z) {
        clearHot(); clearHand();
        card.classList.remove('picked'); picked = false;
        if (z.type === m.type) { busy = true; res(z); return; }
        tries++;
        S.sfx('bad');
        var ze = zel(z.type); ze.classList.remove('nope'); void ze.offsetWidth; ze.classList.add('nope');
        glide(card, HOME_X, HOME_Y, 380).catch(function () { /* 화면이 바뀜 */ });
        setFace(me, 'think');
        talk(c.labeled ? '이름표를 다시 볼까? <b>' + T[m.type].name + '</b>이라고 써 있어!' : '머리를 봐! <b>' + headName + '</b>' + josa(headName, '이', '가') + ' 있어.');
        if (tries >= 2) zel(m.type).classList.add('hint');
      }
      draggable(card, {
        locked: function () { return busy; },
        start: function () { clearHand(); S.sfx('pick'); },
        move: function (x, y) { clearHot(); var z = zoneAt(x, y); if (z) zel(z.type).classList.add('hot'); },
        drop: function (x, y, moved) {
          var z = zoneAt(x, y);
          if (z) return judge(z);
          if (!moved) { // 끌기가 어려우면: 톡 누르고 → 집을 톡 눌러도 돼요
            picked = !picked;
            card.classList.toggle('picked', picked);
            if (picked) talk('이제 <b>집</b>을 눌러 봐!');
          }
          glide(card, HOME_X, HOME_Y, 300).catch(function () { /* 화면이 바뀜 */ });
        }
      });
      Array.prototype.forEach.call(zoneEls, function (ze) {
        ze.onclick = function () { if (picked && !busy) judge({ type: ze.getAttribute('data-t') }); };
      });
      if (FAST) setTimeout(function () { judge({ type: m.type }); }, 30);
    });

    // 맞혔다 → 집으로 쏙, 짝꿍은 기억!
    var ze = zel(m.type), zx = ZONES[TYPES.indexOf(m.type)].x;
    Array.prototype.forEach.call(zoneEls, function (z) { z.classList.remove('hint'); z.onclick = null; });
    S.sfx('good');
    card.style.transition = 'left ' + 420 * speed + 'ms cubic-bezier(.5,0,.3,1), top ' + 420 * speed + 'ms cubic-bezier(.5,0,.3,1), transform ' + 420 * speed + 'ms';
    card.style.left = (zx + 180) + 'px'; card.style.top = '520px'; card.style.transform = 'scale(.34)';
    await wait(420);
    card.remove();
    var shelf = ze.querySelector('.shelf');
    var mn = el(mini(A.wild(m)));
    shelf.appendChild(mn);
    while (shelf.children.length > 5) shelf.removeChild(shelf.firstChild);
    popIn(mn);
    ze.classList.remove('yes'); void ze.offsetWidth; ze.classList.add('yes');
    burst(zx + 192, 640, { n: 12, star: true, size: 24, dist: 150 });

    state.memory.push({ type: m.type, hue: m.hue, head: m.head, tail: m.tail, shape: m.shape, eyes: m.eyes });
    if (state.memory.length > 160) state.memory.shift();
    state.xp += 1;
    save();

    // 짝꿍이 배우는 모습
    me.classList.add('glow'); setFace(me, 'wow'); S.sfx('learn');
    var smart = B.smartness(state.memory);
    q('#sm-bar').style.width = smart + '%'; q('#sm-num').textContent = smart;
    hop(me, 46);
    var tricky = hueFamily(m.hue) !== m.type;
    var line;
    if (tricky && !state.seenTricky) {
      state.seenTricky = true; save();
      line = '색은 달라도 머리에 <b>' + headName + '</b>' + josa(headName, '이', '가') + ' 있으면 ' + tname(m.type) + '이구나!';
      await talk(line, { hold: 3600 });
    } else {
      line = [tname(m.type) + '은 이렇게 생겼구나. 기억했어!', '아하! ' + tname(m.type) + ' 하나 더 배웠어!', '기억 주머니에 쏙! ' + tname(m.type) + '!'][idx % 3];
      await talk(line, { hold: 1900 });
    }
    // 진짜로 알아챈 순간에만 말한다 (두뇌가 머리 장식을 가장 믿게 됐을 때)
    if (!state.aha && B.knowsHeadMatters(state.memory)) {
      state.aha = true; save();
      S.sfx('fanfare'); hop(me);
      burst(130, 190, { n: 16, star: true, size: 26, dist: 200 });
      await talk('아하! 알았다! <b>색보다 머리</b>를 봐야 하는구나!', { hold: 3600 });
    }
    me.classList.remove('glow'); setFace(me, 'normal');
  }

  /* ================================================================
     5. 탐험(배틀): 짝꿍이 기억을 떠올려 타입을 맞히고, 딱 맞는 공격을 한다
     ================================================================ */
  async function explore() {
    var firstTrip = state.phase === 'firstTrip';
    var before = { xp: state.xp, smart: B.smartness(state.memory) };
    var bs = battleScreen(!firstTrip);
    var made = [], missed = 0, out = false;
    await wait(300);
    if (firstTrip) await talk('이제 배웠으니까 다시 가 보자!', { hold: 2000 });

    for (var n = 0; n < 3 && !out; n++) {
      // 첫 탐험의 첫 상대는 뚜렷하게 생긴 친구 (배운 게 통하는 기쁨 먼저)
      var m = B.makeMonster(rnd, { mode: firstTrip && n === 0 ? 'clear' : 'wild' });
      var r = await encounter(bs, m, n === 0 && firstTrip);
      if (r.friend) made.push(m);
      if (r.missed) missed++;
      if (bs.hearts <= 0) out = true;
    }

    state.trips++; state.last = 'explore';
    if (firstTrip) state.phase = 'free';
    save();
    var lines = [];
    if (out) lines.push('힘이 다 빠졌어. 더 배우고 다시 오자!');
    if (missed) lines.push('헷갈린 친구를 <b>가르쳐 주면</b> 다음엔 맞힐 수 있어요!');
    else if (made.length) lines.push('하나도 안 틀렸어! 정말 잘 가르쳤어요!');
    await reward({ title: made.length ? '친구 ' + made.length + '마리가 생겼어!' : '탐험 끝!', before: before, friends: made, lines: lines });
    go(home);
  }

  async function encounter(bs, m, explain) {
    var result = { friend: false, missed: false };
    setFace(bs.me, 'normal');
    await bs.spawn(m);
    talk('야생 말랑몬이 나타났어!');
    await attackTap();
    hideTalk();

    // 생각하기: 기억 속에서 가장 닮은 친구를 떠올린다
    var g = B.guess(state.memory, m), gt = g.ranked[0];
    setFace(bs.me, 'think'); bs.me.classList.add('glow'); S.sfx('think');
    bs.think('<div class="dotty"><i></i><i></i><i></i></div>');
    await wait(900);
    bs.think(mini(A.wild(g.nearest)) + '<span class="arrow">▶</span><span class="ticon">' + A.typeIcon(gt) + '</span>');
    await talk('기억 속 이 친구랑 닮았어! ' + tname(gt) + ' 같아!', { hold: 2500 });
    bs.me.classList.remove('glow');
    var move = B.COUNTER[gt];
    setFace(bs.me, 'happy');
    await talk((explain ? T[gt].name + '에는 ' + T[move].name + '! ' : '') + '<b>' + T[move].move + '!</b>', { hold: explain ? 1700 : 800 });
    bs.unthink();

    if (gt === m.type) {
      await bs.shoot(move, true, true);
      bs.callout('딱 맞았어!', 'good');
      bs.setHp(0);
    } else {
      // 잘못 봤다 → 공격이 안 통하고, 한 대 맞는다
      result.missed = true;
      await bs.shoot(move, true, false);
      bs.callout('어라? 안 통해…', 'meh');
      bs.setHp(78);
      setFace(bs.me, 'wow');
      await talk('앗, <b>잘못 봤나 봐!</b>', { hold: 1500 });
      await bs.shoot(m.type, false, false);
      setFace(bs.me, 'ouch');
      bs.setHearts(bs.hearts - 1);
      state.review.push({ type: m.type, hue: m.hue, head: m.head, tail: m.tail, shape: m.shape, eyes: m.eyes });
      if (state.review.length > 6) state.review.shift();
      save();
      if (bs.hearts <= 0) {
        await talk('으앙, 힘이 다 빠졌어…', { hold: 1900 });
        await anim(bs.foe, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(420px,-60px) scale(.6)', opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' });
        return result;
      }
      await talk('아야! 이건 ' + T[m.type].name + ' 공격… ' + tname(m.type) + '이었구나!', { hold: 2600 });
      setFace(bs.me, 'happy');
      var right = B.COUNTER[m.type];
      await talk('이번엔 진짜! <b>' + T[right].move + '!</b>', { hold: 900 });
      await bs.shoot(right, true, true);
      bs.callout('딱 맞았어!', 'good');
      bs.setHp(0);
    }

    // 쓰러졌다가 → 친구가 된다
    A.setFace(bs.foe.querySelector('svg'), 'ouch');
    await anim(bs.foe, [
      { transform: 'translate(0,0) rotate(0)' },
      { transform: 'translate(30px,-30px) rotate(20deg)', offset: 0.4 },
      { transform: 'translate(40px,10px) rotate(84deg) scale(.9)' }
    ], { duration: 520, easing: 'ease-in', fill: 'forwards' });
    await wait(450);
    bs.foe.getAnimations().forEach(function (a) { a.cancel(); });
    A.setFace(bs.foe.querySelector('svg'), 'happy');
    S.sfx('heart');
    burst(FOE.cx, FOE.cy - 40, { n: 9, heart: true, size: 42, dist: 170, up: 100 });
    hop(bs.foe); hop(bs.me);
    var nm = A.speciesName(m);
    q('#foe-nm').innerHTML = A.typeIcon(m.type) + nm;
    var key = m.type + '-' + m.shape;
    var isNew = !state.dex[key];
    if (!state.dex[key]) state.dex[key] = { m: { type: m.type, hue: m.hue, head: m.head, tail: m.tail, shape: m.shape, eyes: m.eyes }, n: 0 };
    state.dex[key].n++;
    state.friends++; state.xp += 2;
    save();
    result.friend = true;
    await talk('<b>' + nm + '</b>' + josa(nm, '이', '가') + ' 친구가 됐어!' + (isNew ? ' 도감에 쏙!' : ''), { hold: 2300 });
    if (result.missed) await talk('이 친구는 헷갈렸어. 나중에 <b>가르쳐 줘!</b>', { hold: 2200 });
    S.sfx('whoosh');
    await anim(bs.foe, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(-300px,160px) scale(.3)', opacity: 0 }], { duration: 480, easing: 'ease-in', fill: 'forwards' });
    return result;
  }

  // 받침에 따라 '이/가' 고르기
  function josa(word, a, b) {
    var c = word.charCodeAt(word.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return a;
    return (c - 0xac00) % 28 ? a : b;
  }

  /* ================================================================
     6. 보상 판 + 진화
     ================================================================ */
  async function reward(o) {
    var smart = B.smartness(state.memory), lvB = level(o.before.xp), lvA = level(state.xp);
    var veil = el('<div class="veil"><div class="panel">' +
      '<h2>' + o.title + '</h2>' +
      (o.friends && o.friends.length ? '<div class="friends">' + o.friends.map(function (m, i) { return mini(A.wild(m, { expr: 'happy' })).replace('class="mini', 'style="animation-delay:' + (i * 0.15) + 's" class="mini'); }).join('') + '</div>' : '') +
      (o.lines || []).map(function (l) { return '<p>' + l + '</p>'; }).join('') +
      '<div class="row">' + ICON.bulb + '<span>똑똑함</span><div class="bar smart"><i id="rw-sm" style="width:' + o.before.smart + '%"></i></div><span class="num" id="rw-smn">' + o.before.smart + '</span></div>' +
      '<div class="row"><span class="pill" style="padding:0 18px;height:64px;box-shadow:none"><span id="rw-lv">Lv.' + lvB + '</span></span><span>힘</span><div class="bar"><i id="rw-xp" style="width:' + lvProgress(o.before.xp) * 100 + '%"></i></div><span class="num" id="rw-up"></span></div>' +
      '</div></div>');
    root.appendChild(veil);
    S.say(strip(o.title + ' ' + (o.lines || []).join(' ')));
    await wait(650);
    S.sfx('gauge');
    veil.querySelector('#rw-sm').style.width = smart + '%';
    veil.querySelector('#rw-smn').innerHTML = smart + (smart > o.before.smart ? ' <span class="up">▲' + (smart - o.before.smart) + '</span>' : '');
    await wait(500);
    var xpBar = veil.querySelector('#rw-xp');
    if (lvA > lvB) {
      xpBar.style.width = '100%';
      await wait(900);
      S.sfx('fanfare');
      xpBar.style.transition = 'none'; xpBar.style.width = '0%'; void xpBar.offsetWidth; xpBar.style.transition = '';
      veil.querySelector('#rw-lv').textContent = 'Lv.' + lvA;
      veil.querySelector('#rw-up').innerHTML = '<span class="up">레벨 업!</span>';
      burst(640, 400, { n: 22, star: true, size: 28, dist: 320 });
    }
    xpBar.style.width = lvProgress(state.xp) * 100 + '%';
    await wait(500);
    var t = token;
    await new Promise(function (res) {
      var btn = el('<button class="btn green pulse">좋아!</button>');
      veil.querySelector('.panel').appendChild(btn);
      btn.addEventListener('click', function () { if (t === token) { S.sfx('tap'); res(); } }, { once: true });
      if (FAST) setTimeout(function () { btn.click(); }, 30);
    });
    veil.remove();
    if (form(lvA) > form(lvB)) await evolution(form(lvB), form(lvA));
  }

  async function evolution(from, to) {
    var ev = el('<div class="evo"><div class="rays"></div><h2>어…?!</h2>' +
      '<div class="mw" id="evo-me">' + A.partner(state.egg, from, { expr: 'wow' }) + '</div><div class="whiteout"></div></div>');
    root.appendChild(ev);
    var me = ev.querySelector('#evo-me'), h2 = ev.querySelector('h2'), wo = ev.querySelector('.whiteout');
    S.say('어? 몸이 이상해!');
    await wait(1300);
    S.sfx('evolve');
    me.classList.add('white', 'pulse-a');
    await wait(1500);
    await anim(wo, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' });
    me.classList.remove('white', 'pulse-a');
    me.innerHTML = A.partner(state.egg, to, { expr: 'happy' });
    S.sfx('fanfare');
    h2.textContent = '진화했어!';
    anim(wo, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
    var keep = root; root = ev;
    burst(640, 440, { n: 34, star: true, size: 34, dist: 420 });
    root = keep;
    await anim(me, [{ transform: 'scale(.5)' }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' });
    S.say('우와! 진화했어! 더 강해졌어!');
    hop(me);
    await wait(700);
    var t = token;
    await new Promise(function (res) {
      var btn = el('<button class="btn yellow pulse">우와!</button>');
      ev.appendChild(btn);
      btn.addEventListener('click', function () { if (t === token) { S.sfx('tap'); res(); } }, { once: true });
      if (FAST) setTimeout(function () { btn.click(); }, 30);
    });
    ev.remove();
  }

  /* ================================================================
     7. 집 (할 일 고르기)
     ================================================================ */
  async function home() {
    var lv = level(state.xp), smart = B.smartness(state.memory);
    var dexN = Object.keys(state.dex).length;
    var suggestTeach = state.review.length > 0 || state.last === 'explore';
    setScreen('home', sceneSky() +
      '<div class="status" style="left:26px">' +
      '<div class="pill"><span class="lv">' + lv + '</span><span>힘</span><div class="bar"><i style="width:' + lvProgress(state.xp) * 100 + '%"></i></div></div>' +
      '<div class="pill">' + ICON.bulb + '<span>똑똑함</span><div class="bar smart"><i style="width:' + smart + '%"></i></div><span class="num">' + smart + '</span></div>' +
      '</div>' +
      mw(partnerSvg('normal'), 470, 196, 340, 'me') +
      '<button class="partner-hit" id="pet" style="left:500px;top:240px;width:280px;height:290px" aria-label="짝꿍"></button>' +
      '<div class="bubble" style="left:800px;top:150px;width:440px;--tail-x:40px"></div>' +
      '<div class="menu">' +
      '<button class="card-btn teach" id="go-teach">' + ICON.teach + '<span>가르치기</span>' + (state.review.length ? '<i class="badge" style="font-style:normal">' + state.review.length + '</i>' : '') + '</button>' +
      '<button class="card-btn explore" id="go-explore">' + ICON.explore + '<span>탐험</span></button>' +
      '<button class="card-btn dex" id="go-dex">' + ICON.dex + '<span>도감 ' + dexN + '/9</span></button>' +
      '</div>');
    var me = q('.me');
    q('#go-teach').addEventListener('click', function () { S.sfx('pop'); go(lesson); });
    q('#go-explore').addEventListener('click', function () { S.sfx('pop'); go(explore); });
    q('#go-dex').addEventListener('click', function () { S.sfx('pop'); go(dex); });
    var chat = ['선생님이 가르쳐 줘서 정말 좋아!', '나 점점 똑똑해지고 있어!', '새 친구를 만나러 가고 싶어!', '많이 보여 줄수록 더 잘 맞혀!'], ci = 0;
    q('#pet').addEventListener('click', function () {
      S.sfx('pick'); setFace(me, 'happy'); hop(me);
      burst(640, 300, { n: 4, heart: true, size: 34, dist: 110, up: 80 });
      talk(chat[ci++ % chat.length]);
      setTimeout(function () { setFace(me, 'normal'); }, 1400);
    });
    await wait(450);
    hop(me, 40);
    if (suggestTeach) {
      talk(state.review.length ? '헷갈린 친구가 있어. <b>가르쳐 줘!</b>' : '선생님, 더 <b>가르쳐 줘!</b>');
      hand(276, 600, 'tap down');
    } else {
      talk('<b>탐험</b>하러 가자! 새 친구를 만날래!');
      hand(640, 600, 'tap down');
    }
  }

  /* ================================================================
     8. 도감 + 짝꿍의 기억 주머니
     ================================================================ */
  function dex() {
    var cells = '', found = 0;
    TYPES.forEach(function (t) {
      [0, 1, 2].forEach(function (s) {
        var d = state.dex[t + '-' + s];
        if (d) {
          found++;
          cells += '<button class="dex-cell t-' + t + '" data-n="' + A.SPECIES[t][s] + '"><span class="ti">' + A.typeIcon(t) + '</span><span class="cnt">×' + d.n + '</span>' + mini(A.wild(d.m)) + '<span class="nm">' + A.SPECIES[t][s] + '</span></button>';
        } else {
          var range = B.HUE[t].clear, ti = TYPES.indexOf(t);
          cells += '<div class="dex-cell unknown">' + mini(A.wild({ type: t, shape: s, hue: range[0], head: ti, tail: ti, eyes: 0 }, { silhouette: true })) + '<span class="nm">???</span></div>';
        }
      });
    });
    var mem = '';
    TYPES.forEach(function (t) {
      var list = state.memory.filter(function (e) { return e.type === t; });
      mem += '<div class="mem-row t-' + t + '">' + A.typeIcon(t) + '<div class="minis">' +
        (list.length ? list.slice(-7).map(function (e) { return mini(A.wild(e)); }).join('') : '<span class="mem-empty">아직 못 배웠어</span>') +
        '</div><span class="n">' + list.length + '</span></div>';
    });
    setScreen('dex', sceneSky() +
      '<h2 class="dex-title">도감</h2><div class="dex-count">친구 ' + found + ' / 9</div>' +
      '<div class="dex-grid">' + cells + '</div>' +
      '<div class="mem"><h3>짝꿍의 기억 주머니</h3><p>선생님이 보여 준 친구들이에요</p>' + mem + '</div>' +
      '<button class="reset" id="reset">처음부터 다시</button>', { home: true });
    Array.prototype.forEach.call(root.querySelectorAll('button.dex-cell'), function (c) {
      c.addEventListener('click', function () { S.sfx('pick'); hop(c.querySelector('.mini'), 30); S.say(c.getAttribute('data-n')); });
    });
    q('#reset').addEventListener('click', function () {
      var veil = el('<div class="veil"><div class="panel" style="padding-bottom:170px"><h2>처음부터 다시 할까?</h2><p>지금까지 키운 짝꿍과 도감이 모두 사라져요.</p>' +
        '<button class="btn green" id="no" style="margin-left:-320px">아니</button><button class="btn" id="yes" style="margin-left:20px;background:#b9b2c9">다시 하기</button></div></div>');
      root.appendChild(veil);
      veil.querySelector('#no').addEventListener('click', function () { veil.remove(); });
      veil.querySelector('#yes').addEventListener('click', function () { state = fresh(); save(); go(title); });
    });
  }

  /* ---------- 시작 ---------- */
  function fit() {
    scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
    stage.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  fit();
  go(title);

  // 점검용 손잡이 (자동 시험에서 사용)
  window.__mm = {
    get state() { return state; },
    set: function (patch) { for (var k in patch) state[k] = patch[k]; save(); },
    go: function (name) { go({ title: title, home: home, lesson: lesson, explore: explore, dex: dex, egg: eggScreen, first: firstBattle }[name]); },
    evolve: function (a, b) { go(function () { return home().then(function () { return evolution(a, b); }); }); },
    brain: B
  };
})();
