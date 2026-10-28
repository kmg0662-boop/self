(function () {
  "use strict";

  var C = window.CONTENT;
  var IN_ARTIFACT = !!(window.claude && typeof window.claude.use === "function");

  // ---------- 작은 도구들 ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem("planbe:" + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem("planbe:" + key, JSON.stringify(value)); } catch (e) { /* 저장 불가: 무시 */ }
    }
  };

  function now() {
    return window.__PLANBE_NOW__ ? new Date(window.__PLANBE_NOW__) : new Date();
  }

  function hhmm(iso) {
    var d = new Date(iso);
    var parts = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).formatToParts(d);
    var h = "", m = "";
    parts.forEach(function (p) { if (p.type === "hour") h = p.value; if (p.type === "minute") m = p.value; });
    return h + ":" + m;
  }

  function duration(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(total / 86400);
    var h = Math.floor((total % 86400) / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return (d > 0 ? d + "일 " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function copyBlock(id, text, label) {
    return '<div class="copybox"><div class="copyrow"><b>' + esc(label || "") + '</b>' +
      '<span><span class="copied" data-copied="' + id + '" hidden>복사했어요</span> ' +
      '<button class="btn small" type="button" data-copy="' + id + '">복사</button></span></div>' +
      '<pre id="' + id + '">' + esc(text) + "</pre></div>";
  }

  function copyText(text, id) {
    var done = function () {
      var flag = document.querySelector('[data-copied="' + id + '"]');
      if (flag) { flag.hidden = false; setTimeout(function () { flag.hidden = true; }, 1800); }
    };
    var fallback = function () {
      var el = document.getElementById(id);
      if (!el) return;
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { if (document.execCommand("copy")) done(); } catch (e) { /* 선택된 상태로 둠 */ }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function dBadges(list) {
    if (!list || !list.length) return "";
    return '<div class="badges">' + list.map(function (d) {
      var info = C.fourD[d];
      return '<span class="badge" title="' + esc(info ? info.desc : "") + '">' + esc(d) + (info ? " · " + esc(info.ko) : "") + "</span>";
    }).join("") + "</div>";
  }

  function checklist(items, key) {
    var done = store.get("checks:" + key, {});
    var count = items.filter(function (it) { return done[it.id]; }).length;
    var pct = items.length ? Math.round((count / items.length) * 100) : 0;
    return '<div class="progress" data-progress="' + key + '"><span>' + count + " / " + items.length + '</span><span class="bar"><i style="width:' + pct + '%"></i></span></div>' +
      '<ul class="checks">' + items.map(function (it) {
        return '<li><label class="check"><input type="checkbox" id="chk-' + key + "-" + it.id + '" data-check="' + key + '" data-id="' + it.id + '"' + (done[it.id] ? " checked" : "") + ">" +
          '<span class="ct"><span>' + esc(it.text) + "</span>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "") + "</span></label></li>";
      }).join("") + "</ul>";
  }

  // ---------- 타이머 ----------
  function currentBlock(t) {
    var list = C.schedule;
    for (var i = 0; i < list.length; i++) {
      if (t >= new Date(list[i].start) && t < new Date(list[i].end)) return { i: i, item: list[i] };
    }
    return null;
  }

  function nowCard() {
    var t = now();
    var start = new Date(C.event.start), end = new Date(C.event.end), deadline = new Date(C.event.deadline);
    var label, title, note, num, cap;
    if (t < start) {
      label = "해커톤 시작까지";
      title = "11월 7일(토) 15:00 시작";
      note = C.event.place;
      num = duration(start - t);
      cap = "사전 준비 탭을 먼저 확인하세요";
    } else if (t >= end) {
      label = "해커톤 종료";
      title = "수고하셨어요. 이제 두 번째 결과물을 만들 차례예요";
      note = "레벨업 탭의 Lv7, Lv8로 이어가세요";
      num = "끝";
      cap = "";
    } else {
      var cur = currentBlock(t);
      label = "지금 진행 중";
      title = cur ? cur.item.title : "쉬는 시간";
      note = cur ? (hhmm(cur.item.start) + " ~ " + hhmm(cur.item.end) + (cur.item.note ? " · " + cur.item.note : "")) : "";
      if (t < deadline) { num = duration(deadline - t); cap = "07:00 링크·발표자료 제출 마감까지"; }
      else { num = duration(end - t); cap = "클로징까지"; }
    }
    return '<div class="now" id="now-card" aria-live="polite"><div><div class="now-label">' + esc(label) + '</div><div class="now-title">' + esc(title) + '</div><div class="now-note">' + esc(note) + '</div></div>' +
      '<div class="now-count"><div class="num">' + esc(num) + '</div><div class="cap">' + esc(cap) + "</div></div></div>";
  }

  function timelineHtml() {
    var t = now();
    return '<ol class="timeline">' + C.schedule.map(function (s) {
      var st = new Date(s.start), en = new Date(s.end);
      var cls = [];
      if (t >= st && t < en) cls.push("is-now");
      else if (t >= en) cls.push("is-past");
      if (s.lecture) cls.push("is-lecture");
      var day = st.getTime() >= new Date("2026-11-08T00:00:00+09:00").getTime() ? "일 " : "토 ";
      return '<li class="' + cls.join(" ") + '"><span class="t">' + day + hhmm(s.start) + "–" + hhmm(s.end) + '</span><span class="what"><b>' + esc(s.title) + "</b>" + (s.note ? "<small>" + esc(s.note) + "</small>" : "") + "</span></li>";
    }).join("") + "</ol>";
  }

  // ---------- 화면 ----------
  var views = {};

  views.home = function () {
    return '<div class="view">' +
      '<section class="hero"><span class="eyebrow">PLAN_Be 시즌10 · 바이브코딩 해커톤 · 1조</span>' +
      "<h1>" + esc(C.northStar).replace("직접 만든다", "<em>직접 만든다</em>") + "</h1>" +
      '<p class="lede">이 사이트는 오늘 20시간 동안 펼쳐두는 교재예요. 개념은 비유로, 실습은 순서대로, 막히면 막혔을 때 탭으로 오세요.</p></section>' +
      nowCard() +
      '<section class="section"><h2>만들기 6단계</h2><p class="lede">모든 내용이 이 순서를 따라가요. 각 단계가 끝났다는 신호를 확인하고 다음으로 넘어가세요.</p>' +
      '<ol class="steps">' + C.steps.map(function (s, i) {
        return '<li><span class="step-n">' + (i + 1) + " · " + esc(s.ai) + '</span><span class="step-name">' + esc(s.name) + '</span><span class="step-q">' + esc(s.q) + '</span><span class="step-done">끝 신호: ' + esc(s.done) + "</span></li>";
      }).join("") + "</ol></section>" +
      '<section class="section"><h2>오늘 일정</h2><div id="timeline">' + timelineHtml() + "</div></section>" +
      "</div>";
  };

  views.prep = function () {
    var picked = store.get("level", "");
    var lv = C.prep.levels.filter(function (l) { return l.id === picked; })[0];
    return '<div class="view">' +
      '<section class="section"><span class="eyebrow">오리엔테이션이 없어요</span><h2>오기 전에 해둘 것</h2><p class="lede">당일 20분을 아끼는 체크리스트예요. 체크한 내용은 이 기기에만 저장돼요.</p>' +
      checklist(C.prep.checklist, "prep") + "</section>" +
      '<section class="section"><h2>내 레벨 고르기</h2><p class="lede">수준에 따라 실습 미션이 달라요. 모두가 저녁 전에 성공 경험 하나씩을 가져가는 게 목표예요.</p>' +
      '<div class="levels">' + C.prep.levels.map(function (l) {
        return '<button type="button" class="level" data-level="' + l.id + '" aria-pressed="' + (l.id === picked) + '"><b>' + esc(l.name) + "</b><span>" + esc(l.who) + "</span></button>";
      }).join("") + "</div>" +
      (lv ? '<div class="mission"><b>' + esc(lv.name) + " 실습 미션</b><br>" + esc(lv.mission) + "</div>" : '<div class="mission">레벨을 고르면 실습 미션이 보여요.</div>') +
      "</section></div>";
  };

  views.lecture = function () {
    return '<div class="view">' +
      '<section class="section"><span class="eyebrow">16:00 – 18:00</span><h2>AI 실전 사용법</h2>' +
      '<p class="lede">뼈대는 AI를 잘 쓰는 네 가지 역량(4D)이에요. 각 블록 위에 어떤 역량을 연습하는지 표시했어요.</p>' +
      '<div class="table-wrap"><table><thead><tr><th>4D</th><th>뜻</th></tr></thead><tbody>' +
      Object.keys(C.fourD).map(function (k) { return "<tr><td><b>" + esc(k) + "</b> · " + esc(C.fourD[k].ko) + "</td><td>" + esc(C.fourD[k].desc) + "</td></tr>"; }).join("") +
      "</tbody></table></div></section>" +
      '<div class="blocks">' + C.lecture.map(function (b, i) {
        var body = '<div class="question">' + esc(b.question) + "</div>";
        if (b.howto) body += '<ol class="howto">' + b.howto.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ol>";
        body += '<dl class="kv">' + b.body.map(function (r) { return "<dt>" + esc(r.k) + "</dt><dd>" + esc(r.v) + "</dd>"; }).join("") + "</dl>";
        if (b.tools) {
          body += '<div class="table-wrap"><table><thead><tr><th>쓰임</th><th>예시</th><th>언제</th></tr></thead><tbody>' +
            b.tools.map(function (t) { return "<tr><td><b>" + esc(t.kind) + "</b></td><td>" + esc(t.eg) + "</td><td>" + esc(t.note) + "</td></tr>"; }).join("") +
            "</tbody></table></div>";
        }
        body += '<p class="output"><b>산출물</b> · ' + esc(b.output) + "</p>";
        return '<article class="panel block" id="block-' + (i + 1) + '"><header class="block-head"><span class="block-time">' + esc(b.time) + "<small>" + b.mins + "분</small></span><h3>" + (i + 1) + ". " + esc(b.title) + "</h3>" + dBadges(b.d) + '</header><div class="block-body">' + body + "</div></article>";
      }).join("") + "</div></div>";
  };

  function briefText(vals) {
    var lines = ["# 서비스 설명서"];
    C.briefFields.forEach(function (f) {
      var v = (vals[f.id] || "").trim();
      lines.push("- " + f.label + ": " + (v || "(" + f.hint + ")"));
    });
    return lines.join("\n");
  }

  views.prompts = function () {
    var vals = store.get("brief", {});
    var tcreiAll = C.tcrei.map(function (t) { return "[" + t.name + "] " + t.eg; }).join("\n");
    return '<div class="view">' +
      '<section class="section"><span class="eyebrow">Description</span><h2>TCREI 프롬프트 공식</h2><p class="lede">초급자에게는 외울 공식이 하나 있어야 손이 먼저 움직여요. 앞의 세 칸으로 요청하고, 뒤의 두 칸으로 결과를 다듬어요.</p>' +
      '<div class="tcrei">' + C.tcrei.map(function (t) {
        return '<div class="tc"><span class="tc-k">' + esc(t.k) + '</span><span class="tc-name">' + esc(t.name) + " · " + esc(t.ko) + '</span><span class="tc-eg">' + esc(t.eg) + "</span></div>";
      }).join("") + "</div>" + copyBlock("cp-tcrei", tcreiAll, "공식 예시 전체") + "</section>" +
      '<section class="section" id="brief"><span class="eyebrow">컨텍스트 엔지니어링</span><h2>서비스 설명서 작성기</h2>' +
      '<p class="lede">일을 넘길 때 쓰는 인수인계서예요. 새 채팅을 열거나 툴을 바꿀 때 이것만 붙여넣으면 AI가 바로 이어서 일해요. 입력한 내용은 이 기기에 저장돼요.</p>' +
      '<div class="grid-2"><form class="form panel" id="brief-form" autocomplete="off">' + C.briefFields.map(function (f) {
        var v = esc(vals[f.id] || "");
        var input = f.multi
          ? '<textarea id="brief-' + f.id + '" data-brief="' + f.id + '" placeholder="' + esc(f.ph) + '">' + v + "</textarea>"
          : '<input type="text" id="brief-' + f.id + '" data-brief="' + f.id + '" placeholder="' + esc(f.ph) + '" value="' + v + '">';
        return '<div class="field"><label for="brief-' + f.id + '">' + esc(f.label) + "</label>" + input + "<small>" + esc(f.hint) + "</small></div>";
      }).join("") + '<div><button type="button" class="btn ghost small" id="brief-sample">예시로 채워보기</button> <button type="button" class="btn ghost small" id="brief-clear">비우기</button></div></form>' +
      '<div id="brief-out">' + copyBlock("cp-brief", briefText(vals), "완성된 설명서") + "</div></div></section>" +
      '<section class="section"><h2>상황별 프롬프트 카드</h2><p class="lede">[대괄호] 부분만 내 상황으로 바꿔서 쓰세요.</p>' +
      '<div class="grid-2">' + C.promptCards.map(function (p, i) { return '<div class="panel">' + copyBlock("cp-card-" + i, p.text, p.title) + "</div>"; }).join("") + "</div></section>" +
      '<section class="section"><span class="eyebrow">Discernment</span><h2>받았을 때 판단 질문 3개</h2>' +
      '<div class="grid-3"><div class="panel"><b>결과가 맞나?</b><span class="lede">Product · 내가 원한 게 맞는지, 사실이 맞는지</span></div><div class="panel"><b>근거가 말이 되나?</b><span class="lede">Process · 왜 그렇게 했는지 물어보기</span></div><div class="panel"><b>형식이 맞나?</b><span class="lede">Performance · 말투, 길이, 표 형식이 의도대로인지</span></div></div></section>' +
      "</div>";
  };

  views.glossary = function () {
    return '<div class="view"><section class="section"><h2>용어집</h2><p class="lede">모든 용어를 비유와 함께, 왜 알아야 하는지까지 적었어요. 강의에서 1단계, 2단계, 3단계 순서로 나와요.</p>' +
      '<input type="text" class="search" id="term-search" placeholder="용어 검색 (예: 배포, 토큰)" aria-label="용어 검색"></section>' +
      '<div id="term-list">' + glossaryList("") + "</div></div>";
  };

  function glossaryList(q) {
    q = q.trim().toLowerCase();
    var html = "", hits = 0;
    C.glossary.forEach(function (g) {
      var items = g.items.filter(function (t) {
        return !q || (t.term + " " + t.like + " " + t.why).toLowerCase().indexOf(q) !== -1;
      });
      hits += items.length;
      if (!items.length) return;
      html += '<section class="section"><h3>' + esc(g.level) + '</h3><div class="terms">' + items.map(function (t) {
        return '<div class="term"><b>' + esc(t.term) + '</b><span class="like">' + esc(t.like) + '</span><span class="why">' + esc(t.why) + "</span></div>";
      }).join("") + "</div></section>";
    });
    return hits ? '<div class="view">' + html + "</div>" : '<p class="empty">찾는 용어가 없어요. 다른 단어로 검색하거나 막혔을 때 탭을 확인해보세요.</p>';
  }

  function stars(n) {
    var s = "";
    for (var i = 1; i <= 3; i++) s += i <= n ? "★" : '<span class="off">★</span>';
    return '<span class="stars" aria-label="초급자 추천도 ' + n + '점">' + s + "</span>";
  }

  views.skills = function () {
    var S = C.skills;
    return '<div class="view">' +
      '<section class="section"><span class="eyebrow">고수의 업무 매뉴얼 빌려 쓰기</span><h2>스킬이란?</h2><p class="lede">' + esc(S.what) + "</p>" +
      '<dl class="kv">' + S.where.map(function (w) { return "<dt>" + esc(w.k) + "</dt><dd>" + esc(w.v) + "</dd>"; }).join("") + "</dl></section>" +
      '<section class="section"><h2>만들기 단계별 인기 스킬</h2><div class="mission"><b>처음 시작한다면</b><br>' + esc(S.starter) + "</div>" +
      '<div class="table-wrap"><table><thead><tr><th>단계</th><th>스킬</th><th>무엇을 해주나</th><th>초급 추천</th></tr></thead><tbody>' +
      S.map.map(function (m) {
        return "<tr><td>" + esc(m.step) + "</td><td><b>" + esc(m.name) + "</b><br><small>" + esc(m.by) + "</small></td><td>" + esc(m.what) + "</td><td>" + stars(m.stars) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>" +
      '<section class="section"><h2>내 툴에서는 어떻게 쓰나요?</h2><div class="grid-3">' +
      S.paths.map(function (p) { return '<div class="panel"><b>' + esc(p.who) + "</b><span>" + esc(p.how) + "</span></div>"; }).join("") + "</div>" +
      '<div class="panel">' + copyBlock("cp-rules", S.builderRules, "웹앱 빌더용 복붙 원칙 (프로젝트 지침에 붙여넣기)") + "</div></section>" +
      '<section class="section"><h2>바로 쓰는 스타터 스킬 5개</h2><p class="lede">채팅 첫 메시지로 붙여넣거나, 프로젝트 지침·GPTs·Gems에 저장해서 쓰세요.</p>' +
      S.starterSkills.map(function (s, i) {
        return '<details class="acc"><summary>' + esc(s.name) + ' <span class="badge accent">' + esc(s.when) + '</span></summary><div class="acc-body">' + copyBlock("cp-starter-" + i, s.text, "") + "</div></details>";
      }).join("") + "</section>" +
      '<section class="section"><h2>나만의 스킬 만드는 공식</h2><p class="lede">같은 지시를 세 번 반복했다면 스킬로 저장할 때예요. 금지와 예시를 꼭 넣으세요. AI는 하지 말아야 할 것과 정답의 모양을 알 때 가장 안정적으로 일해요.</p>' +
      '<div class="panel">' + copyBlock("cp-recipe", S.recipe, "스킬 레시피") + "</div></section>" +
      '<div class="note"><b>보안 주의</b> · ' + esc(S.safety) + "</div>" +
      "</div>";
  };

  views.help = function () {
    return '<div class="view">' +
      '<section class="section"><span class="eyebrow">혼자 2시간 버리지 않기</span><h2>막혔을 때 15분 규칙</h2>' +
      '<div class="rule15"><div><b>0 – 15분</b><span>혼자 해보기. 요청을 더 작게 쪼개기</span></div><div><b>15분</b><span>에러 메시지를 LLM에 복붙하고 쉬운 설명 요청</span></div><div><b>그래도 막히면</b><span>페이스메이커 호출. 막힌 내용은 기록해두기 (발표 5장 재료)</span></div></div></section>' +
      '<section class="section"><h2>자주 막히는 10가지</h2>' +
      C.playbook.map(function (p) {
        return '<details class="acc"><summary>' + esc(p.symptom) + '</summary><div class="acc-body"><span class="cause">원인 · ' + esc(p.cause) + '</span><span class="fix">' + esc(p.fix) + "</span></div></details>";
      }).join("") + "</section>" +
      '<section class="section"><h2>막힘 기록 양식</h2><p class="lede">한 줄씩 남겨두면 발표 5장(문제해결 과정)과 심사의 과정과 성장 항목에 그대로 쓸 수 있어요.</p>' +
      '<div class="panel">' + copyBlock("cp-log", "[시간] / [무엇이 막혔나] / [어떻게 풀었나] / [배운 것]", "막힘 기록 한 줄") + "</div></section>" +
      "</div>";
  };

  views.levelup = function () {
    var P = C.practice;
    var items = C.levels.map(function (l) { return { id: l.id, text: l.name + " · " + l.can, sub: l.d + " · " + l.when }; });
    return '<div class="view">' +
      '<section class="section"><h2>레벨업 루트</h2><p class="lede">오늘 밤 목표 레벨을 정하고, 할 수 있게 된 것을 체크하세요. Lv7부터는 해커톤 이후 실무로 이어지는 단계예요.</p>' + checklist(items, "levels") + "</section>" +
      '<section class="section"><span class="eyebrow">실무 적용</span><h2>내 업무 지도 그리기</h2><p class="lede">일주일 동안 한 일을 15개 적고 네 칸으로 나눠보세요. 이사할 때 짐을 버릴 것, 맡길 것, 내가 챙길 것으로 나누는 것과 같아요.</p>' +
      '<div class="matrix">' + P.matrix.map(function (m) {
        return '<div class="cell ' + m.tone + '"><b>' + esc(m.title) + "</b><small>" + esc(m.sub) + '</small><span class="eg">' + esc(m.eg) + "</span></div>";
      }).join("") + "</div></section>" +
      '<section class="section"><h2>실무 적용 5단계</h2><ol class="routine">' + P.routine.map(function (r) { return "<li><b>" + esc(r.k) + "</b> · " + esc(r.v) + "</li>"; }).join("") + "</ol></section>" +
      '<section class="section"><h2>직무별 첫 적용 예시</h2><div class="table-wrap"><table><thead><tr><th>직무</th><th>첫 번째로 맡길 일</th><th>쓰는 AI</th></tr></thead><tbody>' +
      P.jobs.map(function (j) { return "<tr><td><b>" + esc(j.job) + "</b></td><td>" + esc(j.first) + "</td><td>" + esc(j.ai) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      '<section class="section"><h2>실무 안전 수칙</h2><ul class="routine">' + P.safety.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></section>" +
      "</div>";
  };

  // ---------- 자가진단 ----------
  var checkState = { phase: "start", team: "", nick: "", answers: {} };

  views.check = function () {
    var saved = store.get("selfcheck", {});
    checkState.team = checkState.team || saved.team || "";
    checkState.nick = checkState.nick || saved.nick || "";
    return '<div class="view">' +
      '<section class="section"><span class="eyebrow">1분</span><h2>자가진단</h2><p class="lede">강의 시작과 끝에 같은 다섯 문항에 답해요. 점수는 줄을 세우는 데 쓰지 않아요. 도움이 먼저 필요한 사람을 찾는 데 써요. 다른 참가자는 내 점수를 볼 수 없어요.</p></section>' +
      '<form class="form" id="check-form" autocomplete="off">' +
      '<div class="panel"><div class="field"><span><b>언제 하는 진단인가요?</b></span><div class="seg" role="group" aria-label="진단 시점">' +
      '<button type="button" data-phase="start" aria-pressed="' + (checkState.phase === "start") + '">강의 시작</button>' +
      '<button type="button" data-phase="end" aria-pressed="' + (checkState.phase === "end") + '">강의 끝</button></div></div>' +
      '<div class="grid-2"><div class="field"><label for="check-team">조</label><select id="check-team"><option value="">선택</option>' +
      [1, 2, 3].map(function (n) { return '<option value="' + n + '"' + (String(checkState.team) === String(n) ? " selected" : "") + ">" + n + "조</option>"; }).join("") +
      '</select></div><div class="field"><label for="check-nick">닉네임 (선택)</label><input type="text" id="check-nick" maxlength="30" placeholder="시작과 끝을 비교하려면 같은 닉네임으로" value="' + esc(checkState.nick) + '"></div></div></div>' +
      '<div class="qs">' + C.selfCheck.map(function (q, i) {
        var n = i + 1;
        return '<div class="q"><fieldset><legend>' + n + ". " + esc(q) + '</legend><div class="scale">' +
          [1, 2, 3, 4, 5].map(function (v) {
            return '<label><input type="radio" name="q' + n + '" id="q' + n + "-" + v + '" value="' + v + '"' + (checkState.answers["q" + n] === v ? " checked" : "") + "><span>" + v + "</span></label>";
          }).join("") + '<span class="scale-ends">1 전혀 아니다 · 5 매우 그렇다</span></div></fieldset></div>';
      }).join("") + "</div>" +
      '<div><button type="submit" class="btn" id="check-submit">제출하기</button></div>' +
      '<div id="check-status" class="status" hidden></div>' +
      "</form>" +
      '<section class="section" id="check-compare">' + compareHtml() + "</section>" +
      "</div>";
  };

  function compareHtml() {
    var mine = store.get("selfcheck-mine", {});
    if (!mine.start && !mine.end) return "";
    var rows = C.selfCheck.map(function (q, i) {
      var k = "q" + (i + 1);
      var a = mine.start ? mine.start[k] : null, b = mine.end ? mine.end[k] : null;
      var delta = a != null && b != null ? b - a : null;
      return "<tr><td>" + esc(q) + '</td><td class="compare">' + (a != null ? a : "-") + '</td><td class="compare">' + (b != null ? b : "-") + '</td><td class="compare' + (delta > 0 ? " delta-up" : "") + '">' + (delta == null ? "-" : (delta > 0 ? "+" : "") + delta) + "</td></tr>";
    }).join("");
    return '<h3>내 점수 비교 (이 기기 기록)</h3><div class="table-wrap"><table><thead><tr><th>문항</th><th>시작</th><th>끝</th><th>변화</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<p class="lede">이 변화가 발표 5장의 배운 것과 심사의 과정과 성장 근거가 돼요.</p>';
  }

  function setStatus(kind, text) {
    var el = $("#check-status");
    if (!el) return;
    el.hidden = false;
    el.className = "status" + (kind ? " " + kind : "");
    el.textContent = text;
  }

  function submitToArtifact(payload) {
    return window.claude.use("db").then(function (db) {
      if (!db) throw new Error("no-db");
      return window.claude.use("user").then(function (user) {
        if (!user) throw new Error("no-user");
        return user.id().then(function (id) {
          if (!id) throw new Error("no-id");
          var ref = db.doc("selfcheck/" + id);
          return ref.get().then(function (snap) {
            var prev = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : {};
            prev.team = payload.team;
            prev.nickname = payload.nickname;
            prev[payload.phase] = { q1: payload.q1, q2: payload.q2, q3: payload.q3, q4: payload.q4, q5: payload.q5, at: new Date().toISOString() };
            return ref.set(prev);
          });
        });
      });
    });
  }

  function submitToSupabase(payload) {
    var S = C.supabase;
    return fetch(S.url + "/rest/v1/" + S.table, {
      method: "POST",
      headers: {
        "apikey": S.key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(Object.assign({ season: C.season }, payload))
    }).then(function (res) {
      if (!res.ok) throw new Error("http-" + res.status);
    });
  }

  function onSubmitCheck(e) {
    e.preventDefault();
    var team = $("#check-team").value;
    var nick = $("#check-nick").value.trim();
    var answers = {};
    var missing = [];
    for (var n = 1; n <= 5; n++) {
      var picked = $('input[name="q' + n + '"]:checked');
      if (picked) answers["q" + n] = Number(picked.value); else missing.push(n);
    }
    if (!team) { setStatus("err", "조를 선택해주세요."); return; }
    if (missing.length) { setStatus("err", missing.join(", ") + "번 문항에 답해주세요."); return; }

    store.set("selfcheck", { team: team, nick: nick });
    var mine = store.get("selfcheck-mine", {});
    mine[checkState.phase] = answers;
    store.set("selfcheck-mine", mine);

    var payload = Object.assign({ phase: checkState.phase, team: Number(team), nickname: nick || null }, answers);
    var btn = $("#check-submit");
    btn.disabled = true;
    setStatus("", "보내는 중이에요…");
    var send = IN_ARTIFACT ? submitToArtifact(payload) : submitToSupabase(payload);
    send.then(function () {
      setStatus("ok", (checkState.phase === "start" ? "시작" : "종료") + " 진단을 제출했어요. 고마워요!");
      $("#check-compare").innerHTML = compareHtml();
    }).catch(function () {
      setStatus("err", IN_ARTIFACT
        ? "이 화면에서는 제출 권한이 없어요. 페이스메이커가 알려준 강의 사이트 링크에서 다시 제출해주세요. 내 점수 비교는 아래에 저장됐어요."
        : "제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요. 계속 안 되면 페이스메이커에게 알려주세요.");
      $("#check-compare").innerHTML = compareHtml();
    }).then(function () { btn.disabled = false; });
  }

  // ---------- 인쇄용 치트시트 ----------
  function cheatsheetHtml() {
    var brief = C.briefFields.map(function (f) { return "<p><b>" + esc(f.label) + "</b></p><div class=\"cs-blank\"></div>"; }).join("");
    return '<div class="cs-page"><h2>AI에게 일 잘 시키기 · PLAN_Be ' + esc(C.season) + "</h2>" +
      "<h3>① 맡기기 전에 (Delegation)</h3><p>목표와 성공 기준을 한 문장으로 말할 수 있나? 못 하면 LLM과 먼저 대화.</p>" +
      "<h3>② 말할 때: TCREI (Description)</h3><ul>" + C.tcrei.map(function (t) { return "<li><b>" + t.k + " " + t.name + "</b> " + esc(t.ko) + " — " + esc(t.eg) + "</li>"; }).join("") + "</ul>" +
      "<h3>③ 받았을 때 (Discernment)</h3><p>□ 결과가 맞나? □ 근거가 말이 되나? □ 형식이 맞나?</p>" +
      "<h3>④ 에이전트 위임 4원칙</h3><p>작게 맡긴다 · 눈으로 확인한다 · 증상으로 말한다 · 자주 저장한다</p>" +
      "<h3>⑤ 막히면 15분 규칙</h3><p>혼자 15분 → AI에게 에러 복붙 → 페이스메이커 호출</p>" +
      "<h3>⑥ 책임 (Diligence)</h3><p>API 키·개인정보 금지 · 사실 확인 · AI 사용 공개 · 책임은 나에게</p></div>" +
      '<div class="cs-page"><h2>막힘 Top 10 · 서비스 설명서</h2><ul>' +
      C.playbook.map(function (p) { return "<li><b>" + esc(p.symptom) + "</b> → " + esc(p.fix) + "</li>"; }).join("") + "</ul>" +
      "<h3>서비스 설명서</h3>" + brief + "</div>";
  }

  // ---------- 라우팅 ----------
  var ROUTES = ["home", "prep", "lecture", "prompts", "glossary", "skills", "help", "levelup", "check"];
  var timer = null;

  function route() {
    var name = (location.hash || "").replace("#", "");
    if (ROUTES.indexOf(name) === -1) name = "home";
    $("#view").innerHTML = views[name]();
    $all(".tab").forEach(function (t) {
      if (t.getAttribute("href") === "#" + name) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
    var active = $('.tab[aria-current="page"]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest", inline: "nearest" });

    if (timer) { clearInterval(timer); timer = null; }
    if (name === "home") {
      timer = setInterval(function () {
        var card = $("#now-card");
        if (card) card.outerHTML = nowCard();
        var tl = $("#timeline");
        if (tl) tl.innerHTML = timelineHtml();
      }, 1000);
    }
  }

  // ---------- 이벤트 (위임) ----------
  document.addEventListener("click", function (e) {
    var copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      var id = copyBtn.getAttribute("data-copy");
      var el = document.getElementById(id);
      if (el) copyText(el.textContent, id);
      return;
    }
    var lvl = e.target.closest("[data-level]");
    if (lvl) {
      store.set("level", lvl.getAttribute("data-level"));
      route();
      return;
    }
    var ph = e.target.closest("[data-phase]");
    if (ph) {
      checkState.phase = ph.getAttribute("data-phase");
      $all("[data-phase]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === ph)); });
      return;
    }
    if (e.target.id === "brief-sample") {
      var sample = {};
      C.briefFields.forEach(function (f) { sample[f.id] = f.ph; });
      store.set("brief", sample);
      route();
      return;
    }
    if (e.target.id === "brief-clear") {
      store.set("brief", {});
      route();
      return;
    }
    if (e.target.id === "print-sheet") {
      window.print();
    }
  });

  document.addEventListener("change", function (e) {
    var chk = e.target.closest("[data-check]");
    if (chk) {
      var key = chk.getAttribute("data-check");
      var done = store.get("checks:" + key, {});
      done[chk.getAttribute("data-id")] = chk.checked;
      store.set("checks:" + key, done);
      var boxes = $all('[data-check="' + key + '"]');
      var count = boxes.filter(function (b) { return b.checked; }).length;
      var prog = $('[data-progress="' + key + '"]');
      if (prog) {
        prog.firstChild.textContent = count + " / " + boxes.length;
        prog.querySelector("i").style.width = Math.round((count / boxes.length) * 100) + "%";
      }
      return;
    }
    if (e.target.name && /^q[1-5]$/.test(e.target.name)) {
      checkState.answers[e.target.name] = Number(e.target.value);
    }
  });

  document.addEventListener("input", function (e) {
    var f = e.target.getAttribute && e.target.getAttribute("data-brief");
    if (f) {
      var vals = store.get("brief", {});
      vals[f] = e.target.value;
      store.set("brief", vals);
      var pre = $("#cp-brief");
      if (pre) pre.textContent = briefText(vals);
      return;
    }
    if (e.target.id === "term-search") {
      $("#term-list").innerHTML = glossaryList(e.target.value);
      return;
    }
    if (e.target.id === "check-nick") checkState.nick = e.target.value;
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id === "check-form") onSubmitCheck(e);
    else e.preventDefault();
  });

  document.addEventListener("change", function (e) {
    if (e.target.id === "check-team") checkState.team = e.target.value;
  });

  // ---------- 시작 ----------
  function start() {
    $("#cheatsheet").innerHTML = cheatsheetHtml();
    var printBtn = $("#print-sheet");
    if (printBtn) printBtn.hidden = IN_ARTIFACT;
    route();
  }
  window.addEventListener("hashchange", route);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
