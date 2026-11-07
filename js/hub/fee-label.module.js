// Summarize only explicit fee wording. Keep the original condition available as a tooltip.
export function feeLabel(value) {
  const fee = String(value || '').trim();
  if (!fee || /미확인|무료 여부|유료 여부|확인 필요/.test(fee)) return '요금 미확인';
  if (/무료/.test(fee)) return /유료|별도|수수료/.test(fee) ? '일부 유료' : /일부/.test(fee) ? '일부 무료' : '무료';
  if (/유료/.test(fee)) return '유료';
  return '요금 확인';
}
