/*
 * 개념 그림: 개념 카드의 fig 키와 이름이 같아요.
 * 색은 style.css의 .fig 규칙(토큰)에서 정해요. 글자는 viewBox 기준 15px 이상이라 휴대폰에서도 읽혀요.
 */
window.FIGS = {
  tokenPredict: {
    label: "LLM이 '오늘 날씨가' 다음에 올 말을 확률로 고르는 그림",
    svg: '<svg viewBox="0 0 420 230">' +
      '<rect class="f-box" x="10" y="78" width="132" height="54" rx="12"/><text class="f-t" x="76" y="111" text-anchor="middle">오늘 날씨가</text>' +
      '<path class="f-arrow" d="M150 105 H186"/><path class="f-head" d="M186 99 L196 105 L186 111 Z"/>' +
      '<text class="f-t" x="210" y="52">맑네요</text><rect class="f-bar on" x="276" y="36" width="124" height="22" rx="6"/><text class="f-n" x="392" y="52" text-anchor="end">62%</text>' +
      '<text class="f-t" x="210" y="112">흐려요</text><rect class="f-bar" x="276" y="96" width="50" height="22" rx="6"/><text class="f-m" x="334" y="112">25%</text>' +
      '<text class="f-t" x="210" y="172">좋아요</text><rect class="f-bar" x="276" y="156" width="26" height="22" rx="6"/><text class="f-m" x="310" y="172">13%</text>' +
      '<text class="f-m" x="10" y="200">다음 말을 확률로 골라 이어 써요.</text><text class="f-m" x="10" y="220">그래서 그럴듯하지만 틀릴 수 있어요.</text></svg>'
  },
  contextWindow: {
    label: "컨텍스트 창이 가득 차면 오래된 대화부터 밀려나는 그림",
    svg: '<svg viewBox="0 0 420 210">' +
      '<rect class="f-desk" x="96" y="30" width="300" height="136" rx="14"/><text class="f-m" x="246" y="186" text-anchor="middle">AI의 책상 (컨텍스트)</text>' +
      '<g class="f-fade"><rect class="f-paper" x="14" y="66" width="96" height="64" rx="8" transform="rotate(-12 62 98)"/><text class="f-t" x="58" y="104" text-anchor="middle" transform="rotate(-12 62 98)">처음 지시</text></g>' +
      '<rect class="f-paper" x="120" y="62" width="80" height="72" rx="8"/><text class="f-t" x="160" y="104" text-anchor="middle">중간</text>' +
      '<rect class="f-paper" x="210" y="62" width="80" height="72" rx="8"/><text class="f-t" x="250" y="104" text-anchor="middle">최근</text>' +
      '<rect class="f-paper on" x="300" y="62" width="80" height="72" rx="8"/><text class="f-t f-inv" x="340" y="104" text-anchor="middle">새 대화</text>' +
      '<path class="f-arrow" d="M300 150 H130"/><path class="f-head" d="M130 144 L120 150 L130 156 Z"/>' +
      '<text class="f-m" x="10" y="24">책상이 가득 차면 오래된 내용부터 떨어져요</text></svg>'
  },
  agentLoop: {
    label: "에이전트가 계획, 실행, 확인, 수정을 반복하고 사람이 지시와 검수를 맡는 그림",
    svg: '<svg viewBox="0 0 420 260">' +
      '<circle class="f-ring" cx="210" cy="140" r="78"/>' +
      '<rect class="f-box on" x="170" y="44" width="80" height="38" rx="19"/><text class="f-t f-inv" x="210" y="69" text-anchor="middle">계획</text>' +
      '<rect class="f-box" x="258" y="121" width="80" height="38" rx="19"/><text class="f-t" x="298" y="146" text-anchor="middle">실행</text>' +
      '<rect class="f-box" x="170" y="198" width="80" height="38" rx="19"/><text class="f-t" x="210" y="223" text-anchor="middle">확인</text>' +
      '<rect class="f-box" x="82" y="121" width="80" height="38" rx="19"/><text class="f-t" x="122" y="146" text-anchor="middle">수정</text>' +
      '<text class="f-m" x="210" y="146" text-anchor="middle">에이전트</text>' +
      '<rect class="f-me" x="14" y="16" width="112" height="34" rx="8"/><text class="f-t" x="70" y="39" text-anchor="middle">나: 지시</text><path class="f-arrow" d="M126 40 L166 58"/>' +
      '<rect class="f-me" x="294" y="210" width="112" height="34" rx="8"/><text class="f-t" x="350" y="233" text-anchor="middle">나: 검수</text><path class="f-arrow" d="M254 220 L290 226"/>' +
      '</svg>'
  },
  deployFlow: {
    label: "내 컴퓨터에서 GitHub, Vercel을 거쳐 누구나 여는 주소가 되는 배포 흐름 그림",
    svg: '<svg viewBox="0 0 400 250">' +
      '<rect class="f-box" x="14" y="20" width="150" height="70" rx="12"/><text class="f-t" x="89" y="50" text-anchor="middle">내 컴퓨터</text><text class="f-m" x="89" y="72" text-anchor="middle">코드와 커밋</text>' +
      '<path class="f-arrow" d="M170 55 H222"/><path class="f-head" d="M222 49 L232 55 L222 61 Z"/><text class="f-m" x="198" y="44" text-anchor="middle">push</text>' +
      '<rect class="f-box" x="236" y="20" width="150" height="70" rx="12"/><text class="f-t" x="311" y="50" text-anchor="middle">GitHub</text><text class="f-m" x="311" y="72" text-anchor="middle">보관함</text>' +
      '<path class="f-arrow" d="M311 96 V146"/><path class="f-head" d="M305 146 L311 156 L317 146 Z"/><text class="f-m" x="320" y="128">자동 연결</text>' +
      '<rect class="f-box" x="236" y="160" width="150" height="70" rx="12"/><text class="f-t" x="311" y="190" text-anchor="middle">Vercel</text><text class="f-m" x="311" y="212" text-anchor="middle">빌드·배포</text>' +
      '<path class="f-arrow" d="M230 195 H178"/><path class="f-head" d="M178 189 L168 195 L178 201 Z"/><text class="f-m" x="204" y="184" text-anchor="middle">공개</text>' +
      '<rect class="f-box on" x="14" y="160" width="150" height="70" rx="12"/><text class="f-t f-inv" x="89" y="190" text-anchor="middle">주소 (URL)</text><text class="f-m f-inv" x="89" y="212" text-anchor="middle">누구나 접속</text>' +
      '</svg>'
  },
  stairs: {
    label: "코스의 다섯 계단: 대화, 만들기, 쌓기는 기본 코스이고 맡기기, 자동화는 보너스",
    svg: '<svg viewBox="0 0 420 250">' +
      '<rect class="f-box on" x="10" y="150" width="76" height="60" rx="10"/>' +
      '<text class="f-m f-inv" x="48" y="172" text-anchor="middle">STEP 1</text><text class="f-t f-inv" x="48" y="194" text-anchor="middle">대화</text>' +
      '<rect class="f-box" x="92" y="120" width="76" height="90" rx="10"/>' +
      '<text class="f-m" x="130" y="142" text-anchor="middle">STEP 2</text><text class="f-t" x="130" y="164" text-anchor="middle">만들기</text>' +
      '<rect class="f-box" x="174" y="90" width="76" height="120" rx="10"/>' +
      '<text class="f-m" x="212" y="112" text-anchor="middle">STEP 3</text><text class="f-t" x="212" y="134" text-anchor="middle">쌓기</text>' +
      '<rect class="f-me" x="256" y="60" width="76" height="150" rx="10"/>' +
      '<text class="f-m" x="294" y="82" text-anchor="middle">STEP 4</text><text class="f-t" x="294" y="104" text-anchor="middle">맡기기</text>' +
      '<rect class="f-me" x="338" y="30" width="76" height="180" rx="10"/>' +
      '<text class="f-m" x="376" y="52" text-anchor="middle">STEP 5</text><text class="f-t" x="376" y="74" text-anchor="middle">자동화</text>' +
      '<text class="f-m" x="10" y="238">실선 칸: 기본 코스 · 점선 칸: 보너스(선택)</text>' +
      '</svg>'
  },
  harness: {
    label: "하네스 해부도: 가운데 모델(두뇌)을 도구, 권한, CLAUDE.md, 스킬, MCP, 서브에이전트, 훅, 컴팩션이 사무실처럼 둘러싼 그림",
    svg: '<svg viewBox="0 0 420 300">' +
      '<rect class="f-ring" x="14" y="30" width="392" height="258" rx="18"/><text class="f-m" x="22" y="20">하네스 = 모델을 둘러싼 사무실</text>' +
      '<path class="f-link" d="M210 158 L86 67 M210 158 L210 67 M210 158 L334 67 M210 158 L86 157 M210 158 L334 157 M210 158 L86 247 M210 158 L210 247 M210 158 L334 247"/>' +
      '<rect class="f-box" x="30" y="50" width="112" height="34" rx="9"/><text class="f-t" x="86" y="73" text-anchor="middle">CLAUDE.md</text>' +
      '<rect class="f-box" x="154" y="50" width="112" height="34" rx="9"/><text class="f-t" x="210" y="73" text-anchor="middle">스킬</text>' +
      '<rect class="f-box" x="278" y="50" width="112" height="34" rx="9"/><text class="f-t" x="334" y="73" text-anchor="middle">MCP</text>' +
      '<rect class="f-box" x="30" y="140" width="112" height="34" rx="9"/><text class="f-t" x="86" y="163" text-anchor="middle">도구</text>' +
      '<rect class="f-box on" x="154" y="130" width="112" height="56" rx="14"/><text class="f-t f-inv" x="210" y="155" text-anchor="middle">모델</text><text class="f-m f-inv" x="210" y="176" text-anchor="middle">두뇌</text>' +
      '<rect class="f-box" x="278" y="140" width="112" height="34" rx="9"/><text class="f-t" x="334" y="163" text-anchor="middle">권한</text>' +
      '<rect class="f-box" x="30" y="230" width="112" height="34" rx="9"/><text class="f-t" x="86" y="253" text-anchor="middle">서브에이전트</text>' +
      '<rect class="f-box" x="154" y="230" width="112" height="34" rx="9"/><text class="f-t" x="210" y="253" text-anchor="middle">훅</text>' +
      '<rect class="f-box" x="278" y="230" width="112" height="34" rx="9"/><text class="f-t" x="334" y="253" text-anchor="middle">컴팩션</text>' +
      '</svg>'
  },
  triggerAction: {
    label: "트리거가 생기면 AI가 액션을 하고, 결과는 먼저 나에게 와서 사람이 확인한 뒤 공유하는 자동화 흐름 그림",
    svg: '<svg viewBox="0 0 420 210">' +
      '<rect class="f-box on" x="10" y="30" width="116" height="70" rx="12"/><text class="f-t f-inv" x="68" y="60" text-anchor="middle">트리거</text><text class="f-m f-inv" x="68" y="84" text-anchor="middle">매주 월 9시</text>' +
      '<path class="f-arrow" d="M130 65 H140"/><path class="f-head" d="M140 59 L150 65 L140 71 Z"/>' +
      '<rect class="f-box" x="152" y="30" width="116" height="70" rx="12"/><text class="f-t" x="210" y="60" text-anchor="middle">액션</text><text class="f-m" x="210" y="84" text-anchor="middle">AI가 요약</text>' +
      '<path class="f-arrow" d="M272 65 H282"/><path class="f-head" d="M282 59 L292 65 L282 71 Z"/>' +
      '<rect class="f-box" x="294" y="30" width="116" height="70" rx="12"/><text class="f-t" x="352" y="60" text-anchor="middle">결과</text><text class="f-m" x="352" y="84" text-anchor="middle">나에게만</text>' +
      '<path class="f-arrow" d="M352 104 V132"/><path class="f-head" d="M346 132 L352 142 L358 132 Z"/>' +
      '<rect class="f-me" x="152" y="146" width="258" height="44" rx="10"/><text class="f-t" x="281" y="174" text-anchor="middle">사람이 확인한 뒤 공유</text>' +
      '<text class="f-m" x="10" y="174">자동화는</text><text class="f-m" x="10" y="194">초안까지</text>' +
      '</svg>'
  },
  dataLight: {
    label: "데이터 신호등: 초록은 넣어도 됨, 노랑은 가려서, 빨강은 넣지 않음",
    svg: '<svg viewBox="0 0 420 220">' +
      '<rect class="f-desk" x="14" y="14" width="72" height="192" rx="36"/>' +
      '<circle class="f-go" cx="50" cy="50" r="24"/><circle class="f-wait" cx="50" cy="110" r="24"/><circle class="f-stop" cx="50" cy="170" r="24"/>' +
      '<text class="f-t" x="104" y="44">넣어도 됨</text><text class="f-m" x="104" y="66">공개 자료, 내가 쓴 초안</text>' +
      '<text class="f-t" x="104" y="104">가려서</text><text class="f-m" x="104" y="126">회의 메모 → 이름·금액을 [가명]으로</text>' +
      '<text class="f-t" x="104" y="164">넣지 않음</text><text class="f-m" x="104" y="186">주민번호, 계좌, 비밀번호, 계약서 원문</text>' +
      '</svg>'
  }
};
