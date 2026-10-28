# PLAN_Be AI 실전 교실

제주패스파인더 플랜비 시즌10 바이브코딩 해커톤 참가자를 위한 강의 사이트입니다.
빌드 과정 없이 HTML, CSS, JS 파일만으로 동작합니다.

## 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 랜딩 페이지 (스크롤·마우스에 반응하는 타이포그래피) |
| `assets/landing.css`, `assets/landing.js` | 랜딩 전용 스타일과 움직임 |
| `study.html` | 독학 노트 (탭 메뉴가 있는 본문) |
| `assets/content.js` | 사이트의 모든 글(일정, 강의, 용어, 스킬, 플레이북 등). **다음 시즌에는 이 파일만 고치면 됩니다** |
| `assets/style.css` | 디자인 (라이트/다크 모드, 모바일, A4 치트시트 인쇄) |
| `assets/app.js` | 탭 이동, 복사 버튼, 체크리스트, 서비스 설명서 작성기, 타이머, 자가진단 |

## 로컬에서 보기

```bash
cd site && python3 -m http.server 8000
```

## 자가진단 데이터

- Vercel 사이트에서 제출하면 Supabase `newkids-web` 프로젝트의 `planbe_self_check` 테이블에 저장됩니다.
- 참가자(공개 키)는 제출만 할 수 있고 조회는 막혀 있습니다. 결과는 Supabase 대시보드에서 확인하세요.
- Claude 아티팩트 버전에서는 아티팩트 자체 저장소(`selfcheck` 컬렉션)에 저장됩니다.
