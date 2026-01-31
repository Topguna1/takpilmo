// tips/tips.view.js - Tips 페이지 뷰 렌더링

(function() {
  'use strict';

  // 과목명 매핑
  const subjectNames = {
    korean: "국어",
    math: "수학",
    english: "영어",
    science: "과학",
    social: "사회",
    history: "역사",
    art: "예술",
    music: "음악",
    pe: "체육",
    tech: "기술",
    coding: "코딩",
    language: "외국어",
    general: "종합",
    exam: "시험대비",
    career: "진로"
  };

  // 과목별 이모지
  const subjectEmojis = {
    korean: "📖",
    math: "🔢",
    english: "🔤",
    science: "🔬",
    social: "🌍",
    history: "📜",
    art: "🎨",
    music: "🎵",
    pe: "⚽",
    tech: "🔧",
    coding: "💻",
    language: "🗣️",
    general: "📚",
    exam: "✏️",
    career: "🎯"
  };

  // 과목별 맞춤 팁 데이터
  const subjectTips = {
    history: {
      title: "역사 자료 찾기 팁",
      tips: [
        {
          title: "🏛️ 신뢰할 수 있는 역사 자료원",
          items: [
            "<strong>국사편찬위원회:</strong> 공식 한국사 자료와 사료를 제공합니다.",
            "<strong>국립중앙박물관:</strong> 유물 정보와 전시 자료를 온라인으로 볼 수 있습니다.",
            "<strong>e-뮤지엄:</strong> 전국 박물관의 소장품을 한 곳에서 검색할 수 있습니다.",
            "<strong>한국사데이터베이스:</strong> 다양한 역사 DB를 통합 검색할 수 있습니다."
          ]
        },
        {
          title: "📅 시대별 자료 찾기",
          items: [
            "<strong>선사시대:</strong> '구석기', '신석기', '청동기' 등 시대명과 '유적', '유물' 키워드를 함께 검색하세요.",
            "<strong>삼국시대:</strong> '고구려', '백제', '신라'와 함께 '고분', '문화재' 등을 검색하세요.",
            "<strong>고려/조선시대:</strong> 왕조명과 함께 '정치', '문화', '경제' 등 주제어를 조합하세요.",
            "<strong>근현대사:</strong> 연도와 함께 '독립운동', '일제강점기', '민주화' 등 키워드를 사용하세요."
          ]
        },
        {
          title: "🔍 효과적인 역사 검색 방법",
          items: [
            "<strong>인물 검색:</strong> 인물명과 함께 '업적', '생애', '사상' 등을 추가하세요.",
            "<strong>사건 검색:</strong> 사건명과 '배경', '전개', '결과', '의의'를 함께 검색하세요.",
            "<strong>문화재 검색:</strong> 문화재명 또는 '국보', '보물', '사적'과 번호를 함께 검색하세요.",
            "<strong>1차 사료 활용:</strong> '실록', '승정원일기', '조선왕조실록' 등 원문 자료를 찾아보세요."
          ]
        },
        {
          title: "📖 역사 학습 추천 사이트",
          items: [
            "<strong>국사편찬위원회 한국사데이터베이스:</strong> 조선왕조실록, 승정원일기 등 원문 제공",
            "<strong>문화재청 국가문화유산포털:</strong> 문화재 정보와 3D 자료 제공",
            "<strong>국립중앙박물관 e뮤지엄:</strong> 유물 사진과 설명 제공",
            "<strong>동북아역사넷:</strong> 동북아시아 역사 관련 종합 정보 제공"
          ]
        },
        {
          title: "⚠️ 역사 자료 이용 시 주의사항",
          items: [
            "<strong>출처 확인:</strong> 학술 자료, 공공기관 자료를 우선적으로 활용하세요.",
            "<strong>다양한 관점:</strong> 한 가지 시각이 아닌 여러 해석을 비교해보세요.",
            "<strong>시대적 맥락:</strong> 현대의 기준이 아닌 당시 상황에서 이해하세요.",
            "<strong>사료 비판:</strong> 1차 사료라도 작성자의 의도를 고려하며 읽으세요."
          ]
        }
      ]
    },
    math: {
      title: "수학 자료 찾기 팁",
      tips: [
        {
          title: "🔢 수학 학습 사이트 추천",
          items: [
            "<strong>EBS 수학:</strong> 학년별, 단원별 개념 강의와 문제 제공",
            "<strong>Khan Academy:</strong> 기초부터 고급까지 체계적인 수학 강의",
            "<strong>mathisfun:</strong> 시각적으로 수학 개념을 설명하는 사이트",
            "<strong>GeoGebra:</strong> 수학 시각화 도구 및 예제 제공"
          ]
        },
        {
          title: "📐 개념별 검색 방법",
          items: [
            "<strong>대수:</strong> '방정식 풀이', '인수분해', '함수 그래프' 등 구체적 키워드 사용",
            "<strong>기하:</strong> '도형의 성질', '삼각형 합동', '원의 성질' 등으로 검색",
            "<strong>확률/통계:</strong> '경우의 수', '확률 계산', '통계 그래프' 등으로 검색",
            "<strong>미적분:</strong> '극한', '미분', '적분', '도함수' 등 정확한 용어 사용"
          ]
        },
        {
          title: "💡 수학 문제 풀이 찾기",
          items: [
            "<strong>유형별 검색:</strong> '이차방정식 응용문제', '삼각함수 활용' 등으로 검색",
            "<strong>난이도 지정:</strong> '중학교 수학', '고등 수학', '심화 문제' 등 명시",
            "<strong>풀이 과정:</strong> '단계별 풀이', '자세한 설명', '오답노트' 등 추가",
            "<strong>시각 자료:</strong> '그래프', '도형', '그림으로 이해하기' 등 검색"
          ]
        },
        {
          title: "🎯 효과적인 수학 학습법",
          items: [
            "<strong>개념 먼저:</strong> 문제 풀이 전에 개념 강의를 먼저 보세요",
            "<strong>단계별 학습:</strong> 기본 → 응용 → 심화 순서로 진행하세요",
            "<strong>반복 연습:</strong> 같은 유형을 여러 번 풀어보세요",
            "<strong>오답 정리:</strong> 틀린 문제는 왜 틀렸는지 반드시 확인하세요"
          ]
        }
      ]
    },
    korean: {
      title: "국어 자료 찾기 팁",
      tips: [
        {
          title: "📖 국어 학습 자료",
          items: [
            "<strong>국립국어원:</strong> 표준국어대사전, 맞춤법 검사, 언어 규범 제공",
            "<strong>EBS 국어:</strong> 문법, 문학, 독서, 작문 영역별 강의",
            "<strong>국어문화원:</strong> 국어 순화, 바른 언어 사용 정보 제공",
            "<strong>한국고전번역원:</strong> 고전 문학 원문과 번역문 제공"
          ]
        },
        {
          title: "📚 문학 작품 찾기",
          items: [
            "<strong>작가명 검색:</strong> '이육사 시', '박경리 소설' 등으로 검색",
            "<strong>시대별 검색:</strong> '고전문학', '현대문학', '1920년대 소설' 등",
            "<strong>갈래별 검색:</strong> '서정시', '서사시', '수필', '희곡' 등 장르 명시",
            "<strong>작품 분석:</strong> '작품명 + 해설', '작품명 + 감상' 등으로 검색"
          ]
        },
        {
          title: "✍️ 문법 및 어휘 학습",
          items: [
            "<strong>문법:</strong> '품사', '문장 성분', '높임법', '시제' 등 정확한 용어 사용",
            "<strong>어휘:</strong> '한자 성어', '속담', '관용어', '순우리말' 등으로 검색",
            "<strong>맞춤법:</strong> 헷갈리는 단어 2개를 함께 검색 ('가르치다 vs 가리키다')",
            "<strong>띄어쓰기:</strong> '띄어쓰기 규칙', '의존명사 띄어쓰기' 등으로 검색"
          ]
        },
        {
          title: "📝 독서 및 작문",
          items: [
            "<strong>독서:</strong> '비문학 독해', '글의 구조', '주장과 근거' 등으로 검색",
            "<strong>작문:</strong> '논설문 쓰기', '서사문 구조', '설명문 예시' 등",
            "<strong>어휘력:</strong> '교과서 필수 어휘', '독서 필수 어휘' 등",
            "<strong>독후감:</strong> '독후감 쓰는 법', '책 감상문 예시' 등"
          ]
        }
      ]
    },
    english: {
      title: "영어 자료 찾기 팁",
      tips: [
        {
          title: "🔤 영어 학습 사이트",
          items: [
            "<strong>EBS English:</strong> 학년별 교과서 영어 강의 제공",
            "<strong>BBC Learning English:</strong> 무료 영어 학습 콘텐츠",
            "<strong>Duolingo:</strong> 게임처럼 재미있게 영어 학습",
            "<strong>영어사전:</strong> 네이버 영어사전, 다음 영어사전 활용"
          ]
        },
        {
          title: "📖 영역별 학습 방법",
          items: [
            "<strong>단어:</strong> '중학 영단어', '고등 필수 어휘', 'TOEFL 단어' 등으로 검색",
            "<strong>문법:</strong> '시제', '조동사', '관계대명사', '가정법' 등 문법 항목별 검색",
            "<strong>독해:</strong> '영어 독해 지문', '빈칸 추론', '주제 찾기' 등",
            "<strong>듣기:</strong> '영어 듣기 연습', 'dictation', 'listening practice' 등"
          ]
        },
        {
          title: "🎧 영어 듣기 및 말하기",
          items: [
            "<strong>듣기 연습:</strong> TED Talks, BBC News, VOA Learning English 활용",
            "<strong>발음:</strong> 'pronunciation guide', '발음 기호', 'IPA chart' 검색",
            "<strong>회화:</strong> '일상 회화', '상황별 영어 표현', 'English conversation' 검색",
            "<strong>팟캐스트:</strong> 'ESL podcast', '영어 학습 팟캐스트' 검색"
          ]
        },
        {
          title: "✏️ 영어 쓰기",
          items: [
            "<strong>작문:</strong> 'essay writing', '영작문 예시', '문장 패턴' 검색",
            "<strong>문법 검사:</strong> Grammarly, 맞춤법 검사 사이트 활용",
            "<strong>이메일:</strong> '영어 이메일 양식', 'formal email' 등",
            "<strong>일기:</strong> '영어 일기 쓰기', 'diary writing tips' 등"
          ]
        }
      ]
    },
    science: {
      title: "과학 자료 찾기 팁",
      tips: [
        {
          title: "🔬 과학 학습 사이트",
          items: [
            "<strong>EBS 사이언스:</strong> 과학 다큐멘터리 및 교과 강의",
            "<strong>국립과학관:</strong> 과학 전시, 실험 영상, 자료 제공",
            "<strong>사이언스올:</strong> 과학 학습 자료 통합 검색",
            "<strong>PhET 시뮬레이션:</strong> 과학 실험 시뮬레이션 제공"
          ]
        },
        {
          title: "🧪 분야별 검색 방법",
          items: [
            "<strong>물리:</strong> '운동', '에너지', '전기', '파동' 등 단원별 검색",
            "<strong>화학:</strong> '원소', '화학 반응', '산과 염기', '화학 결합' 등",
            "<strong>생물:</strong> '세포', '유전', '생태계', '진화' 등",
            "<strong>지구과학:</strong> '지구의 구조', '날씨', '천체', '암석' 등"
          ]
        },
        {
          title: "🎥 실험 및 시각 자료",
          items: [
            "<strong>실험 영상:</strong> '과학 실험', 'science experiment', '실험 동영상' 검색",
            "<strong>시뮬레이션:</strong> '가상 실험', 'virtual lab', '3D 모델' 검색",
            "<strong>인포그래픽:</strong> '과학 인포그래픽', '과정 그림', '구조도' 등",
            "<strong>다큐멘터리:</strong> '과학 다큐', 'BBC Science', 'Cosmos' 등"
          ]
        },
        {
          title: "💡 과학 개념 이해하기",
          items: [
            "<strong>기초 개념:</strong> 교과서 순서대로 단계별 학습",
            "<strong>시각화:</strong> 그림, 도표, 애니메이션으로 개념 이해",
            "<strong>실생활 연결:</strong> '과학 원리 실생활', '일상 속 과학' 검색",
            "<strong>탐구 활동:</strong> 실험 보고서, 탐구 과제 예시 참고"
          ]
        }
      ]
    },
    social: {
      title: "사회 자료 찾기 팁",
      tips: [
        {
          title: "🌍 사회 학습 자료",
          items: [
            "<strong>국토지리정보원:</strong> 지도, 지리 정보 제공",
            "<strong>통계청:</strong> 각종 통계 자료와 그래프 제공",
            "<strong>법제처:</strong> 법령 정보와 헌법 자료",
            "<strong>한국은행:</strong> 경제 통계 및 교육 자료"
          ]
        },
        {
          title: "📊 영역별 검색",
          items: [
            "<strong>지리:</strong> '지형', '기후', '인구', '지역 특성' 등으로 검색",
            "<strong>정치:</strong> '민주주의', '정치 제도', '선거', '삼권분립' 등",
            "<strong>경제:</strong> '시장', '가격', '무역', '금융' 등",
            "<strong>법:</strong> '헌법', '법의 종류', '재판', '권리와 의무' 등"
          ]
        },
        {
          title: "🗺️ 지도 및 통계 자료",
          items: [
            "<strong>지도:</strong> '주제도', '단계구분도', '등치선도' 등으로 검색",
            "<strong>통계:</strong> 'KOSIS 통계', '인구 통계', '경제 지표' 등",
            "<strong>그래프:</strong> '막대그래프', '원그래프', '꺾은선 그래프' 활용",
            "<strong>자료 해석:</strong> '통계 분석', '자료 읽는 법' 등 검색"
          ]
        },
        {
          title: "📰 시사 및 뉴스",
          items: [
            "<strong>신문:</strong> '학생 신문', '어린이 신문', 'NIE 자료' 활용",
            "<strong>시사:</strong> '이슈 정리', '시사 상식', '뉴스 해설' 검색",
            "<strong>토론:</strong> '토론 주제', '찬반 논거', '디베이트 자료' 등",
            "<strong>공공기관:</strong> 정부 부처 홈페이지의 정책 자료 활용"
          ]
        }
      ]
    },
    coding: {
      title: "코딩 자료 찾기 팁",
      tips: [
        {
          title: "💻 코딩 학습 사이트",
          items: [
            "<strong>엔트리:</strong> 블록 코딩으로 프로그래밍 기초 학습",
            "<strong>스크래치:</strong> MIT에서 만든 교육용 프로그래밍 언어",
            "<strong>생활코딩:</strong> 웹, 앱 개발 무료 강의",
            "<strong>코드닷오알지:</strong> 게임처럼 코딩을 배우는 사이트"
          ]
        },
        {
          title: "📚 프로그래밍 언어별",
          items: [
            "<strong>Python:</strong> '파이썬 기초', 'Python tutorial', '파이썬 문법' 검색",
            "<strong>JavaScript:</strong> 'JS 기초', '자바스크립트 배우기', 'ES6' 등",
            "<strong>Java:</strong> '자바 입문', 'Java tutorial', '객체지향' 등",
            "<strong>C/C++:</strong> 'C언어 기초', '포인터', '자료구조' 등"
          ]
        },
        {
          title: "🎯 분야별 학습",
          items: [
            "<strong>웹 개발:</strong> 'HTML CSS', '웹 프론트엔드', '백엔드' 검색",
            "<strong>앱 개발:</strong> '안드로이드 개발', 'iOS 개발', '앱 인벤터' 등",
            "<strong>게임 개발:</strong> 'Unity', 'Unreal', '게임 엔진' 검색",
            "<strong>인공지능:</strong> '머신러닝', 'AI 기초', 'TensorFlow' 등"
          ]
        },
        {
          title: "🔧 문제 해결 및 실습",
          items: [
            "<strong>알고리즘:</strong> '백준', '프로그래머스', 'LeetCode' 등 문제 풀이 사이트",
            "<strong>에러 해결:</strong> 에러 메시지 전체를 복사해서 검색",
            "<strong>코드 리뷰:</strong> 'GitHub', 'Stack Overflow'에서 다른 사람 코드 참고",
            "<strong>프로젝트:</strong> '토이 프로젝트', '포트폴리오 예제' 등 검색"
          ]
        }
      ]
    }
  };

  // ✅ tips 추천 사이트: "<strong>사이트명:</strong> 설명" 형태를 자동으로 링크로 변환
function normalizeSiteKey(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "").trim();
}

function escapeAttr(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildTipsSiteUrlMap() {
  const map = new Map();

  // 1) 메인에서 이미 로드된 사이트 목록이 있으면 그걸 최우선 사용 (가장 안정적)
  let all = null;
  if (typeof window.getAllSites === "function") {
    try { all = window.getAllSites(); } catch (e) {}
  }

  // 2) 혹시 전역 배열이 있는 경우 폴백
  if (!Array.isArray(all)) {
    if (Array.isArray(window.sites)) all = window.sites;
    else if (Array.isArray(window.SITES)) all = window.SITES;
    else if (Array.isArray(window.SITES_DATA)) all = window.SITES_DATA;
  }

  // 3) 맵 구성
  if (Array.isArray(all)) {
    all.forEach(s => {
      if (!s) return;
      const url = (s.url || s.link || "").trim();
      if (!url) return;

      if (s.name) map.set(normalizeSiteKey(s.name), url);
      if (s.key) map.set(normalizeSiteKey(s.key), url);
      if (s.id) map.set(normalizeSiteKey(s.id), url);
    });
  }

  return map;
}

function enhanceItemWithSiteLink(item, urlMap) {
  const raw = String(item || "");
  // "<strong>OOO:</strong>" 패턴 찾기
  const m = raw.match(/<strong>\s*([^<:]+?)\s*:\s*<\/strong>/i);
  if (!m) return raw;

  const siteName = m[1].trim();
  const url =
    urlMap.get(normalizeSiteKey(siteName)) ||
    urlMap.get(normalizeSiteKey(siteName.replaceAll(" ", "")));

  if (!url) return raw; // 매칭 실패면 원본 유지

  const aTag =
    `<a class="tips-site-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">` +
    `<strong>${siteName}</strong></a>:`;

  // 기존 "<strong>사이트명:</strong>"를 "링크+strong:" 으로 교체
  return raw.replace(m[0], aTag);
}

  /**
   * 일반 팁 HTML 생성
   */
  function getGeneralTipsHTML() {
    const queryTemplates = [
      { title: "📌 개념 찾기", q: "중2 수학 일차함수 개념 정리 PDF" },
      { title: "🧩 문제 유형", q: "고1 국어 문학 고전시가 문제 유형" },
      { title: "📝 수행평가", q: "중학교 과학 수행평가 보고서 예시" },
      { title: "🎯 시험 대비", q: "중3 역사 1단원 핵심 정리 + 기출" },
      { title: "🔍 공식 자료", q: "교육청 가정통신문 양식 PDF" },
      { title: "📊 통계/자료", q: "KOSIS 청소년 스마트폰 사용 통계" }
    ];

    const scenarios = [
      {
        title: "⏱️ 10분 안에 급하게 자료가 필요할 때",
        steps: [
          "과목 선택 → (정부 운영 ON 가능하면 ON) → 검색어는 '단원명 + (정리/요약/기출)'",
          "EBS/교육청/공공기관 우선 클릭",
          "너무 길면 '핵심 요약', '개념 5분', '단원 정리'로 검색어 변경"
        ]
      },
      {
        title: "📚 시험을 제대로 준비하고 싶을 때",
        steps: [
          "1) 개념 정리 → 2) 대표 유형 → 3) 기출/서술형 → 4) 오답노트 순서",
          "검색어에 '기출', '서술형', '단원별 문제'를 꼭 포함",
          "틀린 문제는 '오답 원인(개념/계산/조건해석/자료해석)'으로 분류"
        ]
      },
      {
        title: "🧪 수행평가/탐구 과제(보고서)가 필요할 때",
        steps: [
          "주제 + '탐구 보고서', '실험 과정', '변인 통제', '참고문헌' 키워드로 검색",
          "반드시 2개 이상 출처 비교",
          "표/그래프는 원자료(공공데이터/통계청/KOSIS 등) 기반으로 만들기"
        ]
      }
    ];

    const reliabilityChecks = [
      "출처가 공공기관/교육기관/학술기관인가?",
      "작성일/업데이트 날짜가 최근인가?",
      "근거(통계, 원문, 참고문헌)가 있는가?",
      "광고성 문구/과장(‘무조건’, ‘100%’)이 많은가?",
      "같은 내용이 다른 신뢰 출처에서도 확인되는가?"
    ];

    const fixChecklist = [
      "검색어를 더 구체화: (학년/단원/유형/형식 PDF·PPT·문제) 추가",
      "동의어로 바꾸기: '요약'↔'정리', '기출'↔'모의고사', '해설'↔'풀이'",
      "따옴표 검색: \"정확한 문장\"으로 검색",
      "사이트 내 검색이 약하면: 검색엔진에서 '사이트명 + 키워드'로 우회",
      "원하는 게 안 나오면: '예시/양식/템플릿'을 먼저 찾고 내용을 채우기"
    ];

    return `
      <div class="tip-card">
        <h3 class="tip-title">🚀 1분 컷: 자료 찾기 기본 루틴</h3>
        <ul class="tip-list">
          <li><strong>목적부터:</strong> 개념? 문제? 기출? 수행평가? → 목적에 따라 검색어가 달라요.</li>
          <li><strong>필터 순서 추천:</strong> 과목 → 연령대 → (정부 운영) → 검색어</li>
          <li><strong>검색어 공식:</strong> <strong>학년 + 단원(또는 주제) + 형태(PDF/PPT/문제/해설) + 목적(정리/기출/서술형)</strong></li>
        </ul>
      </div>

      <div class="tip-card">
        <h3 class="tip-title">🧠 바로 복사해서 쓰는 검색어 템플릿 (예시)</h3>
        <ul class="tip-list">
          ${queryTemplates.map(t => `<li><strong>${t.title}: </strong>${t.q}</span></li>`).join("")}
        </ul>
      </div>

      <div class="tip-card">
        <h3 class="tip-title">🧭 상황별 “필터 + 검색” 진행 순서</h3>
        <ul class="tip-list">
          ${scenarios.map(s => `
            <li>
              <strong>${s.title}</strong>
              <ul class="tip-list" style="margin-top: 10px;">
                ${s.steps.map(x => `<li>${x}</li>`).join("")}
              </ul>
            </li>
          `).join("")}
        </ul>
      </div>

      <div class="tip-card">
        <h3 class="tip-title">🏛️ 정부 운영/공식 자료가 좋은 이유 + 체크리스트</h3>
        <ul class="tip-list">
          <li><strong>정확도:</strong> 시험/입시/정책/통계는 공식 자료가 가장 오류가 적어요.</li>
          <li><strong>활용 팁:</strong> “정부 운영”을 켜고 먼저 훑은 뒤, 부족한 부분만 일반 사이트로 보완하세요.</li>
          ${reliabilityChecks.map(x => `<li>${x}</li>`).join("")}
        </ul>
      </div>

      <div class="tip-card">
        <h3 class="tip-title">✅ 5초 신뢰도 점검표 (자료 걸러내기)</h3>
        <ul class="tip-list">
          ${reliabilityChecks.map(x => `<li>${x}</li>`).join("")}
        </ul>
      </div>

      <div class="tip-card">
        <h3 class="tip-title">🛠️ 검색이 안 될 때 해결 루틴</h3>
        <ul class="tip-list">
          ${fixChecklist.map(x => `<li>${x}</li>`).join("")}
        </ul>
      </div>

      <div class="tip-card tip-card-highlight">
        <h3 class="tip-title">⚠️ 안전/주의</h3>
        <ul class="tip-list">
          <li><strong>저작권 존중:</strong> 자료를 사용할 때는 항상 저작권을 확인하고 출처를 밝히세요.</li>
          <li><strong>개인정보 보호:</strong> 회원가입이 필요한 사이트에서는 개인정보를 신중하게 입력하세요.</li>
          <li><strong>유료 서비스 확인:</strong> 일부 사이트는 유료일 수 있으니 사전에 확인하세요.</li>
          <li><strong>유료 유도:</strong> “무료”라고 해놓고 결제 유도하는 곳은 피하세요.</li>
        </ul>
      </div>
    `;
  }


  /**
   * 과목별 팁 HTML 생성
   */
  function getSubjectTipsHTML(subject) {
    const data = subjectTips[subject];
    if (!data) return getGeneralTipsHTML();

    const urlMap = buildTipsSiteUrlMap(); // ✅ 여기서 한 번 만든 다음 재사용

    let html = '';
    data.tips.forEach(tip => {
      html += `
        <div class="tip-card">
          <h3 class="tip-title">${tip.title}</h3>
          <ul class="tip-list">
            ${tip.items.map(item => `<li>${enhanceItemWithSiteLink(item, urlMap)}</li>`).join('')}
          </ul>
        </div>
      `;
    });
    // ✅ 과목 공통: 시험/수행/문제풀이 루틴 추가
    html += `
      <div class="tip-card">
        <h3 class="tip-title">🎯 시험 대비 루틴 (공통)</h3>
        <ul class="tip-list">
          <li><strong>개념 1회독:</strong> 단원 핵심 개념 → 예시 3개만 따라하기</li>
          <li><strong>유형 2~3개:</strong> 자주 나오는 유형 먼저 반복</li>
          <li><strong>기출/서술형:</strong> "기출 + 서술형 + 해설" 키워드로 찾아서 마무리</li>
          <li><strong>오답노트:</strong> 틀린 이유를 '개념/계산/조건해석/자료해석'으로 분류</li>
        </ul>
      </div>

      <div class="tip-card">
        <h3 class="tip-title">📝 수행평가/보고서 루틴 (공통)</h3>
        <ul class="tip-list">
          <li><strong>검색어 공식:</strong> 주제 + (탐구/실험) + (보고서/양식) + 참고문헌</li>
          <li><strong>표/그래프:</strong> 원자료(통계/공공데이터) → 직접 그래프 작성</li>
          <li><strong>출처:</strong> 최소 2개 이상 비교하고, 마지막에 참고문헌 정리</li>
        </ul>
      </div>
    `;

    // 일반 주의사항 추가
    html += `
      <div class="tip-card tip-card-highlight">
        <h3 class="tip-title">⚠️ 주의사항</h3>
        <ul class="tip-list">
          <li><strong>저작권 존중:</strong> 자료를 사용할 때는 항상 저작권을 확인하고 출처를 밝히세요.</li>
          <li><strong>신뢰할 수 있는 출처:</strong> 공식 사이트나 공인된 교육 기관의 자료를 우선 활용하세요.</li>
          <li><strong>최신 정보 확인:</strong> 학습 자료의 업데이트 날짜를 확인하세요.</li>
          <li><strong>다양한 자료 비교:</strong> 한 곳의 자료만 보지 말고 여러 출처를 참고하세요.</li>
        </ul>
      </div>
    `;

    return html;
  }

  /**
   * URL에서 과목 파라미터 추출
   */
  function getSubjectFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/[?&]subject=([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * 과목 선택 사이드바 HTML 생성
   */
  function getSubjectSidebarHTML(currentSubject) {
    const subjects = [
      { id: null, name: '전체 팁', emoji: '📚' },
      { id: 'history', name: '역사', emoji: '📜' },
      { id: 'math', name: '수학', emoji: '🔢' },
      { id: 'korean', name: '국어', emoji: '📖' },
      { id: 'english', name: '영어', emoji: '🔤' },
      { id: 'science', name: '과학', emoji: '🔬' },
      { id: 'social', name: '사회', emoji: '🌍' },
      { id: 'coding', name: '코딩', emoji: '💻' }
    ];
    
    let html = '<div class="tips-sidebar-tabs">';
    
    subjects.forEach(subject => {
      const isActive = subject.id === currentSubject;
      const href = subject.id ? `#/tips?subject=${subject.id}` : '#/tips';
      
      html += `
        <a href="${href}" 
           class="tips-tab ${isActive ? 'active' : ''}"
           data-subject="${subject.id || 'all'}">
          <span class="tips-tab-emoji">${subject.emoji}</span>
          <span class="tips-tab-name">${subject.name}</span>
        </a>
      `;
    });
    
    html += '</div>';
    return html;
  }

  /**
   * Tips 페이지 HTML 컨텐츠 렌더링
   */
  function renderTipsView() {
    const tipsView = document.getElementById('tipsView');
    if (!tipsView) {
      console.warn('tipsView element not found');
      return;
    }

    const subject = getSubjectFromURL();
    const emoji = subject ? (subjectEmojis[subject] || '📚') : '📚';
    const title = subject ? subjectTips[subject]?.title || '자료 찾는 팁' : '자료 찾는 팁';
    const subtitle = subject 
      ? `${subjectNames[subject] || subject} 과목에 특화된 자료 검색 방법을 알아보세요`
      : '효과적으로 필요한 자료를 찾는 방법을 알아보세요';

    const tipsContent = subject ? getSubjectTipsHTML(subject) : getGeneralTipsHTML();
    const subjectSidebar = getSubjectSidebarHTML(subject);

    const html = `
      <div class="tips-layout">
        <!-- 상단 헤더 -->
        <div class="tips-top-header">
          <button type="button" id="tipsBackBtn" class="detail-back">← 목록</button>
          <h1 class="tips-page-title">💡 자료 찾는 팁</h1>
        </div>

        <!-- 메인 레이아웃 -->
        <div class="tips-content-layout">
          <!-- 왼쪽 사이드바 -->
          <aside class="tips-sidebar">
            <div class="tips-sidebar-card">
              <div class="tips-sidebar-header">
                <span class="tips-sidebar-title">과목 선택</span>
              </div>
              ${subjectSidebar}
            </div>
          </aside>

          <!-- 오른쪽 메인 영역 -->
          <main class="tips-main-content">
            <div class="tips-header">
              <h2 class="tips-main-title">${emoji} ${title}</h2>
              <p class="tips-subtitle">${subtitle}</p>
            </div>

            <div class="tips-content">
              ${tipsContent}
            </div>
          </main>
        </div>
      </div>
    `;

    tipsView.innerHTML = html;
    tipsView.dataset.rendered = 'true';

    // 뒤로가기 버튼 이벤트 연결
    initTipsBackButton();
  }

  /**
   * Tips 뒤로가기 버튼 초기화
   */
  function initTipsBackButton() {
    const tipsBackBtn = document.getElementById('tipsBackBtn');
    if (tipsBackBtn) {
      tipsBackBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.hash = '#/';
      });
    }
  }

  // 전역으로 노출
  window.renderTipsView = renderTipsView;

  // hashchange 이벤트로 URL 변경 감지
  window.addEventListener('hashchange', function() {
    const hash = window.location.hash;
    if (hash.startsWith('#/tips')) {
      // tips 페이지 내에서 과목 변경 시 다시 렌더링
      const tipsView = document.getElementById('tipsView');
      if (tipsView && tipsView.style.display !== 'none') {
        tipsView.dataset.rendered = 'false'; // 재렌더링 허용
        renderTipsView();
      }
    }
  });

  // 초기 로드 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderTipsView);
  } else {
    renderTipsView();
  }
})();
