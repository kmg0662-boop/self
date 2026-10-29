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
