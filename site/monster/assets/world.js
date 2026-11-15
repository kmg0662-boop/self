/* 말랑몬 선생님 — 우리 동네 지도
   제주 바닷가 아파트 단지를 본떠 그린 동네예요. 위쪽이 바다(북쪽), 아래쪽이 한라산(남쪽).
   가운데는 7층 아파트 단지와 놀이터, 왼쪽은 귤밭과 큰 팽나무, 오른쪽은 공원과 연못, 아래는 오름이에요.
   (실제 배치도를 그대로 옮긴 것은 아니고 분위기를 살려 그렸어요) */
(function (root) {
  'use strict';
  var A = root.MMArt, INK = A.INK;
  var W = 2400, H = 1600;

  var BLOCKS = [
    { n: 201, x: 520, y: 670, c: '#ffb5a0' }, { n: 202, x: 1035, y: 670, c: '#ffd88a' }, { n: 203, x: 1550, y: 670, c: '#a8dba0' },
    { n: 205, x: 520, y: 970, c: '#9fd2f2', home: true }, { n: 206, x: 1550, y: 970, c: '#cdb4f5' },
    { n: 207, x: 520, y: 1270, c: '#a8dba0' }, { n: 208, x: 1035, y: 1270, c: '#ffb5a0' }, { n: 209, x: 1550, y: 1270, c: '#ffd88a' }
  ];
  var BW = 330, BH = 190;

  // 걸어서 못 지나가는 곳 (네모)
  var solids = BLOCKS.map(function (b) { return { x: b.x, y: b.y - BH + 46, w: BW, h: BH - 46 }; });
  solids.push({ x: 2040, y: 575, w: 260, h: 130 });   // 연못
  solids.push({ x: 1040, y: 770, w: 130, h: 70 });    // 말랑몬 학교 건물
  solids.push({ x: 150, y: 960, w: 150, h: 70 });     // 큰 팽나무 밑동
  var bounds = { x0: 40, y0: 238, x1: W - 40, y1: H - 46 };

  // 들어가면 무슨 일이 생기는 곳
  // 들어가면 무슨 일이 생기는 곳. out = 일을 마치고 다시 서 있을 자리
  var spots = {
    home: { x: 560, y: 1000, r: 46, out: [600, 1075] },
    school: { x: 1105, y: 872, r: 48, out: [1105, 950] },
    lair: {
      water: { x: 330, y: 262, r: 84, out: [330, 372] },
      fire: { x: 1850, y: 1478, r: 84, out: [1850, 1366] },
      grass: { x: 225, y: 1066, r: 84, out: [225, 1176] }
    }
  };
  var start = { x: 640, y: 1040 };

  // 야생 말랑몬이 돌아다니는 자리
  var wildHomes = [
    [900, 730], [1450, 730], [760, 1035], [1460, 1040], [1250, 1010], [250, 600], [300, 820], [2150, 880], [2180, 1100],
    [820, 395], [1620, 395], [600, 1450], [1300, 1470], [960, 262], [1500, 262], [2000, 1420], [1220, 1330]
  ];

  function ground() {
    var s = '<svg class="ground" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#8fd97a"/>';
    // 바다
    s += '<rect width="' + W + '" height="215" fill="#3fa9f5"/>';
    s += '<path class="wave" d="M-60 150 ' + wavy(-60, W + 60, 150, 60, 14) + ' L' + (W + 60) + ' 240 L-60 240 Z" fill="#6cc4ff"/>';
    s += '<path class="wave w2" d="M-60 186 ' + wavy(-60, W + 60, 186, 50, 10) + ' L' + (W + 60) + ' 250 L-60 250 Z" fill="#bfe9ff"/>';
    // 검은 현무암 바닷가와 모래
    s += '<path d="M0 214 ' + wavy(0, W, 214, 80, 9) + ' L' + W + ' 300 L0 300 Z" fill="#f2e3b6"/>';
    for (var i = 0; i < 46; i++) {
      var rx = (i * 173) % W, ry = 222 + (i * 37) % 50, rr = 10 + (i * 7) % 16;
      s += '<ellipse cx="' + rx + '" cy="' + ry + '" rx="' + rr + '" ry="' + (rr * 0.62) + '" fill="#4a4652"/><ellipse cx="' + (rx - 3) + '" cy="' + (ry - 2) + '" rx="' + (rr * 0.5) + '" ry="' + (rr * 0.25) + '" fill="#6a6674"/>';
    }
    // 방파제와 길
    s += '<rect x="1900" y="150" width="300" height="70" rx="12" fill="#b9bfcc" stroke="#7a8196" stroke-width="5"/>';
    s += road(0, 300, W, 62) + road(0, 1330, W, 62);
    // 귤밭 (서쪽)
    s += '<rect x="40" y="420" width="400" height="860" rx="40" fill="#72c463"/>';
    for (var r = 0; r < 9; r++) s += '<rect x="64" y="' + (452 + r * 92) + '" width="352" height="14" rx="7" fill="#5fae52" opacity=".55"/>';
    // 공원 (동쪽)
    s += '<rect x="1970" y="420" width="390" height="860" rx="40" fill="#a5e38f"/>';
    s += '<path d="M2040 1240 C2060 1000 2280 900 2280 720" fill="none" stroke="#f2e3b6" stroke-width="44" stroke-linecap="round"/>';
    s += '<ellipse cx="2170" cy="640" rx="150" ry="88" fill="#2a93e0" stroke="#e8f7ff" stroke-width="10"/><ellipse cx="2170" cy="636" rx="128" ry="70" fill="#4dbaf6"/>';
    s += '<path class="wave" d="M2090 630 q20 -12 40 0 t40 0 M2170 668 q20 -12 40 0 t40 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>';
    s += '<ellipse cx="2110" cy="676" rx="20" ry="11" fill="#52c443"/><ellipse cx="2236" cy="606" rx="16" ry="9" fill="#52c443"/><circle cx="2236" cy="602" r="6" fill="#ff8fb3"/>';
    // 아파트 단지 바닥
    s += '<rect x="470" y="440" width="1460" height="860" rx="46" fill="#efe6d2" stroke="#d9cdb2" stroke-width="6"/>';
    s += '<rect x="880" y="745" width="640" height="250" rx="40" fill="#f7d98a"/>';                 // 놀이터 모래
    s += '<rect x="880" y="745" width="640" height="250" rx="40" fill="none" stroke="#e2b95a" stroke-width="8" stroke-dasharray="2 22" stroke-linecap="round"/>';
    // 주차장 (남쪽 문 밖)
    s += '<rect x="960" y="1404" width="480" height="96" rx="14" fill="#c7ccd8"/>';
    for (var c = 0; c <= 6; c++) s += '<rect x="' + (975 + c * 75) + '" y="1412" width="5" height="80" fill="#fff"/>';
    // 오름과 현무암 지대 (남쪽)
    s += '<path d="M1500 1600 C1560 1450 1700 1396 1850 1396 C2010 1396 2140 1460 2200 1600 Z" fill="#7a5a4a"/>';
    s += '<path d="M1580 1600 C1630 1490 1740 1440 1850 1440 C1960 1440 2070 1490 2120 1600 Z" fill="#8f6a55"/>';
    s += '<path d="M1784 1490 C1790 1450 1820 1430 1850 1430 C1880 1430 1910 1450 1916 1490 L1916 1510 L1784 1510 Z" fill="#2d2440"/>';
    s += '<path class="lava" d="M1796 1510 C1800 1474 1826 1456 1850 1456 C1874 1456 1900 1474 1904 1510 Z" fill="#ff7a3c" opacity=".85"/>';
    // 한라산 (남쪽 끝)
    s += '<path d="M260 1600 C420 1470 560 1440 700 1436 C760 1430 800 1452 860 1448 C1000 1450 1160 1500 1300 1600 Z" fill="#6aa88a"/>';
    s += '<path d="M610 1456 C660 1440 700 1436 740 1434 C780 1432 810 1450 850 1448 C820 1470 790 1462 760 1476 C720 1462 680 1478 610 1456 Z" fill="#fff"/>';
    // 꽃
    var fl = [[90, 380], [760, 400], [1380, 410], [2300, 390], [460, 1370], [1700, 1380], [2260, 1300], [140, 1340], [1980, 1250], [2330, 980]];
    fl.forEach(function (f, i) { s += flower(f[0], f[1], ['#ff8fb3', '#fff', '#ffb04d', '#b99bff'][i % 4]); });
    s += '</svg>';
    return s;
  }

  function wavy(x0, x1, y, step, amp) {
    var d = '', up = true;
    for (var x = x0; x < x1; x += step) { d += 'Q' + (x + step / 2) + ' ' + (y + (up ? -amp : amp)) + ' ' + (x + step) + ' ' + y + ' '; up = !up; }
    return d;
  }
  function road(x, y, w, h) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#b7bcc9"/>' +
      '<rect x="' + x + '" y="' + (y + h / 2 - 3) + '" width="' + w + '" height="6" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="46 40" opacity=".85" transform="translate(0 0)"/>';
  }
  function flower(x, y, c) {
    return '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0 L0 -18" stroke="#3f9a3a" stroke-width="5" stroke-linecap="round"/><g transform="translate(0 -22)"><circle cx="-7" r="6" fill="' + c + '"/><circle cx="7" r="6" fill="' + c + '"/><circle cy="-7" r="6" fill="' + c + '"/><circle cy="7" r="6" fill="' + c + '"/><circle r="5" fill="#ffe24a"/></g></g>';
  }

  /* ---------- 세워 놓는 것들 (발 위치 y가 클수록 앞에 그림) ---------- */
  function block(b) {
    var s = '<svg viewBox="0 0 ' + BW + ' ' + BH + '" width="' + BW + '" height="' + BH + '">' +
      '<rect x="6" y="14" width="318" height="176" fill="#f8efdb" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="6" y="14" width="56" height="176" fill="' + b.c + '" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="0" y="2" width="330" height="18" rx="7" fill="#74819c" stroke="' + INK + '" stroke-width="5"/>' +
      '<text x="34" y="52" text-anchor="middle" font-size="24" fill="' + INK + '" font-family="Jua, sans-serif">' + b.n + '</text>';
    for (var r = 0; r < 7; r++) {
      var y = 30 + r * 22;
      s += '<rect x="66" y="' + (y + 15) + '" width="254" height="3" fill="#d9cdb2"/>';
      for (var c = 0; c < 8; c++) s += '<rect x="' + (74 + c * 31) + '" y="' + y + '" width="21" height="13" rx="2" fill="' + ((r * 3 + c * 5 + b.n) % 7 === 0 ? '#ffe9a0' : '#a9d8f5') + '" stroke="#62708c" stroke-width="2"/>';
    }
    for (var w = 0; w < 5; w++) s += '<rect x="22" y="' + (64 + w * 20) + '" width="24" height="9" rx="2" fill="#fff" opacity=".7"/>';
    s += '<path d="M18 190 L18 160 Q34 146 50 160 L50 190 Z" fill="' + (b.home ? '#ff6f91' : '#8a5a3a') + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/><circle cx="43" cy="176" r="3" fill="#ffd84a"/>';
    if (b.home) {
      s += '<g transform="translate(34 132)"><rect x="-44" y="-22" width="88" height="30" rx="15" fill="#fff" stroke="' + INK + '" stroke-width="4"/>' +
        '<text x="0" y="1" text-anchor="middle" font-size="20" fill="#ff5e7e" font-family="Jua, sans-serif">우리 집</text></g>';
    }
    return { x: b.x, y: b.y, w: BW, h: BH, html: s + '</svg>' };
  }

  function tree(x, y, kind) {
    var s, w = 110, h = 140;
    if (kind === 'tangerine') {
      w = 96; h = 104;
      s = '<svg viewBox="0 0 96 104" width="96" height="104"><ellipse cx="48" cy="98" rx="30" ry="6" fill="#000" opacity=".15"/><rect x="42" y="64" width="12" height="34" rx="5" fill="#8a5a3a" stroke="' + INK + '" stroke-width="3.5"/>' +
        '<g class="sway"><circle cx="48" cy="42" r="38" fill="#3f9a3a" stroke="' + INK + '" stroke-width="4"/><circle cx="34" cy="30" r="10" fill="#62c257" opacity=".7"/>' +
        '<g fill="#ff9a2e" stroke="#c2611a" stroke-width="2.5"><circle cx="30" cy="52" r="8"/><circle cx="58" cy="34" r="8"/><circle cx="66" cy="58" r="8"/><circle cx="44" cy="66" r="7"/></g></g></svg>';
    } else if (kind === 'palm') {
      w = 120; h = 170;
      s = '<svg viewBox="0 0 120 170" width="120" height="170"><ellipse cx="60" cy="164" rx="26" ry="6" fill="#000" opacity=".15"/>' +
        '<path d="M54 164 C56 120 56 84 60 54 L70 54 C68 84 68 120 68 164 Z" fill="#a9794d" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M56 140 L68 138 M56 116 L68 114 M57 92 L68 90 M58 70 L69 68" stroke="' + INK + '" stroke-width="2.5" opacity=".4"/>' +
        '<g class="sway" fill="#3fae4a" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"><path d="M64 56 C40 30 16 30 4 44 C26 44 44 52 64 56 Z"/><path d="M64 56 C88 30 106 30 118 46 C96 44 80 52 64 56 Z"/><path d="M64 56 C54 26 60 8 76 2 C76 22 72 40 64 56 Z"/><path d="M64 56 C38 50 20 62 12 80 C34 70 48 64 64 56 Z"/><path d="M64 56 C90 50 104 62 112 82 C92 70 80 64 64 56 Z"/></g></svg>';
    } else {
      s = '<svg viewBox="0 0 110 140" width="110" height="140"><ellipse cx="55" cy="134" rx="32" ry="6" fill="#000" opacity=".15"/><rect x="47" y="84" width="16" height="50" rx="6" fill="#8a5a3a" stroke="' + INK + '" stroke-width="4"/>' +
        '<g class="sway"><circle cx="55" cy="52" r="46" fill="#4fb848" stroke="' + INK + '" stroke-width="4"/><circle cx="38" cy="38" r="12" fill="#7ad66a" opacity=".7"/><circle cx="74" cy="66" r="9" fill="#3f9a3a" opacity=".6"/></g></svg>';
    }
    return { x: x - w / 2, y: y, w: w, h: h, html: s };
  }

  function harubang(x, y) {
    var s = '<svg viewBox="0 0 70 110" width="70" height="110"><ellipse cx="35" cy="104" rx="26" ry="5" fill="#000" opacity=".18"/>' +
      '<path d="M14 104 C10 80 12 60 18 50 C8 44 10 22 22 18 C22 8 48 8 48 18 C60 22 62 44 52 50 C58 60 60 80 56 104 Z" fill="#6f6a78" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M20 20 Q35 12 50 20" fill="none" stroke="#565160" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="27" cy="32" r="5.5" fill="#565160"/><circle cx="43" cy="32" r="5.5" fill="#565160"/><path d="M33 34 L33 44 L38 44" fill="none" stroke="#565160" stroke-width="3.5" stroke-linecap="round"/><path d="M28 50 L42 50" stroke="#565160" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M18 74 C28 66 40 66 50 70 M20 88 C30 82 42 82 52 86" fill="none" stroke="#565160" stroke-width="4" stroke-linecap="round"/></svg>';
    return { x: x - 35, y: y, w: 70, h: 110, html: s };
  }

  function wall(x, y, w) { // 돌담 한 줄
    var s = '<svg viewBox="0 0 ' + w + ' 34" width="' + w + '" height="34">';
    for (var i = 0; i < w / 26; i++) s += '<ellipse cx="' + (14 + i * 26) + '" cy="' + (i % 2 ? 20 : 17) + '" rx="15" ry="12" fill="' + (i % 3 ? '#5a5563' : '#6f6a78') + '" stroke="' + INK + '" stroke-width="3"/>';
    return { x: x, y: y, w: w, h: 34, html: s + '</svg>' };
  }

  function school() {
    var s = '<svg viewBox="0 0 170 170" width="170" height="170"><ellipse cx="85" cy="164" rx="70" ry="7" fill="#000" opacity=".15"/>' +
      '<rect x="20" y="78" width="130" height="86" rx="8" fill="#fff6e0" stroke="' + INK + '" stroke-width="5"/>' +
      '<path d="M6 84 L85 30 L164 84 Z" fill="#ff8a3c" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M85 30 L85 4" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/><path class="sway" d="M85 4 L116 13 L85 24 Z" fill="#ff4f6d" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M66 164 L66 122 Q85 104 104 122 L104 164 Z" fill="#8a5a3a" stroke="' + INK + '" stroke-width="4.5" stroke-linejoin="round"/>' +
      '<rect x="30" y="98" width="26" height="24" rx="4" fill="#a9d8f5" stroke="' + INK + '" stroke-width="4"/><rect x="114" y="98" width="26" height="24" rx="4" fill="#a9d8f5" stroke="' + INK + '" stroke-width="4"/>' +
      '<g transform="translate(85 62)"><path transform="scale(1.1)" d="' + A.STAR + '" fill="#ffd84a" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/></g>' +
      '<g transform="translate(85 92)"><rect x="-34" y="-12" width="68" height="22" rx="11" fill="#fff" stroke="' + INK + '" stroke-width="3.5"/><text x="0" y="5" text-anchor="middle" font-size="16" fill="#ff5e7e" font-family="Jua, sans-serif">시험장</text></g></svg>';
    return { x: 1020, y: 842, w: 170, h: 170, html: s, id: 'school' };
  }

  function slide(x, y) {
    var s = '<svg viewBox="0 0 170 130" width="170" height="130"><ellipse cx="85" cy="124" rx="74" ry="6" fill="#000" opacity=".14"/>' +
      '<path d="M40 122 L40 34 M78 122 L78 34" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/><path d="M40 58 L78 58 M40 82 L78 82 M40 104 L78 104" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="30" y="22" width="60" height="16" rx="6" fill="#ff4f6d" stroke="' + INK + '" stroke-width="4.5"/>' +
      '<path d="M84 30 C120 40 140 80 164 116 L148 124 C126 90 110 58 80 46 Z" fill="#ffd84a" stroke="' + INK + '" stroke-width="4.5" stroke-linejoin="round"/></svg>';
    return { x: x - 85, y: y, w: 170, h: 130, html: s };
  }
  function swing(x, y) {
    var s = '<svg viewBox="0 0 150 120" width="150" height="120"><ellipse cx="75" cy="114" rx="64" ry="6" fill="#000" opacity=".14"/>' +
      '<path d="M18 114 L34 14 L116 14 L132 114" fill="none" stroke="#3fa9f5" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g class="sway" style="transform-origin:50% 0"><path d="M56 16 L56 84 M94 16 L94 84" stroke="' + INK + '" stroke-width="3.5"/><rect x="48" y="82" width="54" height="11" rx="5" fill="#ff8a3c" stroke="' + INK + '" stroke-width="4"/></g></svg>';
    return { x: x - 75, y: y, w: 150, h: 120, html: s };
  }
  function car(x, y, c) {
    var s = '<svg viewBox="0 0 64 84" width="64" height="84"><rect x="6" y="4" width="52" height="76" rx="16" fill="' + c + '" stroke="' + INK + '" stroke-width="4"/><rect x="12" y="18" width="40" height="18" rx="6" fill="#cfeeff" stroke="' + INK + '" stroke-width="3"/><rect x="12" y="52" width="40" height="14" rx="6" fill="#cfeeff" stroke="' + INK + '" stroke-width="3"/></svg>';
    return { x: x, y: y, w: 64, h: 84, html: s, flat: true };
  }
  function lighthouse() {
    var s = '<svg viewBox="0 0 80 170" width="80" height="170"><path d="M22 166 L30 50 L50 50 L58 166 Z" fill="#fff" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M25 128 L55 128 L57 152 L23 152 Z M28 84 L52 84 L54 106 L26 106 Z" fill="#ff4f6d"/>' +
      '<rect x="24" y="30" width="32" height="22" rx="4" fill="#ffe24a" stroke="' + INK + '" stroke-width="5"/><path d="M20 30 L40 8 L60 30 Z" fill="#ff4f6d" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/></svg>';
    return { x: 2060, y: 206, w: 80, h: 170, html: s };
  }
  function bigTree() { // 큰 팽나무 (풀의 전설이 사는 곳)
    var s = '<svg viewBox="0 0 300 300" width="300" height="300"><ellipse cx="150" cy="290" rx="100" ry="10" fill="#000" opacity=".16"/>' +
      '<path d="M120 290 C126 240 116 210 96 180 L126 186 C132 170 140 160 150 150 C160 160 168 170 174 186 L204 180 C184 210 174 240 180 290 Z" fill="#8a5a3a" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M134 290 C138 262 150 250 166 248 C162 262 164 276 166 290 Z" fill="#2d2440"/>' +
      '<g class="sway"><circle cx="90" cy="120" r="72" fill="#3f9a3a" stroke="' + INK + '" stroke-width="5"/><circle cx="210" cy="120" r="72" fill="#3f9a3a" stroke="' + INK + '" stroke-width="5"/><circle cx="150" cy="80" r="84" fill="#4fb848" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="110" cy="56" r="20" fill="#7ad66a" opacity=".7"/><circle cx="196" cy="100" r="14" fill="#3f9a3a" opacity=".7"/></g></svg>';
    return { x: 75, y: 1056, w: 300, h: 300, html: s };
  }
  function rocks() { // 갯바위 (물의 전설이 사는 곳)
    var s = '<svg viewBox="0 0 220 130" width="220" height="130"><path d="M10 124 C6 90 30 60 60 64 C66 30 120 20 140 52 C170 40 208 70 210 124 Z" fill="#4a4652" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M40 86 C50 76 66 74 78 78 M120 60 C132 54 146 56 156 62" fill="none" stroke="#6a6674" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M78 124 C80 96 96 84 110 84 C124 84 140 96 142 124 Z" fill="#2d2440"/><path class="wave" d="M0 122 q14 -10 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" fill="none" stroke="#bfe9ff" stroke-width="6" stroke-linecap="round"/></svg>';
    return { x: 220, y: 262, w: 220, h: 130, html: s };
  }

  function objects() {
    var list = BLOCKS.map(block);
    list.push(school(), slide(1330, 900), swing(1420, 980), lighthouse(), bigTree(), rocks());
    list.push(harubang(1130, 1322), harubang(1270, 1322));
    // 돌담: 단지를 두르되 문 자리는 비워 둔다
    list.push(wall(470, 452, 640), wall(1290, 452, 640), wall(470, 1312, 600), wall(1330, 1312, 600));
    [[100, 520], [210, 500], [330, 530], [120, 700], [250, 690], [370, 720], [110, 890], [360, 900], [100, 1240], [380, 1230]].forEach(function (p) { list.push(tree(p[0], p[1], 'tangerine')); });
    [[2010, 520], [2330, 540], [2020, 1000], [2320, 1180], [1780, 420], [660, 430], [1960, 1380]].forEach(function (p) { list.push(tree(p[0], p[1], 'palm')); });
    [[930, 1000], [1480, 780], [900, 520], [1440, 1120], [2260, 860], [2080, 1220], [440, 1420], [1500, 1440]].forEach(function (p) { list.push(tree(p[0], p[1], 'tree')); });
    [['#ff8a8a', 990], ['#8ac4ff', 1140], ['#fff', 1290]].forEach(function (c) { list.push(car(c[1], 1496, c[0])); });
    return list;
  }

  // 동네 이웃이 서 있는 자리
  var npcSpots = {
    guard: [1200, 1296], diver: [560, 272], fisher: [1820, 256], keeper: [2190, 262], farmer: [200, 770], teacher: [1240, 888],
    bugdoc: [330, 1250], dinodoc: [1660, 1425], vet: [2060, 1010], painter: [2310, 770], granny: [2030, 470], jogger: [1500, 392],
    shop: [700, 1392], courier: [1470, 1398], mom: [1260, 728], kid1: [960, 905], kid2: [1470, 950], kid3: [780, 738]
  };

  root.MMWorld = {
    W: W, H: H, solids: solids, bounds: bounds, spots: spots, start: start, wildHomes: wildHomes, npcSpots: npcSpots,
    ground: ground, objects: objects
  };
})(window);
