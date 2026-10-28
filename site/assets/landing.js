(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // 첫 화면 글자를 한 자씩 나눔 (형광펜 <mark> 안쪽도 유지)
  var idx = 0;
  function splitChars(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          var wd = document.createElement("span");
          wd.className = "wd";
          Array.prototype.forEach.call(part, function (c) {
            var s = document.createElement("span");
            s.className = "ch";
            s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--i", idx++);
            s.textContent = c;
            wd.appendChild(s);
          });
          frag.appendChild(wd);
        });
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        splitChars(child);
      }
    });
  }
  var mega = document.querySelector("[data-kinetic]");
  if (mega) $all(".row", mega).forEach(splitChars);
  var chars = $all(".mega .ch");

  // 선언문을 단어로 나눔
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
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(p);
  });

  // 마우스 가까운 글자일수록 굵어짐
  var mouse = null;
  if (!reduce) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      mouse = { x: e.clientX, y: e.clientY };
      queue();
    }, { passive: true });
    document.addEventListener("pointerleave", function () { mouse = null; queue(); });
  }
  function weighChars() {
    chars.forEach(function (ch) {
      if (!mouse) { ch.style.removeProperty("--w"); return; }
      var r = ch.getBoundingClientRect();
      var dx = mouse.x - (r.left + r.width / 2);
      var dy = mouse.y - (r.top + r.height / 2);
      var d = Math.sqrt(dx * dx + dy * dy);
      var reach = Math.max(180, window.innerWidth * 0.18);
      var t = Math.max(0, 1 - d / reach);
      ch.style.setProperty("--w", Math.round(300 + t * 600));
    });
  }

  // 스크롤 진행도: 장면마다 0~1을 --p로 넣음
  var scenes = $all("[data-scene]");
  var track = document.querySelector("[data-track]");
  var stepItems = $all("[data-steps] li");
  var stepNo = document.querySelector("[data-stepno]");
  var lastStep = 0;
  var bar = document.querySelector(".bar");
  var runSec = document.querySelector(".run");
  var stuckSec = document.querySelector(".stuck");
  function under(sec) { if (!sec) return false; var r = sec.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; }

  function measure() {
    if (track) track.style.setProperty("--shift", Math.max(0, track.scrollWidth - window.innerWidth + 40));
  }

  function update() {
    var vh = window.innerHeight;
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - vh);
    document.body.style.setProperty("--page", Math.min(1, window.scrollY / max).toFixed(4));

    scenes.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      var span = sec.classList.contains("hero") ? r.height : r.height - vh;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      sec.style.setProperty("--p", p.toFixed(4));

      if (sec.classList.contains("manifesto")) {
        var lit = Math.round(Math.min(1, p * 1.15) * words.length);
        words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
      }
      if (sec.classList.contains("steps") && stepItems.length) {
        var n = Math.min(stepItems.length - 1, Math.floor(p * stepItems.length * 0.999));
        stepItems.forEach(function (li, i) {
          li.classList.toggle("on", i === n);
          li.classList.toggle("done", i < n);
        });
        if (n !== lastStep && stepNo) {
          stepNo.textContent = (n < 9 ? "0" : "") + (n + 1);
          stepNo.classList.remove("flip");
          void stepNo.offsetWidth;
          stepNo.classList.add("flip");
          lastStep = n;
        }
      }
    });
    if (bar) {
      bar.classList.toggle("on-run", under(runSec));
      bar.classList.toggle("on-stuck", under(stuckSec));
    }
    weighChars();
  }

  var ticking = false;
  function queue() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }

  if (reduce) {
    words.forEach(function (w) { w.classList.add("on"); });
    return;
  }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", function () { measure(); queue(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); queue(); });
  measure();
  update();
})();
