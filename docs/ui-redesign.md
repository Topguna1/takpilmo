# 딱필모 탐색 흐름 리디자인

## 실행과 구성

`npm run serve` 후 `http://localhost:4173`을 연다. `npm run lint`, `npm run test:unit`, `npm run test:e2e`로 검증한다.

새 진입점은 `js/hub/app.module.js`이며 검색 엔진, 보관함 저장 모듈과 주제별 가이드 렌더러를 재사용한다. 과거 `js/main.js`와 목록 렌더러는 새 HTML에서 로드하지 않는다. 기존 모듈의 회귀 테스트와 호환 코드는 유지한다. 프레임워크와 서버 API를 새로 추가하지 않는다.

## Google Sheets 연결 — 2026-09-12 수정

`js/data/sheet-catalog.module.js`는 옆 저장소 `Topguna1.github.io/js/data/site-data.js`의 수정된 전체 카탈로그 로더를 바탕으로 한다. 같은 Apps Script `/exec`에서 매 새로고침마다 `cache: no-store`로 최신 목록·카테고리·상세정보를 가져온다. 이전 상세 캐시는 목록 데이터로 사용하지 않는다. 빈 enabled는 표시, FALSE/0/n/no는 숨김이며 빈 sortOrder는 9999로 처리한다. 쉼표 또는 배열로 전달된 복수 카테고리를 보존한다. 상세정보는 배열과 bySiteKey 객체 모두 지원한다.

네트워크·인증·응답 형식 오류에는 해당 저장소의 `data/sheet-snapshot.json` 백업을 사용하고 화면에 백업 사용 상태를 표시한다. `window.siteDataSource`는 실제 API 성공 시 `google-sheets`, 백업 사용 시 `snapshot`이다. 오래된 `data/sites.json`과 `data/categories.json`은 새 화면에서 읽지 않는다. 원격 가이드 콘텐츠가 없을 때만 `data/content.example.json`의 tips를 사용하며, 이 파일의 사이트 목록은 사용하지 않는다.

원본 시트: https://docs.google.com/spreadsheets/d/1pX9qkGoXpIm28IQLjP5RII_qN6ILWRZkWZw_JkAxSvQ/edit

연결 주소를 바꾸려면 새 로더의 SHEET_API_URL 또는 `window.ddakpilmo.config.contentApiUrl`을 설정한다. 운영 중인 API에서 160개 사이트·13개 카테고리 응답을 확인했다. 시트 내용 변경은 새로고침으로 반영되며, Apps Script 코드 변경은 별도 새 버전 배포가 필요하다. 이번 작업은 운영 시트나 배포 설정을 변경하지 않았다.

## 주소와 상태

| 주소 | 화면 |
|---|---|
| `#/` | 서비스 허브 |
| `#/sites?q=&group=&category=&age=&subject=&gov=&page=` | 사이트 모음 |
| `#site=<key>` | 사이트 상세, 기존 주소 유지 |
| `#/guide?purpose=&age=&subject=&topic=&step=` | 선택형 가이드 |
| `#/guide/result?purpose=&age=&subject=&topic=` | 공유 가능한 가이드 결과 |
| `#/tips` 및 기존 하위 주소 | 기존 교과·실용 가이드 |
| `#/saved-sites`, `#/recent-sites` | 보관함 |
| `#/about` | 소개 |

검색 입력은 현재 방문 기록을 교체하며, 페이지·필터·가이드 단계 이동은 방문 기록에 추가한다. `all`은 가이드의 의도적인 무관 선택이므로 주소에 보존한다. 상세 진입에는 history.state로 출발 주소·스크롤·초점 정보를 저장한다. 새 탭에서 직접 연 상세정보의 기본 복귀 경로는 사이트 모음이다.

사이트 key, 카테고리 key, localStorage 저장 키는 변경하지 않는다. 같은 key의 중복 사이트는 목록 데이터에서 합치고 학교급·과목·카테고리를 합집합으로 보존한다. 기존 공공 분류는 필터 호환용이며 확인된 정부·공공기관 배지와 구분한다.

## 상세정보 편집

`data/site-details.json`에 사이트 key를 키로 하는 객체를 추가한다. 기본 파일은 빈 객체이며 미확인 사실을 샘플 데이터로 채우지 않는다. 기존 데이터의 이름·설명·학교급·과목은 계속 표시한다.

| 필드 | 형식 / 의미 |
|---|---|
| summary | 짧은 용도 설명 |
| detailDesc | 기존 상세 소개, 일반 텍스트 |
| useCases, features | 사용 상황·주요 기능, 문자열 배열 또는 줄바꿈 텍스트 |
| notes | 이용 전 확인할 내용, 배열 또는 줄바꿈 텍스트 |
| fee | 확인된 이용료와 무료·유료 범위 |
| signup, signupAge | 가입 필요 여부와 가입 연령 조건, 추천 학교급과 별개 |
| operatorName | 확인된 운영기관명 |
| operatorType | government / public / private |
| sourceUrl, verifiedAt | 공식 확인 출처 HTTP(S) 주소와 확인일 YYYY-MM-DD |
| relatedGuideIds | 기존 실용 가이드 id 배열 |

원격 상세정보의 비어 있지 않은 필드는 로컬 값을 덮어쓴다. 빈 문자열·빈 배열·null은 로컬 정보를 지우지 않는다. 운영 주체 배지는 operatorType, sourceUrl, verifiedAt이 모두 있어야 표시된다. 운영자는 실제로 출처를 검토한 뒤 이 값을 입력해야 한다. 단순히 isGov=true라는 이유로 배지를 부여하지 않는다.

Apps Script `details` 시트의 선택 열도 같은 이름을 사용한다. useCases/features는 셀 내 줄바꿈, relatedGuideIds는 쉼표로 구분한다. 업데이트된 Code.gs는 이 선택 필드를 응답에 포함한다. 구버전 API에서도 화면은 동작한다. 운영 시트 변경·스크립트 배포·SeedTips 실행은 이번 작업에서 하지 않았다.

## 선택형 가이드 편집

`data/guide-rules.json`에서 목적별 이름, 검색 단계, 검색어 템플릿, 주의사항, 추천 siteKeys, 추천 이유, 기존 실용 가이드 category 연결을 관리한다. 새 외부 검색이나 생성형 AI 호출은 없다. 추천은 명시된 siteKeys 중 선택 학교급·과목에 해당하는 사이트만 최대 3개 표시한다. 종합 과목 사이트는 여러 과목에 사용할 수 있는 후보로 취급한다.

템플릿의 `{학교급}`, `{과목}`, `{주제}`를 선택값으로 치환한다. 대괄호 항목은 사용자가 바꿀 자리다. 결과는 일반 검색 안내임을 표시하며 빈 추천을 관련 없는 사이트로 채우지 않는다. 기존 교과·실용 가이드로 연결해 추가 안내를 제공한다.

## 검증과 배포

자동 테스트는 검색·IME·초성·자동완성, 필터 취소, 전체 결과 페이지 이동, 상세 복귀 초점·스크롤, 저장 호환성, 가이드 직접 접속·복사 실패, API·저장 실패, 구주소, 390/768/1440/1920px 가로 넘침을 확인한다. 테스트 스크린샷은 `test-results/screens`에 생성되며 커밋 대상이 아니다.

운영 배포 전 변경한 정적 파일을 함께 배포해야 한다. 이번 단계에서 기존 백엔드 배포는 필수가 아니다. 문제가 있으면 이전 정적 배포로 되돌릴 수 있으며 저장 데이터 형식 변경이나 파괴적인 마이그레이션은 없다.


### 상세정보 및 설정 보완
- 데스크톱 요약 카드 상단을 사이트 로고 상단에 정렬하고 모바일에서는 이름·소개 뒤에 요약을 배치한다.
- 소개문은 HTML을 실행하지 않고 원문의 줄바꿈·공백·탭을 유지한다.
- 오른쪽 아래 톱니바퀴에서 테마·글자 크기·애니메이션·모서리를 즉시 변경한다. 바깥 클릭과 Esc로 닫히며 초기화는 화면 설정만 변경한다.
- 시트 원본 160개 행, 13개 카테고리를 유지하며 기존 중복 통합 방식(156개 사이트)을 변경하지 않는다.

### 기존 사이트 소개 재사용

현재 시트의 detailDesc가 비어 있으면 data/content.example.json의 details.bySiteKey에서 같은 사이트 key의 기존 소개를 가져온다. 기존 소개 43개를 별도 복제 없이 재사용하며 줄바꿈과 공백은 원문대로 유지한다. 현재 목록에 없는 사이트와 enabled=false인 상세정보는 복원하지 않는다. 현재 시트의 소개는 우선하며, 이전 이용료·가입 조건·운영기관·확인일은 가져오지 않는다. 기존 파일 읽기가 실패해도 사이트 목록은 계속 표시한다. 이 문구 재사용은 정보의 최신성을 새로 검증했다는 의미가 아니다.
