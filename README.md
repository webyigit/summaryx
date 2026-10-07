# summaryx

모바일 전용 기사 요약 사이트. 매일 오전 8시(KST) 8개 섹션(AI · IT·테크 · 문화 · 디자인 · 라이프 · 학생 · 연예·트렌드 · 종교), 32개 세부 분류의 최신 기사를 모아 읽기 좋은 길이로 요약한다.

- 홈: 오늘의 말씀·영어·명언·그림 + 최신 기사 목록, 카테고리 필터
- 상세: 핵심 3줄, 요약 본문, 원문 보기, 좋아요/싫어요, 북마크, 공유
- 좋아요/싫어요/북마크는 브라우저(localStorage)에 저장된다
- 공유 링크: `/a/<기사id>/` (카카오톡 등 미리보기 지원)

## 구조
```
index.html, assets/      정적 사이트 (빌드 없음)
data/articles.json       최근 14일 기사 목록
data/items/<id>.json     개별 기사 영구 보관
data/daily.json          오늘 영역
data/sources.json        카테고리별 대상 사이트·키워드
a/<id>/index.html        공유용 페이지
scripts/update.py        수집 결과 반영 스크립트
ROUTINE.md               매일 자동 수집 절차
reports/                 일일 수집 리포트 (.md)
```

## 로컬 실행
```bash
python3 -m http.server 8000
```

## 배포
GitHub Pages: Settings → Pages → Deploy from a branch → `main` / `(root)`.
