# 딱필모

파일을 수정하거나 정리하기 전에는 [파일 분류표](FILES.md)를 참고하세요. 현재 실행 파일, 핵심 데이터, 테스트용 기존 코드, 미사용 후보와 보관 파일을 구분했습니다.

**딱 필요한 사이트만 모았습니다.**

딱필모는 학생·학부모·교사를 위해  
교육, 학습 자료, 진로, 도구 사이트를 **큐레이션 형태로 정리한 링크 모음 서비스**입니다.  
검색과 필터를 통해 목적에 맞는 사이트를 빠르게 찾을 수 있도록 돕습니다.

---

## 주요 기능

- 📂 카테고리 기반 사이트 탐색
- 🔍 키워드 검색 및 필터링
- 🏛️ 정부 운영 사이트 구분 표시
- 📝 사이트별 간단한 설명 제공
- 📝 학습 정보와 사이트 활용법을 담은 딱필 정보 8편
- 📊 Google Sheets 기반 데이터 관리

---

## 서비스 구성 방식

현재 UI는 홈 → 사이트 모음 또는 딱필 정보 → 사이트 상세정보 흐름입니다.

정보 목록은 `#/info`, 상세는 `#/info/글ID`입니다. 기존 관리자 화면은 제거했으며 `#/admin/info`는 공개 정보 목록으로 이동합니다. 별도 관리자 대시보드는 추후 구축합니다. 기존 `#/guide`, `#/tips`, `#/practice` 주소는 새 정보 목록으로 이동합니다.

새 정보 글은 Firestore에서 관리하며 사이트 목록은 Google Sheets를 유지합니다. 현재 GitHub Pages에서 운영하고 추후 Cloudflare Pages로 이전 가능한 정적 구조입니다. [Firebase 연결 및 운영 안내](docs/firebase-info-setup.md)를 참고하세요.

딱필모는 **외부 사이트의 콘텐츠를 수집하거나 저장하지 않습니다.**

- 사이트 목록, 카테고리, 상세 설명: Google Sheets 연동
- 연결 실패 시: `Topguna1.github.io`에서 가져온 시트 백업 사용
- 실제 콘텐츠: 각 외부 사이트로 이동

👉 정보 제공 목적의 **링크 큐레이션 서비스**입니다.

---

## 데이터 관리

- 사이트 목록, 카테고리, 상세 설명: Google Sheets 전체 API 응답
- 매 새로고침에 최신 시트 요청, 복수 카테고리와 빈 `enabled` 지원
- 장애 백업: `data/sheet-snapshot.json` (`Topguna1.github.io`의 수정본)
- 딱필 정보: Firebase Firestore의 공개 글 조회 (별도 관리자 대시보드 구축 예정)

기존 가이드 시트 데이터는 사용하지 않습니다. 기존 정보 글과 초기 글 원본은 보존합니다. 공개 사이트에서는 글 등록·수정을 제공하지 않습니다.

이 구조를 통해  
데이터 수정은 빠르게, 서비스 로딩은 가볍게 유지합니다.

---

## License

- **Source Code**: MIT License
- **Site data & curated content**:  
  Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)

외부 사이트의 저작권 및 상표권은 각 운영 주체에 있습니다.

---

## Disclaimer

본 서비스는 개인 프로젝트로 운영됩니다.  
각 사이트의 서비스 내용, 정책, 운영 여부에 대한 책임은  
해당 사이트의 운영 주체에 있습니다.


## 로컬 실행과 품질 점검

`npm install` 후 `npm run serve`로 실행합니다. 검증 명령은 `npm run lint`, `npm run test:unit`, `npm run test:e2e`입니다. 별도 빌드 단계가 없는 정적 사이트입니다.

[2026-09-13 사용성·품질 점검 결과](docs/quality-audit-2026-09-13.md)에 재현한 문제, 적용 사항, 검증 범위와 남은 과제를 정리했습니다.

## 과제·탐구 중심 개선 (2026-10-31)

홈에서 검색·통계/문헌/발표 안내·저장한 사이트 이어가기를 제공합니다. 기본 작업 안내는 원격 글 서비스의 장애와 무관하게 열립니다. 무료 정리 양식은 `assets/worksheets/research-starter.html`에서 인쇄하거나 편집용 Markdown으로 내려받을 수 있습니다. 입력한 내용은 자동 저장되지 않습니다.

- [서비스 전략](docs/service-strategy.md)
- [구현·검증 현황](docs/service-strategy-implementation.md)
- [반복 이용·판매 관찰 양식](docs/retention-study.md)
- [핵심 20개 검수 대장](docs/core-catalog-audit.json)

`node scripts/catalog-maintenance.mjs`로 백업과 핵심 사이트 상태를 확인합니다. `--report`는 검수 대장을 다시 만들며, `--refresh --report`는 공개 시트에서 유효한 최신 응답을 받아 백업과 대장을 갱신합니다. 원본의 정보 확인일은 유지됩니다. 갱신은 각 사실의 독립 검증을 의미하지 않으므로 대장의 pending 항목은 공식 근거와 실제 과제 수행으로 검수해야 합니다.

대표 주소는 https://topguna1.github.io/takpilmo/ 입니다. 판매·구독 기능은 반복 이용·무료 시제품 실사용의 선행 조건을 확인한 뒤 별도 시험합니다.
