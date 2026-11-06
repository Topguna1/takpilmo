import { GROUPS, esc, urlFor } from './model.module.js';
import { infoShelf } from '../info/view.module.js';
import { TASK_GUIDES } from '../info/task-guides.module.js';

export function homeView({ search, recent, saved = '', count }) {
  return `<div class="home home-focused">
    <section class="discovery-hero" aria-labelledby="homeTitle">
      <div class="discovery-copy">
        <p class="eyebrow"><span class="status-dot" aria-hidden="true"></span> 필요한 발견이 시작되는 곳</p>
        <h1 id="homeTitle">호기심을 따라,<br><em>딱 필요한</em> 발견.</h1>
        <p class="hero-intro">과제의 첫 자료부터 발표의 마지막 한 장까지.<br>좋은 사이트를 찾고, 나만의 탐구를 이어가세요.</p>
        <div class="hero-search-block">${search}</div>
        <div class="hero-caption-row"><span>${count ? `<strong>${count}</strong>개의 사이트를 한곳에` : '나에게 맞는 사이트를 찾아보세요'}</span><span>찾고 · 확인하고 · 저장하기</span></div>
      </div>
      <div class="discovery-visual" aria-hidden="true">
        <div class="visual-grid"></div><span class="visual-caption">A LITTLE CURIOSITY, A NEW DISCOVERY.</span>
        <div class="visual-orbit"></div><span class="visual-spark">✳</span>
        <div class="field-book book-shadow"></div>
        <div class="field-book book-main"><span class="book-edition">DDAKPILMO / FIELD NOTES</span><span class="book-title">나의 다음<br>발견을 위한<br><b>작은 지도.</b></span><svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="43"/><path d="m68 30-10 30-28 10 10-30 28-10Z"/><path d="m40 40 18 20M50 2v12m0 72v12M2 50h12m72 0h12"/></svg><span class="book-bottom">EXPLORE SOMETHING NEW ↗</span></div>
        <span class="visual-sticker">어디서 찾지?<br><b>여기서 시작!</b></span>
        <div class="visual-note"><span class="note-check">↗</span><div><b>찾는 순간에서, 쓰는 순간까지.</b><small>좋은 자료가 좋은 탐구로 이어지도록</small></div></div>
      </div>
    </section>
    <section class="task-section" aria-labelledby="taskTitle"><div class="section-intro"><div><p class="eyebrow">START WITH A QUESTION</p><h2 id="taskTitle">오늘의 탐구는 어디서 시작할까요?</h2></div><p>막막한 시작에, 작은 길잡이 세 가지.</p></div>
      <div class="task-grid">${TASK_GUIDES.map((item,index) => `<a class="task-card task-tone-${index}" href="#/info/${item.id}"><div class="task-card-top"><span class="task-symbol" aria-hidden="true">${['▥','⌕','↗'][index]}</span><span class="task-index">0${index+1} / ${['DATA','RESEARCH','PRESENT'][index]}</span></div><h3>${esc(item.shortTitle)}</h3><p>${esc(item.summary)}</p><span class="task-card-link">순서와 추천 사이트 보기 <span class="round-arrow" aria-hidden="true">↗</span></span></a>`).join('')}</div>
    </section>
    ${saved || recent ? `<section class="home-resume" aria-labelledby="resumeTitle"><h2 id="resumeTitle">하던 과제 이어가기</h2><p class="muted">현재 브라우저에 저장된 기록이에요.</p>${saved}${recent}</section>` : ''}
    ${infoShelf()}
    <section class="worksheet-shelf"><h2>자료와 출처를 함께 정리하세요</h2><p>탐구 질문부터 발표 확인까지, 무료 양식으로 기록해 보세요.</p><a class="button" href="assets/worksheets/research-starter.html" target="_blank" rel="noopener noreferrer">무료 양식 열기·인쇄 ↗</a> <a class="button" href="assets/worksheets/research-starter.md" download>편집용 양식 받기</a></section>
    <section><div class="section-intro"><h2>전체 사이트 둘러보기</h2><a href="#/sites">사이트 모음 →</a></div>
      <nav class="purpose-shortcuts" aria-label="목적별 사이트 바로가기">${Object.entries(GROUPS).map(([key, group]) => `<a href="${esc(urlFor('sites',{group:key}))}">${esc(group.name)} →</a>`).join('')}</nav>
      <p><a href="#/about">딱필모 소개</a> · <a href="#/info">딱필 정보 모두 보기</a></p>
    </section>
  </div>`;
}
