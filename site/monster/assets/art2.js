/* 말랑몬 선생님 — 그림 공장 2
   전설 말랑몬 세 마리(공룡·바다 용·장수풍뎅이)를 그려요.
   전설도 머리 장식(불꽃·지느러미·잎)은 진짜 타입을 알려 주고, 몸 색은 변신할 때마다 바뀌어요. */
(function (root) {
  'use strict';
  var A = root.MMArt, INK = A.INK;

  var LEGEND = {
    fire: { name: '볼카', title: '화산의 공룡왕', glow: '#ffb02e' },
    water: { name: '마레', title: '바다의 수호룡', glow: '#5fe3ff' },
    grass: { name: '헤라클', title: '숲의 장수', glow: '#c8f25a' }
  };

  function lp(h) {
    h = ((h % 360) + 360) % 360;
    var bright = h > 40 && h < 170;
    return {
      body: 'hsl(' + h + ' 82% ' + (bright ? 42 : 50) + '%)',
      shade: 'hsl(' + h + ' 78% ' + (bright ? 31 : 37) + '%)',
      dark: 'hsl(' + h + ' 62% 15%)',
      belly: 'hsl(' + (h + 16) + ' 92% 80%)'
    };
  }

  function mirror(s) { return '<g transform="translate(240 0) scale(-1 1)">' + s + '</g>'; }
  function both(s) { return s + mirror(s); }

  // 날카롭게 빛나는 눈 (왼쪽 눈 기준, 오른쪽은 거울처럼)
  function fierceEyes(x, y, glow, hurt) {
    if (hurt) {
      return both('<path d="M' + (x - 14) + ' ' + (y - 8) + ' L' + (x + 12) + ' ' + y + ' L' + (x - 14) + ' ' + (y + 8) + '" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>');
    }
    return both('<path d="M' + (x - 16) + ' ' + (y - 9) + ' L' + (x + 13) + ' ' + (y - 1) + ' L' + (x + 11) + ' ' + (y + 8) + ' Q' + x + ' ' + (y + 14) + ' ' + (x - 12) + ' ' + (y + 8) + ' Z" fill="' + glow + '" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<ellipse cx="' + (x + 1) + '" cy="' + (y + 2) + '" rx="3.6" ry="7" fill="' + INK + '"/>' +
      '<circle cx="' + (x - 6) + '" cy="' + (y - 1) + '" r="2.4" fill="#fff"/>' +
      '<path d="M' + (x - 22) + ' ' + (y - 16) + ' L' + (x + 16) + ' ' + (y - 6) + '" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>');
  }

  function legend(type, hue, opts) {
    opts = opts || {};
    var p = lp(hue), L = LEGEND[type], hurt = opts.expr === 'ouch';
    var o = 'stroke="' + p.dark + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
    var body = '';

    if (type === 'fire') {
      var wing = '<path d="M72 124 C40 104 12 62 18 24 C32 44 46 52 58 54 C52 40 56 24 64 14 C82 44 94 82 94 116 Z" fill="' + p.shade + '" ' + o + '/>' +
        '<path d="M70 116 C54 92 40 62 32 38 M80 112 C74 84 68 54 64 30" fill="none" stroke="' + p.dark + '" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>';
      var foot = '<ellipse cx="88" cy="213" rx="27" ry="12" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M66 216 L62 226 L72 220 Z M82 219 L82 230 L90 221 Z M100 218 L104 228 L108 217 Z" fill="#fff8e6" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
      var arm = '<ellipse cx="54" cy="158" rx="12" ry="17" transform="rotate(30 54 158)" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M42 166 L38 176 L47 171 Z M50 171 L50 181 L57 173 Z" fill="#fff8e6" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
      var horn = '<path d="M78 46 C62 32 54 14 58 -4 C72 6 88 22 94 38 Z" fill="#fff3d6" ' + o + '/><path d="M60 4 C62 14 68 24 76 32" fill="none" stroke="#d9b98a" stroke-width="3" stroke-linecap="round"/>';
      body =
        '<g class="lg-wing wing-l">' + wing + '</g><g class="lg-wing wing-r">' + mirror(wing) + '</g>' +
        '<g class="tail"><path d="M158 190 C196 198 224 178 220 146" fill="none" stroke="' + p.dark + '" stroke-width="30" stroke-linecap="round"/>' +
        '<path d="M158 190 C196 198 224 178 220 146" fill="none" stroke="' + p.body + '" stroke-width="20" stroke-linecap="round"/>' +
        '<g transform="translate(145 88) scale(.75)"><g class="orn-flame">' + A.FLAME + '</g></g></g>' +
        both(foot) +
        '<path d="M120 96 C166 96 186 130 186 164 C186 200 160 218 120 218 C80 218 54 200 54 164 C54 130 74 96 120 96 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M120 128 C142 128 154 148 154 172 C154 196 140 208 120 208 C100 208 86 196 86 172 C86 148 98 128 120 128 Z" fill="' + p.belly + '"/>' +
        '<path d="M90 156 Q120 164 150 156 M87 174 Q120 183 153 174 M92 192 Q120 200 148 192" fill="none" stroke="' + p.shade + '" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>' +
        both(arm) + both(horn) +
        '<g transform="translate(30 -27) scale(.9)"><g class="orn orn-flame">' + A.FLAME + '</g></g>' +
        '<path d="M120 28 C158 28 178 50 178 78 C178 102 160 118 120 118 C80 118 62 102 62 78 C62 50 82 28 120 28 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M78 88 C92 104 148 104 162 88 C158 108 142 118 120 118 C98 118 82 108 78 88 Z" fill="' + p.belly + '"/>' +
        '<path d="M80 89 L89 100 L97 91 L106 102 L114 92 L120 103 L126 92 L134 102 L143 91 L151 100 L160 89" fill="#fff" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<ellipse cx="110" cy="79" rx="3" ry="4.5" fill="' + p.dark + '"/><ellipse cx="130" cy="79" rx="3" ry="4.5" fill="' + p.dark + '"/>' +
        '<ellipse cx="92" cy="42" rx="18" ry="7" transform="rotate(-20 92 42)" fill="#fff" opacity=".25"/>' +
        fierceEyes(92, 62, '#fff3a6', hurt);
    } else if (type === 'water') {
      var flip = '<path d="M72 170 C42 158 22 170 12 192 C34 196 56 194 76 188 Z" fill="#7fe3f5" stroke="#1f7f9c" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M26 188 C40 180 54 178 66 178" fill="none" stroke="#1f7f9c" stroke-width="3" stroke-linecap="round" opacity=".55"/>';
      var earfin = '<path d="M76 72 C50 62 34 44 32 22 C54 32 72 46 84 60 Z" fill="#7fe3f5" stroke="#1f7f9c" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M42 34 C54 44 66 54 76 64" fill="none" stroke="#1f7f9c" stroke-width="3" stroke-linecap="round" opacity=".55"/>';
      var whisk = '<path d="M98 94 C72 100 56 120 52 146" fill="none" stroke="' + p.dark + '" stroke-width="4.5" stroke-linecap="round"/><circle cx="52" cy="148" r="5" fill="#bff4ff" stroke="' + p.dark + '" stroke-width="3"/>';
      body =
        '<g class="tail"><path d="M172 190 C204 184 218 154 212 122" fill="none" stroke="' + p.dark + '" stroke-width="26" stroke-linecap="round"/>' +
        '<path d="M172 190 C204 184 218 154 212 122" fill="none" stroke="' + p.body + '" stroke-width="16" stroke-linecap="round"/>' +
        '<path d="M212 128 C196 110 190 92 192 72 C204 84 212 88 216 90 C216 76 220 64 228 54 C236 78 234 106 224 128 Z" fill="#7fe3f5" stroke="#1f7f9c" stroke-width="5" stroke-linejoin="round"/></g>' +
        both(flip) +
        '<ellipse cx="120" cy="182" rx="64" ry="40" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M90 184 C84 142 92 112 100 96 L140 96 C148 112 156 142 150 184 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M106 104 C100 132 100 162 104 200 L136 200 C140 162 140 132 134 104 Z" fill="' + p.belly + '"/>' +
        '<path d="M103 126 L137 126 M102 146 L138 146 M102 166 L138 166 M104 186 L136 186" stroke="' + p.shade + '" stroke-width="3.5" stroke-linecap="round" opacity=".5"/>' +
        '<path d="M120 116 L131 130 L120 146 L109 130 Z" fill="#9ff3ff" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M114 128 L120 121" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
        both(earfin) +
        '<g class="orn orn-fin"><path d="M98 38 C100 8 116 -10 148 -20 C135 2 139 22 143 38 Z" fill="#7fe3f5" stroke="#1f7f9c" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M112 32 L126 2 M128 34 L136 8" stroke="#1f7f9c" stroke-width="3" stroke-linecap="round" opacity=".55"/></g>' +
        '<path d="M120 30 C152 30 172 52 170 78 C168 100 148 112 120 112 C92 112 72 100 70 78 C68 52 88 30 120 30 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M92 92 C104 104 136 104 148 92 C144 106 134 112 120 112 C106 112 96 106 92 92 Z" fill="' + p.belly + '"/>' +
        both(whisk) +
        '<path d="M104 95 Q120 103 136 95" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
        '<ellipse cx="112" cy="84" rx="2.6" ry="3.6" fill="' + p.dark + '"/><ellipse cx="128" cy="84" rx="2.6" ry="3.6" fill="' + p.dark + '"/>' +
        '<ellipse cx="94" cy="44" rx="16" ry="6" transform="rotate(-20 94 44)" fill="#fff" opacity=".28"/>' +
        fierceEyes(94, 66, '#bff9ff', hurt) +
        '<path class="wave" d="M22 226 C44 198 66 216 88 204 C110 192 130 216 152 204 C174 192 196 214 218 226 Z" fill="#8ad9ff" stroke="#1f7f9c" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M48 214 C60 206 70 212 82 208 M150 208 C162 204 174 210 190 216" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>';
    } else {
      var legs = '<path d="M72 150 L38 136 L24 152 M66 174 L30 172 L18 192 M76 196 L46 208 L40 224" fill="none" stroke="' + p.dark + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M72 150 L38 136 L24 152 M66 174 L30 172 L18 192 M76 196 L46 208 L40 224" fill="none" stroke="#5a4326" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
      var leaf = '<path d="M112 60 C88 62 62 44 56 16 C86 14 110 34 114 58 Z" fill="#8be05a" stroke="#2f7a2a" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M106 52 C92 42 78 32 66 22" fill="none" stroke="#2f7a2a" stroke-width="3" stroke-linecap="round" opacity=".5"/>';
      var eyeG = hurt ? '<path d="M92 68 L110 76 L92 84" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M92 68 L113 74 L111 82 Q103 87 94 81 Z" fill="#f4ff8a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><ellipse cx="103" cy="77" rx="2.6" ry="4.6" fill="' + INK + '"/>';
      body =
        '<g class="tail"><path d="M168 196 C184 172 206 162 228 166 C226 192 206 212 172 206 Z" fill="#8be05a" stroke="#2f7a2a" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M178 198 C194 186 208 176 220 170" fill="none" stroke="#2f7a2a" stroke-width="3" stroke-linecap="round" opacity=".5"/></g>' +
        both(legs) +
        '<g class="orn orn-leaf">' + both(leaf) + '</g>' +
        '<path d="M120 92 C170 92 192 126 192 160 C192 198 162 221 120 221 C78 221 48 198 48 160 C48 126 70 92 120 92 Z" fill="' + p.body + '" ' + o + '/>' +
        '<path d="M120 96 L120 219" stroke="' + p.dark + '" stroke-width="4.5" stroke-linecap="round"/>' +
        '<path d="M70 130 C62 150 62 176 72 196 M170 130 C178 150 178 176 168 196" fill="none" stroke="#ffd84a" stroke-width="4.5" stroke-linecap="round" opacity=".85"/>' +
        '<ellipse cx="88" cy="128" rx="20" ry="9" transform="rotate(-32 88 128)" fill="#fff" opacity=".28"/>' +
        '<path d="M120 68 C154 68 174 84 174 104 C174 118 152 124 120 124 C88 124 66 118 66 104 C66 84 86 68 120 68 Z" fill="' + p.shade + '" ' + o + '/>' +
        '<path d="M110 62 C108 38 104 22 92 6 L84 12 C76 2 80 -12 90 -16 C92 -4 100 0 108 2 C112 -8 118 -12 120 -12 C122 -12 128 -8 132 2 C140 0 148 -4 150 -16 C160 -12 164 2 156 12 L148 6 C136 22 132 38 130 62 Z" fill="#e0a93a" stroke="#6b4a12" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M116 54 C116 36 114 24 108 12" fill="none" stroke="#fff2b8" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>' +
        '<path d="M120 54 C142 54 154 64 154 78 C154 90 140 96 120 96 C100 96 86 90 86 78 C86 64 98 54 120 54 Z" fill="' + p.dark + '" stroke="' + INK + '" stroke-width="4"/>' +
        eyeG + mirror(eyeG) +
        '<path d="M110 92 L106 102 L114 98 Z M130 92 L134 102 L126 98 Z" fill="#e0a93a" stroke="#6b4a12" stroke-width="2.5" stroke-linejoin="round"/>';
    }

    return '<svg class="mon mon-legend lg-' + type + '" viewBox="0 -24 240 264" aria-hidden="true" style="--glow:' + L.glow + '">' +
      '<circle class="aura" cx="120" cy="124" r="112" fill="' + L.glow + '"/>' +
      '<ellipse class="mon-ground" cx="120" cy="226" rx="78" ry="11" fill="#000" opacity=".2"/>' +
      '<g class="mon-all"><g class="mon-body">' + body + '</g></g></svg>';
  }

  A.LEGEND = LEGEND;
  A.legend = legend;
})(window);
