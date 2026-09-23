# Retention Rollback Plan

Baseline branch: `backup/pre-retention-20260614`

Baseline tag: `pre-retention-2026-06-14`

Development branch: `codex/retention-mvp`

## Rollback

- Drop all retention work: switch back to `main`.
- Revert one feature: revert the matching feature commit.
- Restore the pre-retention baseline: use tag `pre-retention-2026-06-14` after explicit approval.

## Protected Existing Keys

- `siteTheme`
- `siteFontSize`
- `siteAnim`
- `siteRadius`
- `siteSettings`
- `contentSheetCache:v4` (`contentSheetCache:v3`는 레거시 캐시로 성공 갱신/초기화 시 제거)

Retention features only use keys prefixed with `ddakpilmo.retention.`.

## Regression Areas

- Category switching animation using `switching-cate`
- Fuse search and Korean initial consonant search
- Pagination
- Detail hash routing and scroll restore
- Dark mode and settings panel
- Mobile layout
- Government-operated site filter
- Related-site rendering
