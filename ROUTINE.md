# 매일 자동 수집 절차 (오전 8시 KST 전 완료)

매일 루틴이 이 문서를 그대로 따른다. 오늘 날짜(KST)를 기준으로 한다.

## 0. 병렬 처리
카테고리마다 서브에이전트(Agent 도구)를 **1개씩 동시에** 띄워 서칭·요약을 맡긴다(18개 + 오늘 영역 1개). 각 에이전트에게 이 문서의 1~3절과 담당 카테고리, `data/sources.json`의 해당 항목을 넘기고, 결과는 `incoming/<카테고리>.json`에 저장하게 한다. 모두 끝나면 메인이 4절(반영·배포)을 한 번만 실행한다. 실패한 카테고리는 다시 한 번만 재시도한다.

## 1. 수집
카테고리 18개(수집 단위): `ai, applesamsung, art, ax, car, ccm, christian, design, fashion, food, it, movie, music, shorts, uxui, wine, meme, ent`
- 사이트 탭은 섹션으로 묶어 보여준다(app.js `SECTIONS`): AI(ai·ax), IT·테크(it·applesamsung·car), 문화(movie·music·art), 디자인(design·uxui), 라이프(fashion·food·wine), 연예·트렌드(ent·shorts·meme), 종교(christian·ccm). 분류를 추가하면 `SECTIONS`와 update.py `CATS`·`CAT_NAME`에 함께 넣는다.
- applesamsung은 애플·삼성전자 제품·소프트웨어·실적·전략(대략 반반), it에서는 애플·삼성 기사를 빼고 다른 기업 위주로. movie는 영화(개봉·박스오피스·영화제·감독), ent(연예)는 영화를 빼고 드라마·예능·아이돌 위주로.
- wine은 와인 산업·작황·와이너리·경매·시장·국내 와인 시장.
- **shorts**는 기사가 아니라 그날(최근 1~3일) 가장 화제인 유튜브 쇼츠 10개(한국 우선). 화제 쇼츠를 다룬 기사·트렌딩 페이지로 찾고, 각 영상은 YouTube oEmbed(`https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/<ID>&format=json`)로 존재·제목·채널을 확인(확인 안 되면 제외, ID 지어내기 금지). 항목 형식: `url`=`https://www.youtube.com/shorts/<ID>`, `videoId`=<ID>, `source`=채널명, `originalTitle`=영상 원제목, `image`=`https://i.ytimg.com/vi/<ID>/hqdefault.jpg`, `via`=화제 근거 페이지. 요약은 무슨 영상이고 왜 화제인지 250~500자. 혐오·선정·위험 행위 제외.
  - 쓸 수 있었던 소스: kworb.net/youtube/trending/kr.html(한국 트렌딩 ID), Bing News RSS(`&format=rss`), Know Your Meme, `allowed_domains:["youtube.com"]` WebSearch. youtube.com/feed/trending·playboard는 안 됨.
  - oEmbed 결과의 한글 제목·채널명이 요약 모델에서 오타로 바뀌는 경우가 있다. WebSearch 제목과 교차 확인하고, 채널명은 author_url 퍼센트 인코딩을 디코드해 확정한다.
- music은 일반 음악 산업·신곡·차트·공연(CCM 제외, 아이돌 가십은 연예로). food는 외식·식품 산업·음식 트렌드. ent(연예)는 드라마·영화·예능·배우·아이돌 활동, 사생활 루머·선정적 기사 제외.
- design은 제품·브랜딩·건축·공간 디자인, uxui는 UX/UI·디자인 툴·디자인 시스템·접근성으로 나눈다.

- 각 카테고리의 대상 사이트·키워드는 `data/sources.json`에 있다. 이 사이트들과 키워드로 WebSearch/WebFetch 해서 최신 기사를 찾는다. 더 좋은 사이트를 찾으면 `sources`에 추가해도 된다.
- WebSearch는 오래된 페이지가 섞이기 쉽다. 대상 사이트의 **최신 기사 목록 페이지를 WebFetch로 직접 열어** 고르는 방식을 우선한다. 한 매체에 몰리지 않게 가능하면 2곳 이상, 한국어 매체도 섞는다.
- 카테고리마다 **10건**, 최근 2일 이내 기사 우선(없으면 7일까지).
- `data/articles.json`에 이미 있는 URL·같은 사건은 제외한다.
- 반드시 WebFetch로 원문을 열어 **읽은 내용만** 근거로 요약한다. 원문을 못 열면 그 기사는 버린다. 자료에 없는 사실·숫자는 쓰지 않는다. 날짜 확인이 안 되면 `publishedAt: null`.
- 밈: 혐오·선정적 내용 제외. 밈이 무엇이고 어디서 시작됐고 왜 유행하는지 이해되게.

## 2. 요약 형식 (한국어)
- `title` 한국어 제목, `originalTitle` 원문 제목
- `summary`: 문단 2~4개, 총 350~700자. 배경 → 핵심 내용 → 의미/전망. 너무 줄이지 말고 맥락이 이해될 만큼. 원문 문장 길게 베끼지 않기.
- `keyPoints`: 핵심 3줄(각 40자 내외)
- `image`: 원문의 og:image 메타 URL(WebFetch에 그대로 달라고 요청). 사이트 공통 로고면 본문 대표 사진, 없으면 null. https 절대 URL만, 지어내지 않기.

작업 폴더 `incoming/`(커밋하지 않음)에 카테고리별 파일 저장:
```json
{"category":"ai","sources":[{"name":"","url":"","keywords":[""]}],
 "articles":[{"title":"","originalTitle":"","source":"","url":"","publishedAt":"YYYY-MM-DD","summary":["",""],"keyPoints":["","",""],"image":"https://... 또는 null"}]}
```

## 3. 오늘 영역 → `incoming/daily.json`
```json
{"date":"YYYY-MM-DD",
 "verse":{"ref":"","text":"","version":"개역한글"},
 "english":{"expression":"","meaning":"","example":"","exampleKo":"","tip":""},
 "quote":{"text":"","original":"","author":""},
 "art":{"title":"","artist":"","year":"","image":"","page":"","credit":"","description":""}}
```
- 말씀: 저작권 만료된 **개역한글** 본문만, 웹에서 실제 확인한 문장. 최근 30일 안에 쓴 구절 반복 금지(git log로 확인).
- 명언: 출처가 확인되는 실존 인물의 말만.
- 그림: 퍼블릭 도메인만. Art Institute of Chicago API(`https://api.artic.edu/api/v1/artworks/search?q=...&fields=id,title,artist_display,date_display,image_id,is_public_domain`, 이미지 `https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg`)에서 `is_public_domain=true` 확인.

## 4. 반영·배포
```bash
python3 scripts/update.py incoming
git add data a reports && git commit -m "daily: YYYY-MM-DD" && git push origin main
```
`update.py`가 `reports/summaryx_report_YYMMDD_v1.md`(카테고리·대상 사이트·키워드 리포트)를 만든다. `/mnt/project-files/`가 있으면 그 리포트를 `/mnt/project-files/summaryx/reports/`에도 복사한다.
`incoming/`은 커밋하지 않는다. 실패한 카테고리가 있으면 커밋 메시지에 적는다.
