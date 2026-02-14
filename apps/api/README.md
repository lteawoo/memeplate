# Memeplate API (Fastify)

## 실행

```bash
pnpm install
pnpm --filter memeplate-api dev
```

기본 주소: `http://localhost:8080`

## 환경 변수

- 개발: `apps/api/.env.development`
- 운영: `apps/api/.env.production`
- 샘플: `apps/api/.env.development.example`, `apps/api/.env.production.example`

서버는 `NODE_ENV` 값에 따라 `.env.{NODE_ENV}`를 우선 로드합니다.

- `WEB_DIST_DIR`: 프로덕션에서 SPA 정적 파일 경로 (기본값 `../web/dist`)

## 엔드포인트

- `GET /healthz`
- `GET /api/v1/health`
- `GET /api/v1/auth/google/start` (Google OAuth redirect)
- `GET /api/v1/auth/google/callback` (Google OAuth callback + session issue)
- `GET /api/v1/auth/me` (session check)
- `POST /api/v1/auth/logout` (session revoke + cookie clear)
- `GET /api/v1/templates/me` (placeholder)
- `POST /api/v1/templates` (payload zod 검증 포함)
- `PATCH /api/v1/templates/:templateId` (payload zod 검증 포함)
- `DELETE /api/v1/templates/:templateId` (placeholder)

## 구조

- `src/modules/auth`: 인증 도메인
- `src/modules/templates`: 템플릿 도메인
- `src/lib/supabaseAdmin.ts`: Supabase admin client 진입점
- `src/types`: zod 기반 요청 스키마

## 프로덕션 동작

- `NODE_ENV=production`이고 `WEB_DIST_DIR` 경로가 존재하면, API 서버가 `apps/web/dist`를 정적 서빙합니다.
- `/api/*`, `/healthz`를 제외한 GET 요청은 `index.html`로 fallback 되어 SPA 라우팅을 처리합니다.
