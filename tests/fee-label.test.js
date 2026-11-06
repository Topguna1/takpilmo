import { describe, it, expect } from 'vitest';
import { feeLabel } from '../js/hub/fee-label.module.js';
describe('compact fee labels', () => {
  for (const [value, expected] of [
    ['', '요금 미확인'], ['무료 여부 미확인','요금 미확인'], ['공개 자료 열람 무료','무료'],
    ['유료 구독','유료'], ['일부 무료 · 인증서 유료','일부 유료'], ['수강 무료 · 교재 별도 구매','일부 유료'],
    ['검색 무료 · 원문은 유료','일부 유료'], ['일부 콘텐츠 무료','일부 무료'], ['기관 이용 조건 확인','요금 확인']
  ]) it(`${value || 'missing'} → ${expected}`, () => expect(feeLabel(value)).toBe(expected));
});
