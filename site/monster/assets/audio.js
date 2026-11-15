/* 말랑몬 선생님 — 소리
   효과음은 파일 없이 그 자리에서 만들어 내고(Web Audio), 안내 글은 기기의 목소리로 읽어 줘요. */
(function (root) {
  'use strict';
  var ctx = null, master = null, muted = false, voiceOn = true, koVoice = null;

  function unlock() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, t0, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + t0;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(t0, dur, vol, from, to) {
    if (!ctx || muted) return;
    var n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + t0;
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(from || 800, t);
    f.frequency.exponentialRampToValueAtTime(to || from || 800, t + dur);
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  var SFX = {
    tap: function () { tone(620, 0, 0.08, 'sine', 0.25, 900); },
    pop: function () { tone(320, 0, 0.14, 'sine', 0.35, 980); },
    pick: function () { tone(520, 0, 0.07, 'triangle', 0.25); tone(780, 0.06, 0.1, 'triangle', 0.25); },
    drop: function () { tone(440, 0, 0.1, 'sine', 0.3, 260); },
    good: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.08, 0.2, 'triangle', 0.3); }); },
    bad: function () { tone(300, 0, 0.16, 'triangle', 0.22, 240); tone(230, 0.15, 0.24, 'triangle', 0.22, 180); },
    crack: function () { noise(0, 0.07, 0.4, 2400, 1200); tone(180, 0, 0.06, 'square', 0.12); },
    whoosh: function () { noise(0, 0.32, 0.3, 500, 3200); },
    hit: function () { noise(0, 0.2, 0.5, 900, 200); tone(140, 0, 0.2, 'sine', 0.45, 60); },
    bighit: function () { noise(0, 0.36, 0.6, 1400, 160); tone(170, 0, 0.34, 'sine', 0.5, 50); tone(880, 0.02, 0.3, 'triangle', 0.2, 1500); },
    weak: function () { tone(260, 0, 0.12, 'sine', 0.22, 200); },
    think: function () { tone(700, 0, 0.09, 'sine', 0.15); tone(840, 0.14, 0.09, 'sine', 0.15); tone(990, 0.28, 0.09, 'sine', 0.15); },
    learn: function () { tone(880, 0, 0.1, 'sine', 0.25); tone(1320, 0.09, 0.22, 'sine', 0.25); },
    gauge: function () { tone(400, 0, 0.5, 'triangle', 0.18, 1000); },
    fanfare: function () {
      [523, 523, 523, 698, 880, 784, 1047].forEach(function (f, i) { tone(f, [0, 0.12, 0.24, 0.36, 0.56, 0.72, 0.86][i], i === 6 ? 0.7 : 0.18, 'triangle', 0.32); });
      [262, 349, 392, 523].forEach(function (f, i) { tone(f, [0, 0.36, 0.72, 0.86][i], 0.5, 'sine', 0.2); });
    },
    evolve: function () { for (var i = 0; i < 10; i++) tone(300 + i * 90, i * 0.11, 0.16, 'sine', 0.22); },
    heart: function () { tone(660, 0, 0.12, 'sine', 0.28); tone(990, 0.1, 0.2, 'sine', 0.28); }
  };

  function sfx(name) { unlock(); if (SFX[name]) try { SFX[name](); } catch (e) { /* 소리는 없어도 게임은 계속 */ } }

  /* ---- 읽어 주기 ---- */
  function findVoice() {
    if (!root.speechSynthesis) return;
    var vs = root.speechSynthesis.getVoices() || [];
    koVoice = vs.filter(function (v) { return /^ko/i.test(v.lang); })[0] || null;
  }
  if (root.speechSynthesis) {
    findVoice();
    try { root.speechSynthesis.addEventListener('voiceschanged', findVoice); } catch (e) { /* 오래된 브라우저 */ }
  }

  function say(text) {
    if (!voiceOn || muted || !root.speechSynthesis || !root.SpeechSynthesisUtterance) return;
    try {
      root.speechSynthesis.cancel();
      var u = new root.SpeechSynthesisUtterance(String(text).replace(/[^가-힣ㄱ-ㆎ0-9a-zA-Z .,!?~…]/g, ' '));
      u.lang = 'ko-KR'; if (koVoice) u.voice = koVoice;
      u.rate = 1.0; u.pitch = 1.3; u.volume = 1;
      root.speechSynthesis.speak(u);
    } catch (e) { /* 목소리가 없는 기기 */ }
  }
  function hush() { try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* noop */ } }

  root.MMAudio = {
    unlock: unlock, sfx: sfx, say: say, hush: hush,
    setMuted: function (m) { muted = !!m; if (muted) hush(); },
    isMuted: function () { return muted; }
  };
})(window);
