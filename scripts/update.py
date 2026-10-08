#!/usr/bin/env python3
"""수집 결과(incoming/*.json)를 사이트 데이터에 합친다.

사용법: python3 scripts/update.py <incoming_dir> [--date YYYY-MM-DD]

incoming_dir 안의 파일:
  <category>.json  {"category", "sources": [...], "articles": [...]}
  daily.json       오늘의 말씀/영어/명언/시/그림 (있으면 교체)

하는 일:
  - 기사에 id, category, collectedAt 부여 (URL 중복 제거)
  - data/articles.json(최근 FRONT_DAYS일) + data/days/<날짜>.json(그 이전) 갱신, 최근 KEEP_DAYS일 유지
  - data/items/<id>.json 개별 기사 보관 (영구, 공유 링크용)
  - a/<id>/index.html 공유 페이지 생성 (미리보기 메타태그 + 앱으로 이동)
  - data/sources.json 대상 사이트·키워드 갱신
  - reports/summaryx_report_YYMMDD_v1.md 일일 수집 리포트 생성
"""
import html
import re
import json
import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
KEEP_DAYS = 14
FRONT_DAYS = 2
CATS = ["ai", "ax", "robot", "paper", "aicert", "it", "applesamsung", "car", "semi", "security", "movie", "music", "art", "book", "show", "design", "cardesign", "productd", "brand", "package", "uxui", "lux1", "lux2", "lux3", "luxwatch", "usedwear", "poemread", "poemnews", "bfashion", "bcar", "btech", "bfood", "bbeauty", "recipe", "recipeside", "recipesnack", "arch", "archproj", "interior", "fashion", "food", "travel", "health", "wine", "winepick", "wineregion", "winepair", "winestudy", "winetype", "winery", "cellar", "winedeal", "wineko", "eatseoul", "eatgg", "eatdj", "eatsj", "worldfood", "seasonal", "shopguide", "shopmen", "shopdeal", "bp", "dm", "lipid", "tripko", "tripworld", "gecko", "reptile", "toon", "toonhot", "game", "webtoon", "sports", "science", "edu", "ent", "kpop", "shorts", "meme", "g2b", "christian", "ccm"]
CAT_NAME = {"ai": "AI > AI", "ax": "AI > AX", "it": "IT·테크 > IT", "applesamsung": "IT·테크 > 애플·삼성",
            "car": "IT·테크 > 자동차", "movie": "문화 > 영화", "music": "문화 > 음악", "art": "문화 > 미술",
            "design": "디자인 > 디자인 뉴스", "cardesign": "디자인 > 자동차", "productd": "디자인 > 제품·산업",
            "brand": "디자인 > 브랜딩·그래픽", "package": "디자인 > 패키지", "uxui": "디자인 > UX/UI", "fashion": "라이프 > 패션", "food": "라이프 > 푸드",
            "wine": "와인 > 업계 뉴스", "winepick": "와인 > 추천·리뷰", "wineregion": "와인 > 산지·빈티지",
            "winepair": "와인 > 페어링", "winestudy": "와인 > 와인 상식", "winetype": "와인 > 세계 인기 와인", "winery": "와인 > 와이너리",
            "cellar": "와인 > 셀러·보관", "winedeal": "와인 > 할인 정보", "wineko": "와인 > 국내 와인", "ent": "연예·트렌드 > 연예", "shorts": "연예·트렌드 > 쇼츠", "meme": "연예·트렌드 > 밈",
            "game": "학생 > 게임", "webtoon": "학생 > 웹툰·애니", "sports": "학생 > 스포츠", "science": "학생 > 과학",
            "robot": "AI > 로봇", "paper": "AI > 논문", "g2b": "나라장터", "semi": "IT·테크 > 반도체", "security": "IT·테크 > 보안", "book": "문화 > 책",
            "show": "문화 > 공연·전시", "aicert": "AI > 자격증", "lux1": "명품 > 하이엔드", "lux2": "명품 > 럭셔리", "lux3": "명품 > 프리미엄·컨템포러리", "luxwatch": "명품 > 워치·주얼리", "usedwear": "당근·중고 > 중고 의류 소식", "poemread": "시 > 명시 감상", "poemnews": "시 > 시 소식·시집", "bfashion": "브랜드 > 패션·럭셔리", "bcar": "브랜드 > 자동차", "btech": "브랜드 > IT·전자", "bfood": "브랜드 > 식음료", "bbeauty": "브랜드 > 뷰티·생활", "recipe": "레시피 > 한 그릇·메인", "recipeside": "레시피 > 반찬·국", "recipesnack": "레시피 > 간식·브런치", "arch": "건축 > 건축 소식", "archproj": "건축 > 작품·프로젝트", "interior": "건축 > 인테리어·공간", "travel": "라이프 > 여행", "health": "라이프 > 건강",
            "edu": "학생 > 교육·진로", "kpop": "연예·트렌드 > K-POP",
            "christian": "종교 > 기독교", "eatseoul": "맛집·맛도리 > 서울 맛집", "eatgg": "맛집·맛도리 > 경기 맛집", "eatdj": "맛집·맛도리 > 대전 맛집", "eatsj": "맛집·맛도리 > 세종 맛집", "worldfood": "맛집·맛도리 > 세계 맛도리", "seasonal": "맛집·맛도리 > 제철 음식", "shopguide": "쇼핑 > 믿을 만한 쇼핑몰", "shopmen": "쇼핑 > 남성 의류", "shopdeal": "쇼핑 > 할인 행사", "bp": "건강 > 고혈압", "dm": "건강 > 당뇨", "lipid": "건강 > 고지혈증·심혈관", "tripko": "여행지 > 국내 여행지", "tripworld": "여행지 > 해외 여행지", "gecko": "도마뱀 > 크레스티드게코", "reptile": "도마뱀 > 도마뱀 키우기", "toon": "웹툰 > 웹툰 소식", "toonhot": "웹툰 > 인기·추천", "ccm": "종교 > CCM"}
KST = timezone(timedelta(hours=9))
REQUIRED = ("title", "source", "url", "summary")


def read(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")


def norm_url(u):
    # #식당명처럼 한 기사에서 여러 항목을 나눌 때는 조각(#...)까지 구분한다
    base, _, frag = u.partition("#")
    return base.rstrip("/").lower() + ("#" + frag if frag else "")


SHARE_TMPL = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | summaryx</title>
<meta name="description" content="{desc}">
<meta property="og:site_name" content="summaryx">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
{ogimage}<meta name="twitter:card" content="{card}">
<link rel="canonical" href="../../#/a/{id}">
<script>location.replace('../../#/a/{id}');</script>
</head><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:16px">
<p><a href="../../#/a/{id}">summaryx에서 보기</a></p>
<h1 style="font-size:20px">{title}</h1>
{body}
<p><a href="{url}">원문 보기</a></p>
</body></html>
"""


def share_page(a):
    desc = " ".join(a["summary"])[:150]
    body = "".join("<p>%s</p>" % html.escape(p) for p in a["summary"])
    out = SHARE_TMPL.format(title=html.escape(a["title"]), desc=html.escape(desc),
                            id=a["id"], body=body, url=html.escape(a["url"]),
                            ogimage=('<meta property="og:image" content="%s">\n' % html.escape(a["image"])) if a.get("image") else "",
                            card="summary_large_image" if a.get("image") else "summary")
    path = os.path.join(ROOT, "a", a["id"], "index.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)


def report(now, items, sources, daily):
    """일일 수집 리포트(.md). 같은 날 다시 돌리면 버전 번호를 올린다."""
    stamp = now.strftime("%y%m%d")
    rdir = os.path.join(ROOT, "reports")
    os.makedirs(rdir, exist_ok=True)
    v = 1
    while os.path.exists(os.path.join(rdir, "summaryx_report_%s_v%d.md" % (stamp, v))):
        v += 1
    L = ["# summaryx 일일 수집 리포트 — %s" % now.strftime("%Y-%m-%d"), "",
         "- 수집 시각: %s (KST)" % now.strftime("%Y-%m-%d %H:%M"),
         "- 신규 기사: %d건" % len(items), "",
         "## 카테고리별 요약", "", "| 카테고리 | 건수 | 매체 |", "|---|---|---|"]
    for cat in CATS:
        its = [a for a in items if a["category"] == cat]
        srcs = sorted({a["source"] for a in its})
        L.append("| %s | %d | %s |" % (CAT_NAME[cat], len(its), ", ".join(srcs) or "**수집 실패**"))
    L += ["", "## 수집 기사", ""]
    for cat in CATS:
        its = [a for a in items if a["category"] == cat]
        if not its:
            continue
        L.append("### %s" % CAT_NAME[cat])
        for a in its:
            L.append("- [%s](%s) — %s, %s" % (a["title"], a["url"], a["source"], a.get("publishedAt") or "날짜 [확인 필요]"))
        L.append("")
    L += ["## 대상 사이트·키워드", ""]
    for cat in CATS:
        L.append("### %s" % CAT_NAME[cat])
        for s in sources.get(cat, []):
            L.append("- [%s](%s) — 키워드: %s" % (s.get("name"), s.get("url"), ", ".join(s.get("keywords", []))))
        if not sources.get(cat):
            L.append("- 없음 [확인 필요]")
        L.append("")
    if daily:
        L += ["## 오늘 영역", ""]
        if daily.get("verse"):
            L.append("- 말씀: %s (%s)" % (daily["verse"].get("ref"), daily["verse"].get("version", "")))
        if daily.get("english"):
            L.append("- 영어: %s" % daily["english"].get("expression"))
        if daily.get("quote"):
            L.append("- 명언: %s" % daily["quote"].get("author"))
        if daily.get("poem"):
            L.append("- 시: %s · %s" % (daily["poem"].get("title"), daily["poem"].get("poet")))
        if daily.get("art"):
            L.append("- 그림: %s / %s" % (daily["art"].get("title"), daily["art"].get("artist")))
    path = os.path.join(rdir, "summaryx_report_%s_v%d.md" % (stamp, v))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print("리포트:", os.path.relpath(path, ROOT))


def source_index(articles, sources):
    """출처 정리: 분류별로 글을 가져온 사이트(도메인)·건수·최근 글. data/source_index.json"""
    import re as _re
    from urllib.parse import urlparse
    known = {}
    for cat, lst in (sources or {}).items():
        for s in lst or []:
            h = urlparse(s.get("url", "")).netloc.lower().removeprefix("www.")
            if h:
                known.setdefault(h, s)
    out = {}
    for a in articles:
        h = urlparse(a.get("url", "")).netloc.lower().removeprefix("www.")
        if not h:
            continue
        cat = a.get("category")
        d = out.setdefault(cat, {}).setdefault(h, {"domain": h, "names": {}, "count": 0, "last": "", "ko": 0, "recent": []})
        d["count"] += 1
        nm = (a.get("source") or h).split("(")[0].strip()
        d["names"][nm] = d["names"].get(nm, 0) + 1
        d["last"] = max(d["last"], (a.get("collectedAt") or "")[:10])
        ot = a.get("originalTitle") or ""
        if _re.search("[가-힣]", ot) if ot else (_re.search("[가-힣]", a.get("source") or "") or h.endswith(".kr")):
            d["ko"] += 1
        if len(d["recent"]) < 3:
            d["recent"].append({"id": a["id"], "title": a.get("title", "")})
    res = {}
    for cat, m in out.items():
        rows = []
        for h, d in m.items():
            k = known.get(h) or {}
            rows.append({"domain": h, "name": max(d["names"], key=d["names"].get), "home": "https://" + h + "/",
                         "count": d["count"], "last": d["last"], "lang": "ko" if d["ko"] * 2 >= d["count"] else "en",
                         "keywords": k.get("keywords", [])[:5], "listed": bool(k), "recent": d["recent"]})
        rows.sort(key=lambda r: (-r["count"], r["domain"]))
        res[cat] = rows
    return res


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    inc = sys.argv[1]
    now = datetime.now(KST)
    if "--date" in sys.argv:
        d = sys.argv[sys.argv.index("--date") + 1]
        now = datetime.fromisoformat(d).replace(hour=8, tzinfo=KST)
    day = now.strftime("%Y-%m-%d")
    stamp = now.strftime("%y%m%d")

    store = read(os.path.join(DATA, "articles.json"), {"articles": []})
    articles = store.get("articles", [])
    for d in store.get("days", []):  # 이전 날짜는 data/days/<날짜>.json에 나눠 있다
        articles += read(os.path.join(DATA, "days", d + ".json"), {"articles": []}).get("articles", [])
    seen = {norm_url(a["url"]) for a in articles}
    sources = read(os.path.join(DATA, "sources.json"), {})
    added = {}
    new_items = []

    for cat in CATS:
        src = read(os.path.join(inc, cat + ".json"), None)
        if not src:
            continue
        if src.get("sources"):
            sources[cat] = src["sources"]
        n = sum(1 for a in articles if a["id"].startswith(stamp + "-" + cat + "-"))
        for a in src.get("articles", []):
            if any(not a.get(k) for k in REQUIRED):
                print("skip (필수 항목 누락):", a.get("url"), file=sys.stderr)
                continue
            if norm_url(a["url"]) in seen:
                # 이미 있는 기사: 비어 있던 이미지만 채운다
                ex = next((x for x in articles if norm_url(x["url"]) == norm_url(a["url"])), None)
                if ex is not None and a.get("image") and not ex.get("image"):
                    ex["image"] = a["image"]
                    # 목록(articles.json)은 slim이라 개별 파일(전체본)에 반영
                    ipath = os.path.join(DATA, "items", ex["id"] + ".json")
                    full = read(ipath, None) or ex
                    full["image"] = a["image"]
                    write(ipath, full)
                    share_page(full)
                    print("image 보강:", ex["id"], file=sys.stderr)
                else:
                    print("skip (중복):", a["url"], file=sys.stderr)
                continue
            n += 1
            a = dict(a)
            a["id"] = "%s-%s-%02d" % (stamp, cat, n)
            a["category"] = cat
            a["collectedAt"] = now.isoformat(timespec="seconds")
            if a.get("image") and not str(a["image"]).startswith("https://"):
                a["image"] = None
            if a.get("videoId") and not re.fullmatch(r"[A-Za-z0-9_-]{11}", str(a["videoId"])):
                a["videoId"] = None
            if isinstance(a["summary"], str):
                a["summary"] = [p for p in a["summary"].split("\n") if p.strip()]
            seen.add(norm_url(a["url"]))
            articles.append(a)
            write(os.path.join(DATA, "items", a["id"] + ".json"), a)
            share_page(a)
            added[cat] = added.get(cat, 0) + 1
            new_items.append(a)

    cutoff = (now - timedelta(days=KEEP_DAYS)).isoformat()
    articles = [a for a in articles if a.get("collectedAt", "") >= cutoff]
    articles.sort(key=lambda a: (a.get("collectedAt", ""), a["id"]), reverse=True)
    # 목록 파일은 가볍게: 요약은 첫 문단 앞부분만(slim). 전체는 data/items/<id>.json
    # 첫 화면용 articles.json에는 최근 FRONT_DAYS일만, 그 이전은 날짜별 파일(앱이 뒤에서 불러옴)
    slim = []
    for a in articles:
        x = {k: v for k, v in a.items() if k != "slim"}
        x["summary"] = [(a.get("summary") or [""])[0][:160]]
        x["slim"] = True
        slim.append(x)
    dates = sorted({a.get("collectedAt", "")[:10] for a in slim}, reverse=True)
    front, older = dates[:FRONT_DAYS], dates[FRONT_DAYS:]
    ddir = os.path.join(DATA, "days")
    os.makedirs(ddir, exist_ok=True)
    for fn in os.listdir(ddir):
        if fn[:-5] not in older:
            os.remove(os.path.join(ddir, fn))

    def dump(path, obj):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
            f.write("\n")
    for d in older:
        dump(os.path.join(ddir, d + ".json"), {"articles": [a for a in slim if a.get("collectedAt", "")[:10] == d]})
    dump(os.path.join(DATA, "articles.json"), {"updatedAt": now.isoformat(timespec="seconds"), "days": older,
                                               "articles": [a for a in slim if a.get("collectedAt", "")[:10] in front]})
    write(os.path.join(DATA, "sources.json"), sources)
    dump(os.path.join(DATA, "source_index.json"), {"updatedAt": now.isoformat(timespec="seconds"),
                                                    "cats": source_index(articles, sources)})

    daily = read(os.path.join(inc, "daily.json"), None)
    if daily:
        daily.setdefault("date", day)
        write(os.path.join(DATA, "daily.json"), daily)

    report(now, new_items, sources, daily)
    print("추가:", added, "/ 총", len(articles), "건 / daily:", bool(daily))


if __name__ == "__main__":
    main()
