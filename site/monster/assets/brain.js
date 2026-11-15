/* 말랑몬 선생님 — 짝꿍의 "두뇌"
   진짜로 배우는 아주 작은 AI예요. 선생님(아이)이 보여 준 예시를 기억해 두었다가,
   처음 보는 말랑몬이 나오면 "기억 속에서 가장 닮은 친구"를 찾아 타입을 맞혀요.
   (머신러닝의 k-최근접 이웃 방식) */
(function (root) {
  'use strict';

  var TYPES = ['fire', 'water', 'grass'];

  // 타입마다 몸 색(색상환 각도)의 범위. clear = 수업용(뚜렷함), wild = 야생(다양함)
  var HUE = {
    fire: { clear: [4, 36], wild: [-16, 54] },
    water: { clear: [196, 230], wild: [176, 250] },
    grass: { clear: [100, 138], wild: [72, 160] }
  };

  // 씨앗이 같으면 늘 같은 순서로 나오는 난수 (똑똑함 시험지를 고정하려고)
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  var uid = 0;

  /* 말랑몬 한 마리의 생김새를 만든다.
     opts.type  : 정해 주면 그 타입
     opts.shape : 0~2 (몸 모양 = 종)
     opts.mode  : 'clear'(수업용) | 'wild'(야생) */
  function makeMonster(r, opts) {
    opts = opts || {};
    var type = opts.type || pick(r, TYPES);
    var t = TYPES.indexOf(type);
    var mode = opts.mode || 'wild';
    var range = HUE[type][mode];
    var hue = range[0] + r() * (range[1] - range[0]);
    var head = t, tail = t;
    if (mode === 'wild') {
      // 야생 말랑몬은 색이나 꼬리가 다른 타입처럼 생기기도 해요.
      // 하지만 머리 장식만은 언제나 진짜 타입을 알려 줘요. (사람은 머리를 보면 알 수 있음)
      if (r() < 0.38) {
        var other = HUE[TYPES[(t + 1 + Math.floor(r() * 2)) % 3]].wild;
        hue = other[0] + r() * (other[1] - other[0]);
      }
      if (r() < 0.4) tail = (t + 1 + Math.floor(r() * 2)) % 3;
    }
    return {
      id: 'm' + Date.now().toString(36) + (uid++),
      type: type,
      shape: opts.shape != null ? opts.shape : Math.floor(r() * 3),
      hue: Math.round((hue + 360) % 360),
      head: head,
      tail: tail,
      eyes: Math.floor(r() * 3)
    };
  }

  function hueDiff(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  /* 생김새를 이루는 세 가지 단서. 각각 "얼마나 다른지"를 0 이상의 숫자로 알려 준다 */
  var CUES = {
    hue: function (a, b) { return hueDiff(a.hue, b.hue) / 60; },
    head: function (a, b) { return a.head !== b.head ? 1 : 0; },
    tail: function (a, b) { return a.tail !== b.tail ? 1 : 0; }
  };
  var CUE_NAMES = ['hue', 'head', 'tail'];

  /* 어떤 단서를 얼마나 믿을지 스스로 정한다.
     방법: 기억 속 친구를 한 마리씩 가리고, "이 단서 하나만 보고도 타입을 맞힐 수 있나?" 시험해 본다.
     잘 맞히는 단서일수록 크게 믿는다. 예시가 적을 때는 아직 확신이 없어서 셋을 비슷하게 믿는다.
     (그래서 예시를 많이 볼수록 "색보다 머리 장식이 중요하구나!"를 알아챈다) */
  function weights(memory) {
    var n = memory ? memory.length : 0, w = {};
    CUE_NAMES.forEach(function (f) {
      var ok = 0, tot = 0;
      for (var i = 0; i < n; i++) {
        var best = Infinity, votes = {}, tv = 0;
        for (var j = 0; j < n; j++) {
          if (i === j) continue;
          var d = CUES[f](memory[i], memory[j]);
          if (d < best - 1e-9) { best = d; votes = {}; votes[memory[j].type] = 1; tv = 1; }
          else if (Math.abs(d - best) < 1e-9) { votes[memory[j].type] = (votes[memory[j].type] || 0) + 1; tv++; }
        }
        if (tv) { ok += (votes[memory[i].type] || 0) / tv; tot++; }
      }
      var acc = tot ? ok / tot : 1 / 3;
      var trust = Math.max(0, (acc - 1 / 3) / (2 / 3));
      var careful = (trust * n + 0.5 * 45) / (n + 45); // 예시가 적으면 0.5 근처에 머문다
      w[f] = careful * careful;
    });
    return w;
  }

  // 두 말랑몬이 얼마나 다르게 생겼는지 (작을수록 닮음)
  function distance(a, b, w) {
    return w.hue * CUES.hue(a, b) + w.head * CUES.head(a, b) + w.tail * CUES.tail(a, b);
  }

  /* 기억(memory)을 보고 타입을 맞힌다.
     돌려주는 값: { ranked:[타입...], nearest:가장 닮은 기억 } / 기억이 없으면 null */
  function guess(memory, m, w) {
    if (!memory || !memory.length) return null;
    w = w || weights(memory);
    var ds = memory.map(function (ex) { return { ex: ex, d: distance(ex, m, w) }; });
    ds.sort(function (x, y) { return x.d - y.d; });
    var k = Math.min(3, ds.length);
    var votes = { fire: 0, water: 0, grass: 0 };
    for (var i = 0; i < k; i++) votes[ds[i].ex.type] += 1 / (ds[i].d + 0.2);
    var ranked = TYPES.slice().sort(function (x, y) { return votes[y] - votes[x]; });
    var nearest = null;
    for (var j = 0; j < ds.length; j++) if (ds[j].ex.type === ranked[0]) { nearest = ds[j].ex; break; }
    return { ranked: ranked, nearest: nearest, votes: votes, weights: w };
  }

  // 똑똑함 = 늘 같은 시험지(야생 말랑몬 150마리)에서 몇 %나 맞히는지
  var examSheet = null;
  function smartness(memory) {
    if (!memory || !memory.length) return 0;
    if (!examSheet) {
      var r = rng(20261115);
      examSheet = [];
      for (var i = 0; i < 150; i++) examSheet.push(makeMonster(r, { type: TYPES[i % 3], mode: 'wild' }));
    }
    var w = weights(memory), ok = 0;
    for (var j = 0; j < examSheet.length; j++) {
      if (guess(memory, examSheet[j], w).ranked[0] === examSheet[j].type) ok++;
    }
    return Math.round((ok / examSheet.length) * 100);
  }

  // 짝꿍이 "머리 장식이 제일 중요해!"를 알아챘는지
  function knowsHeadMatters(memory) {
    if (!memory || memory.length < 9) return false;
    var w = weights(memory);
    return w.head > w.hue * 1.5 && w.head > w.tail * 1.5;
  }

  // 어떤 공격이 어떤 타입에 딱 맞는지: 불은 물로, 물은 풀로, 풀은 불로
  var COUNTER = { fire: 'water', water: 'grass', grass: 'fire' };

  var api = {
    TYPES: TYPES, HUE: HUE, COUNTER: COUNTER,
    rng: rng, pick: pick, makeMonster: makeMonster,
    weights: weights, distance: distance, guess: guess, smartness: smartness, knowsHeadMatters: knowsHeadMatters
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MMBrain = api;
})(typeof window !== 'undefined' ? window : globalThis);
