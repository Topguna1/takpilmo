# 딱필 정보 운영 및 Firebase 연결

현재 GitHub Pages를 유지하며 정보 글만 Firebase로 관리한다. 사이트 목록과 상세정보는 기존 Google Sheets를 사용한다. 기존 Firebase 프로젝트가 있으므로 새 프로젝트를 만들지 않는다.

## 1. 기존 프로젝트 초기 설정

### 현재 연결 상태 (2026-09-23 확인)

- 프로젝트 `takpilmo`의 웹 앱 설정을 코드에 연결했다.
- 기본 Firestore 데이터베이스를 서울(`asia-northeast3`)에 생성하고 저장소의 보안 규칙을 게시했다.
- `infoArticles`의 `status` 오름차순 + `publishedAt` 내림차순 복합 인덱스 생성이 완료됐다.
- Google 로그인을 활성화하고 `topguna1.github.io`, `localhost`, `127.0.0.1`을 승인된 도메인에 등록했다.
- 관리자 Google 로그인 및 해당 UID의 `admins` 문서 등록을 완료했다. 초기 글 8편이 모두 공개되어 있으며, 비로그인 브라우저에서 운영 Firestore의 공개 목록 조회를 확인했다.
- GitHub Pages는 CI의 dist 결과물을 GitHub Actions로 배포한다. 변경 사항은 PR의 CI 통과 후 반영하고 운영 주소에서 확인한다. Cloudflare Pages 이전은 추후 진행한다.

내장 브라우저에서 Google 팝업이 열리지 않으면 일반 Chrome 또는 Edge로 `http://localhost:4173/#/admin/info`를 열어 로그인한다. GitHub Pages는 인증 도메인과 출처가 달라 리디렉션 로그인에도 브라우저 저장소 제한이 적용될 수 있으므로 현재는 팝업 방식을 사용한다. [Firebase 공식 안내](https://firebase.google.com/docs/auth/web/redirect-best-practices)를 참고한다.

아래 초기 설정 절차는 재설정 또는 다른 프로젝트 연결 시 참고한다.

1. [Firebase Console](https://console.firebase.google.com/)에서 사용할 프로젝트를 연다.
2. 프로젝트 설정 → 일반 → 내 앱에서 웹 앱(</>)을 등록한다. Firebase Hosting 설정은 필요 없다.
3. 표시된 `firebaseConfig`의 `apiKey`, `authDomain`, `projectId`, `appId`를 `js/info/firebase-config.module.js`에 입력한다. 웹 앱 설정은 공개 클라이언트 설정이다. 서비스 계정 JSON이나 비밀번호를 넣지 않는다.
4. Build → Firestore Database에서 기본 `(default)` 데이터베이스를 Standard edition, 프로덕션 모드로 만든다. 주 이용자가 한국이면 서울 리전 `asia-northeast3`를 선택한다. 기존 데이터베이스가 있다면 그대로 사용한다.
5. Authentication → 시작하기 → 로그인 제공업체에서 Google을 활성화하고 지원 이메일을 설정한다.
6. Authentication → 설정 → 승인된 도메인에 `topguna1.github.io`, `localhost`, `127.0.0.1`과 실제 사용하는 별도 운영 도메인을 등록한다. URL 경로나 `https://`는 넣지 않는다.

## 2. 규칙과 인덱스 배포

저장소 루트에서 실행한다. `takpilmo`는 기존 프로젝트 설정의 프로젝트 ID로 바꾼다.

```sh
npm ci
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project takpilmo
```

이 명령은 웹사이트를 배포하지 않는다. 정보 글의 접근 규칙과 공개 목록 인덱스만 배포한다. 기존 프로젝트에 별도 Firestore 규칙이 있다면 현재 규칙과 병합한 후 배포한다. 이 저장소의 기본 규칙은 `admins`와 `infoArticles` 이외의 경로를 허용하지 않는다.

## 3. 최초 관리자 등록

1. `npm run serve`로 실행한 뒤 `http://localhost:4173/#/admin/info`에서 Google 로그인한다.
2. 화면에 나타나는 UID를 복사한다. Authentication 사용자 목록에서도 확인할 수 있다.
3. Firestore 콘솔에서 `admins` 컬렉션 → 문서 ID에 UID 입력 → `enabled: true` Boolean 필드를 넣어 저장한다.
4. 관리자 화면의 ‘권한 다시 확인’을 누른다.

권한은 `admins/{uid}` 문서의 존재로 판별한다. 권한을 회수하려면 콘솔에서 해당 문서를 삭제한다. `enabled` 값을 false로 바꾸는 방식이 아니다. 일반 계정과 관리자 모두 브라우저를 통해 관리자 문서를 생성·수정할 수 없다.

## 4. 글 등록·수정

- ‘초기 글 8편 등록’은 고정 ID를 사용해 없는 초안만 생성한다. 다시 실행해도 수정한 글을 덮어쓰지 않는다.
- 글을 열어 제목·요약·분류·본문·관련 사이트·출처를 확인하고 ‘미리보기’로 검수한다.
- Markdown은 `#`, `##`, `###` 제목, 빈 줄로 구분한 문단, `- ` 목록을 지원한다. 본문 HTML·이미지·링크 문법은 실행하지 않는다. 외부 링크는 출처 입력란을 사용한다.
- 출처는 줄마다 `이름 | https://주소 | YYYY-MM-DD`로 입력한다.
- ‘공개 저장’은 즉시 반영한다. ‘초안 저장 / 비공개’는 공개 목록과 비로그인 상세 접근을 차단한다.
- 최초 공개일을 유지하므로 수정만으로 목록 최상단으로 이동하지 않는다.
- 홈·관련 글은 최대 3편만 서버에서 조회한다. 관련 글에는 status + siteKeys(array-contains) + publishedAt 복합 인덱스가 필요하다. 목록은 제목·요약 검색을 위해 전체 공개 글을 조회하며 화면은 12편씩 표시한다.
- 저장 실패 시 입력을 유지한다. 저장되지 않은 상태로 나가면 이탈 확인을 표시한다.
- 글 삭제·예약 발행·이미지 업로드·댓글 기능은 제공하지 않는다.

공개 목록과 상세는 서버에서 조회한다. 정적 글 백업이나 영구 오프라인 캐시는 사용하지 않는다. 이미 열어 본 페이지의 내용은 비공개 전환 전 사용자에게 전달된 자료이므로 회수할 수 없고, 이후 조회부터 비공개가 적용된다.

## 5. GitHub Pages와 Cloudflare Pages

### 현재 GitHub Pages

Settings → Pages → Source를 GitHub Actions로 설정한다. CI에서 npm ci, 필수 검사, esbuild, 빌드 결과물 검사를 통과한 dist만 배포한다. Firebase 설정·보안 규칙·로그인 확인 후 사이트 변경을 배포한다. 저장소 하위 경로에서도 상대 자산 경로와 해시 라우팅을 사용한다.

### 추후 Cloudflare Pages

Git 저장소 연결 시 프레임워크 없음, 빌드 명령 `npm run build`, 출력 디렉터리 `dist`로 설정한다. Firebase Hosting, Workers, Pages Functions는 사용하지 않는다. Functions용 별도 설정을 추가할 필요가 없다.

Firebase 프로젝트와 글 데이터는 그대로 유지한다. 고정 `pages.dev` 운영 주소 또는 연결할 도메인을 Firebase Authentication 승인된 도메인에 추가한다. 매 배포마다 달라지는 미리보기 주소 전체에 관리자 로그인을 개방하지 않는다.

Cloudflare에서 홈·자산·`#/info/글ID` 직접 접속·새로고침·Google 로그인·공개/비공개·사이트 목록을 확인한 뒤 운영 주소를 전환한다. 확인이 끝날 때까지 GitHub Pages를 유지한다. Cloudflare의 실제 연결과 도메인 전환은 추후 작업이다.

## 6. 검증

```sh
npm run lint
npm run test:unit
npm run test:e2e
npm run test:rules
```

규칙 테스트는 Java 21 이상과 Node 22 이상을 사용한다. `demo-ddakpilmo` Emulator만 사용하며 운영 프로젝트에는 접속하지 않는다. CI에도 같은 검증을 포함한다. 브라우저 테스트는 정보 API를 가짜 데이터로 대체해 화면·저장 실패·접근 제한 UI를 확인하며, 실제 Firestore 접근 제어는 별도 Emulator 테스트가 검증한다.

Firebase 설정이 비어 있으면 정보 영역에 연결 준비 안내가 표시된다. 기존 사이트 검색·보관함은 계속 사용할 수 있다. 운영 연결 완료 여부는 실제 프로젝트에서 관리자 로그인 및 글 공개를 확인한 뒤 판단한다.

## 저장 충돌·장애 대응

저장 전에 새 글 ID를 고정한다. 저장 후 확인에 실패하면 완료 안내와 목록 새로고침을 요구하므로 새 ID로 중복 생성하지 않는다. 다른 창에서 먼저 변경된 글은 덮어쓰지 않는다. 충돌·권한 변경 시 입력을 복사해 보관하고 목록을 다시 읽어 비교한다. 영구 편집 초안을 브라우저에 저장하지는 않으므로 창을 닫기 전 필요한 입력을 보관한다.

이번 강화 규칙과 관련 글 인덱스는 저장소 파일을 운영 프로젝트에 별도로 배포해야 한다. 코드 CI가 운영 Firebase에 배포하지는 않는다.
