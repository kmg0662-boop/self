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
      lessons: 0, battles: 0, sinceLesson: 0, friends: 0, seenTricky: false, aha: false, hearts: 3, pos: null, mapTut: false
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
      mw(A.wild({ type: 'fire', shape: 2, hue: 14, head: 0, tail: 0, eyes: 0 }), 190, 380, 230) +
      mw(A.partner(p0 && p0.egg || 'berry', p0 && p0.egg ? form(level(p0.xp)) : 2, { expr: 'happy' }), 500, 340, 280, 'title-me') +
      mw(A.wild({ type: 'water', shape: 0, hue: 210, head: 1, tail: 1, eyes: 1 }), 850, 390, 220) +
      mw(A.wild({ type: 'grass', shape: 1, hue: 118, head: 2, tail: 2, eyes: 2 }), 1030, 470, 180) +
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
        '<div class="pn">' + esc(p.name) + '</div><div class="pl">' + (p.egg ? 'Lv.' + level(p.xp) + ' · 친구 ' + Object.keys(p.dex).length + '종' : '새 모험') + '</div>' +
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
      return '<div class="mk-row"><span class="lab">머리</span>' + opts('hair', 4, function (i) { return face({ hair: i, hat: 0 }); }) + '</div>' +
        '<div class="mk-row"><span class="lab">머리 색</span>' + opts('hairColor', 3, function (i) { return sw(L.HAIR[i]); }, 'sw') + '</div>' +
        '<div class="mk-row"><span class="lab">피부</span>' + opts('skin', 3, function (i) { return sw(L.SKIN[i]); }, 'sw') + '</div>' +
        '<div class="mk-row"><span class="lab">옷</span>' + opts('outfit', 6, function (i) { return sw(L.OUTFIT[i]); }, 'sw') + '</div>' +
        '<div class="mk-row"><span class="lab">모자</span>' + opts('hat', 3, function (i) { return face({ hat: i }); }) + '</div>' +
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
        if (lk[k] === v) b.classList.add('on');
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
    if (state.phase === 'needTeach') return lesson();
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
     3. 배틀 화면
     ================================================================ */
  var ME = { x: 150, y: 300, size: 320, cx: 310, cy: 470 };
  var FOE = { x: 820, y: 190, size: 270, cx: 955, cy: 330 };
  var BIG = { x: 730, y: 60, size: 420, cx: 940, cy: 290 };

  function heartsHtml(n, max) {
    var s = '';
    for (var i = 0; i < max; i++) s += ICON.heart.replace('<svg ', '<svg ' + (i < n ? '' : 'class="off" '));
    return s;
  }

  function battleScreen(o) {
    o = o || {};
    var F = o.big ? BIG : FOE;
    setScreen('battle', sceneBattle(o.big) +
      '<div class="hud me" style="left:26px"><div class="nm">' + me_() + '의 짝꿍 · Lv.' + level(state.xp) + '</div><div class="hearts" id="hearts"></div></div>' +
      '<div class="hud foe"><div class="nm" id="foe-nm">???</div><div class="hpbar"><i id="foe-hp"></i></div></div>' +
      '<div class="think" id="think" style="left:70px;top:128px;height:176px"></div>' +
      mw(partnerSvg('normal'), ME.x, ME.y, ME.size, 'me') +
      '<div class="bubble battle-bubble tail-none" style="left:50px;right:400px;bottom:30px"></div>');
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
        if (o.big) shakeScreen();
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
    state.hearts = maxHearts();
    var bs = battleScreen();
    var m = B.makeMonster(rnd, { type: 'fire', shape: 2, mode: 'clear' });
    await wait(400);
    await bs.spawn(wildSvg(m));
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
    await bs.leave();
    await talk('아야… 나는 아직 <b>배운 게 없어서</b> 몰랐어.', { next: true });
    setFace(bs.me, 'normal');
    await talk(me_() + ' 선생님! 나한테 <b>타입</b>을 가르쳐 줘!', { next: true });
    state.phase = 'needTeach'; state.hearts = maxHearts(); save();
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
      TYPES.forEach(function (t, i) { cards.push({ m: B.makeMonster(rnd, { type: t, shape: i, mode: 'clear' }), labeled: false }); });
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

    state.lessons++; state.sinceLesson = 0;
    state.phase = 'free';
    state.hearts = maxHearts();
    save();
    setFace(me, 'happy'); hop(me);
    await talk('수업 끝! 나 <b>더 똑똑해졌어!</b>', { hold: 1600 });
    var after_ = B.smartness(state.memory);
    await reward({
      title: '수업 끝!', before: before,
      lines: first ? ['많이 보여 줄수록 짝꿍이 똑똑해져요!']
        : after_ < before.smart ? ['새 친구가 낯설어서 조금 헷갈리나 봐. 더 보여 주면 정리돼요!']
          : after_ >= 100 && before.smart < 100 ? ['우와, 100점! 정말 훌륭한 선생님이에요!'] : []
    });
    go(map);
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

    state.memory.push(look(m));
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
     5. 배틀: 짝꿍이 기억을 떠올려 타입을 맞히고, 딱 맞는 공격을 한다
     ================================================================ */
  // 생각하기 → 어떤 타입이라고 봤는지 돌려준다
  async function thinkAbout(bs, m, explain) {
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
    return gt;
  }

  async function encounter(bs, m, explain) {
    var result = { friend: false, missed: false };
    setFace(bs.me, 'normal');
    await bs.spawn(wildSvg(m));
    talk('야생 말랑몬이 나타났어!');
    await attackTap();
    hideTalk();

    var gt = await thinkAbout(bs, m, explain);
    if (gt === m.type) {
      await bs.shoot(B.COUNTER[gt], true, true);
      bs.callout('딱 맞았어!', 'good');
      bs.setHp(0);
    } else {
      // 잘못 봤다 → 공격이 안 통하고, 한 대 맞는다
      result.missed = true;
      await bs.shoot(B.COUNTER[gt], true, false);
      bs.callout('어라? 안 통해…', 'meh');
      bs.setHp(78);
      setFace(bs.me, 'wow');
      await talk('앗, <b>잘못 봤나 봐!</b>', { hold: 1500 });
      await bs.shoot(m.type, false, false);
      setFace(bs.me, 'ouch');
      bs.setHearts(bs.hearts - 1);
      state.review.push(look(m));
      if (state.review.length > 6) state.review.shift();
      save();
      if (bs.hearts <= 0) {
        await talk('으앙, 힘이 다 빠졌어…', { hold: 1900 });
        await bs.leave();
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
    burst(bs.F.cx, bs.F.cy - 40, { n: 9, heart: true, size: 42, dist: 170, up: 100 });
    hop(bs.foe); hop(bs.me);
    var nm = A.speciesName(m);
    q('#foe-nm').innerHTML = A.typeIcon(m.type) + nm;
    var key = m.type + '-' + m.shape;
    var isNew = !state.dex[key];
    if (!state.dex[key]) state.dex[key] = { m: look(m), n: 0 };
    state.dex[key].n++;
    state.friends++; state.xp += 2;
    save();
    result.friend = true; result.isNew = isNew;
    await talk('<b>' + nm + '</b>' + josa(nm, '이', '가') + ' 친구가 됐어!' + (isNew ? ' 도감에 쏙!' : ''), { hold: 2300 });
    if (result.missed) await talk('이 친구는 헷갈렸어. 학교에서 <b>가르쳐 줘!</b>', { hold: 2200 });
    S.sfx('whoosh');
    await anim(bs.foe, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(-300px,160px) scale(.3)', opacity: 0 }], { duration: 480, easing: 'ease-in', fill: 'forwards' });
    return result;
  }

  // 동네에서 야생 말랑몬과 마주쳤을 때
  async function battle(wild) {
    var beforeXp = state.xp;
    var bs = battleScreen();
    await wait(300);
    var r = await encounter(bs, wild.m, state.battles === 0);
    state.battles++; state.sinceLesson++;
    save();
    if (mapMem) mapMem.wilds = mapMem.wilds.filter(function (w) { return w !== wild; });
    after = { xp: beforeXp, fainted: bs.hearts <= 0, friend: r.friend ? wild.m : null, isNew: r.isNew, missed: r.missed };
    go(map);
  }

  /* 전설 배틀: 세 번 맞혀야 한다. 맞을 때마다 몸 색을 바꿔서 속이려 든다 (머리 장식은 그대로) */
  async function legendBattle(type) {
    var L = A.LEGEND[type], beforeXp = state.xp, t = TYPES.indexOf(type);
    var bs = battleScreen({ big: true });
    var others = shuffle(TYPES.filter(function (x) { return x !== type; }));
    var fams = [type, others[0], others[1]];
    function lookOf(round) {
      var r = B.HUE[fams[round]].clear;
      return { type: type, hue: Math.round(r[0] + rnd() * (r[1] - r[0])), head: t, tail: t, shape: 2, eyes: 0 };
    }
    var hp = 3, round = 0, m = lookOf(0), won = false;
    await wait(500);
    await bs.spawn(A.legend(type, m.hue));
    setFace(bs.me, 'wow');
    await talk('전설의 말랑몬 <b>' + L.name + '</b>' + josa(L.name, '이', '가') + ' 깨어났어!', { next: true });
    await talk('세 번 맞혀야 친구가 될 수 있대. 힘내자!', { next: true });

    while (hp > 0 && bs.hearts > 0) {
      hideTalk();
      await attackTap();
      var gt = await thinkAbout(bs, m, false);
      if (gt === type) {
        await bs.shoot(B.COUNTER[gt], true, true);
        bs.callout('딱 맞았어!', 'good');
        hp--; bs.setHp(hp / 3 * 100);
        if (hp > 0) {
          round++; m = lookOf(Math.min(round, 2));
          await wait(700);
          S.sfx('evolve'); flashOf(bs.foe);
          await wait(500);
          bs.foe.innerHTML = A.legend(type, m.hue);
          popIn(bs.foe);
          await talk('<b>' + L.name + '</b>' + josa(L.name, '이', '가') + ' 몸 색을 바꿨어! 속지 마!', { hold: 2400 });
        }
      } else {
        await bs.shoot(B.COUNTER[gt], true, false);
        bs.callout('어라? 안 통해…', 'meh');
        setFace(bs.me, 'wow');
        await talk('앗, <b>색에 속았나 봐!</b>', { hold: 1500 });
        await bs.shoot(type, false, false);
        setFace(bs.me, 'ouch');
        bs.setHearts(bs.hearts - 1);
        state.review.push(look(m));
        if (state.review.length > 6) state.review.shift();
        save();
        if (bs.hearts > 0) await talk('아야! 다시 잘 보자…', { hold: 1500 });
      }
    }

    if (hp <= 0) {
      won = true;
      bs.foe.innerHTML = A.legend(type, m.hue, { expr: 'ouch' });
      await anim(bs.foe, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg) translateY(10px)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 900, easing: 'ease-in-out' });
      var own = B.HUE[type].clear;
      bs.foe.innerHTML = A.legend(type, (own[0] + own[1]) / 2);
      S.sfx('fanfare');
      burst(bs.F.cx, bs.F.cy, { n: 30, star: true, size: 34, dist: 340 });
      burst(bs.F.cx, bs.F.cy - 60, { n: 10, heart: true, size: 44, dist: 200, up: 110 });
      hop(bs.foe, 40); hop(bs.me);
      setFace(bs.me, 'happy');
      q('#foe-nm').innerHTML = A.typeIcon(type) + L.name;
      state.legends[type] = true; state.xp += 10; state.friends++;
      save();
      await talk(L.title + ' <b>' + L.name + '</b>' + josa(L.name, '이', '가') + ' 친구가 됐어!', { next: true });
    } else {
      await talk('으앙, 힘이 다 빠졌어… 더 배우고 다시 오자!', { hold: 2400 });
    }
    state.battles++; state.sinceLesson++; save();
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
  var mapMem = null;   // 이번에 켠 동안의 동네 상태 (야생 말랑몬 위치)
  var after = null;    // 방금 끝난 배틀 결과 (동네로 돌아와서 알려 줄 것)
  var WILD_COUNT = 7;

  function dexHas(type) { return [0, 1, 2].filter(function (s) { return state.dex[type + '-' + s]; }).length; }
  function lairState(type) { return state.legends[type] ? 'done' : dexHas(type) >= 3 ? 'awake' : 'locked'; }

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
      mapMem.wilds.push({ m: B.makeMonster(rnd, { mode: 'clear' }), home: -1, hx: WD.start.x + 250, hy: WD.start.y + 10, x: WD.start.x + 250, y: WD.start.y + 10, tx: null, ty: null, rest: 1 });
    }
    while (mapMem.wilds.length < WILD_COUNT && free.length) {
      var i = free.pop(), h = WD.wildHomes[i];
      mapMem.wilds.push({ m: B.makeMonster(rnd, { mode: 'wild' }), home: i, hx: h[0], hy: h[1], x: h[0], y: h[1], tx: null, ty: null, rest: rnd() * 2 });
    }
  }

  function lairHtml(type) {
    var st = lairState(type), sp = WD.spots.lair[type], own = B.HUE[type].clear, hue = (own[0] + own[1]) / 2;
    var inner;
    if (st === 'locked') {
      var n = dexHas(type), dots = '';
      for (var i = 0; i < 3; i++) dots += '<i class="' + (i < n ? 'on' : '') + '"></i>';
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
      '<div class="pill">' + ICON.bulb + '<div class="bar smart" style="width:140px"><i style="width:' + smart + '%"></i></div><span class="num">' + smart + '</span></div>' +
      '</div>' +
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

    function keep() { state.pos = { x: Math.round(P.x), y: Math.round(P.y) }; save(); }

    /* ---- 조작: 누른 곳으로 걸어간다. 누르고 있으면 손가락을 따라간다 ---- */
    var cam = { x: 0, y: 0 }, held = false, busy = false, moved = 0;
    function toWorld(e) { var p = pt(e); return { x: p.x + cam.x, y: p.y + cam.y }; }
    function aim(e, fx) {
      var w = toWorld(e);
      P.tx = Math.max(WD.bounds.x0, Math.min(WD.bounds.x1, w.x));
      P.ty = Math.max(WD.bounds.y0, Math.min(WD.bounds.y1, w.y));
      P.sideX = P.sideY = 0;
      if (fx) {
        var f = el('<div class="tapfx" style="left:' + w.x + 'px;top:' + w.y + 'px"></div>');
        world.appendChild(f); setTimeout(function () { f.remove(); }, 520);
      }
    }
    root.addEventListener('pointerdown', function (e) {
      if (busy || e.target.closest('button')) return;
      held = true; S.unlock(); clearHand(); aim(e, true);
    });
    root.addEventListener('pointermove', function (e) { if (held && !busy) aim(e, false); });
    function lift() { held = false; }
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
      if (state.review.length > 0 || state.sinceLesson >= 4) return { x: WD.spots.school.x, y: WD.spots.school.y - 150, icon: ICON.teach, why: 'school' };
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
      if (z.id === 'school') { busy = true; state.pos = { x: z.s.out[0], y: z.s.out[1] }; save(); S.sfx('pop'); go(lesson); return; }
      var st = lairState(z.type), L = A.LEGEND[z.type];
      if (st === 'locked') {
        S.sfx('weak');
        say(tname(z.type) + ' 친구 <b>3종</b>을 모두 모으면 전설이 깨어난대! (' + dexHas(z.type) + '/3)');
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
      if (P.tx != null && !busy) {
        var dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
        if (d < 8) { if (!held) { P.tx = null; } }
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
          else if (!held) P.tx = null;
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
        var w = mapMem.wilds[i];
        if (w.tx == null) {
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
    walkTo = function (x, y) { P.tx = x; P.ty = y; };
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
      say('힘이 다 빠져서 집에서 쉬었어. <b>학교</b>에서 더 가르쳐 줘!', 4200);
    } else if (!state.mapTut) {
      say('가고 싶은 곳을 <b>꾹 누르면</b> 걸어가! 친구를 찾아보자.', 5200);
      hand(900, 470, 'tap');
    } else if (res && res.legend) {
      say('우리가 전설을 이겼어! ' + me_() + ' 선생님 덕분이야!', 3600);
    } else if (res && res.missed) {
      say('헷갈린 친구가 있어. <b>학교</b>로 가서 가르쳐 줘!', 3600);
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
  function dex() {
    var cells = '', found = 0;
    TYPES.forEach(function (t) {
      [0, 1, 2].forEach(function (s) {
        var d = state.dex[t + '-' + s];
        if (d) {
          found++;
          cells += '<button class="dex-cell t-' + t + '" data-n="' + A.SPECIES[t][s] + '"><span class="ti">' + A.typeIcon(t) + '</span><span class="kind">' + A.KIND[s] + '</span><span class="cnt">×' + d.n + '</span>' + mini(A.wild(d.m)) + '<span class="nm">' + A.SPECIES[t][s] + '</span></button>';
        } else {
          var range = B.HUE[t].clear, ti = TYPES.indexOf(t);
          cells += '<div class="dex-cell unknown"><span class="kind" style="left:14px">' + A.KIND[s] + '</span>' + mini(A.wild({ type: t, shape: s, hue: range[0], head: ti, tail: ti, eyes: 0 }, { silhouette: true })) + '<span class="nm">???</span></div>';
        }
      });
    });
    TYPES.forEach(function (t) {
      var own = B.HUE[t].clear, L = A.LEGEND[t];
      if (state.legends[t]) {
        found++;
        cells += '<button class="dex-cell legend" data-n="' + L.title + ' ' + L.name + '"><span class="ti">' + A.typeIcon(t) + '</span><span class="kind">전설</span>' + mini(A.legend(t, (own[0] + own[1]) / 2)) + '<span class="nm">' + L.name + '</span></button>';
      } else {
        cells += '<div class="dex-cell legend unknown"><span class="kind" style="left:14px">전설</span>' + mini(A.legend(t, own[0]).replace('mon-legend', 'mon-legend is-shadow')) + '<span class="nm">???</span></div>';
      }
    });
    var mem = '';
    TYPES.forEach(function (t) {
      var list = state.memory.filter(function (e) { return e.type === t; });
      mem += '<div class="mem-row t-' + t + '">' + A.typeIcon(t) + '<div class="minis">' +
        (list.length ? list.slice(-7).map(function (e) { return mini(A.wild(e)); }).join('') : '<span class="mem-empty">아직 못 배웠어</span>') +
        '</div><span class="n">' + list.length + '</span></div>';
    });
    setScreen('dex', sceneSky() +
      '<h2 class="dex-title">도감</h2><div class="dex-count">친구 ' + found + ' / 12</div>' +
      '<button class="dex-edit" id="edit">내 모습 꾸미기</button>' +
      '<div class="dex-grid">' + cells + '</div>' +
      '<div class="mem"><h3>짝꿍의 기억 주머니</h3><p>' + me_() + ' 선생님이 보여 준 친구들이에요</p>' + mem + '</div>' +
      '<button class="reset" id="reset">처음부터 다시</button>', { home: true });
    each('button.dex-cell', function (c) {
      c.addEventListener('click', function () { S.sfx('pick'); hop(c.querySelector('.mini'), 30); S.say(c.getAttribute('data-n')); });
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
    go: function (name) { go({ title: title, who: profiles, map: map, lesson: lesson, dex: dex, egg: eggScreen, first: firstBattle, maker: avatarMaker, name: nameScreen }[name]); },
    wilds: function () { return mapMem ? mapMem.wilds.map(function (w) { return { x: w.x, y: w.y, type: w.m.type }; }) : []; },
    walkTo: function (x, y) { if (walkTo) walkTo(x, y); },
    where: function () { return whereAmI ? whereAmI() : null; },
    fight: function () { var w = mapMem && mapMem.wilds[0]; if (w) go(function () { return battle(w); }); },
    legend: function (type) { go(function () { return legendBattle(type); }); },
    brain: B
  };
})();
