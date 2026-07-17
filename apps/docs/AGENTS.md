# Agent guide — @fc/docs

First Crack 사용자 문서 사이트 (docs.firstcrackiscoming.com). Astro Starlight, 한국어 단일 로케일 (`root` = ko).

## Structure

```
src/
├── content/docs/        # 콘텐츠 (.md/.mdx) — 파일 경로가 곧 URL slug
│   ├── start/           # 설치 (mac/windows), 시스템 사양
│   ├── machines/        # 로스팅 머신 연동 (modbus, phidget, artisan …)
│   ├── orders/          # 쇼핑몰 주문 연동
│   ├── guides/          # 사용 가이드
│   ├── service/         # 요금제/환불
│   └── support/         # 지원
├── components/          # Starlight 컴포넌트 오버라이드 (Header, Footer, PageTitle …) — ox 스타일
└── styles/custom.css    # ox 토큰 기반 커스텀 CSS
```

## 문서 추가 방법

1. `src/content/docs/<section>/<slug>.md` 생성 (frontmatter: `title`, `description`)
2. **`astro.config.mjs`의 `sidebar`에 항목 수동 추가** — autogenerate 아님, 등록 안 하면 사이드바에 안 보임
3. `pnpm build:docs`로 확인 (깨진 slug는 빌드 에러)

## Commands

```bash
pnpm dev:docs      # 루트에서. localhost:4322
pnpm build:docs
```

## Deploy

`main` push 시 `apps/docs/**` 변경이면 `.github/workflows/deploy-docs.yml` → Cloudflare Pages 프로젝트 `fc-docs`.

## Conventions

- 콘텐츠는 한국어. 제품 UI 용어는 fc-desktop 실제 화면 표기와 일치시킬 것.
- 스타일은 landing의 ox 디자인 시스템 따름 — 커스텀 컴포넌트 수정 시 `apps/landing/DESIGN_RULES.md` 참고.
