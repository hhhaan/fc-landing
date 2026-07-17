# Agent guide — @fc/docs

First Crack 사용자 문서 사이트 (docs.firstcrackiscoming.com). Astro Starlight, **다국어 i18n**: `root` = 한국어(ko), `en`, `ja`.

## Structure

```
src/
├── content/docs/           # root locale (ko) — 파일 경로가 곧 URL slug
│   ├── en/                 # English → /en/...
│   ├── ja/                 # 日本語 → /ja/...
│   ├── start/              # 설치 (mac/windows), 시스템 사양
│   ├── machines/           # 로스팅 머신 연동
│   ├── orders/             # 쇼핑몰 주문 연동
│   ├── guides/             # 사용 가이드
│   ├── service/            # 요금제/환불
│   └── support/            # 지원
├── components/             # Starlight 오버라이드 (Header에 LanguageSelect 포함)
└── styles/custom.css       # ox 토큰 기반 커스텀 CSS
```

## i18n

| Locale | URL | Content path |
|--------|-----|--------------|
| 한국어 (default) | `/…` | `src/content/docs/<slug>.md` |
| English | `/en/…` | `src/content/docs/en/<slug>.md` |
| 日本語 | `/ja/…` | `src/content/docs/ja/<slug>.md` |

- `astro.config.mjs` → `locales` + sidebar `translations` (en/ja 라벨)
- 로케일 간 내부 링크는 접두사 유지 (`/machines/` vs `/en/machines/` vs `/ja/machines/`)
- 헤더 LanguageSelect로 전환

## 문서 추가 방법

1. **세 로케일 모두** 같은 slug로 생성 (root + `en/` + `ja/`)
2. frontmatter: `title`, `description`
3. **`astro.config.mjs`의 `sidebar`에 항목 수동 추가** — 라벨 + `translations: { en, ja }`
4. `pnpm build:docs`로 확인 (깨진 slug·누락 번역은 빌드 에러/경고)

## Commands

```bash
pnpm dev:docs           # 루트에서. localhost:4322
pnpm build:docs
pnpm check:docs-i18n    # root / en / ja 페이지 slug 일치 검사
```

Husky pre-commit: `apps/docs/src/content/docs/**` 스테이징 시 `check:docs-i18n` 실행.

## Deploy

`main` push 시 `apps/docs/**` 변경이면 `.github/workflows/deploy-docs.yml` → Cloudflare Pages 프로젝트 `fc-docs`.

## Conventions

- root 콘텐츠는 한국어. en/ja는 동일 구조의 번역.
- 제품 UI 용어는 fc-desktop 실제 화면 표기와 일치시킬 것.
- 스타일은 landing의 ox 디자인 시스템 따름 — 커스텀 컴포넌트 수정 시 `apps/landing/DESIGN_RULES.md` 참고.
