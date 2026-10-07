(function () {
  'use strict';

  // 메뉴 순서: 전체 → 알파벳순 → 한글
  var CATS = [
    { id: 'all', name: '전체' },
    { id: 'ai', name: 'AI' },
    { id: 'applesamsung', name: 'APPLE/SAMSUNG' },
    { id: 'art', name: 'ART' },
    { id: 'ax', name: 'AX' },
    { id: 'car', name: 'CAR' },
    { id: 'ccm', name: 'CCM' },
    { id: 'christian', name: 'CHRISTIAN' },
    { id: 'design', name: 'DESIGN' },
    { id: 'fashion', name: 'FASHION' },
    { id: 'food', name: 'FOOD' },
    { id: 'it', name: 'IT' },
    { id: 'movie', name: 'MOVIE' },
    { id: 'music', name: 'MUSIC' },
    { id: 'shorts', name: 'SHORTS' },
    { id: 'uxui', name: 'UX/UI' },
    { id: 'wine', name: 'WINE' },
    { id: 'meme', name: '밈' },
    { id: 'ent', name: '연예' }
  ];
  var CAT_NAME = {};
  CATS.forEach(function (c) { CAT_NAME[c.id] = c.name; });

  var state = { articles: [], daily: null, updatedAt: null, byId: {} };
  var $app = document.getElementById('app');
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
  Promise.all([
    fetchJson('data/articles.json'),
    fetchJson('data/daily.json').catch(function () { return null; })
  ]).then(function (res) {
    state.articles = (res[0].articles || []).slice().sort(function (a, b) {
      return (b.collectedAt || '').slice(0, 10).localeCompare((a.collectedAt || '').slice(0, 10)) ||
             (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.id.localeCompare(b.id);
    });
    state.updatedAt = res[0].updatedAt;
    state.daily = res[1];
    state.articles.forEach(function (a) { state.byId[a.id] = a; });
    if (state.updatedAt) document.getElementById('updated').textContent = fmtDate(state.updatedAt.slice(0, 10)) + ' 업데이트';
    route();
  }).catch(function () {
    $app.innerHTML = '<div class="empty">기사를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>';
  });

  // ---- views ----
  // 탭: 접힘 상태에선 5개만, 화살표로 전체 펼침/접기
  var CHIP_LIMIT = 5;
  var chipsOpen = false;
  function renderChips(active) {
    $chips.style.display = '';
    var shown = CATS;
    if (!chipsOpen) {
      shown = CATS.slice(0, CHIP_LIMIT);
      var idx = -1;
      CATS.forEach(function (c, i) { if (c.id === active) idx = i; });
      if (idx >= CHIP_LIMIT) shown = CATS.slice(0, CHIP_LIMIT - 1).concat([CATS[idx]]);
    }
    $chips.classList.toggle('open', chipsOpen);
    $chips.innerHTML = '<div class="chip-row">' + shown.map(function (c) {
      var href = c.id === 'all' ? '#/' : '#/c/' + c.id;
      return '<a class="chip' + (c.id === active ? ' on' : '') + '" href="' + href + '">' + esc(c.name) + '</a>';
    }).join('') + '</div>' +
      '<button class="chip-toggle" type="button" aria-expanded="' + chipsOpen + '" aria-label="' +
      (chipsOpen ? '카테고리 접기' : '카테고리 전체 보기') + '">' +
      '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>';
    if (!chipsOpen) {
      // 한 줄에 다 안 들어가면 뒤쪽(현재 탭 제외)부터 숨긴다
      var row = $chips.querySelector('.chip-row');
      var list = [].slice.call(row.querySelectorAll('.chip:not(.on)')).reverse();
      while (row.scrollWidth > row.clientWidth + 1 && list.length) list.shift().remove();
    }
    $chips.querySelector('.chip-toggle').addEventListener('click', function () {
      chipsOpen = !chipsOpen;
      renderChips(active);
    });
  }

  function itemHtml(a) {
    var v = votes[a.id];
    return '<a class="item' + (a.image ? ' has-img' : '') + '" href="#/a/' + esc(a.id) + '">' +
      (a.image ? '<img class="thumb" src="' + esc(a.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove(\'has-img\');this.remove()">' : '') +
      '<div class="txt"><div class="meta"><span class="tag">' + esc(CAT_NAME[a.category] || a.category) + '</span>' +
      '<span>' + esc(a.source) + '</span>' + (a.publishedAt ? '<span>· ' + fmtDate(a.publishedAt) + '</span>' : '') + '</div>' +
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
    if (d.art) cards.push('<a class="tcard art" href="' + esc(d.art.page || d.art.image) + '" target="_blank" rel="noopener">' +
      '<img src="' + esc(d.art.image) + '" alt="' + esc(d.art.title) + '" loading="lazy">' +
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

  function home(cat) {
    renderChips(cat);
    var arr = cat === 'all' ? state.articles : state.articles.filter(function (a) { return a.category === cat; });
    setCtx(arr, cat === 'all' ? '#/' : '#/c/' + cat);
    $app.innerHTML = (cat === 'all' ? todayHtml() : '') +
      '<div class="sec-title">' + (cat === 'all' ? '최신 기사' : esc(CAT_NAME[cat] || cat)) +
      '<small>' + arr.length + '건</small></div>' + listHtml(arr);
  }

  function bookmarksView() {
    renderChips(null);
    var arr = Object.keys(bookmarks).map(function (k) { return bookmarks[k]; })
      .sort(function (a, b) { return (b._savedAt || 0) - (a._savedAt || 0); });
    setCtx(arr, '#/bookmarks');
    $app.innerHTML = '<div class="sec-title">북마크<small>' + arr.length + '건</small></div>' +
      (arr.length ? '<div class="list">' + arr.map(itemHtml).join('') + '</div>'
                  : '<div class="empty">기사 상세에서 🔖 를 누르면 여기에 저장돼요.</div>');
  }

  var ICON = {
    up: '<svg viewBox="0 0 24 24"><path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17"/></svg>',
    mark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5M5 13v7h14v-7"/></svg>'
  };

  function detail(id) {
    var a = state.byId[id] || bookmarks[id];
    $chips.style.display = 'none';
    if (!a) {
      // 목록 보관 기간이 지난 기사는 개별 파일에서 불러온다 (공유 링크용)
      if (!detail._tried) {
        detail._tried = id;
        $app.innerHTML = '<div class="empty">불러오는 중…</div>';
        fetchJson('data/items/' + encodeURIComponent(id) + '.json').then(function (it) {
          state.byId[it.id] = it; detail(id);
        }).catch(function () { detail(id); });
        return;
      }
      detail._tried = null;
      $app.innerHTML = '<div class="empty">기사를 찾을 수 없어요.<br><br><a href="#/">홈으로</a></div>';
      return;
    }
    detail._tried = null;
    var v = votes[id];
    var isVideo = /^[A-Za-z0-9_-]{11}$/.test(a.videoId || '');
    $app.innerHTML = '<article class="detail">' +
      '<a class="back" href="' + ctxFor(a).href + '">‹ 목록</a>' +
      '<div class="meta"><span class="tag">' + esc(CAT_NAME[a.category] || a.category) + '</span>' +
      '<span>' + esc(a.source) + '</span>' + (a.publishedAt ? '<span>· ' + fmtDate(a.publishedAt) + '</span>' : '') + '</div>' +
      '<h1>' + esc(a.title) + '</h1>' +
      (isVideo ? '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(a.videoId) +
        '?playsinline=1&rel=0" title="' + esc(a.title) + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
        : a.image ? '<img class="hero" src="' + esc(a.image) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      (a.originalTitle && a.originalTitle !== a.title ? '<p class="orig">' + esc(a.originalTitle) + '</p>' : '') +
      (a.keyPoints && a.keyPoints.length ? '<div class="points"><b>핵심 요약</b><ul>' +
        a.keyPoints.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="body">' + (a.summary || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<p class="note">' + (isVideo ? '영상 소개는 AI가 정리한 내용입니다. 정확한 내용은 영상을 확인해 주세요.'
        : '이 글은 원문 기사를 바탕으로 AI가 요약한 내용입니다. 정확한 내용은 원문을 확인해 주세요.') + '</p>' +
      '<a class="cta" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + (isVideo ? '유튜브에서 보기 ›' : '원문 보기 ›') + '</a>' +
      '<div class="actions">' +
        '<button class="act' + (v === 1 ? ' on' : '') + '" data-act="up">' + ICON.up + '좋아요</button>' +
        '<button class="act' + (v === -1 ? ' on' : '') + '" data-act="down">' + ICON.down + '싫어요</button>' +
        '<button class="act' + (bookmarks[id] ? ' on' : '') + '" data-act="mark">' + ICON.mark + '북마크</button>' +
        '<button class="act" data-act="share">' + ICON.share + '공유</button>' +
      '</div>' + navHtml(a) + '</article>';

    $app.querySelectorAll('[data-act]').forEach(function (b) {
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

  function share(a) {
    var url = shareUrl(a.id);
    var data = { title: a.title, text: '[summaryx] ' + a.title, url: url };
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

  function route() {
    chipsOpen = false;
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    if (parts[0] === 'a' && parts[1]) { setTab(''); detail(decodeURIComponent(parts[1])); window.scrollTo(0, 0); return; }
    if (parts[0] === 'bookmarks') { setTab('bookmarks'); bookmarksView(); window.scrollTo(0, 0); return; }
    setTab('home');
    home(parts[0] === 'c' && CAT_NAME[parts[1]] ? parts[1] : 'all');
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

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
