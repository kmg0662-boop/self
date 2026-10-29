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

  // 마지막 장면: 보이면 Plan B에 줄을 그음
  var start = $(".start");
  if (start && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es, io) {
      es.forEach(function (e) { if (e.isIntersecting) { start.classList.add("seen"); io.disconnect(); } });
    }, { threshold: 0.45 }).observe(start);
  } else if (start) { start.classList.add("seen"); }

  if (reduce) {
    words.forEach(function (w) { w.classList.add("on"); });
    $all(".tcrei li, .line.add").forEach(function (el) { el.classList.add("on"); });
    var dm = $(".demo"); if (dm) dm.classList.add("started", "sharp");
    return;
  }

  var hero = $("#hero"), manifesto = $(".manifesto"), demo = $(".demo"), bar = $("#bar");
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
      var lit = Math.round(Math.min(1, sceneP(manifesto) * 1.12) * words.length);
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
    if (bar && manifesto) {
      var mr = manifesto.getBoundingClientRect();
      bar.classList.toggle("invert", mr.top <= 40 && mr.bottom > 40);
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
