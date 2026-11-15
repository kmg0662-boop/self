/* 말랑몬 선생님 — 그림 공장
   모든 캐릭터를 SVG로 직접 그려요. 부위(꼬리·머리 장식·눈)가 따로 나뉘어 있어서
   CSS로 숨 쉬기, 눈 깜빡임, 꼬리 흔들기 같은 움직임을 줄 수 있어요. */
(function (root) {
  'use strict';

  var INK = '#2d2440';

  var TYPE = {
    fire: { name: '불', color: '#ff7a3c', dark: '#c2401a', soft: '#ffe3d1', move: '불꽃 슛' },
    water: { name: '물', color: '#2fa8ef', dark: '#1670b5', soft: '#d8f1ff', move: '물방울 슛' },
    grass: { name: '풀', color: '#52c443', dark: '#2c8a2a', soft: '#def8d4', move: '풀잎 슛' }
  };

  // 종(타입 × 몸 모양) 이름
  var SPECIES = {
    fire: ['화르롱', '불딱지', '불꽃룡'],
    water: ['퐁퐁이', '물방개몬', '파도룡'],
    grass: ['새싹이', '풀잎벌', '초록룡']
  };
  // 몸 모양 0·1·2 = 동물·곤충·공룡
  var KIND = ['동물', '곤충', '공룡'];

  function pal(h) {
    h = ((h % 360) + 360) % 360;
    // 노랑~연두는 원래 밝아서 조금 더 진하게 잡아 줘요
    var bright = h > 40 && h < 170;
    var warm = h <= 40 || h >= 340;
    return {
      body: 'hsl(' + h + ' ' + (bright ? 72 : warm ? 94 : 84) + '% ' + (bright ? 58 : warm ? 63 : 66) + '%)',
      shade: 'hsl(' + h + ' ' + (bright ? 66 : 72) + '% ' + (bright ? 46 : 54) + '%)',
      dark: 'hsl(' + h + ' 48% 27%)',
      belly: 'hsl(' + h + ' 92% 91%)'
    };
  }

  /* ---------- 얼굴 ---------- */
  function eye(x, y, style, big) {
    var rx = big ? 11.5 : 9.5, ry = big ? 13.5 : 11.5;
    if (style === 1) {
      return '<ellipse cx="' + x + '" cy="' + y + '" rx="12" ry="13" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<ellipse cx="' + (x + 1) + '" cy="' + (y + 1) + '" rx="7" ry="8.5" fill="' + INK + '"/>' +
        '<circle cx="' + (x - 2) + '" cy="' + (y - 3) + '" r="3" fill="#fff"/>';
    }
    var s = '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + INK + '"/>' +
      '<circle cx="' + (x - 3.2) + '" cy="' + (y - 4.5) + '" r="' + (big ? 4.6 : 3.8) + '" fill="#fff"/>' +
      '<circle cx="' + (x + 3.4) + '" cy="' + (y + 4) + '" r="' + (big ? 2.2 : 1.7) + '" fill="#fff" opacity=".85"/>';
    if (style === 2) { // 속눈썹이 있는 눈
      s += '<path d="M' + (x - 10) + ' ' + (y - 9) + ' l-5 -4 M' + (x + 10) + ' ' + (y - 9) + ' l5 -4" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" fill="none"/>';
    }
    return s;
  }

  // expr: normal | happy | wow | think | ouch
  function face(y, expr, style) {
    var L = 80, R = 120, eyes, mouth;
    var st = 'stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    if (expr === 'happy') {
      eyes = '<path d="M70 118 Q80 104 90 118 M110 118 Q120 104 130 118" ' + st + '/>';
      mouth = '<path d="M89 126 Q100 147 111 126 Z" fill="#8a2f45" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<ellipse cx="100" cy="137" rx="5.5" ry="3.5" fill="#ff8fa3"/>';
    } else if (expr === 'wow') {
      eyes = eye(L, 114, 0, true) + eye(R, 114, 0, true);
      mouth = '<ellipse cx="100" cy="134" rx="6.5" ry="8" fill="#8a2f45" stroke="' + INK + '" stroke-width="3"/>';
    } else if (expr === 'think') {
      eyes = eye(L + 3, 111, 0) + eye(R + 3, 111, 0);
      mouth = '<path d="M96 132 Q102 129 109 131" ' + st + '/>';
    } else if (expr === 'ouch') {
      eyes = '<path d="M71 107 L88 115 L71 123 M129 107 L112 115 L129 123" ' + st + '/>';
      mouth = '<path d="M89 133 Q94.5 126 100 133 Q105.5 140 111 133" ' + st + '/>';
    } else if (expr === 'cool') {
      eyes = '<path d="M68 107 L92 113 L92 120 Q87 128 79 128 Q69 127 68 119 Z" fill="' + INK + '"/>' +
        '<path d="M132 107 L108 113 L108 120 Q113 128 121 128 Q131 127 132 119 Z" fill="' + INK + '"/>' +
        '<circle cx="76" cy="116" r="3.4" fill="#fff"/><circle cx="116" cy="117" r="3.4" fill="#fff"/>' +
        '<path d="M64 101 L93 109 M136 101 L107 109" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" fill="none"/>';
      mouth = '<path d="M91 131 Q101 138 111 129" ' + st + '/>';
    } else {
      eyes = eye(L, 114, style || 0) + eye(R, 114, style || 0);
      mouth = '<path d="M92 128 Q100 137 108 128" ' + st + '/>';
    }
    var cheeks = '<ellipse cx="62" cy="129" rx="8.5" ry="5.5" fill="#ff7d9c" opacity=".55"/>' +
      '<ellipse cx="138" cy="129" rx="8.5" ry="5.5" fill="#ff7d9c" opacity=".55"/>';
    return '<g class="face" transform="translate(0 ' + (y - 114) + ')">' + cheeks +
      '<g class="eyes' + (expr && expr !== 'normal' ? ' no-blink' : '') + '">' + eyes + '</g>' + mouth + '</g>';
  }

  /* ---------- 장식 (머리·꼬리) : 타입을 알려 주는 단서 ---------- */
  var FLAME = '<path d="M100 14 C104 30 122 36 120 52 C119 64 110 70 100 70 C90 70 81 64 80 52 C79 42 87 38 89 28 C93 32 96 30 100 14 Z" fill="#ff8a2b" stroke="#b3401a" stroke-width="4.5" stroke-linejoin="round"/>' +
    '<path d="M100 40 C103 48 110 50 109 58 C108 64 104 66 100 66 C96 66 92 64 91 58 C90 52 96 50 100 40 Z" fill="#ffe066"/>';

  function headOrn(kind, dy) {
    var g;
    if (kind === 0) {
      g = '<g class="orn orn-flame">' + FLAME + '</g>';
    } else if (kind === 1) {
      g = '<g class="orn orn-fin"><path d="M78 69 C80 44 96 24 126 16 C115 34 119 52 122 69 Z" fill="#7fe3f5" stroke="#1f7f9c" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M93 64 L106 34 M108 65 L115 40" stroke="#1f7f9c" stroke-width="3" stroke-linecap="round" opacity=".55"/></g>';
    } else {
      g = '<g class="orn orn-leaf"><path d="M100 70 L100 46" stroke="#2f7a2a" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M100 48 C82 51 65 39 61 20 C82 17 98 30 100 48 Z" fill="#8be05a" stroke="#2f7a2a" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M100 48 C118 51 135 39 139 20 C118 17 102 30 100 48 Z" fill="#a4ec6a" stroke="#2f7a2a" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M94 42 C86 36 76 30 68 25 M106 42 C114 36 124 30 132 25" stroke="#2f7a2a" stroke-width="2.5" stroke-linecap="round" opacity=".5" fill="none"/></g>';
    }
    return '<g transform="translate(0 ' + dy + ')">' + g + '</g>';
  }

  function tailOrn(kind, p) {
    var g;
    if (kind === 0) {
      g = '<path d="M144 154 C170 158 186 146 183 124" stroke="' + p.dark + '" stroke-width="15" stroke-linecap="round" fill="none"/>' +
        '<path d="M144 154 C170 158 186 146 183 124" stroke="' + p.body + '" stroke-width="7" stroke-linecap="round" fill="none"/>' +
        '<g transform="translate(131 82) scale(.52)"><g class="orn-flame">' + FLAME + '</g></g>';
    } else if (kind === 1) {
      g = '<path d="M142 150 C162 146 172 128 194 118 C189 136 191 150 198 168 C176 168 160 163 142 157 Z" fill="#7fe3f5" stroke="#1f7f9c" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M156 151 L184 130 M158 156 L188 156" stroke="#1f7f9c" stroke-width="3" stroke-linecap="round" opacity=".55"/>';
    } else {
      g = '<path d="M142 153 C155 128 178 116 198 120 C196 144 179 164 145 159 Z" fill="#8be05a" stroke="#2f7a2a" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M150 154 C164 142 178 132 191 125" stroke="#2f7a2a" stroke-width="2.5" stroke-linecap="round" opacity=".5" fill="none"/>';
    }
    return '<g class="tail">' + g + '</g>';
  }

  /* ---------- 야생 말랑몬 ---------- */
  var BODY = [
    { d: 'M100 64 C140 64 161 93 161 126 C161 160 137 178 100 178 C63 178 39 160 39 126 C39 93 60 64 100 64 Z', top: 64 },
    { d: 'M100 56 C127 56 148 95 156 128 C163 161 135 178 100 178 C65 178 37 161 44 128 C52 95 73 56 100 56 Z', top: 57 },
    { d: 'M100 72 C150 67 169 91 167 127 C165 165 141 178 100 178 C59 178 35 165 33 127 C31 91 50 67 100 72 Z', top: 70 }
  ];

  function wild(m, opts) {
    opts = opts || {};
    var p = pal(m.hue), b = BODY[m.shape || 0];
    var o = 'stroke="' + p.dark + '" stroke-width="5" stroke-linejoin="round"';
    var ears = '', back = '', extra = '';
    var thin = 'stroke="' + p.dark + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
    if (m.shape === 0) {
      // 동물: 둥근 귀, 코, 수염
      ears = '<circle cx="60" cy="82" r="15" fill="' + p.body + '" ' + o + '/><circle cx="140" cy="82" r="15" fill="' + p.body + '" ' + o + '/>' +
        '<circle cx="60" cy="83" r="7" fill="' + p.belly + '"/><circle cx="140" cy="83" r="7" fill="' + p.belly + '"/>';
      extra = '<ellipse cx="100" cy="126.5" rx="4.6" ry="3.2" fill="' + INK + '"/>' +
        '<path d="M50 124 L36 120 M50 131 L37 134 M150 124 L164 120 M150 131 L163 134" fill="none" ' + thin + ' opacity=".7"/>';
    } else if (m.shape === 1) {
      // 곤충: 더듬이, 투명한 날개, 배 줄무늬
      back = '<g class="bugwing bw-l"><ellipse cx="36" cy="108" rx="27" ry="15" transform="rotate(-28 36 108)" fill="#fff" opacity=".8" ' + thin + '/></g>' +
        '<g class="bugwing bw-r"><ellipse cx="164" cy="108" rx="27" ry="15" transform="rotate(28 164 108)" fill="#fff" opacity=".8" ' + thin + '/></g>';
      ears = '<path d="M80 72 C70 54 60 46 50 48 M120 72 C130 54 140 46 150 48" fill="none" stroke="' + p.dark + '" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="49" cy="48" r="7" fill="' + p.shade + '" ' + thin + '/><circle cx="151" cy="48" r="7" fill="' + p.shade + '" ' + thin + '/>';
      extra = '<path d="M72 143 Q100 152 128 143 M70 156 Q100 166 130 156" fill="none" stroke="' + p.shade + '" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
    } else {
      // 공룡: 뿔, 등 가시, 송곳니, 비늘 무늬
      back = '<path d="M38 118 L18 110 L36 98 Z M34 142 L15 138 L31 124 Z M162 112 L182 104 L164 94 Z" fill="' + p.shade + '" ' + o + '/>';
      ears = '<path d="M54 94 C42 78 40 62 46 50 C60 56 72 68 78 82 Z" fill="#fff3d6" ' + o + '/><path d="M146 94 C158 78 160 62 154 50 C140 56 128 68 122 82 Z" fill="#fff3d6" ' + o + '/>';
      extra = '<circle cx="134" cy="96" r="5.5" fill="' + p.shade + '" opacity=".7"/><circle cx="144" cy="110" r="3.8" fill="' + p.shade + '" opacity=".7"/><circle cx="62" cy="100" r="4.2" fill="' + p.shade + '" opacity=".7"/>' +
        (opts.expr && opts.expr !== 'normal' ? '' : '<path d="M92.5 132.5 L95.5 139 L98.5 133.5 Z M101.5 133.5 L104.5 139 L107.5 132.5 Z" fill="#fff" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>');
    }
    var silhouette = opts.silhouette;
    var svg = '<svg class="mon mon-wild' + (silhouette ? ' is-shadow' : '') + '" viewBox="0 0 200 200" aria-hidden="true">' +
      '<ellipse class="mon-ground" cx="100" cy="182" rx="50" ry="9" fill="#000" opacity=".16"/>' +
      '<g class="mon-all"><g class="mon-body">' +
      tailOrn(m.tail, p) + back +
      '<ellipse cx="42" cy="134" rx="10" ry="14" transform="rotate(22 42 134)" fill="' + p.body + '" ' + o + '/>' +
      '<ellipse cx="158" cy="134" rx="10" ry="14" transform="rotate(-22 158 134)" fill="' + p.body + '" ' + o + '/>' +
      ears + headOrn(m.head, b.top - 64) +
      '<path d="' + b.d + '" fill="' + p.body + '" ' + o + '/>' +
      '<ellipse cx="100" cy="148" rx="33" ry="24" fill="' + p.belly + '"/>' +
      '<ellipse cx="74" cy="' + (b.top + 26) + '" rx="17" ry="8" transform="rotate(-28 74 ' + (b.top + 26) + ')" fill="#fff" opacity=".32"/>' +
      '<ellipse cx="78" cy="177" rx="15" ry="8" fill="' + p.shade + '" ' + o + '/>' +
      '<ellipse cx="122" cy="177" rx="15" ry="8" fill="' + p.shade + '" ' + o + '/>' +
      face(116, opts.expr || 'normal', m.eyes) + extra +
      '</g></g></svg>';
    return svg;
  }

  /* ---------- 짝꿍 (배우는 AI 말랑몬) ---------- */
  var EGGS = {
    berry: { name: '딸기 알', hue: 338, body: 'hsl(338 90% 76%)', shade: 'hsl(338 76% 64%)', dark: 'hsl(338 45% 30%)', belly: 'hsl(338 100% 94%)', accent: '#ff5e7e' },
    grape: { name: '포도 알', hue: 266, body: 'hsl(266 84% 76%)', shade: 'hsl(266 66% 64%)', dark: 'hsl(266 42% 30%)', belly: 'hsl(266 100% 95%)', accent: '#8a5cf6' },
    cloud: { name: '구름 알', hue: 205, body: 'hsl(205 80% 93%)', shade: 'hsl(205 62% 80%)', dark: 'hsl(215 38% 34%)', belly: '#ffffff', accent: '#43b4ff' }
  };

  var STAR = 'M0 -13 L3.8 -4.6 L12.8 -3.6 L6 2.6 L7.9 11.6 L0 7 L-7.9 11.6 L-6 2.6 L-12.8 -3.6 L-3.8 -4.6 Z';

  function partner(egg, form, opts) {
    opts = opts || {};
    var p = EGGS[egg] || EGGS.berry;
    var o = 'stroke="' + p.dark + '" stroke-width="5" stroke-linejoin="round"';
    var parts = '', faceY, antenna;

    if (form <= 1) {
      // 아기: 동글동글, 작은 더듬이
      antenna = '<g class="antenna"><path d="M100 80 C100 66 104 60 110 54" stroke="' + p.dark + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
        '<circle class="spark" cx="112" cy="50" r="9" fill="#ffd84a" stroke="#b7791f" stroke-width="4"/></g>';
      parts = antenna +
        '<path d="M100 76 C138 76 157 102 157 132 C157 163 134 178 100 178 C66 178 43 163 43 132 C43 102 62 76 100 76 Z" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="100" cy="151" rx="30" ry="21" fill="' + p.belly + '"/>' +
        '<ellipse cx="76" cy="100" rx="16" ry="8" transform="rotate(-28 76 100)" fill="#fff" opacity=".4"/>' +
        '<ellipse cx="80" cy="177" rx="13" ry="7" fill="' + p.shade + '" ' + o + '/><ellipse cx="120" cy="177" rx="13" ry="7" fill="' + p.shade + '" ' + o + '/>';
      faceY = 124;
    } else if (form === 2) {
      // 어린이: 귀와 별 더듬이, 작은 팔
      antenna = '<g class="antenna"><path d="M100 70 C100 54 103 46 108 40" stroke="' + p.dark + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
        '<path class="spark" transform="translate(111 30)" d="' + STAR + '" fill="#ffd84a" stroke="#b7791f" stroke-width="4" stroke-linejoin="round"/></g>';
      parts =
        '<g class="tail"><circle cx="160" cy="158" r="13" fill="' + p.belly + '" ' + o + '/></g>' +
        '<path d="M70 86 C52 64 52 34 66 30 C82 30 90 56 88 80 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M130 86 C148 64 148 34 134 30 C118 30 110 56 112 80 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M70 72 C62 58 62 44 67 40 C75 42 79 58 79 72 Z" fill="' + p.belly + '"/>' +
        '<path d="M130 72 C138 58 138 44 133 40 C125 42 121 58 121 72 Z" fill="' + p.belly + '"/>' +
        antenna +
        '<ellipse cx="42" cy="136" rx="10" ry="15" transform="rotate(24 42 136)" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="158" cy="136" rx="10" ry="15" transform="rotate(-24 158 136)" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M100 66 C140 66 161 96 161 128 C161 162 137 178 100 178 C63 178 39 162 39 128 C39 96 60 66 100 66 Z" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="100" cy="150" rx="33" ry="23" fill="' + p.belly + '"/>' +
        '<ellipse cx="74" cy="92" rx="17" ry="8" transform="rotate(-28 74 92)" fill="#fff" opacity=".4"/>' +
        '<ellipse cx="78" cy="177" rx="15" ry="8" fill="' + p.shade + '" ' + o + '/><ellipse cx="122" cy="177" rx="15" ry="8" fill="' + p.shade + '" ' + o + '/>';
      faceY = 118;
    } else {
      // 챔피언: 큰 귀, 날개, 목도리, 반짝이는 별
      antenna = '<g class="antenna"><path d="M100 62 C100 44 103 36 108 30" stroke="' + p.dark + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
        '<circle cx="111" cy="20" r="19" fill="#ffd84a" opacity=".28"/>' +
        '<path class="spark" transform="translate(111 20) scale(1.25)" d="' + STAR + '" fill="#ffd84a" stroke="#b7791f" stroke-width="3.4" stroke-linejoin="round"/></g>';
      parts =
        '<g class="wing wing-l"><path d="M52 128 C30 130 10 118 4 96 C12 98 18 98 24 96 C12 88 6 76 8 62 C18 70 26 74 34 76 C28 68 28 58 32 50 C50 62 62 92 62 122 Z" fill="#fff" ' + o + '/></g>' +
        '<g class="wing wing-r"><path d="M148 128 C170 130 190 118 196 96 C188 98 182 98 176 96 C188 88 194 76 192 62 C182 70 174 74 166 76 C172 68 172 58 168 50 C150 62 138 92 138 122 Z" fill="#fff" ' + o + '/></g>' +
        '<g class="tail"><path transform="translate(168 160) scale(1.1)" d="' + STAR + '" fill="#ffd84a" stroke="#b7791f" stroke-width="3.4" stroke-linejoin="round"/></g>' +
        '<path d="M68 84 C44 62 40 22 58 14 C78 16 92 50 90 78 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M132 84 C156 62 160 22 142 14 C122 16 108 50 110 78 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M66 66 C54 48 54 30 60 24 C72 28 80 50 80 68 Z" fill="' + p.accent + '" opacity=".85"/>' +
        '<path d="M134 66 C146 48 146 30 140 24 C128 28 120 50 120 68 Z" fill="' + p.accent + '" opacity=".85"/>' +
        antenna +
        '<ellipse cx="40" cy="138" rx="11" ry="16" transform="rotate(24 40 138)" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="160" cy="138" rx="11" ry="16" transform="rotate(-24 160 138)" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M100 60 C142 60 164 92 164 126 C164 162 139 178 100 178 C61 178 36 162 36 126 C36 92 58 60 100 60 Z" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="100" cy="158" rx="30" ry="16" fill="' + p.belly + '"/>' +
        '<ellipse cx="72" cy="86" rx="18" ry="8" transform="rotate(-28 72 86)" fill="#fff" opacity=".4"/>' +
        '<path d="M42 136 Q100 160 158 136 L160 150 Q100 175 40 150 Z" fill="#ff5a4e" stroke="#9c2a22" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<g class="scarf-tail"><path d="M140 150 C150 160 152 176 146 190 L132 184 C136 172 134 164 128 156 Z" fill="#ff5a4e" stroke="#9c2a22" stroke-width="4.5" stroke-linejoin="round"/></g>' +
        '<ellipse cx="78" cy="177" rx="15" ry="8" fill="' + p.shade + '" ' + o + '/><ellipse cx="122" cy="177" rx="15" ry="8" fill="' + p.shade + '" ' + o + '/>';
      faceY = 108;
    }

    if (form >= 4) {
      // 전설: 왕관, 큰 날개, 망토, 가슴의 별. 눈매가 날카롭다
      var gold = 'fill="#ffd84a" stroke="#b7791f" stroke-width="3.6" stroke-linejoin="round"';
      antenna = '<g class="antenna"><circle cx="100" cy="16" r="20" fill="#ffd84a" opacity=".3"/>' +
        '<path class="spark" transform="translate(100 16) scale(1.35)" d="' + STAR + '" ' + gold + '/></g>';
      parts =
        '<g class="wing wing-l"><path d="M54 126 C24 132 2 112 -8 82 C4 88 12 88 20 84 C4 72 -2 54 2 34 C14 48 24 54 34 56 C28 44 30 30 36 20 C56 40 68 84 66 122 Z" fill="#fff" ' + o + '/>' +
        '<path d="M2 84 C12 96 28 106 46 108 M6 44 C16 62 30 76 48 84" fill="none" stroke="#ffd84a" stroke-width="4.5" stroke-linecap="round"/></g>' +
        '<g class="wing wing-r"><path d="M146 126 C176 132 198 112 208 82 C196 88 188 88 180 84 C196 72 202 54 198 34 C186 48 176 54 166 56 C172 44 170 30 164 20 C144 40 132 84 134 122 Z" fill="#fff" ' + o + '/>' +
        '<path d="M198 84 C188 96 172 106 154 108 M194 44 C184 62 170 76 152 84" fill="none" stroke="#ffd84a" stroke-width="4.5" stroke-linecap="round"/></g>' +
        '<g class="scarf-tail"><path d="M52 132 C34 150 30 172 38 192 L62 184 L78 196 L100 186 L122 196 L138 184 L162 192 C170 172 166 150 148 132 Z" fill="#e23b3b" stroke="#7d1c1c" stroke-width="4.5" stroke-linejoin="round"/></g>' +
        '<path d="M66 82 C40 56 40 14 60 4 C78 12 92 48 90 76 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M134 82 C160 56 160 14 140 4 C122 12 108 48 110 76 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M62 44 C54 30 56 18 61 12 C70 20 76 36 76 50 Z" fill="#ffd84a"/><path d="M138 44 C146 30 144 18 139 12 C130 20 124 36 124 50 Z" fill="#ffd84a"/>' +
        antenna +
        '<ellipse cx="38" cy="136" rx="12" ry="17" transform="rotate(24 38 136)" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="162" cy="136" rx="12" ry="17" transform="rotate(-24 162 136)" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M100 56 C144 56 166 90 166 124 C166 162 140 178 100 178 C60 178 34 162 34 124 C34 90 56 56 100 56 Z" fill="' + p.body + '" ' + o + '/>' +
        '<ellipse cx="100" cy="156" rx="32" ry="18" fill="' + p.belly + '"/>' +
        '<ellipse cx="70" cy="82" rx="18" ry="8" transform="rotate(-28 70 82)" fill="#fff" opacity=".4"/>' +
        '<path d="M74 60 L84 44 L92 58 L100 40 L108 58 L116 44 L126 60 C110 54 90 54 74 60 Z" ' + gold + '/>' +
        '<path transform="translate(100 156) scale(.95)" d="' + STAR + '" ' + gold + '/>' +
        '<path d="M46 124 C60 114 78 120 84 132 M154 124 C140 114 122 120 116 132" fill="none" stroke="' + p.accent + '" stroke-width="4" stroke-linecap="round" opacity=".0"/>' +
        '<ellipse cx="78" cy="177" rx="16" ry="8" fill="' + p.shade + '" ' + o + '/><ellipse cx="122" cy="177" rx="16" ry="8" fill="' + p.shade + '" ' + o + '/>';
      faceY = 108;
      if (!opts.expr || opts.expr === 'normal') opts.expr = 'cool';
    }

    return '<svg class="mon mon-partner form-' + form + '" viewBox="0 0 200 200" data-face-y="' + faceY + '" data-form="' + form + '" aria-hidden="true">' +
      '<ellipse class="mon-ground" cx="100" cy="182" rx="50" ry="9" fill="#000" opacity=".16"/>' +
      '<g class="mon-all"><g class="mon-body">' + parts + face(faceY, opts.expr || 'normal', 0) + '</g></g></svg>';
  }

  // 이미 그려진 말랑몬의 표정만 바꾼다
  function setFace(svgEl, expr) {
    if (!svgEl) return;
    var old = svgEl.querySelector('.face');
    if (!old) return;
    var y = svgEl.getAttribute('data-face-y');
    var tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (expr === 'normal' && +svgEl.getAttribute('data-form') >= 4) expr = 'cool';
    tmp.innerHTML = face(y ? +y : 116, expr, +(svgEl.getAttribute('data-eyes') || 0));
    old.parentNode.replaceChild(tmp.firstChild, old);
  }

  /* ---------- 알 ---------- */
  function egg(kind, crack) {
    var p = EGGS[kind];
    var cracks = [
      '',
      '<path d="M96 60 L104 74 L94 84" />',
      '<path d="M96 60 L104 74 L94 84 L108 98 L98 108" /><path d="M134 104 L122 110 L128 122" />',
      '<path d="M96 60 L104 74 L94 84 L108 98 L98 108 L110 122" /><path d="M134 104 L122 110 L128 122 L116 130" /><path d="M62 112 L74 118 L68 130 L80 136" />',
      '<path d="M96 60 L104 74 L94 84 L108 98 L98 108 L110 122 L100 136" /><path d="M140 100 L122 110 L128 122 L116 130 L122 144" /><path d="M58 108 L74 118 L68 130 L80 136 L74 150" />'
    ][crack || 0];
    return '<svg class="egg" viewBox="0 0 200 200" aria-hidden="true">' +
      '<ellipse cx="100" cy="182" rx="46" ry="9" fill="#000" opacity=".16"/>' +
      '<g class="egg-body">' +
      '<path d="M100 26 C138 26 158 84 158 122 C158 158 134 180 100 180 C66 180 42 158 42 122 C42 84 62 26 100 26 Z" fill="#fff8ec" stroke="' + p.dark + '" stroke-width="5"/>' +
      '<path d="M46 108 C60 96 74 120 90 106 C106 92 118 120 134 106 C142 99 150 100 156 106 C158 112 158 118 158 122 C158 158 134 180 100 180 C66 180 42 158 42 122 C42 117 43 112 46 108 Z" fill="' + p.body + '"/>' +
      '<circle cx="80" cy="64" r="9" fill="' + p.body + '"/><circle cx="118" cy="52" r="6" fill="' + p.body + '"/><circle cx="124" cy="82" r="8" fill="' + p.body + '"/>' +
      '<circle cx="72" cy="146" r="8" fill="' + p.belly + '" opacity=".8"/><circle cx="118" cy="154" r="10" fill="' + p.belly + '" opacity=".8"/><circle cx="136" cy="132" r="5" fill="' + p.belly + '" opacity=".8"/>' +
      '<path d="M100 26 C138 26 158 84 158 122 C158 158 134 180 100 180 C66 180 42 158 42 122 C42 84 62 26 100 26 Z" fill="none" stroke="' + p.dark + '" stroke-width="5"/>' +
      '<ellipse cx="74" cy="60" rx="10" ry="20" transform="rotate(24 74 60)" fill="#fff" opacity=".7"/>' +
      '<g fill="none" stroke="' + p.dark + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' + cracks + '</g>' +
      '</g></svg>';
  }

  /* ---------- 타입 아이콘 ---------- */
  function typeIcon(type) {
    var inner;
    if (type === 'fire') {
      inner = '<path d="M24 4 C27 14 38 18 38 30 C38 39 32 45 24 45 C16 45 10 39 10 30 C10 23 15 20 17 13 C20 16 22 14 24 4 Z" fill="#ff7a2b" stroke="#b3401a" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M24 24 C26 29 31 31 31 36 C31 41 28 43 24 43 C20 43 17 41 17 36 C17 31 22 29 24 24 Z" fill="#ffd95a"/>';
    } else if (type === 'water') {
      inner = '<path d="M24 4 C30 14 39 22 39 31 C39 40 32 45 24 45 C16 45 9 40 9 31 C9 22 18 14 24 4 Z" fill="#39b6f2" stroke="#1670b5" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M16 30 C16 25 19 21 21 18" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".8"/>';
    } else {
      inner = '<path d="M7 41 C6 20 20 6 42 6 C43 28 30 43 7 41 Z" fill="#5fcf4a" stroke="#2c8a2a" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M10 38 C20 28 30 18 39 9" stroke="#2c8a2a" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".6"/>';
    }
    return '<svg class="type-icon" viewBox="0 0 48 48" aria-hidden="true">' + inner + '</svg>';
  }

  function speciesName(m) { return SPECIES[m.type][m.shape || 0]; }

  root.MMArt = {
    TYPE: TYPE, SPECIES: SPECIES, KIND: KIND, EGGS: EGGS, STAR: STAR, INK: INK, FLAME: FLAME,
    wild: wild, partner: partner, egg: egg, typeIcon: typeIcon,
    setFace: setFace, speciesName: speciesName, pal: pal
  };
})(window);
