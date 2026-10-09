(function () {
  'use strict';

  // 뉴스 사이트식 섹션 → 세부 분류(수집은 세부 분류 단위)
  var SECTIONS = [
    { id: 'all', name: '전체', cats: [] },
    { id: 'ai', name: 'AI', cats: [['ai', 'AI'], ['ax', 'AX'], ['robot', '로봇'], ['paper', '논문'], ['aicert', '자격증']] },
    { id: 'tech', name: 'IT·테크', cats: [['it', 'IT'], ['applesamsung', '애플·삼성'], ['car', '자동차'], ['semi', '반도체'], ['security', '보안']] },
    { id: 'world', name: '세계', cats: [['worldus','미국·미주'],['worldasia','아시아'],['worldeu','유럽·러시아'],['worldmea','중동·아프리카']] },
    { id: 'culture', name: '문화', cats: [['movie', '영화'], ['music', '음악'], ['art', '미술'], ['book', '책'], ['show', '공연·전시']] },
    { id: 'design', name: '디자인', cats: [['design', '디자인 뉴스'], ['cardesign', '자동차'], ['productd', '제품·산업'], ['brand', '브랜딩·그래픽'], ['package', '패키지'], ['uxui', 'UX/UI']] },
    { id: 'life', name: '라이프', cats: [['fashion', '패션'], ['food', '푸드'], ['travel', '여행'], ['health', '건강']] },
    { id: 'wine', name: '와인', cats: [['wine', '업계 뉴스'], ['winepick', '추천·리뷰'], ['wineregion', '산지·빈티지'], ['winepair', '페어링'], ['winestudy', '와인 상식'], ['winetype', '세계 인기 와인'], ['winery', '와이너리'], ['cellar', '셀러·보관'], ['winedeal', '할인 정보'], ['wineko', '국내 와인']] },
    { id: 'eat', name: '맛집·맛도리', cats: [['eatseoul','서울 맛집'],['eatgg','경기 맛집'],['eatdj','대전 맛집'],['eatsj','세종 맛집'],['worldfood','세계 맛도리'],['seasonal','제철 음식']] },
    { id: 'shop', name: '쇼핑', cats: [['shopguide','믿을 만한 쇼핑몰'],['shopmen','남성 의류'],['shopdeal','할인 행사']] },
    { id: 'care', name: '건강', cats: [['bp','고혈압'],['dm','당뇨'],['lipid','고지혈증·심혈관']] },
    { id: 'trip', name: '여행지', cats: [['tripko','국내 여행지'],['tripworld','해외 여행지']] },
    { id: 'karrot', name: '당근·중고', cats: [['usedwear','중고 의류 소식']] },
    { id: 'poetry', name: '시', cats: [['poemdaily','오늘의 명시'],['poemread','명시 감상'],['poemnews','시 소식·시집']] },
    { id: 'luxury', name: '명품', cats: [['luxprice','가격대별 제품'],['lux1','하이엔드'],['lux2','럭셔리'],['lux3','프리미엄·컨템포러리'],['luxwatch','워치·주얼리']] },
    { id: 'brands', name: '브랜드', cats: [['bfashion','패션·럭셔리'],['bcar','자동차'],['btech','IT·전자'],['bfood','식음료'],['bbeauty','뷰티·생활']] },
    { id: 'cook', name: '레시피', cats: [['recipe','한 그릇·메인'],['recipeside','반찬·국'],['recipesnack','간식·브런치']] },
    { id: 'archi', name: '건축', cats: [['arch','건축 소식'],['archproj','작품·프로젝트'],['interior','인테리어·공간']] },
    { id: 'pet', name: '도마뱀', cats: [['gecko','크레스티드게코'],['reptile','도마뱀 키우기']] },
    { id: 'toon', name: '웹툰', cats: [['toon','웹툰 소식'],['toonhot','인기·추천']] },
    { id: 'teen', name: '학생', cats: [['game', '게임'], ['webtoon', '웹툰·애니'], ['sports', '스포츠'], ['science', '과학'], ['edu', '교육·진로']] },
    { id: 'ent', name: '연예·트렌드', cats: [['ent', '연예'], ['kpop', 'K-POP'], ['shorts', '쇼츠'], ['meme', '밈']] },
    { id: 'bid', name: '나라장터', cats: [['g2b', '나라장터']] },
    { id: 'faith', name: '종교', cats: [['christian', '기독교'], ['ccm', 'CCM']] }
  ];
  var CAT_NAME = {}, CAT_SEC = {}, SEC = {};
  SECTIONS.forEach(function (sec) {
    SEC[sec.id] = sec;
    sec.cats.forEach(function (c) { CAT_NAME[c[0]] = c[1]; CAT_SEC[c[0]] = sec.id; });
  });
  function secHref(id) { return id === 'all' ? '#/' : '#/s/' + id; }

  var state = { articles: [], daily: null, updatedAt: null, byId: {} };
  var $app = document.getElementById('app');
  // PC(넓은 화면)는 좌측 목록 + 우측 상세. 좁은 화면은 $list·$det 모두 $app
  var WIDE = window.matchMedia('(min-width: 1100px)');
  var PC = window.matchMedia('(min-width: 900px)');
  var $list = $app, $det = $app;
  function layout() {
    if (WIDE.matches) {
      if (!document.getElementById('lp')) {
        $app.innerHTML = '<div class="split"><section class="pane lp" id="lp"></section><section class="pane rp" id="rp"></section></div>';
        state.leftHref = null;
      }
      $list = document.getElementById('lp'); $det = document.getElementById('rp');
    } else {
      if (document.getElementById('lp')) $app.innerHTML = '';
      $list = $det = $app;
    }
  }
  var $chips = document.getElementById('chips');

  // ---- storage (localStorage, 실패해도 동작) ----
  function load(key, def) {
    try { var v = localStorage.getItem('sx:' + key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem('sx:' + key, JSON.stringify(val)); } catch (e) {}
  }
  var votes = load('votes', {});         // id -> 1 | -1
  var bookmarks = load('bookmarks', {}); // id -> article snapshot

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) {
    if (!d) return '';
    var p = d.split('-');
    return p.length === 3 ? (+p[1]) + '월 ' + (+p[2]) + '일' : d;
  }
  function pubHtml(a) {
    var d = a.publishedAt && a.publishedAt.slice(0, 10).split('-');
    return '<span class="pub">' + (d && d.length === 3 ? d.join('.') + ' 게시' : '게시일 미확인') + '</span>';
  }
  function fact(a, k) {
    var f = (a.facts || []).filter(function (x) { return x[0] === k; })[0];
    return f ? f[1] : '';
  }
  function bidClosed(a) {
    var m = String(fact(a, '입찰 마감')).match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return false; // 마감일을 모르면 숨기지 않는다
    // 공고 시각은 한국 시간(UTC+9). 시각이 없으면 그날 23:59까지 유효
    var end = Date.UTC(+m[1], m[2] - 1, +m[3], m[4] ? +m[4] - 9 : 14, m[4] ? +m[5] : 59, m[4] ? 0 : 59);
    return end < Date.now();
  }
  // 나라장터 사업예산(원). 모르면 null
  function bidAmt(a) {
    var m = String(fact(a, '사업예산')).replace(/,/g, '').match(/\d{5,}/);
    return m ? +m[0] : null;
  }
  // 나라장터 목록: 발주처·금액·기간을 크게
  function won(v) {
    var m = String(v || '').replace(/,/g, '').match(/\d{5,}/);
    if (!m) return v ? String(v).split('/')[0].trim() : '';
    var n = +m[0], eok = Math.floor(n / 1e8), man = Math.round((n % 1e8) / 1e4);
    return (eok ? eok + '억' + (man ? ' ' : '') : '') + (man ? man.toLocaleString('ko-KR') + '만' : '') + '원';
  }
  function bidHtml(a) {
    var org = fact(a, '발주기관').replace(/\s*\(.*\)\s*$/, '') || a.source;
    var per = fact(a, '사업기간');
    per = !per || per.indexOf('확인 필요') >= 0 ? '확인 필요' : per.split(/[,(]/)[0].trim();
    var due = fact(a, '입찰 마감');
    return '<div class="bid"><div><small>발주처</small><b>' + esc(org) + '</b></div>' +
      '<div><small>금액</small><b>' + esc(won(fact(a, '사업예산')) || '확인 필요') + '</b></div>' +
      '<div><small>기간</small><b' + (per === '확인 필요' ? ' class="na"' : '') + '>' + esc(per) + '</b></div></div>' +
      (due ? '<div class="due">입찰 마감 ' + esc(due) + '</div>' : '');
  }
  // 맛집: 목록 카드마다 선정 근거, 목록 위에 분류별 선정 기준
  var EAT = { eatseoul: 1, eatgg: 1, eatdj: 1, eatsj: 1 };
  var EAT_RULE = '검색·웨이팅이 많은 인기 식당 중 미쉐린 가이드(빕 구르망·셀렉션), 블루리본, 지자체 공식 지정(서울미식 100선·수원맛집 100선·세종사랑 맛집 등), 웨이팅·검색 순위 기사로 근거가 확인된 곳만 싣습니다. 광고·체험단·협찬 글은 제외하고, 카드마다 실제 선정 근거를 적습니다.';
  function eatHtml(a) {
    var r = fact(a, '근거') || fact(a, '선정 근거');
    return r ? '<div class="pick"><small>선정 기준</small>' + esc(r.length > 70 ? r.slice(0, 70) + '…' : r) + '</div>' : '';
  }
  // 당근마켓은 수집이 막혀 있어(robots.txt) 매물은 검색 바로가기로만 연결한다
  var KARROT = ['남성 아우터', '남성 패딩', '남성 니트', '남성 셔츠', '남성 청바지', '남성 정장', '남성 스니커즈', '남성 가방', '나이키', '폴로 랄프로렌', '파타고니아', '노스페이스'];
  function karrotHtml() {
    return '<div class="rule"><b>당근 바로가기</b> 누르면 당근마켓에서 내 동네 매물 검색 결과가 열려요(당근은 자동 수집을 막고 있어 매물은 여기에 직접 싣지 않아요).' +
      '<div class="kchips">' + KARROT.map(function (q) {
        return '<a class="sub" href="https://www.daangn.com/kr/buy-sell/?search=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + esc(q) + '</a>';
      }).join('') + '</div></div>';
  }
  // 아키인사이드는 robots.txt로 수집이 막혀 있어 본문 요약 없이 검색에 나온 제목·원문 링크만 보여준다
  var archLinks = null;
  function archHtml() {
    if (!archLinks || !(archLinks.items || []).length) return '';
    return '<div class="rule"><b>아키인사이드 새 글</b> 이 매체는 자동 수집을 막고 있어 요약 없이 제목만 모았어요. 누르면 원문이 열려요.' +
      '<ul class="alinks">' + archLinks.items.slice(0, 10).map(function (x) {
        return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a></li>';
      }).join('') + '</ul></div>';
  }
  // 명품 가격대: 원문에 적힌 국내 판매가 기준. 가격이 없으면 '전체'에만 보인다
  var LUX_BAND = [['', '전체'], ['10', '10만원대'], ['50', '50만원대'], ['100', '100만원 이상']];
  var LUX_LIM = { '10': [1e5, 5e5 - 1], '50': [5e5, 1e6 - 1], '100': [1e6, Infinity] };
  function luxAmt(a) {
    var t = String(fact(a, '가격') || '').replace(/[,\s₩]/g, '');
    var m = t.match(/(\d+(?:\.\d+)?)억(?:(\d+)천)?(?:(\d+)만)?/);
    if (m) return +m[1] * 1e8 + (+m[2] || 0) * 1e7 + (+m[3] || 0) * 1e4;
    m = t.match(/(\d+(?:\.\d+)?)천(\d+)?만/);
    if (m) return +m[1] * 1e7 + (+m[2] || 0) * 1e4;
    m = t.match(/(\d+(?:\.\d+)?)만/);
    if (m) return +m[1] * 1e4;
    m = t.match(/(\d{5,})원?/);
    return m ? +m[1] : null;
  }
  function luxPick(a) {
    var p = fact(a, '가격');
    return p ? '<div class="pick"><small>국내가</small>' + esc(String(p).slice(0, 60)) + (fact(a, '브랜드') ? ' · ' + esc(fact(a, '브랜드')) : '') + '</div>' : '';
  }
  function luxHtml() {
    return '<div class="rule"><b>가격대 기준</b> 기사·공식몰에 적힌 국내 판매가로 나눴어요. 10만원대는 10만~49만원, 50만원대는 50만~99만원, 100만원 이상은 100만원부터예요. 가격이 없는 브랜드 소식은 \'전체\'에만 보여요.</div>';
  }
  // 진입할 때마다 바뀌는 summaryx 캐릭터 30종(자체 제작 SVG). 캐릭터를 누르면 다른 친구로 바뀐다
  var MASCOTS = [
    ['냥이', '#ffb35c', 'cat'], ['토토', '#ffd0dc', 'bunny'], ['곰돌', '#b98256', 'bear'], ['크레', '#e8a25a', 'gecko'],
    ['스티', '#cdb68a', 'gecko'], ['삐약', '#ffe14d', 'chick'], ['펭펭', '#40546b', 'penguin'], ['개굴', '#7cc96a', 'frog'],
    ['부우', '#ecebff', 'ghost'], ['뽀뽀', '#9be3c3', 'alien'], ['삐삐', '#a9bccf', 'robot'], ['싹이', '#a6e07a', 'sprout'],
    ['몽글', '#dcecff', 'cloud'], ['반짝', '#ffd84d', 'star'], ['몽실', '#ffb8a1', 'peach'], ['아보', '#9cc865', 'avocado'],
    ['디노', '#6cc4a1', 'dino'], ['쭈꾸', '#ff8fa3', 'octopus'], ['멍멍', '#e8c39e', 'dog'], ['판판', '#ffffff', 'panda'],
    ['폭스', '#ff8a3d', 'fox'], ['햄찌', '#f3c58f', 'hamster'], ['고래', '#6fa8ff', 'whale'], ['버섯이', '#f26b5b', 'mushroom'],
    ['달님', '#fff0a0', 'moon'], ['말랑', '#c58bff', 'jelly'], ['도니', '#f7c08a', 'donut'], ['꽥꽥', '#ffe680', 'duck'],
    ['몽이', '#f4f1ea', 'sheep'], ['용용', '#ff6f61', 'dragon']
  ];
  var GREET = ['오늘도 좋은 하루 보내요!', '새 소식 따끈하게 모아 왔어요', '커피 한 잔이랑 같이 읽어요', '오늘은 어떤 글이 궁금해요?',
    '천천히 둘러봐요, 다 기다려 줄게요', '퇴근길 심심할 때 딱이에요', '좋아요 눌러 주면 신나요!', '맛집 탭도 꼭 들러 봐요',
    '오늘의 명시 한 편 어때요?', '북마크해 두면 나중에 편해요', '세계 소식도 챙겨 왔어요', '물 한 잔 마시고 시작해요',
    '잠깐 쉬어 가도 괜찮아요', '오늘 레시피로 저녁 해 볼까요?', '반가워요, 또 와 줬네요!', '읽고 싶은 건 검색해 봐요'];
  var mascotIdx = Math.floor(Math.random() * MASCOTS.length), greetIdx = Math.floor(Math.random() * GREET.length);
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  function mascotSvg(m) {
    var col = m[1], k = m[2], dk = shade(col, 0.78), back = '', front = '', body, ink = '#2b2420', eyeY = 44;
    var ear = function (x, y, rx, ry, rot, c) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + rot + ' ' + x + ' ' + y + ')" fill="' + (c || col) + '"/>'; };
    body = '<circle cx="40" cy="46" r="26" fill="' + col + '"/>';
    if (k === 'cat' || k === 'fox') { back = '<path d="M18 34 L22 12 L36 26Z M62 34 L58 12 L44 26Z" fill="' + col + '"/><path d="M22 28 L24 18 L31 25Z M58 28 L56 18 L49 25Z" fill="#ffd9d0"/>';
      if (k === 'fox') front = '<path d="M14 50 Q40 76 66 50 Q60 70 40 72 Q20 70 14 50Z" fill="#fff"/>'; }
    if (k === 'bunny') back = ear(30, 16, 6, 16, -10) + ear(50, 16, 6, 16, 10) + ear(30, 17, 3, 11, -10, '#ffb3c6') + ear(50, 17, 3, 11, 10, '#ffb3c6');
    if (k === 'bear' || k === 'hamster') back = '<circle cx="19" cy="25" r="8" fill="' + col + '"/><circle cx="61" cy="25" r="8" fill="' + col + '"/><circle cx="19" cy="25" r="4" fill="' + dk + '"/><circle cx="61" cy="25" r="4" fill="' + dk + '"/>';
    if (k === 'panda') { back = '<circle cx="19" cy="25" r="8" fill="#2b2b2b"/><circle cx="61" cy="25" r="8" fill="#2b2b2b"/>'; front = '<ellipse cx="30" cy="45" rx="7" ry="8" fill="#2b2b2b"/><ellipse cx="50" cy="45" rx="7" ry="8" fill="#2b2b2b"/>'; }
    if (k === 'dog') front = ear(15, 42, 7, 14, 15, dk) + ear(65, 42, 7, 14, -15, dk);
    if (k === 'gecko') { back = [22, 30, 40, 50, 58].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (i === 2 ? 18 : i % 4 ? 20 : 25) + '" r="3.5" fill="' + dk + '"/>'; }).join(''); body = '<ellipse cx="40" cy="47" rx="29" ry="24" fill="' + col + '"/>'; eyeY = 42;
      front = '<circle cx="27" cy="42" r="7" fill="#f4e04d"/><circle cx="53" cy="42" r="7" fill="#f4e04d"/>'; }
    if (k === 'chick' || k === 'duck') { back = '<path d="M36 20 Q40 10 44 20" stroke="' + dk + '" stroke-width="3" fill="none"/>'; front = '<ellipse cx="40" cy="53" rx="' + (k === 'duck' ? 9 : 5) + '" ry="4" fill="#ff9a3c"/>'; }
    if (k === 'penguin') { front = '<ellipse cx="40" cy="53" rx="17" ry="17" fill="#fff"/><path d="M36 50 L44 50 L40 55Z" fill="#ffb03b"/>'; }
    if (k === 'frog') { back = '<circle cx="26" cy="24" r="10" fill="' + col + '"/><circle cx="54" cy="24" r="10" fill="' + col + '"/>'; eyeY = 24; }
    if (k === 'ghost') body = '<path d="M14 46 Q14 20 40 20 Q66 20 66 46 L66 70 L59 64 L52 70 L45 64 L40 70 L35 64 L28 70 L21 64 L14 70Z" fill="' + col + '"/>';
    if (k === 'alien') back = '<line x1="30" y1="24" x2="24" y2="10" stroke="' + dk + '" stroke-width="2.5"/><line x1="50" y1="24" x2="56" y2="10" stroke="' + dk + '" stroke-width="2.5"/><circle cx="24" cy="10" r="4" fill="#ff6fb1"/><circle cx="56" cy="10" r="4" fill="#ff6fb1"/>';
    if (k === 'robot') { back = '<line x1="40" y1="22" x2="40" y2="10" stroke="' + dk + '" stroke-width="3"/><circle cx="40" cy="9" r="4" fill="#ff5a36"/>'; body = '<rect x="15" y="22" width="50" height="48" rx="12" fill="' + col + '"/><rect x="11" y="38" width="5" height="14" rx="2" fill="' + dk + '"/><rect x="64" y="38" width="5" height="14" rx="2" fill="' + dk + '"/>'; }
    if (k === 'sprout') back = '<path d="M40 22 Q40 14 40 10" stroke="#5aa03c" stroke-width="3"/><ellipse cx="33" cy="11" rx="7" ry="4" fill="#5aa03c" transform="rotate(-25 33 11)"/><ellipse cx="47" cy="11" rx="7" ry="4" fill="#5aa03c" transform="rotate(25 47 11)"/>';
    if (k === 'cloud') body = '<g fill="' + col + '"><circle cx="26" cy="48" r="16"/><circle cx="40" cy="38" r="18"/><circle cx="55" cy="48" r="16"/><rect x="18" y="46" width="44" height="20" rx="10"/></g>';
    if (k === 'star') { body = '<path d="M40 10 L49 32 L72 33 L54 48 L60 71 L40 58 L20 71 L26 48 L8 33 L31 32Z" fill="' + col + '" stroke="' + dk + '" stroke-width="2" stroke-linejoin="round"/>'; eyeY = 42; }
    if (k === 'peach') { back = '<ellipse cx="50" cy="20" rx="9" ry="5" fill="#6cc04a" transform="rotate(-20 50 20)"/>'; front = '<path d="M40 22 Q36 40 40 52" stroke="' + dk + '" stroke-width="1.5" fill="none"/>'; }
    if (k === 'avocado') { body = '<path d="M40 16 Q60 16 64 50 Q64 72 40 72 Q16 72 16 50 Q20 16 40 16Z" fill="' + col + '"/>'; front = '<circle cx="40" cy="58" r="9" fill="#a86a3c"/>'; eyeY = 40; }
    if (k === 'dino' || k === 'dragon') back = (k === 'dino' ? '<path d="M24 26 L28 14 L33 23 L38 11 L43 22 L48 12 L52 24 L57 16 L58 30Z" fill="' + dk + '"/>' : '<path d="M24 26 L18 8 L32 22Z M56 26 L62 8 L48 22Z" fill="#ffd25a"/>');
    if (k === 'octopus') back = [16, 26, 36, 46, 56].map(function (x) { return '<ellipse cx="' + (x + 4) + '" cy="68" rx="5" ry="9" fill="' + dk + '"/>'; }).join('');
    if (k === 'whale') { back = '<path d="M40 20 Q34 8 28 12 M40 20 Q46 8 52 12" stroke="#6fd3ff" stroke-width="3" fill="none"/>'; front = '<path d="M16 54 Q40 74 64 54 Q60 70 40 72 Q20 70 16 54Z" fill="#e9f3ff"/>'; }
    if (k === 'mushroom') { body = '<rect x="24" y="40" width="32" height="30" rx="12" fill="#fff4e4"/>'; back = '<path d="M8 44 Q10 12 40 12 Q70 12 72 44Z" fill="' + col + '"/><circle cx="28" cy="26" r="5" fill="#fff"/><circle cx="50" cy="22" r="4" fill="#fff"/><circle cx="60" cy="36" r="3.5" fill="#fff"/>'; eyeY = 52; }
    if (k === 'moon') front = '<path d="M58 28 Q72 46 58 66 Q66 46 58 28Z" fill="' + dk + '" opacity=".5"/>';
    if (k === 'jelly') body = '<path d="M14 66 Q12 26 40 22 Q68 26 66 66 Q40 72 14 66Z" fill="' + col + '" opacity=".92"/><ellipse cx="30" cy="34" rx="5" ry="3" fill="#fff" opacity=".6"/>';
    if (k === 'donut') back = '<path d="M16 40 Q20 18 40 18 Q60 18 64 40 Q56 34 50 40 Q44 32 38 40 Q30 32 24 40 Q20 34 16 40Z" fill="#ff8fc1"/>';
    if (k === 'sheep') back = [[20, 30], [30, 20], [44, 18], [57, 26], [64, 40], [16, 46], [62, 56], [20, 60]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="10" fill="' + col + '" stroke="#ddd6c8"/>'; }).join('');
    var eyes = '<circle cx="31" cy="' + eyeY + '" r="3.6" fill="' + ink + '"/><circle cx="49" cy="' + eyeY + '" r="3.6" fill="' + ink + '"/><circle cx="32.3" cy="' + (eyeY - 1.3) + '" r="1.2" fill="#fff"/><circle cx="50.3" cy="' + (eyeY - 1.3) + '" r="1.2" fill="#fff"/>';
    var my = k === 'frog' ? 50 : eyeY + 8;
    var face = eyes + '<ellipse cx="24" cy="' + (my - 1) + '" rx="4.5" ry="2.6" fill="#ff8a8a" opacity=".45"/><ellipse cx="56" cy="' + (my - 1) + '" rx="4.5" ry="2.6" fill="#ff8a8a" opacity=".45"/>' +
      (k === 'chick' || k === 'duck' || k === 'penguin' ? '' : '<path d="M36 ' + my + ' Q40 ' + (my + 4) + ' 44 ' + my + '" stroke="' + ink + '" stroke-width="2" fill="none" stroke-linecap="round"/>');
    return '<svg viewBox="0 0 80 80" width="64" height="64" aria-hidden="true">' + back + body + front + face + '</svg>';
  }
  function mascotHtml() {
    var m = MASCOTS[mascotIdx];
    return '<div class="mascot"><button class="mbody" data-mascot aria-label="다른 캐릭터 보기">' + mascotSvg(m) + '</button>' +
      '<div class="mbubble"><b>' + esc(m[0]) + '</b>' + esc(GREET[greetIdx]) + '</div></div>';
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }
  function baseUrl() {
    return location.href.split('#')[0].replace(/index\.html$/, '');
  }
  function shareUrl(id) { return baseUrl() + 'a/' + id + '/'; }

  // ---- data ----
  function fetchJson(p) {
    return fetch(p + '?v=' + Date.now()).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); });
  }
  function addArticles(list) {
    // 나라장터: 입찰 마감이 지난 공고는 숨긴다(접속 시점 기준, 매일 자동 적용)
    list = list.filter(function (a) { return !state.byId[a.id] && (a.category !== 'g2b' || !bidClosed(a)); });
    list.forEach(function (a) { state.byId[a.id] = a; });
    state.articles = state.articles.concat(list).sort(function (a, b) {
      return (b.collectedAt || '').slice(0, 10).localeCompare((a.collectedAt || '').slice(0, 10)) ||
             (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.id.localeCompare(b.id);
    });
  }
  // 첫 화면은 최근 이틀치만, 이전 날짜는 뒤에서 불러와 목록에 붙인다(스크롤 위치 유지)
  function loadOlder(days) {
    if (!days.length) return;
    Promise.all(days.map(function (d) {
      return fetchJson('data/days/' + d + '.json').then(function (r) { return r.articles || []; }).catch(function () { return []; });
    })).then(function (lists) {
      addArticles([].concat.apply([], lists));
      var y = window.scrollY, ly = $list.scrollTop;
      var m = location.hash.match(/^#\/a\/(.+)/);
      if (m) {
        if (WIDE.matches && state.leftHref) { renderList(state.leftHref); markActive(decodeURIComponent(m[1])); }
      } else if (!(document.activeElement && document.activeElement.tagName === 'INPUT')) route();
      window.scrollTo(0, y); $list.scrollTop = ly;
    });
  }
  Promise.all([
    fetchJson('data/articles.json'),
    fetchJson('data/daily.json').catch(function () { return null; }),
    fetchJson('data/archlinks.json').catch(function () { return null; })
  ]).then(function (res) {
    archLinks = res[2];
    addArticles(res[0].articles || []);
    state.updatedAt = res[0].updatedAt;
    state.daily = res[1];
    state.articles.forEach(function (a) { state.byId[a.id] = a; });
    if (state.updatedAt) document.getElementById('updated').textContent = fmtDate(state.updatedAt.slice(0, 10)) + ' 업데이트';
    route();
    loadOlder(res[0].days || []);
  }).catch(function () {
    $app.innerHTML = '<div class="empty">기사를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>';
  });

  // ---- views ----
  // 탭(섹션): 접힘 상태에선 5개만, 화살표로 전체 펼침/접기
  var CHIP_LIMIT = 5;
  var chipsOpen = false;
  // 기사가 하나도 없는 섹션·세부 분류는 숨긴다(새 분류 첫 수집 전 등)
  function hasCat(c) { return state.articles.some(function (a) { return a.category === c; }); }
  function liveSecs() {
    return SECTIONS.filter(function (S) { return S.id === 'all' || S.cats.some(function (c) { return hasCat(c[0]); }); });
  }
  function renderChips(active) {
    $chips.style.display = '';
    var CATS = liveSecs();
    var shown = CATS;
    var pc = PC.matches; // PC는 탭 전체 노출, 펼침/접기 없음
    if (!chipsOpen && !pc) {
      shown = CATS.slice(0, CHIP_LIMIT);
      var idx = -1;
      CATS.forEach(function (c, i) { if (c.id === active) idx = i; });
      if (idx >= CHIP_LIMIT) shown = CATS.slice(0, CHIP_LIMIT - 1).concat([CATS[idx]]);
    }
    $chips.classList.toggle('open', chipsOpen || pc);
    $chips.innerHTML = '<div class="chip-row">' + shown.map(function (c) {
      var href = secHref(c.id);
      return '<a class="chip' + (c.id === active ? ' on' : '') + '" href="' + href + '">' + esc(c.name) + '</a>';
    }).join('') + '</div>' +
      (pc ? '' : '<button class="chip-toggle" type="button" aria-expanded="' + chipsOpen + '" aria-label="' +
      (chipsOpen ? '카테고리 접기' : '카테고리 전체 보기') + '">' +
      '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>');
    if (pc) return;
    if (!chipsOpen) {
      // 한 줄에 다 안 들어가면 뒤쪽(현재 탭 제외)부터 숨긴다
      var row = $chips.querySelector('.chip-row');
      var list = [].slice.call(row.querySelectorAll('.chip:not(.on)')).reverse();
      while (row.scrollWidth > row.clientWidth + 1 && list.length) list.shift().remove();
    }
    $chips.querySelector('.chip-toggle').addEventListener('click', function () {
      chipsOpen = !chipsOpen;
      renderChips(active);
      fitPanes();
    });
  }

  function itemHtml(a) {
    var v = votes[a.id];
    return '<a class="item' + (a.image ? ' has-img' : '') + '" href="#/a/' + esc(a.id) + '">' +
      (a.image ? '<img class="thumb" src="' + esc(a.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-img\');this.remove()">' : '') +
      '<div class="txt"><div class="meta"><span class="tag">' + esc(CAT_NAME[a.category] || a.category) + '</span>' +
      '<span>' + esc(a.source) + '</span>' + pubHtml(a) + '</div>' +
      (a.category === 'g2b' ? bidHtml(a) : EAT[a.category] ? eatHtml(a) : a.category === 'luxprice' ? luxPick(a) : '') +
      '<h3>' + esc(a.title) + '</h3>' +
      '<p>' + esc((a.summary || [])[0]) + '</p>' +
      ((v || bookmarks[a.id]) ? '<div class="mini">' +
        (v === 1 ? '<span>👍 좋아요</span>' : v === -1 ? '<span>👎 싫어요</span>' : '') +
        (bookmarks[a.id] ? '<span>🔖 저장됨</span>' : '') + '</div>' : '') +
      '</div></a>';
  }

  function listHtml(arr) {
    if (!arr.length) return '<div class="empty">아직 기사가 없어요.</div>';
    var out = [], last = null;
    arr.forEach(function (a) {
      var d = (a.collectedAt || '').slice(0, 10);
      if (d !== last) { out.push('<div class="day">' + (d ? fmtDate(d) + ' 수집' : '') + '</div>'); last = d; }
      out.push(itemHtml(a));
    });
    return '<div class="list">' + out.join('') + '</div>';
  }

  function todayHtml() {
    var d = state.daily;
    if (!d) return '';
    var cards = [];
    if (d.verse) cards.push('<div class="tcard"><span class="lbl">오늘의 말씀</span>' +
      '<div class="big">' + esc(d.verse.text) + '</div>' +
      '<div class="mut">' + esc(d.verse.ref) + (d.verse.version ? ' · ' + esc(d.verse.version) : '') + '</div></div>');
    if (d.english) cards.push('<div class="tcard"><span class="lbl">오늘의 영어</span>' +
      '<div class="big">' + esc(d.english.expression) + '</div>' +
      '<div>' + esc(d.english.meaning) + '</div>' +
      '<div class="mut">' + esc(d.english.example) + '<br>' + esc(d.english.exampleKo) + '</div>' +
      (d.english.tip ? '<div class="mut">' + esc(d.english.tip) + '</div>' : '') + '</div>');
    if (d.quote) cards.push('<div class="tcard"><span class="lbl">오늘의 명언</span>' +
      '<div class="big">“' + esc(d.quote.text) + '”</div>' +
      (d.quote.original ? '<div class="mut">' + esc(d.quote.original) + '</div>' : '') +
      '<div class="mut">— ' + esc(d.quote.author) + '</div></div>');
    if (d.poem) cards.push('<div class="tcard poem"><span class="lbl">오늘의 시</span>' +
      '<div class="big">' + esc(d.poem.title) + ' <small>' + esc(d.poem.poet) + '</small></div>' +
      '<div class="ptext">' + esc(d.poem.text).replace(/\n/g, '<br>') + '</div>' +
      (d.poem.source ? '<div class="mut" style="font-size:11px">' + esc(d.poem.source) + '</div>' : '') + '</div>');
    if (d.art) cards.push('<a class="tcard art" href="' + esc(d.art.page || d.art.image) + '" target="_blank" rel="noopener">' +
      '<img src="' + esc(d.art.image) + '" alt="' + esc(d.art.title) + '" referrerpolicy="no-referrer" onerror="this.remove()">' +
      '<div class="in"><span class="lbl">오늘의 그림</span>' +
      '<div class="big">' + esc(d.art.title) + '</div>' +
      '<div class="mut">' + esc(d.art.artist) + (d.art.year ? ', ' + esc(d.art.year) : '') + '</div>' +
      (d.art.description ? '<div class="mut">' + esc(d.art.description) + '</div>' : '') +
      (d.art.credit ? '<div class="mut" style="font-size:11px">' + esc(d.art.credit) + '</div>' : '') +
      '</div></a>');
    return '<div class="sec-title">오늘<small>' + fmtDate(d.date) + '</small></div><div class="today">' + cards.join('') + '</div>';
  }

  // 상세 하단 이전글/다음글은 마지막으로 본 목록 순서를 따른다
  function setCtx(arr, href) {
    state.ctx = { ids: arr.map(function (a) { return a.id; }), href: href };
  }
  function ctxFor(a) {
    var c = state.ctx;
    if (c && c.ids.indexOf(a.id) >= 0) return c;
    var arr = state.articles.filter(function (x) { return x.category === a.category; });
    return { ids: arr.map(function (x) { return x.id; }), href: '#/c/' + a.category };
  }
  function navHtml(a) {
    var c = ctxFor(a), i = c.ids.indexOf(a.id);
    var prev = i > 0 ? state.byId[c.ids[i - 1]] || bookmarks[c.ids[i - 1]] : null;
    var next = i >= 0 && i < c.ids.length - 1 ? state.byId[c.ids[i + 1]] || bookmarks[c.ids[i + 1]] : null;
    function side(x, cls, label) {
      return x ? '<a class="nav-btn ' + cls + '" href="#/a/' + esc(x.id) + '"><small>' + label + '</small><span>' + esc(x.title) + '</span></a>'
               : '<span class="nav-btn ' + cls + ' off"><small>' + label + '</small><span>' + (cls === 'prev' ? '첫 글이에요' : '마지막 글이에요') + '</span></span>';
    }
    return '<nav class="artnav">' + side(prev, 'prev', '‹ 이전글') +
      '<a class="nav-list" href="' + c.href + '">목록</a>' + side(next, 'next', '다음글 ›') + '</nav>';
  }

  // sec: 섹션 id, cat: 세부 분류(없으면 섹션 전체)
  // amt: 나라장터 금액 구분('s' 1억 이하, 'l' 1억 초과, '5' 5억 이상, '10' 10억 이상)
  function home(sec, cat, amt) {
    renderChips(sec);
    var S = SEC[sec], ids = S.cats.map(function (c) { return c[0]; });
    var arr = sec === 'all' ? state.articles : state.articles.filter(function (a) {
      return cat ? a.category === cat : ids.indexOf(a.category) >= 0;
    });
    if (sec === 'bid' && amt) arr = arr.filter(function (a) {
      var n = bidAmt(a);
      var lim = { s: [0, 1e8], l: [1e8 + 1, Infinity], '5': [5e8, Infinity], '10': [1e9, Infinity] }[amt];
      return n !== null && n >= lim[0] && n <= lim[1];
    });
    if (sec === 'luxury' && amt) arr = arr.filter(function (a) {
      var n = a.category === 'luxprice' ? luxAmt(a) : null, lim = LUX_LIM[amt];
      return n !== null && n >= lim[0] && n <= lim[1];
    });
    var href = cat ? '#/c/' + cat : secHref(sec) + ((sec === 'bid' || sec === 'luxury') && amt ? '/' + amt : '');
    setCtx(arr, href);
    var subs = sec === 'bid' ? '<div class="subs">' + [['', '전체'], ['s', '1억 이하'], ['l', '1억 이상'], ['5', '5억 이상'], ['10', '10억 이상']].map(function (o) {
        return '<a class="sub' + ((amt || '') === o[0] ? ' on' : '') + '" href="#/s/bid' + (o[0] ? '/' + o[0] : '') + '">' + o[1] + '</a>';
      }).join('') + '</div>' : sec === 'luxury' ? '<div class="subs">' + LUX_BAND.map(function (o) {
        return '<a class="sub' + ((amt || '') === o[0] ? ' on' : '') + '" href="#/s/luxury' + (o[0] ? '/' + o[0] : '') + '">' + o[1] + '</a>';
      }).join('') + '</div>' : S.cats.length > 1 ? '<div class="subs"><a class="sub' + (cat ? '' : ' on') + '" href="' + secHref(sec) + '">전체</a>' +
      S.cats.filter(function (c) { return hasCat(c[0]) || c[0] === cat; }).map(function (c) {
        return '<a class="sub' + (c[0] === cat ? ' on' : '') + '" href="#/c/' + c[0] + '">' + esc(c[1]) + '</a>';
      }).join('') + '</div>' : '';
    $list.innerHTML = (sec === 'all' ? mascotHtml() + todayHtml() : '') +
      '<div class="sec-title">' + (sec === 'all' ? '최신 기사' : esc(S.name)) +
      '<small>' + arr.length + '건</small></div>' + subs +
      (sec === 'karrot' ? karrotHtml() : '') + (sec === 'luxury' ? luxHtml() : '') + ((sec === 'archi' && !cat) ? archHtml() : '') + ((sec === 'eat' && (!cat || EAT[cat])) ? '<div class="rule"><b>맛집 선정 기준</b> ' + EAT_RULE + '</div>' : '') + listHtml(arr);
  }

  function bookmarksView() {
    renderChips(null);
    var arr = Object.keys(bookmarks).map(function (k) { return bookmarks[k]; })
      .sort(function (a, b) { return (b._savedAt || 0) - (a._savedAt || 0); });
    setCtx(arr, '#/bookmarks');
    $list.innerHTML = '<div class="sec-title">북마크<small>' + arr.length + '건</small></div>' +
      (arr.length ? '<div class="list">' + arr.map(itemHtml).join('') + '</div>'
                  : '<div class="empty">기사 상세에서 🔖 를 누르면 여기에 저장돼요.</div>');
  }

  // ---- 즐겨찾기(내가 저장한 링크) ----
  // 이 브라우저에만 저장된다. 썸네일·제목·요약은 microlink(무료 공개 API)로 원문 페이지의 미리보기 정보를 가져온다
  var links = load('links', []); // [{url, title, desc, image, site, addedAt}]
  function linkMeta(L) {
    L.loading = true;
    return fetch('https://api.microlink.io/?url=' + encodeURIComponent(L.url)).then(function (r) { return r.json(); })
      .then(function (j) {
        var d = j && j.status === 'success' ? j.data : null;
        if (d) {
          L.title = d.title || L.title; L.desc = d.description || L.desc;
          L.image = (d.image && d.image.url) || (d.logo && d.logo.url) || L.image; L.site = d.publisher || L.site;
        }
      }).catch(function () {}).then(function () {
        L.loading = false; L.tried = true; save('links', links);
        if (location.hash.indexOf('#/links') === 0) linksView();
      });
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  // 출처 정리: 분류별로 글을 가져온 사이트(최근 14일, update.py가 data/source_index.json 생성)
  var srcIdx = null;
  function sourcesView() {
    renderChips(null);
    if (!srcIdx) {
      $list.innerHTML = '<div class="sec-title">출처 정리</div><div class="empty">불러오는 중…</div>';
      fetchJson('data/source_index.json').then(function (d) { srcIdx = d; if (location.hash.indexOf('#/sources') === 0) sourcesView(); })
        .catch(function () { $list.innerHTML = '<div class="sec-title">출처 정리</div><div class="empty">출처 정보를 불러오지 못했어요.</div>'; });
      return;
    }
    var total = 0, doms = {};
    var body = SECTIONS.filter(function (S) { return S.id !== 'all'; }).map(function (S) {
      var cats = S.cats.filter(function (c) { return (srcIdx.cats[c[0]] || []).length; });
      if (!cats.length) return '';
      return '<details class="srcsec"><summary>' + esc(S.name) + '<small>' + cats.length + '개 분류</small></summary>' +
        cats.map(function (c) {
          var rows = srcIdx.cats[c[0]];
          return '<div class="srccat"><h4>' + esc(c[1]) + '<small>' + rows.length + '곳</small></h4>' + rows.map(function (r) {
            total += r.count; doms[r.domain] = 1;
            var feat = [r.lang === 'ko' ? '국내 매체' : '해외 매체', '최근 14일 ' + r.count + '건', '마지막 수집 ' + fmtDate(r.last)];
            return '<div class="src"><div class="src-h"><a href="' + esc(r.home) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a>' +
              '<span class="dom">' + esc(r.domain) + '</span></div>' +
              '<div class="src-f">' + esc(feat.join(' · ')) + (r.keywords && r.keywords.length ? '<br>주로 찾는 주제: ' + esc(r.keywords.join(', ')) : '') + '</div>' +
              '<ul>' + r.recent.map(function (x) { return '<li><a href="#/a/' + esc(x.id) + '">' + esc(x.title) + '</a></li>'; }).join('') + '</ul></div>';
          }).join('') + '</div>';
        }).join('') + '</details>';
    }).join('');
    $list.innerHTML = '<div class="sec-title">출처 정리<small>' + Object.keys(doms).length + '곳</small></div>' +
      '<div class="rule">최근 14일 동안 각 분류의 글을 가져온 사이트예요. 사이트 이름을 누르면 해당 사이트로, 아래 제목을 누르면 요약 글로 이동해요.</div>' + body;
  }

  function linksView() {
    renderChips(null);
    var html = '<div class="sec-title">즐겨찾기<small>' + links.length + '건</small></div>' +
      '<form class="lform"><input type="url" name="u" placeholder="https:// 주소를 붙여 넣으세요" required>' +
      '<button type="submit">저장</button></form>';
    html += links.length ? '<div class="list">' + links.map(function (L, i) {
      return '<div class="item link' + (L.image ? ' has-img' : '') + '">' +
        (L.image ? '<img class="thumb" src="' + esc(L.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-img\');this.remove()">' : '') +
        '<div class="txt"><div class="meta"><span class="tag">' + esc(L.site || host(L.url)) + '</span>' +
        '<span class="pub">' + esc(new Date(L.addedAt).toLocaleDateString('ko-KR')) + ' 저장</span></div>' +
        '<h3><a href="' + esc(L.url) + '" target="_blank" rel="noopener">' + esc(L.title || host(L.url)) + '</a></h3>' +
        '<p>' + (L.loading ? '미리보기를 불러오는 중…' : esc(L.desc || '요약 정보가 없는 페이지예요.')) + '</p>' +
        '<div class="lact"><button data-i="' + i + '" data-a="share">공유</button>' +
        '<a href="' + esc(L.url) + '" target="_blank" rel="noopener">열기</a>' +
        (L.tried && !L.title ? '<button data-i="' + i + '" data-a="retry">다시 불러오기</button>' : '') +
        '<button data-i="' + i + '" data-a="del">삭제</button></div></div></div>';
    }).join('') + '</div>' : '<div class="empty">자주 보는 사이트나 글 주소를 저장해 두세요.<br>썸네일과 요약을 자동으로 가져와요.</div>';
    $list.innerHTML = html;
    $list.querySelector('.lform').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = this.u.value.trim();
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      if (links.some(function (L) { return L.url === u; })) { toast('이미 저장된 주소예요'); return; }
      var L = { url: u, addedAt: Date.now() };
      links.unshift(L); save('links', links); linksView(); linkMeta(L);
    });
    $list.querySelectorAll('.lact button').forEach(function (b) {
      b.addEventListener('click', function () {
        var L = links[+b.getAttribute('data-i')], a = b.getAttribute('data-a');
        if (a === 'del') { links.splice(links.indexOf(L), 1); save('links', links); linksView(); toast('삭제했어요'); }
        else if (a === 'retry') { linkMeta(L); linksView(); }
        else shareLink(L.title || host(L.url), L.url);
      });
    });
  }

  // ---- 검색 ----
  var searches = load('searches', []); // 최근 검색어(최신순)
  var STOP = ' 공개 출시 시작 만에 추진 올해 2026 2027 2027년 10월 11월 12월 9월 동시 도입 조건 마지막 세계 돌파 추가 기반 최초 개막 한국 만든 다시 만의 이상 앞두고 지원 진출 반등 위해 위한 이후 첫 관련 통해 발표 공식 사상 새로운 가장 역대 확인 기록 계획 예정 1위 처음 대해 분기 함께 따라 넘어 이유 중인 이번 ';
  function suggest() {
    // 최근 3일 기사 제목에서 자주 나온 단어
    var days = [], cnt = {}, seen = {};
    state.articles.forEach(function (a) { var d = (a.collectedAt || '').slice(0, 10); if (days.indexOf(d) < 0) days.push(d); });
    days = days.slice(0, 3);
    state.articles.forEach(function (a) {
      if (days.indexOf((a.collectedAt || '').slice(0, 10)) < 0) return;
      var ws = {};
      (a.title.match(/[가-힣A-Za-z][가-힣A-Za-z0-9·\-]{1,}/g) || []).forEach(function (w) { ws[w] = 1; });
      Object.keys(ws).forEach(function (w) { if (STOP.indexOf(' ' + w + ' ') < 0) cnt[w] = (cnt[w] || 0) + 1; });
    });
    return Object.keys(cnt).filter(function (w) { return cnt[w] >= 2; })
      .sort(function (x, y) { return cnt[y] - cnt[x] || x.localeCompare(y); })
      .filter(function (w) { var k = w.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; })
      .slice(0, 12);
  }
  function badge(q, cls) {
    return '<a class="badge' + (cls ? ' ' + cls : '') + '" href="#/search/' + encodeURIComponent(q) + '">' + esc(q) + '</a>';
  }
  function searchView(q) {
    $chips.style.display = 'none';
    q = (q || '').trim();
    if (q) {
      searches = [q].concat(searches.filter(function (x) { return x !== q; })).slice(0, 12);
      save('searches', searches);
    }
    var html = '<form class="sbox" id="sform"><input id="sq" type="search" enterkeyhint="search" placeholder="기사 제목·내용·매체 검색" value="' + esc(q) + '" autocomplete="off">' +
      '<button type="submit" aria-label="검색">검색</button></form>';
    if (searches.length) html += '<div class="sh"><b>최근 검색어</b><button type="button" id="sclear">전체 삭제</button></div><div class="badges">' +
      searches.map(function (x) {
        return '<span class="badge recent' + (x === q ? ' on' : '') + '"><a href="#/search/' + encodeURIComponent(x) + '">' + esc(x) + '</a>' +
          '<button type="button" data-del="' + esc(x) + '" aria-label="' + esc(x) + ' 삭제">×</button></span>';
      }).join('') + '</div>';
    var sg = suggest();
    if (sg.length) html += '<div class="sh"><b>추천 키워드</b><small>최근 기사에서 많이 나온 말</small></div><div class="badges">' +
      sg.map(function (x) { return badge(x, x === q ? 'on' : ''); }).join('') + '</div>';
    if (q) {
      var terms = q.toLowerCase().split(/\s+/);
      var res = state.articles.filter(function (a) {
        var t = [a.title, a.originalTitle, a.source, (a.summary || []).join(' '), (a.keyPoints || []).join(' '), (a.ingredients || []).join(' '), (a.requirements || []).join(' '), (a.facts || []).map(function (f) { return f.join(' '); }).join(' '), CAT_NAME[a.category]].join(' ').toLowerCase();
        return terms.every(function (w) {
          // 짧은 영문(AI, IT 등)은 단어 단위로만 (said·Spain 같은 오탐 방지)
          return /^[a-z0-9]{1,3}$/.test(w) ? new RegExp('(^|[^a-z0-9])' + w + '([^a-z0-9]|$)').test(t) : t.indexOf(w) >= 0;
        });
      });
      // 결과는 섹션·세부 분류 순서대로 묶는다
      var order = [];
      SECTIONS.forEach(function (S) { S.cats.forEach(function (c) { order.push(c[0]); }); });
      var groups = order.map(function (c) { return { c: c, items: res.filter(function (a) { return a.category === c; }) }; })
        .filter(function (g) { return g.items.length; });
      var flat = [];
      groups.forEach(function (g) { flat = flat.concat(g.items); });
      setCtx(flat, '#/search/' + encodeURIComponent(q));
      html += '<div class="sec-title">‘' + esc(q) + '’ 검색 결과<small>' + res.length + '건</small></div>';
      if (!res.length) html += '<div class="empty">검색 결과가 없어요. 다른 단어로 찾아보세요.</div>';
      else {
        html += '<div class="badges jump">' + groups.map(function (g) {
          return '<a class="badge" href="#" data-jump="' + g.c + '">' + esc(CAT_NAME[g.c]) + ' <b>' + g.items.length + '</b></a>';
        }).join('') + '</div>';
        html += groups.map(function (g) {
          return '<div class="rgroup" id="g-' + g.c + '"><div class="day">' + esc(SEC[CAT_SEC[g.c]].name + ' › ' + CAT_NAME[g.c]) + ' · ' + g.items.length + '건</div>' +
            '<div class="list">' + g.items.map(itemHtml).join('') + '</div></div>';
        }).join('');
      }
    }
    $list.innerHTML = '<div class="search">' + html + '</div>';
    var $q = document.getElementById('sq');
    document.getElementById('sform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $q.value.trim();
      if (v) location.hash = '#/search/' + encodeURIComponent(v);
      $q.blur();
    });
    if (!q) $q.focus();
    var clr = document.getElementById('sclear');
    if (clr) clr.addEventListener('click', function () { searches = []; save('searches', searches); searchView(q); });
    $list.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var x = b.getAttribute('data-del');
        searches = searches.filter(function (y) { return y !== x; }); save('searches', searches);
        searchView(q === x ? '' : q);
      });
    });
    $list.querySelectorAll('[data-jump]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.getElementById('g-' + b.getAttribute('data-jump'));
        if (!el) return;
        if (WIDE.matches) $list.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
        else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
      });
    });
  }

  var ICON = {
    up: '<svg viewBox="0 0 24 24"><path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17"/></svg>',
    mark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5M5 13v7h14v-7"/></svg>'
  };

  function detail(id) {
    var a = state.byId[id] || bookmarks[id];
    if (!WIDE.matches) $chips.style.display = 'none';
    if (!a) {
      // 목록 보관 기간이 지난 기사는 개별 파일에서 불러온다 (공유 링크용)
      if (!detail._tried) {
        detail._tried = id;
        $det.innerHTML = '<div class="empty">불러오는 중…</div>';
        fetchJson('data/items/' + encodeURIComponent(id) + '.json').then(function (it) {
          state.byId[it.id] = it; detail(id);
        }).catch(function () { detail(id); });
        return;
      }
      detail._tried = null;
      $det.innerHTML = '<div class="empty">기사를 찾을 수 없어요.<br><br><a href="#/">홈으로</a></div>';
      return;
    }
    detail._tried = null;
    if (a.slim) {
      // 목록 파일에는 요약 첫 문단만 있다. 전체 본문은 개별 파일에서
      $det.innerHTML = '<div class="empty">불러오는 중…</div>';
      fetchJson('data/items/' + encodeURIComponent(id) + '.json').then(function (it) {
        state.byId[it.id] = it;
        if (bookmarks[id]) { it._savedAt = bookmarks[id]._savedAt; bookmarks[id] = it; save('bookmarks', bookmarks); }
      }).catch(function () { a.slim = false; }).then(function () {
        if (decodeURIComponent(location.hash) === '#/a/' + id) detail(id);
      });
      return;
    }
    var v = votes[id];
    var isVideo = /^[A-Za-z0-9_-]{11}$/.test(a.videoId || '');
    var isRecipe = /^recipe/.test(a.category);
    $det.innerHTML = '<article class="detail">' +
      '<a class="back" href="' + ctxFor(a).href + '">‹ 목록</a>' +
      '<div class="meta"><span class="tag">' + esc(CAT_NAME[a.category] || a.category) + '</span>' +
      '<span>' + esc(a.source) + '</span>' + pubHtml(a) + '</div>' +
      '<h1>' + esc(a.title) + '</h1>' +
      (isRecipe && a.image ? '<img class="hero" src="' + esc(a.image) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      (isVideo ? '<div class="video' + (isRecipe ? ' wide' : '') + '"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(a.videoId) +
        '?playsinline=1&rel=0" title="' + esc(a.title) + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
        : a.image && !isRecipe ? '<img class="hero" src="' + esc(a.image) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      (a.originalTitle && a.originalTitle !== a.title ? '<p class="orig">' + esc(a.originalTitle) + '</p>' : '') +
      (a.keyPoints && a.keyPoints.length ? '<div class="points"><b>핵심 요약</b><ul>' +
        a.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      (a.facts && a.facts.length ? '<table class="facts">' + a.facts.map(function (f) {
        return '<tr><th>' + esc(f[0]) + '</th><td>' + (/^https?:\/\//.test(f[1] || '') ? '<a href="' + esc(f[1]) + '" target="_blank" rel="noopener">' + esc(f[1]) + '</a>' : esc(f[1])) + '</td></tr>';
      }).join('') + '</table>' : '') +
      (a.poemText ? '<div class="poemtxt">' + esc(a.poemText).replace(/\n/g, '<br>') + '</div>' : '') +
      (a.ingredients && a.ingredients.length ? '<div class="points"><b>재료</b><ul>' +
        a.ingredients.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      (a.steps && a.steps.length ? '<div class="points steps"><b>만드는 법</b><ol>' +
        a.steps.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ol></div>' : '') +
      (a.requirements && a.requirements.length ? '<div class="points reqs"><b>제안 요건</b><ul>' +
        a.requirements.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      (a.fit ? '<p class="fit"><b>에이전시 관점</b> ' + esc(a.fit) + '</p>' : '') +
      '<div class="body">' + (a.summary || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<p class="note">' + (isRecipe ? '레시피는 원문과 영상을 바탕으로 AI가 정리한 내용입니다. 분량·시간은 원문을 확인해 주세요.' : isVideo ? '영상 소개는 AI가 정리한 내용입니다. 정확한 내용은 영상을 확인해 주세요.'
        : a.category === 'g2b' ? '공고 내용은 AI가 정리한 것입니다. 응찰 전 반드시 나라장터 원문 공고와 제안요청서를 확인해 주세요.'
        : '이 글은 원문 기사를 바탕으로 AI가 요약한 내용입니다. 정확한 내용은 원문을 확인해 주세요.') + '</p>' +
      (isRecipe && isVideo ? '<a class="cta" href="https://www.youtube.com/watch?v=' + esc(a.videoId) + '" target="_blank" rel="noopener">유튜브에서 보기 ›</a>' : '') +
      '<a class="cta' + (isRecipe && isVideo ? ' cta2' : '') + '" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + (isRecipe ? '레시피 원문 보기 ›' : isVideo ? '유튜브에서 보기 ›' : a.category === 'g2b' ? '공고 원문 보기 ›' : a.category === 'paper' ? '논문 원문 보기 ›' : a.category === 'shopguide' ? '사이트 바로가기 ›' : '원문 보기 ›') + '</a>' +
      '<div class="actions">' +
        '<button class="act' + (v === 1 ? ' on' : '') + '" data-act="up">' + ICON.up + '좋아요</button>' +
        '<button class="act' + (v === -1 ? ' on' : '') + '" data-act="down">' + ICON.down + '싫어요</button>' +
        '<button class="act' + (bookmarks[id] ? ' on' : '') + '" data-act="mark">' + ICON.mark + '북마크</button>' +
        '<button class="act" data-act="share">' + ICON.share + '공유</button>' +
      '</div>' + navHtml(a) + '</article>';

    $det.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'up' || act === 'down') {
          var n = act === 'up' ? 1 : -1;
          if (votes[id] === n) delete votes[id]; else votes[id] = n;
          save('votes', votes);
          toast(votes[id] === 1 ? '좋아요를 눌렀어요' : votes[id] === -1 ? '싫어요를 눌렀어요' : '취소했어요');
          detail(id);
        } else if (act === 'mark') {
          if (bookmarks[id]) { delete bookmarks[id]; toast('북마크를 해제했어요'); }
          else { var s = JSON.parse(JSON.stringify(a)); s._savedAt = Date.now(); bookmarks[id] = s; toast('북마크에 저장했어요'); }
          save('bookmarks', bookmarks);
          detail(id);
        } else if (act === 'share') {
          share(a);
        }
      });
    });
  }

  function share(a) { shareLink(a.title, shareUrl(a.id)); }
  function shareLink(title, url) {
    var data = { title: title, text: '[summaryx] ' + title, url: url };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { toast('링크를 복사했어요'); }, function () { prompt('링크를 복사하세요', url); });
    } else {
      prompt('링크를 복사하세요', url);
    }
  }

  function setTab(t) {
    document.querySelectorAll('.tabbar a').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-tab') === t);
    });
  }

  // 목록 화면(href)을 그린다
  function renderList(href) {
    var parts = href.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'search') {
      setTab(''); var sq = parts.slice(1).join('/');
      try { sq = decodeURIComponent(sq); } catch (e) {}
      searchView(sq); return;
    }
    if (parts[0] === 'bookmarks') { setTab('bookmarks'); bookmarksView(); return; }
    if (parts[0] === 'links') { setTab('links'); linksView(); return; }
    if (parts[0] === 'sources') { setTab('sources'); sourcesView(); return; }
    setTab('home');
    if (parts[0] === 'c' && CAT_SEC[parts[1]]) home(CAT_SEC[parts[1]], parts[1]);
    else if (parts[0] === 's' && SEC[parts[1]]) home(parts[1], null, parts[1] === 'bid' && /^(s|l|5|10)$/.test(parts[2] || '') ? parts[2] : parts[1] === 'luxury' && /^(10|50|100)$/.test(parts[2] || '') ? parts[2] : null);
    else home('all');
  }
  function fitPanes() {
    var lp = document.getElementById('lp');
    if (!WIDE.matches || !lp) return;
    document.documentElement.style.setProperty('--pt', Math.round(lp.getBoundingClientRect().top + window.scrollY) + 'px');
  }
  window.addEventListener('resize', fitPanes);
  function markActive(id) {
    if (!WIDE.matches) return;
    $list.querySelectorAll('.item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('href') === '#/a/' + id);
    });
  }
  function route() {
    chipsOpen = false;
    layout();
    var h = location.hash || '#/';
    var parts = h.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'a' && parts[1]) {
      var id = decodeURIComponent(parts[1]);
      if (WIDE.matches) {
        var a = state.byId[id] || bookmarks[id];
        var href = a ? ctxFor(a).href : '#/';
        if (state.leftHref !== href) { renderList(href); state.leftHref = href; $list.scrollTop = 0; }
        detail(id); $det.scrollTop = 0; markActive(id);
        var act = $list.querySelector('.item.active');
        fitPanes();
        if (act && (act.offsetTop < $list.scrollTop || act.offsetTop > $list.scrollTop + $list.clientHeight - 60)) $list.scrollTop = act.offsetTop - 80;
        return;
      }
      setTab(''); detail(id); window.scrollTo(0, 0); return;
    }
    renderList(h);
    if (WIDE.matches) {
      state.leftHref = h; $list.scrollTop = 0;
      // 우측에는 목록 첫 기사를 보여 준다
      var first = state.ctx && state.ctx.ids[0];
      if (first) { detail(first); $det.scrollTop = 0; markActive(first); }
      else $det.innerHTML = '<div class="empty">왼쪽 목록에서 기사를 고르세요.</div>';
      fitPanes();
      return;
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  [WIDE, PC].forEach(function (m) { m.addEventListener ? m.addEventListener('change', route) : m.addListener(route); });

  // ---- 위로가기 버튼 ----
  var $top = document.getElementById('totop');
  var scroller = window;
  document.addEventListener('scroll', function (e) {
    scroller = e.target === document ? window : e.target;
    var y = scroller === window ? window.scrollY : scroller.scrollTop;
    $top.classList.toggle('show', y > 400);
  }, { passive: true, capture: true });
  $top.addEventListener('click', function () { scroller.scrollTo({ top: 0, behavior: 'smooth' }); });

  // ---- 상세화면: 가로로 스와이프하면 목록으로 ----
  var sw = null;
  document.addEventListener('touchstart', function (e) {
    sw = null;
    if (WIDE.matches || e.touches.length !== 1 || !$app.querySelector('.detail')) return;
    if (e.target.closest('.today, .video')) return;
    sw = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!sw || !$app.querySelector('.detail')) return;
    var t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
    sw = null;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      var back = $app.querySelector('.back');
      if (back) location.hash = back.getAttribute('href');
    }
  }, { passive: true });

  // ---- PC: 가로 스크롤 영역(오늘 카드)을 마우스 드래그·휠로 넘기기 ----
  var HSCROLL = '.today';
  var drag = null;
  document.addEventListener('mousedown', function (e) {
    var el = e.button === 0 && e.target.closest(HSCROLL);
    if (!el) return;
    drag = { el: el, x: e.clientX, left: el.scrollLeft, moved: false };
    el.style.scrollSnapType = 'none';
  });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) drag.moved = true;
    if (drag.moved) { drag.el.scrollLeft = drag.left - dx; e.preventDefault(); }
  });
  document.addEventListener('mouseup', function () {
    if (!drag) return;
    var d = drag;
    d.el.style.scrollSnapType = '';
    // 드래그 직후의 클릭(탭 이동·링크)은 막는다
    if (d.moved) setTimeout(function () { drag = null; }, 0); else drag = null;
  });
  document.addEventListener('click', function (e) {
    if (drag && drag.moved && e.target.closest(HSCROLL)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mascot]');
    if (!b) return;
    mascotIdx = (mascotIdx + 1 + Math.floor(Math.random() * (MASCOTS.length - 1))) % MASCOTS.length;
    greetIdx = Math.floor(Math.random() * GREET.length);
    var box = b.closest('.mascot'); if (box) box.outerHTML = mascotHtml();
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target.closest && e.target.closest(HSCROLL)) e.preventDefault();
  });
  document.addEventListener('wheel', function (e) {
    var el = e.target.closest && e.target.closest(HSCROLL);
    if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });
})();
