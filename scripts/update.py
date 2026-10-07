#!/usr/bin/env python3
"""수집 결과(incoming/*.json)를 사이트 데이터에 합친다.

사용법: python3 scripts/update.py <incoming_dir> [--date YYYY-MM-DD]

incoming_dir 안의 파일:
  <category>.json  {"category", "sources": [...], "articles": [...]}
  daily.json       오늘의 말씀/영어/명언/그림 (있으면 교체)

하는 일:
  - 기사에 id, category, collectedAt 부여 (URL 중복 제거)
  - data/articles.json 갱신 (최근 KEEP_DAYS일 유지)
  - data/items/<id>.json 개별 기사 보관 (영구, 공유 링크용)
  - a/<id>/index.html 공유 페이지 생성 (미리보기 메타태그 + 앱으로 이동)
  - data/sources.json 대상 사이트·키워드 갱신
  - reports/summaryx_report_YYMMDD_v1.md 일일 수집 리포트 생성
"""
import html
import json
import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
KEEP_DAYS = 14
CATS = ["ai", "applesamsung", "art", "ax", "car", "ccm", "christian", "design", "fashion", "food", "it", "movie", "music", "uxui", "meme", "ent"]
CAT_NAME = {"ai": "AI", "ax": "AX", "car": "CAR", "ccm": "CCM", "christian": "CHRISTIAN",
            "it": "IT", "fashion": "FASHION", "art": "ART", "design": "DESIGN", "uxui": "UX/UI", "meme": "밈",
            "food": "FOOD", "music": "MUSIC", "ent": "연예",
            "movie": "MOVIE", "applesamsung": "APPLE/SAMSUNG"}
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
    return u.split("#")[0].rstrip("/").lower()


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
        if daily.get("art"):
            L.append("- 그림: %s / %s" % (daily["art"].get("title"), daily["art"].get("artist")))
    path = os.path.join(rdir, "summaryx_report_%s_v%d.md" % (stamp, v))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print("리포트:", os.path.relpath(path, ROOT))


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
                    write(os.path.join(DATA, "items", ex["id"] + ".json"), ex)
                    share_page(ex)
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
    write(os.path.join(DATA, "articles.json"),
          {"updatedAt": now.isoformat(timespec="seconds"), "articles": articles})
    write(os.path.join(DATA, "sources.json"), sources)

    daily = read(os.path.join(inc, "daily.json"), None)
    if daily:
        daily.setdefault("date", day)
        write(os.path.join(DATA, "daily.json"), daily)

    report(now, new_items, sources, daily)
    print("추가:", added, "/ 총", len(articles), "건 / daily:", bool(daily))


if __name__ == "__main__":
    main()
