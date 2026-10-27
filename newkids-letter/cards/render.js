// 뉴키즈 레터 카드뉴스 렌더러: cards.json → out/<호>/NN.png (1080×1350)
// 실행: node render.js [호 id]   (Pretendard 폰트가 시스템에 설치되어 있어야 합니다)
// 다른 데이터 파일: CARDS=cards-weekly.json node render.js
// 세트별 선택 필드: series(하단 라벨), chip(표지 칩), cta(질문 카드 안내 문구)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const sets = JSON.parse(fs.readFileSync(path.join(ROOT, process.env.CARDS || 'cards.json'), 'utf8'));
const logo = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', n + '.png')).toString('base64');
const LOGO_DARK = logo('logo_dark');
const LOGO_WHITE = logo('logo_white');

const esc = (s) => s.replace(/&(?!amp;)/g, '&amp;');
const br = (s) => esc(s).replace(/\n/g, '<br>');

const CSS = `
:root{--purple:#8140FC;--blue:#392DE7;--ink:#16141F;--muted:#6E6A82;--bg:#F6F5FB;--line:#E3E0EF;--tint:#EFEBFF}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{font-family:'Pretendard',sans-serif;color:var(--ink);word-break:keep-all;-webkit-font-smoothing:antialiased}
.card{position:relative;width:1080px;height:1350px;padding:88px 92px;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.grad{background:linear-gradient(165deg,var(--purple) 0%,#5B35F0 55%,var(--blue) 100%);color:#fff}
.top{display:flex;justify-content:space-between;align-items:center;height:48px}
.top img{height:40px}
.page{font-size:26px;font-weight:600;letter-spacing:.04em;color:var(--muted)}
.grad .page{color:rgba(255,255,255,.7)}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:24px;font-weight:500;color:var(--muted);padding-top:28px;border-top:2px solid var(--line)}
.grad .foot{color:rgba(255,255,255,.75);border-top-color:rgba(255,255,255,.25)}
.arrow{font-size:30px;font-weight:700;color:var(--purple)}
.grad .arrow{color:#fff}
.chip{display:inline-flex;align-items:center;gap:12px;font-size:28px;font-weight:700;color:var(--purple);background:var(--tint);padding:12px 24px;border-radius:999px;align-self:flex-start}
.chip:before{content:'';width:12px;height:12px;border-radius:50%;background:var(--purple)}
.grad .chip{color:#fff;background:rgba(255,255,255,.16)}
.grad .chip:before{background:#fff}
b{font-weight:700;color:var(--ink);background:linear-gradient(transparent 62%,rgba(129,64,252,.22) 62%)}
.grad b{color:#fff;background:none}
/* cover */
.cover .issue{margin-top:150px}
.cover h1{margin-top:44px;font-size:92px;line-height:1.22;font-weight:800;letter-spacing:-.035em}
.cover .sub{margin-top:44px;font-size:38px;line-height:1.5;font-weight:500;color:rgba(255,255,255,.85)}
.cover .dot{position:absolute;right:-180px;bottom:-200px;width:720px;height:720px;border-radius:50%;background:rgba(255,255,255,.07)}
.cover .dot2{position:absolute;right:120px;bottom:380px;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.9)}
/* hook */
.hook .text{margin-top:200px;font-size:84px;line-height:1.3;font-weight:800;letter-spacing:-.035em}
.hook .rule{margin:64px 0 0;width:96px;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--purple),var(--blue))}
.hook .sub{margin-top:56px;font-size:38px;line-height:1.68;font-weight:400;color:#3C3950}
/* point */
.point .chip{margin-top:120px}
.point h2{margin-top:44px;font-size:72px;line-height:1.3;font-weight:800;letter-spacing:-.035em}
.point .body{margin-top:60px;font-size:38px;line-height:1.72;color:#3C3950}
/* concept */
.concept .chip{margin-top:96px}
.concept .term{margin-top:40px;display:flex;align-items:baseline;gap:24px;flex-wrap:wrap}
.concept .term h2{font-size:104px;font-weight:800;letter-spacing:-.04em;line-height:1.1;background:linear-gradient(120deg,var(--purple),var(--blue));-webkit-background-clip:text;color:transparent}
.concept .term span{font-size:34px;font-weight:600;color:var(--muted)}
.concept .def{margin-top:32px;font-size:44px;line-height:1.45;font-weight:700;letter-spacing:-.02em}
.concept .box{margin-top:56px;background:#fff;border:2px solid var(--line);border-radius:32px;padding:48px 52px}
.concept .box .lbl{font-size:28px;font-weight:700;color:var(--purple);margin-bottom:20px}
.concept .box p{font-size:36px;line-height:1.7;color:#3C3950}
/* key */
.key .q{margin-top:150px;font-size:180px;line-height:.6;font-weight:800;color:rgba(255,255,255,.35);font-family:Georgia,serif}
.key .text{margin-top:40px;font-size:78px;line-height:1.36;font-weight:800;letter-spacing:-.035em}
.key .small{margin-top:64px;font-size:34px;line-height:1.6;font-weight:500;color:rgba(255,255,255,.85);padding-left:28px;border-left:6px solid rgba(255,255,255,.5)}
/* tips */
.tips h2{margin-top:72px;font-size:64px;line-height:1.3;font-weight:800;letter-spacing:-.035em}
.tips ol{list-style:none;margin-top:52px;display:flex;flex-direction:column;gap:26px}
.tips li{display:flex;gap:32px;background:#fff;border:2px solid var(--line);border-radius:28px;padding:36px 40px}
.tips .n{flex:none;width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--purple),var(--blue));color:#fff;font-size:32px;font-weight:800;display:flex;align-items:center;justify-content:center}
.tips .h{font-size:38px;font-weight:700;line-height:1.35;letter-spacing:-.02em}
.tips .d{margin-top:10px;font-size:30px;line-height:1.55;color:var(--muted)}
/* question */
.question .chip{margin-top:130px}
.question .q{margin-top:48px;font-size:66px;line-height:1.42;font-weight:800;letter-spacing:-.03em}
.question .cta{margin-top:auto;background:rgba(255,255,255,.12);border-radius:28px;padding:40px 44px;display:flex;justify-content:space-between;align-items:center}
.question .cta .t{font-size:34px;font-weight:700}
.question .cta .s{margin-top:10px;font-size:27px;color:rgba(255,255,255,.8)}
.question .cta img{height:52px}
`;

function body(c, set, i, n) {
  const page = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  const dark = ['cover', 'key', 'question'].includes(c.type);
  const top = `<div class="top"><img src="${dark ? LOGO_WHITE : LOGO_DARK}"><span class="page">${page}</span></div>`;
  const foot = (label) => `<div class="foot"><span>${label}</span><span class="arrow">→</span></div>`;
  const series = `${set.series || '뉴키즈 레터'} · ${set.issue}`;
  switch (c.type) {
    case 'cover':
      return `<div class="card grad cover"><div class="dot"></div><div class="dot2"></div>${top}
        <span class="chip issue">${set.chip || 'NEWKIDS LETTER'} · ${set.issue}</span>
        <h1>${br(c.title)}</h1><p class="sub">${br(c.sub)}</p>${foot('옆으로 넘겨보세요')}</div>`;
    case 'hook':
      return `<div class="card hook">${top}<div class="text">${br(c.text)}</div><div class="rule"></div>
        <p class="sub">${br(c.sub)}</p>${foot(series)}</div>`;
    case 'point':
      return `<div class="card point">${top}<span class="chip">${c.label}</span><h2>${br(c.title)}</h2>
        <p class="body">${br(c.body)}</p>${foot(series)}</div>`;
    case 'concept':
      return `<div class="card concept">${top}<span class="chip">오늘의 개념</span>
        <div class="term"><h2>${c.term}</h2>${c.en ? `<span>${c.en}</span>` : ''}</div>
        <p class="def">${br(c.def)}</p>
        <div class="box"><div class="lbl">비유로 보면</div><p>${br(c.analogy)}</p></div>${foot(series)}</div>`;
    case 'key':
      return `<div class="card grad key">${top}<div class="q">“</div><div class="text">${br(c.text)}</div>
        ${c.small ? `<p class="small">${br(c.small)}</p>` : ''}${foot(series)}</div>`;
    case 'tips':
      return `<div class="card tips">${top}<h2>${br(c.title)}</h2><ol>${c.items
        .map(([h, d], k) => `<li><span class="n">${k + 1}</span><div><div class="h">${br(h)}</div><div class="d">${br(d)}</div></div></li>`)
        .join('')}</ol>${foot(series)}</div>`;
    case 'question':
      return `<div class="card grad question">${top}<span class="chip">이번 달의 질문</span><p class="q">${br(c.q)}</p>
        <div class="cta"><div><div class="t">전문은 뉴스레터에서</div><div class="s">${set.cta || '매월 마지막 목요일 아침 8시 · 프로필 링크에서 구독'}</div></div></div></div>`;
  }
  throw new Error('unknown type ' + c.type);
}

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const set of sets) {
    if (only && set.id !== only) continue;
    const dir = path.join(ROOT, 'out', `${set.id}_${set.issue}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < set.cards.length; i++) {
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body(set.cards[i], set, i, set.cards.length)}</body></html>`;
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // 넘침 검사: 카드 안 요소가 하단 영역을 침범하면 경고
      const overflow = await page.evaluate(() => {
        const card = document.querySelector('.card');
        const foot = card.querySelector('.foot, .cta');
        const limit = foot ? foot.getBoundingClientRect().top : 1262;
        let worst = -Infinity;
        card.querySelectorAll('h1,h2,p,ol,.text,.box,.def').forEach((el) => {
          if (foot && foot.contains(el)) return;
          worst = Math.max(worst, el.getBoundingClientRect().bottom - limit);
        });
        return worst;
      });
      if (overflow > -8) console.warn(`⚠ ${set.issue} ${i + 1}장: 하단과 ${Math.round(overflow)}px 겹침`);
      await page.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log('✓', set.issue);
  }
  await browser.close();
})();
