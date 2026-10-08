# 매일 자동 수집 절차 (오전 8시 KST 전 완료)

매일 루틴이 이 문서를 그대로 따른다. 오늘 날짜(KST)를 기준으로 한다.

## 0. 병렬 처리
카테고리마다 서브에이전트(Agent 도구)를 **1개씩 동시에** 띄워 서칭·요약을 맡긴다(47개 + 오늘 영역 1개). 각 에이전트에게 이 문서의 1~3절과 담당 카테고리, `data/sources.json`의 해당 항목을 넘기고, 결과는 `incoming/<카테고리>.json`에 저장하게 한다. 모두 끝나면 메인이 4절(반영·배포)을 한 번만 실행한다. 실패한 카테고리는 다시 한 번만 재시도한다.

### 시간대 나눠 수집 (WebFetch 한도)
WebFetch는 세션 전체에서 **시간당 약 400회**로 제한된다. 카테고리당 20건을 모으려면 루틴을 7번(01:22~07:22 KST, 1시간 간격)에 나눠 돌린다. 각 회차는 자기 묶음(8개 안팎)만 수집 → `update.py` → main 배포까지 끝낸다. 서브에이전트마다 WebFetch는 **최대 40회**로 제한하고(8개×40=320), 한도에 걸리면 모은 만큼만 저장한다.
### 낮·저녁 경량 갱신 (10:47, 16:22 KST → 11시 반·17시 전에 반영)
새 기사만 추가한다. 서브에이전트 12개가 묶음을 나눠 맡고(에이전트당 WebFetch 최대 30회), 카테고리당 **새 기사 최대 5건**(오늘 나온 것 우선, 이미 있는 URL·사건 제외, 없으면 0건). 묶음: ①ai·ax·robot ②it·applesamsung·semi·security ③car·g2b ④movie·music·show ⑤ent·kpop·meme ⑥game·webtoon·sports ⑦toon·toonhot·shopmen ⑧shopdeal·winedeal·wineko ⑨food·travel·tripko·tripworld ⑩bp·dm·lipid ⑪fashion·design·uxui ⑫wine·science·edu. 오늘 영역(daily)·paper·shorts·맛집·shopguide는 아침 수집만.

아침 전체 수집 회차:
- 0(01:22): toon, toonhot, worldfood, eatseoul, eatgg, eatdj, eatsj, seasonal, shopguide, shopmen, shopdeal, tripko, tripworld, bp, dm, lipid, gecko, reptile, archproj, interior, recipe, recipeside, recipesnack, bfashion, bcar, btech, bfood, bbeauty, poemread, poemnews, aicert, usedwear, lux1, lux2, lux3, luxwatch
- 1(02:22): ai, ax, robot, paper, it, applesamsung, car, semi
- 2(03:22): security, g2b, movie, music, art, book, show + 오늘 영역(daily)
- 3(04:22): design, cardesign, productd, brand, package, uxui, arch, fashion
- 4(05:22): food, travel, health, wine, winepick, wineregion, winepair, winestudy
- 5(06:22): winetype, winery, cellar, winedeal, wineko, game, webtoon, sports
- 6(07:22): science, edu, ent, kpop, shorts, meme, christian, ccm → 끝나면 스레드에 하루치 보고(1~6회차 리포트 첨부)

## 1. 수집
카테고리 83개(수집 단위): `lux1, lux2, lux3, luxwatch, usedwear, aicert, poemread, poemnews, bfashion, bcar, btech, bfood, bbeauty, recipe, recipeside, recipesnack, archproj, interior, gecko, reptile, bp, dm, lipid, seasonal, tripko, tripworld, toon, toonhot, worldfood, eatseoul, eatgg, eatdj, eatsj, shopguide, shopmen, shopdeal, ai, ax, robot, paper, it, applesamsung, car, semi, security, movie, music, art, book, show, design, cardesign, productd, brand, package, uxui, arch, fashion, food, travel, health, wine, winepick, wineregion, winepair, winestudy, winetype, winery, cellar, winedeal, wineko, game, webtoon, sports, science, edu, ent, kpop, shorts, meme, g2b, christian, ccm`
- 사이트 탭은 섹션으로 묶어 보여준다(app.js `SECTIONS`): AI(ai·ax·robot·paper·aicert 자격증), IT·테크(it·applesamsung·car·semi·security), 문화(movie·music·art·book·show), 디자인(design 디자인 뉴스·cardesign 자동차·productd 제품·산업·brand 브랜딩·그래픽·package 패키지·uxui), 라이프(fashion·food·travel·health), 와인(wine 업계 뉴스·winepick 추천·리뷰·wineregion 산지·빈티지·winepair 페어링·winestudy 와인 상식·winetype 세계 인기 와인·winery 와이너리·cellar 셀러·보관·winedeal 할인 정보·wineko 국내 와인), 학생(game·webtoon·sports·science·edu), 연예·트렌드(ent·kpop·shorts·meme), 맛집·맛도리(eatseoul·eatgg·eatdj·eatsj·worldfood·seasonal 제철 음식), 쇼핑(shopguide·shopmen·shopdeal), 건강(bp 고혈압·dm 당뇨·lipid 고지혈증·심혈관), 여행지(tripko 국내·tripworld 해외), 명품(lux1 하이엔드·lux2 럭셔리·lux3 프리미엄·컨템포러리·luxwatch 워치·주얼리), 당근·중고(usedwear 중고 의류 소식 + 당근 검색 바로가기), 시(poemread 명시 감상·poemnews 시 소식·시집), 브랜드(bfashion 패션·럭셔리·bcar 자동차·btech IT·전자·bfood 식음료·bbeauty 뷰티·생활), 레시피(recipe 한 그릇·메인·recipeside 반찬·국·recipesnack 간식·브런치), 건축(arch 건축 소식·archproj 작품·프로젝트·interior 인테리어·공간), 도마뱀(gecko 크레스티드게코·reptile 도마뱀 키우기), 웹툰(toon·toonhot), 나라장터(g2b), 종교(christian·ccm). 분류를 추가하면 `SECTIONS`와 update.py `CATS`·`CAT_NAME`에 함께 넣는다.
- applesamsung은 애플·삼성전자 제품·소프트웨어·실적·전략(대략 반반), it에서는 애플·삼성 기사를 빼고 다른 기업 위주로. movie는 영화(개봉·박스오피스·영화제·감독), ent(연예)는 영화를 빼고 드라마·예능·아이돌 위주로.
- 와인 섹션: wine은 해외 와인 산업·기업·경매·시장(업계 뉴스), winepick은 신상·리뷰·점수·스타일별 추천, wineregion은 산지 소식·수확/빈티지 리포트·규정, winepair는 음식 페어링·레시피(14일 이내 허용), winestudy는 품종·라벨·보관·시음 등 입문 해설(30일 이내 허용), wineko는 국내 시장·유통 행사·국내 와인 이벤트. winetype은 세계적으로 사랑받는 품종·스타일(카베르네 소비뇽·피노 누아·샴페인·리슬링 등) 소개, winery는 와이너리·샤토 탐방·역사·인물, cellar는 와인셀러·냉장고·보관 장비·보관법·잔·디캔터, winedeal은 국내 마트·백화점·편의점·온라인 와인 할인 행사(기간·장소·할인율 원문 그대로, 끝난 행사 제외). 30일 이내 허용(winedeal은 진행 중 행사만, cellar는 보관·장비 가이드라 6개월 이내 허용). 서로 같은 사건 겹치지 않게.
- **shorts**는 기사가 아니라 그날(최근 1~3일) 가장 화제인 유튜브 쇼츠 10개(한국 우선). 화제 쇼츠를 다룬 기사·트렌딩 페이지로 찾고, 각 영상은 YouTube oEmbed(`https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/<ID>&format=json`)로 존재·제목·채널을 확인(확인 안 되면 제외, ID 지어내기 금지). 항목 형식: `url`=`https://www.youtube.com/shorts/<ID>`, `videoId`=<ID>, `source`=채널명, `originalTitle`=영상 원제목, `image`=`https://i.ytimg.com/vi/<ID>/hqdefault.jpg`, `via`=화제 근거 페이지. 요약은 무슨 영상이고 왜 화제인지 250~500자. 혐오·선정·위험 행위 제외.
  - 쓸 수 있었던 소스: kworb.net/youtube/trending/kr.html(한국 트렌딩 ID), Bing News RSS(`&format=rss`), Know Your Meme, `allowed_domains:["youtube.com"]` WebSearch. youtube.com/feed/trending·playboard는 안 됨.
  - oEmbed 결과의 한글 제목·채널명이 요약 모델에서 오타로 바뀌는 경우가 있다. WebSearch 제목과 교차 확인하고, 채널명은 author_url 퍼센트 인코딩을 디코드해 확정한다.
- music은 일반 음악 산업·신곡·차트·공연(CCM 제외, 아이돌 가십은 연예로). food는 외식·식품 산업·음식 트렌드. ent(연예)는 드라마·영화·예능·배우·아이돌 활동, 사생활 루머·선정적 기사 제외.
- 학생 섹션(초·중·고 학생 대상): game은 인기 게임 업데이트·신작·e스포츠(도박·확률형 논란·성인 등급 제외), webtoon은 웹툰·애니·만화 신작·개봉·드라마화(성인·잔혹 제외), sports는 해외파 축구·KBO·MLB 한국 선수 등 경기·선수 이야기(승부조작·폭행 사건 제외), science는 우주·공룡·동물·로봇·신기한 발견(AI·IT 산업 제외), 쉬운 말로 요약.
- 추가 분류: robot(휴머노이드·산업·서비스 로봇), semi(메모리·HBM·파운드리·AI 칩 산업), security(해킹·유출 사고·취약점·대응, 공격 기법 상세 X), book(신간·베스트셀러·문학상·출판), show(뮤지컬·연극·클래식·전시·축제, art와 같은 전시 피함), arch(건축물·건축가·인테리어·공간), travel(여행 트렌드·항공·호텔·여행지·제도), health(연구·기관 근거 있는 생활 건강, 광고·과장 효능 X, 의학 조언처럼 쓰지 않음), edu(수능·입시·교육 정책·진로, 학생·학부모 대상, 사교육 광고 X), kpop(컴백·차트·투어·시상식, 루머·열애 X. ent는 드라마·예능·배우 위주).
- **paper**(AI 논문): 최근 7일 HF Daily Papers·arXiv(cs.AI/CL/LG/CV)·주요 연구소 논문 중 화제성 높은 10편. arXiv abs를 직접 열어 초록·본문 근거로 비전문가용 요약(배경→방법→결과). `facts`: 저자·소속·분야·arXiv ID·코드.
- **g2b**(나라장터): 사용자는 디지털 에이전시 재직. SI·에이전시 규모(추정가 약 30억 이하) 용역 중 웹·앱·플랫폼 구축/고도화/운영, UI/UX, 웹 접근성, 디자인·콘텐츠, 디지털 홍보, ISP만. 물품·공사·인력파견·장비 위주 제외, 마감 지난 공고 제외, 사업예산 1억 원 초과 공고를 우선해 절반 이상 채운다(사이트에서 전체/1억 이하/1억 이상으로 나눠 보여줌), 공고 원문을 직접 연 건만. 추가 필드 `facts`(공고번호·발주기관·사업예산·사업기간·입찰방식·참가자격·입찰 마감·제안설명회), `requirements`(제안 요건 5~10줄, 원문 기준), `fit`(에이전시 관점 한 줄). 사업기간·사업예산·발주기관은 목록 카드에 크게 보이므로 조달데이터(jodaldata.com bid.php) 상세·공고문에서 꼭 확인. 확인 못 한 값은 "[확인 필요]", 절대 지어내지 않는다. 20건 못 채우면 찾은 만큼.
- **맛집**(eatseoul 서울·eatgg 경기·eatdj 대전·eatsj 세종): 검색·웨이팅이 많은 인기 음식점 위주. 근거는 기사·미쉐린·블루리본·다이닝코드 등 원문에서 확인한 것만(광고·체험단·협찬 글 제외). 한 항목 = 한 식당, url은 근거 기사·가이드 페이지. `facts`: 지역(구·동)·대표 메뉴·가격대(원문 그대로)·근거(예: 미쉐린 빕 구르망 2026). 영업시간·가격 등 확인 못 한 값은 "[확인 필요]". 90일 이내 기사·최신판 가이드 허용, 지자체·관광공사 공식 지정(예: 수원맛집 100선, 세종사랑 맛집, 대전 맛집 인증)은 1년 이내 허용, 폐업 확인되면 제외. 여러 식당을 묶은 목록 기사는 식당마다 `url`=`기사URL#식당명`으로 한 항목씩 나눠도 된다(같은 기사에서 최대 5곳). 다이닝코드·블루리본·식신은 JS·차단으로 못 여는 경우가 많으니 미쉐린 상세 페이지, 지자체 보도자료, 지역 언론 기사를 우선한다.
- **worldfood**(세계 맛도리): 세계 각국에서 사랑받는 음식·간식·식품 소개(유래·맛·어디서 먹나). 화제 식품 기사 우선, 소개 글은 90일 이내 허용. food(외식 산업 뉴스)와 겹치지 않게.
- **seasonal**(제철 음식): 수집하는 날(KST)의 계절·달 기준 제철 식재료·음식 소개(봄 3~5월, 여름 6~8월, 가을 9~11월, 겨울 12~2월). 한 항목 = 한 식재료·음식, 왜 지금이 제철인지·고르는 법·먹는 법·산지를 농식품부·농진청·수협·지자체·기사 원문 근거로. 계절이 바뀌면 그 계절 것만 새로 모은다. 90일 이내 기사·공식 소개 허용, 건강 효능 과장 금지.
- **shopguide**(믿을 만한 쇼핑몰): 남성 의류를 살 수 있는 신뢰도 높은 국내 사이트를 한 항목 = 한 사이트로 소개(url=사이트 홈). 대기업·브랜드 공식몰, 정품 보장, 교환·반품 정책, 정기 세일 시기 등 신뢰 근거를 사이트 공지·약관·기사에서 확인한 것만 `facts`(운영사·정품 보장·반품·정기 세일·특징)에 쓴다. 인스타·SNS 광고형 단독몰, 운영사 불명, 리셀·병행수입 위주 몰 제외. 매번 새로 쓰지 말고 이미 있는 사이트는 건너뛴다(없으면 0건 정상).
- **shopmen**(남성 의류): 남성복 브랜드·신상·컬렉션·협업·코디 트렌드 뉴스(14일 이내). **shopdeal**(할인 행사): shopguide 수준의 신뢰 사이트·브랜드 공식몰의 진행 중 할인 행사만(기간·할인율 원문 그대로, 끝난 행사 제외, 쿠폰 조건은 원문대로).
- **건강 섹션**(bp·dm·lipid, 성인병 관리): 신뢰 출처만. 질병관리청·국가건강정보포털·건강보험공단·식약처, 대학병원·학회(대한고혈압학회·대한당뇨병학회·한국지질동맥경화학회 등), WHO·CDC·NIH·AHA·ADA, 주요 의학 저널(NEJM·Lancet·JAMA·BMJ 등)과 이를 보도한 주요 언론·의학 전문지. 민간요법·카더라·건강식품·광고·블로그·체험기 제외. `facts`에 출처기관(필수)·근거 종류(가이드라인/연구/기관 발표)·대상을 쓴다. 의학 조언처럼 단정하지 않고 '전문의 상담' 맥락 유지. 30일 이내 기사, 기관 가이드·생활수칙은 1년 이내 허용. 라이프 health와 겹치지 않게.
- **여행지**(tripko 국내·tripworld 해외): 뉴스가 아니라 가볼 만한 여행지 소개. 지금 계절·축제·화제성 있는 곳 우선, 한 항목 = 한 여행지(도시·명소·코스). 관광공사·지자체·여행 매체·기사 원문 근거로 볼거리·가는 법·시기·비용(원문 그대로)을 `facts`에. 라이프 travel(여행 산업·항공·제도 뉴스)과 겹치지 않게, 90일 이내 기사·공식 소개 페이지 허용, 확인 못 한 값은 "[확인 필요]".
- **aicert**(AI 자격증): 국내(AICE·ADsP·빅데이터분석기사·AI 활용 능력 등 공인·민간 자격)와 해외(AWS·Google Cloud·Microsoft Azure AI·NVIDIA 등 벤더 자격) AI 관련 자격증. 한 항목 = 한 자격증, url=시행기관 공식 페이지(직접 연 것). `facts`: [시행기관]·[자격 종류](국가기술/국가공인/민간/벤더)·[시험 일정](원문 그대로, 가장 가까운 회차)·[응시료]·[시험 방식]·[응시 자격]·[난이도·대상]. 확인 못 한 값은 "[확인 필요]". 일정이 지난 회차만 있으면 다음 회차 [확인 필요]. 신설·개편·일정 공지 기사는 30일 이내. 학원·강의 광고 제외. 데이터자격검정(dataq·kdata)·Q-Net·AICE처럼 공식 페이지를 못 여는 자격은 시행기관 일정을 보도한 언론 기사로 대신하고 url은 그 기사로 한다.
- **명품 섹션**: 티어는 summaryx 분류(공식 등급 아님, 사이트에 기준 표시). lux1 하이엔드=에르메스·샤넬·루이비통, lux2 럭셔리=디올·구찌·프라다·생로랑·셀린느·보테가 베네타·발렌시아가·로에베·버버리·펜디·지방시·발렌티노·미우미우, lux3 프리미엄·컨템포러리=메종 마르지엘라·아크네·띠어리·마크 제이콥스·코치·토리버치·마이클 코어스·랄프 로렌·아미·메종 키츠네, luxwatch=롤렉스·파텍 필립·오데마 피게·까르띠에·반클리프 아펠·불가리·티파니·오메가. 각 브랜드의 신제품·컬렉션·가격 인상·매장·실적 소식(30일). 한 기사 = 한 항목, 같은 브랜드는 하루 2건까지. `facts`: [브랜드]·[티어]·[소속 그룹](원문 확인 못 하면 [확인 필요])·[가격](원문에 있을 때). 브랜드 섹션 bfashion과 같은 기사 금지. 리셀·가품·광고 제외.
- **usedwear**(당근·중고): 당근마켓은 robots.txt로 AI 수집기를 막아 매물은 수집하지 않는다(우회 금지, 사이트엔 검색 바로가기만). 대신 중고 의류 거래 팁(사기 예방·검수·세탁·가격 매기기), 중고·리셀 의류 시세·트렌드, 당근·번개장터·크림 등 중고 플랫폼의 의류 관련 소식 기사(30일, 가이드는 1년 이내). 남성 의류 우선, 광고 제외.
- **시 섹션**: poemread는 한 항목 = 시 한 편 감상. 시 전문은 싣지 않는다(이 환경의 WebFetch는 전문 인용을 못 하고 위키문헌·구텐베르크는 접속 차단). 대신 신문·문학 매체의 시 감상 칼럼(예: 경향 '詩想과 세상', 조선 '가슴으로 읽는 시', 한겨레·중앙 시 칼럼, 문학 웹진, Poetry Foundation 해설)을 url로 삼아 시의 배경·감상 포인트를 2~3문단으로 요약하고, 시 구절은 칼럼에 인용된 두세 줄까지만. `facts`: [시인]·[수록 시집]·[칼럼]. 90일 이내 칼럼. poemText는 쓰지 않는다. 오늘 영역 '오늘의 시'와 같은 시는 피한다. poemnews는 시집 신간·문학상·시인 소식(30일 이내), book과 겹치지 않게.
- **브랜드 섹션**(디자인>brand 브랜딩·그래픽과 다름): 세계적으로 유명한 브랜드를 분야별로 소개. 선정 기준은 Interbrand Best Global Brands·Kantar BrandZ 등 공신력 있는 순위(연도·순위를 원문에서 확인한 것만). 한 항목 = 한 브랜드, 그 브랜드의 최근 소식 기사(30일 이내 우선) 또는 브랜드 역사·특징을 다룬 기획·인터뷰 기사(1년 이내)를 url로 삼아 브랜드 소개(국가·창립·대표 제품·브랜드 특징)와 최근 소식을 함께 요약. `facts`: [선정 근거](예: Interbrand 2025 7위)·[국가]·[창립]·[대표 제품]·[공식 사이트](원문에서 확인 못 한 국가·창립·공식 사이트는 "[확인 필요]"). 이미 있는 브랜드는 새 소식이 있을 때만. 광고성 보도자료 위주 X.
- **레시피 섹션**: 집에서 30분 안팎으로 쉽게 만드는 메뉴. 한 항목 = 한 메뉴. `url`=레시피 원문(만개의레시피·농식품 레시피·요리 매체 등, 원문을 직접 연 것), `image`=완성 사진(og:image), `videoId`=그 메뉴를 만드는 유튜브 영상 ID(백종원 등 인기 채널 우선, YouTube oEmbed로 존재·제목·채널 확인, 확인 안 되면 null, ID 지어내기 금지), `ingredients`(재료와 분량, 원문 기준 리스트), `steps`(만드는 법 4~8단계, 원문을 내 말로 짧게), `facts`([조리 시간]·[난이도]·[인분]·[영상 채널]). summary는 어떤 메뉴이고 왜 간편한지 2문단. 이미 있는 메뉴 제외, 날짜 제한 없음(publishedAt 모르면 null).
- **건축 섹션**: 사용자가 준 archiinside.kr(아키인사이드)은 robots.txt가 자동 수집을 막아 WebFetch로 못 연다(우회 금지). 대신 SPACE(vmspace.com)·건축사신문·월간 디자인 등 국내 매체를 우선하고 Dezeen·ArchDaily로 보완한다. arch는 건축계 소식(공모전·수상·정책·건축가·전시), archproj는 준공·계획 건축 작품 소개(건축가·위치·용도·규모·준공 연도를 `facts`에), interior는 인테리어·공간 디자인·리모델링 사례. 해외는 ArchDaily·Dezeen 등과 섞되 같은 프로젝트 중복 금지, 분양 광고 제외. 작품 소개는 90일 이내 허용.
- **도마뱀 섹션**: 사용자가 크레스티드게코 2마리를 키운다. gecko는 크레스티드게코 사육(먹이·CGD·온습도·사육장·탈피·꼬리·건강·번식·모프), reptile은 다른 도마뱀·파충류 사육 일반·뉴스·제도(야생생물법 등). 수의사·전문 사육 커뮤니티 가이드(ReptiFiles 등)·기사·연구 근거만, 판매 광고·분양 글 제외, 위험한 사육법 권장 X. 사육 가이드는 오래돼도 허용(2년 이내 갱신 우선), 뉴스는 30일. `facts`에 근거(출처 기관·저자)·대상 종.
- **웹툰 섹션**: toon은 웹툰 업계·플랫폼·IP(드라마·영화화)·작가·수상 소식, toonhot은 지금 인기·화제 웹툰 추천(작품·플랫폼·장르·연재 상태, 성인 작품 제외). 학생 섹션 webtoon과 같은 기사 겹치지 않게, 14일 이내 허용(toonhot은 30일).
- 디자인 세분: cardesign(신차·콘셉트카 외관·실내·디자이너, 성능·판매 기사 X), productd(가전·가구·조명·생활용품, 디자인 어워드), brand(리브랜딩·BI/CI·그래픽·타이포·폰트), package(식품·화장품 패키지, 친환경 포장, Pentawards). 이 분류들은 14일 이내 허용. design은 이들과 겹치지 않는 디자인 일반 뉴스(전시·디자이너·업계).
- design은 제품·브랜딩·건축·공간 디자인, uxui는 UX/UI·디자인 툴·디자인 시스템·접근성으로 나눈다.

- 각 카테고리의 대상 사이트·키워드는 `data/sources.json`에 있다. 이 사이트들과 키워드로 WebSearch/WebFetch 해서 최신 기사를 찾는다. 더 좋은 사이트를 찾으면 `sources`에 추가해도 된다.
- WebSearch는 오래된 페이지가 섞이기 쉽다. 대상 사이트의 **최신 기사 목록 페이지를 WebFetch로 직접 열어** 고르는 방식을 우선한다. 한 매체에 몰리지 않게 가능하면 2곳 이상, 한국어 매체도 섞는다.
- 카테고리마다 **최대 20건**, 최근 2일 이내 기사 우선(없으면 7일까지). 기준에 맞는 기사가 모자라면 찾은 만큼만(채우려고 품질을 낮추지 않는다).
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
 "poem":{"title":"","poet":"시인 (생몰년)","text":"줄바꿈 \\n","source":"수록 시집·발표 연도"},
 "art":{"title":"","artist":"","year":"","image":"","page":"","credit":"","description":""}}
```
- 말씀: 저작권 만료된 **개역한글** 본문만, 웹에서 실제 확인한 문장. 최근 30일 안에 쓴 구절 반복 금지(git log로 확인).
- 명언: 출처가 확인되는 실존 인물의 말만.
- 시: 저작권 만료 시인(1962년 이전 사망: 윤동주·김소월·한용운·이육사·이상화·정지용 등)의 시만. 원문을 서로 다른 2곳 이상에서 열어 본문 일치 확인, 한 글자도 지어내지 않기. 계절에 맞는 짧은 시 우선, 최근 30일 반복 금지.
- 그림: 퍼블릭 도메인(CC0)만. **Cleveland Museum of Art Open Access API**(`https://openaccess-api.clevelandart.org/api/artworks/?q=<작가·주제>&has_image=1&cc0=1&type=Painting&limit=10`)에서 고르고 `images.web.url`(openaccess-cdn.clevelandart.org)을 image로, `https://clevelandart.org/art/<accession_number>`를 page로 쓴다. 설명은 API `description` 내용만 근거로. ※ Art Institute of Chicago IIIF 이미지(artic.edu/iiif)는 403으로 막혀 사이트에서 안 보이므로 쓰지 않는다.

## 4. 반영·배포
```bash
python3 scripts/update.py incoming
git add data a reports && git commit -m "daily: YYYY-MM-DD" && git push origin main
```
`update.py`가 `reports/summaryx_report_YYMMDD_v1.md`(카테고리·대상 사이트·키워드 리포트)를 만든다. `/mnt/project-files/`가 있으면 그 리포트를 `/mnt/project-files/summaryx/reports/`에도 복사한다.
`incoming/`은 커밋하지 않는다. 실패한 카테고리가 있으면 커밋 메시지에 적는다.
