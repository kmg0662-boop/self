(function () {
  "use strict";

  var C = window.COURSE;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(sel) { return document.querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // 코스 지도
  var list = $("#units");
  if (list && C) {
    list.innerHTML = C.units.map(function (u) {
      return '<li><a class="unit" href="study.html#' + u.id + '"><span class="no">' + u.no + "</span><h3>" + esc(u.title) + '</h3><span class="min">' + u.minutes + "분</span><p>" + esc(u.lead.split(". ")[0].replace(/\.$/, "")) + ". <b>→ " + esc(u.outcome) + "</b></p></a></li>";
    }).join("");
  }

  // 이어서 하기: 이 기기에 진도가 있으면 버튼을 바꿈
  try {
    var saved = JSON.parse(localStorage.getItem("planbe:course:v2") || "null");
    if (saved && C) {
      var done = saved.done || {};
      var nx = (saved.last && !done[saved.last]) ? saved.last : (C.units.filter(function (u) { return !done[u.id]; })[0] || {}).id;
      if (nx && (saved.last || Object.keys(done).length)) {
        var u = C.units.filter(function (x) { return x.id === nx; })[0];
        $("[data-start-big]").setAttribute("href", "study.html#" + nx);
        $("[data-start-label]").textContent = "이어서 학습하기 · UNIT " + u.no;
        $("[data-start]").textContent = "이어서 학습하기";
        $("[data-start]").setAttribute("href", "study.html#" + nx);
      }
    }
  } catch (e) { /* 저장소 없음: 기본 버튼 유지 */ }

  // 선언문 단어 나누기
  var words = [];
  $all("[data-fill]").forEach(function (p) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement("span");
            s.className = "w";
            s.textContent = part;
            words.push(s);
            frag.appendChild(s);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) { walk(child); }
      });
    })(p);
  });

  var start = $(".start");

  if (reduce) {
    if (start) start.classList.add("seen");
    words.forEach(function (w) { w.classList.add("on"); });
    $all(".tcrei li, .line.add").forEach(function (el) { el.classList.add("on"); });
    var dm = $(".demo"); if (dm) dm.classList.add("started", "sharp");
    return;
  }

  var hero = $("#hero"), manifesto = $(".manifesto"), demo = $(".demo"), bar = $("#bar");
  var film = $(".film"), frame = $(".film-frame"), caps = $all(".cap");
  var darks = $all("[data-dark]");

  // 스크롤 필름: 화면 근처에 오면 영상을 불러오고, 스크롤 진행률을 재생 위치로 씀
  function Film(el) {
    var self = this;
    this.el = el;
    this.video = el.querySelector("video");
    this.p = 0;
    this.cur = 0;
    this.loaded = false;
    this.ready = false;
    this.video.addEventListener("loadeddata", function () {
      self.ready = true;
      el.classList.add("ready");
    });
  }
  Film.prototype.load = function () {
    if (this.loaded) return;
    this.loaded = true;
    var v = this.video, src = v.getAttribute("data-src");
    if (!src || src.indexOf("__") === 0) return;
    v.preload = "auto";
    v.src = src;
    v.load();
    // iOS 사파리는 한 번 재생해야 첫 프레임을 그림
    var pr = v.play();
    if (pr && pr.then) pr.then(function () { v.pause(); }).catch(function () {});
  };
  Film.prototype.set = function (p) {
    this.p = p;
    this.el.style.setProperty("--fp", p.toFixed(3));
  };
  Film.prototype.tick = function () {
    var v = this.video;
    if (!this.ready || !v.duration) return;
    var target = this.p * (v.duration - 0.05);
    this.cur += (target - this.cur) * 0.18;
    if (Math.abs(this.cur - target) < 0.004) this.cur = target;
    if (!v.seeking && Math.abs(v.currentTime - this.cur) > 0.02) v.currentTime = this.cur;
  };
  var films = $all(".film-media").map(function (el) { return new Film(el); });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        films.forEach(function (f) { if (f.el === e.target) f.load(); });
        io.unobserve(e.target);
      });
    }, { rootMargin: "150% 0px" });
    films.forEach(function (f) { io.observe(f.el); });
  } else {
    films.forEach(function (f) { f.load(); });
  }
  function filmFor(sec) { return films.filter(function (f) { return sec && sec.contains(f.el); })[0]; }
  var fManifesto = filmFor(manifesto), fFilm = filmFor(film), fStart = filmFor(start);
  (function loop() {
    films.forEach(function (f) { f.tick(); });
    requestAnimationFrame(loop);
  })();
  var marks = $all(".tcrei li").concat($all(".line.add"));
  var units = $all(".unit");

  function sceneP(sec) {
    var r = sec.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }

  function update() {
    var vh = window.innerHeight;
    if (hero) {
      var p = sceneP(hero);
      hero.style.setProperty("--p", p.toFixed(4));
      hero.style.setProperty("--strike", ease(seg(p, 0.04, 0.32)).toFixed(4));
      hero.style.setProperty("--collapse", ease(seg(p, 0.32, 0.62)).toFixed(4));
      hero.style.setProperty("--reveal", ease(seg(p, 0.55, 0.86)).toFixed(4));
      hero.style.setProperty("--weigh", seg(p, 0, 0.9).toFixed(4));
    }
    if (manifesto) {
      var mp = sceneP(manifesto);
      if (fManifesto) fManifesto.set(Math.min(1, mp * 1.12));
      var lit = Math.round(Math.min(1, mp * 1.12) * words.length);
      words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
    }
    if (demo) {
      var dp = sceneP(demo);
      demo.classList.toggle("started", dp > 0.08);
      demo.classList.toggle("sharp", dp > 0.66);
      marks.forEach(function (el) { el.classList.toggle("on", dp >= Number(el.getAttribute("data-at"))); });
    }
    units.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - vh * 0.52) / (vh * 0.5);
      el.style.setProperty("--f", Math.max(0, 1 - d * 0.9).toFixed(3));
    });
    if (film && frame) {
      var fp = sceneP(film), open = ease(seg(fp, 0, 0.26));
      frame.style.setProperty("--inset-y", ((1 - open) * 14).toFixed(2) + "%");
      frame.style.setProperty("--inset-x", ((1 - open) * 16).toFixed(2) + "%");
      frame.style.setProperty("--round", ((1 - open) * 28).toFixed(1) + "px");
      frame.style.setProperty("--zoom", (1.08 - open * 0.08).toFixed(4));
      if (fFilm) fFilm.set(seg(fp, 0.08, 0.96));
      caps.forEach(function (c) {
        c.classList.toggle("on", fp >= Number(c.getAttribute("data-from")) && fp < Number(c.getAttribute("data-to")));
      });
    }
    if (start) {
      var sp = sceneP(start);
      if (fStart) fStart.set(sp);
      start.classList.toggle("seen", sp > 0.55);
    }
    if (bar) {
      bar.classList.toggle("invert", darks.some(function (d) {
        var r = d.getBoundingClientRect();
        if (d === film) return r.top <= 40 && r.bottom > 40 && seg(sceneP(film), 0, 0.26) > 0.85;
        return r.top <= 40 && r.bottom > 40;
      }));
    }
  }

  var ticking = false;
  function queue() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
})();
