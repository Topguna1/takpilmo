import fs from 'node:fs/promises';
import { SHEET_API_URL, normalizeCatalog } from '../js/data/sheet-catalog.module.js';
import { consolidateSites, mergedDetail, operatorLabel } from '../js/hub/model.module.js';

// Only the public catalog is read. No Firebase credentials or remote writes are used.
const args = new Set(process.argv.slice(2));
for (const arg of args) if (!['--refresh','--report'].includes(arg)) throw new Error(`Unknown option: ${arg}`);
const path = new URL('../data/sheet-snapshot.json', import.meta.url);
let payload = JSON.parse(await fs.readFile(path, 'utf8'));
if (args.has('--refresh')) {
  const response = await fetch(SHEET_API_URL, {signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  const candidate = await response.json();
  const normalized = normalizeCatalog(candidate);
  if (normalized.warnings.length) throw new Error('Rejected rows found; review the source before replacing the backup');
  const temporary = new URL('../data/sheet-snapshot.json.tmp', import.meta.url);
  await fs.writeFile(temporary, JSON.stringify(candidate,null,2)+'\n');
  await fs.rename(temporary, path);
  payload = candidate;
}
const catalog = normalizeCatalog(payload);
const local = JSON.parse(await fs.readFile(new URL('../data/site-details.json',import.meta.url),'utf8'));
const coreKeys = ['KOSIS','RISS','DBpia','GoogleScholar','공공데이터포털','서울열린데이터광장','E나라지표','국립중앙도서관','국사편찬위원회','한국사데이터베이스','한국고전종합','KERIS','국가기록원','PubMed','ScienceDirect','Canva','미리캔버스','네이버지식백과','국립중앙과학관','에듀넷'];
const sites = consolidateSites(catalog.sites);
const rows = coreKeys.map(key => {
  const site = sites.find(s=>s.key===key);
  if (!site) return {key,status:'missing-site'};
  const d = mergedDetail(local[key],catalog.details[key]);
  const missing = ['fee','signup','operatorName','sourceUrl','verifiedAt'].filter(field=>!d[field] || /미확인/.test(d[field]));
  return {key,name:site.name,url:site.url,recommendedAges:[...new Set([...site.ages,...d.recommendedAges||[]])],fee:d.fee||'미확인: 공식 이용 조건 재검수 필요',signup:d.signup||'미확인: 기능별 가입 조건 재검수 필요',signupAge:d.signupAge||'미확인: 가입 연령 근거 재검수 필요',operator:operatorLabel(d)||'미확인',sourceUrl:d.sourceUrl||site.url,importedVerifiedAt:d.verifiedAt||null,missing,
    independentReviewStatus:'pending',note:'시트 원본의 조건과 날짜를 가져온 기록이며 이번 실행이 각 사실을 독립 재검증했다는 뜻이 아닙니다.'};
});
const report = {generatedAt:catalog.generatedAt,rawRows:catalog.sites.length,uniqueSites:sites.length,categories:Object.keys(catalog.categories).length,invalidRows:catalog.warnings,coreSites:rows};
if(args.has('--report')) await fs.writeFile(new URL('../docs/core-catalog-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({generatedAt:report.generatedAt,rawRows:report.rawRows,uniqueSites:report.uniqueSites,categories:report.categories,coreSites:rows.length,missingCoreSites:rows.filter(r=>r.status==='missing-site').length,pendingIndependentReview:rows.length},null,2));
