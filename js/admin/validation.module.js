import { BLOCK_TYPES, MAX_BLOCKS, httpsUrl, parseYoutube } from '../info/blocks.module.js';
export const LIMITS = { text: { text: 20000 }, image: { url: 500, alt: 200, caption: 300 }, youtube: { url: 300, caption: 300 }, callout: { text: 1000 }, link: { label: 80, url: 500 } };
export function validateArticle(d, publishing = false) {
  const errors = [];
  const add = (field, message) => errors.push({field, message});
  for (const [field, max] of Object.entries({title:160,summary:300,body:50000,thumbnail:500})) if (typeof d[field] !== 'string' || d[field].length > max) add(field, `${field}: ${max}자 이내로 입력해 주세요.`);
  if (publishing && !d.title.trim()) add('title','제목을 입력해 주세요.');
  if (publishing && !d.summary.trim()) add('summary','요약을 입력해 주세요.');
  if (d.blocks.length > MAX_BLOCKS) add('blocks','블록은 60개까지예요.');
  if (d.tags.length > 8 || d.tags.some(t => typeof t !== 'string' || t.length > 80)) add('tags','태그는 80자 이내, 8개까지예요.');
  if (new Set(d.siteKeys).size !== d.siteKeys.length || d.siteKeys.some(k=>typeof k!=='string'||!k||k.length>200)) add('siteKeys','사이트 키는 중복 없이 200자 이내로 입력해 주세요.');
  if (d.siteKeys.length > 3) add('siteKeys','관련 사이트는 3개까지예요.');
  if(d.sources.some(s=>typeof s.label!=='string'||s.label.length>300||typeof s.url!=='string'||s.url.length>2048||typeof s.checkedAt!=='string'||s.checkedAt.length>32)) add('sources','출처 이름은 300자, 주소는 2048자, 날짜는 32자 이내예요.');
  if (d.sources.length > 10) add('sources','출처는 10개까지예요.');
  if (!Number.isInteger(d.minutes) || d.minutes < 0 || d.minutes > 600) add('minutes','소요 시간은 0~600 사이 정수로 입력해 주세요.');
  if (publishing && d.thumbnail && !httpsUrl(d.thumbnail)) add('thumbnail','대표 이미지는 https 주소여야 해요.');
  d.blocks.forEach((b, i) => {
    const field = `block:${i}`, label = `${i+1}번째 블록`;
    if (!b || !Object.hasOwn(BLOCK_TYPES,b.type)) { add(field,`${label}: 지원하지 않는 유형이에요. 원문은 내보내기로 보관하세요.`); return; }
    for (const [key,max] of Object.entries(LIMITS[b.type] || {})) if (typeof b[key] !== 'string' || b[key].length > max) add(field,`${label} ${key}: ${max}자 이내로 입력해 주세요.`);
    if (b.type === 'steps') {
      if (!Array.isArray(b.items) || b.items.length > 20) { add(field,`${label}: 단계는 20개까지예요.`); return; }
      b.items.forEach((s,j) => {
        for (const [key,max] of Object.entries({title:120,text:2000,imageUrl:500})) if(typeof s?.[key] !== 'string' || s[key].length > max) add(field,`${label} 단계 ${j+1} ${key}: ${max}자 이내로 입력해 주세요.`);
        if (publishing && s.imageUrl && !httpsUrl(s.imageUrl)) add(field,`${label}: 단계 이미지 주소를 확인해 주세요.`);
        if (publishing && !s.title?.trim() && !s.text?.trim()) add(field,`${label}: 빈 단계를 완성하거나 삭제해 주세요.`);
      });
      if (publishing && !b.items.length) add(field,`${label}: 단계를 추가해 주세요.`);
    }
    if (publishing && b.url && (b.type === 'youtube' ? !parseYoutube(b.url) : !httpsUrl(b.url))) add(field,`${label}: 주소를 확인해 주세요.`);
    if (publishing && ['image','youtube','link'].includes(b.type) && !b.url) add(field,`${label}: 주소가 필요해요.`);
    if (publishing && ['text','callout'].includes(b.type) && !b.text?.trim()) add(field,`${label}: 내용을 입력해 주세요.`);
    if (publishing && b.type === 'link' && !b.label?.trim()) add(field,`${label}: 버튼 이름을 입력해 주세요.`);
  });
  if (publishing && !d.body.trim() && !d.blocks.length) add('blocks','본문을 입력해 주세요.');
  if (publishing && d.sources.some(s => !s.label || !httpsUrl(s.url) || !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt))) add('sources','출처의 이름, https 주소, 날짜를 확인해 주세요.');
  if (publishing && d.category !== '팁·따라하기' && !d.sources.length) add('sources','공개하려면 출처가 필요해요.');
  if (new TextEncoder().encode(JSON.stringify(d)).length > 700000) add('blocks','글 전체 용량이 너무 커요. 여러 글로 나눠 주세요.');
  return errors;
}
export function convertLegacy(body, blocks = []) {
  // Splitting at blank paragraph boundaries preserves the existing Markdown subset.
  const parts = body.split(/(?<=\n\n)/), out = [];
  let chunk = '';
  for (const part of parts) {
    if (part.length > 20000) throw new Error('한 문단이 20,000자를 넘어요. 원문에서 문단을 나눈 뒤 변환해 주세요.');
    if (chunk.length + part.length > 20000) { out.push({type:'text',text:chunk}); chunk=''; }
    chunk += part;
  }
  if(chunk) out.push({type:'text',text:chunk});
  if(out.length + blocks.length > MAX_BLOCKS) throw new Error('변환 결과가 블록 60개를 넘어요. 원문을 유지했어요.');
  return [...out,...blocks];
}
