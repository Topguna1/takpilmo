# 사이트 상세 한눈에 보기 조사·입력 기록

- 확인일: 2026-09-19
- 원본: [Google Sheets details 탭](https://docs.google.com/spreadsheets/d/1pX9qkGoXpIm28IQLjP5RII_qN6ILWRZkWZw_JkAxSvQ/edit#gid=0)
- 범위: 기존 상세 소개 43행. 카탈로그 전체 156개를 모두 조사한 것은 아닙니다.
- 결과: 빈 셀 320개 입력. 38개 사이트의 주요 용도·이용료/이용 조건·가입 조건·운영기관·운영 유형을 입력했습니다. 조건이 상품별로 다른 경우 확인 안내로 표시했습니다.
- 기존 소개문, 가입연령 등 확인하지 않은 필드와 드롭다운 유지. 출처 셀 메모에 보충 출처와 판단 범위를 기록했습니다.
- 재조회: 입력 값 320개 일치, 기존 값·운영 유형 유효성 검사 보존. URL 자동 링크 이외의 서식 변경 없음. 공개 Apps Script API HTTP 200 및 새 상세 필드 반환 확인.
- 공개 페이지를 로그인 없이 읽을 수 있었던 경우 '공개 조회는 비회원'으로 표현했습니다. 별도 신청·구독·개인화 기능까지 비회원이라는 의미가 아닙니다.
- 백업: [수정 전 CellData 및 입력 값](sheets-overview-research-2026-09-19.json). 백업 changes의 note는 조사 초안이며 실제 메모는 행별 출처 셀(H열, 출처가 없으면 N열)에만 넣었습니다.

## 우선 검토할 항목

- 나무위키·브리태니커·오픈국회정보포털: 공식 페이지 접근 제한/오류로 운영·요금·회원 조건 미입력.
- 고입정보포털: 과거 공식 유지관리 공고만 확인. 현재 운영·요금·가입 조건 미입력.
- NTIS: 운영기관은 확인했으나 이용료·회원별 이용 범위 미입력.
- 야나두·서울열린데이터광장·KISS 등: 상품/데이터/소속기관별 조건을 확인하도록 표기했으며 확정 가격을 적지 않았습니다.
- EBS 중학프리미엄: 무료 프리패스 안내 기간(2026-12-31) 이후 재확인 필요.
- 기존 긴 소개문은 보존했으므로 과거 연도나 변경 전 기관명이 포함될 수 있습니다.

## 입력 내용과 출처

| 시트 행 | 사이트 | 이용료·범위 | 가입 조건 | 운영기관 | 공식 출처 |
|---|---|---|---|---|---|
| 2 | EBS | 무료 콘텐츠 제공 · 일부 다시보기·구독 상품 유료 | 구독·회원 서비스는 EBS 통합회원 로그인 | 한국교육방송공사 | [확인 자료](https://www.ebs.co.kr/package/freeticket/promotion?promotion=sk) |
| 3 | EBSmidpremium | 중학프리미엄 프리패스 강좌 무료 | EBS 회원 로그인 후 무료 프리패스 신청 | 한국교육방송공사 | [확인 자료](https://mid.ebs.co.kr/premium/freeFreePassApplication?clnk=sitemap) |
| 4 | EBSi | 강좌 무료 · 교재 별도 구매 | 회원 학습 서비스는 EBS 통합회원 로그인 | 한국교육방송공사 | [확인 자료](https://wdown.ebsi.co.kr/ebsibook/2025_EBS_BOOK_GUIDE_update%282025.07%29.pdf) |
| 5 | KOCW | 공개강의·강의자료 무료 | 회원가입 무료 · RISS와 통합계정 이용 | 한국교육학술정보원(KERIS) | [확인 자료](https://www.kocw.net/home/m/guide/guideList.do) |
| 6 | KMOOC | 강좌 수강 무료 · 학점인정 관련 수수료 별도 | 회원 로그인 후 수강신청 | 국가평생교육진흥원 | [확인 자료](https://www.kmooc.kr/edubank) |
| 7 | KhanAcademy | 기본 학습 콘텐츠 무료 | 학습 진도 저장·관리는 무료 계정 필요 | Khan Academy(비영리 교육단체) | [확인 자료](https://support.khanacademy.org/hc/en-us/articles/202487570-How-do-I-set-up-my-account) |
| 8 | 메가스터디 | 유료 강좌·교재 판매 · 상품별 요금 확인 | 강좌 구매·회원 학습 서비스는 회원 로그인 | 메가스터디교육㈜ | [확인 자료](https://megastudy.net/member/terms.asp) |
| 9 | 야나두 | 상품별 수강료 확인 | 강좌 이용 조건은 상품·회원 안내 확인 | 주식회사 야나두 | [확인 자료](https://www.yanadoo.co.kr/service/yanadoo/service) |
| 10 | Coursera | 일부 강좌 미리보기 무료 · 전체 수강·인증서 등 유료 | 강좌 등록·학습은 계정 필요 | Coursera, Inc. | [확인 자료](https://www.coursera.org/courses?query=free) |
| 11 | edX | 일부 강좌 청강 무료 · 인증서 과정 유료 | 무료 계정 생성 후 강좌 등록 | edX LLC | [확인 자료](https://support.edx.org/hc/en-us/articles/360013426573-What-are-the-differences-between-audit-free-and-verified-paid-courses) |
| 12 | 에듀윌 | 유료 강좌·상품 판매 · 일부 회원 혜택 무료 | 수강·회원 혜택 이용은 회원 로그인 | ㈜에듀윌 | [확인 자료](https://arch.eduwill.net/Guide/Benefit) |
| 13 | RISS | 검색 무료 · 원문·문헌복사 등은 제공 조건에 따라 유료 | 개인화·신청 서비스는 RISS 회원 로그인 | 한국교육학술정보원(KERIS) | [확인 자료](https://m.riss.kr/search/detail/DetailView.do) |
| 14 | 공공데이터포털 | 데이터별 비용부과유무 확인 · 무료 데이터 제공 | 오픈API는 활용신청·인증키 등 데이터별 조건 확인 | 행정안전부·한국지능정보사회진흥원 | [확인 자료](https://www.data.go.kr/ugs/selectPortalInfoView.do) |
| 15 | 국립중앙도서관 | 공개 원문 무료 열람 · 자료별 이용 조건 상이 | 원문·회원 서비스는 자료별 인증 조건 확인 | 국립중앙도서관 | [확인 자료](https://www.nl.go.kr/NL/contents/N71240000000.do) |
| 16 | NTIS | 미확인 | 미확인 | 한국과학기술정보연구원(KISTI) | [확인 자료](https://www.kisti.re.kr/intro/duty/pageView/16?t=1774915200074) |
| 17 | 국사편찬위원회 | 공개 자료 온라인 열람 무료 | 공개 자료 조회는 비회원 이용 | 국사편찬위원회 | [확인 자료](https://www.history.go.kr/) |
| 18 | KERIS | 공개 보고서 열람·다운로드 무료 | 공개 보고서 조회는 비회원 이용 | 한국교육학술정보원(KERIS) | [확인 자료](https://www.keris.or.kr/main/ad/pblcte/selectPblcteRRInfo.do?mi=1138&pblcteSeq=13432) |
| 19 | KOSIS | 공개 통계 조회 무료 | 공개 조회는 비회원 · 개인화 서비스는 ONE-ID 이용 | 국가데이터처 | [확인 자료](https://kosis.kr/oneid/cmmn/member/GoToItgrClauses.do) |
| 20 | DBpia | 원문은 기관인증·개인구독 등 이용권 조건 확인 | 기관인증 또는 개인 회원 이용 · 상품별 조건 상이 | ㈜누리미디어 | [확인 자료](https://www.dbpia.co.kr/faq/faqView?fbId=13) |
| 21 | KISS | 원문은 소속기관 구독·개별 이용 조건 확인 | 회원·기관인증 등 원문별 이용 조건 확인 | 한국학술정보㈜ | [확인 자료](https://kiss.kstudy.com/Policy/Service) |
| 22 | 네이버학술정보 | 검색 무료 · 원문 제공처에 따라 무료·유료 | 검색은 비회원 이용 · 원문 제공처 조건 별도 | 네이버㈜ | [확인 자료](https://academic.naver.com/) |
| 23 | GoogleScholar | 검색 무료 · 원문 제공처에 따라 무료·유료 | 공개 검색은 가입 없이 이용 | Google | [확인 자료](https://scholar.google.com/intl/uk/scholar/help.html) |
| 24 | 서울열린데이터광장 | 데이터별 이용 조건 확인 | 오픈API 활용은 인증키 필요 | 서울특별시 | [확인 자료](https://data.seoul.go.kr/together/guide/useGuide.do) |
| 25 | 위키백과 | 무료 | 열람은 비회원 · 일부 편집은 계정 없이 가능 | 위키미디어재단(Wikimedia Foundation) | [확인 자료](https://wikimediafoundation.org/who-we-are/frequently-asked-questions/) |
| 26 | 나무위키 | 미확인 | 미확인 | 미확인 | 접근 불가 |
| 27 | 에듀넷 | 교육 콘텐츠 무료 제공 | 콘텐츠·회원 서비스 이용 시 회원가입 조건 확인 | 한국교육학술정보원(KERIS) | [확인 자료](https://st.edunet.net/member/memberJoin?in_div=nedu) |
| 28 | 네이버지식백과 | 공개 항목 열람 무료 | 공개 항목 열람은 비회원 이용 | 네이버㈜ | [확인 자료](https://help.naver.com/service/6005/contents/1674?lang=ko&osType=COMMONOS) |
| 29 | 브리태니커백과사전 | 미확인 | 미확인 | 미확인 | 접근 불가 |
| 30 | ScienceDirect | 오픈액세스 원문 무료 · 다른 원문은 구독·구매 조건 확인 | 공개 검색 가능 · 구독 원문은 기관·계정 인증 조건 확인 | Elsevier | [확인 자료](https://www.elsevier.com/products/sciencedirect) |
| 31 | PubMed | 서지·초록 검색 무료 · 외부 원문 조건 별도 | 검색·초록 조회는 가입 없이 이용 | 미국 국립의학도서관(NLM)·NCBI | [확인 자료](https://pubmed.ncbi.nlm.nih.gov/about/) |
| 32 | 오픈국회정보포털 | 미확인 | 미확인 | 미확인 | 접근 불가 |
| 33 | 국가기록원 | 공개 기록 검색 무료 · 사본·복제·배송 수수료 별도 | 온라인 사본 신청은 신청자 확인 절차 필요 | 국가기록원 | [확인 자료](https://www.archives.go.kr/next/newonline/onlineRequest.do) |
| 34 | E나라지표 | 공개 지표 조회 무료 | 공개 지표 조회는 비회원 이용 | 국가데이터처 | [확인 자료](https://www.index.go.kr/unity/potal/PotalMainGuide.do) |
| 35 | 법제처국가법령정보센터 | 공개 법령 검색·열람 무료 | 공개 법령 조회는 비회원 이용 | 법제처 | [확인 자료](https://law.go.kr/lsSc.do) |
| 36 | 국토연구원 | 공개 보고서 무료 · 외부 학술DB 이용 권한 별도 | 공개 자료 조회는 비회원 · 외부DB는 인증 조건 확인 | 국토연구원 | [확인 자료](https://library.krihs.re.kr/cbrief/10150/search?materialTypes=a&sort=publisherYearDisp_desc) |
| 37 | 교육부 | 공개 정책자료 열람 무료 | 공개 자료 열람은 비회원 이용 | 교육부 | [확인 자료](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=194&boardSeq=106844&lev=0&m=020602&opType=N&page=1&s=moe&searchType=null&statusYN=W) |
| 38 | 고입정보포털 | 미확인 | 미확인 | 미확인 | [확인 자료](https://www.kedi.re.kr/khome/mobile2/announce/selectAnnounceForm.do?article_sq_no=35517&board_sq_no=2&currentPage=1&selectTp=0) |
| 39 | 경기도교육청 | 공개 입학정보 열람 무료 | 공개 자료 조회는 비회원 · 원서 기능의 인증 조건은 별도 확인 | 경기도교육청 | [확인 자료](https://satp.goe.go.kr/) |
| 40 | 서울특별시교육청 | 공개 안내·자료 열람 무료 | 공개 자료 조회는 비회원 이용 | 서울특별시교육청 | [확인 자료](https://www.sen.go.kr/www/useinfo/guide.jsp) |
| 41 | 인천광역시교육청 | 공개 입학정보 열람 무료 | 일부 기능은 인증서 인증 필요 | 인천광역시교육청 | [확인 자료](https://isatp.ice.go.kr/login.do) |
| 42 | 커리어넷 | 공개 직업·학과 정보 열람 무료 | 개인화·검사·상담 기능은 로그인 조건 확인 | 한국직업능력연구원 국가진로교육연구센터 | [확인 자료](https://m.career.go.kr/cloud/m/main/home) |
| 43 | 한국사데이터베이스 | 공개 사료 온라인 열람 무료 | 공개 사료 조회는 비회원 이용 | 국사편찬위원회 | [확인 자료](https://db.history.go.kr/main/notice/noticeView.do?noticeId=88) |
| 44 | 한국고전종합 | 공개 원문·번역문 열람 무료 | 공개 검색·열람은 비회원 이용 | 한국고전번역원 | [확인 자료](https://db.itkc.or.kr/) |
