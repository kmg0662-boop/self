(function () {
  "use strict";

  var C = window.COURSE;
  var U = C.units;
  var KEY = "planbe:course:v2";

  // ---------- 저장 (이 기기에만) ----------
  var state = load();
  function load() {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return blank(); }
  }
  function blank() { return { missions: {}, quiz: {}, done: {}, last: "", goal: { what: "", days: [] }, brief: {}, self: { start: {}, end: {} } }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가: 이번 방문 동안만 유지 */ } }

  // ---------- 작은 도구 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function unitById(id) { return U.filter(function (u) { return u.id === id; })[0]; }
  function totalMinutes() { return U.reduce(function (a, u) { return a + u.minutes; }, 0); }
  function doneCount() { return U.filter(function (u) { return state.done[u.id]; }).length; }
  function progress() { return Math.round((doneCount() / U.length) * 100); }
  function started(u) { var m = state.missions[u.id]; return !!(m && m.some(Boolean)); }
  function nextUnit() {
    if (state.last && !state.done[state.last]) return unitById(state.last);
    return U.filter(function (u) { return !state.done[u.id]; })[0] || null;
  }
  function hm(min) { var h = Math.floor(min / 60), m = min % 60; return (h ? h + "시간 " : "") + (m ? m + "분" : ""); }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function promptBox(text, label) {
    return '<div class="prompt"><div class="prompt-head"><span>' + esc(label || "복사해서 쓰는 프롬프트") + '</span><button type="button" class="copy" data-copy>복사</button></div><pre>' + esc(text) + "</pre></div>";
  }

  // ---------- 목차 ----------
  var TOOLS = [
    { id: "prompts", icon: "✎", title: "프롬프트 모음" },
    { id: "brief", icon: "▤", title: "서비스 설명서 작성기" },
    { id: "glossary", icon: "Aa", title: "용어 사전" },
    { id: "skills", icon: "◇", title: "스킬 가이드" },
    { id: "stuck", icon: "?", title: "막혔을 때" }
  ];

  function renderNav(route) {
    var html = '<a class="nav-item' + '" href="#home"' + (route === "home" ? ' aria-current="page"' : "") + '><span class="nav-icon">⌂</span><span>내 학습</span><span></span></a>';
    html += '<div class="nav-group">코스 · ' + hm(totalMinutes()) + "</div>";
    html += U.map(function (u) {
      var cls = "nav-item" + (state.done[u.id] ? " done" : "") + (started(u) ? " started" : "");
      return '<a class="' + cls + '" href="#' + u.id + '"' + (route === u.id ? ' aria-current="page"' : "") + '><span class="nav-no">' + u.no + "</span><span>" + esc(u.title) + '</span><span class="dot" aria-label="' + (state.done[u.id] ? "완료" : "미완료") + '"></span></a>';
    }).join("");
    html += '<div class="nav-group">도구</div>';
    html += TOOLS.map(function (t) {
      return '<a class="nav-item" href="#' + t.id + '"' + (route === t.id ? ' aria-current="page"' : "") + '><span class="nav-icon" aria-hidden="true">' + t.icon + "</span><span>" + esc(t.title) + "</span><span></span></a>";
    }).join("");
    $("#side-nav").innerHTML = html;
    var p = progress();
    $("#sp-value").textContent = p + "%";
    $("#sp-bar").style.width = p + "%";
    $("#top-bar").style.width = p + "%";
  }

  // ---------- 화면: 내 학습 ----------
  var DAYS = ["월", "화", "수", "목", "금", "토", "일"];
  function viewHome() {
    var nx = nextUnit();
    var first = !state.last && doneCount() === 0;
    var left = U.filter(function (u) { return !state.done[u.id]; }).reduce(function (a, u) { return a + u.minutes; }, 0);
    var cta = nx
      ? '<a class="continue" href="#' + nx.id + '"><span><small>' + (first ? "여기서 시작해요" : "이어서 학습하기") + "</small><b>" + nx.no + " · " + esc(nx.title) + '</b></span><span class="go" aria-hidden="true">→</span></a>'
      : '<a class="continue" href="#u7"><span><small>코스 완주!</small><b>이제 두 번째 서비스를 만들어볼까요?</b></span><span class="go" aria-hidden="true">✓</span></a>';
    return '<div class="page">' +
      '<section class="hello"><p class="eyebrow">' + esc(C.title) + "</p><h1>" + (first ? "혼자서도 끝까지,<br>오늘 첫 유닛부터." : "다시 왔네요.<br>이어서 가볼까요?") + '</h1><p class="lead">' + esc(C.promise) + "</p></section>" +
      cta +
      '<div class="stats"><div class="stat"><b>' + doneCount() + "/" + U.length + "</b><span>완료한 유닛</span></div><div class=\"stat\"><b>" + progress() + "%</b><span>진도</span></div><div class=\"stat\"><b>" + (left ? hm(left) : "0분") + "</b><span>남은 시간</span></div></div>" +
      '<section class="section"><h2>코스 지도</h2><div class="unit-list">' + U.map(function (u) {
        var st = state.done[u.id] ? "완료" : started(u) ? "진행 중" : hm(u.minutes);
        return '<a class="unit-row' + (state.done[u.id] ? " done" : "") + '" href="#' + u.id + '"><span class="no">' + u.no + "</span><span><b>" + esc(u.title) + "</b><small>결과물 · " + esc(u.outcome) + '</small></span><span class="state">' + st + "</span></a>";
      }).join("") + "</div></section>" +
      '<section class="section card goal"><h2>내 목표 카드</h2><p class="muted">적어두면 의지가 약한 날에도 돌아올 이유가 돼요. 이 기기에만 저장돼요.</p>' +
      '<div class="field"><label for="goal-what">만들고 싶은 것 한 줄</label><input type="text" id="goal-what" data-goal="what" placeholder="회의가 끝나면 할 일을 자동으로 정리해주는 도구" value="' + esc(state.goal.what) + '"></div>' +
      '<div class="field"><label>공부할 요일 (30분씩)</label><div class="days" role="group" aria-label="공부할 요일">' + DAYS.map(function (d) {
        return '<button type="button" class="day" data-day="' + d + '" aria-pressed="' + (state.goal.days.indexOf(d) !== -1) + '">' + d + "</button>";
      }).join("") + "</div><small>일주일에 세 번이면 약 3주 만에 완주해요.</small></div></section>" +
      selfCheckHtml() +
      "</div>";
  }

  var scPhase = "start";
  function selfCheckHtml() {
    var cur = state.self[scPhase] || {};
    return '<section class="section card selfcheck"><h2>나의 실력 점검</h2><p class="muted">시작할 때 한 번, 끝낼 때 한 번. 1(전혀) ~ 5(자신 있음)</p>' +
      '<div class="sc-tabs" role="group" aria-label="점검 시점"><button type="button" data-phase="start" aria-pressed="' + (scPhase === "start") + '">시작할 때</button><button type="button" data-phase="end" aria-pressed="' + (scPhase === "end") + '">끝낼 때</button></div>' +
      C.selfCheck.map(function (q, i) {
        return '<div class="sc-row"><p>' + esc(q) + '</p><div class="scale" role="group" aria-label="' + esc(q) + '">' + [1, 2, 3, 4, 5].map(function (v) {
          var on = cur[i] === v;
          var before = scPhase === "end" && state.self.start[i] === v ? " title=\"시작할 때 점수\"" : "";
          return '<button type="button" data-sc="' + i + '" data-v="' + v + '" aria-pressed="' + on + '"' + before + ">" + v + "</button>";
        }).join("") + (scPhase === "end" && state.self.start[i] ? '<span class="muted" style="align-self:center;font-size:.85rem">시작: ' + state.self.start[i] + "</span>" : "") + "</div></div>";
      }).join("") + "</section>";
  }

  // ---------- 화면: 유닛 ----------
  function viewUnit(u) {
    state.last = u.id;
    save();
    var i = U.indexOf(u);
    var prev = U[i - 1], next = U[i + 1];
    var m = state.missions[u.id] || [];
    var qs = state.quiz[u.id] || {};
    return '<article class="page">' +
      '<header class="unit-hero"><div class="meta"><span class="tag accent">' + esc(u.level) + '</span><span class="tag">' + hm(u.minutes) + "</span>" + (state.done[u.id] ? '<span class="tag" style="color:var(--ok)">완료</span>' : "") + "</div>" +
      '<h1><span class="no">UNIT ' + u.no + "</span>" + esc(u.title) + '</h1><p class="lead">' + esc(u.lead) + '</p><div class="outcome"><b>결과물</b><span>' + esc(u.outcome) + "</span></div></header>" +
      '<section class="section"><h2><span class="num">01</span>왜 배우나요</h2><p class="why">' + esc(u.why) + "</p></section>" +
      '<section class="section"><h2><span class="num">02</span>핵심 개념</h2><div class="concepts">' + u.concepts.map(function (c) {
        return '<div class="card concept"><h3>' + esc(c.term) + '<span class="like">' + esc(c.like) + "</span></h3><p>" + esc(c.body) + "</p></div>";
      }).join("") + "</div></section>" +
      '<section class="section"><h2><span class="num">03</span>따라하기</h2><ol class="steps">' + u.steps.map(function (s) {
        return '<li><div class="step-body"><p>' + esc(s.text) + "</p>" + (s.prompt ? promptBox(s.prompt) : "") + (s.link ? '<a href="' + s.link + '">' + esc(s.linkText) + " →</a>" : "") + "</div></li>";
      }).join("") + "</ol></section>" +
      '<section class="section"><h2><span class="num">04</span>미션</h2><div class="card mission">' + u.mission.map(function (t, k) {
        return '<label class="check"><input type="checkbox" data-mission="' + k + '"' + (m[k] ? " checked" : "") + "><span>" + esc(t) + "</span></label>";
      }).join("") + "</div></section>" +
      '<section class="section"><h2><span class="num">05</span>확인 퀴즈</h2><div class="quiz">' + u.quiz.map(function (q, k) {
        var picked = qs[k];
        var answered = picked !== undefined;
        return '<div class="q" data-q="' + k + '"><h3>' + esc(q.q) + '</h3><div class="options">' + q.options.map(function (o, oi) {
          var cls = "opt";
          if (answered && oi === q.answer) cls += " right";
          else if (answered && oi === picked) cls += " wrong";
          return '<button type="button" class="' + cls + '" data-opt="' + oi + '"' + (answered ? " disabled" : "") + ">" + esc(o) + "</button>";
        }).join("") + "</div>" + (answered ? explainHtml(q, picked) : "") + "</div>";
      }).join("") + "</div></section>" +
      '<section class="section"><h2><span class="num">06</span>막히면</h2><div>' + u.stuck.map(function (s) {
        return '<details class="stuck"><summary>' + esc(s.symptom) + "</summary><p>" + esc(s.fix) + "</p></details>";
      }).join("") + "</div></section>" +
      '<section class="finish"><h2>' + (state.done[u.id] ? "이 유닛을 마쳤어요." : "미션을 다 했다면") + "</h2><p class=\"muted\">" + (state.done[u.id] ? "다음 유닛으로 넘어가거나, 필요하면 다시 복습하세요." : "완료로 표시하면 진도에 반영되고 다음 유닛이 열려요.") + '</p><div class="finish-row">' +
      (state.done[u.id]
        ? (next ? '<a class="btn accent" href="#' + next.id + '">다음 유닛 →</a>' : '<a class="btn accent" href="#home">내 학습으로</a>') + '<button type="button" class="btn secondary" data-undone>완료 취소</button>'
        : '<button type="button" class="btn accent" data-complete>완료하고 다음으로 →</button>') +
      "</div></section>" +
      '<nav class="pager" aria-label="유닛 이동">' + (prev ? '<a href="#' + prev.id + '"><small>← 이전</small><b>' + esc(prev.title) + "</b></a>" : "<span></span>") + (next ? '<a class="next" href="#' + next.id + '"><small>다음 →</small><b>' + esc(next.title) + "</b></a>" : "") + "</nav>" +
      "</article>";
  }
  function explainHtml(q, picked) {
    var ok = picked === q.answer;
    return '<p class="explain' + (ok ? "" : " no") + '"><b>' + (ok ? "맞아요. " : "아쉬워요. ") + "</b>" + esc(q.explain) + "</p>";
  }

  // ---------- 화면: 도구 ----------
  var promptCat = "전체";
  function viewPrompts() {
    var cats = ["전체"].concat(C.prompts.map(function (p) { return p.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    var list = C.prompts.filter(function (p) { return promptCat === "전체" || p.cat === promptCat; });
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구</p><h1>프롬프트 모음</h1><p class="lead">[대괄호]만 내 상황으로 바꿔서 쓰세요. 마음에 드는 건 유닛 7에서 스킬로 만들어요.</p></header>' +
      '<div class="filters" role="group" aria-label="분류">' + cats.map(function (c) { return '<button type="button" class="filter" data-cat="' + c + '" aria-pressed="' + (c === promptCat) + '">' + c + "</button>"; }).join("") + "</div>" +
      '<div class="prompt-grid">' + list.map(function (p) {
        return '<div class="card prompt-card"><h3><span class="tag">' + esc(p.cat) + "</span>" + esc(p.title) + "</h3>" + promptBox(p.text, "프롬프트") + "</div>";
      }).join("") + "</div></div>";
  }

  function briefText() {
    return "# 서비스 설명서\n" + C.briefFields.map(function (f) {
      var v = (state.brief[f.id] || "").trim();
      return "- " + f.label + ": " + (v || "(" + f.hint + ")");
    }).join("\n");
  }
  function viewBrief() {
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 유닛 3에서 써요</p><h1>서비스 설명서 작성기</h1><p class="lead">일을 넘길 때 쓰는 인수인계서예요. 새 대화를 열거나 도구를 바꿀 때 오른쪽 내용을 통째로 붙여넣으면 AI가 바로 이어서 일해요.</p></header>' +
      '<div class="brief-grid"><form class="card goal" autocomplete="off">' + C.briefFields.map(function (f) {
        var v = esc(state.brief[f.id] || "");
        var input = f.multi
          ? '<textarea id="b-' + f.id + '" data-brief="' + f.id + '" placeholder="' + esc(f.ph) + '">' + v + "</textarea>"
          : '<input type="text" id="b-' + f.id + '" data-brief="' + f.id + '" placeholder="' + esc(f.ph) + '" value="' + v + '">';
        return '<div class="field"><label for="b-' + f.id + '">' + esc(f.label) + "</label>" + input + "<small>" + esc(f.hint) + "</small></div>";
      }).join("") + '<div class="finish-row"><button type="button" class="btn secondary small" data-brief-sample>예시로 채우기</button><button type="button" class="btn secondary small" data-brief-clear>비우기</button></div></form>' +
      '<div id="brief-out">' + promptBox(briefText(), "완성된 설명서") + "</div></div></div>";
  }

  function viewGlossary(q) {
    q = (q || "").trim().toLowerCase();
    var list = C.glossary.filter(function (t) { return !q || (t.term + t.like + t.why).toLowerCase().indexOf(q) !== -1; });
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구</p><h1>용어 사전</h1><p class="lead">모든 용어를 비유와 함께, 왜 알아야 하는지까지.</p></header>' +
      '<div class="search"><input type="text" id="g-search" placeholder="용어를 검색하세요 (예: 배포, 토큰)" aria-label="용어 검색" value="' + esc(q) + '"></div>' +
      '<div class="terms" id="g-list">' + termsHtml(list) + "</div></div>";
  }
  function termsHtml(list) {
    if (!list.length) return '<p class="muted">찾는 용어가 없어요. 다른 말로 검색하거나, 막혔을 때 페이지를 확인하세요.</p>';
    return list.map(function (t) {
      var u = unitById(t.unit);
      return '<div class="term"><h3>' + esc(t.term) + '</h3><span class="like">= ' + esc(t.like) + "</span><p>" + esc(t.why) + "</p>" + (u ? '<a href="#' + u.id + '">유닛 ' + u.no + " · " + esc(u.title) + " →</a>" : "") + "</div>";
    }).join("");
  }

  function stars(n) { var s = ""; for (var i = 1; i <= 3; i++) s += i <= n ? "★" : "<i>★</i>"; return '<span class="stars" aria-label="초급 추천도 ' + n + '">' + s + "</span>"; }
  function viewSkills() {
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 유닛 7에서 써요</p><h1>스킬 가이드</h1><p class="lead">스킬은 고수가 정리한 업무 매뉴얼을 AI에게 장착하는 거예요. 처음에는 별 셋짜리 두세 개만 쓰세요. 장비를 다 껴도 레벨이 낮으면 못 쓰거든요.</p></header>' +
      '<div class="skill-table">' + C.skills.map(function (s) {
        return '<div class="skill"><h3>' + esc(s.name) + "<small>" + esc(s.by) + " · " + esc(s.fit) + "</small></h3>" + stars(s.stars) + "<p>" + esc(s.what) + "</p></div>";
      }).join("") + "</div>" +
      '<section class="section"><h2>스킬을 설치할 수 없는 도구라면</h2><p class="muted">웹앱 빌더(Lovable 등)에는 스킬을 설치할 수 없어요. 대신 아래 원칙을 프로젝트 지침에 붙여넣으면 비슷한 효과가 나요.</p>' + promptBox(C.builderRules, "프로젝트 지침에 붙여넣기") + "</section>" +
      '<p class="muted" style="font-size:.88rem">스킬은 인터넷에서 받는 지시문이자 코드예요. 출처가 분명한 것만 설치하고, 설치 전에 내용을 한 번 읽어보세요.</p></div>';
  }

  function viewStuck() {
    var all = [];
    U.forEach(function (u) { u.stuck.forEach(function (s) { all.push({ s: s, u: u }); }); });
    return '<div class="page"><section class="stuck-hero"><p class="eyebrow">막혔을 때</p><h1>괜찮아요.<br>원래 막히는 거예요.</h1><div class="rule"><div><b>0–15분</b><span>혼자 해보기. 요청을 더 작게.</span></div><div><b>15분</b><span>에러를 그대로 AI에게 붙여넣고 쉬운 설명 받기.</span></div><div><b>그래도</b><span>저장한 버전으로 되돌리고 새 대화에서 설명서부터.</span></div></div></section>' +
      '<section class="section"><h2>에러를 AI에게 옮기는 문장</h2>' + promptBox(C.prompts.filter(function (p) { return p.title === "에러 통역"; })[0].text) + "</section>" +
      '<section class="section"><h2>자주 막히는 순간</h2><div>' + all.map(function (x) {
        return '<details class="stuck"><summary>' + esc(x.s.symptom) + "</summary><p>" + esc(x.s.fix) + ' <a href="#' + x.u.id + '" class="muted">유닛 ' + x.u.no + " →</a></p></details>";
      }).join("") + "</div></section></div>";
  }

  // ---------- 라우팅 ----------
  function route() {
    var r = (location.hash || "#home").slice(1);
    var u = unitById(r);
    var html;
    if (u) html = viewUnit(u);
    else if (r === "prompts") html = viewPrompts();
    else if (r === "brief") html = viewBrief();
    else if (r === "glossary") html = viewGlossary("");
    else if (r === "skills") html = viewSkills();
    else if (r === "stuck") html = viewStuck();
    else { r = "home"; html = viewHome(); }
    $("#view").innerHTML = html;
    renderNav(r);
    closeSide();
    window.scrollTo(0, 0);
    $("#view").focus({ preventScroll: true });
    var t = u ? "UNIT " + u.no + " " + u.title : (TOOLS.filter(function (x) { return x.id === r; })[0] || { title: "내 학습" }).title;
    document.title = t + " · PLAN_Be 독학 코스";
  }
  function current() { return (location.hash || "#home").slice(1); }

  // ---------- 서랍 (모바일) ----------
  function openSide() { $("#side").classList.add("open"); $("#scrim").hidden = false; }
  function closeSide() { $("#side").classList.remove("open"); $("#scrim").hidden = true; }
  $("#menu-btn").addEventListener("click", openSide);
  $("#side-close").addEventListener("click", closeSide);
  $("#scrim").addEventListener("click", closeSide);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSide(); });

  // ---------- 이벤트 ----------
  document.addEventListener("click", function (e) {
    var t = e.target;
    var copy = t.closest("[data-copy]");
    if (copy) {
      var pre = copy.closest(".prompt").querySelector("pre");
      var text = pre.textContent;
      var ok = function () { copy.textContent = "복사됨"; copy.classList.add("done"); setTimeout(function () { copy.textContent = "복사"; copy.classList.remove("done"); }, 1600); };
      var fallback = function () {
        var range = document.createRange(); range.selectNodeContents(pre);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        try { if (document.execCommand("copy")) ok(); else toast("길게 눌러 복사해주세요"); } catch (err) { toast("길게 눌러 복사해주세요"); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
      return;
    }
    var opt = t.closest("[data-opt]");
    if (opt && !opt.disabled) {
      var u = unitById(current());
      var qEl = opt.closest("[data-q]");
      var k = Number(qEl.getAttribute("data-q"));
      var picked = Number(opt.getAttribute("data-opt"));
      state.quiz[u.id] = state.quiz[u.id] || {};
      state.quiz[u.id][k] = picked;
      save();
      var q = u.quiz[k];
      $all(".opt", qEl).forEach(function (b, oi) {
        b.disabled = true;
        if (oi === q.answer) b.classList.add("right");
        else if (oi === picked) b.classList.add("wrong");
      });
      qEl.insertAdjacentHTML("beforeend", explainHtml(q, picked));
      return;
    }
    if (t.closest("[data-complete]")) {
      var cu = unitById(current());
      state.done[cu.id] = true;
      save();
      var nx = U[U.indexOf(cu) + 1];
      toast("UNIT " + cu.no + " 완료! " + (nx ? "다음 유닛으로 가요" : "코스를 완주했어요"));
      location.hash = nx ? nx.id : "home";
      return;
    }
    if (t.closest("[data-undone]")) {
      var uu = unitById(current());
      delete state.done[uu.id];
      save();
      route();
      return;
    }
    var day = t.closest("[data-day]");
    if (day) {
      var d = day.getAttribute("data-day");
      var i = state.goal.days.indexOf(d);
      if (i === -1) state.goal.days.push(d); else state.goal.days.splice(i, 1);
      day.setAttribute("aria-pressed", String(i === -1));
      save();
      return;
    }
    var ph = t.closest("[data-phase]");
    if (ph) { scPhase = ph.getAttribute("data-phase"); $(".selfcheck").outerHTML = selfCheckHtml(); return; }
    var sc = t.closest("[data-sc]");
    if (sc) {
      var row = Number(sc.getAttribute("data-sc"));
      state.self[scPhase][row] = Number(sc.getAttribute("data-v"));
      save();
      $(".selfcheck").outerHTML = selfCheckHtml();
      return;
    }
    var cat = t.closest("[data-cat]");
    if (cat) { promptCat = cat.getAttribute("data-cat"); $("#view").innerHTML = viewPrompts(); return; }
    if (t.closest("[data-brief-sample]")) { C.briefFields.forEach(function (f) { state.brief[f.id] = f.ph; }); save(); route(); return; }
    if (t.closest("[data-brief-clear]")) { state.brief = {}; save(); route(); return; }
  });

  document.addEventListener("change", function (e) {
    var m = e.target.closest("[data-mission]");
    if (m) {
      var u = unitById(current());
      var arr = state.missions[u.id] || [];
      arr[Number(m.getAttribute("data-mission"))] = m.checked;
      state.missions[u.id] = arr;
      save();
      renderNav(u.id);
      var all = u.mission.every(function (_, k) { return arr[k]; });
      if (all && !state.done[u.id]) toast("미션 완료! 아래에서 완료로 표시하세요");
    }
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    var g = t.getAttribute("data-goal");
    if (g) { state.goal[g] = t.value; save(); return; }
    var b = t.getAttribute("data-brief");
    if (b) { state.brief[b] = t.value; save(); var pre = $("#brief-out pre"); if (pre) pre.textContent = briefText(); return; }
    if (t.id === "g-search") {
      var q = t.value.trim().toLowerCase();
      $("#g-list").innerHTML = termsHtml(C.glossary.filter(function (x) { return !q || (x.term + x.like + x.why).toLowerCase().indexOf(q) !== -1; }));
    }
  });

  document.addEventListener("submit", function (e) { e.preventDefault(); });

  window.addEventListener("hashchange", route);
  route();
})();
