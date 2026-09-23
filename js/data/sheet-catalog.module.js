// Adapted from ../Topguna1.github.io/js/data/site-data.js (2026-09-12).
// The live Sheets catalog is authoritative; the shipped sheet snapshot is fallback only.

export const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxu0QNxzD11mmExZ89ItV9TIvKz9Dd1EYxAiQbL56SyGQU2yzZNyT0qzB6dpwwbslzJeA/exec';
const text = value => String(value ?? '').trim();
const list = value => [...new Set((Array.isArray(value) ? value : text(value).split(',')).map(text).filter(Boolean))];
const enabled = row => row && typeof row === 'object' && !/^(false|0|n|no)$/i.test(text(row.enabled));
const order = row => text(row.sortOrder) !== '' && Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 9999;

export function normalizeCatalog(payload) {
  if (payload?.error) throw new Error(payload.error);
  if (!Array.isArray(payload?.sites) || !payload?.categories) throw new Error('Sheet API must return sites and categories, not only details');
  const rows = Array.isArray(payload.categories) ? payload.categories : Object.entries(payload.categories).map(([key,row])=>({...row,key}));
  const categories = Object.fromEntries(rows.filter(enabled).sort((a,b)=>order(a)-order(b))
    .map(row=>[text(row.key),{name:text(row.name),icon:text(row.icon)||'📁',sortOrder:order(row)}])
    .filter(([key,row])=>/^[a-zA-Z0-9_-]+$/.test(key)&&row.name));
  if (!Object.keys(categories).length) throw new Error('No valid sheet categories');
  const warnings = [];
  const sites = payload.sites.filter(enabled).sort((a,b)=>order(a)-order(b)).flatMap(row=>{
    const categoryKeys = list(row.categories?.length ? row.categories : row.category).filter(key=>Object.hasOwn(categories,key));
    let url; try { url = new URL(text(row.url)); } catch { /* Report this row without discarding other valid rows. */ }
    if (!text(row.key)||!text(row.name)||!url||!['http:','https:'].includes(url.protocol)||!categoryKeys.length) {
      warnings.push({key:text(row.key||row.name), reason:'사이트 이름·식별자·주소 또는 카테고리를 확인해 주세요.'});
      return [];
    }
    return [{...row,key:text(row.key),name:text(row.name),url:url.href,desc:text(row.desc),category:categoryKeys[0],categories:categoryKeys,
      ages:list(row.ages),subjects:list(row.subjects),isGov:/^(true|1|y|yes)$/i.test(text(row.isGov)),sortOrder:order(row),enabled:true}];
  });
  if (!sites.length) throw new Error('No enabled sheet sites');
  const rawDetails = payload.details?.bySiteKey || payload.details || {};
  const detailRows = Array.isArray(rawDetails) ? rawDetails.map(row=>[text(row.siteKey||row.key),row]) : Object.entries(rawDetails);
  const details = Object.fromEntries(detailRows.filter(([key,row])=>key&&row&&typeof row==='object'&&enabled(row)));
  const disabledDetailKeys = detailRows.filter(([,row])=>!enabled(row)).map(([key])=>key);
  return {categories,sites,details,disabledDetailKeys,warnings,tips:payload.tips,generatedAt:text(payload.generatedAt)};
}

export function reuseIntroductions(catalog, legacy) {
  const saved = legacy?.details?.bySiteKey || {};
  for (const site of catalog.sites) {
    const current = catalog.details[site.key];
    const previous = Object.hasOwn(saved, site.key) ? saved[site.key] : null;
    if (catalog.disabledDetailKeys?.includes(site.key) || text(current?.detailDesc) || !enabled(previous) || !text(previous.detailDesc)) continue;
    // Reuse only authored prose. Never restore stale fees, verification or site rows.
    catalog.details[site.key] = {...current, detailDesc: previous.detailDesc};
  }
}

async function fetchJSON(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response = await fetch(url,{cache:'no-store',signal:controller.signal});
    if (!response.ok) throw new Error(`Data request failed: HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export async function loadSheetCatalog() {
  let catalog;
  try {
    const url=window.ddakpilmo?.config?.contentApiUrl || window.DDAKPILMO_CONTENT_API_URL || SHEET_API_URL;
    catalog=normalizeCatalog(await fetchJSON(url));
    window.__sheetLoadError=null;
    window.siteDataSource='google-sheets';
  } catch(error) {
    window.__sheetLoadError=error;
    console.warn('[data] Sheet unavailable; using bundled sheet snapshot:',error);
    catalog=normalizeCatalog(await fetchJSON('data/sheet-snapshot.json'));
    window.siteDataSource='snapshot';
  }
  // Reuse authored introductions only. Retired guide payloads are not loaded.
  const missingIntroductions = catalog.sites.some(site=>!text(catalog.details[site.key]?.detailDesc) && !catalog.disabledDetailKeys.includes(site.key));
  if (missingIntroductions) {
    try {
      const legacy=await fetchJSON('data/content.example.json');
      reuseIntroductions(catalog, legacy);
    }
    catch { /* Catalog browsing remains available if optional introductions fail. */ }
  }
  window.sheetWarnings=catalog.warnings;
  window.defaultCategories=catalog.categories;
  window.initialSites=catalog.sites;
  window.siteDetailMap=catalog.details;
  window.sheetGeneratedAt=catalog.generatedAt;
  console.log(`Catalog loaded: source=${window.siteDataSource}, sites=${catalog.sites.length}`);
  return catalog;
}

export function installSheetCatalog() {
  window.SHEET_API_URL=SHEET_API_URL;
  window.loadJSONData=loadSheetCatalog;
}
