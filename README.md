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
- ✍️ Google 로그인 관리자 화면에서 정보 글 작성·수정·공개
- 📊 Google Sheets 기반 데이터 관리

---

## 서비스 구성 방식

현재 UI는 홈 → 사이트 모음 또는 딱필 정보 → 사이트 상세정보 흐름입니다.

정보 목록은 `#/info`, 상세는 `#/info/글ID`, 관리자 화면은 `#/admin/info`입니다. 기존 `#/guide`, `#/tips`, `#/practice` 주소는 새 정보 목록으로 이동합니다.

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
- 딱필 정보: Firebase Firestore (Google 로그인 관리자만 편집)

기존 가이드 시트 데이터는 사용하지 않습니다. 초기 정보 글 8편은 관리자 화면에서 초안으로 등록합니다.

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
