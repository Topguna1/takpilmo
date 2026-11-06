# 한눈에 보기 — Google Sheets 연결

## 적용 상태

- 원본: [site data sheets for takpilmo](https://docs.google.com/spreadsheets/d/1pX9qkGoXpIm28IQLjP5RII_qN6ILWRZkWZw_JkAxSvQ/edit)
- details 탭 A:B의 기존 식별자·소개문을 보존하고 C:P에 입력 열·한국어 메모를 추가했다. 운영 유형 드롭다운과 첫 행 고정을 적용하고 커넥터 읽기 및 Google Sheets 화면으로 확인했다.
- 미확인 사실이나 테스트 데이터를 실제 시트에 넣지 않았다.
- 로컬 화면 및 Apps Script 필드 매핑 구현 완료. 실제 Apps Script 편집기의 기존 코드를 보존하면서 상세정보 객체에 새 필드를 추가하여 저장했다.
- **운영 반영 완료:** 사용자 승인 후 2026-09-13 21:06(KST)에 기존 웹 앱을 버전 5로 업데이트했다. 기존 URL·실행 계정·접근 권한은 유지했다. 실제 API 응답에서 새 필드 13개, 원본 160행·13개 카테고리·기존 상세 43개·기존 소개문 보존을 확인했다. 오류 행 경고는 0개다.

## 입력 위치

| 열 | 헤더 | 내용 |
|---|---|---|
| A | key | sites 탭 key와 정확히 동일. 기존 값 유지 |
| B | detailDesc | 기존 사이트 소개 |
| C | mainUses | 주요 용도 1~2개, 한 줄에 하나 |
| D | fee | 무료 범위·유료 조건 |
| E | signup | 가입이 필요한 기능·동작 |
| F | operatorName | 공식 운영기관명 |
| G | operatorType | government / public / private. 미확인은 빈칸 |
| H | sourceUrl | 확인한 공식 안내 페이지 주소 |
| I | verifiedAt | 실제 정보 확인일 YYYY-MM-DD |
| J | signupAge | 가입 연령 제한이 확인된 경우만 입력 |
| K | summary | 짧은 소개. 비우면 sites.desc 사용 |
| L | useCases | 사용 상황, 한 줄에 하나 |
| M | features | 주요 기능, 한 줄에 하나 |
| N | notes | 이용 시 유의사항, 한 줄에 하나 |
| O | relatedGuideIds | 기존 가이드 식별자, 쉼표로 구분 |
| P | recommendedFor | 추천 대상. 비우면 sites.ages 사용 |

학교급과 과목은 기존 sites 탭 ages·subjects를 계속 사용한다. details에 해당 사이트 행이 없으면 A열에 정확한 key를 넣은 새 행을 작성하면 된다. 이름을 바꾸어 새 식별자를 만들지 않는다. 빈 필드는 확인 필요 상태로 남으며 기존 로컬 보완 데이터가 있으면 그것을 지우지 않는다.

## 표시 원칙

추천 대상 → 주요 용도 → 과목 → 이용료 → 회원가입 → 운영기관 순서로 요약한다. 정부·공공기관 배지는 운영 유형, 공식 HTTP(S) 출처, 확인일이 함께 있을 때만 표시한다. 기존 isGov 값만으로 새 배지를 만들지 않는다. 가입 연령 제한과 미확인 공공 분류 경고는 본문의 이용 전 확인에 표시한다.

## 이후 입력과 확인

시트 맨 위에 빈 행이 있어도 첫 번째 비어 있지 않은 행을 헤더로 읽습니다. 헤더 위에는 빈 행만 두고, 안내 문구는 셀 메모에 작성하세요. 첫 행을 헤더로 고정했던 구버전 Apps Script는 `sites` 탭 첫 행이 비어 있으면 `sites: []`를 반환합니다. 이 경우 `scripts/google-apps-script/Code.gs`의 수정본을 기존 Apps Script 프로젝트에 반영하고, 기존 웹 앱 배포를 새 버전으로 업데이트해야 합니다. 저장소 파일 수정만으로 운영 API가 변경되지는 않습니다.

1. details 탭에서 해당 key의 행에 공식 확인한 정보를 입력한다.
2. 시트 내용만 수정할 때는 재배포가 필요 없다. Apps Script 코드를 변경할 때만 기존 배포의 새 버전을 반영한다.
3. 기존 API 응답 details.bySiteKey에서 mainUses, fee, signup, operatorName, recommendedFor 등의 키가 반환되는지 확인한다.
4. 실제 시트에 확인된 정보를 입력한 후 새로고침하여 표시를 확인한다. 검증을 위해 허위 요금이나 운영기관을 운영 시트에 입력하지 않는다.

전체 사이트 프런트엔드의 GitHub 배포는 별도이며 이번 API 승인에 포함되지 않는다.


이번 버전은 실제 내용의 자동 조사·입력을 포함하지 않는다. 빈 필드는 미확인으로 표시되며, 입력한 내용은 사이트 새로고침 때 가져온다.

실제 Chromium에서도 source=google-sheets, 고유 사이트 156개, 새 필드 수신 및 상세정보 렌더링을 확인했고 JavaScript 오류는 0건이었다.
