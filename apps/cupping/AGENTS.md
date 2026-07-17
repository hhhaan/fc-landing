# Agent guide — @fc/cupping

QR 커핑 폼. 테이블 커핑 참가자가 폰으로 QR을 스캔해 `/c/:token`으로 진입, SCA 점수 + 향미 디스크립터를 제출하는 단일 페이지 앱. 로그인 없음 — 토큰이 곧 인증.

## Stack

- Vite 6 + React 19 + TypeScript. 라우터 없음 — `window.location.pathname`에서 토큰 파싱 (`App.tsx`의 `tokenFromPath`).
- Supabase JS client는 **Edge Functions 호출 전용** (DB 직접 접근 없음):
  - `get-cupping-session` — 토큰으로 세션/샘플 메타 로드 (410 = 만료/정원 초과)
  - `submit-cupping` — 점수 제출 (optimistic UI 후 실패 시 롤백)
- Edge Function 소스는 이 레포에 없음 (Supabase 프로젝트 측).

## Files

```
src/
├── App.tsx          # 전체 UI + 상태 + edge function 호출 (단일 컴포넌트)
├── score.ts         # SCA v1 채점: 8개 항목 0–10 (0.25 step) + base 36 − defects×2
├── descriptors.ts   # 향미 태그 그룹 (compact — full SCA wheel 아님)
├── main.tsx         # entry
└── styles.css       # ox 디자인 시스템 수동 적용 (Instrument Sans / JetBrains Mono, stone palette)
```

`score.ts`의 채점 로직은 **fc-desktop / edge function과 정합해야 함** (`defaultScaV1Scores`, `totalScoreScaV1` alias가 그 계약). 채점 공식 변경 시 세 곳 모두 확인.

## Commands

```bash
pnpm dev:cupping     # 루트에서. localhost:5174, host:true — 폰에서 LAN IP로 접속 가능
pnpm build:cupping   # tsc --noEmit + vite build
```

로컬 테스트는 유효한 토큰 필요: `/c/<token>`. 토큰 없으면 missing_token 화면.

## Env

`.env` (git-ignored, `.env.example` 참고):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Deploy

`main` push 시 `apps/cupping/**` 변경이면 `.github/workflows/deploy-cupping.yml` → Cloudflare Pages 프로젝트 `fc-cupping`. env는 워크플로우의 GitHub vars/secrets에서 주입.

## Conventions

- 모바일 우선 (폰으로 쓰는 폼). `index.html`은 `noindex,nofollow`.
- 커퍼 이름은 `localStorage`(`fc_cupping_cupped_by`)에 기억.
- 디스크립터는 최대 20개, lowercase 정규화 (`normalizeDescriptors`).
