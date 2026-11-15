/* 말랑몬 선생님 — 사람 그림
   주인공 아이와 동네 이웃을 같은 방식으로 그려요.
   얼굴(홍채·속눈썹·눈썹·볼), 머리카락(뒷머리·앞머리·윤기), 옷(종류별 디테일), 모자, 손에 든 물건을 조합해요.
   어른은 몸통과 다리를 길게, 어르신은 흰머리와 주름을 더해요. */
(function (root) {
  'use strict';
  var A = root.MMArt, INK = A.INK;

  var SKIN = [{ f: '#ffe2c8', s: '#f2bf9b' }, { f: '#f7cba4', s: '#e0a57a' }, { f: '#dcaa80', s: '#bb855c' }];
  var HAIR = [{ f: '#2b2330', l: '#63566f' }, { f: '#4a3226', l: '#80604c' }, { f: '#8a5530', l: '#c08c58' }, { f: '#aaa4b5', l: '#dedae6' }, { f: '#efece6', l: '#ffffff' }];
  var COLORS = ['#ff5a5a', '#3fa9f5', '#52c443', '#ffb629', '#8a5cf6', '#39445e', '#ff8fb3', '#ffffff', '#2a9d8f', '#e07a3f'];
  var WEAR = ['t', 'hood', 'overall', 'stripe', 'vest', 'jersey'];
  var HATS = ['none', 'cap', 'explorer', 'beanie'];
  var HAIR_COUNT = 8;

  function col(c) { return typeof c === 'number' ? (COLORS[c] || COLORS[0]) : (c || COLORS[0]); }
  function shadeOf(hex, k) { // 같은 색의 조금 어두운 톤
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    k = k || 0.78;
    return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')';
  }
  function mir(s) { return '<g transform="translate(140 0) scale(-1 1)">' + s + '</g>'; }

  /* ---------- 머리카락: 뒷머리(back) / 앞머리(front) ---------- */
  function hairOf(style, h, tie) {
    var o = 'fill="' + h.f + '" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"';
    var back = '', front = '';
    var bowl = 'M27 64 C19 28 46 5 70 5 C94 5 121 28 113 64 C113 54 110 48 104 44 Q70 53 36 44 C30 48 27 54 27 64 Z';
    var side = 'M27 62 C21 28 46 5 72 6 C98 7 119 30 113 62 C108 48 100 38 88 34 C74 47 50 51 34 42 C30 48 28 54 27 62 Z';
    if (style === 0) { // 삐죽 머리
      back = '<path d="M38 24 L43 3 L57 14 L68 -3 L81 13 L95 3 L101 25 Z" ' + o + '/>';
      front = '<path d="M27 62 C21 30 46 7 72 8 C98 8 119 30 113 62 C109 52 104 44 98 38 L95 51 L86 35 L79 49 L70 33 L62 49 L54 36 L46 51 L42 39 C36 45 31 52 27 62 Z" ' + o + '/>';
    } else if (style === 1) { // 바가지 머리
      front = '<path d="' + bowl + '" ' + o + '/>';
    } else if (style === 2) { // 옆가르마
      front = '<path d="' + side + '" ' + o + '/>';
    } else if (style === 3) { // 짧은 머리
      front = '<path d="M29 52 C29 24 50 11 70 11 C90 11 111 24 111 52 C105 35 90 27 70 27 C50 27 35 35 29 52 Z" ' + o + '/>';
    } else if (style === 4) { // 긴 생머리
      back = '<path d="M24 60 C17 26 46 3 70 3 C94 3 123 26 116 60 L121 124 C104 132 36 132 19 124 Z" ' + o + '/>';
      front = '<path d="' + side + '" ' + o + '/><path d="M27 58 C23 78 25 94 29 106 L38 102 C34 88 34 74 36 60 Z M113 58 C117 78 115 94 111 106 L102 102 C106 88 106 74 104 60 Z" ' + o + '/>';
    } else if (style === 5) { // 양갈래
      back = '<path d="M27 50 C7 52 0 82 12 108 C22 98 30 84 32 64 Z" ' + o + '/>' + mir('<path d="M27 50 C7 52 0 82 12 108 C22 98 30 84 32 64 Z" ' + o + '/>') +
        '<circle cx="25" cy="54" r="6.5" fill="' + tie + '" stroke="' + INK + '" stroke-width="3"/><circle cx="115" cy="54" r="6.5" fill="' + tie + '" stroke="' + INK + '" stroke-width="3"/>';
      front = '<path d="M27 64 C19 28 46 5 70 5 C94 5 121 28 113 64 C113 54 110 48 104 44 Q88 52 72 40 Q54 52 36 44 C30 48 27 54 27 64 Z" ' + o + '/>';
    } else if (style === 6) { // 포니테일
      back = '<path d="M98 22 C126 14 140 44 126 80 C120 64 112 52 100 44 Z" ' + o + '/><circle cx="102" cy="28" r="6.5" fill="' + tie + '" stroke="' + INK + '" stroke-width="3"/>';
      front = '<path d="' + side + '" ' + o + '/>';
    } else if (style === 7) { // 단발
      back = '<path d="M22 62 C15 26 46 3 70 3 C94 3 125 26 118 62 C121 82 116 96 108 102 L32 102 C24 96 19 82 22 62 Z" ' + o + '/>';
      front = '<path d="' + bowl + '" ' + o + '/>';
    } else if (style === 8) { // 뽀글 파마
      var cs = [[34, 38, 16], [50, 22, 17], [70, 15, 18], [90, 22, 17], [106, 38, 16], [27, 56, 13], [113, 56, 13]], a = '', b = '';
      cs.forEach(function (c) { a += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" ' + o + '/>'; b += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] - 1.6) + '" fill="' + h.f + '"/>'; });
      front = a + b;
    } else if (style === 9) { // 쪽진 머리 (할머니)
      back = '<circle cx="70" cy="6" r="15" ' + o + '/>';
      front = '<path d="M28 56 C26 26 48 10 70 10 C92 10 114 26 112 56 C106 38 92 30 70 34 C48 30 34 38 28 56 Z" ' + o + '/>';
    } else if (style === 10) { // 옆머리만 (할아버지)
      front = '<path d="M27 64 C22 50 26 38 34 32 C33 44 34 54 35 64 Z" ' + o + '/>' + mir('<path d="M27 64 C22 50 26 38 34 32 C33 44 34 54 35 64 Z" ' + o + '/>');
    }
    var shine = style === 10 || style === 8 ? '' : '<path d="M46 26 C56 17 72 14 88 19" fill="none" stroke="' + h.l + '" stroke-width="5" stroke-linecap="round" opacity=".55"/>';
    return { back: back, front: front + shine };
  }

  function hatOf(kind, c) {
    var o = 'stroke="' + INK + '" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"';
    if (kind === 'cap') {
      return '<path d="M26 46 C26 18 48 3 70 3 C92 3 114 18 114 46 Z" fill="' + c + '" ' + o + '/>' +
        '<path d="M22 44 Q70 29 124 50 C124 58 118 60 112 58 Q70 44 24 52 Z" fill="' + shadeOf(c, 0.86) + '" ' + o + '/>' +
        '<path d="M44 20 C54 12 68 9 80 11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/><circle cx="70" cy="4" r="4.5" fill="#fff" stroke="' + INK + '" stroke-width="3"/>';
    }
    if (kind === 'explorer') {
      return '<ellipse cx="70" cy="42" rx="58" ry="12" fill="#d9b06a" ' + o + '/><path d="M38 40 C38 9 102 9 102 40 Z" fill="#ecca8a" ' + o + '/>' +
        '<path d="M39 34 Q70 43 101 34 L101 40 Q70 49 39 40 Z" fill="#8a5a3a"/><path d="M50 20 C58 14 68 12 78 13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>';
    }
    if (kind === 'straw') {
      return '<ellipse cx="70" cy="44" rx="66" ry="13" fill="#f2d16b" ' + o + '/><path d="M36 42 C36 8 104 8 104 42 Z" fill="#f7dd86" ' + o + '/>' +
        '<path d="M37 35 Q70 45 103 35 L103 41 Q70 51 37 41 Z" fill="#ff5a5a"/><path d="M14 46 C40 54 100 54 126 46 M48 16 L54 34 M70 10 L70 36 M92 16 L86 34" fill="none" stroke="#c9a23e" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>';
    }
    if (kind === 'guard') {
      return '<path d="M30 42 L110 42 L109 28 C96 8 44 8 31 28 Z" fill="#2c3a63" ' + o + '/><path d="M30 42 Q70 56 110 42 L112 48 Q70 66 28 48 Z" fill="#1b2340" ' + o + '/>' +
        '<path d="M32 36 L108 36" stroke="#ffd84a" stroke-width="4"/><path transform="translate(70 25) scale(.62)" d="' + A.STAR + '" fill="#ffd84a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>';
    }
    if (kind === 'helmet') {
      return '<path d="M28 46 C28 10 112 10 112 46 Z" fill="' + c + '" ' + o + '/><rect x="20" y="42" width="100" height="10" rx="5" fill="' + shadeOf(c, 0.86) + '" ' + o + '/>' +
        '<path d="M64 12 L64 42 M76 12 L76 42" stroke="' + INK + '" stroke-width="2.6" opacity=".35"/><path d="M42 26 C48 18 56 15 62 15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
    }
    if (kind === 'beanie') {
      return '<path d="M28 46 C26 14 50 2 70 2 C90 2 114 14 112 46 Z" fill="' + c + '" ' + o + '/><rect x="25" y="38" width="90" height="14" rx="7" fill="' + shadeOf(c, 0.84) + '" ' + o + '/>' +
        '<circle cx="70" cy="2" r="9" fill="#fff" ' + o + '/><path d="M40 40 L40 50 M52 40 L52 50 M64 40 L64 50 M76 40 L76 50 M88 40 L88 50 M100 40 L100 50" stroke="' + INK + '" stroke-width="2" opacity=".3"/>';
    }
    if (kind === 'captain') {
      return '<path d="M30 40 C26 22 46 6 70 6 C94 6 114 22 110 40 Z" fill="#fff" ' + o + '/><path d="M30 40 L110 40 L110 48 L30 48 Z" fill="#2c3a63" ' + o + '/><path d="M30 48 Q70 60 110 48 L112 54 Q70 70 28 54 Z" fill="#1b2340" ' + o + '/>' +
        '<circle cx="70" cy="26" r="7" fill="#ffd84a" stroke="' + INK + '" stroke-width="3"/>';
    }
    if (kind === 'diver') { // 해녀: 까만 머릿수건과 물안경
      return '<path d="M25 68 C17 28 46 4 70 4 C94 4 123 28 115 68 C111 46 97 33 70 33 C43 33 29 46 25 68 Z" fill="#2f2b3a" ' + o + '/>' +
        '<path d="M30 36 L110 36" stroke="#111" stroke-width="7" stroke-linecap="round"/><rect x="40" y="22" width="60" height="24" rx="12" fill="#bfeaff" stroke="' + INK + '" stroke-width="3.6"/><path d="M48 30 C52 26 58 25 62 26" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>';
    }
    if (kind === 'band') {
      return '<path d="M29 44 Q70 30 111 44 L111 52 Q70 38 29 52 Z" fill="' + c + '" ' + o + '/>';
    }
    return '';
  }

  // 손에 든 물건 (오른손 근처에서 시작)
  function itemOf(kind, hx, hy) {
    var o = 'stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"';
    var g = '<g transform="translate(' + hx + ' ' + hy + ')">';
    if (kind === 'net') return g + '<path d="M0 8 L16 -74" stroke="#a9794d" stroke-width="5" stroke-linecap="round"/><ellipse cx="22" cy="-92" rx="20" ry="16" fill="#fff" fill-opacity=".55" ' + o + '/><path d="M6 -92 L38 -92 M22 -106 L22 -78 M10 -102 L34 -82 M34 -102 L10 -82" stroke="' + INK + '" stroke-width="1.6" opacity=".4"/></g>';
    if (kind === 'rod') return g + '<path d="M0 10 L44 -96" stroke="#7a4a2a" stroke-width="4.5" stroke-linecap="round"/><path d="M44 -96 C52 -70 50 -40 48 -16" fill="none" stroke="' + INK + '" stroke-width="1.8"/><path d="M48 -16 l-5 8 l10 0 Z" fill="#ff5a5a" stroke="' + INK + '" stroke-width="2"/></g>';
    if (kind === 'book') return g + '<rect x="-6" y="-18" width="26" height="30" rx="4" fill="#3fa9f5" ' + o + '/><path d="M0 -10 L14 -10 M0 -3 L14 -3" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>';
    if (kind === 'basket') return g + '<g fill="#ff9a2e" stroke="#c2611a" stroke-width="2.4"><circle cx="2" cy="-6" r="8"/><circle cx="16" cy="-9" r="8"/><circle cx="9" cy="-15" r="8"/></g><path d="M-10 -4 L28 -4 L23 18 L-5 18 Z" fill="#c98d4f" ' + o + '/><path d="M-8 4 L26 4 M-6 11 L24 11" stroke="' + INK + '" stroke-width="2" opacity=".35"/></g>';
    if (kind === 'lens') return g + '<path d="M2 6 L14 -14" stroke="#7a4a2a" stroke-width="6" stroke-linecap="round"/><circle cx="20" cy="-26" r="15" fill="#cfeeff" fill-opacity=".7" ' + o + '/><path d="M12 -32 C15 -36 20 -38 24 -37" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>';
    if (kind === 'float') return g + '<circle cx="12" cy="2" r="18" fill="#ff8a3c" ' + o + '/><path d="M-4 2 L28 2 M12 -14 L12 18" stroke="' + INK + '" stroke-width="2.4" opacity=".4"/><path d="M2 -8 C6 -12 10 -13 14 -13" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/></g>';
    if (kind === 'brush') return g + '<path d="M2 8 L12 -40" stroke="#a9794d" stroke-width="5" stroke-linecap="round"/><path d="M8 -40 L18 -38 L16 -56 C14 -62 10 -60 9 -54 Z" fill="#ff5a5a" ' + o + '/></g>';
    if (kind === 'box') return g + '<rect x="-14" y="-22" width="40" height="34" rx="4" fill="#d9a066" ' + o + '/><path d="M6 -22 L6 12 M-14 -8 L26 -8" stroke="#a9794d" stroke-width="5"/></g>';
    if (kind === 'ball') return g + '<circle cx="10" cy="4" r="14" fill="#fff" ' + o + '/><path d="M10 -3 L16 2 L14 9 L6 9 L4 2 Z" fill="' + INK + '"/></g>';
    if (kind === 'bag') return g + '<path d="M-10 -6 L26 -6 L30 22 L-14 22 Z" fill="#fff" ' + o + '/><path d="M0 -6 C0 -22 16 -22 16 -6" fill="none" ' + o + '/><path d="M-4 6 L20 6" stroke="#52c443" stroke-width="5" stroke-linecap="round"/></g>';
    return '';
  }

  /* ---------- 사람 한 명 ---------- */
  function person(look, opts) {
    opts = opts || {};
    var L = look || {};
    var adult = L.age === 'adult' || L.age === 'elder', elder = L.age === 'elder';
    var T = adult ? 14 : 0, G = adult ? 22 : 0;
    var sk = SKIN[L.skin || 0] || SKIN[0], hr = HAIR[L.hairColor || 0] || HAIR[0];
    var fit = col(L.outfit), fitS = shadeOf(fit.charAt(0) === '#' ? fit : '#888888', 0.8);
    var pants = L.pants || '#39445e', shoe = L.shoe || '#ffffff';
    var wear = typeof L.wear === 'number' ? WEAR[L.wear] : (L.wear || 't');
    var hat = typeof L.hat === 'number' ? HATS[L.hat] : (L.hat || 'none');
    var ty = 100, hem = ty + 48 + T, legTop = hem - 5, foot = legTop + 36 + G, H = foot + 22;
    var o = 'stroke="' + INK + '" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"';
    var thin = 'stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
    var happy = opts.expr === 'happy' || (elder && opts.expr !== 'normal');

    /* 다리와 신발 */
    function leg(x, cls) {
      var s = '<g class="leg ' + cls + '">';
      if (L.shorts) {
        s += '<rect x="' + (x + 1.5) + '" y="' + legTop + '" width="12" height="' + (foot - legTop) + '" rx="6" fill="' + sk.f + '" ' + o + '/>' +
          '<rect x="' + (x - 1) + '" y="' + legTop + '" width="17" height="' + (18 + G * 0.4) + '" rx="5" fill="' + pants + '" ' + o + '/>';
      } else {
        s += '<rect x="' + x + '" y="' + legTop + '" width="15" height="' + (foot - legTop) + '" rx="6" fill="' + pants + '" ' + o + '/>';
      }
      s += '<path d="M' + (x - 5) + ' ' + (foot + 3) + ' C' + (x - 5) + ' ' + (foot - 6) + ' ' + (x + 18) + ' ' + (foot - 6) + ' ' + (x + 18) + ' ' + (foot + 3) + ' L' + (x + 18) + ' ' + (foot + 8) + ' C' + (x + 18) + ' ' + (foot + 11) + ' ' + (x - 5) + ' ' + (foot + 11) + ' ' + (x - 5) + ' ' + (foot + 8) + ' Z" fill="' + shoe + '" ' + o + '/>' +
        '<path d="M' + (x - 3) + ' ' + (foot + 7) + ' L' + (x + 16) + ' ' + (foot + 7) + '" stroke="' + INK + '" stroke-width="2" opacity=".25"/>';
      return s + '</g>';
    }

    /* 팔 */
    var sleeve = wear === 'vest' || wear === 'apron' || wear === 'overall' ? (L.shirt || '#ffffff') : wear === 'coat' ? '#ffffff' : fit;
    var shortSleeve = wear === 't' || wear === 'stripe' || wear === 'jersey';
    var armLen = 31 + T * 0.7;
    function arm(x, cls) {
      var s = '<g class="arm ' + cls + '">';
      if (shortSleeve) s += '<rect x="' + (x + 1.5) + '" y="' + (ty + 10) + '" width="12" height="' + (armLen - 8) + '" rx="6" fill="' + sk.f + '" ' + o + '/>';
      s += '<rect x="' + x + '" y="' + (ty + 2) + '" width="15" height="' + (shortSleeve ? 17 : armLen) + '" rx="7" fill="' + sleeve + '" ' + o + '/>' +
        '<circle cx="' + (x + 7.5) + '" cy="' + (ty + 4 + armLen) + '" r="7.2" fill="' + sk.f + '" ' + o + '/>';
      return s + '</g>';
    }

    /* 몸통과 옷 */
    var torsoD = 'M45 ' + (ty + 5) + ' C52 ' + (ty - 2) + ' 88 ' + (ty - 2) + ' 95 ' + (ty + 5) + ' L99 ' + (hem - 4) + ' C86 ' + (hem + 3) + ' 54 ' + (hem + 3) + ' 41 ' + (hem - 4) + ' Z';
    var base = wear === 'vest' || wear === 'apron' || wear === 'overall' || wear === 'coat' ? (L.shirt || '#ffffff') : fit;
    var torso = '<path d="' + torsoD + '" fill="' + base + '" ' + o + '/>';
    var star = '<path transform="translate(70 ' + (ty + 26) + ') scale(.66)" d="' + A.STAR + '" fill="#ffd84a" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>';
    if (wear === 't') {
      torso += '<path d="M59 ' + (ty + 1) + ' Q70 ' + (ty + 11) + ' 81 ' + (ty + 1) + '" fill="none" ' + thin + '/>' + star +
        '<path d="M44 ' + (hem - 8) + ' C56 ' + (hem - 2) + ' 84 ' + (hem - 2) + ' 96 ' + (hem - 8) + '" fill="none" stroke="' + fitS + '" stroke-width="4" stroke-linecap="round"/>';
    } else if (wear === 'stripe') {
      torso += '<path d="M45 ' + (ty + 20) + ' L95 ' + (ty + 20) + ' M44 ' + (ty + 33) + ' L96 ' + (ty + 33) + '" stroke="#fff" stroke-width="6" opacity=".9"/><path d="M59 ' + (ty + 1) + ' Q70 ' + (ty + 11) + ' 81 ' + (ty + 1) + '" fill="none" ' + thin + '/>';
    } else if (wear === 'jersey') {
      torso += '<path d="M47 ' + (ty + 6) + ' L44 ' + (hem - 5) + ' M93 ' + (ty + 6) + ' L96 ' + (hem - 5) + '" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M60 ' + (ty + 1) + ' L70 ' + (ty + 12) + ' L80 ' + (ty + 1) + '" fill="none" ' + thin + '/><text x="70" y="' + (ty + 36) + '" text-anchor="middle" font-size="19" fill="#fff" font-family="Jua, sans-serif">7</text>';
    } else if (wear === 'hood') {
      torso = '<path d="M50 ' + (ty + 6) + ' C48 ' + (ty - 12) + ' 92 ' + (ty - 12) + ' 90 ' + (ty + 6) + ' C82 ' + (ty + 14) + ' 58 ' + (ty + 14) + ' 50 ' + (ty + 6) + ' Z" fill="' + fitS + '" ' + o + '/>' + torso +
        '<path d="M55 ' + (hem - 20) + ' L85 ' + (hem - 20) + ' L89 ' + (hem - 5) + ' L51 ' + (hem - 5) + ' Z" fill="' + fitS + '" ' + thin + '/>' +
        '<path d="M63 ' + (ty + 6) + ' L62 ' + (ty + 20) + ' M77 ' + (ty + 6) + ' L78 ' + (ty + 20) + '" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M58 ' + (ty + 2) + ' Q70 ' + (ty + 12) + ' 82 ' + (ty + 2) + '" fill="none" ' + thin + '/>';
    } else if (wear === 'overall') {
      torso += '<path d="M54 ' + (ty + 17) + ' L86 ' + (ty + 17) + ' L97 ' + (hem - 4) + ' C86 ' + (hem + 3) + ' 54 ' + (hem + 3) + ' 43 ' + (hem - 4) + ' Z" fill="' + fit + '" ' + o + '/>' +
        '<path d="M55 ' + (ty + 18) + ' L50 ' + (ty + 2) + ' M85 ' + (ty + 18) + ' L90 ' + (ty + 2) + '" stroke="' + fit + '" stroke-width="7" stroke-linecap="round"/><path d="M55 ' + (ty + 18) + ' L50 ' + (ty + 2) + ' M85 ' + (ty + 18) + ' L90 ' + (ty + 2) + '" stroke="' + INK + '" stroke-width="1.6" opacity=".35"/>' +
        '<circle cx="57" cy="' + (ty + 22) + '" r="3.2" fill="#ffd84a" stroke="' + INK + '" stroke-width="2"/><circle cx="83" cy="' + (ty + 22) + '" r="3.2" fill="#ffd84a" stroke="' + INK + '" stroke-width="2"/>' +
        '<rect x="61" y="' + (ty + 28) + '" width="18" height="13" rx="3" fill="' + fitS + '" ' + thin + '/>';
    } else if (wear === 'vest') {
      var v = '<path d="M45 ' + (ty + 5) + ' C50 ' + (ty + 1) + ' 58 ' + ty + ' 64 ' + ty + ' L67 ' + (hem - 1) + ' C58 ' + (hem + 1) + ' 48 ' + (hem - 1) + ' 41 ' + (hem - 4) + ' Z" fill="' + fit + '" ' + o + '/><rect x="48" y="' + (ty + 26) + '" width="13" height="11" rx="2.5" fill="' + fitS + '" ' + thin + '/>';
      torso += v + mir(v);
    } else if (wear === 'apron') {
      torso += '<path d="M58 ' + (ty + 2) + ' L54 ' + (ty + 16) + ' M82 ' + (ty + 2) + ' L86 ' + (ty + 16) + '" stroke="' + fit + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M52 ' + (ty + 14) + ' L88 ' + (ty + 14) + ' L96 ' + (hem + 2) + ' C84 ' + (hem + 8) + ' 56 ' + (hem + 8) + ' 44 ' + (hem + 2) + ' Z" fill="' + fit + '" ' + o + '/><rect x="59" y="' + (ty + 30) + '" width="22" height="14" rx="3" fill="' + fitS + '" ' + thin + '/>';
    } else if (wear === 'coat') {
      var c = '<path d="M45 ' + (ty + 5) + ' C50 ' + (ty + 1) + ' 58 ' + ty + ' 63 ' + ty + ' L66 ' + (hem + 6) + ' C56 ' + (hem + 8) + ' 46 ' + (hem + 6) + ' 39 ' + (hem + 2) + ' Z" fill="#ffffff" ' + o + '/><path d="M63 ' + ty + ' L56 ' + (ty + 16) + ' L65 ' + (ty + 22) + '" fill="#f1eef6" ' + thin + '/>';
      torso = '<path d="' + torsoD + '" fill="' + fit + '" ' + o + '/>' + c + mir(c) + '<circle cx="66" cy="' + (ty + 34) + '" r="2.4" fill="' + INK + '"/><rect x="76" y="' + (ty + 24) + '" width="11" height="9" rx="2" fill="#f1eef6" ' + thin + '/>';
    } else if (wear === 'uniform') {
      torso += '<path d="M60 ' + ty + ' L70 ' + (ty + 18) + ' L80 ' + ty + ' Z" fill="#cfe4ff" ' + thin + '/><path d="M70 ' + (ty + 18) + ' L70 ' + (hem - 4) + '" stroke="' + INK + '" stroke-width="2" opacity=".4"/>' +
        '<rect x="42" y="' + (hem - 14) + '" width="56" height="7" fill="#1b2340"/><rect x="65" y="' + (hem - 15) + '" width="10" height="9" rx="2" fill="#ffd84a" stroke="' + INK + '" stroke-width="2"/>' +
        '<path transform="translate(84 ' + (ty + 20) + ') scale(.45)" d="' + A.STAR + '" fill="#ffd84a" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>';
    } else if (wear === 'wetsuit') {
      torso += '<path d="M70 ' + (ty + 2) + ' L70 ' + (hem - 2) + '" stroke="#8a8598" stroke-width="2.6"/><path d="M47 ' + (ty + 16) + ' Q70 ' + (ty + 24) + ' 93 ' + (ty + 16) + '" fill="none" stroke="#ff8a3c" stroke-width="4" stroke-linecap="round"/>';
    } else if (wear === 'cardigan') {
      torso = '<path d="' + torsoD + '" fill="' + (L.shirt || '#ffffff') + '" ' + o + '/>';
      var cg = '<path d="M45 ' + (ty + 5) + ' C50 ' + (ty + 1) + ' 56 ' + ty + ' 60 ' + ty + ' L67 ' + (ty + 22) + ' L67 ' + (hem - 1) + ' C58 ' + (hem + 1) + ' 48 ' + (hem - 1) + ' 41 ' + (hem - 4) + ' Z" fill="' + fit + '" ' + o + '/>';
      torso += cg + mir(cg) + '<circle cx="70" cy="' + (ty + 30) + '" r="2.6" fill="#ffd84a" stroke="' + INK + '" stroke-width="1.6"/><circle cx="70" cy="' + (ty + 41) + '" r="2.6" fill="#ffd84a" stroke="' + INK + '" stroke-width="1.6"/>';
    }

    /* 얼굴 */
    var iris = L.iris || '#6b4428';
    function eye(x) {
      if (happy) return '<path d="M' + (x - 9) + ' 67 Q' + x + ' 57 ' + (x + 9) + ' 67" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>';
      return '<ellipse cx="' + x + '" cy="65.5" rx="8.6" ry="' + (adult ? 9 : 10.2) + '" fill="#fff"/>' +
        '<circle cx="' + (x + 0.4) + '" cy="66.5" r="6.5" fill="' + iris + '"/><circle cx="' + (x + 0.4) + '" cy="67" r="3.3" fill="' + INK + '"/>' +
        '<circle cx="' + (x - 2.4) + '" cy="63" r="2.5" fill="#fff"/><circle cx="' + (x + 3) + '" cy="69.6" r="1.2" fill="#fff" opacity=".85"/>' +
        '<path d="M' + (x - 9.6) + ' 61 Q' + x + ' 52.5 ' + (x + 9.6) + ' 61" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
        (L.lash ? '<path d="M' + (x < 70 ? x - 9.6 : x + 9.6) + ' 61 l' + (x < 70 ? -4 : 4) + ' -3" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' : '');
    }
    var browC = elder ? '#8d8799' : hr.f;
    var brows = '<path d="M42 ' + (happy ? 51 : 49.5) + ' Q52 45 61 49.5 M79 49.5 Q88 45 98 ' + (happy ? 51 : 49.5) + '" fill="none" stroke="' + browC + '" stroke-width="3.2" stroke-linecap="round"/>';
    var my = L.beard ? 3 : 0;
    var mouth = happy ? '<path d="M61 ' + (79 + my) + ' Q70 ' + (93 + my) + ' 79 ' + (79 + my) + ' Z" fill="#8a2f45" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/><path d="M65 ' + (85 + my) + ' Q70 ' + (88 + my) + ' 75 ' + (85 + my) + '" fill="none" stroke="#ff8fa3" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M62 ' + (80 + my) + ' Q70 ' + (87 + my) + ' 78 ' + (80 + my) + '" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    var beard = L.beard ? '<path d="M57 80 C61 75 67 76 70 80 C73 76 79 75 83 80 C79 85 73 84 70 82 C67 84 61 85 57 80 Z" fill="' + hr.f + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' : '';
    var wrinkle = elder ? '<path d="M37 71 l5 2 M103 71 l-5 2 M60 44 Q70 41 80 44" fill="none" stroke="' + sk.s + '" stroke-width="2.6" stroke-linecap="round"/>' : '';
    var glasses = L.glasses ? '<circle cx="52" cy="66" r="12.5" fill="#fff" fill-opacity=".22" stroke="' + INK + '" stroke-width="3"/><circle cx="88" cy="66" r="12.5" fill="#fff" fill-opacity=".22" stroke="' + INK + '" stroke-width="3"/><path d="M64.5 65 L75.5 65 M39.5 64 L31 60 M100.5 64 L109 60" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' : '';

    var hair = hat === 'diver' ? { back: '', front: '' } : hairOf(L.hair || 0, hr, L.tie || '#ff5a5a');
    if (hat !== 'none' && hat !== 'band' && (L.hair === 0 || L.hair === 9 || !L.hair)) hair.back = ''; // 모자 밖으로 튀어나오는 머리는 감춘다
    var hx = 99, hy = ty + 4 + armLen;

    return '<svg class="kid' + (adult ? ' grown' : '') + '" viewBox="0 0 140 ' + H + '" aria-hidden="true">' +
      '<ellipse cx="70" cy="' + (foot + 12) + '" rx="34" ry="6" fill="#000" opacity=".18"/>' +
      '<g class="kid-all">' + leg(50, 'leg-l') + leg(75, 'leg-r') +
      '<g class="kid-top">' + hair.back +
      (L.pack ? '<rect x="46" y="' + (ty + 4) + '" width="48" height="' + (36 + T) + '" rx="10" fill="' + L.pack + '" ' + o + '/>' : '') +
      (L.item ? itemOf(L.item, hx, hy) : '') +
      arm(31, 'arm-l') + arm(94, 'arm-r') +
      '<rect x="62" y="90" width="16" height="16" rx="5" fill="' + sk.s + '" ' + o + '/>' +
      torso +
      (L.pack ? '<path d="M52 ' + (ty + 3) + ' L55 ' + (ty + 30) + ' M88 ' + (ty + 3) + ' L85 ' + (ty + 30) + '" stroke="' + L.pack + '" stroke-width="6" stroke-linecap="round"/><path d="M52 ' + (ty + 3) + ' L55 ' + (ty + 30) + ' M88 ' + (ty + 3) + ' L85 ' + (ty + 30) + '" stroke="' + INK + '" stroke-width="1.6" opacity=".35"/>' : '') +
      '<ellipse cx="27" cy="63" rx="7" ry="8.5" fill="' + sk.f + '" ' + o + '/><ellipse cx="113" cy="63" rx="7" ry="8.5" fill="' + sk.f + '" ' + o + '/>' +
      '<path d="M27.5 60 C25 62 25.5 66 28 68 M112.5 60 C115 62 114.5 66 112 68" fill="none" stroke="' + sk.s + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M30 58 C30 30 48 15 70 15 C92 15 110 30 110 58 C110 83 94 99 70 99 C46 99 30 83 30 58 Z" fill="' + sk.f + '" ' + o + '/>' +
      '<path d="M36 78 C46 94 94 94 104 78 C98 91 86 96.5 70 96.5 C54 96.5 42 91 36 78 Z" fill="' + sk.s + '" opacity=".55"/>' +
      '<ellipse cx="41" cy="77" rx="7.5" ry="4.6" fill="#ff7d9c" opacity=".45"/><ellipse cx="99" cy="77" rx="7.5" ry="4.6" fill="#ff7d9c" opacity=".45"/>' +
      brows + '<g class="p-eyes">' + eye(52) + eye(88) + '</g>' +
      '<path d="M68.5 74 Q70 76 71.5 74" fill="none" stroke="' + sk.s + '" stroke-width="2.6" stroke-linecap="round"/>' +
      wrinkle + mouth + beard + hair.front + glasses + hatOf(hat, L.hatColor || fit) +
      '</g></g></svg>';
  }

  function defaultLook(i) {
    return { skin: 0, hair: i % 4, hairColor: 0, outfit: [1, 0, 2, 3][i % 4], wear: [0, 1, 3, 2][i % 4], hat: i % 2 ? 1 : 2, glasses: 0 };
  }
  // 주인공은 늘 가방을 메고 반바지를 입어요 (탐험가 느낌)
  function avatar(look, opts) {
    var o = {}; for (var k in look) o[k] = look[k];
    o.shorts = true; o.pack = '#8a5a3a'; o.shoe = '#ff5a5a';
    return person(o, opts);
  }

  /* ---------- 동네 이웃 18명 ---------- */
  var NPCS = [
    { id: 'guard', name: '경비 아저씨', look: { age: 'adult', skin: 1, hair: 3, wear: 'uniform', outfit: '#2c3a63', pants: '#1b2340', hat: 'guard', shoe: '#2d2440' } },
    { id: 'diver', name: '해녀 할머니', look: { age: 'elder', skin: 1, wear: 'wetsuit', outfit: '#2f2b3a', pants: '#2f2b3a', hat: 'diver', item: 'float', shoe: '#2f2b3a' } },
    { id: 'fisher', name: '낚시꾼 아저씨', look: { age: 'adult', skin: 2, hair: 3, hairColor: 0, wear: 'vest', outfit: '#8a9a5b', shirt: '#ffd88a', pants: '#6b5a44', hat: 'explorer', item: 'rod', beard: true } },
    { id: 'keeper', name: '등대지기 할아버지', look: { age: 'elder', skin: 0, hair: 10, hairColor: 4, wear: 'cardigan', outfit: '#2c3a63', shirt: '#ffffff', pants: '#39445e', hat: 'captain', beard: true } },
    { id: 'farmer', name: '귤밭 할아버지', look: { age: 'elder', skin: 2, hair: 10, hairColor: 3, wear: 'overall', outfit: '#3f7fbf', shirt: '#ffd88a', pants: '#3f7fbf', hat: 'straw', item: 'basket' } },
    { id: 'teacher', name: '놀이터 선생님', look: { age: 'adult', skin: 0, hair: 7, hairColor: 1, wear: 'cardigan', outfit: '#ff8fb3', shirt: '#ffffff', pants: '#39445e', glasses: 1, item: 'book', lash: true } },
    { id: 'bugdoc', name: '곤충 박사', look: { age: 'adult', skin: 0, hair: 2, hairColor: 1, wear: 'vest', outfit: '#52a04a', shirt: '#ffffff', pants: '#8a7a55', hat: 'explorer', glasses: 1, item: 'net' } },
    { id: 'dinodoc', name: '공룡 박사', look: { age: 'adult', skin: 1, hair: 0, hairColor: 0, wear: 'vest', outfit: '#c98d4f', shirt: '#fff3d6', pants: '#6b5a44', hat: 'helmet', hatColor: '#ffc93c', item: 'lens', beard: true } },
    { id: 'vet', name: '동물 박사', look: { age: 'adult', skin: 0, hair: 6, hairColor: 2, wear: 'coat', outfit: '#7fd0ff', pants: '#39445e', item: 'bag', lash: true } },
    { id: 'painter', name: '화가 누나', look: { age: 'adult', skin: 0, hair: 4, hairColor: 1, wear: 'apron', outfit: '#ffb629', shirt: '#ff8fb3', pants: '#39445e', hat: 'beanie', hatColor: '#8a5cf6', item: 'brush', lash: true } },
    { id: 'granny', name: '벤치 할머니', look: { age: 'elder', skin: 0, hair: 9, hairColor: 3, wear: 'cardigan', outfit: '#8a5cf6', shirt: '#fff3d6', pants: '#6b5a7a', glasses: 1 } },
    { id: 'jogger', name: '달리는 형', look: { age: 'adult', skin: 1, hair: 0, hairColor: 0, wear: 'jersey', outfit: '#ff5a5a', pants: '#2d2440', shorts: true, hat: 'band', hatColor: '#ffffff', shoe: '#3fa9f5' } },
    { id: 'shop', name: '슈퍼 아주머니', look: { age: 'adult', skin: 0, hair: 8, hairColor: 1, wear: 'apron', outfit: '#52c443', shirt: '#ffd88a', pants: '#39445e', lash: true } },
    { id: 'courier', name: '택배 아저씨', look: { age: 'adult', skin: 1, hair: 3, hairColor: 0, wear: 'vest', outfit: '#e07a3f', shirt: '#39445e', pants: '#39445e', hat: 'cap', hatColor: '#e07a3f', item: 'box' } },
    { id: 'mom', name: '아기 엄마', look: { age: 'adult', skin: 0, hair: 6, hairColor: 0, wear: 'hood', outfit: '#ffd88a', pants: '#3f7fbf', lash: true } },
    { id: 'kid1', name: '술래 친구', look: { skin: 0, hair: 5, hairColor: 0, wear: 'overall', outfit: '#ff8fb3', shirt: '#ffffff', pants: '#ff8fb3', shorts: true, lash: true, tie: '#ffd84a', shoe: '#ffd84a' } },
    { id: 'kid2', name: '그네 친구', look: { skin: 1, hair: 1, hairColor: 1, wear: 'stripe', outfit: '#2a9d8f', pants: '#39445e', shorts: true, glasses: 1, shoe: '#52c443' } },
    { id: 'kid3', name: '축구 친구', look: { skin: 2, hair: 0, hairColor: 0, wear: 'jersey', outfit: '#3fa9f5', pants: '#ffffff', shorts: true, item: 'ball', shoe: '#2d2440' } }
  ];

  A.person = person;
  A.avatar = avatar;
  A.defaultLook = defaultLook;
  A.NPCS = NPCS;
  A.LOOK = { SKIN: SKIN.map(function (s) { return s.f; }), HAIR: HAIR.slice(0, 3).map(function (h) { return h.f; }), OUTFIT: COLORS.slice(0, 6), WEAR: WEAR, HATS: HATS, HAIR_COUNT: HAIR_COUNT };
})(window);
