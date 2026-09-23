# 2026-09-22 정보 코너 개편

현재 정보 화면은 `js/info/`를 사용합니다. 이전 `tIps/` 및 옛 UI 연결 코드는 과거 UI/회귀 테스트 참고용이며 현재 진입점에서는 불러오지 않습니다. 아래 개편 전 목록의 가이드 관련 표시는 이 안내로 대체합니다. 운영 설정은 `docs/firebase-info-setup.md`를 확인하세요.

# 프로젝트 파일 분류표

확인일: 2026-09-19. 현재 진입점은 `index.html` → `js/hub/app.module.js`입니다.

## 먼저 확인할 것

- 화면·기능 수정: `js/hub/`, `styles.css`
- 사이트 연동·백업: `js/data/sheet-catalog.module.js`, `data/sheet-snapshot.json`
- 정보 글·관리자: `js/info/`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`
- 사이트 상세 보완: `data/site-details.json`
- `tIps/`와 `js/data/site-data.module.js`는 현재 진입점에서 사용하지 않으며 기존 회귀 테스트를 위해 보존합니다.
- `data/content.example.json`은 현재 소개가 비어 있을 때 재사용하는 기존 사이트 소개의 원본입니다. 가이드 데이터는 현재 화면에서 읽지 않습니다.
- js/main.js는 이전 진입점입니다. 현재 화면 변경은 js/hub/app.module.js에서 시작하세요.

## 분류 요약

| 분류 | 파일 수 | 처리 |
|---|---:|---|
| 핵심 — 현재 사이트 실행에 사용 | 26 | 원래 경로 유지 |
| 유지 — 현재 화면에서는 미사용, 회귀 테스트에서 사용 | 3 | 원래 경로 유지 |
| 현재 화면 미사용 — 기존 UI·기능 보존 코드 | 56 | 원래 경로 유지 |
| 현재 카탈로그 미사용 — 이전 데이터·시트 자료 | 4 | 원래 경로 유지 |
| 중요 — 테스트와 검증 도우미 | 11 | 원래 경로 유지 |
| 중요 — 개발 설정·CI·운영 스크립트 | 10 | 원래 경로 유지 |
| 참고 — 운영·설계 문서 | 7 | 원래 경로 유지 |
| 보관 — 사이트와 무관한 로컬 작업 파일 | 7 | 별도 폴더 보관 |

## 핵심 — 현재 사이트 실행에 사용

현재 index.html의 진입점에서 상대 import를 재귀 추적한 JavaScript 16개와 HTML·CSS·데이터·자산·라이선스입니다. 삭제하거나 경로를 바꾸면 실행·백업·가이드 표시가 깨질 수 있습니다.

- [DATA_LICENSE](DATA_LICENSE)
- [LICENSE](LICENSE)
- [assets/favicon.svg](assets/favicon.svg)
- [data/content.example.json](data/content.example.json)
- [data/sheet-snapshot.json](data/sheet-snapshot.json)
- [data/site-details.json](data/site-details.json)
- [index.html](index.html)
- [js/app/store.module.js](js/app/store.module.js)
- [js/data/sheet-catalog.module.js](js/data/sheet-catalog.module.js)
- [js/data/site-data.module.js](js/data/site-data.module.js)
- [js/hub/app.module.js](js/hub/app.module.js)
- [js/hub/home.module.js](js/hub/home.module.js)
- [js/hub/model.module.js](js/hub/model.module.js)
- [js/hub/views.module.js](js/hub/views.module.js)
- [js/retention/bookmarks.module.js](js/retention/bookmarks.module.js)
- [js/retention/recent.module.js](js/retention/recent.module.js)
- [js/retention/storage.module.js](js/retention/storage.module.js)
- [js/search/filter-engine.module.js](js/search/filter-engine.module.js)
- [js/vendor/fuse.min.mjs](js/vendor/fuse.min.mjs)
- [styles.css](styles.css)
- [tIps/tips.css](tIps/tips.css)
- [tIps/tips.view.js](tIps/tips.view.js)
- [tIps/tips.view.module.js](tIps/tips.view.module.js)

## 유지 — 현재 화면에서는 미사용, 회귀 테스트에서 사용

현재 브라우저 진입점에서는 불러오지 않지만 tests에서 loadBrowserScript로 읽습니다. 파일을 없애려면 해당 회귀 테스트를 먼저 새 구현으로 옮겨야 합니다.

- [js/app/store.js](js/app/store.js)
- [js/routing/hash-routing.js](js/routing/hash-routing.js)
- [js/search/filter-engine.js](js/search/filter-engine.js)

## 현재 화면 미사용 — 기존 UI·기능 보존 코드

현재 진입점의 import 경로에는 포함되지 않습니다. js/main.js를 중심으로 한 이전 UI와 그 의존 파일입니다. 기존 코드끼리 참조하고 있어 경로를 유지했습니다. 현재 미사용이라는 뜻이지 서로 참조가 없거나 바로 삭제해도 된다는 뜻은 아닙니다.

- [about/about.css](about/about.css)
- [about/about.reveal.js](about/about.reveal.js)
- [about/about.reveal.module.js](about/about.reveal.module.js)
- [about/about.view.js](about/about.view.js)
- [about/about.view.module.js](about/about.view.module.js)
- [js/bootstrap/init-bootstrap.js](js/bootstrap/init-bootstrap.js)
- [js/bootstrap/init-bootstrap.module.js](js/bootstrap/init-bootstrap.module.js)
- [js/data/site-data.js](js/data/site-data.js)
- [js/data/site-normalize.js](js/data/site-normalize.js)
- [js/data/site-normalize.module.js](js/data/site-normalize.module.js)
- [js/error-handling.js](js/error-handling.js)
- [js/error-handling.module.js](js/error-handling.module.js)
- [js/main.js](js/main.js)
- [js/memory-manager.js](js/memory-manager.js)
- [js/memory-manager.module.js](js/memory-manager.module.js)
- [js/render.js](js/render.js)
- [js/render.module.js](js/render.module.js)
- [js/render/cards.js](js/render/cards.js)
- [js/render/cards.module.js](js/render/cards.module.js)
- [js/render/pagination.js](js/render/pagination.js)
- [js/render/pagination.module.js](js/render/pagination.module.js)
- [js/render/sections.js](js/render/sections.js)
- [js/render/sections.module.js](js/render/sections.module.js)
- [js/retention/checkin.module.js](js/retention/checkin.module.js)
- [js/retention/daily-recommend.module.js](js/retention/daily-recommend.module.js)
- [js/retention/dashboard.module.js](js/retention/dashboard.module.js)
- [js/retention/dday.module.js](js/retention/dday.module.js)
- [js/retention/pinned.module.js](js/retention/pinned.module.js)
- [js/retention/profile.module.js](js/retention/profile.module.js)
- [js/retention/quick-start.module.js](js/retention/quick-start.module.js)
- [js/retention/seasonal.module.js](js/retention/seasonal.module.js)
- [js/routing/router.module.js](js/routing/router.module.js)
- [js/search/highlight.js](js/search/highlight.js)
- [js/search/highlight.module.js](js/search/highlight.module.js)
- [js/search/recommend.js](js/search/recommend.js)
- [js/search/recommend.module.js](js/search/recommend.module.js)
- [js/tabs.js](js/tabs.js)
- [js/tabs.module.js](js/tabs.module.js)
- [js/tips-surfaces.js](js/tips-surfaces.js)
- [js/tips-surfaces.module.js](js/tips-surfaces.module.js)
- [js/ui/list-events.js](js/ui/list-events.js)
- [js/ui/list-events.module.js](js/ui/list-events.module.js)
- [js/ui/menu.js](js/ui/menu.js)
- [js/ui/menu.module.js](js/ui/menu.module.js)
- [js/ui/scroll.js](js/ui/scroll.js)
- [js/ui/scroll.module.js](js/ui/scroll.module.js)
- [js/ui/settings.js](js/ui/settings.js)
- [js/ui/settings.module.js](js/ui/settings.module.js)
- [js/ui/theme.js](js/ui/theme.js)
- [js/ui/theme.module.js](js/ui/theme.module.js)
- [js/ui/toast.js](js/ui/toast.js)
- [js/ui/toast.module.js](js/ui/toast.module.js)
- [js/ui/ui-transition.js](js/ui/ui-transition.js)
- [js/ui/ui-transition.module.js](js/ui/ui-transition.module.js)
- [js/utils.js](js/utils.js)
- [js/utils.module.js](js/utils.module.js)

## 현재 카탈로그 미사용 — 이전 데이터·시트 자료

현재 사이트 목록은 Sheets API와 sheet-snapshot.json을 사용합니다. 이전 데이터 로더에는 sites.json·categories.json 경로가 남아 있고 CSV는 과거 시트 자료이므로 원래 위치에 보존했습니다.

- [data/categories.json](data/categories.json)
- [data/categories.sheet.csv](data/categories.sheet.csv)
- [data/sites.json](data/sites.json)
- [data/sites.sheet.csv](data/sites.sheet.csv)

## 중요 — 테스트와 검증 도우미

npm run test:unit 또는 npm run test:e2e에서 사용하는 검증 파일입니다. 사용자 화면에 직접 나오지 않아도 유지해야 합니다.

- [tests/apps-script-details.test.js](tests/apps-script-details.test.js)
- [tests/e2e/app.spec.js](tests/e2e/app.spec.js)
- [tests/e2e/practice.spec.js](tests/e2e/practice.spec.js)
- [tests/filter-engine.test.js](tests/filter-engine.test.js)
- [tests/helpers/browser-env.js](tests/helpers/browser-env.js)
- [tests/hub-model.test.js](tests/hub-model.test.js)
- [tests/router.test.js](tests/router.test.js)
- [tests/sheet-catalog.test.js](tests/sheet-catalog.test.js)
- [tests/site-data.test.js](tests/site-data.test.js)
- [tests/store.test.js](tests/store.test.js)
- [tests/tips-view.test.js](tests/tips-view.test.js)

## 중요 — 개발 설정·CI·운영 스크립트

개발·설치·품질 검사 또는 Google Sheets 백엔드 관리에 필요한 파일입니다. 브라우저에서 직접 불러오지 않는다는 이유로 삭제하면 안 됩니다.

- [.gitattributes](.gitattributes)
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [.gitignore](.gitignore)
- [eslint.config.js](eslint.config.js)
- [package-lock.json](package-lock.json)
- [package.json](package.json)
- [playwright.config.js](playwright.config.js)
- [scripts/google-apps-script/Code.gs](scripts/google-apps-script/Code.gs)
- [scripts/google-apps-script/SeedTips.gs](scripts/google-apps-script/SeedTips.gs)
- [vitest.config.js](vitest.config.js)

## 참고 — 운영·설계 문서

운영·변경 이력 참고 자료입니다. 날짜가 붙은 감사 문서와 이전 설계는 당시 상태이며, 현재 파일 사용 여부는 이 분류표를 우선 참고하세요.

- [README.md](README.md)
- [docs/practical-guides.md](docs/practical-guides.md)
- [docs/quality-audit-2026-09-13.md](docs/quality-audit-2026-09-13.md)
- [docs/retention-rollback-plan.md](docs/retention-rollback-plan.md)
- [docs/sheets-overview-setup.md](docs/sheets-overview-setup.md)
- [docs/tips-guides-sheet-schema.md](docs/tips-guides-sheet-schema.md)
- [docs/ui-redesign.md](docs/ui-redesign.md)

## 보관 — 사이트와 무관한 로컬 작업 파일

사이트 코드·테스트·CI에서 참조를 찾지 못한 과거 로컬 작업 파일 6개를 archive/local-tools로 이동했습니다. 원래 위치는 archive/README.md에 기록했습니다.

- [archive/README.md](archive/README.md)
- [archive/local-tools/codex-protocol-backup-20260531-211309.reg](archive/local-tools/codex-protocol-backup-20260531-211309.reg)
- [archive/local-tools/codex-protocol-backup-before-asar-workaround-20260531-212805.reg](archive/local-tools/codex-protocol-backup-before-asar-workaround-20260531-212805.reg)
- [archive/local-tools/codex-protocol-backup-before-workaround-20260531-211611.reg](archive/local-tools/codex-protocol-backup-before-workaround-20260531-211611.reg)
- [archive/local-tools/codex-protocol-backup.reg](archive/local-tools/codex-protocol-backup.reg)
- [archive/local-tools/debug.log](archive/local-tools/debug.log)
- [archive/local-tools/relay-codex-oauth-callback.ps1](archive/local-tools/relay-codex-oauth-callback.ps1)

## 재생성 가능한 파일과 특별 관리 영역

| 위치 | 분류 / 관리 방법 |
|---|---|
| node_modules/ | 설치된 의존성. npm install로 재생성 가능. 삭제하면 재설치 전 실행·테스트 불가 |
| test-results/ | 브라우저 테스트 결과와 스크린샷. 테스트 실행 시 재생성 |
| playwright-report/, coverage/, .vitest/ | 존재할 경우 자동 생성된 검사 결과·캐시 |
| .git/ | Git 이력·작업 상태. 삭제 금지 |
| .agents/ | 에이전트 설정 영역. 임의 이동·삭제 금지 |
| FILES.md | 이 파일. 파일 추가·진입점 변경 시 목록 갱신 |

## 판단 범위

현재 HTML 로딩 경로, JavaScript 상대 import, fetch 데이터 주소, tests의 직접 파일 읽기, CI와 저장소 내 텍스트 참조를 확인했습니다. 동적으로 조립한 경로·외부 운영 환경의 직접 URL·개인 설정까지 사용하지 않음을 보장하는 목록은 아닙니다. 그래서 기존 코드와 데이터는 삭제·이동하지 않고 분류했습니다. 정리 전에 있던 미커밋 변경은 유지했습니다.
