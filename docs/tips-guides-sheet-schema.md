# 자료 탐색 가이드 Google Sheets 스키마

자료 탐색 가이드는 Google Sheets를 운영용 CMS로 사용합니다. Apps Script API는 아래 탭을 읽어 `tips` payload로 변환합니다.

## 운영 원칙

- 교과 가이드의 공식 스키마는 `tips_curriculum_*` 4개 탭입니다.
- 실용 팁의 공식 스키마는 `tips_guides`, `tips_guide_sections`, `tips_guide_links` 3개 탭입니다.
- `tips_subjects`, `tips_sections`, `tips_items`는 이전 형식 호환용입니다. 신규 교과 가이드는 여기에 추가하지 않습니다.
- 식별자 열은 한 번 배포한 뒤 변경하지 않습니다. 표시 문구는 자유롭게 수정할 수 있습니다.
- `enabled`가 `false`인 행은 사이트에 노출되지 않습니다.

## 1. 교과 가이드

### `tips_curriculum_groups`

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 그룹 식별자. 예: `high-math` |
| `mode` | yes | `elem_middle` 또는 `high` |
| `subjectKey` | yes | 과목 키. 예: `math` |
| `subjectLabel` | yes | 화면 표시 과목명 |
| `title` | no | 가이드 제목 |
| `subtitle` | no | 가이드 보조 설명 |
| `sortOrder` | no | 정렬 순서 |
| `enabled` | no | `false`면 비노출 |

### `tips_curriculum_topics`

고등 교과의 세부 분야입니다.

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 세부 분야 식별자 |
| `mode` | yes | 현재는 `high` 사용 |
| `subjectKey` | yes | `tips_curriculum_groups.subjectKey` 참조 |
| `topicKey` | yes | URL과 내부 연결에 사용하는 키 |
| `topicLabel` | yes | 화면 표시 이름 |
| `parentKey` | no | 상위 과목 키 |
| `title` | no | 세부 가이드 제목 |
| `subtitle` | no | 세부 가이드 보조 설명 |
| `sortOrder` | no | 정렬 순서 |
| `enabled` | no | `false`면 비노출 |

### `tips_curriculum_sections`

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 섹션 식별자 |
| `mode` | yes | `elem_middle` 또는 `high` |
| `subjectKey` | yes | 과목 키 |
| `topicKey` | no | 고등 세부 분야 키. 과목 공통 섹션이면 비워 둠 |
| `title` | yes | 섹션 제목 |
| `sortOrder` | no | 정렬 순서 |
| `enabled` | no | `false`면 비노출 |

### `tips_curriculum_items`

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 항목 식별자 |
| `sectionId` | yes | `tips_curriculum_sections.id` 참조 |
| `content` | yes | 본문 HTML 또는 텍스트 |
| `sortOrder` | no | 정렬 순서 |
| `enabled` | no | `false`면 비노출 |

## 2. 실용 팁

### `tips_guides`

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 가이드 식별자 |
| `slug` | no | URL 해시용 별칭. 비어 있으면 `id` 사용 |
| `tab` | no | 현재는 `utility` 사용 |
| `categoryKey` | no | 사이드바 카테고리 키 |
| `categoryLabel` | no | 사이드바 카테고리 표시명 |
| `title` | yes | 카드 제목 |
| `subtitle` | no | 상세 보조 설명 |
| `summary` | yes | 카드 한 문장 요약 |
| `target` | no | `all`, `elementary_middle`, `high` |
| `badgeText` | no | 상단 배지 |
| `icon` | no | 카드 아이콘 문자 |
| `audienceLabel` | no | 대상 표시 |
| `featured` | no | `true`면 운영자 추천 카드 |
| `featuredOrder` | no | 운영자 추천 카드 정렬 순서 |
| `primaryCtaText` | no | 기본 버튼 문구 |
| `primaryCtaType` | no | `detail`, `site`, `route`, `external`, `link` |
| `primaryCtaValue` | no | 기본 버튼 연결 값 |
| `secondaryCtaText` | no | 보조 버튼 문구 |
| `secondaryCtaType` | no | `site`, `route`, `external`, `link` |
| `secondaryCtaValue` | no | 보조 버튼 연결 값 |
| `sortOrder` | no | 정렬 순서 |
| `updatedAt` | no | 마지막 검토일 |
| `enabled` | no | `false`면 비노출 |

### `tips_guide_sections`

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 섹션 식별자 |
| `guideId` | yes | `tips_guides.id` 참조 |
| `sectionType` | yes | `overview`, `steps`, `free_access`, `recommended_sites`, `notes` |
| `title` | no | 섹션 보조 제목 |
| `content` | yes | 본문 HTML 또는 텍스트 |
| `sortOrder` | no | 정렬 순서 |
| `enabled` | no | `false`면 비노출 |

### `tips_guide_links`

| column | required | 설명 |
| --- | --- | --- |
| `id` | yes | 링크 식별자 |
| `guideId` | yes | `tips_guides.id` 참조 |
| `label` | yes | 버튼 또는 칩 라벨 |
| `linkType` | yes | `external`, `site`, `route` |
| `hrefOrSiteKey` | yes | URL, 사이트 키 또는 내부 해시 경로 |
| `sortOrder` | no | 정렬 순서 |
| `enabled` | no | `false`면 비노출 |

## 허용 HTML

`content` 열에는 아래 태그만 사용합니다. 프런트에서 나머지 태그와 속성은 제거합니다.

- `<strong>`
- `<em>`
- `<code>`
- `<br>`

## Apps Script 응답 형태

```json
{
  "tips": {
    "subjects": [],
    "sections": [],
    "items": [],
    "curriculumGroups": [],
    "curriculumTopics": [],
    "curriculumSections": [],
    "curriculumItems": [],
    "guides": [],
    "guideSections": [],
    "guideLinks": []
  }
}
```

## 배포

1. 스프레드시트에서 `확장 프로그램 > Apps Script`를 엽니다.
2. [Code.gs](../scripts/google-apps-script/Code.gs)의 내용으로 스크립트를 교체합니다.
3. 최초 이관 시에만 [SeedTips.gs](../scripts/google-apps-script/SeedTips.gs)를 추가하고 `seedTipsSheets()`를 한 번 실행합니다. 이 함수는 운영 중인 가이드 탭 내용을 초기 데이터로 덮어쓰므로 반복 실행하지 않습니다.
4. `배포 > 새 배포 > 웹 앱`을 선택합니다.
5. 액세스 권한을 사이트 운영 방식에 맞게 설정하고 배포합니다.
6. 새 `/exec` URL을 `index.html`의 `contentApiUrl`에 반영합니다.
