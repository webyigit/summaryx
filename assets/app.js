(function () {
  'use strict';

  // 뉴스 사이트식 섹션 → 세부 분류(수집은 세부 분류 단위)
  var SECTIONS = [
    { id: 'all', name: '전체', cats: [] },
    { id: 'ai', name: 'AI', cats: [['ai', 'AI'], ['ax', 'AX'], ['robot', '로봇'], ['paper', '논문']] },
    { id: 'tech', name: 'IT·테크', cats: [['it', 'IT'], ['applesamsung', '애플·삼성'], ['car', '자동차'], ['semi', '반도체'], ['security', '보안']] },
    { id: 'culture', name: '문화', cats: [['movie', '영화'], ['music', '음악'], ['art', '미술'], ['book', '책'], ['show', '공연·전시']] },
    { id: 'design', name: '디자인', cats: [['design', '디자인 뉴스'], ['cardesign', '자동차'], ['productd', '제품·산업'], ['brand', '브랜딩·그래픽'], ['package', '패키지'], ['uxui', 'UX/UI'], ['arch', '건축·인테리어']] },
    { id: 'life', name: '라이프', cats: [['fashion', '패션'], ['food', '푸드'], ['travel', '여행'], ['health', '건강']] },
    { id: 'wine', name: '와인', cats: [['wine', '업계 뉴스'], ['winepick', '추천·리뷰'], ['wineregion', '산지·빈티지'], ['winepair', '페어링'], ['winestudy', '와인 상식'], ['winetype', '세계 인기 와인'], ['winery', '와이너리'], ['cellar', '셀러·보관'], ['winedeal', '할인 정보'], ['wineko', '국내 와인']] },
    { id: 'eat', name: '맛집·맛도리', cats: [['eatseoul','서울 맛집'],['eatgg','경기 맛집'],['eatdj','대전 맛집'],['eatsj','세종 맛집'],['worldfood','세계 맛도리']] },
    { id: 'shop', name: '쇼핑', cats: [['shopguide','믿을 만한 쇼핑몰'],['shopmen','남성 의류'],['shopdeal','할인 행사']] },
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
    fetchJson('data/daily.json').catch(function () { return null; })
  ]).then(function (res) {
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
      (a.category === 'g2b' ? bidHtml(a) : '') +
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
    var href = cat ? '#/c/' + cat : secHref(sec) + (sec === 'bid' && amt ? '/' + amt : '');
    setCtx(arr, href);
    var subs = sec === 'bid' ? '<div class="subs">' + [['', '전체'], ['s', '1억 이하'], ['l', '1억 이상'], ['5', '5억 이상'], ['10', '10억 이상']].map(function (o) {
        return '<a class="sub' + ((amt || '') === o[0] ? ' on' : '') + '" href="#/s/bid' + (o[0] ? '/' + o[0] : '') + '">' + o[1] + '</a>';
      }).join('') + '</div>' : S.cats.length > 1 ? '<div class="subs"><a class="sub' + (cat ? '' : ' on') + '" href="' + secHref(sec) + '">전체</a>' +
      S.cats.filter(function (c) { return hasCat(c[0]) || c[0] === cat; }).map(function (c) {
        return '<a class="sub' + (c[0] === cat ? ' on' : '') + '" href="#/c/' + c[0] + '">' + esc(c[1]) + '</a>';
      }).join('') + '</div>' : '';
    $list.innerHTML = (sec === 'all' ? todayHtml() : '') +
      '<div class="sec-title">' + (sec === 'all' ? '최신 기사' : esc(S.name)) +
      '<small>' + arr.length + '건</small></div>' + subs + listHtml(arr);
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
        var t = [a.title, a.originalTitle, a.source, (a.summary || []).join(' '), (a.keyPoints || []).join(' '), (a.requirements || []).join(' '), (a.facts || []).map(function (f) { return f.join(' '); }).join(' '), CAT_NAME[a.category]].join(' ').toLowerCase();
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
    $det.innerHTML = '<article class="detail">' +
      '<a class="back" href="' + ctxFor(a).href + '">‹ 목록</a>' +
      '<div class="meta"><span class="tag">' + esc(CAT_NAME[a.category] || a.category) + '</span>' +
      '<span>' + esc(a.source) + '</span>' + pubHtml(a) + '</div>' +
      '<h1>' + esc(a.title) + '</h1>' +
      (isVideo ? '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(a.videoId) +
        '?playsinline=1&rel=0" title="' + esc(a.title) + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
        : a.image ? '<img class="hero" src="' + esc(a.image) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      (a.originalTitle && a.originalTitle !== a.title ? '<p class="orig">' + esc(a.originalTitle) + '</p>' : '') +
      (a.keyPoints && a.keyPoints.length ? '<div class="points"><b>핵심 요약</b><ul>' +
        a.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      (a.facts && a.facts.length ? '<table class="facts">' + a.facts.map(function (f) {
        return '<tr><th>' + esc(f[0]) + '</th><td>' + (/^https?:\/\//.test(f[1] || '') ? '<a href="' + esc(f[1]) + '" target="_blank" rel="noopener">' + esc(f[1]) + '</a>' : esc(f[1])) + '</td></tr>';
      }).join('') + '</table>' : '') +
      (a.requirements && a.requirements.length ? '<div class="points reqs"><b>제안 요건</b><ul>' +
        a.requirements.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      (a.fit ? '<p class="fit"><b>에이전시 관점</b> ' + esc(a.fit) + '</p>' : '') +
      '<div class="body">' + (a.summary || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<p class="note">' + (isVideo ? '영상 소개는 AI가 정리한 내용입니다. 정확한 내용은 영상을 확인해 주세요.'
        : a.category === 'g2b' ? '공고 내용은 AI가 정리한 것입니다. 응찰 전 반드시 나라장터 원문 공고와 제안요청서를 확인해 주세요.'
        : '이 글은 원문 기사를 바탕으로 AI가 요약한 내용입니다. 정확한 내용은 원문을 확인해 주세요.') + '</p>' +
      '<a class="cta" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + (isVideo ? '유튜브에서 보기 ›' : a.category === 'g2b' ? '공고 원문 보기 ›' : a.category === 'paper' ? '논문 원문 보기 ›' : a.category === 'shopguide' ? '사이트 바로가기 ›' : '원문 보기 ›') + '</a>' +
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
    setTab('home');
    if (parts[0] === 'c' && CAT_SEC[parts[1]]) home(CAT_SEC[parts[1]], parts[1]);
    else if (parts[0] === 's' && SEC[parts[1]]) home(parts[1], null, parts[1] === 'bid' && /^(s|l|5|10)$/.test(parts[2] || '') ? parts[2] : null);
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
