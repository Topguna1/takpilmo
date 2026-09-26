import { GROUPS, esc, urlFor } from './model.module.js';
import { infoShelf } from '../info/view.module.js';

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

export function homeView({ search, recent, count }) {
  return `<div class="home home-rich">
    <section class="home-hero" aria-labelledby="homeTitle">
      <div class="hero-copy"><p class="eyebrow"><span class="eyebrow-dot"></span>공부의 시작을 조금 더 쉽게</p>
        <h1 id="homeTitle">수많은 정보 속,<br><em>딱 필요한</em> 발견.</h1>
        <p class="hero-description">어떤 사이트를 써야 할지, 자료는 어디서 찾아야 할지.<br>고민하는 시간은 줄이고 필요한 정보에 가까워지세요.</p>
        <div class="hero-benefits"><span>${icon('check')} 목적에 맞는 사이트</span><span>${icon('check')} 알아두면 쓸모 있는 정보</span></div>
        ${count ? `<p class="hero-caption"><strong>${count}</strong>개의 사이트에서 시작하는 나만의 탐색</p>` : '<p class="hero-caption">공부 · 과제 · 진로를 위한 작은 길잡이</p>'}
      </div>
      <div class="discovery-art" aria-hidden="true">
        <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">✧</span>
        <div class="art-label label-study">공부에 필요한</div><div class="art-label label-idea">새로운 발견</div>
        <div class="art-book book-back"></div><div class="art-book book-front"><div class="book-spine"></div><div class="book-cover">나에게 맞는<br><b>배움의 지도</b><span class="book-compass">${icon('compass')}</span><small>DDAKPILMO</small></div></div>
        <div class="art-note"><span class="note-icon">${icon('check')}</span><div><b>찾았다, 필요한 정보!</b><span>탐색의 다음 단계를 함께</span></div></div>
      </div>
    </section>
    <section class="home-start" aria-labelledby="startTitle"><div class="section-intro"><div><p class="eyebrow">나에게 맞는 시작</p><h2 id="startTitle">오늘은 무엇을 찾고 있나요?</h2></div><p>목적에 따라 두 가지 방법으로 시작해 보세요.</p></div>
      <div class="entry-grid">
        <a class="entry entry-sites" href="#/sites"><div class="entry-heading"><span class="entry-icon">${icon('grid')}</span><span class="entry-number">01 / EXPLORE</span></div><h2>사이트 모음</h2><p>공부부터 AI, 발표, 코딩까지.<br>지금 필요한 사이트를 직접 골라보세요.</p><div class="entry-tags"><span>학습</span><span>과제</span><span>진로</span><span>디지털 도구</span></div><strong>사이트 찾아보기 ${icon('arrow')}</strong></a>
        <a class="entry entry-info" href="#/info"><div class="entry-heading"><span class="entry-icon">${icon('compass')}</span><span class="entry-number">02 / INFO</span></div><h2>딱필 정보</h2><p>짧게 읽고, 하나 더 알아가는 시간.<br>공부에 필요한 지식과 사이트 활용 이야기를 만나보세요.</p><div class="entry-tags"><span>학습 정보</span><span>사이트 활용</span></div><strong>딱필 정보 읽어보기 ${icon('arrow')}</strong></a>
      </div>
    </section>
    <section class="home-search search-shelf" aria-labelledby="homeSearchTitle"><div class="search-shelf-heading"><span class="shelf-icon">${icon('book')}</span><div><h2 id="homeSearchTitle">찾는 사이트가 있나요?</h2><p>이름을 알고 있다면 바로 검색해 보세요.</p></div></div>${search}<nav class="purpose-shortcuts" aria-label="목적별 사이트 바로가기">${Object.entries(GROUPS).map(([key,group])=>`<a href="${esc(urlFor('sites',{group:key}))}">${esc(group.name)} <span aria-hidden="true">↗</span></a>`).join('')}</nav></section>
    ${infoShelf()}
    <section class="home-journey" aria-labelledby="journeyTitle"><div><p class="eyebrow">찾는 순간부터 사용하는 순간까지</p><h2 id="journeyTitle">좋은 자료를 만나는<br>조금 더 쉬운 방법</h2></div><ol><li><span>1</span><div><h3>나에게 맞게 찾고</h3><p>목적이나 과목으로 필요한 사이트를 좁혀요.</p></div></li><li><span>2</span><div><h3>한눈에 확인하고</h3><p>대상과 특징, 이용 조건을 살펴봐요.</p></div></li><li><span>3</span><div><h3>내 공부에 활용해요</h3><p>사이트로 이동하거나 저장해 다시 찾아요.</p></div></li></ol></section>
    ${recent}
  </div>`;
}
