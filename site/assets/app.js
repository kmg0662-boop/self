(function () {
  "use strict";

  var C = window.COURSE;
  var U = C.units;
  var CORE = U.filter(function (u) { return !u.optional; }); // 보너스(선택) 유닛은 진도에서 빠짐
  var KEY = "planbe:course:v2";

  // ---------- 저장 (이 기기에만) ----------
  var state = load();
  function load() {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return blank(); }
  }
  function blank() { return { missions: {}, quiz: {}, done: {}, doneAt: {}, review: {}, reflect: {}, last: "", goal: { what: "", days: [] }, brief: {}, self: { start: {}, end: {} }, portfolio: { name: "", url: "", lesson: "" } }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가: 이번 방문 동안만 유지 */ } }

  // ---------- 작은 도구 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function unitById(id) { return U.filter(function (u) { return u.id === id; })[0]; }
  function totalMinutes() { return CORE.reduce(function (a, u) { return a + u.minutes; }, 0); }
  function doneCount() { return CORE.filter(function (u) { return state.done[u.id]; }).length; }
  function progress() { return Math.round((doneCount() / CORE.length) * 100); }
  function started(u) { var m = state.missions[u.id]; return !!(m && m.some(Boolean)); }
  function nextUnit() {
    if (state.last && !state.done[state.last]) return unitById(state.last);
    return CORE.filter(function (u) { return !state.done[u.id]; })[0] || null;
  }
  var BONUS = U.filter(function (u) { return u.optional; });
  function bonusDone() { return BONUS.filter(function (u) { return state.done[u.id]; }).length; }

  // ---------- 다섯 계단 ----------
  var S = C.stages;
  function stageOf(u) { return S.filter(function (s) { return s.units.indexOf(u.id) !== -1; })[0]; }
  function stageUnits(s) { return s.units.map(unitById); }
  function stageDone(s) { return s.units.filter(function (id) { return state.done[id]; }).length; }
  function stageById(no) { return S.filter(function (s) { return String(s.no) === String(no); })[0]; }
  function nowStage() {
    var nx = nextUnit();
    if (nx) return stageOf(nx);
    return S.filter(function (s) { return stageDone(s) < s.units.length; })[0] || S[S.length - 1];
  }
  function stepLabel(s) { return "STEP " + s.no + " · " + s.name; }
  function chipsHtml(list, cls) { return '<span class="chips' + (cls ? " " + cls : "") + '">' + list.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + "</span>"; }

  // ---------- 간격 복습: 완료 후 1일 → 3일 → 7일 ----------
  var DAY = 24 * 60 * 60 * 1000;
  var GAPS = [1, 3, 7];
  var reviewSeen = {}; // 이번 방문에서 푼 복습 문항 (답과 해설을 계속 보여주려고)
  function reviewQuestion(u, r) { return u.quiz[(r.stage + u.quiz.length - 1) % u.quiz.length]; }
  function dueReviews() {
    var now = Date.now();
    return U.filter(function (u) {
      if (!state.done[u.id] || !state.doneAt[u.id] || reviewSeen[u.id]) return false;
      var r = state.review[u.id] || { stage: 0, at: state.doneAt[u.id] };
      return r.stage < GAPS.length && now - r.at >= GAPS[r.stage] * DAY;
    }).slice(0, 3);
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
    { id: "portfolio", icon: "◎", title: "내 포트폴리오" },
    { id: "prompts", icon: "✎", title: "프롬프트 모음" },
    { id: "brief", icon: "▤", title: "서비스 설명서 작성기" },
    { id: "glossary", icon: "Aa", title: "용어 사전" },
    { id: "map", icon: "▦", title: "AI 사용 지도" },
    { id: "cheats", icon: "▭", title: "한 장 치트시트" },
    { id: "devkit", icon: "⌘", title: "개발 도구 지도" },
    { id: "recipes", icon: "☰", title: "직무별 레시피" },
    { id: "skills", icon: "◇", title: "스킬 가이드" },
    { id: "stuck", icon: "?", title: "막혔을 때" }
  ];

  function renderNav(route) {
    var html = '<a class="nav-item' + '" href="#home"' + (route === "home" ? ' aria-current="page"' : "") + '><span class="nav-icon">⌂</span><span>내 학습</span><span></span></a>';
    html += S.map(function (s) {
      return '<div class="nav-group nav-stage"><span>' + stepLabel(s) + (s.bonus ? " · 선택" : "") + '</span><span class="nav-count">' + stageDone(s) + "/" + s.units.length + "</span></div>" +
        stageUnits(s).map(function (u) {
          var cls = "nav-item" + (state.done[u.id] ? " done" : "") + (started(u) ? " started" : "");
          return '<a class="' + cls + '" href="#' + u.id + '"' + (route === u.id ? ' aria-current="page"' : "") + '><span class="nav-no">' + u.no + "</span><span>" + esc(u.title) + '</span><span class="dot" aria-label="' + (state.done[u.id] ? "완료" : "미완료") + '"></span></a>';
        }).join("");
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
    var left = CORE.filter(function (u) { return !state.done[u.id]; }).reduce(function (a, u) { return a + u.minutes; }, 0);
    var bx = BONUS.filter(function (u) { return !state.done[u.id]; })[0];
    var cta = nx
      ? '<a class="continue" href="#' + nx.id + '"><span><small>' + (first ? "여기서 시작해요" : "이어서 학습하기") + "</small><b>" + nx.no + " · " + esc(nx.title) + '</b></span><span class="go" aria-hidden="true">→</span></a>'
      : '<a class="continue" href="#' + (bx ? bx.id : "portfolio") + '"><span><small>기본 코스 완주!</small><b>' + (bx ? "보너스 · " + esc(bx.title) : "이제 두 번째 서비스를 만들어볼까요?") + '</b></span><span class="go" aria-hidden="true">✓</span></a>';
    return '<div class="page">' +
      '<section class="hello"><p class="eyebrow">' + esc(C.title) + "</p><h1>" + (first ? "혼자서도 끝까지,<br>오늘 첫 유닛부터." : "다시 왔네요.<br>이어서 가볼까요?") + '</h1><p class="lead">' + esc(C.promise) + "</p></section>" +
      cta + (nx ? "" : '<a class="pf-link" href="#portfolio">내 포트폴리오 만들기 →</a>') + ladderHtml() + reviewHtml() +
      '<div class="stats"><div class="stat"><b>' + doneCount() + "/" + CORE.length + "</b><span>완료한 유닛</span></div><div class=\"stat\"><b>" + progress() + "%</b><span>진도</span></div><div class=\"stat\"><b>" + (left ? hm(left) : "0분") + "</b><span>남은 시간</span></div></div>" +
      '<section class="section"><h2>코스 지도</h2><p class="muted">유닛 ' + U.length + "개를 다섯 계단으로 묶었어요. 계단을 오를 때마다 쓰는 도구와 새로 알 말이 바뀌어요. 기본 코스는 STEP 3까지, 약 " + hm(totalMinutes()) + "이에요.</p>" + S.map(function (s) {
        return '<div class="stage-block' + (s === nowStage() ? " now" : "") + '"><div class="stage-head"><span class="stage-no">STEP ' + s.no + "</span><div><b>" + esc(s.name) + " · " + esc(s.title) + (s.bonus ? ' <i class="bonus">보너스</i>' : "") + "</b><small>" + esc(s.sub) + '</small></div><span class="state">' + stageDone(s) + "/" + s.units.length + '</span></div><div class="unit-list">' + stageUnits(s).map(function (u) {
          var st = state.done[u.id] ? "완료" : started(u) ? "진행 중" : hm(u.minutes);
          return '<a class="unit-row' + (state.done[u.id] ? " done" : "") + '" href="#' + u.id + '"><span class="no">' + u.no + "</span><span><b>" + esc(u.title) + "</b><small>결과물 · " + esc(u.outcome) + '</small></span><span class="state">' + st + "</span></a>";
        }).join("") + "</div></div>";
      }).join("") + "</section>" +
      '<section class="section card goal"><h2>내 목표 카드</h2><p class="muted">적어두면 의지가 약한 날에도 돌아올 이유가 돼요. 이 기기에만 저장돼요.</p>' +
      '<div class="field"><label for="goal-what">만들고 싶은 것 한 줄</label><input type="text" id="goal-what" data-goal="what" placeholder="회의가 끝나면 할 일을 자동으로 정리해주는 도구" value="' + esc(state.goal.what) + '"></div>' +
      '<div class="field"><label>공부할 요일 (30분씩)</label><div class="days" role="group" aria-label="공부할 요일">' + DAYS.map(function (d) {
        return '<button type="button" class="day" data-day="' + d + '" aria-pressed="' + (state.goal.days.indexOf(d) !== -1) + '">' + d + "</button>";
      }).join("") + "</div><small>일주일에 세 번이면 약 3주 만에 완주해요.</small></div></section>" +
      selfCheckHtml() +
      "</div>";
  }

  // 지금 여기: 다섯 계단 중 현재 위치와 이 단계에서 할 일
  function ladderHtml() {
    var cur = nowStage();
    return '<section class="ladder" aria-label="코스 단계"><ol class="ladder-steps">' + S.map(function (s) {
      var full = stageDone(s) === s.units.length;
      var cls = (full ? "done" : "") + (s === cur ? " now" : "") + (s.bonus ? " opt" : "");
      return '<li class="' + cls.trim() + '"' + (s === cur ? ' aria-current="step"' : "") + '><span class="ls-no">' + (full ? "✓" : s.no) + "</span><b>" + esc(s.name) + "</b><small>" + (s === cur ? "지금 여기" : s.bonus ? "선택" : stageDone(s) + "/" + s.units.length) + "</small></li>";
    }).join("") + "</ol>" +
      '<div class="card stage-now"><p class="eyebrow">지금 여기 · ' + stepLabel(cur) + "</p><h2>" + esc(cur.title) + '</h2><p class="muted">' + esc(cur.sub) + "</p>" +
      '<dl class="stage-dl"><div><dt>어디서</dt><dd>' + esc(cur.tool) + "</dd></div><div><dt>이 단계를 마치면</dt><dd>" + esc(cur.unlock) + "</dd></div><div><dt>꼭 알 말</dt><dd>" + chipsHtml(cur.must) + "</dd></div></dl>" +
      '<div class="finish-row"><button type="button" class="btn secondary small" data-gstage="' + cur.no + '">이 단계 용어 보기</button><a class="btn secondary small" href="#cheats">한 장 치트시트</a><a class="btn secondary small" href="#map">AI 사용 지도</a></div></div></section>';
  }

  function reviewHtml() {
    var due = dueReviews();
    var seen = Object.keys(reviewSeen);
    if (!due.length && !seen.length) return "";
    var items = seen.map(function (id) { return { u: unitById(id), seen: reviewSeen[id] }; }).concat(due.map(function (u) { return { u: u }; }));
    return '<section class="section card review" id="review"><h2>오늘의 복습</h2><p class="muted">끝낸 유닛을 1일, 3일, 7일 뒤에 한 문제씩 다시 꺼내요. 꺼내 볼 때 기억이 단단해져요.</p>' +
      items.map(function (it) {
        var u = it.u, q = it.seen ? it.seen.q : reviewQuestion(u, state.review[u.id] || { stage: 0 });
        var picked = it.seen ? it.seen.picked : undefined, answered = picked !== undefined;
        return '<div class="q rv" data-rv="' + u.id + '"><p class="rv-from">UNIT ' + u.no + " · " + esc(u.title) + "</p><h3>" + esc(q.q) + '</h3><div class="options">' + q.options.map(function (o, oi) {
          var cls = "opt" + (answered && oi === q.answer ? " right" : answered && oi === picked ? " wrong" : "");
          return '<button type="button" class="' + cls + '" data-ropt="' + oi + '"' + (answered ? " disabled" : "") + ">" + esc(o) + "</button>";
        }).join("") + "</div>" + (answered ? explainHtml(q, picked) + '<p class="rv-next muted">' + (picked === q.answer ? (it.seen.stage >= GAPS.length ? "이 유닛 복습은 끝났어요." : "다음 복습은 " + GAPS[it.seen.stage] + "일 뒤예요.") : "내일 다시 나와요. 유닛을 한 번 훑어봐도 좋아요.") + "</p>" : "") + "</div>";
      }).join("") + "</section>";
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
    var st = stageOf(u), si = st.units.indexOf(u.id);
    return '<article class="page">' +
      '<header class="unit-hero"><p class="crumb"><a href="#map">' + stepLabel(st) + "</a><span>" + esc(st.title) + " · " + (si + 1) + "/" + st.units.length + '번째 유닛</span></p><div class="meta"><span class="tag accent">' + esc(u.level) + "</span>" + (u.optional ? '<span class="tag">선택</span>' : "") + '<span class="tag">' + hm(u.minutes) + "</span>" + (state.done[u.id] ? '<span class="tag" style="color:var(--ok)">완료</span>' : "") + "</div>" +
      '<h1><span class="no">UNIT ' + u.no + "</span>" + esc(u.title) + '</h1><p class="lead">' + esc(u.lead) + '</p><div class="outcome"><b>결과물</b><span>' + esc(u.outcome) + "</span></div>" + (u.place ? '<div class="outcome place"><b>어디서</b><span>' + esc(u.place) + "</span></div>" : "") + "</header>" +
      '<section class="section"><h2><span class="num">01</span>왜 배우나요</h2><p class="why">' + esc(u.why) + "</p></section>" +
      '<section class="section"><h2><span class="num">02</span>핵심 개념</h2><div class="concepts">' + u.concepts.map(function (c) {
        return '<div class="card concept"><h3>' + esc(c.term) + '<span class="like">' + esc(c.like) + "</span></h3><p>" + esc(c.body) + "</p>" + figHtml(c.fig) + "</div>";
      }).join("") + "</div></section>" +
      (u.case ? '<section class="section"><h2><span class="num">03</span>민지의 사례</h2><div class="case"><p class="case-story">' + esc(u.case.story) + "</p>" +
        (u.case.draft ? '<div class="case-draft"><p class="case-label">처음 버전</p><pre>' + esc(u.case.draft) + '</pre><p class="case-miss"><b>아쉬웠던 점</b> ' + esc(u.case.miss) + "</p></div>" : "") +
        promptBox(u.case.artifact, "고친 버전") + '<p class="case-note"><b>볼 포인트</b> ' + esc(u.case.note) + "</p></div></section>" : "") +
      '<section class="section"><h2><span class="num">04</span>따라하기</h2><ol class="steps">' + u.steps.map(function (s) {
        return '<li><div class="step-body"><p>' + esc(s.text) + "</p>" + (s.prompt ? promptBox(s.prompt) : "") + (s.link ? '<a href="' + s.link + '">' + esc(s.linkText) + " →</a>" : "") + "</div></li>";
      }).join("") + "</ol></section>" +
      '<section class="section"><h2><span class="num">05</span>미션</h2><div class="card mission">' + u.mission.map(function (t, k) {
        return '<label class="check"><input type="checkbox" data-mission="' + k + '"' + (m[k] ? " checked" : "") + "><span>" + esc(t) + "</span></label>";
      }).join("") + "</div></section>" +
      '<section class="section"><h2><span class="num">06</span>확인 퀴즈</h2><div class="quiz">' + u.quiz.map(function (q, k) {
        var picked = qs[k];
        var answered = picked !== undefined;
        return '<div class="q" data-q="' + k + '"><h3>' + esc(q.q) + '</h3><div class="options">' + q.options.map(function (o, oi) {
          var cls = "opt";
          if (answered && oi === q.answer) cls += " right";
          else if (answered && oi === picked) cls += " wrong";
          return '<button type="button" class="' + cls + '" data-opt="' + oi + '"' + (answered ? " disabled" : "") + ">" + esc(o) + "</button>";
        }).join("") + "</div>" + (answered ? explainHtml(q, picked) : "") + "</div>";
      }).join("") + "</div></section>" +
      '<section class="section check-self"><h2><span class="num">07</span>스스로 점검</h2>' +
      '<div class="think"><p class="eyebrow">생각해볼 질문</p><ol>' + (u.think || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></div>" +
      '<div class="tutor"><h3>AI 튜터에게 확인받기</h3><p class="muted">아래 프롬프트를 대화형 AI에 붙여넣으면, 이 유닛을 이해했는지 질문으로 확인해줘요. 정답 대신 힌트를 주도록 되어 있어요.</p>' + promptBox(tutorText(u), "AI 튜터 프롬프트") + "</div>" +
      '<div class="field reflect"><label for="reflect-' + u.id + '">친구에게 한 문장으로 설명한다면?</label><textarea id="reflect-' + u.id + '" data-reflect="' + u.id + '" rows="2" placeholder="예: AI는 내가 상황을 알려줘야 나만을 위한 답을 줘.">' + esc(state.reflect[u.id] || "") + "</textarea><small>이 기기에만 저장돼요. 한 문장으로 못 쓰겠다면 그 부분을 튜터에게 물어보세요.</small></div></section>" +
      '<section class="section"><h2><span class="num">08</span>막히면</h2><div>' + u.stuck.map(function (s) {
        return '<details class="stuck"><summary>' + esc(s.symptom) + "</summary><p>" + esc(s.fix) + "</p></details>";
      }).join("") + "</div></section>" +
      '<section class="finish"><h2>' + (state.done[u.id] ? "이 유닛을 마쳤어요." : "미션을 다 했다면") + "</h2><p class=\"muted\">" + (state.done[u.id] ? "다음 유닛으로 넘어가거나, 필요하면 다시 복습하세요." : "완료로 표시하면 진도에 반영되고 다음 유닛이 열려요.") + '</p><div class="finish-row">' +
      (state.done[u.id]
        ? (next ? '<a class="btn accent" href="#' + next.id + '">다음 유닛 →</a>' : '<a class="btn accent" href="#home">내 학습으로</a>') + '<button type="button" class="btn secondary" data-undone>완료 취소</button>'
        : '<button type="button" class="btn accent" data-complete>완료하고 다음으로 →</button>') +
      "</div></section>" + stageNextHtml(u) +
      '<nav class="pager" aria-label="유닛 이동">' + (prev ? '<a href="#' + prev.id + '"><small>← 이전</small><b>' + esc(prev.title) + "</b></a>" : "<span></span>") + (next ? '<a class="next" href="#' + next.id + '"><small>다음 →</small><b>' + esc(next.title) + "</b></a>" : "") + "</nav>" +
      "</article>";
  }
  // 단계의 마지막 유닛이면: 이 단계로 할 수 있게 된 것 + 다음 계단 미리보기
  function stageNextHtml(u) {
    var st = stageOf(u);
    if (st.units[st.units.length - 1] !== u.id) return "";
    var nx = S[S.indexOf(st) + 1];
    var full = stageDone(st) === st.units.length;
    return '<section class="card stage-next"><p class="eyebrow">' + (full ? stepLabel(st) + " 완료" : stepLabel(st) + "의 마지막 유닛") + "</p><h2>" + (full ? "한 계단 올라왔어요." : "이 유닛을 마치면 한 계단 올라가요.") + "</h2>" +
      '<p><b>이제 할 수 있는 것</b> ' + esc(st.unlock) + "</p>" +
      (nx ? '<div class="stage-peek"><p class="eyebrow">다음 계단 · ' + stepLabel(nx) + (nx.bonus ? " (선택)" : "") + "</p><h3>" + esc(nx.title) + "</h3><p>" + esc(nx.sub) + '</p><dl class="stage-dl"><div><dt>도구가 바뀌어요</dt><dd>' + esc(nx.tool) + "</dd></div><div><dt>새로 만날 말</dt><dd>" + chipsHtml(nx.must) + "</dd></div></dl>" +
        (nx.bonus && !st.bonus ? '<p class="muted">기본 코스는 여기까지예요. 다음 계단부터는 보너스라서, 필요할 때 와도 괜찮아요.</p>' : "") + "</div>"
        : '<p class="muted">마지막 계단이에요. 이제 내 일에서 반복되는 것을 찾아 하나씩 맡겨 보세요.</p>') + "</section>";
  }
  function figHtml(key) {
    var f = key && window.FIGS && window.FIGS[key];
    return f ? '<figure class="fig" role="img" aria-label="' + esc(f.label) + '">' + f.svg + "</figure>" : "";
  }
  function tutorText(u) {
    return C.tutorTemplate.replace("{title}", "UNIT " + u.no + " " + u.title).replace("{concepts}", u.concepts.map(function (c) { return c.term; }).join(", "));
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
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구</p><h1>프롬프트 모음</h1><p class="lead">[대괄호]만 내 상황으로 바꿔서 쓰세요. 마음에 드는 건 유닛 08에서 스킬로 만들어요.</p></header>' +
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
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 유닛 04에서 써요</p><h1>서비스 설명서 작성기</h1><p class="lead">일을 넘길 때 쓰는 인수인계서예요. 새 대화를 열거나 도구를 바꿀 때 오른쪽 내용을 통째로 붙여넣으면 AI가 바로 이어서 일해요.</p></header>' +
      '<div class="brief-grid"><form class="card goal" autocomplete="off">' + C.briefFields.map(function (f) {
        var v = esc(state.brief[f.id] || "");
        var input = f.multi
          ? '<textarea id="b-' + f.id + '" data-brief="' + f.id + '" placeholder="' + esc(f.ph) + '">' + v + "</textarea>"
          : '<input type="text" id="b-' + f.id + '" data-brief="' + f.id + '" placeholder="' + esc(f.ph) + '" value="' + v + '">';
        return '<div class="field"><label for="b-' + f.id + '">' + esc(f.label) + "</label>" + input + "<small>" + esc(f.hint) + "</small></div>";
      }).join("") + '<div class="finish-row"><button type="button" class="btn secondary small" data-brief-sample>예시로 채우기</button><button type="button" class="btn secondary small" data-brief-clear>비우기</button></div></form>' +
      '<div id="brief-out">' + promptBox(briefText(), "완성된 설명서") + "</div></div></div>";
  }

  // 용어 사전 = 코스 용어 + 개발 도구 지도의 용어
  var ALL_TERMS = C.glossary.concat([].concat.apply([], C.devkit.map(function (g) {
    return g.terms.map(function (t) { return { term: t.term, like: t.like, why: t.why, body: t.body, stage: "dev", group: g }; });
  })));
  var GLOSS_CATS = [{ id: "all", label: "전체" }].concat(S.map(function (s) { return { id: String(s.no), label: s.no + " " + s.name }; }), [{ id: "dev", label: "개발 도구" }]);
  var glossCat = "all", glossQ = "";
  function glossList() {
    var q = glossQ.trim().toLowerCase();
    return ALL_TERMS.filter(function (t) {
      return (glossCat === "all" || String(t.stage) === glossCat) && (!q || (t.term + (t.en || "") + t.like + t.why + (t.body || "")).toLowerCase().indexOf(q) !== -1);
    });
  }
  function viewGlossary() {
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구</p><h1>용어 사전</h1><p class="lead">모든 용어를 비유와 함께, 왜 알아야 하는지까지. 몇 번째 계단에서 알면 되는지로 나눴어요. 하네스·훅·MCP 같은 에이전트 용어와 GitHub·npx 같은 개발 용어도 들어 있어요.</p></header>' +
      '<div class="search"><input type="text" id="g-search" placeholder="용어를 검색하세요 (예: 하네스, 훅, npx, 배포)" aria-label="용어 검색" value="' + esc(glossQ) + '"></div>' +
      '<div class="filters" role="group" aria-label="용어 분류">' + GLOSS_CATS.map(function (c) { return '<button type="button" class="filter" data-gcat="' + c.id + '" aria-pressed="' + (c.id === glossCat) + '">' + esc(c.label) + "</button>"; }).join("") + "</div>" +
      '<div class="terms" id="g-list">' + termsHtml(glossList()) + "</div></div>";
  }
  function termsHtml(list) {
    if (!list.length) return '<p class="muted">찾는 용어가 없어요. 다른 말로 검색하거나, 막혔을 때 페이지를 확인하세요.</p>';
    return list.map(function (t) {
      var u = unitById(t.unit);
      var link = u ? '<a href="#' + u.id + '">유닛 ' + u.no + " · " + esc(u.title) + " →</a>" : t.group ? '<a href="#devkit">개발 도구 지도 · ' + esc(t.group.title) + " →</a>" : "";
      var s = t.stage && t.stage !== "dev" ? stageById(t.stage) : null;
      var badges = (s ? '<span class="tbadge">STEP ' + s.no + " " + esc(s.name) + "</span>" : "") + (t.later ? '<span class="tbadge later">나중에 알아도 돼요</span>' : "") + (t.old ? '<span class="tbadge old">옛 용어</span>' : "");
      return '<div class="term">' + (badges ? '<p class="tbadges">' + badges + "</p>" : "") + "<h3>" + esc(t.term) + (t.en ? "<small>" + esc(t.en) + "</small>" : "") + '</h3><span class="like">= ' + esc(t.like) + "</span>" + (t.body ? '<p class="body">' + esc(t.body) + "</p>" : "") + '<p class="why">' + (t.body ? "<b>왜?</b> " : "") + esc(t.why) + "</p>" + link + "</div>";
    }).join("");
  }

  // ---------- 화면: AI 사용 지도 ----------
  function viewMap() {
    var M = C.aimap, cur = nowStage();
    var sec = function (id, no, title, lead, body) {
      return '<section class="section dk" id="' + id + '"><p class="dk-no">' + no + "</p><h2>" + title + "</h2>" + (lead ? '<p class="muted">' + lead + "</p>" : "") + body + "</section>";
    };
    var ask = function (q) { return '<p class="ask-q"><b>생각해볼 질문</b>' + esc(q) + "</p>"; };
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · ' + esc(M.asof) + ' 기준</p><h1>AI 사용 지도</h1><p class="lead">AI를 쓰는 사람들이 실제로 지나는 다섯 계단과, 계단마다 만나는 말과 도구를 한 곳에 모았어요. 도구 이름은 몇 달마다 바뀌지만, 여기 있는 개념은 오래 가요.</p></header>' +
      '<nav class="jump" aria-label="이 페이지 목차">' + [["m-steps", "다섯 계단"], ["m-harness", "하네스 해부도"], ["m-six", "비슷해 보이는 여섯 가지"], ["m-same", "같은 개념, 다른 이름"], ["m-tools", "도구 지도"], ["m-price", "요금과 한도"]].map(function (j, i) {
        return '<button type="button" data-jump="' + j[0] + '"><span>' + (i + 1) + "</span>" + j[1] + "</button>";
      }).join("") + "</nav>" +
      sec("m-steps", "01", "다섯 계단", "계단마다 '먼저 알 말'만 알면 충분해요. '나중에 알아도 될 말'은 그 일이 생겼을 때 찾아봐도 늦지 않아요.",
        '<div class="steps-map">' + S.map(function (s) {
          return '<div class="card smap' + (s === cur ? " now" : "") + '"><p class="smap-top"><span class="stage-no">STEP ' + s.no + "</span>" + (s === cur ? '<span class="tbadge now">지금 여기</span>' : "") + (s.bonus ? '<span class="tbadge">보너스</span>' : "") + "</p><h3>" + esc(s.name) + " · " + esc(s.title) + "</h3><p>" + esc(s.sub) + '</p><dl class="stage-dl"><div><dt>어디서</dt><dd>' + esc(s.tool) + "</dd></div><div><dt>먼저 알 말</dt><dd>" + chipsHtml(s.must) + "</dd></div><div><dt>나중에 알아도 될 말</dt><dd>" + chipsHtml(s.later, "soft") + '</dd></div></dl><p class="smap-units">' + stageUnits(s).map(function (u) { return '<a href="#' + u.id + '">' + u.no + " " + esc(u.title) + "</a>"; }).join("") + '</p><button type="button" class="btn secondary small" data-gstage="' + s.no + '">STEP ' + s.no + " 용어 보기</button></div>";
        }).join("") + "</div>") +
      sec("m-harness", "02", "하네스 해부도", "에이전트 = 모델 + 하네스. 모델은 방 안의 똑똑한 컨설턴트이고, 하네스는 그를 둘러싼 사무실이에요. Claude Code·Codex·Cursor는 모두 하네스예요.",
        figHtml("harness") + '<div class="parts">' + M.harness.map(function (h) { return '<div class="part"><b>' + esc(h.k) + "</b><span>" + esc(h.like) + "</span><p>" + esc(h.body) + "</p></div>"; }).join("") + "</div>" + ask(M.ask.harness)) +
      sec("m-six", "03", "비슷해 보이는 여섯 가지", "CLAUDE.md, 스킬, MCP, 서브에이전트, 훅, 플러그인. 모두 하네스를 꾸미는 방법이지만 하는 일이 달라요.",
        '<div class="rules"><p><b>MCP는 연결하고, 스킬은 잘 쓰는 법을 가르쳐요.</b></p><p><b>프롬프트는 부탁, 훅은 강제.</b> 스킬과 CLAUDE.md는 AI가 읽고 판단하고, 훅은 판단 없이 무조건 실행돼요.</p></div>' +
        '<div class="six">' + M.six.map(function (x, i) {
          return '<div class="card six-item"><p class="six-no">' + (i + 1) + "</p><h3>" + esc(x.name) + "<small>" + esc(x.like) + "</small></h3><p>" + esc(x.what) + '</p><dl><div><dt>누가 실행</dt><dd>' + esc(x.who) + "</dd></div><div><dt>언제 추가</dt><dd>" + esc(x.when) + "</dd></div><div><dt>예</dt><dd>" + esc(x.ex) + "</dd></div></dl></div>";
        }).join("") + '</div><p class="muted">번호는 추가하는 순서예요. 처음부터 다 하지 말고, 불편이 생겼을 때 하나씩 더해요.</p>' + ask(M.ask.six)) +
      sec("m-same", "04", "같은 개념, 다른 이름", "회사마다 이름만 다르게 붙였을 뿐 같은 기능이 많아요. 하나를 익히면 나머지도 금방 써요.",
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>하는 일</th>' + M.same.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + M.same.rows.map(function (r) {
          return "<tr><th>" + esc(r.k) + "</th>" + r.v.map(function (v) { return "<td>" + esc(v) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>" +
        '<h3 class="sub">코딩 에이전트의 규칙 파일과 스킬 폴더</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>도구</th><th>규칙 파일 (인수인계서)</th><th>스킬 폴더</th></tr></thead><tbody>' + M.agentFiles.map(function (r) {
          return "<tr><th>" + esc(r.tool) + "</th><td><code>" + esc(r.rules) + "</code></td><td><code>" + esc(r.skills) + "</code></td></tr>";
        }).join("") + '</tbody></table></div><p class="muted">AGENTS.md와 MCP는 리눅스 재단 산하 공개 표준, SKILL.md는 공개 표준이 돼서 여러 도구가 함께 읽어요. 세부 경로는 버전마다 바뀔 수 있어요.</p>' + ask(M.ask.same)) +
      sec("m-tools", "05", "도구 지도", esc(M.asof) + " 기준이에요. 순위보다 '어느 계단에서 무엇을 하는 도구인지'를 보세요.",
        '<div class="tool-rows">' + M.tools.map(function (x) {
          var s = stageById(x.stage);
          return '<div class="tool-row"><p><b>' + esc(x.cat) + '</b><span class="tbadge">STEP ' + s.no + " " + esc(s.name) + "</span></p><p class=\"tool-names\">" + esc(x.tools) + '</p><p class="muted">' + esc(x.note) + "</p></div>";
        }).join("") + '</div><div class="card gone"><h3>2026년에 사라지거나 바뀐 것</h3><ul>' + M.gone.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul><p>그래서 이 코스는 버튼 위치보다 개념을 가르쳐요. 앱이 바뀌어도 '책상(컨텍스트)', '부탁과 강제', '작게 맡기고 확인'은 그대로예요.</p></div>") +
      sec("m-price", "06", "요금과 한도", "대부분은 '무료로 시작 → 주력 앱 하나만 유료'면 충분해요.",
        '<div class="price">' + M.price.map(function (p) { return '<div class="price-item"><b>' + esc(p.k) + "</b><p>" + esc(p.v) + "</p></div>"; }).join("") + '</div><h3 class="sub">초보자가 부딪히는 세 가지 한도</h3><div class="price">' + M.limits.map(function (p) { return '<div class="price-item"><b>' + esc(p.k) + "</b><p>" + esc(p.v) + "</p></div>"; }).join("") + "</div>") +
      "</div>";
  }

  // ---------- 화면: 한 장 치트시트 ----------
  function viewCheats() {
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 인쇄해서 책상 옆에</p><h1>한 장 치트시트</h1><p class="lead">계단마다 꼭 알 말, 지킬 습관, 하지 말 것을 한 장씩 담았어요. 프롬프트 패턴과 화면에 뜨는 낯선 문구 풀이도 함께예요.</p><div class="finish-row"><button type="button" class="btn small" data-print>인쇄 · PDF로 저장</button></div></header>' +
      '<nav class="jump" aria-label="이 페이지 목차"><button type="button" data-jump="c-steps"><span>1</span>계단별 한 장</button><button type="button" data-jump="c-patterns"><span>2</span>프롬프트 패턴 ' + C.patterns.length + '</button><button type="button" data-jump="c-phrases"><span>3</span>화면 문구 사전</button></nav>' +
      '<section class="section dk" id="c-steps"><p class="dk-no">01</p><h2>계단별 한 장</h2><div class="sheets">' + S.map(function (s) {
        return '<article class="card sheet"><header><span class="stage-no">STEP ' + s.no + "</span><h3>" + esc(s.name) + " · " + esc(s.title) + (s.bonus ? ' <i class="bonus">보너스</i>' : "") + "</h3><p>" + esc(s.sub) + '</p></header><dl class="stage-dl"><div><dt>어디서</dt><dd>' + esc(s.tool) + "</dd></div><div><dt>꼭 알 말</dt><dd>" + chipsHtml(s.must) + '</dd></div></dl><div class="sheet-cols"><div><p class="sheet-h ok">지킬 습관</p><ul>' + s.habits.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + '</ul></div><div><p class="sheet-h no">하지 말 것</p><ul>' + s.dont.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + '</ul></div></div><p class="sheet-end"><b>마치면</b> ' + esc(s.unlock) + "</p></article>";
      }).join("") + "</div></section>" +
      '<section class="section dk" id="c-patterns"><p class="dk-no">02</p><h2>프롬프트 패턴</h2><p class="muted">요즘 AI에 잘 듣는 말버릇이에요. 복사해서 [대괄호]만 바꿔 쓰세요.</p><div class="patterns">' + C.patterns.map(function (p) {
        return '<div class="pattern">' + promptBox(p.say, p.name) + '<p class="why"><b>왜?</b> ' + esc(p.why) + "</p></div>";
      }).join("") + "</div></section>" +
      '<section class="section dk" id="c-phrases"><p class="dk-no">03</p><h2>화면 문구 사전</h2><p class="muted">에이전트와 개발 도구는 영어로 말을 걸어요. 자주 보는 문구의 뜻과 그때 할 일이에요. 도구와 버전마다 문구가 조금씩 달라요.</p><div class="approvals phrases">' + C.phrases.map(function (x) {
        var s = stageById(x.stage);
        return '<div class="approval phrase"><span class="lv">STEP ' + s.no + "</span><code>" + esc(x.say) + "</code><p>" + esc(x.mean) + '</p><p class="ask"><b>이렇게 해요</b>' + esc(x.act) + "</p></div>";
      }).join("") + '</div><p class="muted">명령어가 나오면 <a href="#devkit">개발 도구 지도의 허락 가이드</a>를 함께 보세요.</p></section></div>';
  }

  // ---------- 화면: 내 포트폴리오 ----------
  function portfolioText() {
    var pf = state.portfolio || {};
    var lines = ["# " + (pf.name ? pf.name + "의 " : "") + "PLAN_Be 포트폴리오", ""];
    lines.push("## 만든 것", "- " + (state.goal.what || "(목표 카드를 채워주세요)"), pf.url ? "- 링크: " + pf.url : "- 링크: (배포한 주소를 적어주세요)", "");
    lines.push(briefText(), "");
    lines.push("## 유닛별 배움");
    U.forEach(function (u) { if (state.reflect[u.id]) lines.push("- UNIT " + u.no + " " + u.title + ": " + state.reflect[u.id]); });
    if (pf.lesson) lines.push("", "## 가장 큰 배움", pf.lesson);
    lines.push("", "## 진도", "- 완료한 유닛 " + doneCount() + "/" + CORE.length + (bonusDone() ? " + 보너스 " + bonusDone() + "개" : ""));
    var sc = C.selfCheck.map(function (q, i) { var a = state.self.start[i], b = state.self.end[i]; return a || b ? "- " + q + ": " + (a || "-") + " → " + (b || "-") : ""; }).filter(Boolean);
    if (sc.length) { lines.push("", "## 실력 점검 (시작 → 끝)"); lines.push.apply(lines, sc); }
    return lines.join("\n");
  }
  function viewPortfolio() {
    var pf = state.portfolio || {};
    var reflected = U.filter(function (u) { return state.reflect[u.id]; });
    var all = !nextUnit();
    return '<div class="page"><header class="hello"><p class="eyebrow">도구 · 완주하면 완성돼요</p><h1>내 포트폴리오</h1><p class="lead">수료증보다 오래 남는 건 내가 만든 것과 배운 것이에요. 지금까지 이 기기에 저장된 내용을 한 장으로 모았어요.</p></header>' +
      (all ? '<p class="pf-done">코스를 완주했어요. 아래 내용을 복사해서 공유해 보세요.</p>' : '<p class="muted">완료한 유닛 ' + doneCount() + "/" + CORE.length + ". 유닛을 마칠 때마다 한 줄 회고가 여기에 쌓여요.</p>") +
      '<section class="section card"><h2>채워 넣기</h2>' +
      '<div class="field"><label for="pf-name">이름 (선택)</label><input type="text" id="pf-name" data-pf="name" placeholder="민지" value="' + esc(pf.name) + '"></div>' +
      '<div class="field"><label for="pf-url">내 서비스 링크</label><input type="url" id="pf-url" data-pf="url" placeholder="https://my-service.vercel.app" value="' + esc(pf.url) + '"><small>유닛 07에서 배포한 주소예요.</small></div>' +
      '<div class="field"><label for="pf-lesson">가장 큰 배움 한 줄</label><input type="text" id="pf-lesson" data-pf="lesson" placeholder="크게 시키지 말고, 작게 맡기고 확인하기" value="' + esc(pf.lesson) + '"></div></section>' +
      '<section class="section"><h2>한눈에 보기</h2><div class="pf-grid">' +
      '<div class="card"><p class="eyebrow">만든 것</p><p class="pf-big">' + esc(state.goal.what || "목표 카드가 비어 있어요") + "</p>" + (pf.url ? '<a href="' + esc(pf.url) + '" target="_blank" rel="noopener">' + esc(pf.url) + " ↗</a>" : '<a href="#home">목표 카드 채우기 →</a>') + "</div>" +
      '<div class="card"><p class="eyebrow">진도</p><p class="pf-big">' + doneCount() + "/" + CORE.length + '</p><p class="muted">완료한 유닛' + (bonusDone() ? " + 보너스 " + bonusDone() + "개" : "") + "</p></div></div>" +
      '<div class="card pf-reflect"><p class="eyebrow">유닛별 한 줄 회고 ' + reflected.length + "개</p>" + (reflected.length ? "<ul>" + reflected.map(function (u) { return "<li><b>UNIT " + u.no + "</b> " + esc(state.reflect[u.id]) + "</li>"; }).join("") + "</ul>" : '<p class="muted">유닛 끝의 \'스스로 점검\'에서 한 줄 회고를 쓰면 여기에 모여요.</p>') + "</div></section>" +
      '<section class="section" id="pf-out"><h2>복사해서 공유하기</h2><p class="muted">노션, 블로그, 이력서에 그대로 붙여넣을 수 있는 형식(마크다운)이에요.</p>' + promptBox(portfolioText(), "내 포트폴리오") + "</section></div>";
  }

  // ---------- 화면: 직무별 레시피 ----------
  var recipeRole = C.recipes[0].role;
  function viewRecipes() {
    var r = C.recipes.filter(function (x) { return x.role === recipeRole; })[0];
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 유닛 08에서 써요</p><h1>직무별 레시피</h1><p class="lead">내 일에 바로 써먹는 프롬프트예요. [대괄호]만 바꿔서 쓰고, 세 번 이상 쓰게 되면 유닛 08에서 스킬로 만들어요.</p></header>' +
      '<div class="filters" role="group" aria-label="직무">' + C.recipes.map(function (x) { return '<button type="button" class="filter" data-rrole="' + esc(x.role) + '" aria-pressed="' + (x.role === recipeRole) + '">' + esc(x.role) + "</button>"; }).join("") + "</div>" +
      '<div class="recipes">' + r.items.map(function (it) {
        return '<div class="card recipe"><h3>' + esc(it.title) + '<small>' + esc(it.when) + "</small></h3>" + promptBox(it.prompt, "프롬프트") + '<p class="check-pt"><b>확인 포인트</b> ' + esc(it.check) + "</p></div>";
      }).join("") + "</div>" +
      '<p class="muted" style="font-size:.88rem">회사 자료를 넣기 전에 <a href="#us">유닛 03 안전하게 쓰기</a>의 데이터 신호등을 먼저 확인하세요.</p></div>';
  }

  // ---------- 화면: 개발 도구 지도 ----------
  var LEVEL = { ok: "허락", check: "확인 후", stop: "멈춤" };
  function viewDevkit() {
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 유닛 05·07·09에서 만나요</p><h1>개발 도구 지도</h1><p class="lead">명령어를 외울 필요는 없어요. 에이전트가 쓰는 말을 <b>알아듣고</b>, 허락해도 되는지 <b>판단</b>할 수 있으면 충분해요. 운전면허에서 엔진 수리 대신 표지판 읽기를 배우는 것과 같아요.</p></header>' +
      '<nav class="jump" aria-label="이 페이지 목차">' + C.devkit.map(function (g, i) { return '<button type="button" data-jump="dk-' + g.id + '"><span>' + (i + 1) + "</span>" + esc(g.title) + "</button>"; }).join("") + '<button type="button" data-jump="dk-approve"><span>!</span>허락 가이드</button></nav>' +
      C.devkit.map(function (g, i) {
        return '<section class="section dk" id="dk-' + g.id + '"><p class="dk-no">' + String(i + 1).padStart(2, "0") + "</p><h2>" + esc(g.title) + '</h2><p class="muted">' + esc(g.lead) + '</p><div class="terms">' +
          termsHtml(g.terms.map(function (t) { return { term: t.term, like: t.like, body: t.body, why: t.why }; })) + "</div>" +
          (g.cmds ? promptBox(g.cmds, "자주 보는 명령 (# 뒤는 설명)") : "") + "</section>";
      }).join("") +
      '<section class="section dk" id="dk-approve"><p class="dk-no">!</p><h2>에이전트가 허락을 구하면</h2><p class="muted">코딩 에이전트는 위험할 수 있는 일을 하기 전에 물어봐요. 무조건 허락하지 말고, 신호를 읽고, 질문 한 줄을 던지세요. 답이 납득되면 그때 허락해요.</p>' +
      '<div class="approvals">' + C.approvals.map(function (a) {
        return '<div class="approval ' + a.level + '"><span class="lv">' + LEVEL[a.level] + "</span><code>" + esc(a.cmd) + "</code><p>" + esc(a.say) + '</p><p class="ask"><b>먼저 물어볼 질문</b> “' + esc(a.ask) + "”</p></div>";
      }).join("") + "</div>" +
      '<h3 class="sub">모르는 명령이 나오면</h3>' + promptBox(C.explainCmd, "AI에게 물어보는 프롬프트") + "</section></div>";
  }

  function stars(n) { var s = ""; for (var i = 1; i <= 3; i++) s += i <= n ? "★" : "<i>★</i>"; return '<span class="stars" aria-label="초급 추천도 ' + n + '">' + s + "</span>"; }
  var skillCat = "all";
  function skillByName(n) { return [].concat.apply([], C.skillCats.map(function (c) { return c.items; })).filter(function (s) { return s.name === n; })[0]; }
  function srcLink(s) { return s.src ? '<a class="src" href="https://github.com/' + esc(s.src) + '" target="_blank" rel="noopener">github.com/' + esc(s.src) + " ↗</a>" : ""; }
  function skillCard(s) {
    return '<div class="skill"><h3>' + esc(s.name) + "<small>" + esc(s.by) + "</small>" + (s.pop ? '<span class="pop" title="GitHub 별 수, 2026년 10월 기준">' + esc(s.pop) + "</span>" : "") + "</h3>" + stars(s.stars) + "<p>" + esc(s.what) + '</p><p class="when"><b>이럴 때</b> ' + esc(s.when) + "</p>" +
      (s.note ? '<p class="snote">' + esc(s.note) + "</p>" : "") +
      (s.ba ? '<div class="ba"><div><span>전</span><p>' + esc(s.ba.before) + '</p></div><div><span>후</span><p>' + esc(s.ba.after) + "</p></div></div>" : "") +
      '<details class="inst"><summary>Claude Code 설치 명령</summary>' + promptBox(s.install, "설치 명령") + "</details>" + srcLink(s) + "</div>";
  }
  var finder = { goal: "", tool: "" };
  function finderHtml() {
    var F = C.skillFinder;
    var chips = function (list, key, cur) {
      return list.map(function (x) { return '<button type="button" class="filter" data-' + key + '="' + x.id + '" aria-pressed="' + (x.id === cur) + '">' + esc(x.label) + "</button>"; }).join("");
    };
    var g = F.goals.filter(function (x) { return x.id === finder.goal; })[0];
    var t = F.tools.filter(function (x) { return x.id === finder.tool; })[0];
    var result = "";
    if (g && t) {
      var picks = g.picks.map(skillByName);
      result = '<div class="finder-result"><p class="how">' + esc(t.how) + "</p>" + picks.map(function (s, i) {
        var body = t.id === "code" ? promptBox(s.install, "설치 명령") : t.id === "app" ? (s.src ? srcLink(s) : '<p class="muted">Claude Code 전용이에요.</p>') : "";
        return '<div class="pick"><b>' + (i + 1) + "</b><div><h3>" + esc(s.name) + (s.pop ? ' <span class="pop">' + esc(s.pop) + "</span>" : "") + "</h3><p>" + esc(s.what) + "</p>" + body + "</div></div>";
      }).join("") + (t.id === "builder" ? promptBox(C.builderRules, "프로젝트 지침에 붙여넣기") : "") + "</div>";
    } else {
      result = '<p class="muted finder-hint">' + (g ? "어떤 도구를 쓰는지 골라주세요." : "하고 싶은 일부터 골라주세요.") + "</p>";
    }
    return '<section class="card finder" id="finder"><h2>내게 맞는 스킬 찾기</h2>' +
      '<p class="q-label">1. 무엇을 하고 싶나요?</p><div class="filters" role="group" aria-label="하고 싶은 일">' + chips(F.goals, "fgoal", finder.goal) + "</div>" +
      '<p class="q-label">2. 어떤 도구를 쓰나요?</p><div class="filters" role="group" aria-label="쓰는 도구">' + chips(F.tools, "ftool", finder.tool) + "</div>" + result + "</section>";
  }
  function viewSkills() {
    var all = [].concat.apply([], C.skillCats.map(function (c) { return c.items; }));
    var starter = C.skillStarter.map(function (n) { return all.filter(function (s) { return s.name === n; })[0]; });
    var cats = C.skillCats.filter(function (c) { return skillCat === "all" || c.id === skillCat; });
    return '<div class="page wide"><header class="hello"><p class="eyebrow">도구 · 유닛 08에서 써요</p><h1>스킬 가이드</h1><p class="lead">스킬은 고수가 정리한 업무 매뉴얼을 AI에게 장착하는 거예요. 처음에는 별 셋짜리 두세 개만 쓰세요. 장비를 다 껴도 레벨이 낮으면 못 쓰거든요.</p></header>' +
      '<section class="starter"><p class="eyebrow">처음이라면 이 3개만</p><div class="starter-row">' + starter.map(function (s, i) {
        return '<div><b>' + (i + 1) + "</b><span>" + esc(s.name) + "</span><small>" + esc(s.when) + "</small></div>";
      }).join("") + "</div></section>" + finderHtml() +
      '<div class="filters" role="group" aria-label="스킬 분류"><button type="button" class="filter" data-scat="all" aria-pressed="' + (skillCat === "all") + '">전체 ' + all.length + "</button>" +
      C.skillCats.map(function (c) { return '<button type="button" class="filter" data-scat="' + c.id + '" aria-pressed="' + (skillCat === c.id) + '">' + esc(c.title) + " " + c.items.length + "</button>"; }).join("") + "</div>" +
      cats.map(function (c) {
        return '<section class="section skill-cat"><h2>' + esc(c.title) + '</h2><p class="muted">' + esc(c.desc) + '</p><div class="skill-table">' + c.items.map(skillCard).join("") + "</div></section>";
      }).join("") +
      '<section class="section"><h2>설치하는 법</h2><p class="muted">쓰는 도구에 따라 방법이 달라요. 명령어가 낯설면 <a href="#devkit">개발 도구 지도</a>에서 npx와 GitHub부터 보세요.</p><div class="install">' +
      C.skillInstall.map(function (m) {
        return '<div class="install-item"><h3>' + esc(m.where) + "</h3><p>" + esc(m.how) + "</p>" + (m.cmd ? promptBox(m.cmd, "예시 명령") : "") + "</div>";
      }).join("") + "</div></section>" +
      '<section class="section"><h2>스킬을 설치할 수 없는 도구라면</h2><p class="muted">웹앱 빌더(Lovable 등)에는 스킬을 설치할 수 없어요. 대신 아래 원칙을 프로젝트 지침에 붙여넣으면 비슷한 효과가 나요.</p>' + promptBox(C.builderRules, "프로젝트 지침에 붙여넣기") + "</section>" +
      '<p class="muted" style="font-size:.88rem">스킬은 인터넷에서 받는 지시문이자 코드예요. 출처가 분명한 것만 설치하고, 설치 전에 내용을 한 번 읽어보세요. 별점(★★★)은 이 코스의 초급 추천도이고, ★ 6.3k 같은 숫자는 GitHub 별 수(2026년 10월 기준)예요. 별 수는 계속 바뀌어요. 전·후 예시는 이해를 돕기 위해 만든 문장이에요.</p></div>';
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
    else if (r === "glossary") html = viewGlossary();
    else if (r === "map") html = viewMap();
    else if (r === "cheats") html = viewCheats();
    else if (r === "devkit") html = viewDevkit();
    else if (r === "recipes") html = viewRecipes();
    else if (r === "portfolio") html = viewPortfolio();
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
      state.doneAt[cu.id] = Date.now();
      state.review[cu.id] = { stage: 0, at: Date.now() };
      save();
      var nx = U[U.indexOf(cu) + 1];
      toast("UNIT " + cu.no + " 완료! " + (nx ? "다음 유닛으로 가요" : "코스를 완주했어요"));
      location.hash = nx ? nx.id : "home";
      return;
    }
    if (t.closest("[data-undone]")) {
      var uu = unitById(current());
      delete state.done[uu.id];
      delete state.doneAt[uu.id];
      delete state.review[uu.id];
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
    var ro = t.closest("[data-ropt]");
    if (ro) {
      var rid = ro.closest("[data-rv]").getAttribute("data-rv"), ru = unitById(rid);
      var rr = state.review[rid] || { stage: 0, at: state.doneAt[rid] };
      var rq = reviewQuestion(ru, rr), pick = Number(ro.getAttribute("data-ropt"));
      rr = pick === rq.answer ? { stage: rr.stage + 1, at: Date.now() } : { stage: 0, at: Date.now() };
      state.review[rid] = rr;
      reviewSeen[rid] = { q: rq, picked: pick, stage: rr.stage };
      save();
      $("#review").outerHTML = reviewHtml();
      return;
    }
    var fg = t.closest("[data-fgoal]"), ft = t.closest("[data-ftool]");
    if (fg || ft) {
      if (fg) finder.goal = fg.getAttribute("data-fgoal");
      if (ft) finder.tool = ft.getAttribute("data-ftool");
      $("#finder").outerHTML = finderHtml();
      return;
    }
    var rrole = t.closest("[data-rrole]");
    if (rrole) { recipeRole = rrole.getAttribute("data-rrole"); $("#view").innerHTML = viewRecipes(); return; }
    var gc = t.closest("[data-gcat]");
    if (gc) {
      glossCat = gc.getAttribute("data-gcat");
      $all("[data-gcat]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === gc)); });
      $("#g-list").innerHTML = termsHtml(glossList());
      return;
    }
    var gs = t.closest("[data-gstage]");
    if (gs) { glossCat = gs.getAttribute("data-gstage"); glossQ = ""; if (current() === "glossary") route(); else location.hash = "glossary"; return; }
    if (t.closest("[data-print]")) { window.print(); return; }
    var scat = t.closest("[data-scat]");
    if (scat) { skillCat = scat.getAttribute("data-scat"); $("#view").innerHTML = viewSkills(); return; }
    var jump = t.closest("[data-jump]");
    if (jump) {
      var el = document.getElementById(jump.getAttribute("data-jump"));
      if (el) el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
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
    var pk = t.getAttribute("data-pf");
    if (pk) { state.portfolio[pk] = t.value; save(); var pre2 = $("#pf-out pre"); if (pre2) pre2.textContent = portfolioText(); return; }
    var rf = t.getAttribute("data-reflect");
    if (rf) { state.reflect[rf] = t.value; save(); return; }
    var b = t.getAttribute("data-brief");
    if (b) { state.brief[b] = t.value; save(); var pre = $("#brief-out pre"); if (pre) pre.textContent = briefText(); return; }
    if (t.id === "g-search") {
      glossQ = t.value;
      $("#g-list").innerHTML = termsHtml(glossList());
    }
  });

  document.addEventListener("submit", function (e) { e.preventDefault(); });

  window.addEventListener("hashchange", route);
  route();
})();
