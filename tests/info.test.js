import { describe, it, expect } from 'vitest';
import { validateArticle } from '../js/info/data.module.js';
import { markdown, articleView } from '../js/info/content.module.js';
import { SEED_ARTICLES } from '../js/info/seed.module.js';
describe('information content', () => {
  it('ships eight complete drafts with unique IDs, checked sources and examples', () => {
    expect(SEED_ARTICLES).toHaveLength(8);
    expect(new Set(SEED_ARTICLES.map(item => item.id)).size).toBe(8);
    for (const item of SEED_ARTICLES) {
      expect(item.status).toBe('draft');
      expect(item.body.length).toBeGreaterThan(600);
      expect(() => validateArticle({...item,status:'published'})).not.toThrow();
      expect(item.body).toContain('## 기억할 내용');
    }
  });
  it('rejects executable URLs, missing citations and excessive site selections', () => {
    const value = {...SEED_ARTICLES[0],status:'published'};
    expect(() => validateArticle({...value,sources:[]})).toThrow();
    expect(() => validateArticle({...value,sources:[{label:'x',url:'javascript:alert(1)',checkedAt:'2026-09-22'}]})).toThrow();
    expect(() => validateArticle({...value,siteKeys:['a','b','c','d']})).toThrow();
    expect(() => validateArticle({...value,body:' '})).toThrow();
  });
  it('renders author HTML as text and only exposes safe external sources', () => {
    const html = markdown('## 제목\n\n<script>alert(1)</script>\n\n- 항목');
    expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');
    expect(html).toContain('<h2>제목</h2>');
    const view = articleView({...SEED_ARTICLES[0],title:'<img onerror=alert(1)>',sources:[{label:'bad',url:'javascript:alert(1)'}]});
    expect(view).not.toContain('href="javascript:');expect(view).not.toContain('<img');
  });
});
