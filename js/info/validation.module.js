export function validateArticle(data) {
  if (typeof data?.title !== 'string' || !data.title.trim() || data.title.length > 160) throw new Error('제목을 160자 이내로 입력하세요.');
  if (typeof data.summary !== 'string' || !data.summary.trim() || data.summary.length > 300) throw new Error('요약을 300자 이내로 입력하세요.');
  if (!['학습 정보', '사이트 활용'].includes(data.category)) throw new Error('분류를 선택하세요.');
  if (typeof data.body !== 'string' || !data.body.trim() || data.body.length > 50000) throw new Error('본문을 50,000자 이내로 입력하세요.');
  if (!['draft', 'published'].includes(data.status)) throw new Error('공개 상태를 확인하세요.');
  if (!Array.isArray(data.siteKeys) || data.siteKeys.length > 3 || data.siteKeys.some(key => typeof key !== 'string' || !key.trim() || key.length > 200) || new Set(data.siteKeys).size !== data.siteKeys.length) throw new Error('관련 사이트는 최대 3개입니다.');
  if (!Array.isArray(data.sources) || data.sources.length > 10) throw new Error('출처는 최대 10개입니다.');
  for (const source of data.sources) {
    if (!source || typeof source.label !== 'string' || source.label.length > 300 || typeof source.url !== 'string' || source.url.length > 2048) throw new Error('출처 형식을 확인하세요.');
    let url; try { url = new URL(source.url); } catch { throw new Error('출처 URL을 확인하세요.'); }
    if (!['https:', 'http:'].includes(url.protocol) || !source.label?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt || '')) throw new Error('출처 이름·웹 주소·확인 날짜를 확인하세요.');
  }
  if (data.status === 'published' && !data.sources.length) throw new Error('공개 전 참고 출처와 확인 날짜를 등록하세요.');
  return data;
}

export const revisionOf = value => value ? String(value.seconds) + ':' + String(value.nanoseconds) : null;
export function readableArticle(id, data) {
  try { validateArticle(data); } catch { return null; }
  return { ...data, id };
}
export const sameContent = (a,b) => ['title','summary','body','category','siteKeys','sources','status'].every(key => JSON.stringify(a?.[key]) === JSON.stringify(b?.[key]));
