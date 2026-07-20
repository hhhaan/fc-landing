# TODO — 배포 & 운영 체크리스트

## 즉시 해야 할 것

### 1. GitHub Secret 등록 (CI/CD 작동 조건)
GitHub Actions 워크플로우가 Cloudflare에 배포하려면 API 토큰이 필요하다.

1. [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. **Custom Token** 선택, 권한 설정:
   - `Cloudflare Pages` → **Edit**
3. GitHub 레포 → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 발급받은 토큰

### 2. Supabase Auth URL Configuration (필수)

[Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 → **Authentication → URL Configuration**

**Site URL** — 반드시 **웹 HTTPS** 주소. `firstcrack://` 로 두면 웹 Google 로그인 후에도 Supabase가 데스크톱 딥링크로 리다이렉트하고 macOS가 "First Crack.app 열기"를 띄운다.

```
Site URL: https://firstcrackiscoming.com
```

**Redirect URLs** (Additional) — 웹 콜백 + 데스크톱 OAuth 딥링크를 **둘 다** 등록. Site URL 자리에 `firstcrack://` 넣지 말 것.

```
https://firstcrackiscoming.com/**
https://fc-landing.pages.dev/**
http://localhost:4321/**
firstcrack://auth/callback
```

`redirectTo` 가 allowlist에 없으면 Supabase는 Site URL 로 fallback 한다.

### 3. 커밋 & 푸시 (현재 미커밋 파일들)
```bash
git add apps/landing/astro.config.mjs       # imageService: 'passthrough' 수정
git add apps/landing/src/pages/index.astro  # Download 링크 + 가격 표기 수정
git add apps/landing/src/pages/download.astro  # 신규 페이지
git add apps/landing/wrangler.toml          # 신규 파일
git add .github/workflows/deploy-landing.yml  # CI/CD 워크플로우
git commit -m "feat: cloudflare pages deployment setup"
git push
```

---

## 커스텀 도메인 연결 시 (선택)

1. Cloudflare Dashboard → fc-landing 프로젝트 → **Custom Domains** 에서 도메인 추가
2. `apps/landing/wrangler.toml` 수정:
   ```toml
   PUBLIC_SITE_URL = "https://your-domain.com"
   POLAR_SUCCESS_URL = "https://your-domain.com/account?welcome=1"
   ```
3. Supabase Auth URL Configuration에 새 도메인도 추가

---

## Polar 프로덕션 전환 시

현재 sandbox 모드로 운영 중. 실제 결제를 받으려면:

### Polar 대시보드에서
1. 프로덕션 Products & Prices 생성 (현재 sandbox price ID만 있음)
2. Webhook 등록: `https://your-domain.com/api/webhooks/polar`
   - 이벤트: `checkout.created`, `subscription.created`, `subscription.updated`, `subscription.revoked`

### `apps/landing/wrangler.toml` 수정
```toml
POLAR_SERVER = "production"
POLAR_PRICE_MONTHLY_PROD = "..."
POLAR_PRICE_YEARLY_PROD = "..."
POLAR_PRICE_PRO_PLUS_MONTHLY_PROD = "..."
POLAR_PRICE_PRO_PLUS_YEARLY_PROD = "..."
POLAR_PRICE_ENTERPRISE_MONTHLY_PROD = "..."
POLAR_PRICE_ENTERPRISE_YEARLY_PROD = "..."
```

Sandbox Pro+ (compare-plans / `pro-plus-*` checkout):
```toml
POLAR_PRICE_PRO_PLUS_MONTHLY_SBX = "..."  # Polar Dashboard → Pro+ product → monthly price ID
POLAR_PRICE_PRO_PLUS_YEARLY_SBX = "..."
```

### Secrets 업데이트
```bash
echo "polar_oat_PRODUCTION_TOKEN" | wrangler pages secret put POLAR_ACCESS_TOKEN --project-name fc-landing
echo "polar_whs_PRODUCTION_SECRET" | wrangler pages secret put POLAR_WEBHOOK_SECRET --project-name fc-landing
```

---

## 현재 배포 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| Cloudflare Pages 프로젝트 | ✅ | `fc-landing` |
| 첫 배포 | ✅ | https://fc-landing.pages.dev |
| 환경 변수 (non-secret) | ✅ | `wrangler.toml` |
| Secrets | ✅ | SUPABASE_SERVICE_ROLE_KEY, POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET, LOGSNAG_TOKEN |
| GitHub Actions CI/CD | ⚠️ | `docs/ci-cd.md` 참고 — CI + app별 deploy; secrets 등록 필요 |
| Supabase Auth URL | ❌ | Pages 도메인 추가 필요 |
| Polar 웹훅 | ❌ | 프로덕션 전환 시 등록 필요 |
| 커스텀 도메인 | ❌ | 선택 사항 |
