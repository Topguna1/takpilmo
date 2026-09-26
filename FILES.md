# 프로젝트 파일 분류

현재 진입점: index.html → js/hub/app.module.js. 배포 시 해시 이름의 번들로 바뀝니다.

| 경로 | 용도 | 배포 |
|---|---|---|
| js/hub/ | 홈·목록·상세·탐색·설정 | 번들 |
| js/info/ | 정보 글·검증·Firestore·관리자·초기 초안 | 분할 번들 |
| js/app/, js/search/, js/retention/ | 공통 저장·검색·보관함·최근 기록 | 번들 |
| js/data/sheet-catalog.module.js | Sheets 검증·백업·소개 보완 | 번들 |
| js/vendor/fuse.min.mjs | 검색 라이브러리 | 번들·라이선스 주석 |
| styles.css, assets/ | 공통 디자인·정적 자산 | 포함 |
| data/sheet-snapshot.json | 사이트·카테고리·상세 백업 | 포함 |
| data/site-introductions.json | 소개가 없는 사이트의 과거 작성 소개 | 포함 |
| data/site-details.json | 확인된 사이트 상세 보완 | 포함 |
| data/*.csv | 시트 편집 참고 자료 | 제외 |
| scripts/build.mjs, dev.mjs, preview.mjs | esbuild·개발·하위 경로 프리뷰 | 제외 |
| firestore.rules, firestore.indexes.json, firebase.json | Firebase 별도 운영 배포 | 제외 |
| scripts/ 아래 Apps Script 및 docs/tips-guides-sheet-schema.md | 다른 소비자도 사용하는 공유 시트 응답 자료 | 제외·보존 |
| tests/, 개발 설정, .github/ | 검증·CI | 제외 |
| docs/, archive/, README.md, FILES.md | 운영 문서·과거 작업 보관 | 제외 |
| LICENSE, DATA_LICENSE | 라이선스 | 포함 |
| dist/, .dev/ | 생성물, Git 제외 | dist만 배포 |

옛 tIps/, about/ 독립 렌더러와 이전 js/main.js 계열·미사용 가이드 데이터·전용 테스트는 제거했습니다. 검색·저장 회귀 검사는 현재 사용 중인 모듈을 직접 검증합니다.

사이트 소개의 적용 순서: 유효한 원격 소개가 우선이며 원격 소개가 비었을 때 site-introductions를 사용합니다. 원격 상세가 비활성화됐으면 복원하지 않습니다. 내용·사이트 식별자·줄바꿈은 보존합니다. 확인된 site-details 보완 정책은 js/hub/model.module.js에 있습니다.
