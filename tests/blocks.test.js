import { describe, it, expect } from 'vitest';
import { parseYoutube, youtubeEmbedUrl, normalizeBlocks, blockProblems, renderBlocks } from '../js/info/blocks.module.js';
import { markdown, articleView, cards } from '../js/info/content.module.js';
import { SEED_ARTICLES } from '../js/info/seed.module.js';
describe('block-based articles', () => {
  it('accepts only real YouTube links and builds a privacy-friendly embed', () => {
    expect(parseYoutube('https://youtu.be/dQw4w9WgXcQ?t=1m30s')).toEqual({ id: 'dQw4w9WgXcQ', start: 90 });
    expect(parseYoutube('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.id).toBe('dQw4w9WgXcQ');
    for (const bad of ['https://evil.com/watch?v=dQw4w9WgXcQ', 'http://youtu.be/dQw4w9WgXcQ', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)']) expect(parseYoutube(bad)).toBeNull();
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&start=10');
  });
  it('drops unsafe blocks and reports them to the editor', () => {
    const bad = [{ type: 'image', url: 'javascript:alert(1)' }, { type: 'image', url: 'http://x.com/a.png' }, { type: 'youtube', url: 'https://evil.com' }, { type: 'link', label: 'x', url: 'data:text/html,hi' }, { type: 'script', text: 'x' }];
    expect(normalizeBlocks(bad)).toEqual([]);
    expect(blockProblems(bad.slice(0, 4))).toHaveLength(4);
  });
  it('escapes every author-controlled value', () => {
    const html = renderBlocks([{ type: 'image', url: 'https://a.com/i.png', alt: '"><img onerror=1>', caption: '<b>c</b>' }, { type: 'steps', items: [{ title: '<i>1</i>', text: 'a\nb', imageUrl: 'https://a.com/s.png' }] }, { type: 'callout', kind: 'warn', text: '<u>x</u>' }], markdown);
    for (const raw of ['<img onerror', '<b>', '<i>', '<u>']) expect(html).not.toContain(raw);
  });
  it('keeps legacy body articles working and shows tip metadata', () => {
    expect(articleView(SEED_ARTICLES[0])).toContain('<h2>');
    const tip = articleView({ id: 't', title: 'T', summary: 's', category: '팁·따라하기', body: '', blocks: [{ type: 'text', text: 'hi' }], sources: [], difficulty: '쉬움', minutes: 5, thumbnail: 'https://a.com/h.jpg', siteKeys: [] });
    expect(tip).toContain('난이도 쉬움');expect(tip).toContain('info-hero');expect(tip).not.toContain('참고 출처');
    expect(cards([{ id: 't', title: 'T', summary: 's', category: '팁·따라하기', thumbnail: 'https://a.com/h.jpg' }])).toContain('info-thumb');
  });
});
