/* 말랑몬 선생님 — 게임 진행
   흐름: 누가 할까 → 이름·꾸미기 → 알 부화 → (모르는 채로 배틀해서 져 봄) → 가르치기
        → 동네를 걸어 다니며 야생 말랑몬 만나기 → 진화 → 전설 도전
   아이는 '선생님'이고, 짝꿍 말랑몬은 보여 준 예시만큼만 아는 작은 AI예요. */
(function () {
  'use strict';

  var B = window.MMBrain, A = window.MMArt, S = window.MMAudio, WD = window.MMWorld;
  var T = A.TYPE, TYPES = B.TYPES;
  var stage = document.getElementById('stage');
  var root = stage, scale = 1, token = 0, STALE = { stale: true };
  var FAST = /[?&]fast=1/.test(location.search);
  var speed = FAST ? 0.04 : 1;
  var rnd = B.rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);

  /* ---------- 저장: 아이마다 따로 (이름은 이 기기에만 남아요) ---------- */
  var KEY = 'mallangmon.v2', OLD_KEY = 'mallangmon.v1', MAX_PROFILES = 4;
  function freshProfile(name, look) {
    return {
      name: name, look: look, egg: null, xp: 0, memory: [], dex: {}, legends: {}, review: [], phase: 'new',
      lessons: 0, battles: 0, sinceLesson: 0, friends: 0, seenTricky: false, aha: false, hearts: 3, pos: null, mapTut: false,
      met: {}, sv: 2, badges: 0, cards: {}, taughtN: 0, checkedN: 0, tests: 0
    };
  }
  function loadStore() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 2 && s.profiles) return s; } catch (e) { /* 저장이 막힌 기기 */ }
    var st = { v: 2, profiles: [], cur: -1, muted: false, presets: [] };
    try { // 첫 버전에서 하던 기록 이어받기
      var o = JSON.parse(localStorage.getItem(OLD_KEY));
      if (o && o.egg) {
        var p = freshProfile('친구', A.defaultLook(0));
        ['egg', 'xp', 'memory', 'dex', 'review', 'lessons', 'friends', 'seenTricky', 'aha'].forEach(function (k) { if (o[k] != null) p[k] = o[k]; });
        p.phase = o.phase === 'free' || o.phase === 'firstTrip' ? 'free' : o.phase;
        st.profiles.push(p); st.muted = !!o.muted;
      }
    } catch (e) { /* 옛 기록 없음 */ }
    return st;
  }
  var store = loadStore();
  // 생김새가 3가지뿐이던 때의 기록을 18가지 번호로 옮긴다 (동물 0, 곤충 6, 공룡 12)
  store.profiles.forEach(function (p) {
    if (p.sv === 2) return;
    var mapShape = { 0: 0, 1: 6, 2: 12 }, nd = {};
    Object.keys(p.dex || {}).forEach(function (k) {
      var d = p.dex[k], sh = mapShape[d.m.shape] != null ? mapShape[d.m.shape] : d.m.shape;
      d.m.shape = sh; nd[d.m.type + '-' + sh] = d;
    });
    p.dex = nd;
    (p.memory || []).concat(p.review || []).forEach(function (m) { if (mapShape[m.shape] != null) m.shape = mapShape[m.shape]; });
    p.met = p.met || {}; p.sv = 2;
  });
  store.profiles.forEach(function (p) { p.cards = p.cards || {}; p.badges = p.badges || 0; p.taughtN = p.taughtN || 0; p.checkedN = p.checkedN || 0; if (p.phase === 'needTeach') p.phase = 'hatched'; });
  var state = store.profiles[store.cur] || null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* 저장이 막혀도 놀 수는 있음 */ } }
  S.setMuted(store.muted);

  // 주소 끝에 #names=이름1,이름2 를 붙여 한 번 열면, 그 이름들이 고르기 버튼으로 나와요 (주소의 # 뒤는 서버로 가지 않아요)
  (function () {
    var m = /[#&]names=([^&]+)/.exec(location.hash || '');
    if (!m) return;
    try {
      var names = decodeURIComponent(m[1]).split(',').map(function (n) { return n.trim().slice(0, 8); }).filter(Boolean).slice(0, MAX_PROFILES);
      if (names.length) { store.presets = names; save(); }
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    } catch (e) { /* 잘못된 주소는 무시 */ }
  })();

  /* ---------- 레벨 ---------- */
  var LV = [0, 4, 9, 15, 22, 30, 40, 52, 66, 82, 100, 120, 142, 166, 192];
  function level(xp) { var l = 1; for (var i = 1; i < LV.length; i++) if (xp >= LV[i]) l = i + 1; return l; }
  function form(lv) { return lv >= 10 ? 4 : lv >= 6 ? 3 : lv >= 3 ? 2 : 1; }
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
  function each(sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); }
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
    var a = node.animate(frames, opt), t = token;
    // 화면이 바뀐 뒤에는 이어서 진행하지 않는다 (옛 화면의 대사가 새 화면에 끼어들지 않게)
    return new Promise(function (res) { a.onfinish = a.oncancel = function () { if (t === token) res(); }; });
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tname(type) { return '<span class="t-' + type + '">' + T[type].name + ' 타입</span>'; }
  function pt(e) { var r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
  function delay() { return 'style="--d:-' + (rnd() * 3).toFixed(2) + 's"'; }
  function look(m) { return { type: m.type, hue: m.hue, head: m.head, tail: m.tail, shape: m.shape, eyes: m.eyes }; }
  // 받침에 따라 '이/가', '아/야' 고르기
  function josa(word, a, b) {
    var c = word.charCodeAt(word.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return a;
    return (c - 0xac00) % 28 ? a : b;
  }
  function me_() { return esc(state.name); }

  function mw(svg, x, y, size, cls) {
    return '<div class="mw ' + (cls || '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;transform-origin:50% 90%;--d:-' + (rnd() * 3).toFixed(2) + 's">' + svg + '</div>';
  }
  function mini(svg, cls) { return '<div class="mini ' + (cls || '') + '" ' + delay() + '>' + svg + '</div>'; }
  function partnerSvg(expr, f) { return A.partner(state.egg || 'berry', f || myForm(), { expr: expr }); }
  function setFace(wrap, expr) { if (wrap) A.setFace(wrap.querySelector('svg'), expr); }

  /* ---------- 그림 조각 ---------- */
  var ICON = {
    home: '<svg viewBox="0 0 48 48"><path d="M6 24 L24 7 L42 24 L37 24 L37 41 L28 41 L28 30 L20 30 L20 41 L11 41 L11 24 Z" fill="#ffb04d" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 48 48"><path d="M6 12 L18 7 L30 12 L42 7 L42 36 L30 41 L18 36 L6 41 Z" fill="#a5e38f" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M18 7 L18 36 M30 12 L30 41" stroke="#2d2440" stroke-width="3"/><circle cx="24" cy="22" r="4.5" fill="#ff4f6d" stroke="#2d2440" stroke-width="2.5"/></svg>',
    back: '<svg viewBox="0 0 48 48"><path d="M28 10 L14 24 L28 38" fill="none" stroke="#2d2440" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    soundOn: '<svg viewBox="0 0 48 48"><path d="M8 19 L16 19 L26 10 L26 38 L16 29 L8 29 Z" fill="#7fd0ff" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 17 C36 21 36 27 32 31 M36 11 C44 19 44 29 36 37" stroke="#2d2440" stroke-width="3.5" stroke-linecap="round" fill="none"/></svg>',
    soundOff: '<svg viewBox="0 0 48 48"><path d="M8 19 L16 19 L26 10 L26 38 L16 29 L8 29 Z" fill="#d9d5e3" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 18 L42 30 M42 18 L32 30" stroke="#ff4f6d" stroke-width="4" stroke-linecap="round"/></svg>',
    heart: '<svg viewBox="0 0 40 40"><path d="M20 35 C6 25 3 16 6 10 C9 4 17 4 20 10 C23 4 31 4 34 10 C37 16 34 25 20 35 Z" fill="#ff4f6d" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><path d="M11 11 C12 9 14 9 15 10" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
    bulb: '<svg viewBox="0 0 48 48"><path d="M24 4 C14 4 8 11 8 19 C8 25 11 28 14 32 L14 37 L34 37 L34 32 C37 28 40 25 40 19 C40 11 34 4 24 4 Z" fill="#ffe24a" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/><rect x="16" y="37" width="16" height="7" rx="3" fill="#b9b2c9" stroke="#2d2440" stroke-width="3.5"/><path d="M17 17 C18 13 21 11 24 11" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
    teach: '<svg viewBox="0 0 110 110"><path d="M12 28 C30 20 44 22 55 30 C66 22 80 20 98 28 L98 86 C80 78 66 80 55 88 C44 80 30 78 12 86 Z" fill="#fff" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/><path d="M55 30 L55 88" stroke="#2d2440" stroke-width="5"/><path d="M24 42 C32 40 38 41 44 44 M24 56 C32 54 38 55 44 58 M66 44 C72 41 78 40 86 42 M66 58 C72 55 78 54 86 56" stroke="#ffb04d" stroke-width="5" stroke-linecap="round" fill="none"/></svg>',
    dex: '<svg viewBox="0 0 110 110"><rect x="20" y="12" width="72" height="88" rx="12" fill="#fff" stroke="#2d2440" stroke-width="6"/><rect x="20" y="12" width="18" height="88" rx="8" fill="#ffd84a" stroke="#2d2440" stroke-width="6"/><circle cx="64" cy="48" r="16" fill="#ff8fb3" stroke="#2d2440" stroke-width="5"/><circle cx="58" cy="46" r="3" fill="#2d2440"/><circle cx="70" cy="46" r="3" fill="#2d2440"/><path d="M50 78 L80 78 M50 88 L72 88" stroke="#b9b2c9" stroke-width="5" stroke-linecap="round"/></svg>',
    hand: '<svg viewBox="0 0 96 96"><path d="M40 10 C46 10 50 14 50 20 L50 44 L66 47 C76 49 82 56 80 66 L78 78 C76 86 70 90 62 90 L44 90 C36 90 30 86 26 78 L16 58 C14 52 20 47 26 51 L30 56 L30 20 C30 14 34 10 40 10 Z" fill="#fff" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 70 70"><path d="M35 64 L10 30 L24 30 L24 6 L46 6 L46 30 L60 30 Z" fill="#ffc93c" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/></svg>',
    edge: '<svg viewBox="0 0 84 84"><path d="M42 2 L60 22 A30 30 0 1 1 24 22 Z" fill="#ffc93c" stroke="#2d2440" stroke-width="5" stroke-linejoin="round"/><circle cx="42" cy="44" r="23" fill="#fff" stroke="#2d2440" stroke-width="3"/></svg>',
    paw: '<svg viewBox="0 0 48 48"><circle cx="24" cy="30" r="10" fill="#ff8fb3" stroke="#2d2440" stroke-width="3.5"/><circle cx="10" cy="20" r="5" fill="#ff8fb3" stroke="#2d2440" stroke-width="3"/><circle cx="20" cy="11" r="5" fill="#ff8fb3" stroke="#2d2440" stroke-width="3"/><circle cx="32" cy="12" r="5" fill="#ff8fb3" stroke="#2d2440" stroke-width="3"/><circle cx="40" cy="22" r="5" fill="#ff8fb3" stroke="#2d2440" stroke-width="3"/></svg>',
    medal: '<svg viewBox="0 0 48 48"><path d="M14 4 L22 22 L26 22 L34 4 L27 4 L24 12 L21 4 Z" fill="#3fa9f5" stroke="#2d2440" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="30" r="13" fill="#ffd84a" stroke="#2d2440" stroke-width="3.5"/><path transform="translate(24 30) scale(.55)" d="' + A.STAR + '" fill="#fff" stroke="#2d2440" stroke-width="3.5" stroke-linejoin="round"/></svg>',
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

  function sceneBattle(dark) {
    return '<svg class="bg" viewBox="0 0 1280 800" preserveAspectRatio="none">' + skyBits() +
      (dark ? '<rect width="1280" height="800" fill="#2a1d5c" opacity=".5"/>' : '') +
      '<path d="M0 420 C240 360 420 400 640 380 C860 360 1040 330 1280 390 L1280 800 L0 800 Z" fill="#b3ebaa"/>' +
      '<path d="M0 480 C300 430 700 470 1280 440 L1280 800 L0 800 Z" fill="#86d977"/>' +
      (dark ? '<path d="M0 420 C240 360 420 400 640 380 C860 360 1040 330 1280 390 L1280 800 L0 800 Z" fill="#2a1d5c" opacity=".3"/>' : '') +
      '<ellipse cx="955" cy="440" rx="200" ry="42" fill="#6cc65f"/><ellipse cx="955" cy="436" rx="186" ry="34" fill="#a5e38f"/>' +
      '<ellipse cx="310" cy="596" rx="236" ry="50" fill="#6cc65f"/><ellipse cx="310" cy="591" rx="220" ry="41" fill="#a5e38f"/>' +
      flowers([[640, 560, '#fff'], [720, 610, '#ff8fb3'], [1180, 560, '#ffb04d'], [560, 500, '#b99bff']]) +
      '</svg>';
  }

  /* ---------- 화면 틀 ---------- */
  function setScreen(name, html, opts) {
    opts = opts || {};
    var top = '<button class="ico-btn ico-sound" id="snd" aria-label="소리">' + (store.muted ? ICON.soundOff : ICON.soundOn) + '</button>' +
      (opts.home ? '<button class="ico-btn ico-home" id="hm" aria-label="' + (opts.back ? '뒤로' : '동네로') + '">' + (opts.back ? ICON.back : ICON.map) + '</button>' : '');
    stage.innerHTML = '<div class="scr scr-' + name + '">' + html + top + '</div>';
    root = stage.firstChild;
    q('#snd').addEventListener('click', function () {
      store.muted = !store.muted; S.setMuted(store.muted); save();
      this.innerHTML = store.muted ? ICON.soundOff : ICON.soundOn;
      S.sfx('tap');
    });
    if (opts.home) q('#hm').addEventListener('click', function () { S.sfx('tap'); go(opts.back || map); });
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

  function toast(text) {
    var t = el('<div class="toast">' + text + '</div>');
    root.appendChild(t);
    setTimeout(function () { t.remove(); }, 2500);
  }

  /* ---------- 반짝이 ---------- */
  var CONFETTI = ['#ffd84a', '#ff8fb3', '#7fe08a', '#7fd0ff', '#b99bff', '#fff'];
  function burst(x, y, o) {
    o = o || {};
    var host = o.host || root;
    var n = o.n || 14, colors = o.colors || CONFETTI, dist = o.dist || 170;
    for (var i = 0; i < n; i++) {
      var size = (o.size || 14) * (0.6 + rnd() * 0.9), c = colors[i % colors.length];
      var p = document.createElement('div');
      p.className = 'p' + (o.star ? ' star' : '');
      p.style.cssText = 'left:' + (x - size / 2) + 'px;top:' + (y - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px;background:' + c;
      if (o.star) p.innerHTML = '<svg viewBox="-15 -15 30 30"><path d="' + A.STAR + '" fill="' + c + '" stroke="#2d2440" stroke-width="2.5" stroke-linejoin="round"/></svg>';
      if (o.heart) { p.style.background = 'none'; p.innerHTML = ICON.heart; }
      host.appendChild(p);
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
     1. 타이틀 → 누가 할까 → 이름 → 꾸미기
     ================================================================ */
  function title() {
    var p0 = store.profiles[0];
    setScreen('title', sceneSky() +
      '<h1 class="logo"><span>말</span><span>랑</span><span>몬</span><em>선생님</em></h1>' +
      '<p class="tagline">내가 가르치면 점점 똑똑해져요!</p>' +
      mw(A.wild({ type: 'fire', shape: 12, hue: 8, head: 0, tail: 0, eyes: 0 }), 190, 380, 230) +
      mw(A.partner(p0 && p0.egg || 'berry', p0 && p0.egg ? form(level(p0.xp)) : 2, { expr: 'happy' }), 500, 340, 280, 'title-me') +
      mw(A.wild({ type: 'water', shape: 4, hue: 210, head: 1, tail: 1, eyes: 1 }), 850, 390, 220) +
      mw(A.wild({ type: 'grass', shape: 8, hue: 118, head: 2, tail: 2, eyes: 2 }), 1030, 470, 180) +
      '<button class="btn btn-start pulse" id="start">시작!</button>');
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
      go(profiles);
    });
  }

  function useProfile(i) { store.cur = i; state = store.profiles[i]; save(); }

  function profiles() {
    state = null;
    var used = store.profiles.map(function (p) { return p.name; });
    var fresh = (store.presets || []).filter(function (n) { return used.indexOf(n) < 0; });
    var cards = '';
    store.profiles.forEach(function (p, i) {
      cards += '<button class="pf-card" data-i="' + i + '" style="animation-delay:' + i * 0.08 + 's"><div class="av">' + A.avatar(p.look) + '</div>' +
        '<div class="pn">' + esc(p.name) + '</div><div class="pl">' + (p.egg ? 'Lv.' + level(p.xp) + ' · 친구 ' + (Object.keys(p.dex).length + Object.keys(p.legends || {}).length) + '종' : '새 모험') + '</div>' +
        (p.egg ? '<div class="pm mini">' + A.partner(p.egg, form(level(p.xp))) + '</div>' : '') + '</button>';
    });
    var room = MAX_PROFILES - store.profiles.length;
    fresh.slice(0, room).forEach(function (n, i) {
      cards += '<button class="pf-card new" data-n="' + esc(n) + '"><span class="tag">새로 시작</span><div class="av">' + A.avatar(A.defaultLook(store.profiles.length + i)) + '</div><div class="pn">' + esc(n) + '</div><div class="pl">눌러서 시작</div></button>';
    });
    if (room - Math.min(fresh.length, room) > 0) cards += '<button class="pf-card new" id="add"><div class="plus">+</div><div class="pn">새 친구</div></button>';
    setScreen('who', sceneSky() + '<h2 class="big-title">누가 할까?</h2><div class="pf-row">' + cards + '</div>');
    S.say('누가 할까?');
    each('.pf-card[data-i]', function (c) { c.addEventListener('click', function () { S.sfx('pop'); useProfile(+c.getAttribute('data-i')); go(resume); }); });
    each('.pf-card[data-n]', function (c) { c.addEventListener('click', function () { S.sfx('pop'); createProfile(c.getAttribute('data-n')); go(avatarMaker); }); });
    var add = q('#add'); if (add) add.addEventListener('click', function () { S.sfx('pop'); go(nameScreen); });
    if (FAST) setTimeout(function () { var c = q('.pf-card'); if (c) c.click(); }, 60);
  }

  function createProfile(name) {
    store.profiles.push(freshProfile(name, A.defaultLook(store.profiles.length)));
    useProfile(store.profiles.length - 1);
  }

  function nameScreen() {
    setScreen('name', sceneSky() + '<h2 class="big-title">이름을 알려 줘!</h2>' +
      '<input class="name-in" id="nm" maxlength="8" placeholder="이름" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">' +
      '<button class="btn green" id="ok" style="left:50%;margin-left:-150px;width:300px;bottom:150px">좋아!</button>', { home: true, back: profiles });
    S.say('이름을 알려 줘!');
    var inp = q('#nm');
    function ok() {
      var n = inp.value.trim().slice(0, 8);
      if (!n) { inp.classList.remove('nope'); void inp.offsetWidth; inp.classList.add('nope'); S.sfx('bad'); return; }
      inp.blur(); S.sfx('good');
      createProfile(n); go(avatarMaker);
    }
    q('#ok').addEventListener('click', ok);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
    setTimeout(function () { try { inp.focus(); } catch (e) { /* 무시 */ } }, 300);
    if (FAST) setTimeout(function () { inp.value = '테스트'; ok(); }, 60);
  }

  /* 내 모습 꾸미기: 사진 없이도 아이가 직접 닮은 모습을 고른다 */
  function avatarMaker() {
    var lk = state.look, L = A.LOOK;
    function opts(key, n, render, cls) {
      var s = '';
      for (var i = 0; i < n; i++) s += '<button class="opt ' + (cls || '') + '" data-k="' + key + '" data-v="' + i + '">' + render(i) + '</button>';
      return s;
    }
    function face(patch) { var o = {}; for (var k in lk) o[k] = lk[k]; for (var j in patch) o[j] = patch[j]; return '<div class="av">' + A.avatar(o) + '</div>'; }
    function sw(c) { return '<span style="display:block;width:100%;height:100%;background:' + c + '"></span>'; }
    function rows() {
      return '<div class="mk-row"><span class="lab">머리</span>' + opts('hair', L.HAIR_COUNT, function (i) { return face({ hair: i, hat: 0 }); }) + '</div>' +
        '<div class="mk-row"><span class="lab">머리 색</span>' + opts('hairColor', 3, function (i) { return sw(L.HAIR[i]); }, 'sw') + '</div>' +
        '<div class="mk-row"><span class="lab">피부</span>' + opts('skin', 3, function (i) { return sw(L.SKIN[i]); }, 'sw') + '</div>' +
        '<div class="mk-row"><span class="lab">옷</span>' + opts('wear', L.WEAR.length, function (i) { return face({ wear: i }); }, 'body') + '</div>' +
        '<div class="mk-row"><span class="lab">옷 색</span>' + opts('outfit', 6, function (i) { return sw(L.OUTFIT[i]); }, 'sw') + '</div>' +
        '<div class="mk-row"><span class="lab">모자</span>' + opts('hat', L.HATS.length, function (i) { return face({ hat: i }); }) + '</div>' +
        '<div class="mk-row"><span class="lab">안경</span>' + opts('glasses', 2, function (i) { return face({ glasses: i }); }) + '</div>';
    }
    setScreen('maker', sceneSky() + '<h2 class="big-title" style="top:20px;font-size:60px">내 모습을 꾸며 봐!</h2>' +
      '<div class="mk-prev"><div class="av" id="prev"></div><div class="pn">' + me_() + '</div></div>' +
      '<div class="mk-rows" id="rows"></div>' +
      '<button class="btn green btn-done pulse" id="done">다 됐어!</button>');
    S.say('내 모습을 꾸며 봐!');
    function paint() {
      q('#prev').innerHTML = A.avatar(lk, { expr: 'happy' });
      q('#rows').innerHTML = rows();
      each('.opt', function (b) {
        var k = b.getAttribute('data-k'), v = +b.getAttribute('data-v');
        if ((lk[k] || 0) === v) b.classList.add('on');
        b.addEventListener('click', function () { lk[k] = v; save(); S.sfx('pick'); paint(); hop(q('#prev'), 26); });
      });
    }
    paint();
    q('#done').addEventListener('click', function () { S.sfx('good'); go(resume); });
    if (FAST) setTimeout(function () { q('#done').click(); }, 60);
  }

  function resume() {
    if (!state) return profiles();
    if (!state.egg || state.phase === 'new') return eggScreen();
    if (state.phase === 'hatched') return firstBattle();
    return map();
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
    talk(me_() + josa(state.name, '아', '야') + ', 마음에 드는 알을 골라 봐!');
    hand(640, 500, 'tap');

    var chosen = await new Promise(function (res) {
      each('.egg-w', function (n) { n.addEventListener('click', function () { res(n); }, { once: true }); });
      if (FAST) setTimeout(function () { root.querySelectorAll('.egg-w')[0].click(); }, 30);
    });
    clearHand(); S.sfx('pick');
    var kind = chosen.getAttribute('data-k');
    state.egg = kind;
    each('.egg-w', function (n) { if (n !== chosen) { n.style.opacity = 0; n.style.transform = 'scale(.4)'; n.style.pointerEvents = 'none'; } });
    each('.nest', function (n, i) { if (kinds[i] !== kind) n.style.opacity = 0; n.style.transition = 'opacity .4s, left .5s'; });
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
    save();
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
    await talk('냠냠! 고마워, <b>' + me_() + ' 선생님</b>!', { next: true });
    setFace(me, 'wow');
    await talk('어? 밖에 누가 있나 봐. 나가 보자!', { next: true });
    state.phase = 'hatched'; state.hearts = maxHearts(); save();
    go(firstBattle);
  }

  /* ================================================================
     3. 배틀: 선생님(아이)이 직접 판단하고, 직접 쏘고, 직접 잡는다
        ① 짝꿍이 "왜 그렇게 생각하는지" 보여 준다 (닮은 기억 + 어떤 단서가 닮았는지)
        ② 아이가 맞는지 보고 타입을 고른다 → 짝꿍이 틀렸으면 그 자리에서 가르치게 된다
        ③ 타이밍을 맞춰 공격한다  ④ 타이밍을 맞춰 친구가 된다
        ⑤ 친구가 된 말랑몬은 곧바로 짝꿍의 기억(학습 예시)이 된다
     ================================================================ */
  var ME = { x: 150, y: 300, size: 320, cx: 310, cy: 470 };
  var FOE = { x: 820, y: 190, size: 270, cx: 955, cy: 330 };
  var BIG = { x: 730, y: 60, size: 420, cx: 940, cy: 290 };
  var HEAD_HINT = ['불꽃', '지느러미', '새싹'];
  var combo = 0;

  function hueFamily(h) { return h >= 340 || h < 62 ? 'fire' : h < 168 ? 'grass' : 'water'; }
  function buzz(ms) { try { if (navigator.vibrate && !store.muted) navigator.vibrate(ms); } catch (e) { /* 진동이 없는 기기 */ } }

  function heartsHtml(n, max) {
    var s = '';
    for (var i = 0; i < max; i++) s += ICON.heart.replace('<svg ', '<svg ' + (i < n ? '' : 'class="off" '));
    return s;
  }

  // 짝꿍이 지금 어떤 단서를 얼마나 믿는지 (색·머리·꼬리)
  function cueBars(w, id) {
    var rows = [['hue', '색'], ['head', '머리'], ['tail', '꼬리']];
    return '<div class="cues"' + (id ? ' id="' + id + '"' : '') + '>' + rows.map(function (r) {
      return '<div class="cue-row"><span>' + r[1] + '</span><div class="bar cue"><i data-c="' + r[0] + '" style="width:' + Math.round(Math.sqrt(w[r[0]]) * 100) + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  // 짝꿍의 생각을 풀어서 설명한다: 누구랑 닮았다고 봤고, 무엇이 닮았는지
  function explain(m) {
    var g = B.guess(state.memory, m);
    if (!g) return null;
    var n = g.nearest, total = g.votes.fire + g.votes.water + g.votes.grass;
    return {
      type: g.ranked[0], near: n, conf: total ? g.votes[g.ranked[0]] / total : 0,
      match: { hue: hueFamily(n.hue) === hueFamily(m.hue), head: n.head === m.head, tail: n.tail === m.tail }
    };
  }
  function explainHtml(ex) {
    function chip(ok, name) { return '<div class="chip ' + (ok ? 'ok' : 'no') + '">' + name + ' <b>' + (ok ? '닮음' : '다름') + '</b></div>'; }
    var dots = '';
    for (var i = 0; i < 3; i++) dots += '<i class="' + (ex.conf > [0.34, 0.55, 0.78][i] ? 'on' : '') + '"></i>';
    return mini(A.wild(ex.near)) + '<div class="chips">' + chip(ex.match.hue, '색') + chip(ex.match.head, '머리') + chip(ex.match.tail, '꼬리') + '</div>' +
      '<span class="arrow">▶</span><div class="guess"><span class="ticon">' + A.typeIcon(ex.type) + '</span><div class="conf">' + dots + '</div></div>';
  }
  function explainLine(ex) {
    var same = [];
    if (ex.match.hue) same.push('색'); if (ex.match.head) same.push('머리'); if (ex.match.tail) same.push('꼬리');
    var what = same.length ? same.join('랑 ') + josa(same[same.length - 1], '이', '가') + ' 닮았어!' : '어딘가 닮은 것 같아…';
    var sure = ex.conf > 0.78 ? '분명히 ' : ex.conf > 0.55 ? '아마 ' : '잘 모르겠지만 ';
    return '기억 속 이 친구랑 ' + what + ' ' + sure + tname(ex.type) + '!';
  }

  function battleScreen(o) {
    o = o || {};
    var F = o.big ? BIG : FOE;
    setScreen('battle', sceneBattle(o.big || o.dark) +
      '<div class="hud me" style="left:26px"><div class="nm">' + me_() + '의 짝꿍 · Lv.' + level(state.xp) + '</div><div class="hearts" id="hearts"></div></div>' +
      '<div class="hud foe"><div class="nm" id="foe-nm">???</div><div class="hpbar"><i id="foe-hp"></i></div></div>' +
      '<div class="think" id="think"></div>' +
      mw(partnerSvg('normal'), ME.x, ME.y, ME.size, 'me') +
      '<div class="bubble battle-bubble tail-none"></div>');
    var max = maxHearts();
    var bs = {
      me: q('.me'), foe: null, F: F, max: max, hearts: Math.max(0, Math.min(max, state.hearts == null ? max : state.hearts)),
      setHearts: function (n) { bs.hearts = n; state.hearts = n; save(); q('#hearts').innerHTML = heartsHtml(n, bs.max); },
      setHp: function (pct) { var i = q('#foe-hp'); i.style.width = pct + '%'; i.className = pct < 50 ? 'low' : ''; },
      think: function (html) { var t = q('#think'); t.innerHTML = html; t.classList.add('on'); },
      unthink: function () { q('#think').classList.remove('on'); },
      spawn: async function (svg) {
        if (bs.foe) bs.foe.remove();
        q('#foe-nm').innerHTML = '???';
        bs.setHp(100);
        bs.foe = el(mw(svg, F.x, F.y, F.size, 'foe'));
        root.appendChild(bs.foe);
        S.sfx(o.big ? 'bighit' : 'pop');
        if (o.big) { shakeScreen(); buzz(120); }
        await anim(bs.foe, [
          { transform: 'translate(360px,-40px) scale(.6)', opacity: 0 },
          { transform: 'translate(-20px,0) scale(1.08,.92)', opacity: 1, offset: 0.7 },
          { transform: 'translate(0,0) scale(1)' }
        ], { duration: o.big ? 900 : 600, easing: 'ease-out' });
      },
      // 공격: 무슨 타입 공격을, 내가(mine) 쏘는지, 세게(strong) 맞는지
      shoot: async function (type, mine, strong) {
        var a = mine ? ME : F, b = mine ? F : ME;
        var attacker = mine ? bs.me : bs.foe, target = mine ? bs.foe : bs.me;
        var dir = mine ? 1 : -1;
        await anim(attacker, [
          { transform: 'translate(0,0) scale(1)' },
          { transform: 'translate(' + (-26 * dir) + 'px,8px) scale(1.08,.9)', offset: 0.3 },
          { transform: 'translate(' + (70 * dir) + 'px,' + (-24 * dir) + 'px) scale(.95,1.06)', offset: 0.6 },
          { transform: 'translate(0,0) scale(1)' }
        ], { duration: 360, easing: 'ease-in-out' });
        var s = el('<div class="shot" style="left:' + (a.cx - 48) + 'px;top:' + (a.cy - 48) + 'px">' + A.typeIcon(type) + '</div>');
        root.appendChild(s);
        S.sfx('whoosh');
        var dx = b.cx - a.cx, dy = b.cy - a.cy;
        await anim(s, [
          { transform: 'translate(0,0) scale(.4) rotate(0deg)' },
          { transform: 'translate(' + dx / 2 + 'px,' + (dy / 2 - 110) + 'px) scale(1.25) rotate(' + 300 * dir + 'deg)', offset: 0.5 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (strong ? 1.7 : 0.8) + ') rotate(' + 600 * dir + 'deg)' }
        ], { duration: 420, easing: 'ease-in' });
        s.remove();
        burst(b.cx, b.cy, { colors: [T[type].color, '#fff', T[type].soft, T[type].color], n: strong ? 24 : 7, dist: strong ? 240 : 90, size: strong ? 22 : 12 });
        S.sfx(strong ? 'bighit' : (mine ? 'weak' : 'hit'));
        if (strong || !mine) { flashOf(target); shakeScreen(); buzz(strong ? 50 : 90); }
        await anim(target, [
          { transform: 'translate(0,0)' },
          { transform: 'translate(' + (strong ? 34 : 12) * dir + 'px,-6px) rotate(' + (strong ? 8 : 3) * dir + 'deg)', offset: 0.3 },
          { transform: 'translate(0,0)' }
        ], { duration: 300, easing: 'ease-out' });
      },
      callout: function (text, cls) {
        var c = el('<div class="callout ' + (cls || '') + '">' + text + '</div>');
        root.appendChild(c);
        setTimeout(function () { c.remove(); }, 1150);
      },
      leave: function () {
        return anim(bs.foe, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(420px,-60px) scale(.6)', opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' });
      }
    };
    bs.setHearts(bs.hearts);
    return bs;
  }

  function wildSvg(m, expr) {
    return A.wild(m, { expr: expr }).replace('<svg ', '<svg data-eyes="' + m.eyes + '" data-face-y="116" ');
  }

  /* ---- 아이가 하는 일 ①: 타입 고르기 ---- */
  function pickType(guess, off, truth) {
    var t = token, r = root;
    return new Promise(function (res) {
      var box = el('<div class="tpick">' + TYPES.map(function (ty) {
        return '<button class="tbtn t-' + ty + (off.indexOf(ty) >= 0 ? ' off' : '') + '" data-t="' + ty + '"' + (off.indexOf(ty) >= 0 ? ' disabled' : '') + '>' +
          (ty === guess ? '<span class="tag">짝꿍 생각</span>' : '') + A.typeIcon(ty) + '<span>' + T[ty].name + '</span></button>';
      }).join('') + '</div>');
      r.appendChild(box);
      popIn(box);
      Array.prototype.forEach.call(box.querySelectorAll('.tbtn'), function (b) {
        b.addEventListener('click', function () { if (t !== token || b.disabled) return; S.sfx('pick'); buzz(15); box.remove(); res(b.getAttribute('data-t')); });
      });
      if (FAST) setTimeout(function () { var b = box.querySelector('[data-t="' + truth + '"]'); if (b) b.click(); }, 30);
    });
  }

  /* ---- 아이가 하는 일 ②: 타이밍 맞춰 쏘기 (초록 칸에서 누르면 세다) ---- */
  function timing(label) {
    var tk = token, r = root;
    return new Promise(function (res) {
      var box = el('<div class="gauge-box"><div class="gauge"><i class="zone good"></i><i class="zone perfect"></i><b class="mark"></b></div><button class="btn yellow fire">' + label + '</button></div>');
      r.appendChild(box);
      popIn(box);
      var mark = box.querySelector('.mark'), t0 = performance.now(), pos = 0, done = false;
      var spd = 3.0 + (state.badges || 0) * 0.35;
      (function loop(now) {
        if (tk !== token || done) return;
        pos = 0.5 + 0.5 * Math.sin((now - t0) / 1000 * spd);
        mark.style.left = (pos * 100) + '%';
        requestAnimationFrame(loop);
      })(t0);
      function fire(e) {
        if (done || tk !== token) return;
        if (e) e.preventDefault();
        done = true;
        var d = Math.abs(pos - 0.5), qy = d < 0.09 ? 'perfect' : d < 0.26 ? 'good' : 'weak';
        box.classList.add(qy);
        S.sfx(qy === 'weak' ? 'tap' : 'pop'); buzz(qy === 'perfect' ? 40 : 15);
        setTimeout(function () { box.remove(); if (tk === token) res(qy); }, 240 * speed);
      }
      box.addEventListener('pointerdown', fire);
      if (FAST) setTimeout(function () { pos = 0.5; fire(); }, 30);
    });
  }

  /* ---- 아이가 하는 일 ③: 동그라미가 딱 맞을 때 눌러 친구 되기 ---- */
  function ringCatch(F) {
    var tk = token, r = root;
    return new Promise(function (res) {
      var box = el('<div class="ring-wrap"><div class="ring-box" style="left:' + F.cx + 'px;top:' + F.cy + 'px"><i class="ring-in"></i><i class="ring-out"></i></div>' +
        '<button class="btn green catch">친구 되자!</button></div>');
      r.appendChild(box);
      var out = box.querySelector('.ring-out'), t0 = performance.now(), sc = 2.4, done = false;
      (function loop(now) {
        if (tk !== token || done) return;
        sc = 2.5 - (((now - t0) % 1400) / 1400) * 2.0;
        out.style.transform = 'scale(' + sc.toFixed(3) + ')';
        requestAnimationFrame(loop);
      })(t0);
      function tap(e) {
        if (done || tk !== token) return;
        if (e) e.preventDefault();
        done = true;
        var d = Math.abs(sc - 1), stars = d < 0.16 ? 3 : d < 0.42 ? 2 : 1;
        box.classList.add('s' + stars);
        S.sfx('good'); buzz(stars === 3 ? 60 : 20);
        setTimeout(function () { box.remove(); if (tk === token) res(stars); }, 260 * speed);
      }
      box.addEventListener('pointerdown', tap);
      if (FAST) setTimeout(function () { sc = 1; tap(); }, 30);
    });
  }

  /* 한 판. o.solo = 짝꿍 혼자 판단(시험·전설). 돌려주는 값: won, aiRight(짝꿍 판단이 맞았나), taught(아이가 고쳐 줬나) */
  async function duel(bs, m, o) {
    o = o || {};
    var res = { won: false, aiRight: null, taught: false, kidMiss: 0 };
    var first = !o.solo && state.battles === 0;
    var ex = explain(m);
    setFace(bs.me, 'think'); bs.me.classList.add('glow'); S.sfx('think');
    bs.think('<div class="dotty"><i></i><i></i><i></i></div>');
    await wait(700);
    if (!ex) {
      bs.think('<span class="q">?</span><span class="q" style="animation-delay:.15s">?</span><span class="q" style="animation-delay:.3s">?</span>');
      setFace(bs.me, 'ouch');
      await talk('나는 아직 <b>아무것도 몰라…</b> 선생님이 알려 줘!', { hold: 2300 });
    } else {
      bs.think(explainHtml(ex));
      await talk(explainLine(ex), { hold: 2400 });
    }
    bs.me.classList.remove('glow');

    var type;
    if (o.solo) {
      type = ex ? ex.type : TYPES[Math.floor(rnd() * 3)];
      setFace(bs.me, 'happy');
      await talk('혼자 해 볼게! <b>' + T[B.COUNTER[type]].move + '!</b>', { hold: 900 });
    } else {
      var off = [];
      bs.foe.classList.add('look-head');
      for (;;) {
        setFace(bs.me, 'normal');
        talk(first || !ex ? '머리 장식을 봐! <b>불꽃</b>은 불, <b>지느러미</b>는 물, <b>새싹</b>은 풀이야.' : '선생님, 내 생각이 맞아? <b>머리</b>를 보고 골라 줘!');
        var pick = await pickType(ex && ex.type, off, m.type);
        if (pick === m.type) break;
        // 선생님이 잘못 골랐다 → 공격이 안 통하고 한 대 맞는다
        res.kidMiss++; off.push(pick);
        hideTalk();
        await bs.shoot(B.COUNTER[pick], true, false);
        bs.callout('어라? 안 통해…', 'meh');
        await bs.shoot(m.type, false, false);
        setFace(bs.me, 'ouch');
        bs.setHearts(bs.hearts - 1);
        if (bs.hearts <= 0) { await talk('으앙, 힘이 다 빠졌어…', { hold: 1900 }); await bs.leave(); return res; }
        await talk('아야! 이건 ' + T[m.type].name + ' 공격이야. 머리를 다시 보자!', { hold: 2000 });
      }
      bs.foe.classList.remove('look-head');
      type = m.type;
      res.aiRight = !!ex && ex.type === m.type;
      if (res.aiRight) {
        combo++;
        bs.callout(combo >= 2 ? '찰떡 콤보 ' + combo + '!' : '짝꿍이 맞혔어!', 'good');
        setFace(bs.me, 'happy'); hop(bs.me, 40);
        await talk('내 생각이 맞았어! 헤헤', { hold: 1000 });
      } else {
        combo = 0; res.taught = true;
        bs.callout('가르쳐 줬어!', 'good');
        setFace(bs.me, 'wow');
        await talk(ex ? '앗, 내가 틀렸네! <b>가르쳐 줘서 고마워!</b>' : '아하! ' + tname(m.type) + '이구나!', { hold: 1600 });
      }
    }
    bs.unthink();

    if (type !== m.type) { // 혼자 판단했는데 틀림
      res.aiRight = false;
      await bs.shoot(B.COUNTER[type], true, false);
      bs.callout('어라? 안 통해…', 'meh');
      setFace(bs.me, 'wow');
      await talk('앗, <b>잘못 봤나 봐!</b>', { hold: 1300 });
      await bs.shoot(m.type, false, false);
      setFace(bs.me, 'ouch');
      if (!o.noHearts) bs.setHearts(bs.hearts - 1);
      return res;
    }
    if (res.aiRight == null) res.aiRight = true;

    // 타이밍 공격
    var move = B.COUNTER[type], max = o.hp || 3, hp = max;
    setFace(bs.me, 'happy');
    if (first) await talk('이제 공격! 막대가 <b>초록 칸</b>에 왔을 때 눌러!', { hold: 200 });
    else talk('<b>' + T[move].move + '</b> 준비! 초록 칸에서 눌러!');
    while (hp > 0) {
      var qy = await timing('발사!');
      hp = Math.max(0, hp - (qy === 'perfect' ? 3 : qy === 'good' ? 2 : 1));
      hideTalk();
      await bs.shoot(move, true, qy !== 'weak');
      bs.callout(qy === 'perfect' ? '완벽해!' : qy === 'good' ? '좋아!' : '살짝 빗나갔어', qy === 'weak' ? 'meh' : 'good');
      bs.setHp(hp / max * 100);
      if (hp > 0) await wait(600);
    }
    res.won = true;
    return res;
  }

  /* ---- 배움 카드: 진짜로 그 일이 일어났을 때만 한 장씩 얻는다 ---- */
  var CARDS = [
    { id: 'know', icon: '🥚', title: '보여 준 만큼만 알아', kid: '짝꿍은 처음엔 아무것도 몰라. 내가 알려 준 친구만 기억해.', adult: 'AI는 사람이 준 예시(학습 데이터)에서만 배웁니다.' },
    { id: 'similar', icon: '🔍', title: '닮은 친구를 떠올려', kid: '짝꿍은 기억 속에서 제일 닮은 친구를 찾아서 맞혀.', adult: '새로운 것을 기존 예시와 비교해 판단합니다(유사도 기반 분류).' },
    { id: 'fooled', icon: '🎭', title: '겉모습에 속기도 해', kid: '색이 닮았다고 같은 타입은 아니야. 짝꿍도 속을 수 있어.', adult: 'AI는 우연히 겹친 특징(색)을 근거로 틀린 답을 내기도 합니다.' },
    { id: 'fix', icon: '🛠️', title: '틀리면 고쳐 주면 돼', kid: '짝꿍이 틀리면 내가 바로 알려 줘. 그러면 다음엔 더 잘해.', adult: '사람이 오답을 바로잡으면 모델이 개선됩니다(휴먼 인 더 루프).' },
    { id: 'more', icon: '📚', title: '많이 볼수록 똑똑해', kid: '친구를 많이 만날수록 짝꿍이 더 잘 맞혀.', adult: '예시가 많고 다양할수록 정확도가 올라갑니다.' },
    { id: 'cue', icon: '💡', title: '무엇을 봐야 할지도 배워', kid: '짝꿍이 알아챘어. 색보다 머리 장식이 진짜 단서야!', adult: '어떤 특징이 중요한지도 데이터에서 스스로 학습합니다(특징 가중치).' },
    { id: 'test', icon: '🏅', title: '혼자 하는 시험', kid: '시험장에서는 내가 도와줄 수 없어. 가르친 만큼만 해내.', adult: '학습과 평가는 분리합니다. 처음 보는 문제로 실력을 확인합니다(테스트).' },
    { id: 'check', icon: '✅', title: '믿기 전에 확인해', kid: '짝꿍 말이 맞는지 내가 확인했어. 똑똑한 AI도 틀릴 수 있거든.', adult: 'AI의 답을 그대로 믿지 않고 확인하는 습관이 AI 리터러시의 핵심입니다.' }
  ];
  function cardDue(ev) {
    var c = state.cards;
    if (!c.know && state.memory.length >= 1) return 'know';
    if (!c.similar && ev.explained) return 'similar';
    if (!c.fooled && ev.fooled) return 'fooled';
    if (!c.cue && state.aha) return 'cue';
    if (!c.fix && state.taughtN >= 3) return 'fix';
    if (!c.more && state.memory.length >= 10) return 'more';
    if (!c.test && ev.tested) return 'test';
    if (!c.check && state.checkedN >= 8) return 'check';
    return null;
  }
  async function giveCard(id) {
    if (!id || state.cards[id]) return;
    var c = CARDS.filter(function (x) { return x.id === id; })[0];
    state.cards[id] = true; state.xp += 1; save();
    var n = Object.keys(state.cards).length;
    var veil = el('<div class="veil"><div class="panel lcard"><div class="lc-top">배움 카드 ' + n + ' / ' + CARDS.length + '</div><div class="lc-icon">' + c.icon + '</div>' +
      '<h2>' + c.title + '</h2><p>' + c.kid + '</p><p class="adult">어른에게: ' + c.adult + '</p></div></div>');
    root.appendChild(veil);
    S.sfx('fanfare'); S.say(c.title + '. ' + c.kid);
    burst(640, 300, { n: 18, star: true, size: 28, dist: 300, host: veil });
    await wait(900);
    var t = token;
    await new Promise(function (res) {
      var btn = el('<button class="btn green pulse">알았어!</button>');
      veil.querySelector('.panel').appendChild(btn);
      btn.addEventListener('click', function () { if (t === token) { S.sfx('tap'); res(); } }, { once: true });
      if (FAST) setTimeout(function () { btn.click(); }, 30);
    });
    veil.remove();
  }

  /* 야생 말랑몬과 한 판 → 이기면 잡기 → 잡은 친구는 짝꿍의 기억이 된다 */
  async function catchFlow(bs, m) {
    var first = state.battles === 0, wBefore = B.weights(state.memory), smartBefore = B.smartness(state.memory), hadMemory = state.memory.length > 0;
    var ex0 = explain(m);
    var r = await duel(bs, m, {});
    var out = { friend: false, isNew: false, taught: r.taught, fainted: bs.hearts <= 0 };
    if (!r.won) return out;

    // 쓰러뜨렸다 → 친구 되기
    A.setFace(bs.foe.querySelector('svg'), 'ouch');
    await anim(bs.foe, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg) translateY(6px)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 500, easing: 'ease-in-out' });
    if (first) await talk('동그라미가 <b>딱 맞을 때</b> 눌러서 친구가 되자!', { hold: 200 });
    else talk('지금이야! 동그라미가 <b>딱 맞을 때</b> 눌러!');
    var stars = await ringCatch(bs.F);
    hideTalk();
    A.setFace(bs.foe.querySelector('svg'), 'happy');
    S.sfx('heart');
    burst(bs.F.cx, bs.F.cy - 40, { n: 6 + stars * 3, heart: true, size: 42, dist: 170, up: 100 });
    if (stars === 3) burst(bs.F.cx, bs.F.cy, { n: 18, star: true, size: 30, dist: 260 });
    bs.callout(stars === 3 ? '별 셋! 완벽해!' : stars === 2 ? '별 둘! 좋아!' : '별 하나!', 'good');
    hop(bs.foe); hop(bs.me);
    var nm = A.speciesName(m), key = m.type + '-' + m.shape;
    q('#foe-nm').innerHTML = A.typeIcon(m.type) + nm;
    out.isNew = !state.dex[key];
    if (!state.dex[key]) state.dex[key] = { m: look(m), n: 0 };
    state.dex[key].n++;
    state.friends++; state.xp += 1 + stars + (combo >= 3 ? 1 : 0);
    // 잡은 친구 = 새 학습 예시
    state.memory.push(look(m));
    if (state.memory.length > 160) state.memory.shift();
    if (r.taught) state.taughtN = (state.taughtN || 0) + 1;
    state.checkedN = (state.checkedN || 0) + 1;
    save();
    out.friend = true;
    await talk('<b>' + nm + '</b>' + josa(nm, '이', '가') + ' 친구가 됐어!' + (out.isNew ? ' 도감에 쏙!' : ''), { hold: 1700 });

    // 짝꿍이 방금 무엇을 배웠는지 보여 준다
    var wAfter = B.weights(state.memory), smartAfter = B.smartness(state.memory);
    bs.think('<div class="learned"><div class="lt">기억 주머니 <b>' + state.memory.length + '</b>개 <span class="up">+1</span></div>' +
      '<div class="cue-row"><span>똑똑함</span><div class="bar smart cue"><i id="ls" style="width:' + smartBefore + '%"></i></div><b id="lsn">' + smartBefore + '</b></div>' +
      cueBars(wBefore, 'lc') + '</div>');
    setFace(bs.me, 'wow'); bs.me.classList.add('glow'); S.sfx('learn');
    await wait(500);
    q('#ls').style.width = smartAfter + '%'; q('#lsn').textContent = smartAfter;
    each('#lc i', function (i) { i.style.width = Math.round(Math.sqrt(wAfter[i.getAttribute('data-c')]) * 100) + '%'; });
    S.sfx('gauge');
    var said = false;
    if (!state.aha && B.knowsHeadMatters(state.memory)) {
      state.aha = true; save(); said = true;
      S.sfx('fanfare'); hop(bs.me);
      await talk('아하! 알았다! <b>색보다 머리</b>를 봐야 하는구나!', { hold: 3200 });
    }
    if (!said) {
      await talk(!hadMemory ? '기억했어! 이 친구는 ' + tname(m.type) + '!'
        : r.taught ? '이 친구를 기억해 둘게. 다음엔 안 틀릴 거야!'
          : smartAfter > smartBefore ? '친구를 볼수록 내가 똑똑해져!'
            : smartAfter < smartBefore ? '새 친구가 낯설어서 조금 헷갈려. 더 만나면 정리될 거야!' : '기억 주머니에 쏙 넣었어!', { hold: 2300 });
    }
    bs.me.classList.remove('glow'); bs.unthink();
    S.sfx('whoosh');
    await anim(bs.foe, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(-300px,160px) scale(.3)', opacity: 0 }], { duration: 440, easing: 'ease-in', fill: 'forwards' });
    await giveCard(cardDue({ explained: !!ex0, fooled: r.taught && !!ex0 && ex0.match.hue && !ex0.match.head }));
    return out;
  }

  /* 맨 처음 배틀: 짝꿍은 아무것도 모른다 → 아이가 처음으로 알려 준다 (왜 가르쳐야 하는지 먼저 느끼기) */
  async function firstBattle() {
    state.hearts = maxHearts();
    var beforeXp = state.xp;
    var bs = battleScreen();
    var m = B.makeMonster(rnd, { type: 'fire', shape: 12, mode: 'clear' });
    await wait(400);
    await bs.spawn(wildSvg(m));
    setFace(bs.me, 'wow');
    await talk('야생 말랑몬이야! 친구가 되고 싶어!', { next: true });
    await talk('<b>딱 맞는 공격</b>을 해야 친구가 될 수 있대.', { next: true });
    var r = await catchFlow(bs, m);
    state.battles++; state.phase = 'free'; save();
    after = { xp: beforeXp, fainted: r.fainted, friend: r.friend ? m : null, isNew: r.isNew, taught: r.taught };
    go(map);
  }

  // 동네에서 야생 말랑몬과 마주쳤을 때
  async function battle(wild) {
    var beforeXp = state.xp;
    var bs = battleScreen();
    await wait(300);
    await bs.spawn(wildSvg(wild.m));
    talk('야생 말랑몬이 나타났어!');
    await wait(700);
    var r = await catchFlow(bs, wild.m);
    state.battles++;
    save();
    if (mapMem) mapMem.wilds = mapMem.wilds.filter(function (w) { return w !== wild; });
    after = { xp: beforeXp, fainted: r.fainted, friend: r.friend ? wild.m : null, isNew: r.isNew, taught: r.taught };
    go(map);
  }

  /* ================================================================
     4. 시험장: 짝꿍 혼자 다섯 마리를 맞힌다. 아이는 타입을 알려 줄 수 없고 힘만 모아 준다
        (가르친 것과 시험 보는 것은 다르다 = 학습과 평가)
     ================================================================ */
  var BADGES = ['새싹 배지', '잎새 배지', '열매 배지'];
  function testMonster(lv) {
    if (lv <= 0) return B.makeMonster(rnd, { mode: 'clear' });
    var m = B.makeMonster(rnd, { mode: 'wild' });
    if (lv >= 2) for (var i = 0; i < 40 && hueFamily(m.hue) === m.type; i++) m = B.makeMonster(rnd, { mode: 'wild' }); // 색이 속이는 친구만
    return m;
  }
  async function arena() {
    var lv = Math.min(2, state.badges || 0), before = { xp: state.xp, smart: B.smartness(state.memory) };
    var bs = battleScreen({ dark: true });
    q('#hearts').parentNode.querySelector('.nm').textContent = '시험: ' + BADGES[lv];
    q('#hearts').innerHTML = '<span class="tdots">' + [0, 1, 2, 3, 4].map(function () { return '<i></i>'; }).join('') + '</span>';
    await wait(400);
    setFace(bs.me, 'wow');
    await talk('여기는 <b>시험장</b>! 타입은 내가 <b>혼자</b> 맞혀야 해.', { next: true });
    await talk(me_() + ' 선생님은 힘만 모아 줘! 다섯 마리 중 <b>네 마리</b>를 맞히면 합격!', { next: true });
    var score = 0;
    for (var i = 0; i < 5; i++) {
      var m = testMonster(lv);
      await bs.spawn(wildSvg(m));
      q('#foe-nm').innerHTML = (i + 1) + ' / 5';
      var r = await duel(bs, m, { solo: true, noHearts: true, hp: 1 });
      var dot = root.querySelectorAll('.tdots i')[i];
      if (r.won) {
        score++; dot.className = 'ok';
        q('#foe-nm').innerHTML = A.typeIcon(m.type) + A.speciesName(m);
        A.setFace(bs.foe.querySelector('svg'), 'happy'); hop(bs.foe);
        await wait(700);
      } else {
        dot.className = 'no';
        q('#foe-nm').innerHTML = A.typeIcon(m.type) + T[m.type].name + ' 타입이었어';
        await wait(1100);
      }
      await bs.leave();
    }
    var pass = score >= 4, newBadge = pass && (state.badges || 0) < 3;
    if (newBadge) state.badges = (state.badges || 0) + 1;
    state.xp += pass ? 6 : 2; state.tests = (state.tests || 0) + 1;
    save();
    setFace(bs.me, pass ? 'happy' : 'ouch');
    await reward({
      title: pass ? '합격! ' + score + '마리 맞혔어!' : score + '마리 맞혔어',
      before: before,
      lines: pass ? [newBadge ? '<b>' + BADGES[state.badges - 1] + '</b>를 받았어요!' : '시험을 또 통과했어요!']
        : ['짝꿍 혼자서는 아직 어려워요. 친구를 더 만나 <b>가르쳐 주고</b> 다시 와요!']
    });
    await giveCard(cardDue({ tested: true }));
    after = { xp: before.xp, tested: true, pass: pass };
    go(map);
  }

  /* ================================================================
     5. 전설 배틀: 짝꿍 혼자 세 번 맞혀야 한다. 맞을 때마다 몸 색을 바꿔 속이려 든다 (머리 장식은 그대로)
     ================================================================ */
  async function legendBattle(type) {
    var L = A.LEGEND[type], beforeXp = state.xp, t = TYPES.indexOf(type);
    var bs = battleScreen({ big: true });
    var others = shuffle(TYPES.filter(function (x) { return x !== type; }));
    var fams = [type, others[0], others[1]];
    function lookOf(round) {
      var r = B.HUE[fams[round]].clear;
      return { type: type, hue: Math.round(r[0] + rnd() * (r[1] - r[0])), head: t, tail: t, shape: 12, eyes: 0 };
    }
    var hp = 3, round = 0, m = lookOf(0), won = false;
    await wait(500);
    await bs.spawn(A.legend(type, m.hue));
    setFace(bs.me, 'wow');
    await talk('전설의 말랑몬 <b>' + L.name + '</b>' + josa(L.name, '이', '가') + ' 깨어났어!', { next: true });
    await talk('전설 앞에서는 <b>내가 혼자</b> 맞혀야 해. 세 번 맞히면 이겨!', { next: true });

    while (hp > 0 && bs.hearts > 0) {
      var r = await duel(bs, m, { solo: true, hp: 1 });
      if (r.won) {
        hp--; bs.setHp(hp / 3 * 100);
        if (hp > 0) {
          round++; m = lookOf(Math.min(round, 2));
          await wait(500);
          S.sfx('evolve'); flashOf(bs.foe); buzz(100);
          await wait(450);
          bs.foe.innerHTML = A.legend(type, m.hue);
          popIn(bs.foe);
          await talk('<b>' + L.name + '</b>' + josa(L.name, '이', '가') + ' 몸 색을 바꿨어! 속지 마!', { hold: 2000 });
        }
      } else if (bs.hearts > 0) {
        await talk('아야! 색에 속았어… 다시 해 볼게!', { hold: 1500 });
      }
    }

    if (hp <= 0) {
      won = true;
      bs.foe.innerHTML = A.legend(type, m.hue, { expr: 'ouch' });
      await anim(bs.foe, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg) translateY(10px)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 800, easing: 'ease-in-out' });
      talk('지금이야! 동그라미가 <b>딱 맞을 때</b> 눌러!');
      var stars = await ringCatch(bs.F);
      var own = B.HUE[type].clear;
      bs.foe.innerHTML = A.legend(type, (own[0] + own[1]) / 2);
      S.sfx('fanfare'); buzz(200);
      burst(bs.F.cx, bs.F.cy, { n: 30, star: true, size: 34, dist: 340 });
      burst(bs.F.cx, bs.F.cy - 60, { n: 10, heart: true, size: 44, dist: 200, up: 110 });
      hop(bs.foe, 40); hop(bs.me);
      setFace(bs.me, 'happy');
      q('#foe-nm').innerHTML = A.typeIcon(type) + L.name;
      state.legends[type] = true; state.xp += 8 + stars; state.friends++;
      save();
      await talk(L.title + ' <b>' + L.name + '</b>' + josa(L.name, '이', '가') + ' 친구가 됐어!', { next: true });
    } else {
      await talk('으앙, 힘이 다 빠졌어… 친구를 더 만나 배우고 다시 오자!', { hold: 2600 });
    }
    state.battles++; save();
    after = { xp: beforeXp, fainted: !won && bs.hearts <= 0, legend: won ? type : null };
    go(map);
  }

  /* ================================================================
     6. 보상 판 + 진화
     ================================================================ */
  async function reward(o) {
    var smart = B.smartness(state.memory), lvB = level(o.before.xp), lvA = level(state.xp);
    var veil = el('<div class="veil"><div class="panel">' +
      '<h2>' + o.title + '</h2>' +
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
    me.innerHTML = A.partner(state.egg, to, { expr: to >= 4 ? 'cool' : 'happy' });
    S.sfx('fanfare');
    h2.textContent = to >= 4 ? '전설로 진화했어!' : '진화했어!';
    anim(wo, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
    burst(640, 440, { n: 34, star: true, size: 34, dist: 420, host: ev });
    await anim(me, [{ transform: 'scale(.5)' }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' });
    S.say('우와! 진화했어! 더 강해졌어!');
    hop(me);
    state.hearts = maxHearts(); save();
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
     7. 우리 동네: 걸어 다니며 야생 말랑몬을 만난다
     ================================================================ */
  // 이웃이 건네는 말: 놀이 방법과 'AI는 본 만큼만 안다'는 생각을 아이 말로 돌려서 알려 준다
  var NPC_LINES = {
    guard: ['안녕! 동네를 돌아다니면 말랑몬 친구들을 만날 수 있단다.', '힘이 다 빠지면 집에서 쉬었다 가렴.'],
    diver: ['저기 갯바위에 바다의 전설이 잠들어 있단다.', '물 타입 친구를 여섯 종 모으면 깨어난다지.'],
    fisher: ['물고기도 색만 봐서는 몰라. 지느러미를 봐야지!', '짝꿍도 머리 장식을 잘 보면 안 속을 거야.'],
    keeper: ['등대는 길을 알려 주지. 노란 화살표도 그렇단다.', '길을 잃으면 화살표를 따라가 보렴.'],
    farmer: ['저 큰 팽나무에 숲의 장수가 산단다.', '풀 타입 친구를 여섯 종 모아 보렴.'],
    teacher: ['시험장에서는 짝꿍 혼자 맞혀야 해요. 가르친 만큼만 해낸답니다.', '짝꿍이 틀리면 바로 알려 주세요. 그게 가르치는 거예요!'],
    painter: ['색은 바뀔 수 있어. 하지만 머리 장식은 그대로야!', '전설은 몸 색을 바꿔서 속인대. 조심해!'],
    granny: ['짝꿍은 네가 보여 준 것만 안단다.', '천천히 하나씩 가르쳐 주렴.'],
    jogger: ['짝꿍이 틀려도 괜찮아. 가르쳐 주면 되니까!', '나도 처음엔 다 틀렸어. 연습하면 돼!'],
    shop: ['똑똑함이 100점이면 전설도 문제없지!', '오늘도 탐험 잘하렴!'],
    courier: ['도감을 다 채우면 대단한 선생님이야!', '말랑몬은 모두 쉰일곱 종이나 된대.'],
    mom: ['우리 아기도 하나씩 보면서 배운단다. 짝꿍이랑 똑같네!', '많이 본 건 금방 알아보지.'],
    kid1: ['나도 말랑몬 키워! 넌 몇 종 모았어?', '전설 봤어? 엄청 멋있대!'],
    kid2: ['머리에 불꽃이 있으면 불 타입이래!', '파란데 불 타입인 친구도 있어. 신기하지?'],
    kid3: ['공룡 말랑몬이 제일 멋져!', '티라노 친구를 만나면 나한테도 알려 줘!']
  };
  var DOCS = { vet: 0, bugdoc: 1, dinodoc: 2 };
  function npcLine(id, turn) {
    if (DOCS[id] != null) {
      var k = DOCS[id], n = kindHas(k), kn = A.KIND[k];
      if (!n) return [kn + ' 친구는 귀와 꼬리를 잘 보렴. 아직 한 종도 못 찾았구나!', kn + ' 친구는 더듬이나 날개가 있단다. 찾아보렴!', kn + ' 친구는 뿔이나 가시가 있단다. 찾아보렴!'][k];
      return n >= 18 ? kn + ' 친구를 모두 찾았구나! 정말 대단해!' : kn + ' 친구를 ' + n + '종 찾았구나! 모두 열여덟 종이란다.';
    }
    var ls = NPC_LINES[id] || ['안녕!'];
    return ls[turn % ls.length];
  }

  var mapMem = null;   // 이번에 켠 동안의 동네 상태 (야생 말랑몬 위치)
  var after = null;    // 방금 끝난 배틀 결과 (동네로 돌아와서 알려 줄 것)
  var WILD_COUNT = 7;

  var SHAPES = A.SHAPES, LEGEND_NEED = 6, TOTAL = SHAPES * 3 + 3;
  function dexHas(type) { var n = 0; for (var s = 0; s < SHAPES; s++) if (state.dex[type + '-' + s]) n++; return n; }
  function kindHas(k) { var n = 0; TYPES.forEach(function (t) { for (var s = k * 6; s < k * 6 + 6; s++) if (state.dex[t + '-' + s]) n++; }); return n; }
  function foundCount() { return Object.keys(state.dex).length + Object.keys(state.legends).length; }
  function lairState(type) { return state.legends[type] ? 'done' : dexHas(type) >= LEGEND_NEED ? 'awake' : 'locked'; }
  // 새로 나타날 야생 말랑몬: 아직 못 만난 종이 더 자주 나온다 (도감 채우는 재미)
  function newWild(mode) {
    var miss = [];
    TYPES.forEach(function (t) { for (var s = 0; s < SHAPES; s++) if (!state.dex[t + '-' + s]) miss.push([t, s]); });
    if (miss.length && rnd() < 0.65) { var c = miss[Math.floor(rnd() * miss.length)]; return B.makeMonster(rnd, { type: c[0], shape: c[1], mode: mode }); }
    return B.makeMonster(rnd, { mode: mode });
  }

  // 그 자리가 막혔으면 막은 것을 돌려준다 (건물이면 그 네모, 동네 끝이면 true)
  var REACH = 20;
  function hit(x, y) {
    var b = WD.bounds;
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) return true;
    for (var i = 0; i < WD.solids.length; i++) {
      var s = WD.solids[i];
      if (x > s.x - REACH && x < s.x + s.w + REACH && y > s.y - 6 && y < s.y + s.h + 14) return s;
    }
    return null;
  }
  function blocked(x, y) { return !!hit(x, y); }

  function ensureWilds(px, py) {
    if (!mapMem || mapMem.owner !== state) mapMem = { owner: state, wilds: [] };
    var used = mapMem.wilds.map(function (w) { return w.home; });
    var free = shuffle(WD.wildHomes.map(function (h, i) { return i; }).filter(function (i) {
      var h = WD.wildHomes[i];
      return used.indexOf(i) < 0 && Math.hypot(h[0] - px, h[1] - py) > 380;
    }));
    // 맨 처음에는 집 가까이에 뚜렷하게 생긴 친구 한 마리 (배운 게 통하는 기쁨 먼저)
    if (state.battles === 0 && !mapMem.wilds.length) {
      mapMem.wilds.push({ m: newWild('clear'), home: -1, hx: WD.start.x + 250, hy: WD.start.y + 10, x: WD.start.x + 250, y: WD.start.y + 10, tx: null, ty: null, rest: 1 });
    }
    while (mapMem.wilds.length < WILD_COUNT && free.length) {
      var i = free.pop(), h = WD.wildHomes[i];
      mapMem.wilds.push({ m: newWild('wild'), home: i, hx: h[0], hy: h[1], x: h[0], y: h[1], tx: null, ty: null, rest: rnd() * 2 });
    }
  }

  function lairHtml(type) {
    var st = lairState(type), sp = WD.spots.lair[type], own = B.HUE[type].clear, hue = (own[0] + own[1]) / 2;
    var inner;
    if (st === 'locked') {
      var n = Math.min(LEGEND_NEED, dexHas(type)), dots = '';
      for (var i = 0; i < LEGEND_NEED; i++) dots += '<i class="' + (i < n ? 'on' : '') + '"></i>';
      inner = '<div class="q">?</div><div class="prog">' + dots + '</div>';
    } else {
      inner = '<div class="mini" style="width:150px;height:150px">' + A.legend(type, hue) + '</div>';
    }
    return '<div class="lair ' + st + '" data-t="' + type + '" style="left:' + sp.x + 'px;top:' + (sp.y - 26) + 'px;z-index:' + Math.round(sp.y - 30) + '">' + inner + '</div>';
  }

  async function map() {
    var maxH = maxHearts();
    if (state.hearts == null) state.hearts = maxH;
    var res = after; after = null;
    var fainted = res && res.fainted;
    if (fainted) { state.pos = null; state.hearts = maxH; }
    if (!state.pos || blocked(state.pos.x, state.pos.y)) state.pos = { x: WD.start.x, y: WD.start.y };
    var P = { x: state.pos.x, y: state.pos.y, tx: null, ty: null, face: 1, walking: false, sideX: 0, sideY: 0 };
    var pal = { x: P.x - 70, y: P.y + 6, face: 1 };
    ensureWilds(P.x, P.y);

    var objs = WD.objects().map(function (o) {
      return '<div class="obj" style="left:' + o.x + 'px;top:' + (o.y - o.h) + 'px;z-index:' + (o.flat ? 1 : Math.round(o.y)) + '">' + o.html + '</div>';
    }).join('');
    var lv = level(state.xp), smart = B.smartness(state.memory);
    setScreen('map',
      '<div class="world" id="world">' + WD.ground() + objs + TYPES.map(lairHtml).join('') +
      '<div class="gmark" id="gmark" style="display:none">' + ICON.arrow + '</div>' +
      '<div class="ent pal" id="pal"><div class="flip">' + partnerSvg('normal') + '</div></div>' +
      '<div class="ent pl" id="pl"><div class="who">' + me_() + '</div><div class="flip">' + A.avatar(state.look) + '</div></div>' +
      '</div>' +
      '<div class="gedge" id="gedge" style="display:none">' + ICON.edge + '<div class="ic" id="gic"></div></div>' +
      '<div class="status" style="left:26px">' +
      '<div class="pill"><span class="lv">' + lv + '</span><span>' + me_() + '</span><span class="hearts" id="hearts" style="display:flex;gap:3px">' + heartsHtml(state.hearts, maxH) + '</span></div>' +
      '<div class="pill">' + ICON.bulb + '<div class="bar smart" style="width:120px"><i style="width:' + smart + '%"></i></div><span class="num">' + smart + '</span>' +
      '<span class="medals">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < (state.badges || 0) ? 'on' : '') + '">' + ICON.medal + '</i>'; }).join('') + '</span></div>' +
      '</div>' +
      '<div class="joy" id="joy" style="display:none"><i></i></div>' +
      '<button class="ico-btn ico-dex" id="dexbtn" aria-label="도감">' + ICON.dex + '</button>' +
      '<div class="bubble map-bubble tail-none"></div>');
    var world = q('#world'), plEl = q('#pl'), palEl = q('#pal'), kid = plEl.querySelector('.kid');
    var gmark = q('#gmark'), gedge = q('#gedge'), gic = q('#gic');
    q('#dexbtn').addEventListener('click', function () { S.sfx('pop'); keep(); go(dex); });

    // 야생 말랑몬 올려놓기
    mapMem.wilds.forEach(function (w) {
      w.el = el('<div class="ent wd pop"><div class="flip">' + A.wild(w.m) + '</div></div>');
      world.appendChild(w.el);
    });

    // 동네 이웃 올려놓기
    var npcs = A.NPCS.map(function (n) {
      var sp = WD.npcSpots[n.id], grown = n.look.age === 'adult' || n.look.age === 'elder';
      var node = el('<div class="ent npc' + (grown ? ' grown' : '') + '" style="transform:translate(' + sp[0] + 'px,' + sp[1] + 'px);z-index:' + Math.round(sp[1]) + '">' +
        (state.met[n.id] ? '' : '<div class="bang">!</div>') + '<div class="flip">' + A.person(n.look) + '</div></div>');
      world.appendChild(node);
      return { def: n, x: sp[0], y: sp[1], el: node, inside: Math.hypot(P.x - sp[0], P.y - sp[1]) < 80, turn: 0 };
    });

    function keep() { state.pos = { x: Math.round(P.x), y: Math.round(P.y) }; save(); }

    function meet(n) {
      var d = n.def, first = !state.met[d.id];
      n.el.querySelector('.flip').style.transform = 'scaleX(' + (P.x < n.x ? -1 : 1) + ')';
      n.el.querySelector('.flip').innerHTML = A.person(d.look, { expr: 'happy' });
      hop(n.el.querySelector('.flip'), 22);
      S.sfx('pick');
      var line = npcLine(d.id, n.turn++);
      if (first) {
        state.met[d.id] = true; state.xp += 1; save();
        var bang = n.el.querySelector('.bang'); if (bang) bang.remove();
        toast('새 이웃! ' + d.name);
      }
      if (d.id === 'farmer' && state.hearts < maxH && !n.gave) { // 귤을 하나 얻어먹고 힘이 난다
        n.gave = true; state.hearts++; save();
        q('#hearts').innerHTML = heartsHtml(state.hearts, maxH);
        S.sfx('heart'); line = '귤 하나 먹고 힘내라! (하트가 하나 찼어)';
      }
      say('<b>' + d.name + '</b> ' + line, 4200);
      var t = token;
      setTimeout(function () { if (t === token && n.el.isConnected) n.el.querySelector('.flip').innerHTML = A.person(d.look); }, 2600);
    }

    /* ---- 조작: 화면을 누른 채 끌면 조이스틱처럼 그 방향으로 달린다. 톡 누르면 그 자리로 걸어간다 ---- */
    var cam = { x: 0, y: 0 }, busy = false, moved = 0, joy = null, joyEl = q('#joy'), knob = joyEl.firstChild;
    function toWorld(p) { return { x: p.x + cam.x, y: p.y + cam.y }; }
    function walkHere(p) {
      var w = toWorld(p);
      P.tx = Math.max(WD.bounds.x0, Math.min(WD.bounds.x1, w.x));
      P.ty = Math.max(WD.bounds.y0, Math.min(WD.bounds.y1, w.y));
      P.sideX = P.sideY = 0;
      var f = el('<div class="tapfx" style="left:' + w.x + 'px;top:' + w.y + 'px"></div>');
      world.appendChild(f); setTimeout(function () { f.remove(); }, 520);
    }
    root.addEventListener('pointerdown', function (e) {
      if (busy || e.target.closest('button')) return;
      var p = pt(e);
      joy = { id: e.pointerId, ox: p.x, oy: p.y, vx: 0, vy: 0, on: false };
      S.unlock(); clearHand();
    });
    root.addEventListener('pointermove', function (e) {
      if (!joy || e.pointerId !== joy.id || busy) return;
      var p = pt(e), dx = p.x - joy.ox, dy = p.y - joy.oy, d = Math.hypot(dx, dy);
      if (!joy.on && d > 16) {
        joy.on = true; P.tx = null;
        joyEl.style.display = ''; joyEl.style.left = joy.ox + 'px'; joyEl.style.top = joy.oy + 'px';
      }
      if (joy.on && d > 0) {
        var k = Math.min(1, d / 80);
        joy.vx = dx / d * k; joy.vy = dy / d * k;
        knob.style.transform = 'translate(' + (dx / d * k * 62).toFixed(1) + 'px,' + (dy / d * k * 62).toFixed(1) + 'px)';
      }
    });
    function lift(e) {
      if (!joy || (e && e.pointerId != null && e.pointerId !== joy.id)) return;
      if (!joy.on && !busy && e && e.type === 'pointerup') walkHere(pt(e));
      joy = null; joyEl.style.display = 'none'; knob.style.transform = '';
    }
    root.addEventListener('pointerup', lift);
    root.addEventListener('pointercancel', lift);
    root.addEventListener('pointerleave', lift);

    /* ---- 다음에 어디로 가면 좋을지 알려 주는 화살표 ---- */
    function nearestWild() {
      var best = null, bd = 1e9;
      mapMem.wilds.forEach(function (w) { var d = Math.hypot(w.x - P.x, w.y - P.y); if (d < bd) { bd = d; best = w; } });
      return best;
    }
    function guideTarget() {
      var awake = TYPES.filter(function (t) { return lairState(t) === 'awake'; })[0];
      var bd = state.badges || 0;
      if (bd < 3 && state.memory.length >= 4 && smart >= [78, 88, 96][bd] && !(res && res.tested && !res.pass)) return { x: WD.spots.school.x, y: WD.spots.school.y - 150, icon: ICON.medal, why: 'school' };
      if (awake && smart >= 90) { var s = WD.spots.lair[awake]; return { x: s.x, y: s.y - 170, icon: A.typeIcon(awake), why: 'lair' }; }
      var w = nearestWild();
      return w ? { x: w.x, y: w.y - 120, icon: ICON.paw, why: 'wild' } : null;
    }

    /* ---- 들어가면 일이 생기는 곳 ---- */
    var zones = [{ id: 'home', s: WD.spots.home }, { id: 'school', s: WD.spots.school }]
      .concat(TYPES.map(function (t) { return { id: 'lair', type: t, s: WD.spots.lair[t] }; }));
    zones.forEach(function (z) { z.inside = Math.hypot(P.x - z.s.x, P.y - z.s.y) < z.s.r; });

    function say(text, hold) {
      talk(text);
      var t = token;
      setTimeout(function () { if (t === token) hideTalk(); }, (hold || 3200) * speed + 400);
    }

    function enter(z) {
      if (z.id === 'home') { busy = true; state.pos = { x: z.s.out[0], y: z.s.out[1] }; save(); S.sfx('pop'); go(dex); return; }
      if (z.id === 'school') {
        if (state.memory.length < 3) { S.sfx('weak'); say('여기는 <b>시험장</b>이야. 친구를 세 마리 만나고 다시 오자!'); return; }
        busy = true; state.pos = { x: z.s.out[0], y: z.s.out[1] }; save(); S.sfx('pop'); go(arena); return;
      }
      var st = lairState(z.type), L = A.LEGEND[z.type];
      if (st === 'locked') {
        S.sfx('weak');
        say(tname(z.type) + ' 친구를 <b>' + LEGEND_NEED + '종</b> 모으면 전설이 깨어난대! (' + dexHas(z.type) + '/' + LEGEND_NEED + ')');
      } else if (st === 'awake') {
        if (state.hearts <= 0) return;
        busy = true; state.pos = { x: z.s.out[0], y: z.s.out[1] }; save();
        S.sfx('evolve');
        go(function () { return legendBattle(z.type); });
      } else {
        S.sfx('heart');
        say('<b>' + L.name + '</b>' + josa(L.name, '은', '는') + ' 이제 우리 친구야!');
      }
    }

    /* ---- 한 장면씩 ---- */
    var my = token, last = performance.now(), guideT = 0, target = null, saveT = 0;
    function place(node, x, y) { node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; node.style.zIndex = Math.round(y); }

    function frame(now) {
      if (my !== token) return;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;

      // 주인공
      var walking = false;
      if (joy && joy.on && !busy) {
        var jl = Math.hypot(joy.vx, joy.vy);
        if (jl > 0.08) {
          var sx = joy.vx * 350 * dt, sy = joy.vy * 350 * dt, wentJ = false;
          if (!hit(P.x + sx, P.y)) { P.x += sx; wentJ = true; }
          if (!hit(P.x, P.y + sy)) { P.y += sy; wentJ = true; }
          if (wentJ) { walking = true; moved += Math.hypot(sx, sy); if (Math.abs(joy.vx) > 0.15) P.face = joy.vx > 0 ? 1 : -1; }
        }
      } else if (P.tx != null && !busy) {
        var dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
        if (d < 8) { P.tx = null; }
        else {
          var step = Math.min(d, 300 * dt), ux = dx / d, uy = dy / d, went = false;
          if (P.sideX) {
            // 건물을 옆으로 돌아가는 중: 위아래 길이 트이면 다시 목표로
            if (!hit(P.x, P.y + uy * step)) { P.y += uy * step; P.sideX = 0; went = true; }
            else if (!hit(P.x + P.sideX * step, P.y)) { P.x += P.sideX * step; P.face = P.sideX; went = true; }
            else P.sideX = 0;
          } else if (P.sideY) {
            if (!hit(P.x + ux * step, P.y)) { P.x += ux * step; P.sideY = 0; went = true; }
            else if (!hit(P.x, P.y + P.sideY * step)) { P.y += P.sideY * step; went = true; }
            else P.sideY = 0;
          } else {
            var bx = hit(P.x + ux * step, P.y);
            if (!bx) { P.x += ux * step; went = Math.abs(ux) > 0.05; }
            var by = hit(P.x, P.y + uy * step);
            if (!by) { P.y += uy * step; went = went || Math.abs(uy) > 0.05; }
            // 건물에 막히면 가까운 모퉁이 쪽으로 돌아간다
            if (by && by !== true && (bx || Math.abs(ux) < 0.5)) P.sideX = P.x - by.x < by.x + by.w - P.x ? -1 : 1;
            else if (bx && bx !== true && (by || Math.abs(uy) < 0.5)) P.sideY = P.y - bx.y < bx.y + bx.h - P.y ? -1 : 1;
            if (P.sideX || P.sideY) went = true;
          }
          if (went) { walking = true; moved += step; if (Math.abs(dx) > 6 && !P.sideX) P.face = dx > 0 ? 1 : -1; }
          else P.tx = null;
        }
      }
      if (walking !== P.walking) { P.walking = walking; kid.classList.toggle('walking', walking); }
      plEl.querySelector('.flip').style.transform = 'scaleX(' + P.face + ')';
      place(plEl, P.x, P.y);

      // 짝꿍은 조금 뒤에서 따라온다
      var fx = P.x - P.face * 74, fy = P.y + 8, pd = Math.hypot(fx - pal.x, fy - pal.y);
      if (pd > 6) { var k = Math.min(1, dt * 4.5); pal.x += (fx - pal.x) * k; pal.y += (fy - pal.y) * k; if (Math.abs(fx - pal.x) > 4) pal.face = fx > pal.x ? 1 : -1; }
      palEl.querySelector('.flip').style.transform = 'scaleX(' + pal.face + ')';
      place(palEl, pal.x, pal.y);

      // 야생 말랑몬은 제 자리 근처를 어슬렁거린다
      for (var i = 0; i < mapMem.wilds.length; i++) {
        var w = mapMem.wilds[i], pdx = w.x - P.x, pdy = w.y - P.y, pdist = Math.hypot(pdx, pdy) || 1;
        if (!w.react && pdist < 230 && !busy) {
          w.react = rnd() < 0.5 ? 'flee' : 'come'; w.reactT = w.react === 'flee' ? 2.2 : 3;
          var bg = el('<div class="bang">!</div>'); w.el.appendChild(bg); setTimeout(function () { bg.remove(); }, 700);
          S.sfx('tap');
        }
        if (w.react === 'flee' || w.react === 'come') {
          w.reactT -= dt; w.tx = null;
          var dirR = w.react === 'flee' ? 1 : -1, spR = (w.react === 'flee' ? 175 : 100) * dt;
          var rx = w.x + pdx / pdist * dirR * spR, ry = w.y + pdy / pdist * dirR * spR;
          if (!blocked(rx, w.y)) w.x = rx;
          if (!blocked(w.x, ry)) w.y = ry;
          w.el.querySelector('.flip').style.transform = 'scaleX(' + (pdx * dirR > 0 ? -1 : 1) + ')';
          if (w.reactT <= 0) { w.react = 'tired'; w.hx = w.x; w.hy = w.y; }
        } else if (w.react === 'tired' && pdist > 330) w.react = null;
        if (w.react === 'flee' || w.react === 'come') { /* 위에서 움직였다 */ } else if (w.tx == null) {
          w.rest -= dt;
          if (w.rest <= 0) {
            var a = rnd() * Math.PI * 2, rr = 30 + rnd() * 90, tx = w.hx + Math.cos(a) * rr, ty = w.hy + Math.sin(a) * rr * 0.6;
            if (!blocked(tx, ty)) { w.tx = tx; w.ty = ty; }
            w.rest = 0.3;
          }
        } else {
          var wx = w.tx - w.x, wy = w.ty - w.y, wd = Math.hypot(wx, wy);
          if (wd < 4) { w.tx = null; w.rest = 1 + rnd() * 2.5; }
          else { var ws = Math.min(wd, 44 * dt); w.x += wx / wd * ws; w.y += wy / wd * ws; w.el.querySelector('.flip').style.transform = 'scaleX(' + (wx > 0 ? -1 : 1) + ')'; }
        }
        place(w.el, w.x, w.y);
        if (!busy && Math.hypot(w.x - P.x, w.y - P.y) < 66 && state.hearts > 0) {
          busy = true; keep();
          S.sfx('pop');
          w.el.appendChild(el('<div class="bang">!</div>'));
          (function (w) { setTimeout(function () { if (my === token) go(function () { return battle(w); }); }, FAST ? 40 : 520); })(w);
        }
      }

      // 이웃 가까이 가면 말을 건넨다
      if (!busy) {
        for (var ni = 0; ni < npcs.length; ni++) {
          var np = npcs[ni], nd = Math.hypot(P.x - np.x, P.y - np.y);
          if (nd < 70 && !np.inside) { np.inside = true; meet(np); }
          else if (nd > 110) np.inside = false;
        }
      }

      // 문과 굴
      if (!busy) {
        for (var z = 0; z < zones.length; z++) {
          var zn = zones[z], zd = Math.hypot(P.x - zn.s.x, P.y - zn.s.y);
          if (zd < zn.s.r && !zn.inside) { zn.inside = true; enter(zn); if (busy) break; }
          else if (zd > zn.s.r + 24) zn.inside = false;
        }
      }

      // 카메라
      cam.x = Math.max(0, Math.min(WD.W - 1280, P.x - 640));
      cam.y = Math.max(0, Math.min(WD.H - 800, P.y - 440));
      world.style.transform = 'translate(' + (-cam.x).toFixed(1) + 'px,' + (-cam.y).toFixed(1) + 'px)';

      // 안내 화살표: 화면 안이면 그 위에서 통통, 화면 밖이면 가장자리에서 방향을 가리킨다
      guideT -= dt;
      if (guideT <= 0) { guideT = 0.4; target = guideTarget(); if (target) gic.innerHTML = target.icon; }
      if (target && !busy) {
        var sx = target.x - cam.x, sy = target.y - cam.y;
        if (sx > 60 && sx < 1220 && sy > 130 && sy < 700) {
          gedge.style.display = 'none'; gmark.style.display = '';
          gmark.style.left = target.x + 'px'; gmark.style.top = target.y + 'px';
        } else {
          gmark.style.display = 'none'; gedge.style.display = '';
          var cx = 640, cy = 420, ang = Math.atan2(sy - cy, sx - cx), ca = Math.cos(ang), sa = Math.sin(ang);
          var tE = Math.min(Math.abs((ca > 0 ? 1210 - cx : 70 - cx) / (ca || 1e-6)), Math.abs((sa > 0 ? 690 - cy : 170 - cy) / (sa || 1e-6)));
          gedge.style.transform = 'translate(' + (cx + ca * tE).toFixed(0) + 'px,' + (cy + sa * tE).toFixed(0) + 'px)';
          gedge.firstChild.style.transformOrigin = '50% 50%';
          gedge.firstChild.style.transform = 'rotate(' + (ang * 180 / Math.PI + 90).toFixed(0) + 'deg)';
        }
      } else { gmark.style.display = 'none'; gedge.style.display = 'none'; }

      // 걷는 법을 익혔으면 기억해 두기 + 가끔 위치 저장
      if (!state.mapTut && moved > 260) { state.mapTut = true; save(); }
      saveT += dt; if (saveT > 4) { saveT = 0; keep(); }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    walkTo = function (x, y) { P.tx = x; P.ty = y; P.sideX = P.sideY = 0; };
    whereAmI = function () { return { x: P.x, y: P.y, busy: busy }; };

    /* ---- 돌아왔을 때 알려 줄 것들 ---- */
    await wait(350);
    if (res && form(level(state.xp)) > form(level(res.xp))) {
      busy = true;
      await evolution(form(level(res.xp)), form(level(state.xp)));
      go(map); return;
    }
    if (res && level(state.xp) > level(res.xp)) { S.sfx('fanfare'); toast('레벨 업! Lv.' + level(state.xp)); }
    else if (res && res.legend) toast('전설 친구가 생겼어!');
    else if (res && res.isNew) toast('도감에 새 친구!');

    if (fainted) {
      say('힘이 다 빠져서 집에서 쉬었어. 머리 장식을 잘 보고 알려 줘!', 4200);
    } else if (!state.mapTut) {
      say('화면을 누른 채 <b>끌면</b> 그쪽으로 달려가! 친구를 찾아보자.', 5600);
      hand(760, 500, 'dragging', 150, -60);
    } else if (res && res.tested) {
      say(res.pass ? '시험에 합격했어! 나 혼자서도 잘하지?' : '혼자서는 아직 어려워. 친구를 더 만나서 가르쳐 줘!', 3800);
    } else if (res && res.legend) {
      say('우리가 전설을 이겼어! ' + me_() + ' 선생님 덕분이야!', 3600);
    } else if (res && res.taught) {
      say('아까 가르쳐 준 친구, 이제 기억했어!', 3200);
    } else if (res && res.isNew && TYPES.some(function (t) { return lairState(t) === 'awake'; })) {
      say('어디선가 <b>전설</b>이 깨어난 것 같아…!', 3600);
    } else if (!res) {
      say(['오늘은 어디로 탐험할까?', '화살표를 따라가면 친구가 있어!', '동네 구석구석 찾아보자!'][Math.floor(rnd() * 3)], 3000);
    }
  }
  var walkTo = null, whereAmI = null;

  /* ================================================================
     8. 도감 + 짝꿍의 기억 주머니 (우리 집)
     ================================================================ */
  var dexTab = 'fire';
  function dex() {
    var tabs = TYPES.map(function (t) { return { id: t, label: A.typeIcon(t) + T[t].name + ' <small>' + dexHas(t) + '/' + SHAPES + '</small>' }; })
      .concat([{ id: 'legend', label: '전설 <small>' + Object.keys(state.legends).length + '/3</small>' },
        { id: 'people', label: '이웃 <small>' + Object.keys(state.met).length + '/' + A.NPCS.length + '</small>' },
        { id: 'learn', label: '배움 <small>' + Object.keys(state.cards).length + '/' + CARDS.length + '</small>' }]);
    var body = '';
    if (dexTab === 'legend') {
      body = '<div class="dx-big">' + TYPES.map(function (t) {
        var own = B.HUE[t].clear, L = A.LEGEND[t];
        if (state.legends[t]) return '<button class="dx-cell big legend" data-n="' + L.title + ' ' + L.name + '">' + mini(A.legend(t, (own[0] + own[1]) / 2)) + '<span class="nm">' + L.name + '</span><span class="sub">' + L.title + '</span></button>';
        return '<div class="dx-cell big unknown">' + mini(A.legend(t, own[0]).replace('mon-legend', 'mon-legend is-shadow')) + '<span class="nm">???</span><span class="sub">' + T[t].name + ' 타입 ' + Math.min(LEGEND_NEED, dexHas(t)) + '/' + LEGEND_NEED + '종</span></div>';
      }).join('') + '</div>';
    } else if (dexTab === 'learn') {
      body = '<div class="dx-cards">' + CARDS.map(function (c, i) {
        if (state.cards[c.id]) return '<div class="lc"><div class="ic">' + c.icon + '</div><div><h4>' + (i + 1) + '. ' + c.title + '</h4><p>' + c.kid + '</p><p class="adult">' + c.adult + '</p></div></div>';
        return '<div class="lc lock"><div class="ic">?</div><div><h4>' + (i + 1) + '. 아직 못 얻은 카드</h4><p>짝꿍과 탐험하다 보면 얻게 돼요.</p></div></div>';
      }).join('') + '</div>';
    } else if (dexTab === 'people') {
      body = '<div class="dx-row">' + A.NPCS.map(function (n) {
        if (state.met[n.id]) return '<button class="dx-cell ppl" data-n="' + n.name + '"><div class="mini">' + A.person(n.look) + '</div><span class="nm">' + n.name + '</span></button>';
        return '<div class="dx-cell ppl unknown"><div class="mini shadow">' + A.person(n.look) + '</div><span class="nm">???</span></div>';
      }).join('') + '</div>';
    } else {
      var t = dexTab, ti = TYPES.indexOf(t), range = B.HUE[t].clear;
      [0, 1, 2].forEach(function (k) {
        var have = 0, row = '';
        for (var s = k * 6; s < k * 6 + 6; s++) {
          var d = state.dex[t + '-' + s];
          if (d) { have++; row += '<button class="dx-cell t-' + t + '" data-n="' + A.SPECIES[t][s] + '"><span class="cnt">×' + d.n + '</span>' + mini(A.wild({ type: t, shape: s, hue: (range[0] + range[1]) / 2, head: ti, tail: ti, eyes: d.m.eyes })) + '<span class="nm">' + A.SPECIES[t][s] + '</span></button>'; }
          else row += '<div class="dx-cell unknown">' + mini(A.wild({ type: t, shape: s, hue: range[0], head: ti, tail: ti, eyes: 0 }, { silhouette: true })) + '<span class="nm">???</span></div>';
        }
        body += '<div class="dx-lab">' + A.KIND[k] + ' ' + have + '/6</div><div class="dx-row">' + row + '</div>';
      });
    }
    var mem = '';
    TYPES.forEach(function (t) {
      var list = state.memory.filter(function (e) { return e.type === t; });
      mem += '<div class="mem-row t-' + t + '">' + A.typeIcon(t) + '<div class="minis">' +
        (list.length ? list.slice(-6).map(function (e) { return mini(A.wild(e)); }).join('') : '<span class="mem-empty">아직 못 배웠어</span>') +
        '</div><span class="n">' + list.length + '</span></div>';
    });
    setScreen('dex', sceneSky() +
      '<h2 class="dex-title">도감</h2><div class="dex-count">친구 ' + foundCount() + ' / ' + TOTAL + '</div>' +
      '<button class="dex-edit" id="edit">내 모습 꾸미기</button>' +
      '<div class="dx-tabs">' + tabs.map(function (tb) { return '<button class="dx-tab' + (tb.id === dexTab ? ' on' : '') + '" data-tab="' + tb.id + '">' + tb.label + '</button>'; }).join('') + '</div>' +
      '<div class="dx-body">' + body + '</div>' +
      '<div class="mem"><h3>짝꿍의 기억 주머니</h3><p>' + me_() + ' 선생님이 알려 준 친구 ' + state.memory.length + '마리</p>' + mem +
      '<h3 class="h-cue">짝꿍이 믿는 단서</h3>' + cueBars(B.weights(state.memory)) + '</div>' +
      '<button class="reset" id="reset">처음부터 다시</button>', { home: true });
    each('.dx-tab', function (b) { b.addEventListener('click', function () { S.sfx('tap'); dexTab = b.getAttribute('data-tab'); go(dex); }); });
    each('button.dx-cell', function (c) {
      c.addEventListener('click', function () { S.sfx('pick'); hop(c.querySelector('.mini'), 24); S.say(c.getAttribute('data-n')); });
    });
    q('#edit').addEventListener('click', function () { S.sfx('pop'); go(avatarMaker); });
    q('#reset').addEventListener('click', function () {
      var veil = el('<div class="veil"><div class="panel" style="padding-bottom:170px"><h2>처음부터 다시 할까?</h2><p>' + me_() + '의 짝꿍과 도감이 모두 사라져요.</p>' +
        '<button class="btn green" id="no" style="margin-left:-320px">아니</button><button class="btn" id="yes" style="margin-left:20px;background:#b9b2c9">다시 하기</button></div></div>');
      root.appendChild(veil);
      veil.querySelector('#no').addEventListener('click', function () { veil.remove(); });
      veil.querySelector('#yes').addEventListener('click', function () {
        store.profiles.splice(store.cur, 1); store.cur = -1; state = null; mapMem = null; save(); go(title);
      });
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
    get store() { return store; },
    set: function (patch) { for (var k in patch) state[k] = patch[k]; save(); },
    seed: function (name, patch) { createProfile(name); for (var k in patch) state[k] = patch[k]; save(); },
    go: function (name) { go({ title: title, who: profiles, map: map, arena: arena, dex: dex, egg: eggScreen, first: firstBattle, maker: avatarMaker, name: nameScreen }[name]); },
    wilds: function () { return mapMem ? mapMem.wilds.map(function (w) { return { x: w.x, y: w.y, type: w.m.type }; }) : []; },
    dexTab: function (t) { dexTab = t; go(dex); },
    walkTo: function (x, y) { if (walkTo) walkTo(x, y); },
    where: function () { return whereAmI ? whereAmI() : null; },
    fight: function () { var w = mapMem && mapMem.wilds[0]; if (w) go(function () { return battle(w); }); },
    legend: function (type) { go(function () { return legendBattle(type); }); },
    brain: B
  };
})();
