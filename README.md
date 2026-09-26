# 딱필모

학생·학부모·교사를 위한 사이트 모음과 학습 정보 서비스입니다.

운영 주소: https://topguna1.github.io/takpilmo/

## 기능과 데이터

- 검색·분류·필터·페이지 나누기로 사이트를 탐색하고 상세정보를 확인합니다.
- 보관함과 최근 기록은 기존 브라우저 저장 키를 유지합니다. 저장소가 차단돼도 탐색할 수 있습니다.
- 사이트 목록·상세정보는 Google Sheets를 우선 사용하고 연결 실패 시 시트 백업을 표시합니다.
- 정보 글은 Firestore 서버에서 조회하며 관리자 Google 로그인으로 작성·수정·즉시 공개합니다.
- 정보 목록은 `#/info`, 상세는 `#/info/글ID`, 관리는 `#/admin/info`입니다. 옛 guide/tips/practice 주소는 정보 목록으로 이동합니다.

운영 Sheets와 공유 Apps Script 응답은 그대로 유지합니다. 사이트는 옛 가이드 데이터를 읽지 않습니다. 과거 사이트 소개 중 필요한 43개만 별도 데이터로 보존했습니다.

## 개발

Node 22 이상을 사용합니다.

```sh
npm ci
npm run serve
```

http://localhost:4173 에서 확인합니다. 개발 서버는 시작할 때 빌드하므로 수정 후 재시작하세요. 소스 파일을 브라우저에서 직접 열면 npm Firebase 모듈을 해석할 수 없습니다.

```sh
npm run lint
npm run test:unit
npm run test:e2e
npm run test:rules
npm run build
npm run test:smoke
```

규칙 검증은 Java 21 이상과 Firestore Emulator를 사용하며 운영 데이터를 수정하지 않습니다. 브라우저 설치는 `npx playwright install chromium firefox webkit`입니다. E2E는 Chromium, 빌드 결과물 핵심 흐름은 세 브라우저로 확인합니다.

## 배포

esbuild가 `dist/`에 실행 파일·필수 데이터·자산·라이선스만 생성합니다. 고정 Firebase SDK를 자체 배포하고 인증 코드는 관리자 화면에서 로드합니다. GitHub Pages의 소스는 GitHub Actions로 설정하고 CI가 검사한 결과물을 배포합니다. Cloudflare 연결은 이번 범위에서 제외합니다.

[파일 분류](FILES.md) · [Firebase 운영](docs/firebase-info-setup.md) · [안정화 결과·장애 대응](docs/production-hardening.md)

해시 기반 개별 글은 독립 SEO·SNS 미리보기를 제공하지 않습니다. 홈페이지 메타정보와 canonical을 사용하며 해시 주소를 sitemap에 나열하지 않습니다.

## 라이선스

코드는 MIT, 사이트 데이터·큐레이션 콘텐츠는 CC BY-NC 4.0입니다. 외부 사이트의 콘텐츠·상표와 서비스 정책은 각 운영 주체에 귀속됩니다.
