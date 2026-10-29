/*
 * 민규의 서비스 데모: 회의 메모 → 담당자별 할 일.
 * AI 없이 규칙으로 정리해요. v1(첫 화면) → v2(작동) → v3(피드백 반영)로 유닛마다 자란 모습을 보여줘요.
 */
(function () {
  "use strict";

  var C = window.COURSE;
  function $(sel) { return document.querySelector(sel); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  var SAMPLES = [
    "주간 마케팅 회의 (3/4)\n참석: 민규, 지훈, 서연, 도윤\n결정: 3월 프로모션은 인스타그램 위주로 간다\n지훈: 프로모션 배너 시안 3개 금요일까지\n서연: 인플루언서 후보 리스트 정리 3/7까지\n도윤: 지난달 광고 성과 리포트 공유\n민규: 예산안 최종 확인 후 공유\n- 랜딩 페이지 문구 다시 보기",
    "신제품 런칭 준비 회의\n- 출시일은 4월 2일로 확정 (결정)\n- @지훈 상세페이지 사진 촬영 일정 잡기 (다음 주 월요일까지)\n- 서연: 보도자료 초안 작성, 3월 20일까지\n- 도윤님 사전예약 이벤트 경품 견적 받기 내일까지\n- 패키지 문구 최종 확인\n- 민규: 협력사 미팅 잡기",
    "월요일 아침 회의\n결정: 고객 문의 답변은 24시간 안에\n@서연 FAQ 페이지 업데이트 (수요일까지)\n@도윤 문의 유형별 통계 뽑기\n지훈 - 챗봇 답변 문구 검토 금요일까지\n다음 회의 때 신규 채용 이야기하기\n민규: 팀 주간 보고 정리 오늘까지"
  ];

  var VERS = {
    1: { unit: "u4", text: "설명서를 붙여넣고 '첫 화면만' 만든 버전이에요. 버튼은 아직 아무 일도 하지 않아요." },
    2: { unit: "u5", text: "'이름:'으로 시작하는 줄을 담당자별로 나눠요. 마감일과 복사 버튼은 아직 없어요. 예시 2를 넣어 보면 무엇이 빠지는지 보여요." },
    3: { unit: "u6", text: "팀원 피드백 3개(@이름 인식, 마감일 표시, 복사 버튼)를 반영했어요. 담당자가 없는 줄은 '확인 필요'로 모아요." }
  };
  var ver = 3;

  // ---------- 규칙으로 정리 ----------
  var DUE = /[,(]?\s*((?:이번 ?주|다음 ?주)\s*[월화수목금토일]요일|[월화수목금토일]요일|\d{1,2}\/\d{1,2}|\d{1,2}월\s*\d{1,2}일|오늘|내일|모레)\s*까지\s*\)?/;
  function clean(t) { return t.replace(/\(\s*\)/g, "").replace(/\s*,\s*$/, "").replace(/\s{2,}/g, " ").trim(); }

  function parse(text, v) {
    var res = { decisions: [], people: [], byName: {}, unknown: [], total: 0, placed: 0 };
    var names = null;
    text.split(/\n/).forEach(function (raw) {
      var line = raw.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim();
      if (!line) return;
      if (/회의(\s*\(.*\))?$/.test(line)) return;                 // 회의 제목
      var att = line.match(/^참석\s*[:：]\s*(.+)$/);
      if (att) { names = att[1].split(/[,，\s]+/).filter(Boolean); return; }
      if (/^결정\s*[:：]/.test(line) || /\(결정\)/.test(line)) {
        res.decisions.push(clean(line.replace(/^결정\s*[:：]\s*/, "").replace(/\(결정\)/, "")));
        return;
      }
      res.total++;
      var who = "", task = line, m;
      if (v >= 3 && (m = line.match(/@([가-힣A-Za-z]{2,10})/))) { who = m[1]; task = line.replace(m[0], ""); }
      else if (v >= 3 && (m = line.match(/^([가-힣]{2,4})님\s+(.+)$/))) { who = m[1]; task = m[2]; }
      else if ((m = line.match(v >= 3 ? /^([가-힣A-Za-z]{2,4})\s*[:：\-–]\s*(.+)$/ : /^([가-힣A-Za-z]{2,4})\s*[:：]\s*(.+)$/))) { who = m[1]; task = m[2]; }
      if (who && names && names.indexOf(who) === -1 && v >= 3) { who = ""; task = line; }
      var due = "";
      if (v >= 3 && (m = task.match(DUE))) { due = m[1]; task = task.replace(m[0], " "); }
      task = clean(task);
      if (!who) { if (v >= 3) res.unknown.push(clean(line)); return; }
      res.placed++;
      if (!res.byName[who]) { res.byName[who] = []; res.people.push(who); }
      res.byName[who].push({ task: task, due: due });
    });
    return res;
  }

  function asText(r) {
    var out = [];
    if (r.decisions.length) out.push("[결정]", r.decisions.map(function (d) { return "- " + d; }).join("\n"), "");
    r.people.forEach(function (p) { out.push("[" + p + "]", r.byName[p].map(function (t) { return "- " + t.task + (t.due ? " (" + t.due + "까지)" : ""); }).join("\n"), ""); });
    if (r.unknown.length) out.push("[확인 필요: 담당자 없음]", r.unknown.map(function (u) { return "- " + u; }).join("\n"));
    return out.join("\n").trim();
  }

  function render() {
    var text = $("#memo").value.trim(), out = $("#out");
    if (ver === 1) { out.innerHTML = '<p class="v1-msg">아무 일도 일어나지 않아요. 아직 버튼이 연결되지 않은 첫 화면이거든요. <a href="study.html#u5">유닛 06</a>에서 연결해요.</p>'; return; }
    if (!text) { out.innerHTML = '<p class="muted">메모를 붙여넣거나 예시를 골라 주세요.</p>'; return; }
    var r = parse(text, ver);
    var html = '<p class="stat">' + (ver === 2 && r.placed < r.total
      ? '<b class="miss">할 일 ' + r.total + "줄 중 " + r.placed + "줄만 정리됐어요.</b> 나머지는 조용히 사라졌어요. 팀원 지훈이 찾아낸 문제예요."
      : "할 일 " + r.placed + "개 · 담당자 " + r.people.length + "명" + (r.unknown.length ? " · 확인 필요 " + r.unknown.length + "개" : "")) + "</p>";
    if (ver >= 3 && r.decisions.length) html += '<div class="decisions"><p class="eyebrow">결정된 것</p><ul>' + r.decisions.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul></div>";
    html += '<div class="people">' + r.people.map(function (p) {
      return '<div class="person"><h3>' + esc(p) + "<span>" + r.byName[p].length + '</span></h3><ul>' + r.byName[p].map(function (t) {
        return "<li><span>" + esc(t.task) + "</span>" + (t.due ? '<i class="due">' + esc(t.due) + "까지</i>" : "") + "</li>";
      }).join("") + "</ul></div>";
    }).join("") + "</div>";
    if (r.unknown.length) html += '<div class="unknown"><p class="eyebrow">확인 필요 · 담당자가 없어요</p><ul>' + r.unknown.map(function (u) { return "<li>" + esc(u) + "</li>"; }).join("") + "</ul></div>";
    if (ver >= 3) html += '<div class="prompt"><div class="prompt-head"><span>메신저에 붙여넣기</span><button type="button" class="copy" data-copy>복사</button></div><pre>' + esc(asText(r)) + "</pre></div>";
    out.innerHTML = html;
  }

  function aiPrompt() {
    var memo = $("#memo").value.trim() || "[회의 메모 붙여넣기]";
    $("#ai-prompt").textContent = "아래 회의 메모를 담당자별 할 일 표로 정리해줘.\n열: 담당자 | 할 일 | 마감\n- 결정된 것은 표 위에 따로 적어줘.\n- 담당자가 불분명한 항목은 맨 아래 '확인 필요'로 모아줘.\n- 메모에 없는 내용은 추측해서 쓰지 마.\n\n[회의 메모]\n" + memo;
  }

  function setVer(v) {
    ver = v;
    document.querySelectorAll("[data-ver]").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-ver")) === v)); });
    var info = VERS[v], u = C.units.filter(function (x) { return x.id === info.unit; })[0];
    $("#ver-note").innerHTML = '<a href="study.html#' + u.id + '">유닛 ' + u.no + " · " + esc(u.title) + "</a> " + esc(info.text);
    document.body.classList.toggle("is-v1", v === 1);
    $("#out").innerHTML = "";
    if ($("#memo").value.trim() && v > 1) render();
  }

  function road() {
    var tag = { u4: "v1", u5: "v2", u6: "v3" };
    $("#road").innerHTML = C.units.filter(function (u) { return u.case; }).map(function (u) {
      var first = u.case.story.split(/\.\s/)[0].replace(/\.$/, "") + ".";
      return '<li><a href="study.html#' + u.id + '"><span class="no">' + u.no + "</span><span><b>" + esc(u.title) + (tag[u.id] ? ' <i class="vtag">' + tag[u.id] + "</i>" : "") + "</b><small>" + esc(first) + "</small></span></a></li>";
    }).join("");
  }

  var toastTimer;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2000); }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var vb = t.closest("[data-ver]");
    if (vb) { setVer(Number(vb.getAttribute("data-ver"))); return; }
    var sb = t.closest("[data-sample]");
    if (sb) { $("#memo").value = SAMPLES[Number(sb.getAttribute("data-sample"))]; aiPrompt(); if (ver > 1) render(); else $("#out").innerHTML = ""; return; }
    if (t.closest("#run")) { render(); return; }
    var copy = t.closest("[data-copy]");
    if (copy) {
      var text = copy.closest(".prompt").querySelector("pre").textContent;
      var done = function () { copy.textContent = "복사됨"; setTimeout(function () { copy.textContent = "복사"; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast("길게 눌러 복사해주세요"); });
      else toast("길게 눌러 복사해주세요");
    }
  });
  $("#memo").addEventListener("input", aiPrompt);

  $("#memo").value = SAMPLES[0];
  aiPrompt();
  road();
  setVer(3);
})();
