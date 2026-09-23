const TIP_SEED_TABLES = {
  tips_curriculum_groups: [
    ["id", "mode", "subjectKey", "subjectLabel", "title", "subtitle", "sortOrder", "enabled"],
    ["elem-middle-korean", "elem_middle", "korean", "국어", "국어 자료 탐색 가이드", "지문 해설과 수행평가 자료를 구분해 보는 법", 1, true],
    ["elem-middle-english", "elem_middle", "english", "영어", "영어 자료 탐색 가이드", "단어, 문법, 독해 자료를 나눠 보는 법", 2, true],
    ["elem-middle-math", "elem_middle", "math", "수학", "수학 자료 탐색 가이드", "개념, 유형, 기초 문제 흐름을 먼저 잡는 법", 3, true],
    ["elem-middle-society", "elem_middle", "society", "사회", "사회 자료 탐색 가이드", "교과 개념과 시사 자료를 구분해 찾는 법", 4, true],
    ["elem-middle-science", "elem_middle", "science", "과학", "과학 자료 탐색 가이드", "개념 자료와 탐구 자료를 나눠 보는 법", 5, true],
    ["high-math", "high", "math", "수학", "고등 수학 자료 탐색 가이드", "세부 과목별로 자료 흐름을 나눠 보는 법", 1, true],
    ["high-english", "high", "english", "영어", "고등 영어 자료 탐색 가이드", "독해, 문법, 듣기, 내신 자료를 구분하는 법", 2, true],
    ["high-science", "high", "science", "과학", "고등 과학 자료 탐색 가이드", "통합과학과 과목별 심화 자료를 나눠 찾는 법", 3, true],
    ["high-society", "high", "society", "사회", "고등 사회 자료 탐색 가이드", "과목별 개념 자료와 시사 자료를 연결하는 법", 4, true],
  ],
  tips_curriculum_topics: [
    ["id", "mode", "subjectKey", "topicKey", "topicLabel", "parentKey", "title", "subtitle", "sortOrder", "enabled"],
    ["high-math-common-math-1", "high", "math", "common_math_1", "공통수학 1", "math", "공통수학 1 자료 찾기", "기본 개념을 먼저 잡고, 유형별 자료를 나중에 붙이는 흐름", 1, true],
    ["high-math-common-math-2", "high", "math", "common_math_2", "공통수학 2", "math", "공통수학 2 자료 찾기", "개념 요약과 단원별 문제 구성을 함께 보는 법", 2, true],
    ["high-math-algebra", "high", "math", "algebra", "대수", "math", "대수 자료 찾기", "개념과 공식 적용 문제를 분리해서 보는 법", 3, true],
    ["high-math-calculus", "high", "math", "calculus", "미적분", "math", "미적분 자료 찾기", "개념 이해 자료와 기출 풀이 자료를 나눠 보는 법", 4, true],
    ["high-english-reading", "high", "english", "reading", "독해", "english", "고등 영어 독해 자료 찾기", "지문 해설과 문제 풀이 자료를 구분하는 법", 1, true],
    ["high-english-grammar", "high", "english", "grammar", "문법", "english", "고등 영어 문법 자료 찾기", "개념 요약 자료와 문제 적용 자료를 나눠 찾는 법", 2, true],
    ["high-science-integrated", "high", "science", "integrated_science", "통합과학", "science", "통합과학 자료 찾기", "개념 이해 자료와 탐구 문제 자료를 구분하는 법", 1, true],
    ["high-society-integrated", "high", "society", "integrated_society", "통합사회", "society", "통합사회 자료 찾기", "개념 자료와 사례 자료를 연결해 보는 법", 1, true],
  ],
  tips_curriculum_sections: [
    ["id", "mode", "subjectKey", "topicKey", "title", "sortOrder", "enabled"],
    ["elem-middle-math-first", "elem_middle", "math", "", "이 과목에서 먼저 볼 것", 1, true],
    ["elem-middle-math-flow", "elem_middle", "math", "", "자료를 찾는 순서", 2, true],
    ["high-math-common-math-1-first", "high", "math", "common_math_1", "이 단원에서 먼저 볼 것", 1, true],
    ["high-math-common-math-1-sites", "high", "math", "common_math_1", "추천 사이트", 2, true],
    ["high-math-calculus-first", "high", "math", "calculus", "미적분에서 먼저 볼 것", 1, true],
    ["high-english-reading-first", "high", "english", "reading", "독해 자료를 볼 때 기준", 1, true],
  ],
  tips_curriculum_items: [
    ["id", "sectionId", "content", "sortOrder", "enabled"],
    ["elem-middle-math-first-1", "elem-middle-math-first", "<strong>개념 설명 먼저:</strong> 풀이 영상보다 개념 요약 자료를 먼저 보고, 단원 이름과 핵심 개념을 먼저 익힙니다.", 1, true],
    ["elem-middle-math-first-2", "elem-middle-math-first", "<strong>문제 유형은 나중:</strong> 개념이 정리되기 전에는 난이도 높은 문제보다 기본 유형 자료를 먼저 봅니다.", 2, true],
    ["elem-middle-math-flow-1", "elem-middle-math-flow", "<strong>1.</strong> 개념 요약 자료 확인 → <strong>2.</strong> 기본 문제 자료 확인 → <strong>3.</strong> 오답 개념 정리", 1, true],
    ["high-math-common-math-1-first-1", "high-math-common-math-1-first", "<strong>단원 이름과 공식을 먼저:</strong> 공통수학 1은 단원별 개념과 기본 공식 정리가 먼저입니다.", 1, true],
    ["high-math-common-math-1-first-2", "high-math-common-math-1-first", "<strong>기출보다 유형:</strong> 개념 자료를 본 뒤 유형별 자료로 넘어가면 흐름이 안정됩니다.", 2, true],
    ["high-math-common-math-1-sites-1", "high-math-common-math-1-sites", "<strong>개념형 사이트</strong>와 <strong>문제형 사이트</strong>를 나눠 보고, 상세 페이지에서 관련 사이트를 같이 확인합니다.", 1, true],
    ["high-math-calculus-first-1", "high-math-calculus-first", "<strong>미분/적분 개념부터:</strong> 공식 암기 자료보다 개념 설명과 그래프 해설 자료를 먼저 보는 편이 좋습니다.", 1, true],
    ["high-math-calculus-first-2", "high-math-calculus-first", "<strong>문제 풀이 자료는 유형별로:</strong> 개념, 유형, 기출 순서로 역할을 나눠서 봅니다.", 2, true],
    ["high-english-reading-first-1", "high-english-reading-first", "<strong>지문 해설과 단어 자료 분리:</strong> 독해는 해설 자료와 어휘 자료를 함께 봐야 효율이 좋습니다.", 1, true],
  ],
  tips_guides: [
    ["id", "slug", "tab", "categoryKey", "categoryLabel", "title", "subtitle", "summary", "target", "badgeText", "icon", "audienceLabel", "featured", "featuredOrder", "primaryCtaText", "primaryCtaType", "primaryCtaValue", "secondaryCtaText", "secondaryCtaType", "secondaryCtaValue", "sortOrder", "updatedAt", "enabled"],
    ["free-paper-access", "free-paper-access", "utility", "research", "논문 / 근거자료", "논문 사이트 학생 기준 무료로 보기", "무료 전문, 초록, 기관 제공 원문 순서로 접근하는 법", "학생이 논문을 찾을 때 무료 전문과 초록, 기관 제공 원문을 어떻게 확인하면 좋은지 순서대로 정리합니다.", "high", "무료 열람", "🆓", "고등 추천", true, 1, "바로 따라하기", "detail", "free-paper-access", "RISS 보기", "site", "RISS", 1, "2026-04-24", true],
    ["ppt-tip", "ppt-tip", "utility", "presentation", "발표 / PPT", "PPT 자료 찾는 팁", "바로 넣을 자료보다 구조와 근거를 먼저 모으는 방식", "PPT용 자료를 찾을 때 이미지보다 먼저 구조, 핵심 숫자, 한 줄 근거를 모으는 흐름을 정리합니다.", "elementary_middle", "발표 준비", "🖼️", "초·중 추천", true, 2, "이 방법 사용하기", "detail", "ppt-tip", "메인 목록으로 이동", "route", "#/", 2, "2026-04-24", true],
    ["report-evidence", "report-evidence", "utility", "research", "논문 / 근거자료", "보고서용 근거자료 찾기", "통계, 연구 결과, 공식 문서를 어떻게 조합하면 좋은지", "보고서에서 근거가 약해 보이지 않도록 통계, 연구 결과, 공식 문서를 어떻게 묶으면 좋은지 보여줍니다.", "all", "근거 자료", "📊", "공통", false, 10, "바로 따라하기", "detail", "report-evidence", "Google Scholar 보기", "site", "GoogleScholar", 3, "2026-04-24", true],
    ["official-first", "official-first", "utility", "official", "공식 자료", "공식 자료 먼저 보는 법", "정책, 통계, 발표 자료를 볼 때는 출처 우선순위가 중요합니다", "정책, 통계, 진로, 입시처럼 정확도가 중요한 주제는 공식 자료를 먼저 봐야 하는 이유와 순서를 정리합니다.", "all", "공식 자료", "🏛️", "공통", false, 20, "바로 따라하기", "detail", "official-first", "메인 목록으로 이동", "route", "#/", 4, "2026-04-24", true],
  ],
  tips_guide_sections: [
    ["id", "guideId", "sectionType", "title", "content", "sortOrder", "enabled"],
    ["free-paper-access-overview", "free-paper-access", "overview", "이런 상황에서 유용합니다", "<strong>무료 전문이 바로 안 보일 때</strong> 무엇을 먼저 확인해야 하는지, 학생 기준에서 가장 현실적인 순서를 정리합니다.", 1, true],
    ["free-paper-access-steps", "free-paper-access", "steps", "확인 순서", "<strong>1.</strong> PDF / Full text 여부 확인<br><strong>2.</strong> 기관 제공 원문 여부 확인<br><strong>3.</strong> 없으면 초록과 참고문헌으로 방향부터 잡기", 2, true],
    ["free-paper-access-free", "free-paper-access", "free_access", "학생 기준 무료 열람 경로", "RISS 원문 제공 여부, 학교나 공공도서관 계정 제공 여부, 무료 전문 표기 여부를 먼저 확인하면 접근 경로를 빠르게 판단할 수 있습니다.", 3, true],
    ["ppt-tip-overview", "ppt-tip", "overview", "PPT 자료를 찾을 때 먼저 해야 할 것", "PPT는 예쁜 자료보다 <strong>구조, 근거, 숫자</strong>를 먼저 모으면 훨씬 빠르게 정리됩니다.", 1, true],
    ["ppt-tip-steps", "ppt-tip", "steps", "자료 수집 순서", "<strong>1.</strong> 발표 주제 한 줄 정의<br><strong>2.</strong> 공식 숫자나 근거 문장 확보<br><strong>3.</strong> 마지막에 이미지나 시각 자료 추가", 2, true],
    ["report-evidence-overview", "report-evidence", "overview", "보고서에 필요한 자료 조합", "보고서에는 <strong>배경 설명 + 연구 결과 + 공식 통계</strong>가 같이 들어가야 설득력이 높아집니다.", 1, true],
    ["report-evidence-steps", "report-evidence", "steps", "자료를 모으는 흐름", "<strong>1.</strong> 주제 정의 자료 확인<br><strong>2.</strong> 관련 논문이나 연구 보고서 찾기<br><strong>3.</strong> 통계와 공식 문서로 숫자 근거 보강", 2, true],
    ["report-evidence-sites", "report-evidence", "recommended_sites", "추천 사이트", "논문 검색 서비스와 공식 자료 출처를 함께 보는 편이 좋습니다.", 3, true],
    ["official-first-overview", "official-first", "overview", "공식 자료가 먼저 필요한 경우", "정확도가 중요한 자료는 블로그보다 <strong>정부, 공공기관, 공식 서비스</strong>를 먼저 확인하는 편이 안전합니다.", 1, true],
    ["official-first-notes", "official-first", "notes", "주의할 점", "요약 자료만 보고 끝내지 말고, 숫자나 주장에 해당하는 원문 출처를 최소 한 번은 직접 확인해 두는 편이 좋습니다.", 2, true],
  ],
  tips_guide_links: [
    ["id", "guideId", "label", "linkType", "hrefOrSiteKey", "sortOrder", "enabled"],
    ["free-paper-access-riss", "free-paper-access", "RISS 보기", "site", "RISS", 1, true],
    ["free-paper-access-google", "free-paper-access", "Google Scholar 보기", "site", "GoogleScholar", 2, true],
    ["ppt-tip-home", "ppt-tip", "메인 목록으로 이동", "route", "#/", 1, true],
    ["report-evidence-google", "report-evidence", "Google Scholar", "site", "GoogleScholar", 1, true],
  ],
};

function seedTipsSheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  Object.keys(TIP_SEED_TABLES).forEach(function (sheetName) {
    const values = TIP_SEED_TABLES[sheetName];
    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    sheet.clearContents();
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    sheet.setFrozenRows(1);
  });
}
