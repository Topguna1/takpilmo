# 딱필모 디자인 보완 — 2026-10-31

## 참고와 해석

- CSS Design Awards의 2026-02-12 발표: https://www.cssdesignawards.com/blog/2025-website-of-the-year-winners/430/ . Dropbox Brand가 WOTY·Best UX, Exat Typeface가 Best UI로 소개된다. 이는2025 수상작의2026 발표이며 현재 이용자 인기 순위가 아니다.
- Dropbox Brand 실제 화면: https://brand.dropbox.com/ . 편집 그리드·강조 타이포그래피·색상 구획을 참고했다.
- Exat 공식 소개: https://www.cssdesignawards.com/sites/exat-typeface/47246/ . 타이포그래피·그리드·모션을 참고했다.

위에서 채택한 디자인 해석은 딱필모를 위한 자체 선택이다. 수상작의 로고·이미지·코드를 복제하지 않았다.

## 반영

큰 한글 헤드라인·민트 강조·작은 책 일러스트·컬러 작업 카드로 홈의 시각적인 위계를 복원했다. 책은 CSS와 인라인 SVG이며 외부 이미지·애니메이션 라이브러리가 없다. 모바일·태블릿에서는 그림을 생략해 검색을 첫 화면에 유지한다.

사이트 카드에는 카테고리·검증 운영 주체, 이름·도메인, 소개, 주요 용도, 추천 학교급·과목, 이용료·가입 조건, 정보 확인일·운영기관, 상세·외부 방문을 나눈다. 상세 정보가 없는 항목은 미확인으로 표시하며 임의로 무료·가입 불필요를 추정하지 않는다. 저장 버튼은 별도 동작한다.

사이트·작업·정보 카드는 정밀 포인터 hover에서 5px 올라가고 테두리·그림자가 바뀐다. 키보드 focus-within/focus-visible에서도 강조된다. OS 동작 줄이기와 서비스 동작 끄기에서는 이동·transition을 중단한다. hover로만 볼 수 있는 필수 정보는 없다.

색상·간격·반응형 보완은 assets/design-refresh.css, 홈 구성은 js/hub/home.module.js, 카드 데이터 표시는 js/hub/views.module.js에 둔다. 기존 로직·저장 키·데이터 원본은 변경하지 않았다.

## 확인

ESLint·단위56개·Chromium E2E33개 통과. 밝은/어두운 테마,390×844 검색 첫 화면,768px·320px 및 글자 확대,카드 hover,OS/서비스 동작 끄기,정보 표시를 확인했다. 화면 캡처는 test-results/screens/design-*.png이며 로컬 백업·테스트 글을 사용한 미리보기다. 운영 배포는 별도다.
