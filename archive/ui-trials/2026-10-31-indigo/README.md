# Indigo trial rollback checkpoint

2026-10-31 색상·카드·필터 시험 직전의 원본을 파일별 .bak으로 보관한다. 기존 작업 전체를 git reset으로 되돌리지 않는다.

## 색감만 롤백

index.html에서 assets/palette-trial.css 링크를 제거하면 기존 민트 디자인 색감으로 돌아간다. 이 파일의 카드 글자·필터 반응형 보완도 함께 빠진다. 카드 정보와 필터 UI 변경은 유지된다. 색감만 정확히 되돌리려면 palette-trial.css의 색상 선언만 제거하고 typography·filter layout 규칙은 유지한다.

## 이 요청의 변경 전체 롤백

manifest.json의 files 각각에 대해 이 폴더의 `<원본 경로>.bak`을 해당 원본 경로로 복원한다. 새 파일은 manifest의 newFiles를 참고한다. 복원 전 후속 수정 유무를 확인하고 이 요청 이후 변경이 있다면 해당 차이를 보존한다. 즉시 복원에 사용자 승인을 다시 요구하는 절차는 없다.

이 체크포인트는 요청 이전의 미커밋 파일까지 보존한 원본이다. .bak 파일은 실행·배포 진입점에 포함되지 않는다.
