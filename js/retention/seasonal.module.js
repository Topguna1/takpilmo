const SEASONAL_ITEMS = [
  {
    id: "exam-season",
    months: [4, 6, 9, 11, 12],
    title: "시험 대비",
    text: "기출, 개념 정리, 공식 학습 사이트를 먼저 확인하세요.",
    quickStart: "exam",
  },
  {
    id: "report-season",
    months: [5, 6, 10, 11],
    title: "수행평가 자료",
    text: "보고서와 발표 자료는 근거 자료부터 모으면 빠릅니다.",
    quickStart: "report",
  },
  {
    id: "career-season",
    months: [7, 8, 12, 1, 2],
    title: "방학 진로 탐색",
    text: "관심 직업과 학과 정보를 저장해두세요.",
    quickStart: "career",
  },
];

function getSeasonalItem(date = new Date()) {
  const month = date.getMonth() + 1;
  return SEASONAL_ITEMS.find((item) => item.months.includes(month)) || SEASONAL_ITEMS[0];
}

export function installSeasonal() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getSeasonalItem,
  };

  window.ddakpilmo.retention.seasonal = api;
  return api;
}
