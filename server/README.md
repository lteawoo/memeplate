# Memeplate API (Fastify)

## 실행

```bash
cd server
npm install
npm run dev
```

기본 주소: `http://localhost:8080`

## 엔드포인트

- `GET /api/v1/health`
- `GET /api/v1/auth/google/start` (placeholder)
- `GET /api/v1/auth/google/callback` (placeholder)
- `POST /api/v1/auth/logout` (placeholder)
- `GET /api/v1/templates/me` (placeholder)
- `POST /api/v1/templates` (payload zod 검증 포함)
- `PATCH /api/v1/templates/:templateId` (payload zod 검증 포함)
- `DELETE /api/v1/templates/:templateId` (placeholder)

## 구조

- `src/modules/auth`: 인증 도메인
- `src/modules/templates`: 템플릿 도메인
- `src/lib/supabaseAdmin.ts`: Supabase admin client 진입점
- `src/types`: zod 기반 요청 스키마
