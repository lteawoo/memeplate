# 결정 로그 (Decision Log)

## [2026-02-22] 에디터 텍스트 상/하단 클리핑 완화 (glyph metric + inset 정렬)
- **결정**:
  1. 텍스트 높이 적합성 판단을 `lineCount * fontSize * lineHeight` 단순 계산에서 glyph ascent/descent 기반 총 높이로 전환함.
  2. `Textbox` 렌더 baseline을 `top`에서 `alphabetic`으로 바꾸고, baseline offset(`ascent`) 기준으로 각 줄을 배치함.
  3. 외곽선(stroke) 두께와 악센트/하강문자(headroom)를 반영한 안전 inset(`horizontal`, `vertical`)을 계산해 레이아웃 박스에 적용함.
  4. 캔버스 본문 렌더와 편집 오버레이 textarea에 동일 inset 규칙을 적용해 편집 중/완료 후의 텍스트 위치 불일치를 줄임.
  5. 최소 폰트(8px)에서도 높이 overflow가 남는 경우, 1px까지 연속 폰트 축소를 허용해 클리핑 대신 autoshrink를 우선함.
  6. 편집 상태(`textarea`)의 조기 줄바꿈/잘림을 줄이기 위해 `border` 대신 `outline`을 사용해 내부 레이아웃 폭/높이 손실을 제거함.
- **이유**:
  1. 기존에는 clip 박스 경계와 텍스트 배치가 너무 밀착되어 `Á`, `g/j/p/y`, 한글 조합에서 상/하단 잘림이 반복됨.
  2. stroke 두께가 레이아웃 fit 계산에 반영되지 않아 "맞아 보이지만 잘리는" 케이스가 존재했음.
  3. 오버레이와 캔버스 렌더 규칙이 다르면 편집 중에는 보이고 완료 후 잘리는 회귀가 발생할 수 있어 단일 규칙화가 필요했음.
  4. 사용자 피드백대로 줄바꿈 자체는 허용하되, 박스 높이를 넘겨 잘리는 대신 폰트가 추가로 줄어드는 동작이 필요했음.
  5. 편집 상태는 DOM 박스모델(`border-box`, border) 영향을 받기 때문에 캔버스 본문보다 먼저 줄바꿈되거나 하단이 짤릴 수 있었음.
- **구현 요약**:
  - `apps/web/src/core/canvas/textLayout.ts`
    - `measureText` ascent/descent 기반 `totalHeight` 계산으로 변경
    - `TextLayoutResult.baselineOffsetPx` 추가
    - `getAdaptiveStrokeWidth`, `resolveTextContentInsets` 공통 유틸 추가
    - `MIN_TEXT_FONT_SIZE(8)` 미적합 시 `ABSOLUTE_MIN_TEXT_FONT_SIZE(1)`까지 binary search 축소 fallback 추가
    - 최종 폰트로 strict 재측정해 폰트값/레이아웃값 불일치 제거
  - `apps/web/src/core/canvas/Textbox.ts`
    - 2-pass 레이아웃(프로브 -> inset 반영 레이아웃) 적용
    - baseline `alphabetic` 전환 + `baselineOffsetPx` 사용
    - 좌/우 정렬 기준을 inset 적용 inner width 기준으로 보정
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - textarea 레이아웃에 캔버스와 동일 inset/inner-height 계산 적용
    - `scaleX/scaleY` 절대값 기반 표시 폭/높이 계산으로 오버레이 안정화
    - `border` -> `outline` 전환 + 상/하단 안전 inset(+1px) + `spellCheck=false` 적용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-22_editor_text_vertical_clipping_fix_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_editor_text_autoshrink_below_min_fit_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_editor_text_edit_overlay_clipping_fix_v1.png`

## [2026-02-22] 캔버스 점선 외곽선 가시성 미세 조정(두께/대시 길이)
- **결정**:
  1. 선택 객체 조절 박스 외곽선은 기존보다 약간 더 두껍게 표시함.
  2. hover 얇은 외곽선과 선택 외곽선 모두 점선 dash/gap 길이를 소폭 확대함.
- **이유**:
  1. 사용자 피드백대로 선택 상태와 hover 상태의 시각적 위계를 더 명확하게 구분할 필요가 있었음.
  2. 기존 점선 패턴이 촘촘해 축소/원거리 시 인지성이 떨어지는 구간이 있어 dash 크기를 약간 키우는 편이 안정적이었음.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `drawControls` 선택 외곽선 두께: `Math.max(1.5 * scale, 1.1)`
    - `drawControls` 선택 점선 패턴: `[Math.max(4.6 * scale, 1.9), Math.max(3.2 * scale, 1.4)]`
    - `drawHoverOutline` hover 점선 패턴: `[Math.max(3.2 * scale, 1.4), Math.max(2.4 * scale, 1.1)]`
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-22_canvas_hover_outline_dashsize_tuned_v2.png`
    - `docs/ai-context/screenshots/2026-02-22_canvas_selected_outline_thicker_dashsize_tuned_v2.png`

## [2026-02-22] 에디터 캔버스 hover/터치 레이어 외곽선 표시 규칙 적용
- **결정**:
  1. 캔버스 hover(PC) 또는 캔버스 터치 hover 활성(모바일) 상태에서 배경 레이어를 제외한 모든 레이어에 얇은 외곽선을 표시함.
  2. 레이어 외곽선은 실선 대신 점선(`setLineDash`) 스타일을 적용함.
  3. 객체 조절점(리사이즈/회전 핸들)은 기존 선택 객체 기준 동작을 유지함(객체 선택/터치 시 노출).
  4. 외곽선 노출 상태는 `mouseleave`와 전역 `mousemove` 외부 감지, 전역 외부 `touchstart`, `touchcancel`로 해제함.
  5. 선택 레이어가 존재할 때는 hover 얇은 외곽선 렌더를 중지하고, 선택 조절 박스 외곽선만 점선으로 노출함.
- **이유**:
  1. 사용자가 요청한 UX(캔버스 hover 시 전체 레이어 경계 인지 + 객체 조작 시 조절점 유지)를 동시에 만족해야 함.
  2. `mouseleave` 누락 환경에서도 외곽선 잔상을 남기지 않으려면 전역 외부 포인터 감지가 필요함.
  3. 모바일은 hover 개념이 없으므로 터치 기반 hover 상태를 별도 도입해야 동일 인지성을 제공할 수 있음.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - 상태 추가: `isCanvasMouseHovering`, `isCanvasTouchHovering`
    - 이벤트 추가:
      - 캔버스: `mouseenter`, `mouseleave`
      - 전역: `mousemove`(캔버스 외부 이탈 감지), `touchstart`(외부 터치 감지), `touchcancel`
    - 렌더 보강:
      - `drawHoverOutline` 추가
      - hover/touch 활성 시 배경 제외 모든 visible 레이어 외곽선 렌더
      - 외곽선 점선 패턴 적용(`setLineDash`)
      - `activeObject` 존재 시 hover 얇은 외곽선 렌더 스킵
      - `drawControls` 바운딩 박스 외곽선을 점선으로 변경(핸들 라인은 기존 유지)
      - 선택 객체 조절점 렌더는 기존 정책 유지
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-22_canvas_hover_outline_dashed_nonhover_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_canvas_hover_outline_dashed_hover_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_selected_dashed_outline_hide_thin_nonhover_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_selected_dashed_outline_hide_thin_hover_v1.png`

## [2026-02-22] 상세/목록 이미지 스켈레톤 규칙 통일 2차
- **결정**:
  1. 페이지 초기 로딩에서 쓰는 프리뷰 스켈레톤과 실제 이미지 로딩 중 스켈레톤을 `PreviewFrame` 단일 마크업으로 통일함.
  2. 목록 페이지 스켈레톤(`TemplateCardSkeletonGrid`)의 썸네일 영역을 실제 카드(`ThumbnailCard`) 로딩 구조와 동일한 surface/layout으로 통일함.
  3. 리믹스 상세 CTA는 하단 보조 액션(`밈플릿 목록으로`)을 제거해 핵심 행동만 남김.
  4. 썸네일 카드(`ThumbnailCard`)와 목록 스켈레톤(`TemplateCardSkeletonGrid`)의 썸 영역 배경은 모두 제거함.
  5. 리믹스 목록 썸네일의 간헐적 스켈레톤 고착을 줄이기 위해 `ThumbnailCard`에 `img.complete && naturalWidth` 기반 선확인 로직을 추가함.
  6. 리믹스 상세 메인 이미지(`ImageShareDetailPage`)에도 템플릿 상세와 동일한 로드/에러 상태 동기화(`imageRef`, `imageKey`, `onError`)를 적용함.
  7. 상세 화면 CTA 단순화를 위해 밈플릿 상세/리믹스 상세의 `밈플릿 목록으로` 버튼을 제거함.
- **이유**:
  1. 사용자 피드백대로 페이지 로딩 스켈레톤과 실이미지 로딩 스켈레톤이 다르게 보이면 전환 시 이질감이 발생함.
  2. 동일한 역할(썸네일 로딩) UI는 화면/상태와 무관하게 동일 시각 언어를 유지해야 함.
  3. 리믹스 상세의 주요 행동 흐름은 생성 진입보다 목록 복귀가 우선이라 CTA 단순화가 맞음.
- **구현 요약**:
  - `apps/web/src/components/PreviewFrame.tsx`
    - `loadingPlaceholder` prop 추가
    - 이미지 URL이 없는 초기 로딩에서도 실제 이미지 로딩과 동일한 스켈레톤 구조 렌더 지원
  - `apps/web/src/pages/ImageShareDetailPage.tsx`
    - 초기 로딩 이미지 스켈레톤을 `PreviewFrame` 기반으로 전환
    - 하단 보조 CTA(`밈플릿 목록으로`) 제거
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 초기 로딩 좌측 프리뷰 스켈레톤을 `PreviewFrame` 기반으로 전환
  - `apps/web/src/components/TemplateCardSkeletonGrid.tsx`
    - 썸네일 스켈레톤 마크업을 `ThumbnailCard` 실로딩 구조(`thumb-card-surface`, `thumb-card-media-surface`)와 동일하게 정렬
    - 카드/썸 표면 배경 클래스(`bg-card`, `bg-muted`, `bg-muted/80`) 제거
  - `apps/web/src/components/ThumbnailCard.tsx`
    - 카드/썸 표면 배경 클래스(`bg-card`, `bg-muted`, `bg-muted/80`) 제거
    - `onLoad` 이벤트 단일 의존을 보완하기 위해 `imageRef`와 `img.complete` 선확인 로직 추가
    - URL 전환 시 상태 재평가를 위해 `<img key={imageUrl}>` 적용
  - `apps/web/src/pages/ImageShareDetailPage.tsx`
    - 메인 이미지 로딩 상태를 `isMainImageLoaded + isMainImageError`로 분리
    - `mainImageRef` 기반 `img.complete` 동기화 및 `PreviewFrame`에 `imageRef/imageKey/onError` 전달
    - 하단 `밈플릿 목록으로` 버튼 제거
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 하단 `밈플릿 목록으로` 버튼 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-22_image_share_detail_loading_skeleton_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_template_detail_loading_skeleton_v2.png`
    - `docs/ai-context/screenshots/2026-02-22_templates_loading_skeleton_v2.png`
    - `docs/ai-context/screenshots/2026-02-22_thumbnail_card_no_background_templates_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_thumbnail_card_no_background_detail_remix_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_related_thumbnail_sticky_skeleton_check_loading_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_related_thumbnail_sticky_skeleton_check_loaded_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_remove_templates_list_button_template_detail_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_remove_templates_list_button_image_detail_v1.png`

## [2026-02-21] 인증 리다이렉트 `next` 플로우 통합 (로그인 유도/복귀)
- **결정**:
  1. 비로그인 상태에서 리믹스/에디터 보호 진입/헤더 로그인 진입 시 모두 `/login?next=...` 규칙으로 통일함.
  2. 프론트 공통 유틸(`loginNavigation`)을 도입해 `next` 정규화/로그인 URL 생성/리다이렉트를 단일화함.
  3. OAuth start/callback에 `next` 전달 및 복귀를 추가하고, 상대경로만 허용하도록 서버측 검증을 적용함.
- **이유**:
  1. 기존에는 인증 실패 시 홈(`/`)으로 이동하거나, 로그인 이후 원래 맥락으로 복귀되지 않아 리믹스 진입 UX가 끊겼음.
  2. 화면마다 로그인 이동 규칙이 달라 중복 구현/회귀 위험이 있었음.
  3. `next`를 허용할 때 오픈 리다이렉트 보안 리스크가 있어 서버 검증이 필요함.
- **구현 요약**:
  - 웹
    - `apps/web/src/lib/loginNavigation.ts` 추가 (`sanitizeNextPath`, `buildLoginPath`, `redirectToLoginWithNext`)
    - `apps/web/src/lib/apiFetch.ts` 401 리다이렉트를 `/login?next` 정책으로 전환
    - `apps/web/src/components/layout/MainHeader.tsx` 로그인 버튼에 현재 경로 `next` 부착
    - `apps/web/src/pages/TemplateShareDetailPage.tsx` 비로그인 리믹스 클릭 시 로그인 유도
    - `apps/web/src/pages/EditorPage.tsx` `/create?shareSlug|templateId` 직접 진입 비로그인 가드 추가
    - `apps/web/src/pages/LoginPage.tsx` `next`를 OAuth start 엔드포인트로 전달
    - `apps/web/src/hooks/useMemeEditor.ts` 게시/저장 액션 실행 전 세션 확인 + 비로그인 리다이렉트
  - API
    - `apps/api/src/modules/auth/routes.ts`
      - `/auth/google/start`에서 `next`를 안전하게 정규화 후 쿠키 보관
      - `/auth/google/callback`에서 `next` 복원/검증 후 `WEB_ORIGIN + next`로 복귀
      - state 불일치 시 `oauth_state`, `oauth_next` 쿠키 동시 정리
- **관련 이슈**:
  - #109, #110, #111, #112, #113, #114, #115
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm -r build`
  - 수동 검증
    - 템플릿 상세 `리믹스` 클릭 시 `/login?next=/create?shareSlug=...` 이동 확인
    - `/create?shareSlug=...` 직접 접근 시 로그인 리다이렉트 확인
    - 헤더 로그인 클릭 시 현재 경로 `next` 부착 확인
    - 네트워크 요청에서 `/api/v1/auth/google/start?next=...` 호출 확인
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-22_auth_next_remix_login_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_auth_next_editor_deeplink_guard_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_auth_next_header_login_v1.png`

## [2026-02-21] 밈플릿 상세 프리뷰/썸네일 역할 분리 + PreviewFrame 공통화
- **결정**:
  1. 밈플릿 상세 좌측 이미지는 카드 썸네일이 아니라 원본 확인용 `프리뷰`로 정의하고, 전용 공통 컴포넌트 `PreviewFrame`으로 분리함.
  2. 목록/리믹스 카드 썸네일은 기존 `ThumbnailCard` + `TemplateCardSkeletonGrid` 규칙을 유지해 썸네일 역할을 고정함.
  3. 프리뷰가 필요한 상세/시트 화면(`TemplateShareDetailPage`, `ImageShareDetailPage`, `MyTemplatesPage`)은 동일 `PreviewFrame`을 재사용함.
- **이유**:
  1. 사용자 피드백대로 상세 좌측 이미지는 썸네일이 아닌 프리뷰 성격이므로, 목록 썸네일과 동일 크기/비율 규칙을 강제하면 정보 전달력이 떨어짐.
  2. `프리뷰`와 `썸네일`의 역할을 분리해야 “상세 좌측은 크게 확인, 목록/리믹스는 카드형 통일”을 동시에 만족할 수 있음.
  3. 로딩/에러/빈상태 마크업을 컴포넌트로 공통화하면 이후 스타일 조정 시 누락 가능성이 줄어듦.
- **구현 요약**:
  - `apps/web/src/components/PreviewFrame.tsx` 추가
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 좌측 원본 영역을 `PreviewFrame` 기반으로 교체
  - `apps/web/src/pages/ImageShareDetailPage.tsx`
    - 메인 이미지 표시 영역을 `PreviewFrame` 기반으로 교체
  - `apps/web/src/pages/MyTemplatesPage.tsx`
    - 상세 시트 프리뷰 영역을 `PreviewFrame` 기반으로 교체
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm -r build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-22_previewframe_unify_templates_v1.png`
    - `docs/ai-context/screenshots/2026-02-22_previewframe_unify_template_detail_v1.png`

## [2026-02-21] 밈플릿 상세 좌측 썸네일 스켈레톤 라운드 체감 정렬
- **결정**:
  1. 밈플릿 상세 로딩의 좌측 원본 썸네일 스켈레톤 래퍼에 `overflow-hidden rounded-xl`을 적용함.
- **이유**:
  1. 사용자 피드백대로 좌측 원본 썸네일 스켈레톤은 리믹스 카드 대비 라운드 체감이 약하게 보였음.
  2. 로딩 상태도 완료 상태(`overflow-hidden rounded-xl`)와 동일 구조를 가져야 시각 일관성이 유지됨.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 좌측 썸네일 스켈레톤 래퍼 클래스에 `overflow-hidden rounded-xl` 추가
- **검증**:
  - `pnpm --filter memeplate-web lint`

## [2026-02-21] 밈플릿 상세: 원본/리믹스 썸네일 스켈레톤 시각 규칙 통일
- **결정**:
  1. 밈플릿 상세 로딩의 좌측 원본 썸네일 스켈레톤을 리믹스 카드 스켈레톤과 동일한 규칙으로 정렬함.
  2. 좌측 썸 영역의 외곽선은 제거하고, `h-52 + bg-muted` 톤으로 통일함.
- **이유**:
  1. 사용자 피드백대로 상세 화면에서 원본 썸네일 스켈레톤과 리믹스 썸네일 스켈레톤이 서로 달라 보였음.
  2. 동일 역할(썸네일 로딩) 요소는 동일한 시각 언어를 써야 일관성이 유지됨.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 좌측 썸네일 스켈레톤 영역 `h-56 p-2 + border` -> `h-52 bg-muted p-2 + no-border`로 변경
- **검증**:
  - `pnpm --filter memeplate-web lint`

## [2026-02-21] 썸네일 스켈레톤 외곽선 제거(배경 유지)
- **결정**:
  1. 썸네일 스켈레톤 썸 영역의 `border`를 제거하고 배경(`bg-muted`)은 유지함.
- **이유**:
  1. 사용자 요청대로 스켈레톤의 면(배경 톤)은 유지하면서 외곽선만 제거해 더 플랫한 인상을 맞추기 위함.
- **구현 요약**:
  - `apps/web/src/components/TemplateCardSkeletonGrid.tsx`
    - 썸 영역 스켈레톤 클래스에서 `border border-border` 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`

## [2026-02-21] 웹 UI 스타일 일원화 1차 (#108)
- **결정**:
  1. 상세/목록/썸네일 로딩 UI를 공통 `Skeleton` primitive 기반으로 정렬함.
  2. `ImageShareDetailPage`를 템플릿 상세와 동일한 무보더 카드 톤으로 통일함.
  3. destructive 액션의 red 하드코딩 클래스를 semantic token 기반으로 치환함.
  4. 루트 배경과 primitive radius 일부를 공통 규칙으로 정렬함.
- **이유**:
  1. 전역 토큰 체계는 정리되어 있었지만 화면 단위에서 border/스켈레톤/상태색 편차가 누적되어 일관성이 깨졌음.
  2. 사용자 피드백대로 상세 화면과 목록/로딩 상태가 서로 다른 디자인 언어를 쓰는 문제가 반복됨.
  3. 하드코딩 red/gradient 의존은 다크모드 및 이후 스타일 수정 시 회귀 위험이 높음.
- **구현 요약**:
  - `apps/web/src/components/ui/skeleton.tsx`
    - 기본 톤을 `bg-primary/10`에서 `bg-border/70` 계열로 변경
  - `apps/web/src/components/TemplateCardSkeletonGrid.tsx`
  - `apps/web/src/components/ThumbnailCard.tsx`
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
  - `apps/web/src/pages/ImageShareDetailPage.tsx`
    - 공통 `Skeleton` 적용 및 상세 로딩/표시 톤 정렬
  - `apps/web/src/pages/MyTemplatesPage.tsx`
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - destructive red 유틸리티를 semantic destructive 토큰 클래스로 치환
  - `apps/web/src/pages/LoginPage.tsx`
  - `apps/web/src/components/layout/MySectionLayout.tsx`
    - 루트 배경을 `bg-app-surface`로 정렬
  - `apps/web/src/components/ui/popover.tsx`
  - `apps/web/src/components/ui/tooltip.tsx`
    - radius를 `rounded-xl`로 통일
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm -r build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-21_style_unify_templates_light_v1.png`
    - `docs/ai-context/screenshots/2026-02-21_style_unify_template_detail_light_v1.png`
    - `docs/ai-context/screenshots/2026-02-21_style_unify_templates_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-21_style_unify_template_detail_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-21_style_unify_login_light_v1.png`
    - `docs/ai-context/screenshots/2026-02-21_style_unify_login_dark_v1.png`

## [2026-02-21] 밈플릿 상세 좌/우 패널 외곽선 제거
- **결정**:
  1. 상세 페이지 좌측(원본 정보)과 우측(리믹스) 패널의 border를 제거함.
  2. 초기 로딩 스켈레톤 구간의 패널도 동일하게 border를 제거해 상태 전환 시 시각 톤을 맞춤.
- **이유**:
  1. 사용자 피드백대로 상세 화면 카드 외곽선이 과해 분절감이 생겼음.
  2. 로딩 전/후 톤이 다르면 전환 시 이질감이 커지므로 동일 규칙 적용이 필요함.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 초기 로딩 좌/우 패널 wrapper의 `border border-border` 제거
    - 로딩 완료 좌/우 패널 wrapper의 `border border-border` 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-21] 밈플릿 상세 로딩 높이 안정화: 스켈레톤 밀도 축소 + min-height 정렬
- **결정**:
  1. 상세 페이지 리믹스 영역의 skeleton 개수를 `6`에서 `2`로 축소함.
  2. 리믹스 로딩 상태와 빈상태에 동일한 최소 높이(`min-h-[280px]`)를 적용함.
- **이유**:
  1. 상세 진입 직후 skeleton이 과도하게 길어져 초기 화면이 불필요하게 커 보였음.
  2. 로딩 후 빈상태로 전환될 때 높이 차이로 인해 UI가 “꿈틀대는” 체감이 발생했음.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - `DETAIL_RELATED_SKELETON_COUNT = 2` 상수 추가
    - 초기 로딩/리믹스 로딩에서 `TemplateCardSkeletonGrid` 개수를 2개로 조정
    - 로딩 컨테이너와 빈상태에 `min-h-[280px]` 적용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-21] 밈플릿 목록/상세 카드 스켈레톤 공통 컴포넌트화
- **결정**:
  1. 목록과 상세에서 공통으로 쓰는 카드형 로딩 skeleton을 `TemplateCardSkeletonGrid`로 추출함.
  2. 목록(`min 240px`)과 상세(`min 220px`)는 컴포넌트 props(`minItemWidth`)로만 차이를 두고 마크업/톤은 동일하게 유지함.
- **이유**:
  1. 동일 UI를 페이지별로 중복 관리하면 스타일 조정 시 누락/회귀가 반복됨.
  2. 사용자가 지적한 “목록/상세 스켈레톤 불일치”를 구조적으로 방지하려면 단일 소스가 필요함.
- **구현 요약**:
  - `apps/web/src/components/TemplateCardSkeletonGrid.tsx` 추가
  - `apps/web/src/pages/TemplatesPage.tsx` 로딩 분기에서 공통 컴포넌트 사용
  - `apps/web/src/pages/TemplateShareDetailPage.tsx` 초기 로딩/리믹스 로딩 분기에서 공통 컴포넌트 사용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-21] 밈플릿 상세 로딩 스켈레톤을 목록 톤으로 통일
- **결정**:
  1. 상세 페이지의 로딩 스켈레톤에서 강한 그라디언트(`from-muted to-border`) 사용을 제거함.
  2. 목록 페이지 스켈레톤과 동일한 색 강도(`bg-muted`, `bg-border/70~80`)로 맞춤.
  3. 연관 이미지 스켈레톤 카드 구조를 목록과 동일하게 `wrapper border-transparent + 내부 썸네일 border-border` 패턴으로 통일함.
- **이유**:
  1. 사용자 피드백대로 목록/상세 로딩 뷰의 톤 차이가 커서 서비스 일관성이 떨어졌음.
  2. 스켈레톤은 콘텐츠 위계보다 페이지 간 일관된 로딩 인상을 우선해야 함.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 좌측 메타/이미지 skeleton bar 색 강도 완화 (`bg-border` -> `bg-border/70~80`)
    - 좌측 메인 썸네일 skeleton을 gradient에서 단일 `bg-muted + border-border`로 변경
    - 우측 연관 카드 skeleton wrapper/thumbnail/body skeleton 클래스를 목록 페이지와 동일 톤으로 변경
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-21] 밈플릿 상세 UI 정리 2차: 썸네일/정렬 외곽선 제거 + 빈상태 아이콘화
- **결정**:
  1. 상세 좌측 원본 썸네일 컨테이너의 테두리를 제거함.
  2. 리믹스 정렬 토글(`최신순/인기순`) 래퍼의 테두리를 제거함.
  3. 리믹스가 없을 때 텍스트 단일 문구 대신 아이콘 + 타이틀 + 보조 설명 형태의 빈상태 컴포넌트로 변경함.
- **이유**:
  1. 사용자 피드백대로 상세 화면에서 외곽선 강조가 과하고 카드가 분절되어 보였음.
  2. 빈상태는 단일 문장보다 시각적 힌트(아이콘)와 다음 액션 유도 문구가 함께 있을 때 인지성이 높음.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 썸네일 래퍼 클래스에서 `border border-border` 제거
    - 정렬 토글 래퍼 클래스에서 `border border-border` 제거
    - `relatedImages.length === 0` 분기 UI를 `mdiImageOffOutline` 아이콘 기반 빈상태로 교체
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-21_template_detail_ui_cleanup_v1.png`

## [2026-02-21] 밈플릿 상세 썸네일 즉시 표시 레이스 보정
- **결정**:
  1. 상세 메인 썸네일 로딩 상태(`isMainImageLoaded`)를 `onLoad` 이벤트만으로 판단하지 않고, URL 변경 시점에 `img.complete && naturalWidth > 0`를 함께 확인함.
  2. 상세 썸네일에도 목록 카드와 동일하게 `onError` fallback 상태를 추가함.
  3. 상세 썸네일 `<img>`에 `key={template.thumbnailUrl}`를 부여해 이미지 URL 전환 시 로드 이벤트를 안정적으로 재평가함.
- **이유**:
  1. 목록에서 상세로 즉시 이동할 때 캐시 히트/렌더 타이밍에 따라 `onLoad`가 기대대로 반영되지 않으면 이미지가 `opacity-0`에 남아 “새로고침 후에만 보이는” 체감이 발생할 수 있음.
  2. 실패 상태를 분리하지 않으면 로딩 skeleton이 무기한 유지되어 원인 파악이 어려움.
- **구현 요약**:
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - `isMainImageError`, `mainImageRef` 상태 추가
    - `template.thumbnailUrl` effect에서 `img.complete` 선확인 후 로딩 상태 동기화
    - 메인 `<img>`에 `onLoad/onError`, `key={template.thumbnailUrl}` 적용
    - 에러 시 `미리보기를 불러오지 못했습니다.` 오버레이 노출
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 수동 검증: `/templates` 목록 클릭 직후 `/templates/s/:shareSlug` 진입 시 새로고침 없이 썸네일 즉시 표시 확인
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-21_template_detail_thumbnail_direct_nav_v1.png`

## [2026-02-20] 텍스트/도형 레이어를 이미지(workspace) 내부로 제한
- **결정**:
  1. 배경(`name=background`)을 제외한 선택 객체는 이동/수정 시 workspace 경계를 벗어나지 못하도록 제한함.
  2. 경계 계산은 객체 스케일 + 회전 각도를 반영한 AABB 기반으로 처리함.
- **이유**:
  1. 사용자 요청대로 텍스트/도형 레이어가 이미지 밖으로 나가지 않게 해야 편집 결과 예측 가능성이 높아짐.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `clampObjectInsideWorkspace` 유틸 추가
    - `object:moving`, `object:modified`, `object:added` 경로에서 클램프 적용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-20_object_boundary_clamp_shape_v1.png`

## [2026-02-20] 업로드 이미지 작업영역 점선 외곽선 제거
- **결정**:
  1. 캔버스 백드롭에서 workspace frame(점선 `strokeRect`) 렌더를 제거함.
- **이유**:
  1. 사용자 요청대로 업로드 이미지의 외곽 점선 표시를 없애 더 단정한 편집 화면을 유지하기 위함.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `drawEditorBackdrop`의 workspace frame 계산/점선 렌더 블록 삭제
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-20_editor_workspace_frame_removed_v1.png`

## [2026-02-20] 에디터 작업 그리드의 줌/팬 연동 복구 (world 기준)
- **결정**:
  1. 에디터 작업 그리드를 screen 고정이 아닌 world 좌표계로 다시 전환함.
  2. 결과적으로 작업 그리드는 업로드 이미지/객체와 동일하게 viewport zoom/pan을 따라 이동/확대됨.
- **이유**:
  1. “에디터다운” 편집 경험에서는 정렬 기준 그리드가 작업 공간과 함께 움직여야 좌표 감각이 일관됨.
  2. 레이아웃(UI 패널) 고정은 유지하되, 캔버스 내부 작업 그리드는 편집 대상과 동일 좌표계를 공유해야 함.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `drawEditorGrid`에서 world bounds(`worldLeft/Top/Right/Bottom`) 계산 복원
    - world line을 screen 좌표로 투영해 렌더(`screenX/screenY`)
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-20_editor_grid_worldspace_zoom100_v1.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_grid_worldspace_zoom110_v1.png`

## [2026-02-20] 에디터 배경(그리드)과 워크스페이스 이동 좌표계 분리
- **결정**:
  1. 에디터 그리드는 viewport pan/zoom 영향을 받지 않는 screen 좌표계로 고정함.
  2. 업로드 이미지/오브젝트/워크스페이스 프레임만 viewport pan/zoom을 적용함.
  3. 사용자가 기대하는 이동 조작을 위해 `Space + 좌클릭 드래그`, `중클릭 드래그` 팬 인터랙션을 복구함.
- **이유**:
  1. 기존 구현은 그리드도 viewport 변환을 같이 타서 “이미지와 에디터 레이아웃이 같이 움직이는” 체감이 발생했음.
  2. 에디터 배경은 고정하고 편집 대상만 이동해야 일반 편집기 UX와 일치함.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `drawEditorGrid`에서 viewport 기반 world->screen 계산 제거
    - 그리드 라인을 view(screen) 크기 기준으로 고정 렌더
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `Space` 키 상태 추적 및 pointer pan 세션(`pointerdown/move/up`) 복구
    - pan 중 `canvasInstance.panViewportByCssDelta` 호출
  - `apps/web/src/index.css`
    - `is-pan-ready`, `is-pan-dragging` 커서 스타일 적용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-20_editor_pan_decoupled_grid_v1.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_pan_decoupled_grid_zoom110_v1.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_pan_decoupled_grid_spacepan_v1.png`

## [2026-02-20] 오브젝트 이동 경계 해제 (작업영역 밖 이동 허용)
- **결정**:
  1. 오브젝트 이동 시 작업영역 경계 안으로 되돌리는 clamp 로직을 제거함.
- **이유**:
  1. 사용자 피드백대로 오브젝트가 특정 영역에 갇혀 보였고, 일반 편집기처럼 자유 이동이 필요했음.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `object:moving` 이벤트의 `enforceBoundaries` 로직 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-20] 에디터 라이트/다크 전환 시 캔버스 재렌더 동기화
- **결정**:
  1. 캔버스 엔진에서 루트 테마 속성(`data-theme/style/class`) 변경을 감지해 즉시 재렌더함.
- **이유**:
  1. 캔버스 배경/그리드는 CSS 변수 기반 렌더인데, 테마 전환 시 프레임 갱신 트리거가 없으면 이전 테마가 남아 보일 수 있음.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `themeObserver` 필드 추가
    - `initThemeObserver`에서 루트 속성 변경을 감시하고 `requestRender` 호출
    - `dispose`에서 observer 정리
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-20_editor_theme_sync_light_v1.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_theme_sync_dark_v1.png`

## [2026-02-20] 이동 체감 보정 1차 (fit 상태 이동성 강화)
- **결정**:
  1. viewport pan bounds에 overscroll 여유를 두어 100%/fit 상태에서도 이동이 가능하도록 변경함.
  2. 일반 휠 팬을 `zoom > 100%` 조건 없이 항상 허용함.
  3. fit 상태(`zoom=100%`)는 중앙 정렬(`centerViewport`)을 기본으로 유지함.
- **이유**:
  1. 사용자 피드백대로 기존 제한은 “이동이 거의 안 되는” 체감으로 이어졌음.
  2. 트랙패드/휠 기반 팬은 확대 여부와 무관하게 동작해야 에디터 사용성이 일관됨.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `getViewportPanBounds`에 overscroll 범위 추가
    - `centerViewport` 메서드 추가
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - viewport 반영 effect에서 fit 상태는 `centerViewport` 사용
    - wheel 팬 조건에서 `zoom > 100%` 제한 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_canvas_editor_pan_enabled_v1.png`

## [2026-02-20] 에디터 배경을 Canvas 렌더 내부로 이관 + 팬 인터랙션 보강
- **결정**:
  1. 에디터 느낌의 배경(그리드/워크스페이스 프레임)을 CSS 스테이지가 아닌 `Canvas` 엔진 렌더에서 직접 그림.
  2. 캔버스 이동은 휠 팬 외에 `스페이스 + 드래그`, `중클릭 드래그`를 추가 지원함.
- **이유**:
  1. 사용자가 원하는 “캔버스 자체가 에디터스러운 느낌”은 DOM 배경보다 캔버스 좌표계에서 렌더해야 줌/팬 시 일관됨.
  2. 편집기형 UX에서는 줌 이후 포지션 이동이 휠만으로는 제한적이어서 hand-pan 제스처가 필요함.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `drawEditorBackdrop`, `drawEditorGrid` 추가
    - `render`에서 객체 렌더 전에 캔버스 내부 배경/그리드/워크스페이스 프레임 렌더
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `Space` 키 상태 추적
    - `pointerdown/move/up` 기반 `스페이스+좌드래그`, `중클릭 드래그` 팬 처리
    - 기존 커서 앵커 줌(`Ctrl/Cmd + Wheel`) 유지
  - `apps/web/src/index.css`
    - 스테이지 고정 그리드 배경 제거
    - 팬 상태 클래스(`is-pan-ready`, `is-pan-dragging`)에 맞춘 `grab/grabbing` 커서 스타일 추가
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷:
    - `docs/ai-context/screenshots/2026-02-20_canvas_editor_style_internal_v2.png`
    - `docs/ai-context/screenshots/2026-02-20_canvas_editor_style_internal_pan_zoom_v1.png`

## [2026-02-20] 업로드 후 캔버스 흰 배경 제거
- **결정**:
  1. 캔버스 요소 기본 배경색을 제거하고 투명 배경으로 고정함.
- **이유**:
  1. 업로드 이미지 비율과 작업영역 비율이 다를 때 캔버스 여백이 흰색으로 보이며 에디터 톤이 깨지는 문제가 있었음.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `editor-canvas-element` 클래스에서 `bg-card`를 제거하고 `bg-transparent` 적용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_editor_canvas_transparent_bg_v1.png`

## [2026-02-20] 캔버스 무여백 full-fill 정렬 + 라운드 제거 + 커서 앵커 줌
- **결정**:
  1. 캔버스 스테이지를 좌측 작업영역에 여백 없이 가득 채우도록 정렬함.
  2. viewport/canvas 라운드를 제거해 각진 에디터형 캔버스 표면으로 통일함.
  3. `Ctrl/Cmd + Wheel` 줌 중심을 화면 중앙 고정이 아니라 커서 위치(anchor)로 변경함.
- **이유**:
  1. 사용자 피드백대로 캔버스가 이미지 크기 박스처럼 보이지 않고 작업영역 전체를 점유해야 편집 맥락이 자연스러움.
  2. 라운드 모서리/추가 여백은 편집기보다 카드형 UI 인상을 주어 몰입을 떨어뜨림.
  3. 커서 기준 줌이 실제 편집 포인트 확대에 더 직관적이며 팬 이동량을 줄임.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - 캔버스 래퍼 데스크탑 여백(`md:py/pl/pr`) 제거
    - 캔버스 컨테이너 라운드 제거
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 스테이지 패딩 제거 + viewport 라운드 클래스 제거
    - `Ctrl/Cmd + Wheel` 처리 시 커서 좌표를 viewport anchor로 계산해 `setViewportZoom(..., anchor)` 적용
  - `apps/web/src/index.css`
    - `editor-canvas-element` 라운드/그림자 제거
    - 스테이지에 에디터 톤의 은은한 그리드 배경 추가
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 수동 검증:
    - `/create`에서 업로드 후 DOM 측정 결과 `canvas(1092x746) == viewport(1092x746) == stage(1092x746)` 확인
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_editor_full_canvas_flat_v3.png`

## [2026-02-20] 풀 캔버스 뷰포트 전환 (canvas가 화면 전체 점유)
- **결정**:
  1. 캔버스 렌더 영역을 “이미지 크기만큼”에서 “뷰포트 전체”로 전환함.
  2. 이를 위해 `Canvas` 엔진에서 `scene(workspace)`와 `view(screen)` 크기를 분리 관리함.
- **이유**:
  1. 사용자 피드백대로 에디터 캔버스가 화면 전체 작업영역을 차지해야 편집 맥락이 자연스러움.
  2. 이미지 해상도와 화면 표시영역을 분리해야 확대/축소/팬/포인터 정합성을 동시에 유지할 수 있음.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `sceneWidth/sceneHeight`, `viewWidth/viewHeight` 분리
    - `setViewportSize(width, height)` 추가
    - viewport pan bounds를 `scene` vs `view` 기준으로 재계산
    - `getPointer`를 `view -> scene` 변환으로 보정
    - export(`toDataURL`)를 viewport와 무관한 scene 좌표 기준으로 고정
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 캔버스 스타일을 `width/height: 100%`로 전환
    - `canvasInstance.setViewportSize(...)` + `setViewportZoom(fitScale * userZoom)` 연동
    - textarea 오버레이 좌표를 screen 단위 변환식으로 보정
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 수동 검증:
    - `/create`에서 업로드 후 DOM 측정 결과 `canvas(776x622) == viewport(776x622)` 확인
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_editor_full_canvas_viewport_v1.png`

## [2026-02-20] 줌 처리 구조 전환 (DOM 레이어 스케일 -> 풀캔버스 viewport)
- **결정**:
  1. 줌 처리 주체를 `MemeCanvas` DOM 레이어(transform)에서 `Canvas` 엔진 내부 viewport(`zoom`, `pan`)로 전환함.
  2. `Ctrl/Cmd + Wheel`은 기존대로 줌 입력으로 유지하고, 일반 휠 입력은 줌 인 상태(`>100%`)에서 캔버스 팬으로 해석함.
  3. 텍스트 편집 textarea 오버레이 좌표는 `viewport zoom/pan` 변환을 포함해 계산하도록 수정함.
- **이유**:
  1. 사용자 피드백대로 “캔버스 자체가 줌을 흡수하는” 이질감을 줄이고, 툴형 편집기 관점의 좌표 일관성을 확보하기 위함.
  2. 이후 핀치/커서 중심 줌/미니맵 등 확장 기능을 엔진 레벨에서 구현하기 쉬운 구조로 정리하기 위함.
- **구현 요약**:
  - `apps/web/src/core/canvas/Canvas.ts`
    - `viewportZoom`, `viewportPanX/Y` 상태 추가
    - `setViewportZoom`, `panViewportByCssDelta`, `resetViewport`, `getViewportTransform` 추가
    - `render`에 viewport transform 적용
    - `getPointer`를 viewport 역변환 좌표계로 변경
    - `drawControls` 크기 보정 스케일에 viewport zoom 반영
    - viewport가 적용된 상태에서도 export 결과가 원본 논리 좌표 기준이 되도록 `toDataURL` 분기 보강
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - DOM zoom wrapper 제거, 캔버스는 fit 크기 고정
    - `Canvas` viewport 이벤트 구독(`viewport:changed`)으로 오버레이 좌표 동기화
    - 일반 휠 팬 + `Ctrl/Cmd + Wheel` 줌 분기 처리
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 수동 검증:
    - `/create`에서 `+`로 `110%` 확대 후 일반 휠 입력이 `preventDefault`되며 캔버스 픽셀 샘플 checksum이 변경되어 팬 반영 확인
    - `Ctrl/Cmd + Wheel` 입력 후 줌 퍼센트가 `110% -> 100%`로 갱신됨
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_editor_zoom_fullcanvas_v1.png`

## [2026-02-20] 줌 적용 방식 보정 (캔버스 리사이즈 -> transform 레이어)
- **결정**:
  1. 줌 시 캔버스 요소 자체의 CSS `width/height`를 직접 키우는 방식 대신, `fit 크기`를 고정하고 별도 래퍼 레이어에 `transform: scale(...)`을 적용함.
  2. 스크롤 팬은 줌 레이어 외곽 래퍼의 실제 치수(`fit * zoom`)로 처리해 뷰포트 오버플로 동작을 명확히 유지함.
- **이유**:
  1. 기존 방식은 “캔버스 자체가 커지면서 줌을 흡수하는” 체감이 있어 사용자 피드백 기준으로 어색함이 있었음.
  2. fit 레이아웃과 사용자 줌을 분리하면 줌 동작이 더 예측 가능하고, 이후 팬/미니맵 확장도 단순해짐.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `fitDisplayWidth/Height`와 `zoomedDisplayWidth/Height`를 분리 계산
    - 캔버스는 fit 크기로 렌더하고, 상위 zoom 레이어에만 scale 적용
    - overlay 좌표 업데이트 effect 의존성에 zoomed 치수 반영
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-20] 에디터 줌 기능 재도입 (패널 컨트롤 + 단축키 + Ctrl/Cmd+Wheel)
- **결정**:
  1. Auto-fit 기반 표시 스케일 위에 사용자 줌 배율(`25%~400%`)을 곱하는 방식(`fitScale * zoom`)으로 줌 동작을 재도입함.
  2. 줌 제어 진입점을 패널 버튼(`-`, 퍼센트, `+`, `맞춤`) + 단축키(`Ctrl/Cmd + +`, `Ctrl/Cmd + -`, `Ctrl/Cmd + 0`) + `Ctrl/Cmd + Wheel`로 통합함.
  3. 줌 인 상태에서는 캔버스 뷰포트를 `overflow-auto`로 전환해 스크롤 팬을 허용하고, 텍스트 편집 오버레이 좌표 계산에 스크롤 이벤트를 반영함.
- **이유**:
  1. 사용자가 요청한 “직접 조절 가능한 줌”을 빠르게 복구하면서 기존 auto-fit 레이아웃 회귀를 피하기 위함.
  2. 버튼/단축키/휠 간 동작을 동일 상태(`zoom`)로 수렴시켜 입력 채널별 불일치를 줄이기 위함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `zoom` 상태 및 `zoomIn`, `zoomOut`, `resetZoom`, `zoomByWheelDelta` 추가
    - `Ctrl/Cmd + +`, `Ctrl/Cmd + -`, `Ctrl/Cmd + 0` 단축키 처리 추가
    - 배경/템플릿 로드 시 줌을 `100%`(`zoom = 1`)로 초기화
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 표시 스케일을 `fitScale * zoom`으로 변경
    - `Ctrl/Cmd + Wheel` 이벤트를 줌 액션에 연결
    - 줌 인 상태에서 뷰포트 `overflow-auto` 적용
    - 오버레이 위치 계산에 뷰포트/윈도우 스크롤 이벤트 반영
  - `apps/web/src/components/MemeEditor.tsx`
    - 우측 패널(데스크탑/모바일 공통)에 줌 컨트롤 UI 추가
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 수동 검증:
    - `/create`에서 `+/-` 버튼 클릭 시 줌 퍼센트가 `100 -> 110 -> 100`으로 갱신됨
    - `Ctrl/Cmd + +`, `Ctrl/Cmd + 0` 단축키 동작 확인
    - `Ctrl/Cmd + Wheel` 이벤트로 퍼센트가 `120 -> 110`으로 감소하는 것 확인
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_editor_zoom_controls_v1.png`

## [2026-02-20] 이미지 업로드 토스트 제거
- **결정**:
  1. 배경 이미지 업로드 성공 시 출력되던 안내 토스트를 제거함.
  2. 배경 이미지 업로드 실패 시 출력되던 에러 토스트를 제거함.
- **이유**:
  1. 사용자 요청대로 업로드 과정에서 토스트 노출을 없애 편집 흐름을 방해하지 않도록 하기 위함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `setBackgroundImage` 성공 경로의 `toast.info(...)` 제거
    - `setBackgroundImage` 실패 경로의 `toast.error(...)` 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 수동 검증: `/create`에서 이미지 업로드 후 우하단 토스트 미노출 확인
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_upload_toast_removed_v1.png`

## [2026-02-20] 업로드/내보내기 해상도 정책 800 상한으로 단순화
- **결정**:
  1. 편집 작업영역(workspace) 정규화 상한을 `max edge 8192`에서 `max 800x800` 바운딩으로 전환함(비율 유지, 업스케일 없음).
  2. 다운로드/클립보드/리믹스 게시 이미지 출력도 동일한 `max 800` 상한 정책으로 통일함.
  3. 렌더 백킹 스토어 안정성 상한(8192/16MP)은 별도 상수로 유지해 화면 표시 품질 저하를 방지함.
- **이유**:
  1. 밈 에디터의 제품 방향(빠른 편집/공유) 기준에서 과도한 고해상도 보존보다 일관된 경량 출력이 우선임.
  2. 기존에는 업로드 크기 상한(8192)과 게시/다운로드 배율(`multiplier: 2`)이 남아 실제 출력이 필요 이상으로 커질 수 있었음.
- **구현 요약**:
  - `apps/web/src/constants/canvasLimits.ts`
    - 작업영역 상한(`MAX_WORKSPACE_*`)과 렌더 상한(`MAX_RENDER_CANVAS_*`) 상수를 분리
  - `apps/web/src/hooks/useMemeEditor.ts`
    - 작업영역 정규화 상한을 `800` 기준으로 변경
    - 다운로드/PDF/클립보드/리믹스 게시 export 크기를 공통 `getBoundedImageSize`(`max 800`)로 통일
    - export 배율을 `multiplier: 1`로 조정
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 렌더 스케일 계산에서 렌더 전용 상수(`MAX_RENDER_CANVAS_*`) 사용으로 분리
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 수동 검증: `2880x1620` 업로드 시 캔버스 백킹 `1600x900`(DPR 2)로 확인되어 작업영역 `800x450`로 축소 적용
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_workspace_max_800_upload_v1.png`

## [2026-02-20] 텍스트 최대 크기 탐색 보정(잘리기 직전 크기 고정) + 텍스트 박스 클리핑 적용
- **결정**:
  1. `resolveTextLayout`의 폰트 탐색에서 고정 100회 제한을 제거하고, 설정된 최대 폰트부터 최소 폰트까지 내려가며 실제 fit되는 최대 크기를 선택함.
  2. `Textbox.draw`에서 임의 라인 스킵 조건(`+5` 여유치 기반) 대신 텍스트 박스 clip 경계를 사용함.
- **이유**:
  1. 최대 폰트가 큰 경우 100회 제한 때문에 fit 지점까지 도달하지 못해 텍스트가 갑자기 사라지거나 과대 렌더되는 문제가 있었음.
  2. draw 단계의 조건부 라인 스킵은 경계 근처에서 라인이 갑자기 사라지는 체감을 유발하므로, clip 기반 경계 처리로 일관성을 높일 필요가 있었음.
- **구현 요약**:
  - `apps/web/src/core/canvas/textLayout.ts`
    - 폰트 크기 탐색 로직을 “최대값 -> 최소값” 전수 탐색으로 변경
    - 폭 초과 단어 분할 fallback에서 라인 정보를 유지해 레이아웃 결과가 비지 않도록 보정
  - `apps/web/src/core/canvas/Textbox.ts`
    - 텍스트 렌더 전에 박스 경계 clip 적용
    - 라인별 `y` 임계값 스킵 조건 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷: `docs/ai-context/screenshots/2026-02-20_text_max_fit_clip_v1.png`

## [2026-02-20] 텍스트 특정 크기에서 사라지는 케이스 보정(문자 단위 줄바꿈 fallback)
- **결정**:
  1. 긴 단어(무공백 포함)가 텍스트 박스 폭을 초과하면 문자 단위로 강제 분할해 줄바꿈하도록 변경함.
- **이유**:
  1. 기존 단어 단위 래핑에서는 특정 문자열이 폭을 넘으면 `fitsWidth=false`가 반복되어 결과적으로 표시 텍스트가 비는 체감이 발생할 수 있었음.
- **구현 요약**:
  - `apps/web/src/core/canvas/textLayout.ts`
    - `wrapParagraph`에 `splitLongWord` fallback 추가
    - 폭 초과 단어를 문자 단위 세그먼트로 분해해 라인 생성
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-20] 레이어 리스트 라벨 제거(아이콘 전용) + 텍스트 최대크기 동작 분석
- **결정**:
  1. 레이어 리스트의 타입 라벨(텍스트/사각형/원형)을 제거하고 아이콘만 노출함.
  2. 레이어 타입 식별성을 위해 텍스트/사각형/원형에 서로 다른 아이콘을 적용함.
  3. 텍스트 `최대 크기` 이슈는 즉시 기능 변경 없이 원인 분석만 수행함.
- **이유**:
  1. 사용자 요청대로 레이어 구분을 아이콘 중심으로 단순화해 시각 밀도를 낮추기 위함.
  2. `최대 크기`는 의도상 “상한값”이며, 텍스트가 박스를 벗어나 보이는 체감은 클리핑 미구현 영향 가능성이 큼.
- **구현 요약**:
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 레이어 라벨 텍스트 제거
    - 타입 아이콘 매핑 추가(`text -> mdiFormatColorText`, `rect -> mdiSquare`, `circle -> mdiCircle`)
- **분석 결과(코드 근거)**:
  - `최대 크기` 입력은 `fontSize` 상한으로 동작 (`MemePropertyPanel`)
  - 렌더 시 `resolveTextLayout`에서 박스 `width/height` 기준 자동 축소를 수행 (`core/canvas/textLayout.ts`)
  - 다만 `Textbox.draw`에 텍스트 영역 clip이 없어 스트로크/특정 글리프/케이스에서 경계 밖으로 보일 수 있음 (`core/canvas/Textbox.ts`)
  - TODO에 `텍스트 영역 클리핑`이 미완료 항목으로 남아 있음 (`docs/ai-context/todo.md`)
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-20] 모바일 에디터 디자인 정렬 1차: 데스크탑과 동일 패턴 적용
- **결정**:
  1. 모바일 패널 상단 툴/히스토리 영역을 데스크탑과 같은 시각 패턴으로 통일함.
  2. 모바일의 분할형 박스(`border`로 끊긴 다단 섹션)를 단일 카드형 패널로 합침.
- **이유**:
  1. 사용자 요청대로 모바일도 데스크탑과 동일한 디자인 언어를 사용하도록 맞추기 위함.
  2. 툴/히스토리 컨트롤이 분절되어 보이던 모바일 구조를 단순화해 일관성 및 시인성을 높이기 위함.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - `md:hidden` 모바일 블록을 데스크탑 패널과 동일 톤 구조로 재구성
    - 모바일 툴 버튼 렌더를 `renderToolButton(tool, true, true)`로 변경
    - 모바일 `undo/redo`를 데스크탑과 동일한 2열 버튼 스타일로 변경
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-20_editor_mobile_style_matched_v1.png`

## [2026-02-20] 데스크탑 에디터 스타일 정렬 5차: 편집 패널 배경 복구
- **결정**:
  1. 캔버스 쪽 별도 배경 제거는 유지하고, 우측 편집 패널 배경만 복구함.
- **이유**:
  1. 사용자 피드백대로 에디터 패널은 다시 살아 있어야 하며, 제거 대상은 캔버스 쪽 별도 배경이었음.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - 우측 패널 클래스에 `md:bg-editor-sidebar-bg/88` 복구
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`

## [2026-02-20] 데스크탑 에디터 스타일 정렬 4차: 상단 도구 상태 라벨 제거
- **결정**:
  1. 우측 패널 상단의 도구 상태 텍스트(`도구 선택/편집/공유`)를 제거함.
- **이유**:
  1. 상단 `편집/공유` 버튼이 이미 현재 상태를 표현하고 있어 라벨이 중복 정보였음.
  2. 사용자 피드백대로 패널의 정보 밀도를 더 낮추기 위함.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - 우측 패널 헤더의 상태 라벨 `<p>` 제거
    - 미사용 `activeToolLabel` 계산 로직 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_light_v4.png`

## [2026-02-20] 데스크탑 에디터 스타일 정렬 3차: 캔버스 추가 배경 제거 + 편집 액션 섹션 단순화
- **결정**:
  1. 데스크탑 캔버스 영역의 별도 장식 배경(`editor-desktop-canvas-stage` radial layer)을 제거함.
  2. 캔버스 래퍼의 추가 배경 클래스(`md:bg-editor-canvas-bg/80`)를 제거함.
  3. `텍스트/도형` 버튼을 감싸던 외곽 섹션(rounded/border/bg)을 제거하고 버튼만 노출함.
- **이유**:
  1. 사용자 피드백대로 캔버스 영역에 배경이 한 겹 더 얹혀 보이고, 편집 액션 상단 섹션이 과하다는 문제가 있었음.
  2. 전역 non-border 스타일 원칙과도 더 정합한 상태로 맞추기 위함.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `@media (min-width: 768px)`의 `.editor-desktop-canvas-stage` 배경 이미지 블록 제거
  - `apps/web/src/components/MemeEditor.tsx`
    - 캔버스 래퍼 클래스에서 `md:bg-editor-canvas-bg/80` 제거
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `텍스트/도형` 액션 영역 외곽 컨테이너(border/bg/padding) 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_light_v3.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_dark_v3.png`

## [2026-02-20] 데스크탑 에디터 스타일 정렬 2차: non-border 기준 복귀 + 단일 우측 패널
- **결정**:
  1. 데스크탑 에디터 레이아웃을 `중앙 캔버스 + 우측 단일 패널`로 단순화하고 좌측 툴레일을 제거함.
  2. 우측 패널 상단에 `편집/공유` 도구 전환과 `실행 취소/다시 실행`을 통합 배치함.
  3. 전역 원칙(기본 `border-transparent`, hover/focus 시 강조)에 맞춰 상시 보더 의존 스타일을 축소함.
- **이유**:
  1. 사용자 피드백대로 제공 기능 대비 패널 수가 과도하고 버튼 시인성이 낮아 조작 부담이 있었음.
  2. 직전 데스크탑 스타일 리프레시(1차)가 non-border 기준과 일부 충돌해 시각 언어 정합이 떨어졌음.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - 데스크탑 좌측 패널 제거
    - 우측 패널 헤더에 도구 버튼/히스토리 버튼 통합
    - 데스크탑 버튼 상태값을 active 강조 + 비활성 고대비 hover로 재조정
    - 데스크탑 컨테이너 상시 border 클래스 축소
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 데스크탑 내부 카드 래퍼(`md:border/md:bg-card`) 제거로 중첩 패널 인상 완화
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 데스크탑 캔버스 엘리먼트 상시 border 제거
  - `apps/web/src/index.css`
    - `editor-desktop-glass` 그림자/블러 강도 하향(보더 강조 축소)
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_light_v2.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_dark_v2.png`

## [2026-02-20] 데스크탑 에디터 스타일 리프레시 1차 (모바일 제외)
- **결정**:
  1. 모바일 UX는 유지하고 데스크탑(`md` 이상) 구간에만 시각 개선을 적용함.
  2. 에디터 셸/사이드 패널/캔버스 스테이지에 전용 유틸 클래스(`editor-desktop-*`)를 도입해 배경 질감과 계층감을 보강함.
  3. 우측 속성 패널 본문은 데스크탑에서만 카드 레이어(rounded/border/bg/blur)로 정리함.
- **이유**:
  1. 사용자 피드백대로 에디터 데스크탑 화면의 스타일 완성도가 낮아 보이는 문제를 빠르게 개선할 필요가 있었음.
  2. 모바일까지 동시에 변경하면 회귀 범위가 커지므로 요청사항에 맞춰 데스크탑 전용 범위로 한정함.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `editor-desktop-shell`, `editor-desktop-glass`, `editor-desktop-canvas-stage`, `editor-canvas-element` 추가
    - `@media (min-width: 768px)` 구간에서만 동작하도록 제한
  - `apps/web/src/components/MemeEditor.tsx`
    - 좌 툴레일/우 컨텍스트 패널을 플로팅 카드 스타일로 정렬
    - 데스크탑 툴 버튼 active/inactive 시각 언어 보강
    - 중앙 캔버스 영역 컨테이너에 데스크탑 전용 라운드/보더 적용
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 캔버스 스테이지/캔버스 엘리먼트에 데스크탑 전용 클래스 연결
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 패널 본문 래퍼에 데스크탑 전용 카드 레이어 적용
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_v1.png`
    - `docs/ai-context/screenshots/2026-02-20_editor_desktop_style_refresh_dark_v1.png`

## [2026-02-19] 웹 타입체크 누락 보정(`tsc -b`) + `preserveSymlinks` 제거
- **결정**:
  1. `apps/web`의 타입검사 진입점을 `tsc` 단일 실행에서 프로젝트 레퍼런스 기반 `tsc -b`로 변경함.
  2. `apps/web/package.json`에 `typecheck` 스크립트를 추가해 루트 `pnpm typecheck`에서 웹 타입검사가 항상 실행되도록 고정함.
  3. `apps/web/tsconfig.app.json`의 `preserveSymlinks`를 제거해 React/Radix 타입 해석 충돌을 해소함.
- **이유**:
  1. 기존 `apps/web/tsconfig.json`은 `files: [] + references` 구조라 `tsc` 단독 실행 시 `src` 타입체크가 누락되었음.
  2. `preserveSymlinks: true` 상태에서 pnpm 심볼릭 링크 경로가 보존되며 React/Radix 타입이 비정상 해석되어 `DialogCloseProps` 등에서 `children`/`className` 오류가 연쇄 발생했음.
- **구현 요약**:
  - `apps/web/package.json`
    - `build`: `tsc && vite build` -> `tsc -b && vite build`
    - `typecheck`: `tsc -b --pretty false` 추가
  - `apps/web/tsconfig.app.json`
    - `preserveSymlinks` 제거
  - 코드 정리:
    - `apps/web/src/core/canvas/Object.ts`: `set(key, value)` 시그니처를 동적 키 지원 형태로 조정
    - `apps/web/src/hooks/useMemeEditor.ts`: 업로드 입력 타입 가드/배경 이미지 타입 가드/`updateProperty` 타입 정합화
    - `apps/web/src/pages/MyTemplatesPage.tsx`, `apps/web/src/pages/TemplateShareDetailPage.tsx`: `thumbnailUrl` nullable 처리 보강
- **검증**:
  - `pnpm --filter memeplate-web typecheck`
  - `pnpm lint`
  - `pnpm build`

## [2026-02-19] 전역 스타일 재정비 2차: 핵심 동선 `slate/blue` 직접 클래스 제거
- **결정**:
  1. 헤더/홈/로그인/에디터/밈플릿 목록 핵심 동선의 `slate/blue` 직접 유틸을 shadcn semantic 클래스(`foreground`, `muted`, `border`, `primary`)로 치환함.
  2. 활성 상태 색상은 `blue-*` 대신 `primary` 계열을 사용해 라이트/다크 전환 시 톤 일관성을 확보함.
- **이유**:
  1. 동일한 색 역할이 파일마다 `slate/blue` 조합으로 분산되어 유지보수 시 수정 범위가 커졌음.
  2. 다음 단계(상세/마이 페이지 정리) 이전에 실제 사용 빈도가 높은 동선부터 semantic 기반으로 고정할 필요가 있었음.
- **구현 요약**:
  - 헤더/진입: `apps/web/src/components/layout/MainHeader.tsx`, `apps/web/src/pages/HomePage.tsx`, `apps/web/src/pages/LoginPage.tsx`
  - 에디터: `apps/web/src/components/MemeEditor.tsx`, `apps/web/src/components/editor/MemePropertyPanel.tsx`, `apps/web/src/components/editor/MemeCanvas.tsx`, `apps/web/src/components/editor/MemeColorPicker.tsx`, `apps/web/src/components/editor/EditorGuideCard.tsx`
  - 목록 카드: `apps/web/src/pages/TemplatesPage.tsx`, `apps/web/src/components/ThumbnailCard.tsx`, `apps/web/src/components/TemplateThumbnailCard.tsx`
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 핵심 동선 파일 대상 `rg "(bg|text|border|ring|from|to|via)-slate-|(-|:)blue-|on-accent"` 결과 0건
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_style_phase2_home_desktop_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2_editor_desktop_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2_templates_desktop_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2_home_mobile_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2_editor_mobile_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2_templates_mobile_v1.png`

## [2026-02-19] 전역 스타일 재정비 2차-b: 상세/마이 페이지 `slate/blue` 직접 클래스 제거 완료
- **결정**:
  1. 상세/마이 영역(`TemplateShareDetail`, `ImageShareDetail`, `MyTemplates`, `MyPage`, `MySectionLayout`)도 동일하게 semantic 클래스(`foreground`, `muted`, `border`, `primary`)로 통일함.
  2. 잔여 스피너/스켈레톤 색상도 `border`, `muted`, `foreground` 기반으로 정렬함.
- **이유**:
  1. 핵심 동선만 정리된 상태에서는 상세/마이 진입 시 시각 언어가 다시 분리되는 문제가 있었음.
  2. 전역 스타일 시스템 재정비 이슈(#96)를 마무리하려면 페이지 레벨 잔여 하드코딩 제거가 필요했음.
- **구현 요약**:
  - 페이지: `apps/web/src/pages/TemplateShareDetailPage.tsx`, `apps/web/src/pages/ImageShareDetailPage.tsx`, `apps/web/src/pages/MyTemplatesPage.tsx`, `apps/web/src/pages/MyPage.tsx`, `apps/web/src/pages/EditorPage.tsx`
  - 레이아웃/보조: `apps/web/src/components/layout/MySectionLayout.tsx`, `apps/web/src/components/editor/MemeToolbar.tsx`
  - 루트 배경/카드 배경을 `bg-app-surface`, `bg-card`로 정렬하고 정렬/필터 버튼 활성 색상을 `bg-primary`로 통일
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - `apps/web/src`(단, `index.css` 변수명 정의 제외) 대상 `rg "(bg|text|border|ring|from|to|via)-slate-|(-|:)blue-|on-accent"` 결과 0건
  - 스크린샷(공개 경로)
    - `docs/ai-context/screenshots/2026-02-19_style_phase2b_templates_page_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2b_template_detail_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_style_phase2b_image_detail_v1.png`
  - `/my`, `/my/templates`는 비로그인 환경에서 홈 리다이렉트되어 시각 검증은 수행 불가

## [2026-02-19] 전역 프리미티브 스타일 통일 1차 (`button/input/textarea/card/dropdown/dialog/sheet`)
- **결정**:
  1. 상호작용 컴포넌트의 기본 상태는 `border transparent + shadow 최소화`로 통일하고, hover/focus에서만 경계 강조를 노출함.
  2. 오버레이 계층(`dropdown/dialog/sheet`)은 `rounded-xl/2xl + border + shadow`를 공통 언어로 유지함.
- **이유**:
  1. 페이지마다 보더/라운드/그림자 규칙이 달라 동일 제품 내 시각 언어가 분리되어 보였음.
  2. 사용자 요청한 “조용한 기본 상태 + 상호작용 시 강조” UX 방향을 전역 primitive 레이어에서 먼저 강제하기 위함.
- **구현 요약**:
  - `apps/web/src/components/ui/button.tsx`
    - base: `rounded-xl`, `border-transparent`, hover/focus border 강조
    - size/variant 스케일 재정렬(기본 높이 `h-10`)
  - `apps/web/src/components/ui/input.tsx`
    - 기본 `bg-card + border-transparent`, hover/focus border 노출, shadow 제거
  - `apps/web/src/components/ui/textarea.tsx`
    - input과 동일 규칙 적용(최소 높이 `72px`)
  - `apps/web/src/components/ui/card.tsx`
    - 기본 border/shadow 완화(`border-transparent`, `shadow-none`)
  - `apps/web/src/components/ui/dropdown-menu.tsx`
    - content/item/sub-trigger radius/border/focus 규칙 통일
  - `apps/web/src/components/ui/dialog.tsx`
    - overlay/close/content 규칙 정렬(`rounded-2xl`, `border-border/80`)
  - `apps/web/src/components/ui/sheet.tsx`
    - side별 border/radius 규칙 정렬 + close 버튼 상호작용 규칙 통일
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷(다크)
    - `docs/ai-context/screenshots/2026-02-19_primitives_unified_home_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_primitives_unified_editor_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_primitives_unified_templates_dark_v1.png`

## [2026-02-19] 홈/에디터/밈플릿 목록 루트 배경 토큰 통일
- **결정**:
  1. 주요 진입 페이지(홈, 에디터, 밈플릿 목록)의 루트 배경 토큰을 `bg-app-surface`로 통일함.
  2. 에디터 로딩/에러 fallback 화면도 동일 토큰(`bg-app-surface`)을 사용하도록 정렬함.
- **이유**:
  1. 페이지별 루트 배경 토큰(`bg-app-bg`, `bg-app-surface`, `bg-slate-100`)이 혼재되어 라이트/다크 전환 시 톤 불일치가 발생했음.
  2. 사용자가 인지하는 상위 정보 구조(헤더+본문)의 시각 일관성을 확보하기 위함.
- **구현 요약**:
  - `apps/web/src/pages/HomePage.tsx`
    - 루트 배경 `bg-app-bg -> bg-app-surface`
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 루트 배경 `bg-slate-100 -> bg-app-surface`
  - `apps/web/src/pages/EditorPage.tsx`
    - 로딩/에러 상태 배경 `bg-white -> bg-app-surface`
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷(다크)
    - `docs/ai-context/screenshots/2026-02-19_bg_unified_home_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_bg_unified_editor_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_bg_unified_templates_dark_v1.png`

## [2026-02-19] 다크모드 에디터 배경 토큰 통일 (`editor-canvas-bg` -> `app-surface`)
- **결정**:
  1. 다크모드에서 `--editor-canvas-bg`를 별도 값(`--ink-black-200`)으로 두지 않고 `--app-surface`와 동일하게 맞춤.
- **이유**:
  1. 사용자 피드백대로 에디터 캔버스 배경과 주변 배경이 서로 다른 톤으로 보여 이질감이 발생함.
  2. 에디터 내부 배경 계층을 단순화해 시각적 일관성을 높이기 위함.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `:root[data-theme='dark']`에서 `--editor-canvas-bg: var(--ink-black-200)`를 `--editor-canvas-bg: var(--app-surface)`로 변경
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_editor_dark_bg_unified_v1.png`

## [2026-02-19] 에디터 캔버스 외곽선(border) 제거
- **결정**:
  1. 에디터 캔버스 `<canvas>`의 외곽선(border)을 제거함.
- **이유**:
  1. 사용자 요청대로 캔버스 프레임 라인을 없애고 더 플랫한 화면 톤을 유지하기 위함.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `<canvas>` 클래스에서 `border border-slate-200` 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_editor_canvas_border_removed_v1.png`

## [2026-02-19] 모바일 에디터 패널 레이아웃을 하단 고정 시트에서 스크롤형으로 복귀
- **결정**:
  1. 모바일의 하단 고정 `Bottom Sheet(40%/80%)` 패널을 제거함.
  2. 모바일 편집 패널은 캔버스 하단 인플로우로 배치해 페이지 스크롤 기반으로 동작하도록 변경함.
  3. 데스크탑 studio split(좌 툴레일/중앙 캔버스/우 패널)은 유지함.
- **이유**:
  1. 사용자 요청한 기존 모바일 스크롤 편집 흐름으로 회귀하기 위함.
  2. 고정 하단 시트 대비 모바일 탐색/편집 흐름의 연속성을 높이기 위함.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - 모바일 전용 `fixed` bottom sheet 블록 제거
    - 모바일에서 `툴 버튼 + undo/redo + 속성 패널`을 캔버스 하단 인플로우로 재배치
    - 에디터 메인 컨테이너를 `mobile: flex-col`, `desktop: flex-row`로 분기
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 모바일 페이지 스크롤 가능 확인(`documentElement.scrollHeight > innerHeight`)
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_editor_mobile_scroll_layout_v2.png`

## [2026-02-19] 에디터 이미지 탭 제거 + 캔버스 업로드 드롭존 이관
- **결정**:
  1. 에디터 도구 그룹에서 `이미지` 탭을 제거하고 `편집`, `공유` 2개 탭만 유지함.
  2. 이미지 업로드는 우측 속성 패널이 아닌 캔버스 빈 상태에서 직접 처리하도록 변경함.
  3. 캔버스 업로드 진입 문구는 `업로드하려면 클릭`, `또는 여기에 파일 끌어다놓기`로 고정함.
- **이유**:
  1. 업로드 시작점이 탭 내부에 숨겨져 있어 첫 진입 사용성이 떨어졌음.
  2. 사용자 요청대로 전형적인 에디터 UX(캔버스 중심 업로드)를 적용해 초기 작업 플로우를 단순화하기 위함.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - `STUDIO_TOOLS`에서 `background` 제거
    - 모바일 도구 그리드를 `3열 -> 2열`로 변경
    - `MemeCanvas`에 `onUploadImage` 전달
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 빈 상태 업로드 드롭존에 클릭 업로드 + Drag & Drop 핸들러 추가
    - 업로드 안내 문구 변경
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `background` 패널(업로드/URL 로드) 제거 및 관련 props 정리
  - `apps/web/src/hooks/useMemeEditor.ts`
    - 배경 로드가 없을 때 초기 `activeTool`을 `null`로 유지
    - 배경 적용 완료 후 `activeTool`을 `edit`로 설정
    - `bgUrl` 상태/외부 노출 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_editor_canvas_upload_dropzone_desktop_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_editor_canvas_upload_dropzone_mobile_v1.png`

## [2026-02-19] 에디터 Studio Split 레이아웃 1차 적용
- **결정**:
  1. 에디터 데스크탑 레이아웃을 `좌 툴레일 + 중앙 캔버스 + 우 컨텍스트 패널`의 3분할 구조로 전환함.
  2. 모바일 레이아웃은 캔버스 우선 유지 + 하단 `Bottom Sheet(40%/80%)` 패널 방식으로 전환함.
  3. Undo/Redo는 데스크탑에서는 좌 레일 하단, 모바일에서는 하단 시트 헤더 우측에 배치함.
- **이유**:
  1. 사용자 요청한 studio형 편집 UX를 반영해 캔버스 중심 작업 흐름을 강화하기 위함.
  2. 모바일에서 기존 세로 스택 패널은 캔버스를 과도하게 밀어내어 작업 집중도가 낮았음.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - `EditorLayout`/`MemeToolbar` 조합 기반 구조를 제거하고 3분할 레이아웃 직접 구성
    - 좌측 툴레일(이미지/편집/공유), 우측 컨텍스트 패널 헤더(`Context Panel`) 추가
    - 모바일 하단 시트(`40%`, `80%` 토글) + 툴 탭 + 속성 패널 구조로 재배치
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 모바일/데스크탑 공통 `flex-1 overflow-y-auto` 스크롤 컨테이너로 정리
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_editor_studio_split_desktop_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_editor_studio_split_desktop_light_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_editor_studio_split_mobile_dark_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_editor_studio_split_mobile_dark_80_v1.png`

## [2026-02-19] 메인 헤더 배경/보더 제거
- **결정**:
  1. 메인 헤더 루트(`MainHeader`)의 배경색과 하단 보더를 제거해 페이지 배경과 자연스럽게 붙는 상단 바로 정리함.
- **이유**:
  1. 사용자 요청대로 최근 미디어 서비스 스타일처럼 상단 구조를 가볍게 만들어 콘텐츠 집중도를 높이기 위함.
- **구현 요약**:
  - `apps/web/src/components/layout/MainHeader.tsx`
    - 헤더 루트 클래스에서 `bg-app-surface-elevated`, `border-b border-slate-200` 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_header_border_bg_removed_light_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_header_border_bg_removed_dark_v1.png`

## [2026-02-19] 밈플릿 목록 스켈레톤 시각 톤 정렬
- **결정**:
  1. `/templates` 로딩 스켈레톤의 카드 외곽/배경 톤을 현재 목록 카드 규칙(배경 최소화)에 맞춰 단순화함.
- **이유**:
  1. 목록 카드 본문은 hover-only 기반인데 로딩 스켈레톤만 채움이 강하면 화면 전환 시 톤이 튀는 문제가 있었음.
- **구현 요약**:
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 스켈레톤 카드 컨테이너를 `border-transparent + bg-transparent`로 변경
    - 이미지 영역을 gradient 블록에서 단일 pulse surface(`border-slate-200 + bg-slate-100`)로 단순화
    - 텍스트 skeleton bar 강도를 `slate-200/70~80`로 하향
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_templates_skeleton_aligned_loading_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_templates_skeleton_aligned_dark_loading_v1.png`

## [2026-02-19] 밈플릿 목록 상단 정보 블록 제거
- **결정**:
  1. `/templates` 상단의 `밈플릿 목록` 타이틀, 설명 부제, `새로 만들기` 버튼을 제거함.
- **이유**:
  1. 사용자 요청에 따라 목록 본문(카드)에 시선을 집중시키고 상단 정보 밀도를 낮추기 위함.
- **구현 요약**:
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 상단 헤더 블록(`h2`, 부제 `p`, `새로 만들기` 버튼) 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_templates_header_removed_v1.png`

## [2026-02-19] 밈플릿 목록 라이트/다크 카드 hover-only 시각 규칙 적용
- **결정**:
  1. `/templates`의 카드 기본 채움은 라이트/다크 공통으로 제거하고, hover/focus 시에만 배경을 노출함.
  2. 적용 범위는 공개 밈플릿 목록(`TemplatesPage`)으로 한정하고, 다른 카드 화면에는 기본 동작을 유지함.
- **이유**:
  1. 목록에서 카드 배경이 상시 노출될 때 카드 간 분리감이 과해 화면 밀도가 무거워 보였음.
  2. 사용자 요청대로 hover 시점에만 표면이 올라오게 해 탐색 시 집중도를 높이기 위함.
- **구현 요약**:
  - `apps/web/src/components/ThumbnailCard.tsx`
    - `hoverSurfaceOnly` prop 추가/적용
    - hover-only 대상 내부 surface 제어용 클래스(`thumb-card-surface`, `thumb-card-media-surface`) 추가
  - `apps/web/src/components/TemplateThumbnailCard.tsx`
    - `hoverSurfaceOnly` prop 전달 경로 추가
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 목록 카드에 `hoverSurfaceOnly` 적용
  - `apps/web/src/index.css`
    - `.hover-surface-only-card` 공통 테마 규칙 추가
    - 기본 배경 투명, hover/focus 시 카드 외곽선은 노출하지 않고 배경만 복원(이미지 주변 내부 surface는 투명 유지)
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_templates_dark_hover_only_before_hover_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_templates_dark_hover_only_hovered_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_templates_light_hover_only_before_hover_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_templates_light_hover_only_hovered_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_templates_light_hover_no_image_side_bg_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_templates_hover_no_border_v1.png`

## [2026-02-19] 공유 섹션 다운로드 UX 단순화: 드롭다운 선택 + 액션 2열 배치
- **결정**:
  1. 확장자 선택 컴포넌트를 상시 노출 `Segmented`에서 `다운로드 버튼 클릭 시 열리는 Dropdown`으로 전환함.
  2. `다운로드`와 `클립보드 복사`를 동일 행 2열 레이아웃으로 배치해 공유 액션 영역의 밀도를 높임.
- **이유**:
  1. 공유 탭에서 포맷 세그먼트가 상시 공간을 점유해 핵심 액션 대비 시각적 비중이 과도했음.
  2. 사용자 요청대로 확장자 선택은 다운로드 시점에만 노출하는 흐름이 더 자연스러움.
- **구현 요약**:
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 공유 탭의 포맷 `SegmentedButtons` 제거
    - `DropdownMenuTrigger(Button)` + `DropdownMenuItem(PNG/JPG/WEBP/PDF)`로 전환
    - 선택 포맷 상태값(`downloadFormat`) 및 배지 표시 제거, 항목 클릭 시 즉시 다운로드로 단순화
    - `다운로드`/`클립보드 복사`를 `grid-cols-2` 한 줄 배치로 변경
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_share_section_mobile_dropdown_row_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_share_section_mobile_dropdown_open_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_share_section_desktop_dropdown_row_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_share_section_mobile_dropdown_ext_side_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_share_section_mobile_dropdown_no_badge_v1.png`

## [2026-02-19] 전역 스타일 시스템 재정비 1차 (#96): shadcn/radix 기준 베이스 정렬
- **결정**:
  1. Ant Design 제거 이후에도 남아 있던 테마 잔존 코드를 제거하고, `theme.ts`의 역할을 `theme mode + css var resolver`로 단순화함.
  2. Tailwind preflight를 다시 활성화해 shadcn primitive가 기대하는 기본 리셋 동작을 복구함.
  3. 전역 CSS는 `data-theme` 기반 CSS 변수 체계를 유지하되, shadcn 기준 베이스 레이어(`@layer base`)와 radius 토큰을 명시해 확장 가능 구조로 정렬함.
  4. shadcn primitive에서 `dark:` 유틸 사용을 제거하고 CSS 변수 기반 테마 전환 규칙으로 통일함.
- **이유**:
  1. Ant 전환 완료 이후 남은 잔존 코드는 테마 책임 경계를 흐리고 유지보수 비용을 높임.
  2. preflight 비활성화는 Ant 공존 시점의 임시 우회였고, 현재는 shadcn/radix 단일 체계에서 불필요한 예외 규칙임.
  3. 이후 컬러 축소/semantic class 치환 2차를 진행하려면 전역 베이스 규칙을 먼저 안정화해야 회귀를 줄일 수 있음.
- **구현 요약**:
  - `apps/web/src/theme/theme.ts`
    - `AntThemeToken`, `ANT_TOKENS`, `getAntThemeTokens` 제거
    - `ThemeMode` 저장/초기화 + `resolveCssVarColor`만 유지
  - `apps/web/tailwind.config.js`
    - `corePlugins.preflight: false` 제거
  - `apps/web/src/index.css`
    - `color-scheme` light/dark 선언
    - `--radius` 및 `@theme inline` radius scale 노출
    - `@layer base`에서 border/outline/body 기본 규칙을 semantic 변수로 정렬
    - `--color-app-*`, `--color-editor-*` 토큰 노출로 semantic utility class 사용 기반 추가
  - 레이아웃/에디터 인라인 스타일 제거
    - `apps/web/src/pages/HomePage.tsx`
    - `apps/web/src/pages/LoginPage.tsx`
    - `apps/web/src/components/layout/MySectionLayout.tsx`
    - `apps/web/src/components/layout/MainHeader.tsx`
    - `apps/web/src/components/editor/EditorLayout.tsx`
    - `apps/web/src/components/MemeEditor.tsx`
    - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `apps/web/src/components/editor/MemeCanvas.tsx`
  - `apps/web/src/components/ui/alert.tsx`
    - `dark:border-destructive` 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_style_reorg_home_desktop_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_style_reorg_editor_desktop_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_style_reorg_templates_desktop_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_style_reorg_home_mobile_v2.png`

## [2026-02-19] Ant Design 완전 제거 + shadcn/ui 전환 2차 완료 (이슈 #95)
- **결정**:
  1. 프론트 UI 계층에서 Ant Design을 전면 제거하고 `Tailwind + shadcn/ui + Radix + custom` 조합으로 단일화함.
  2. 기능 회귀 위험이 큰 에디터 영역을 우선 치환하되, `Canvas`/편집 로직은 유지하고 컴포넌트 레이어만 교체함.
  3. 토스트는 Ant `message` 대신 `sonner`로 통합함.
- **이유**:
  1. 기존 Ant/shadcn 혼용 상태는 스타일 정책 이원화와 유지보수 비용 증가를 유발함.
  2. 색상 정책 변경 전에 컴포넌트 체계를 단일화해야 후속 테마 작업의 회귀를 줄일 수 있음.
- **구현 요약**:
  - 에디터 전환
    - `apps/web/src/components/MemeEditor.tsx`
    - `apps/web/src/components/editor/EditorLayout.tsx`
    - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `apps/web/src/components/editor/MemeColorPicker.tsx`
    - `apps/web/src/hooks/useMemeEditor.ts` (`message` -> `toast`)
  - 페이지 전환
    - `apps/web/src/pages/TemplatesPage.tsx`
    - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - `apps/web/src/pages/ImageShareDetailPage.tsx`
    - `apps/web/src/pages/MyTemplatesPage.tsx`
  - 공통 UI/의존성
    - `apps/web/src/components/ui/{dialog,popover,slider,tooltip,sonner}.tsx` 추가
    - `apps/web/src/main.tsx`에 `Toaster` 연결
    - `apps/web/src/index.css`의 `.ant-*` 규칙 제거
    - `apps/web/package.json`에서 `antd`, `@ant-design/icons`, `next-themes` 제거
- **검증**:
  - `rg "antd|@ant-design|\\.ant-" apps/web/src apps/web/package.json` 결과 0건
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_shadcn_antd_free_home_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_shadcn_antd_free_editor_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_shadcn_antd_free_templates_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_shadcn_antd_free_mobile_menu_v1.png`

## [2026-02-19] Tailwind + shadcn/ui 전환 1차: 앱 루트/공통 레이아웃 선치환
- **결정**:
  1. 색상 축소 작업과 분리해, 우선 UI 프레임워크 전환을 1차로 진행하고 기존 토큰값은 유지함.
  2. 전환 범위는 `앱 루트 + 공통 레이아웃 + 핵심 진입 페이지(Home/Login/My/Editor 로딩·에러)`로 제한해 빌드 안정성을 확보함.
  3. Ant Design은 잔여 화면에서 당분간 공존시키되, `ConfigProvider`/전역 reset 의존은 제거해 shadcn 중심 구조로 기준점을 이동함.
- **이유**:
  1. 현재 코드베이스는 Ant 컴포넌트 사용 지점이 넓어 한 번에 전면 교체 시 회귀 위험이 큼.
  2. 사용자 요청(전환 먼저, 색상은 후속)을 반영하려면 구조 전환과 팔레트 조정을 분리하는 것이 가장 안전함.
  3. `MainHeader`/`MySectionLayout`/`PageContainer`를 먼저 치환하면 전역 UX 톤을 빠르게 shadcn 기준으로 맞출 수 있음.
- **구현 요약**:
  - `apps/web/components.json` 생성 및 shadcn 컴포넌트 추가
    - `apps/web/src/components/ui/{button,card,input,textarea,label,sheet,dropdown-menu,alert,skeleton,separator}.tsx`
    - `apps/web/src/lib/utils.ts` (`cn` 유틸)
  - alias 정렬
    - `apps/web/tsconfig.json`
    - `apps/web/vite.config.ts`
  - 앱 루트 전환
    - `apps/web/src/App.tsx`: `ConfigProvider` 제거
    - `apps/web/src/main.tsx`: `antd/dist/reset.css` 제거
  - 공통 UI 전환
    - `apps/web/src/components/layout/MainHeader.tsx`
    - `apps/web/src/components/layout/MySectionLayout.tsx`
    - `apps/web/src/components/layout/PageContainer.tsx`
    - `apps/web/src/components/ThumbnailCard.tsx`
  - 페이지 전환
    - `apps/web/src/pages/HomePage.tsx`
    - `apps/web/src/pages/LoginPage.tsx`
    - `apps/web/src/pages/EditorPage.tsx`
    - `apps/web/src/pages/MyPage.tsx`
  - 테마 연결
    - `apps/web/src/index.css`: shadcn semantic 변수(`--background`, `--primary`, `--border` 등)를 기존 앱 토큰에 매핑
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_shadcn_transition_home_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_shadcn_transition_login_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_shadcn_transition_mobile_drawer_v1.png`

## [2026-02-19] `EditorGuideCard` 공통 컴포넌트 도입: 에디터 가이드 UI 단일 렌더 경로화
- **결정**:
  1. 에디터의 가이드성 UI(도구 선택 전, 업로드 드롭존 내부 안내, 레이어 empty)를 `EditorGuideCard` 단일 컴포넌트로 통합함.
  2. `Upload.Dragger`는 인터랙션만 담당하고, 시각 렌더는 `EditorGuideCard`가 담당하도록 분리함.
- **이유**:
  1. 동일 성격 UI가 컴포넌트별(`Empty`, `Upload.Dragger`) 기본 스타일에 의존해 서로 다른 모양으로 드리프트하던 문제가 있었음.
  2. 이후 다크/라이트 미세조정 시 한 곳만 수정해도 전 구간에 반영되도록 유지보수 비용을 낮추기 위함.
- **구현 요약**:
  - `apps/web/src/components/editor/EditorGuideCard.tsx` 신규 추가
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - no-tool 가이드: `EditorGuideCard(mdiTune)`
    - 업로드 안내: `Upload.Dragger` 내부에 `EditorGuideCard(mdiCloudUpload)` 사용
    - 레이어 empty 가이드: `EditorGuideCard(mdiShape)`
    - `Empty` 직접 사용 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_guidecard_unified_notool_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_guidecard_unified_upload_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_guidecard_unified_layerempty_v1.png`

## [2026-02-19] 다크모드 전역 색상 규칙 정합화 1차: `white` 직접 사용 제거 + surface 토큰 통일
- **결정**:
  1. 공통 카드 배경 규칙에서 `#ffffff` 하드코딩을 제거하고 `--app-surface-elevated`를 단일 Source of Truth로 사용함.
  2. 템플릿 목록/상세/에디터 내부의 `bg-white` 계열 표현을 `slate` 토큰 계층(`bg-slate-100`, `bg-slate-50`)으로 통일함.
  3. 에디터 빈 상태 가이드(도구 선택/개체 없음/업로드 안내)의 아이콘/문구 스타일 언어를 하나로 맞춤.
- **이유**:
  1. 사용자 피드백처럼 화면별로 `white` 표현과 토큰 표현이 섞이면 다크모드에서 규칙이 불명확하게 느껴짐.
  2. 실제 색상값이 같아도 표현 레벨이 다르면 유지보수 중 회귀 가능성이 커짐.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `:where(.ant-card)` 배경 `#ffffff -> var(--app-surface-elevated)`
    - `:where(.ant-card-hoverable:hover)` 배경 `#ffffff -> var(--app-surface-elevated)`
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 페이지 루트 `bg-white -> bg-slate-100`
    - skeleton 카드 `bg-white -> bg-slate-50 + border-slate-200`
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 페이지 루트 `bg-white -> bg-slate-100`
    - skeleton 카드 `bg-white -> bg-slate-50 + border-slate-200`
    - `미리보기 없음` 텍스트 대비 `text-slate-400 -> text-slate-500`
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 레이어 비선택 배경 `bg-white/80 -> bg-slate-50/80`
    - `클립보드 복사` 버튼 표면 `bg-white -> bg-slate-50`
    - 빈상태/업로드 안내 아이콘+문구 스타일(`text-blue-500`, `text-slate-500`) 통일
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 다크 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_global_rule_unified_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_empty_layer_guide_v1.png`

## [2026-02-19] 에디터 가이드 UI 정합화 미세조정: 레이어 외곽선 정책 정정 + 업로드 박스 스타일 일치
- **결정**:
  1. 레이어 섹션은 원래 컨테이너 외곽선(`border`)을 유지하고, 레이어가 없을 때만 나타나는 내부 가이드 박스의 보더를 제거함.
  2. `Upload.Dragger`의 보더 두께/스타일/라운드는 guide 카드와 동일 규칙으로 맞춤.
- **이유**:
  1. 사용성 관점에서 레이어 섹션 자체의 경계는 항상 보여야 하고, 레이어 유무에 따라 외곽선이 생겼다/사라지면 시각적으로 불안정함.
  2. `클릭 또는 드래그하여 업로드` 박스가 `도구 선택/개체 없음` 가이드와 다른 스타일이면 전역 룰 일관성이 깨짐.
- **구현 요약**:
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 레이어 섹션 컨테이너 `border border-slate-200` 복원
    - 레이어 empty 가이드는 `EditorGuideCard`에 `!border-0 !bg-transparent`를 적용해 내부 보더 제거
    - 업로드 드롭존은 `Upload.Dragger` 내부 `EditorGuideCard` 렌더로 통일
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_upload_vs_guide_unified_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_layer_border_keep_inner_remove_v1.png`

## [2026-02-19] 업로드 드롭존 보더 아티팩트 제거: wrapper/drag 이중 보더 해소
- **결정**:
  1. 업로드 드롭존의 외곽선은 `.ant-upload-drag` 단일 레이어에만 적용하고, `.ant-upload-wrapper` 보더는 제거함.
  2. `upload-guide` 전용 CSS를 도입해 `display:block`, 내부 버튼 패딩 제거를 함께 고정함.
- **이유**:
  1. 기존에는 `upload-wrapper(2px dashed)`와 `ant-upload-drag(1px dashed)`가 동시에 렌더되어 좌측/하단에서 아티팩트처럼 보이는 이중선이 발생.
- **구현 요약**:
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `Upload.Dragger` 클래스명을 `upload-guide`로 변경
  - `apps/web/src/index.css`
    - `.upload-guide .ant-upload-drag`에 단일 `2px dashed` 보더/라운드/배경 적용
    - `.upload-guide .ant-upload-btn` 패딩 제거
    - wrapper 자체는 보더 없이 block 렌더
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_dark_editor_upload_single_border_v3.png`

## [2026-02-19] 리믹스 진입 에디터 다크 가시성 보강 2차: 패널/캔버스 분리 + 레이어 아이콘 인지성 강화
- **결정**:
  1. 리믹스 진입 화면(`/create?shareSlug=...`)에서 에디터 패널과 캔버스의 배경 토큰을 분리해 영역 경계를 명확히 함.
  2. 레이어 컨트롤(위/아래, 설정, 삭제) 아이콘 버튼의 크기/보더/색 대비를 상향해 다크 모드 조작점을 강화함.
  3. 툴바 비활성/활성 상태의 표면 대비를 올려 아이콘이 텍스트 대비 묻히지 않도록 조정함.
- **이유**:
  1. 사용자 피드백 기준으로 다크 모드에서 아이콘/버튼 존재감이 약해 보이는 구간이 지속됨.
  2. 색상값 변경만으로는 개선 폭이 제한적이라 아이콘 크기/버튼 경계(보더)까지 함께 보강이 필요했음.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `--editor-canvas-bg`, `--editor-sidebar-bg`, `--editor-sidebar-subtle-bg`, `--editor-divider` 토큰 추가(light/dark 모두 정의)
  - `apps/web/src/components/MemeEditor.tsx`
    - 데스크탑/모바일 사이드패널 배경/경계에 editor 토큰 적용
    - Undo/Redo disabled 상태 가독성 소폭 상향
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 캔버스 영역 배경을 `--editor-canvas-bg`로 고정
    - empty 상태 보조 문구를 일반 `<p className=\"text-slate-500\">`로 전환
    - 로딩 오버레이를 `bg-slate-100/80`로 조정
  - `apps/web/src/components/editor/MemeToolbar.tsx`
    - inactive 아이콘 opacity 제거(100%) 및 active/inactive/disabled 표면 대비 강화
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 레이어 패널 보더 강화
    - 정렬/설정/삭제 아이콘 버튼 크기(`0.5~0.6 -> 0.58~0.7`) 및 보더/색 대비 상향
    - 레이어 라벨/입력 텍스트 대비 상향
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 다크 `/create?shareSlug=tmpl_53x_Wcs1` 대비 재계측: `contrast < 3.2` 텍스트/아이콘 항목 `0건`
  - 스크린샷(전/후)
    - `docs/ai-context/screenshots/2026-02-19_dark_remix_editor_before_v1.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_remix_editor_after_v1.png`

## [2026-02-19] 밈플릿 목록/상세 다크 가시성 보강 1차: `Text secondary` 제거
- **결정**:
  1. `TemplatesPage`, `TemplateShareDetailPage`, `MyTemplatesPage`의 `Typography.Text type="secondary"`를 제거하고 `text-slate-500` 기반으로 통일함.
  2. 공통 카드/마이 레이아웃의 저대비 보조 텍스트(`text-slate-400`)를 `text-slate-500`로 상향함.
- **이유**:
  1. 다크 모드에서 `type=\"secondary\"` 텍스트가 `rgba(0,0,0,0.45)`로 렌더되어 대비가 붕괴되는 구간이 확인됨.
  2. 동일 이슈가 템플릿 목록 설명/상세 보조 문구에서 반복되어 페이지 간 일관 수정이 필요했음.
- **구현 요약**:
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 상단 설명을 `Typography.Text`에서 일반 `<p className=\"text-slate-500\">`로 전환
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - `원본 밈플릿`, `총 N개` 보조 문구를 `Typography.Text`에서 일반 `<span className=\"text-slate-500\">`로 전환
  - `apps/web/src/pages/MyTemplatesPage.tsx`
    - 카드 메타 `업데이트` 문구를 `<p className=\"text-slate-500\">`로 전환
    - `미리보기 없음` 보조 텍스트 대비 상향
  - `apps/web/src/components/ThumbnailCard.tsx`
    - `fallbackText` 색상 `text-slate-400 -> text-slate-500`
  - `apps/web/src/components/layout/MySectionLayout.tsx`
    - 좌측 섹션 라벨 `My` 색상 `text-slate-400 -> text-slate-500`
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 다크 모드 수동 검증(`templates`, `template detail`)에서 `contrast < 3.2` 항목 `0건`
  - 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_dark_templates_visibility_v4.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_template_detail_visibility_v4.png`
  - 주의: `/my/templates`는 인증 필요로 로컬 비로그인 상태에서 런타임 화면 검증은 불가(코드 기준 동일 패턴 교정만 반영).

## [2026-02-19] 다크 에디터 컨트롤 가시성 보강 1차: 아이콘/버튼 대비 상향
- **결정**:
  1. 에디터 툴바 버튼을 투명 기반에서 표면/보더 기반으로 조정해 버튼 경계를 더 명확히 표현함.
  2. Undo/Redo 아이콘 버튼의 disabled 색상을 검정 계열(`rgba(0,0,0,0.25)`)에서 토큰 기반 slate 계열로 교체해 다크 배경에서 가시성을 확보함.
  3. 레이어/세부설정 보조 라벨 및 아이콘 버튼의 저대비 slate 톤을 한 단계 상향(`slate-400 -> slate-500`)함.
- **이유**:
  1. 사용자 피드백 기준으로 다크 에디터에서 텍스트 대비 대비해 아이콘/버튼의 존재감이 낮게 인지됨.
  2. 특히 disabled 아이콘 버튼과 보조 라벨이 배경과 붙어 보이는 구간이 있어 조작 가능 영역 인지가 약했음.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeToolbar.tsx`
    - inactive 아이콘 opacity `0.7 -> 0.9`
    - disabled/inactive/active 버튼에 `bg + ring + text` 계층 스타일 강화
  - `apps/web/src/components/MemeEditor.tsx`
    - 데스크탑/모바일 Undo/Redo 버튼에 공통 클래스(`historyButtonClassName`) 적용
    - disabled 상태에서도 토큰 기반 색/보더 유지
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `텍스트/도형` 버튼에 `!bg/!border` 기반 명시 스타일 적용
    - 레이어 정렬/설정/삭제 아이콘 버튼 배경/색 대비 상향
    - `Layers`, `또는`, 상세 설정 섹션 라벨 등 보조 텍스트를 `text-slate-500`로 상향
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 다크 에디터 대비 재계측: sidebar 내 텍스트/아이콘 요소 기준 `contrast < 3.2` 항목 `0건`
  - 스크린샷: `docs/ai-context/screenshots/2026-02-19_dark_editor_controls_visibility_v2.png`

## [2026-02-19] 에디터 배경 계층 분리 1차: `surface` 바닥 + `elevated` 패널/캔버스 프레임
- **결정**:
  1. 에디터 전체 바닥면은 `--app-surface`를 사용해 페이지 배경(`--app-bg`)과 한 단계 분리함.
  2. 실제 조작 영역(사이드 패널/툴바/캔버스 프레임)은 `--app-surface-elevated` 계열을 유지해 인터랙션 영역을 또 한 단계 올림.
  3. 캔버스 프레임 경계선을 `border-slate-200`으로 조정해 배경과의 경계 인지성을 강화함.
- **이유**:
  1. 기존에는 에디터 주요 영역이 동일한 `bg-white` 계열로 겹쳐 보여 섹션 경계 인지가 약했음.
  2. semantic token 체계를 유지한 상태에서 라이트/다크 동시 일관성을 확보하려면 `app-bg -> app-surface -> app-surface-elevated` 3단 계층이 가장 안정적임.
- **적용 색상 기준**:
  - Light: `app-bg #ececea`, `app-surface #f2f3f1`, `app-surface-elevated #ffffff`
  - Dark: `app-bg #050b11`, `app-surface #08111a`, `app-surface-elevated #161f30`
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - root `Layout`를 `bg-slate-100` + `style={{ backgroundColor: 'var(--app-surface)' }}`로 고정
    - 데스크탑/모바일 패널 래퍼를 `bg-slate-50`로 조정
  - `apps/web/src/components/editor/EditorLayout.tsx`
    - root `Layout`를 `bg-slate-100` + `style={{ backgroundColor: 'var(--app-surface)' }}`로 고정
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 캔버스 영역 배경 `bg-slate-100`으로 조정
    - 캔버스 프레임 경계 `border-slate-100 -> border-slate-200`
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 라이트/다크 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_editor_bg_separation_light.png`
    - `docs/ai-context/screenshots/2026-02-19_editor_bg_separation_dark.png`

## [2026-02-19] 다크모드 버튼 톤다운 1차: Primary 채도/명도 하향 + 그림자 제거
- **결정**:
  1. 다크모드의 Ant Design `primary` 버튼 색상을 `#91a2ba`에서 `#5172af`로 낮추고, 버튼 그림자를 제거함.
  2. 에디터 툴바 활성 버튼 배경을 `white` 계열에서 `slate-100` 계열로 하향 조정함.
  3. 홈 CTA/다운로드 버튼의 추가 블루 그림자를 제거해 다크 화면에서의 발광 느낌을 완화함.
- **이유**:
  1. 다크 배경에서 primary 버튼이 과도하게 밝고(특히 그림자 포함) 시선이 과집중된다는 사용자 피드백이 있었음.
  2. 버튼 시인성은 유지하되, 전체 톤과의 일관성을 높이기 위해 명도 대비를 한 단계 낮출 필요가 있었음.
- **구현 요약**:
  - `apps/web/src/theme/theme.ts`
    - dark 토큰 `colorPrimary`, `colorInfo`를 `#5172af`로 조정
    - `colorPrimaryHover`, `colorPrimaryActive`를 추가해 밝기 상승 폭 제한
  - `apps/web/src/App.tsx`
    - dark 모드에서 AntD `Button` 컴포넌트 토큰 `primaryShadow/defaultShadow`를 `none`으로 설정
  - `apps/web/src/components/editor/MemeToolbar.tsx`
    - 활성 버튼 스타일을 `bg-slate-100`, `text-blue-500`, `ring-slate-300/40`으로 조정
    - 툴바 컨테이너 배경을 `bg-slate-50`로 조정
  - `apps/web/src/pages/HomePage.tsx`
    - 메인 CTA 버튼의 추가 그림자 클래스 제거
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 다운로드 버튼의 추가 그림자 제거 및 hover 밝기 상승 제거
- **검증**:
  - `pnpm --filter memeplate-web lint`
  - `pnpm --filter memeplate-web build`
  - 다크 모드 시각 검증 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_dark_buttons_tuned_home.png`
    - `docs/ai-context/screenshots/2026-02-19_dark_buttons_tuned_editor.png`

## [2026-02-19] 목록 아이템 카드 밀도 조정: 외곽선 제거 + 썸네일/본문 간격 컴팩트화
- **결정**: 목록 카드 아이템의 기본 외곽선을 제거하고, 썸네일과 텍스트 영역 사이의 밀도를 더 촘촘하게 조정함.
- **이유**:
  1. 목록 아이템 외곽선이 시각적으로 과하게 분리되어 보이는 문제를 완화하기 위함.
  2. 카드 내부 상하 여백이 커서 정보 스캔 속도가 떨어져 컴팩트한 밀도로 조정할 필요가 있었음.
- **구현 요약**:
  - `apps/web/src/components/ThumbnailCard.tsx`
    - `Card bordered={false}` 적용
    - 카드 본문 패딩 축소(`styles.body`)
    - 썸네일 커버의 `border-b` 제거 및 패딩 축소
  - `apps/web/src/pages/TemplatesPage.tsx`
    - 목록 스켈레톤 카드 여백/간격 축소
    - 카드 본문 텍스트 블록 `space-y-2 -> space-y-1`
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - 리믹스 목록 스켈레톤 카드 여백/간격 축소
  - 검증
    - `pnpm --filter memeplate-web lint`
    - `pnpm --filter memeplate-web build`
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_list_item_borderless_compact_v1.png`
  - 후속 보정
    - Ant Design hover 상태 그림자 잔존으로 `apps/web/src/index.css`에 `:where(.ant-card-hoverable:hover) { box-shadow: none !important; }` 추가
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_list_item_borderless_compact_v2_noshadowforce.png`
  - 최종 보정
    - hover 시 카드가 떠 보이도록 `transform: translateY(-2px)` 적용
    - hover 배경 흰색 + 외곽선(`--app-border-strong`) 적용, 그림자는 계속 제거
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_list_item_hover_lift_border_white_v1.png`
  - 사용자 피드백 후 조정
    - hover 외곽선 제거, 약한 그림자만 적용
    - `apps/web/src/index.css`의 hover 상태를 `border-color: transparent`, `box-shadow: 0 6px 14px rgba(13, 27, 42, 0.08)`로 변경
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_list_item_hover_shadow_only_v1.png`
  - 추가 조정
    - hover 시 카드 이동 모션 제거(`transform` 제거), 그림자만 유지
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_list_item_hover_shadow_only_v2_no_motion.png`
  - 다크 모드 보정
    - 다크에서 hover 배경/그림자가 라이트 값으로 적용되지 않도록 `:root[data-theme='dark'] :where(.ant-card-hoverable:hover)` 분기 추가
    - hover 배경은 `--app-surface-elevated`, 그림자는 `rgba(0,0,0,0.32)`로 조정

## [2026-02-19] 카드 시각 정책 재조정: 그림자 제거 + 흰 배경 고정(라이트), 텍스트 기본색 복원
- **결정**:
  1. 카드 영역의 그림자(elevation)를 전면 제거하고, 라이트 모드 카드 배경은 흰색으로 유지함.
  2. 에디터 텍스트 레이어 기본 색상값을 기존 정책(채움 `#ffffff`, 외곽선 `#000000`)으로 복원함.
- **이유**:
  1. 카드와 바깥 배경 구분은 경계선 대비로 해결하고, 그림자 스타일은 사용하지 않기로 결정됨.
  2. 텍스트 레이어 기본값은 사용자가 기대하는 기존 편집 흐름(완전 흰색/검정) 유지가 우선.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `.ant-card`의 `box-shadow` 제거
    - 라이트 모드 카드 배경 흰색 유지, 다크 모드는 기존 표면 토큰 유지
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `addText` 기본값 `fill/stroke`를 `#ffffff/#000000`으로 복원
    - `color` 초기값을 `#ffffff`로 복원
    - `addShape` 기본값 `fill/stroke`를 `#ffffff/#000000`으로 복원
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 텍스트 외곽선 색상 fallback을 `#000000`으로 복원
  - `apps/web/src/core/canvas/Textbox.ts`
    - 텍스트 기본 fill fallback을 `#000000`으로 복원
  - 검증
    - `pnpm --filter memeplate-web lint`
    - `pnpm --filter memeplate-web build`
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_theme_light_templates_v3_noshadow.png`

## [2026-02-19] 카드 섹션 대비 보정: 배경 단계 차 확대 + 공통 카드 elevation 추가
- **결정**: 카드 섹션과 바깥 배경의 구분이 약하다는 피드백에 따라, light 테마 기준 `app-bg`를 한 단계 어둡게 조정하고(`alabaster-700`), 공통 카드(`.ant-card`)에 경계선/그림자(elevation)를 적용함.
- **이유**:
  1. 현재 톤에서 카드 배경과 페이지 배경의 명도 차가 작아 섹션 경계 인지가 약했음.
  2. 페이지별 개별 수정 대신 전역 토큰/공통 카드 규칙으로 일괄 보정해야 유지보수성이 높음.
- **구현 요약**:
  - `apps/web/src/index.css`
    - light 테마 `--app-bg`, `--app-border`, `--app-border-strong` 대비 강화
    - `.ant-card` 전역 배경/경계선/그림자 추가
    - dark 테마 카드 그림자 보강
  - 검증 스크린샷
    - `docs/ai-context/screenshots/2026-02-19_theme_light_templates_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_theme_dark_templates_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_theme_light_template_detail_v2.png`
    - `docs/ai-context/screenshots/2026-02-19_theme_dark_template_detail_v2.png`

## [2026-02-19] 색상 시스템 단일화 완료: semantic token + `data-theme`(light/dark)
- **결정**: 색상 관리 기준을 semantic token 기반으로 통일하고, 라이트/다크 모드 전환은 `data-theme=\"light|dark\"` + 공통 토큰 매핑으로 구현함. 실행 단위는 GitHub 이슈 `#92`.
- **이유**:
  1. 현재 Tailwind 유틸/인라인 HEX/Ant Design token/Canvas 색상이 분산돼 있어 일관성 유지와 변경 비용이 큼.
  2. 이후 다크모드 도입 시 파일별 색상 치환 대신 토큰값 교체만으로 확장 가능한 구조가 필요함.
  3. 공통화 선행 없이는 페이지별 디자인 조정 시 회귀 가능성이 높음.
- **구현 요약**:
  - 테마 인프라
    - `apps/web/src/theme/theme.ts`
    - `apps/web/src/theme/ThemeProvider.tsx`
    - `apps/web/src/theme/themeModeContext.ts`
    - `apps/web/src/theme/useThemeMode.ts`
  - 전역 토큰/팔레트 매핑
    - `apps/web/src/index.css`
    - 제공 팔레트를 CSS 변수로 정의하고 light/dark별 `slate/blue/white` 유틸 매핑 적용
  - Ant Design 연동
    - `apps/web/src/App.tsx`
    - `apps/web/src/main.tsx`
  - UI 연동
    - `apps/web/src/components/layout/MainHeader.tsx` (테마 토글 추가)
    - `apps/web/src/components/layout/MySectionLayout.tsx`
    - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `apps/web/src/components/editor/MemeCanvas.tsx`
  - Canvas 색상 토큰화
    - `apps/web/src/core/canvas/Canvas.ts`
    - `apps/web/src/core/canvas/Textbox.ts`
    - `apps/web/src/hooks/useMemeEditor.ts`
  - 검증
    - `pnpm --filter memeplate-web lint`
    - `pnpm --filter memeplate-web build`
    - 스크린샷: `docs/ai-context/screenshots/2026-02-19_theme_*.png`

## [2026-02-19] 공유 섹션 액션 버튼 높이 통일
- **결정**: 공유 탭의 주요 액션 버튼(밈플릿 게시/링크복사/리믹스 게시/다운로드/클립보드 복사) 높이를 `h-11` 기준으로 통일함.
- **이유**:
  1. 버튼마다 높이(`h-10`, `h-11`, `h-16`)가 섞여 시각적 계층이 흔들리고 일관성이 떨어졌음.
  2. 공유 탭의 핵심 액션들을 동일 밀도로 맞춰 스캔성과 조작성 예측 가능성을 높이기 위함.
- **구현 요약**:
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - `공유 링크 복사`: `h-10 -> h-11`
    - `다운로드`, `클립보드 복사`: `h-16 -> h-11`, 라운드/타이포도 동일 스케일로 보정

## [2026-02-19] 페이지 콘텐츠 래퍼 공통화 1차 (`PageContainer`)
- **결정**: 페이지 본문 영역의 반복 레이아웃(`mx-auto w-full max-w-6xl px-6`)을 `PageContainer` 컴포넌트로 추출해 공통 사용함.
- **이유**:
  1. 동일 컨테이너 클래스가 여러 페이지에 중복되어 유지보수 비용이 커지고 일관성 드리프트 가능성이 있었음.
  2. 레이아웃 기준점(최대 폭/가로 패딩)을 한 곳에서 제어해야 이후 디자인 시스템 정리가 쉬움.
- **구현 요약**:
  - `apps/web/src/components/layout/PageContainer.tsx` 신규 추가.
  - 적용 페이지:
    - `apps/web/src/pages/TemplatesPage.tsx`
    - `apps/web/src/pages/TemplateShareDetailPage.tsx`
    - `apps/web/src/pages/ImageShareDetailPage.tsx`

## [2026-02-19] 전역 `1440px` 폭 제한 정책 롤백
- **결정**: 앱 루트(`#root`)의 `1440px` 최대폭 제한과 중앙 정렬 정책을 해제하고, 전체 해상도를 그대로 사용하도록 복원함.
- **이유**:
  1. 사용자 요구사항이 전체 해상도 사용(폭 제한 해제)에 맞춰 변경됨.
  2. 폭 제한 정책과 함께 도입됐던 회색 바깥 배경은 제한 해제 후 불필요함.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `#root { width: min(100%, 1440px); margin: 0 auto; }` -> `#root { width: 100%; margin: 0; }`
    - `body` 배경색 `#e5e7eb` -> `#ffffff`

## [2026-02-18] 배경 적용 상태 전환을 원자 커밋으로 조정
- **결정**: 배경 이미지 업로드/리사이즈 적용 시 `hasBackground/bgUrl/activeTool` 상태를 로딩 시작 시점이 아닌 성공 완료 시점에 일괄 반영함.
- **이유**:
  1. 업로드 시작 즉시 배경 표시 상태가 먼저 바뀌면, 실제 캔버스 크기 확정 전 중간 프레임이 노출되어 화면 출렁임이 커짐.
  2. 실패 시 강제로 배경 상태를 초기화하면 기존 작업 화면이 불필요하게 사라지는 회귀가 생길 수 있음.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `setBackgroundImage`에서 `setHasBackground/setBgUrl/setActiveTool` 선반영 제거.
    - `CanvasImage.fromURL` 성공 후 상태를 일괄 반영.
    - 실패 시 `hasBackground/bgUrl/activeTool` 강제 초기화 제거.

## [2026-02-18] 모바일 헤더 정렬 및 사이드패널 디자인 정비
- **결정**: 모바일에서 햄버거 메뉴를 헤더 우측 단독 배치에서 로고 인접 배치로 변경하고, 사이드패널(Drawer)은 좌측 오프캔버스 + 카드형 링크 UI로 재구성함.
- **이유**:
  1. 모바일 헤더의 시각적 중심이 좌측 로고에 있는데 햄버거가 우측에 분리되어 정렬 일관성이 떨어졌음.
  2. 기존 텍스트 나열형 메뉴는 정보 밀도가 낮아 터치 타깃/그룹 구조 인지가 약했음.
- **구현 요약**:
  - `apps/web/src/components/layout/MainHeader.tsx`
    - 모바일 햄버거 버튼을 로고 옆으로 이동.
    - 헤더 inline `padding` 제거로 Tailwind 여백(`px-4 md:px-6`)과 충돌 해소.
    - Drawer를 `placement="left"`로 변경하고, 라운드 카드형 내비게이션/계정 섹션 스타일 적용.

## [2026-02-19] 리사이즈 기준 분리 3차: 상위 래퍼 기준 측정으로 자기참조 루프 차단
- **결정**: `MemeCanvas`의 viewport 실측 기준을 내부 `Content`가 아니라 상위 `Canvas Area` 래퍼로 분리하고, 동일 크기 재설정 시 `setViewportSize`를 무시함.
- **이유**:
  1. 내부 `Content`를 직접 측정하면 캔버스 크기 적용 결과가 다시 측정값에 반영되는 자기참조 루프가 발생할 수 있음.
  2. 모바일 세로 스택 레이아웃에서 이 루프가 단계적 축소로 나타나며 안정성을 저해함.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - `canvasAreaRef` 추가 후 캔버스 영역 래퍼에 `ref` 연결.
    - `MemeCanvas`에 `viewportRef` 전달.
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - viewport 계산 기준을 `viewportRef` 우선으로 변경.
    - padding 계산은 내부 `Content` 스타일을 사용.
    - `setViewportSize`에서 동일값 업데이트를 무시해 불필요 렌더 루프 제거.

## [2026-02-19] 모바일 리사이즈 정책 2차: width-fit 우선으로 단순화
- **결정**: 모바일 뷰포트에서는 캔버스 표시 스케일을 `width-fit` 기준으로만 계산하고, 높이 상한(`usableViewportHeight`)에 의한 재축소 경로를 제거함.
- **이유**:
  1. 모바일 세로 스택 레이아웃에서 높이 기반 계산은 패널/콘텐츠 높이 변동과 상호작용하며 축소 루프를 유발함.
  2. 폭 기준 단일 정책이 모바일에서 더 예측 가능하고 안정적임.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `viewport width < 768`에서는 `displayScale = usableWidth / intrinsicWidth`.
    - 모바일 `displayWidth`/`displayHeight` 계산에서 `usableViewportHeight` 상한 제거.
  - `apps/web/src/constants/canvasLimits.ts`
    - 캔버스 edge/area 상한값 공통 상수화.
  - `apps/web/src/components/editor/MemeCanvas.tsx`, `apps/web/src/hooks/useMemeEditor.ts`
    - 중복 상수 제거 후 공통 상수 재사용.

## [2026-02-19] 전역 레이아웃 폭 정책: 루트 최대 `1440px` + 중앙 정렬
- **결정**: 웹 앱 루트 컨테이너(`#root`) 최대 폭을 `1440px`로 제한하고, 초과 해상도에서는 가운데 정렬로 표시함.
- **이유**:
  1. 초광폭 화면에서 좌우 콘텐츠 밀도가 과도하게 퍼지는 문제를 방지함.
  2. 페이지별 개별 max-width 처리 대신 전역 루트 정책으로 일관성을 확보함.
- **구현 요약**:
  - `apps/web/src/index.css`
    - `#root { width: min(100%, 1440px); margin: 0 auto; min-height: 100vh; }`
    - `body`의 flex 레이아웃 제거(기본 블록 흐름으로 단순화).
  - 검증: viewport `1800px`에서 `#root` 폭 `1440px`, 좌우 여백 `180px`로 중앙 정렬 확인.

## [2026-02-18] 모바일 회귀 대응: `dvh` 고정/측정 분리 변경 롤백 + 업로드 `blob URL` 전환
- **결정**: 모바일에서 스크롤 불가/업로드 체감 지연 회귀가 발생해 레이아웃 고정 실험(`dvh`, 외부 측정 ref 분리)을 롤백하고, 로컬 업로드 경로를 `dataURL`에서 `blob URL`로 전환함.
- **이유**:
  1. 회귀 영향(스크롤/업로드 실패 체감)이 기능 안정성 이슈보다 우선적으로 큼.
  2. 대용량 로컬 파일에서 base64 변환(`FileReader.readAsDataURL`)은 메인 스레드 비용이 커서 체감 지연을 유발함.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`, `apps/web/src/components/editor/MemeCanvas.tsx`
    - `dvh` 및 외부 측정 ref 기반 변경 원복.
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `handleImageUpload`: `URL.createObjectURL(file)` 사용.
    - `setBackgroundImage`: blob URL 사용 시 성공/실패 후 `URL.revokeObjectURL` 처리.

## [2026-02-18] 모바일 무한 리사이즈 루프 차단: 에디터 루트 높이를 `dvh` 고정
- **결정**: 모바일 에디터 루트 레이아웃을 `min-height` 중심에서 `h-dvh/min-h-dvh` 고정으로 전환하고, 중간 flex 컨테이너에 `min-h-0`를 추가함.
- **이유**:
  1. `min-height` 기반 모바일 컬럼 레이아웃에서 캔버스 표시 크기 계산값이 다시 부모 높이에 영향을 주며 축소 루프가 발생함.
  2. 캔버스/패널이 세로 스택인 모바일에서 부모 높이 기준이 불안정하면 `ResizeObserver -> displayScale -> height` 순환이 끊기지 않음.
- **구현 요약**:
  - `apps/web/src/components/MemeEditor.tsx`
    - 루트 `Layout`: `min-h-screen` -> `h-dvh min-h-dvh` 변경
    - 내부 래퍼: `min-h-0` 추가
  - 실측 검증(390x844, 배경 3000x5000): 3초 연속 샘플에서 `mainH/canvasCssH` 값이 고정되어 루프 해소 확인.

## [2026-02-18] 캔버스 리사이즈 재계산 보정: viewport usable 영역 기준으로 통일
- **결정**: 화면/해상도 변경 시 캔버스 표시 스케일을 viewport 실측값(`clientWidth/clientHeight`) 기반으로 재계산하고, canvas border를 usable 영역에 반영하도록 변경함.
- **이유**:
  1. 특정 해상도에서 경계 1~수 px 클리핑이 발생하는 원인은 스케일 계산값과 실제 박스(border 포함) 크기 불일치였음.
  2. `ResizeObserver`만으로 누락될 수 있는 케이스(회전/브라우저 줌)를 `window.resize` 구독으로 보강할 필요가 있음.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `displayScale` 계산을 usable viewport 기준으로 단일화.
    - canvas border 두께를 측정해 usable width/height에서 차감.
    - viewport 측정에 `clientWidth/clientHeight` 사용 + `window.resize` 리스너 추가.

## [2026-02-18] 대형 원본 이미지 로드 가드: 작업영역/백킹캔버스 안전 한계 적용
- **결정**: 대형 원본 업로드 시 작업영역 크기를 `max edge 8192` + `max area 16MP` 기준으로 정규화하고, 렌더 백킹캔버스도 동일 한계 내에서 render scale을 자동 캡함.
- **이유**:
  1. 브라우저 캔버스 내부 최대 크기 한계를 넘는 초고해상도 이미지에서 렌더 클리핑(일부 잘림)이 발생할 수 있음.
  2. 로드 단계에서 안전 크기로 정규화하면 편집/내보내기 파이프라인 전반의 안정성이 높아짐.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `normalizeWorkspaceSize` 유틸 추가(`edge + area` 동시 제한).
    - `setBackgroundImage`에서 캔버스/배경 객체 크기를 정규화 크기로 적용.
    - 축소 적용 시 사용자 안내 메시지 표시.
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `setRenderScale`에 백킹캔버스 `edge/area` 캡 추가.

## [2026-02-18] 템플릿 업데이트 품질 보존: 배경 무변경 시 재업로드 스킵
- **결정**: 템플릿 업데이트 시 배경/도형 계열 변경이 없으면 `backgroundDataUrl`를 생성·전송하지 않고 기존 배경 URL을 그대로 재사용함.
- **이유**:
  1. 제목/설명/공개범위만 변경하는 업데이트에서 불필요한 webp 재인코딩으로 품질 저하가 누적되는 문제를 방지함.
  2. R2 업로드/전송 비용을 줄여 저장 지연을 완화함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - 비텍스트 객체 변경 기반 `isBackgroundDirtyRef` 추적 추가.
    - 저장 시 dirty가 아니면 기존 배경 `src`를 `content`에 유지하고 `backgroundDataUrl` 전송 생략.
    - 저장 성공 후 dirty 플래그 초기화.

## [2026-02-18] 공유 UX 정리: `밈플릿 게시`/`리믹스 게시` 모달 입력 플로우 전환
- **결정**: 공유 탭에서 게시 관련 입력폼을 인라인으로 노출하지 않고, `밈플릿 게시`, `리믹스 게시` 버튼 클릭 시 모달에서 입력/확정하도록 변경함.
- **이유**:
  1. 공유 탭 길이를 줄여 편집 맥락을 유지하고 액션 집중도를 높임.
  2. 게시 확정 액션을 모달로 분리해 입력/제출 흐름을 명확히 함.
- **구현 요약**:
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 인라인 입력폼 제거 후 액션 카드 + 모달 구조로 전환.
    - 게시 성공 시에만 각 모달을 닫도록 처리.

## [2026-02-18] 게시 포맷 정책 보정: 밈플릿/리믹스는 `webp`, 다운로드 기본값은 `png` 유지
- **결정**: 밈플릿 저장(배경 평탄화)과 리믹스 게시 포맷은 `webp`로 통일하고, 다운로드 기본 선택값은 기존 `png`를 유지함.
- **이유**:
  1. 게시물 품질 정책은 일관되게 유지하면서, 사용자 다운로드 UX의 기존 기본값 변경은 피함.
  2. 리믹스 품질 저하 완화를 위해 게시용 `webp` 품질을 상향하고 템플릿 저장도 동일 계열 포맷으로 정렬함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - 템플릿 배경 export: `png -> webp`, `quality: 0.98` 적용.
    - 리믹스 게시: 기존 `webp` 유지 + export 배율 `multiplier: 2` 적용.
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 다운로드 기본 포맷을 `png`로 유지.

## [2026-02-18] 템플릿 썸네일 컬럼 제거 준비: 배경 단일 업로드 + API thumbnail 계산
- **결정**: 템플릿 저장 시 썸네일 별도 업로드를 제거하고, 배경 이미지는 `templates/{ownerId}/...`에 업로드함. `thumbnail_url` 컬럼은 드롭하고, API 응답 `thumbnailUrl`은 `content.objects[].src`에서 계산해 제공함.
- **이유**:
  1. 썸네일을 별도 오브젝트로 저장하는 중복 비용(생성/업로드/관리)을 제거할 수 있음.
  2. DB에서 대표 이미지 전용 컬럼을 제거해 데이터 모델을 단순화함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`: `thumbnailDataUrl` 생성/전송 제거.
  - `apps/api/src/types/template.ts`: `thumbnailDataUrl` 입력 스키마 제거.
  - `apps/api/src/modules/templates/routes.ts`: 템플릿 create/update에서 `thumbnail_url` 저장 로직 제거.
  - `apps/api/src/lib/r2.ts`: 템플릿 썸네일 업로드 함수 및 `templates/thumbnails` 분기 제거.
  - `apps/api/src/modules/templates/supabaseRepository.ts`: `thumbnailUrl`을 `content` 배경 `src`에서 계산하도록 전환.
  - `docs/ai-context/sql/2026-02-18_drop_templates_thumbnail_url.sql`: 컬럼 드롭 SQL 추가.

## [2026-02-18] 공개 템플릿 로드 정책 단순화: `thumbnailUrl` 기반 배경 폴백 제거
- **결정**: `/create?shareSlug=...` 로드 시 `thumbnailUrl`로 배경 객체를 자동 주입하거나 빈 `src`를 보정하는 fallback 로직을 제거함.
- **이유**:
  1. 저장 파이프라인을 `backgroundDataUrl -> R2 URL 치환`으로 고정한 이후에는 로더 fallback이 정책 중복이 됨.
  2. `content.objects[].src`를 단일 Source of Truth로 유지해야 데이터 품질 문제를 조기에 발견 가능함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - 템플릿 로드 effect에서 `thumbnailUrl` 기반 배경 보정/자동주입 블록 제거.
    - 이미지 객체 `src`는 저장된 값만 로드하도록 단순화.

## [2026-02-18] 템플릿 배경 저장 방식 전환: `content` 내 DataURL 제거 + R2 URL 치환
- **결정**: 밈플릿 저장 시 평탄화 배경 이미지는 `backgroundDataUrl`로 별도 전송하고, API에서 R2 업로드 후 `content.objects[].src`를 URL로 치환해 저장함.
- **이유**:
  1. 기존 구조는 `content` JSON 안에 대용량 base64가 직접 포함되어 요청 본문/DB payload가 비대해짐.
  2. 템플릿 조회/수정 시 불필요한 base64 직렬화 비용이 반복됨.
  3. 썸네일/리믹스와 동일하게 URL 기반 자산 저장 정책으로 통일 가능함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `content.objects[background].src`는 빈 문자열로 전송.
    - `backgroundDataUrl` 필드를 별도로 API 요청 본문에 추가.
  - `apps/api/src/types/template.ts`
    - `backgroundDataUrl` 스키마 필드 추가.
  - `apps/api/src/modules/templates/routes.ts`
    - `backgroundDataUrl` 업로드 처리 추가.
    - 업로드 URL을 템플릿 `content.objects[].src`에 치환하는 로직 추가.
  - `apps/api/src/lib/r2.ts`
    - 템플릿 배경 업로드 함수 `uploadTemplateBackgroundDataUrl` 추가.

## [2026-02-18] 히스토리 저장 전략 1차 조정: 즉시 저장 + 디바운스 저장 이원화
- **결정**: Undo/Redo 스냅샷 저장을 `saveHistoryNow`(즉시)와 `saveHistoryDebounced`(200ms)로 분리하고, 속성 슬라이더/입력처럼 고빈도 변경은 디바운스 저장으로 통합함.
- **이유**:
  1. `updateProperty`가 연속 호출될 때 매번 `canvas.toJSON` + `JSON.stringify`가 실행되어 메인 스레드 부하가 커짐.
  2. 사용자 체감상 연속 조작은 중간 상태 전체를 모두 undo할 필요보다 "한 묶음" undo가 더 자연스러움.
  3. 객체 생성/삭제/수정 완료, 텍스트 편집 완료는 단위 동작이라 즉시 스냅샷이 필요함.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - `saveHistoryNow`, `saveHistoryDebounced` 추가.
    - `updateProperty` -> `saveHistoryDebounced` 적용.
    - `object:added/modified/removed`, `completeTextEdit` -> `saveHistoryNow` 유지.
    - 언마운트 시 디바운스 타이머 정리 로직 추가.

## [2026-02-18] 조회수 증가 원자성 보강: `select->update` 제거, DB 함수(RPC) 전환
- **결정**: 템플릿/리믹스 조회수 증가를 DB 함수로 통합하고, API 리포지토리에서는 RPC 단일 호출만 수행함.
- **이유**:
  1. 기존 `select -> update` 구조는 동시 요청 시 조회수 유실 가능성이 있음.
  2. DB 단에서 `view_count = view_count + 1`을 수행하면 경쟁 상태에서도 증가 연산이 안전함.
- **구현 요약**:
  - SQL: `docs/ai-context/sql/2026-02-18_atomic_view_count_increment.sql`
  - 함수: `increment_template_view_count`, `increment_meme_image_view_count`
  - API: `apps/api/src/modules/templates/supabaseRepository.ts`, `apps/api/src/modules/images/supabaseRepository.ts`의 조회수 증가 로직을 `rpc(...)` 호출로 교체.

## [2026-02-18] 공개 목록 API 쿼리 최적화 1차 (작성자명 조인)
- **결정**:
  - `templates`, `meme_images`의 목록/상세/생성/수정 응답에서 작성자명(`ownerDisplayName`) 조회를 `users(display_name)` 조인으로 통일함.
- **이유**:
  1. 기존 `목록 조회 -> users 재조회` 2단 조회는 왕복 지연을 증가시킴.
- **구현 요약**:
  - `apps/api/src/modules/templates/supabaseRepository.ts`: `users!templates_owner_id_fkey(display_name)` 조인 적용.
  - `apps/api/src/modules/images/supabaseRepository.ts`: `users!meme_images_owner_id_fkey(display_name)` 조인 적용.

## [2026-02-17] 리믹스 게시 정책 확정: 밈플릿 연결 없는 게시 금지
- **결정**: 리믹스 게시는 `templateId`가 연결된 경우에만 허용함. 밈플릿 미연결 상태(`/create` 단독 진입 등)에서는 게시를 차단함.
- **이유**:
  1. **도메인 정합성**: 리믹스는 반드시 밈플릿으로부터 파생된 결과물이어야 함.
  2. **데이터 품질**: `templateId`가 없는 리믹스 레코드는 연관 목록/통계 의미를 약화시킴.
  3. **UX 명확성**: 버튼 비활성 + 안내 문구로 사용자가 필요한 선행 단계(템플릿 선택/저장)를 즉시 이해할 수 있음.
- **구현 요약**:
  - API: `CreateMemeImageSchema`에서 `templateId`를 필수값으로 전환.
  - 프론트: 공유 탭에서 `canPublishRemix` 조건 기반 `리믹스 게시` 버튼 비활성화 및 안내 문구 표시.

## [2026-02-17] 메타데이터 정책 확장: 템플릿/리믹스 `title + description` 지원
- **결정**: 템플릿(`templates`)과 리믹스(`meme_images`) 모두 `description`을 저장/조회하도록 확장하고, `title`은 단일라인만 허용함.
- **이유**:
  1. **콘텐츠 맥락 강화**: 목록/상세에서 제목만으로는 의도 전달이 부족해 설명 필드가 필요함.
  2. **입력 안정성**: 제목의 줄바꿈을 금지해 카드/헤더 레이아웃 깨짐을 예방함.
  3. **보안 단순화**: 사용자 입력은 HTML 렌더링 없이 텍스트로만 취급해 XSS 면을 늘리지 않음.
- **구현 요약**:
  - SQL: `docs/ai-context/sql/2026-02-17_templates_meme_images_description_columns.sql` 추가.
  - API: `Create/UpdateTemplateSchema`, `Create/UpdateMemeImageSchema`에 `description` 추가, `title` 줄바꿈 금지 검증 적용.
  - 프론트: 공유 탭에서 밈플릿/리믹스 제목·설명 입력 지원, 상세 페이지에서 설명 노출(값 존재 시).

## [2026-02-17] 프론트 정보구조 1차 확정: `템플릿`/`이미지` 메뉴 분리 + 썸네일 카드 공용화
- **결정**: 상단 네비게이션과 마이 메뉴를 `템플릿 목록`, `이미지 목록`, `내 템플릿`, `내 이미지`로 분리하고, 템플릿/이미지 목록 카드 렌더는 공통 `ThumbnailCard`로 통합함.
- **이유**:
  1. **도메인 가시성**: 브랜드(밈플릿)와 데이터 도메인(템플릿/이미지) 구분을 화면 IA에 즉시 반영해야 혼동이 줄어듦.
  2. **유지보수성**: 이미지/템플릿 카드가 분기 구현되면 CORS 대응, 404 폴백, 비율 렌더 정책이 쉽게 드리프트됨.
  3. **확장 용이성**: 향후 좋아요/배지/상태 태그 추가 시 카드 컴포넌트 하나만 수정하면 양쪽 목록에 동시 적용 가능.
- **구현 요약**:
  - 라우트 추가: `/images`, `/images/s/:shareSlug`, `/my/images`.
  - 헤더 메뉴 확장 및 경로 prefix 기반 활성 상태 표시.
  - `apps/web/src/components/ThumbnailCard.tsx` 추가 후 `TemplateThumbnailCard`, `ImagesPage`, `MyImagesPage`에 공통 적용.

## [2026-02-16] 용어/도메인 분리 방향 확정: 브랜드는 밈플릿, 데이터는 템플릿/이미지 이원화
- **결정**: 사용자 노출 상위 개념은 `밈플릿` 브랜드로 유지하고, 데이터 도메인은 `templates(편집 소스)`와 `meme_images(결과물 이미지)`로 분리함.
- **이유**:
  1. **개념 명확화**: 기존 단일 `templates`만으로는 편집 소스와 최종 결과물이 혼재되어 확장 시 충돌 위험이 큼.
  2. **제품 확장성**: 결과물 피드/공유/지표(조회/좋아요)를 템플릿 도메인과 독립적으로 운영 가능.
  3. **사용자 이해도**: 브랜드(`밈플릿`)와 기능(`템플릿`, `이미지`)을 분리하면 정보 구조가 명확해짐.
- **구현 요약**:
  - SQL 초안: `docs/ai-context/sql/2026-02-16_meme_images_schema.sql` 추가.
  - `meme_images` 주요 컬럼: `template_id`, `image_url`, `visibility`, `share_slug`, `view_count`, `like_count`.

## [2026-02-16] 이미지 도메인 API 1차 채택: 템플릿과 동일한 공유/관리 패턴 적용
- **결정**: `meme_images` 도메인 API를 템플릿과 동일한 방식(공개 목록/상세/shareSlug/조회수 증가/내 목록/CRUD)으로 구성함.
- **이유**:
  1. **일관성**: 기존 템플릿 API 패턴을 재사용하면 프론트 라우팅/쿼리/권한 모델을 동일하게 적용 가능.
  2. **확장성**: 이미지 피드/내 이미지 관리 화면을 빠르게 붙일 수 있는 최소 기능 세트를 우선 확보.
  3. **운영 단순화**: `share_slug`/`visibility`/`view_count` 규칙을 동일화해 운영 정책을 단순 유지.
- **구현 요약**:
  - `apps/api/src/modules/images/*` 신규 추가 (`repository`, `supabaseRepository`, `routes`).
  - `apps/api/src/types/image.ts` 스키마 추가.
  - `apps/api/src/lib/r2.ts`에 `uploadMemeImageDataUrl` 추가 (`meme-images/{ownerId}/...`).
  - `apps/api/src/app.ts`에 `memeImageRoutes` 등록.

## [2026-02-16] 프론트 상태관리 1차 전환: `auth`는 zustand, 목록 데이터는 React Query
- **결정**: 인증 세션 상태는 `zustand` 전역 store로 통합하고, 밈플릿 목록 데이터는 `@tanstack/react-query` 캐시로 관리함.
- **이유**:
  1. **중복 호출 감소**: 헤더/마이페이지가 각각 `auth/me`를 호출하던 구조를 store로 통합해 중복 요청을 줄임.
  2. **일관된 동기화**: 로그아웃/이름수정 시 전역 사용자 상태를 즉시 반영할 수 있음.
  3. **목록 UX 개선**: 목록 페이지 재진입/갱신 시 query 캐시 재사용 및 invalidate로 데이터 일관성을 유지.
- **구현 요약**:
  - `apps/web/src/stores/authStore.ts` 추가.
  - `apps/web/src/lib/queryClient.ts` 추가, `main.tsx`에 `QueryClientProvider` 등록.
  - `MainHeader`, `MyPage`를 auth store 기반으로 전환.
  - `TemplatesPage`, `MyTemplatesPage`를 `useQuery/useMutation` 기반으로 전환.

## [2026-02-16] 보안 하드닝 1차: 헤더/레이트리밋 강화 + 자산 프록시 제거
- **결정**: API 전역 보안 헤더와 레이트리밋을 적용하고, 이미지 자산 프록시는 유지하지 않고 제거함.
- **이유**:
  1. **SSRF/DoS 회피**: 서버측 자산 프록시 자체를 제거하면 SSRF 공격면을 크게 줄일 수 있음.
  2. **남용 방지**: auth/조회수 증가 엔드포인트에 호출 제한이 없으면 자동화 트래픽에 취약.
  3. **운영 가시성**: 목록 로딩 실패를 빈 상태와 분리해 장애 시 UX 혼선을 줄여야 함.
- **구현 요약**:
  - `@fastify/helmet`, `@fastify/rate-limit` 도입 및 앱 전역 등록.
  - auth 관련 라우트 + `POST /templates/s/:shareSlug/view` 라우트별 rate limit 추가.
  - `/assets/proxy` 라우트 제거, 프론트 이미지 로딩을 원본 URL 직접 접근으로 전환.
  - `TemplatesPage`에 에러 상태 + 재시도 버튼 추가.

## [2026-02-16] 조회수 증가 처리 분리: 상세 조회 API와 카운트 증가 API를 분리 운영
- **결정**: `GET /templates/s/:shareSlug`는 상세 조회만 담당하고, 조회수 증가는 `POST /templates/s/:shareSlug/view`로 분리함.
- **이유**:
  1. **책임 분리**: 조회(read)와 변경(write)을 분리해 API 의미를 명확히 유지.
  2. **프론트 제어 용이성**: 상세 진입 시점/조건에서 조회수 증가 타이밍을 클라이언트에서 명시적으로 제어 가능.
- **구현 요약**:
  - 백엔드: repository에 `incrementViewCountByShareSlug` 추가, routes에 view 증가 엔드포인트 추가.
  - 프론트: `TemplateShareDetailPage` 진입 시 slug 단위 1회 호출(ref guard) 후 로컬 상태의 `viewCount`를 동기화.

## [2026-02-16] 밈플릿 지표 필드 추가: `view_count`, `like_count` 도입
- **결정**: 밈플릿 목록 카드의 조회/좋아요 수치 표시를 위해 `templates` 테이블과 API 응답에 카운트 필드를 추가함.
- **이유**:
  1. **UI 데이터 정합성**: 목록 카드에 노출되는 수치가 하드코딩 `0`이 아니라 실제 필드 기반이어야 함.
  2. **확장성 확보**: 이후 조회수 증가/좋아요 토글 로직을 별도 API로 붙일 때 스키마를 재변경하지 않아도 됨.
- **구현 요약**:
  - SQL: `docs/ai-context/sql/2026-02-16_templates_metrics_columns.sql` 추가.
  - 기본 스키마: `docs/ai-context/sql/2026-02-16_templates_share_schema.sql`에 컬럼 반영.
  - API: `supabaseRepository` select/insert/toRecord에 `view_count`, `like_count` 매핑 추가.

## [2026-02-16] 밈플릿 목록 상호작용 단순화: 버튼 액션 제거, 카드 클릭 상세 진입
- **결정**: 밈플릿 목록 카드의 `상세 보기`, `이 밈플릿 사용` 버튼을 제거하고 카드 전체 클릭 시 상세 페이지로 이동하도록 변경함.
- **이유**:
  1. **밀도 개선**: 카드 하단 액션 영역을 제거해 콘텐츠 중심 레이아웃으로 단순화.
  2. **일관성**: 목록 탐색 단계에서는 상세 진입을 단일 동작으로 통일하는 편이 예측 가능함.
- **구현 요약**:
  - `TemplatesPage` 카드 액션 제거 및 `onClick -> /templates/s/:shareSlug` 적용.
  - 카드 메타를 `제목` + `작성자 / 조회수·좋아요` 2줄로 재구성.
  - 그리드를 `repeat(auto-fill, minmax(240px, 1fr))`로 변경해 화면 가로폭에 맞춰 자동 배치.

## [2026-02-16] 마이페이지 역할 정리: 내 밈플릿 이동 CTA 제거, 프로필 수정 우선
- **결정**: `/my`에서는 내 밈플릿 이동 버튼을 제거하고, `displayName` 수정 기능을 직접 제공하도록 변경함.
- **이유**:
  1. **정보 구조 명확화**: 마이페이지는 계정 정보 확인/수정에 집중하고, 밈플릿 관리는 `/my/templates`의 전용 역할로 분리.
  2. **동선 단축**: 프로필 수정은 별도 화면 이동 없이 즉시 수행 가능해야 함.
- **구현 요약**:
  - API: `PATCH /api/v1/auth/me` 추가 (`displayName` 검증 후 `users.display_name` 업데이트).
  - UI: `apps/web/src/pages/MyPage.tsx`에서 이름 수정 폼과 저장 버튼을 추가하고, 기존 `내 밈플릿 관리` 버튼 제거.

## [2026-02-16] 밈플릿 상세정보 작성자 표기 개선: `ownerId` 대신 표시명 우선 노출
- **결정**: 템플릿 조회 응답에 `ownerDisplayName`을 포함하고, 프론트 상세정보에서는 `ownerDisplayName`을 우선 표기하도록 변경함.
- **이유**:
  1. **가독성 개선**: UUID(`ownerId`)는 사용자 입장에서 의미가 없어 작성자 정보로 부적합함.
  2. **UI 정합성**: “만든 사람” 항목은 식별자보다 이름 노출이 기대 동작임.
- **구현 요약**:
  - `apps/api/src/modules/templates/supabaseRepository.ts`에서 `users` 조회를 통해 작성자 표시명 매핑 추가.
  - `apps/web/src/pages/TemplateShareDetailPage.tsx`, `apps/web/src/pages/MyTemplatesPage.tsx`에서 표기 우선순위를 `ownerDisplayName -> ownerId -> '-'`로 조정.

## [2026-02-16] 밈플릿 썸네일 업로드 최적화: 5MB 본문 제한 유지 + 클라이언트 리사이즈/압축 적용
- **결정**: API `bodyLimit`은 `5MB`로 유지하고, 밈플릿 저장 시 썸네일 Data URL을 원본 크기 그대로 전송하지 않도록 클라이언트에서 리사이즈/압축 후 전송함.
- **이유**:
  1. **요청 실패 방지**: 대형 원본 이미지에서 생성된 base64 썸네일이 본문 제한을 초과해 `request body too large` 오류를 유발할 수 있음.
  2. **전송 효율 개선**: 썸네일 용도에서는 원본 해상도 보존이 불필요하므로 long-edge cap과 webp 압축이 적합함.
  3. **품질 제어 가능성 확보**: 캔버스 export에서 `quality` 옵션을 실제 반영하도록 보강해 저장 품질/용량을 명시적으로 제어할 수 있음.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`
    - 썸네일 생성 시 긴 변 `1280px` 상한 리사이즈 적용.
    - `webp` 포맷 + `quality=0.82`로 썸네일 생성.
  - `apps/web/src/core/canvas/Canvas.ts`
    - `toDataURL`가 `jpeg/webp` 포맷에서 `quality` 인자를 실제로 전달하도록 수정.

## [2026-02-16] 밈플릿 공유 MVP 1차: Supabase templates + 공개/개인 API + 에디터 공유 탭 연동
- **결정**: 밈플릿 공유 기능을 우선 백엔드 중심으로 완성하고, 에디터 공유 탭에서 바로 저장/공개전환/링크복사를 사용할 수 있도록 연결함.
- **이유**:
  1. **기능 우선순위 정합성**: 목록/관리 페이지보다 저장/공유 API를 먼저 확보해야 실제 데이터 흐름 검증 가능.
  2. **권한 경계 명확화**: `requireAuth`를 기반으로 소유자 쓰기(`me`/`create`/`patch`/`delete`)와 공개 읽기(`public`/`shareSlug`)를 분리.
  3. **확장성**: 이후 `/templates`, `/my/templates` UI는 이미 확보된 API를 재사용해 구현 가능.
- **구현 요약**:
  - SQL: `docs/ai-context/sql/2026-02-16_templates_share_schema.sql` 추가.
  - API: `apps/api/src/modules/templates/routes.ts`에서 `501` placeholder 제거 후 실제 CRUD/공개조회 구현.
  - Repository: `apps/api/src/modules/templates/supabaseRepository.ts` 추가.
  - 프론트: `apps/web/src/hooks/useMemeEditor.ts`, `apps/web/src/components/editor/MemePropertyPanel.tsx`에 공유 탭 연동 추가.

## [2026-02-16] R2 썸네일 업로드 전략: Data URL 수신 후 백엔드 업로드, DB에는 공개 URL만 저장
- **결정**: 프론트에서 `thumbnailDataUrl`을 전송하면 API 서버가 R2에 업로드하고, 밈플릿에는 `thumbnail_url`(스토리지 공개 URL)만 저장하도록 구성함.
- **이유**:
  1. **DB 경량화**: Base64 원문을 DB에 저장하지 않아 밈플릿 레코드 크기와 쿼리 비용을 줄임.
  2. **전송/캐시 효율**: 썸네일은 CDN 캐시 가능한 URL로 관리하는 것이 목록 성능에 유리.
  3. **정책 정합성**: 스토리지 URL 저장 원칙을 코드 레벨에서 강제.
- **구현 요약**:
  - `apps/api/src/lib/r2.ts` 추가 (mime/용량 검증 + R2 업로드).
  - `apps/api/src/config/env.ts`에 `R2_*` env 스키마 연결.
  - 밈플릿 create/update에서 `thumbnailDataUrl` 처리 후 `thumbnailUrl`로 치환 저장.

## [2026-02-16] 의존성 추가: `@aws-sdk/client-s3` 도입
- **결정**: R2 업로드를 위해 API 패키지에 `@aws-sdk/client-s3`를 추가함.
- **이유**:
  1. **호환성**: Cloudflare R2가 S3 호환 API를 제공하므로 표준 SDK 사용이 가장 안전함.
  2. **유지보수성**: 직접 서명 구현 대비 코드 복잡도와 장애 위험을 줄임.

## [2026-02-16] 텍스트 편집 WYSIWYG 개선: 공통 레이아웃 엔진 재사용
- **결정**: 텍스트 줄바꿈/폰트축소/세로정렬 계산을 `Textbox.draw`와 편집 오버레이가 각각 따로 계산하지 않고, 공통 유틸(`textLayout`)을 함께 사용하도록 통합함.
- **이유**:
  1. **괴리 축소**: 편집 모드와 실제 렌더가 서로 다른 줄바꿈/폰트 크기 계산을 쓰면서 시각적 차이가 발생했음.
  2. **일관성**: 한쪽만 수정되어 회귀가 나는 구조를 제거하고, 단일 규칙으로 유지보수성을 높임.
  3. **정렬 정확도**: 편집 오버레이에 공통 계산 기반 세로정렬 패딩을 반영해 체감 오차를 줄임.
- **구현 요약**:
  - `apps/web/src/core/canvas/textLayout.ts` 추가 (`resolveTextLayout`, `getFontDeclaration`).
  - `apps/web/src/core/canvas/Textbox.ts`가 공통 레이아웃 결과를 사용해 렌더링.
  - `apps/web/src/components/editor/MemeCanvas.tsx`가 동일 계산으로 편집 폰트 크기/세로 정렬을 적용.

## [2026-02-15] 텍스트 레이어 생성 정책 조정: 기본 문구 제거 + 순번 placeholder
- **결정**: 텍스트 레이어 추가 시 기본 텍스트(`텍스트를 입력하세요`)를 넣지 않고 빈 레이어로 생성하며, 레이어 입력창의 placeholder는 `텍스트-1`, `텍스트-2` 형식으로 노출함.
- **이유**:
  1. **편집 효율**: 기본 문구 삭제 작업 없이 즉시 입력을 시작할 수 있음.
  2. **요구사항 정합성**: “빈 레이어 생성” 요구를 그대로 반영.
  3. **식별성 유지**: 다중 텍스트 레이어에서 placeholder 순번으로 구분 가능.
- **구현 요약**:
  - `apps/web/src/hooks/useMemeEditor.ts`의 `addText`를 `new Textbox('')`로 변경.
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`에서 텍스트 레이어 순번 계산 후 `placeholder=\"텍스트-{순번}\"` 적용.

## [2026-02-16] 텍스트 더블클릭 편집 위치 오차 수정: 캔버스 오프셋 기반 좌표 계산
- **결정**: 편집 textarea 절대좌표를 단순 캔버스 내부 좌표만으로 계산하지 않고, 캔버스가 뷰포트 내부에서 중앙 정렬되며 생기는 실제 오프셋(`canvasRect - viewportRect`)을 포함해 계산함.
- **이유**:
  1. **재현 버그**: 텍스트를 좌상단으로 이동 후 더블클릭하면 textarea가 위쪽으로 튀는 현상이 있었음.
  2. **원인 명확성**: 기존 계산이 세로 letterbox 영역(중앙 정렬 여백)을 무시해 `top`이 오차만큼 당겨졌음.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - `canvasCssOffset` 상태 추가.
    - `ResizeObserver` 기반 캔버스 측정 시 `canvasCssOffset`을 함께 계산.
    - textarea `left/top` 계산에 해당 오프셋을 반영.

## [2026-02-16] 텍스트 더블클릭 편집 UX 2차 보강: 가시성/크기/완료 동작 표준화
- **결정**: 텍스트 더블클릭 편집 오버레이를 단순 입력창에서 "가시성 보강 + 렌더 크기 정합 + 명시적 완료/취소 단축키" 정책으로 강화함.
- **이유**:
  1. **가시성 안정화**: 흰 텍스트/밝은 배경 조합에서 편집 중 텍스트 식별이 어려웠음.
  2. **정합성 개선**: 편집 모드 글자 크기가 실제 캔버스 렌더보다 크게 보여 WYSIWYG 체감이 깨졌음.
  3. **조작 예측성**: 저장/취소 동작이 blur 중심이라 사용자가 완료 시점을 통제하기 어려웠음.
- **구현 요약**:
  - `apps/web/src/components/editor/MemeCanvas.tsx`
    - 편집 textarea에 적응형 대비 스타일(배경/텍스트 그림자/대시 보더/캐럿) 적용.
    - 텍스트박스 내부 fit 계산(`getFittedFontSize`) 기반으로 편집 폰트 크기 동기화.
    - `Ctrl/Cmd + Enter` 저장, `Esc` 원복 취소, 중복 완료 호출 가드 추가.
  - `apps/web/src/components/editor/MemePropertyPanel.tsx`
    - 레이어 텍스트 입력을 단일라인 `Input`에서 `Input.TextArea(autoSize)`로 변경해 멀티라인 편집 일관성 확보.

## [2026-02-16] 인증 처리 공통화: `requireAuth` 미들웨어 도입
- **결정**: JWT access 쿠키 검증 로직을 라우트별 중복 구현 대신 공통 `requireAuth` preHandler로 분리하고, 밈플릿 라우트에 우선 적용함.
- **이유**:
  1. **중복 제거**: 인증 검증 로직을 중앙화해 유지보수 비용을 줄임.
  2. **일관성**: 인증 실패 응답을 단일 형식(`401 Authentication required`)으로 통일.
  3. **확장성**: 이후 밈플릿 CRUD/보호 API에 동일 미들웨어를 즉시 재사용 가능.
- **구현 요약**:
  - `apps/api/src/modules/auth/guard.ts` 추가 (`resolveAuthUser`, `requireAuth`).
  - `apps/api/src/types/fastify-auth.d.ts` 추가로 `request.authUser` 타입 확장.
  - `apps/api/src/modules/templates/routes.ts`의 모든 밈플릿 엔드포인트에 `preHandler: requireAuth` 적용.

## [2026-02-15] 인증 구조 전환: 서버 세션 토큰에서 JWT(access/refresh) 기반으로 변경 (이슈 #53)
- **결정**: 기존 `mp_session` 단일 세션 쿠키 + DB 조회 방식에서 `mp_access`/`mp_refresh` JWT 쿠키 구조로 전환함. refresh 토큰은 DB(`sessions`)에 해시로 저장하고 회전(rotation) 정책을 적용함.
- **이유**:
  1. **성능/확장성**: `auth/me`는 access JWT 서명 검증만으로 처리해 요청당 DB 의존을 줄일 수 있음.
  2. **보안성**: refresh 토큰 원문을 저장하지 않고 해시만 저장해 유출 리스크를 완화.
  3. **운영 제어**: refresh revoke/만료를 통해 로그아웃 및 세션 무효화를 계속 서버 측에서 통제 가능.
- **구현 요약**:
  - `apps/api/src/modules/auth/routes.ts`
    - `GET /api/v1/auth/google/start`
    - `GET /api/v1/auth/google/callback` (JWT 발급)
    - `GET /api/v1/auth/me` (access JWT 검증)
    - `POST /api/v1/auth/refresh` (refresh JWT 회전)
    - `POST /api/v1/auth/logout` (refresh revoke + 쿠키 삭제)
  - `apps/api/src/config/env.ts`에 JWT 관련 env(`JWT_*`) 추가.
  - `apps/api/.env*.example`에 JWT 항목 추가.

## [2026-02-15] 프론트 인증 UX 1차: `MainHeader` 중심 로그인/로그아웃 연동
- **결정**: 인증 UI를 별도 페이지로 분리하지 않고 공통 헤더(`MainHeader`)에 통합하여, 홈/에디터 어디서나 동일한 로그인 상태를 노출함.
- **이유**:
  1. **접근성**: 사용자 동선 어디에서든 로그인/로그아웃 접근이 가능해야 함.
  2. **일관성**: 헤더 단일 진입점으로 모바일 Drawer/데스크탑 UI를 동일 정책으로 유지.
  3. **구현 속도**: `auth/me` 기반 세션 복구를 최소 변경으로 즉시 적용 가능.
- **구현 요약**:
  - `apps/web/src/components/layout/MainHeader.tsx`에서 `/api/v1/auth/me` 호출로 세션 상태 복구.
  - 비로그인 시 `Google 로그인` 버튼(`window.location = /api/v1/auth/google/start`) 노출.
  - 로그인 시 사용자명/이메일 + `로그아웃` 버튼(`POST /api/v1/auth/logout`) 노출.
  - 모바일 Drawer에도 동일 인증 액션을 반영.

## [2026-02-15] 로그인 진입 UX 조정: 헤더 `로그인` -> `/login` 전용 화면
- **결정**: 헤더의 로그인 액션을 즉시 OAuth 리다이렉트 방식에서 `/login` 페이지 이동 방식으로 변경함.
- **이유**:
  1. **명확한 진입점**: 사용자가 로그인 단계로 이동했다는 맥락을 명확히 인지 가능.
  2. **확장 여지**: 추후 공급자 추가(예: Kakao/GitHub) 시 로그인 화면에서 선택지를 확장하기 쉬움.
  3. **요구사항 정합성**: 전용 화면에 `Memeplate` 로고와 하단 CTA를 배치하는 UI 요구를 반영.
- **구현 요약**:
  - `apps/web/src/pages/LoginPage.tsx` 신규 추가.
  - `/login` 라우트 등록(`apps/web/src/App.tsx`).
  - `MainHeader`의 비로그인 버튼 라벨을 `로그인`으로 통일하고 `/login`으로 라우팅.
  - `/login` 하단에 `구글 로그인` 버튼을 배치해 `/api/v1/auth/google/start`로 연결.

## [2026-02-15] 인증 구현 1차: Google OAuth + 서버 세션 쿠키 전략 적용
- **결정**: 인증 엔드포인트를 placeholder에서 실제 동작으로 전환하고, 세션은 `sessions` 테이블 + HttpOnly 쿠키(`mp_session`)로 관리함.
- **이유**:
  1. **보안성**: 브라우저 스토리지 대신 HttpOnly 쿠키를 사용해 토큰 노출 리스크를 완화.
  2. **확장성**: 공급자 확장(`auth_identities`)과 세션 제어(`revoked_at`, `expires_at`)를 분리해 운영 제어를 단순화.
  3. **개발 흐름 확보**: 프론트에서 즉시 사용할 수 있는 `auth/me` 기반 로그인 상태 조회 API를 먼저 제공.
- **구현 요약**:
  - `apps/api/src/modules/auth/routes.ts`에서 아래 엔드포인트 구현.
    - `GET /api/v1/auth/google/start`
    - `GET /api/v1/auth/google/callback`
    - `GET /api/v1/auth/me`
    - `POST /api/v1/auth/logout`
  - Google token exchange/userinfo 호출 후 `users`/`auth_identities` upsert.
  - `sessions` 저장 시 `session_token_hash`를 사용하고, 쿠키에는 원본 세션 토큰을 저장.
  - state 검증(`mp_oauth_state`) 및 logout 시 세션 revoke 처리 추가.

## [2026-02-14] Supabase 인증 DB 스키마 전략: `users + auth_identities + sessions` 분리 채택
- **결정**: OAuth 공급자 확장 가능성을 고려해 사용자 기본 정보(`users`)와 공급자 식별자(`auth_identities`)를 분리하고, 서버 세션(`sessions`)을 독립 테이블로 관리함.
- **이유**:
  1. **공급자 확장성**: Google 외 공급자 추가 시 `users` 스키마 변경 없이 `auth_identities` 레코드만 확장 가능.
  2. **정책 분리**: 사용자 공통 프로필과 공급자 종속 필드를 분리해 도메인 경계를 명확히 유지.
  3. **운영 제어**: 세션 만료/강제 로그아웃/세션 무효화를 서버 측에서 일관되게 처리 가능.
- **구현 요약**:
  - `docs/ai-context/sql/2026-02-14_supabase_auth_schema.sql` 작성.
  - `users(email, display_name)` 최소 컬럼만 유지하고 아바타 컬럼은 도입하지 않음.
  - `auth_identities`에 `unique(provider, provider_user_id)` 및 `unique(user_id, provider)` 제약 적용.
  - `sessions`에 `session_token_hash`, `expires_at`, `revoked_at` 기반 인덱스 추가.

## [2026-02-14] 패키지 운영 방식 전환: `pnpm` 기반 모노레포(`apps/web`, `apps/api`) 채택
- **결정**: 기존 루트 단일 프론트 + `server/` 보조 패키지 구조를 `apps/web`(프론트), `apps/api`(백엔드) 워크스페이스 구조로 재배치하고, 루트는 오케스트레이션 전용 패키지로 전환함.
- **이유**:
  1. **확장성**: 인증/공유/밈플릿 기능 확장 시 패키지 경계를 명확히 분리해 충돌을 줄임.
  2. **일관된 의존성 관리**: `pnpm-lock.yaml` 단일 잠금으로 프론트/백엔드 의존성 버전 드리프트를 완화.
  3. **명확한 실행 경로**: 루트 스크립트에서 workspace filter로 `web/api`를 구분 실행할 수 있음.
- **구현 요약**:
  - `pnpm-workspace.yaml` 추가, 루트 `package.json`에 `packageManager` 및 workspace 스크립트 정의.
  - 루트 `dev`를 병렬 스크립트로 지정해 `pnpm dev` 한 번으로 `apps/web` + `apps/api` 동시 기동.
  - 프론트 파일을 `apps/web`로, API 파일을 `apps/api`로 이동.
  - `apps/web/package.json` 신규 생성, `npm` lock 파일 제거 후 `pnpm-lock.yaml` 생성.
  - `apps/api/README.md`를 새 경로 기준으로 갱신.

## [2026-02-14] 프로덕션 배포 방식 결정: API 서버가 SPA 정적 파일을 함께 서빙
- **결정**: 운영 환경(`NODE_ENV=production`)에서는 `apps/api`가 `apps/web/dist`를 직접 정적 서빙하고, API 라우트 외 경로는 `index.html`로 fallback 처리함.
- **이유**:
  1. **배포 단순화**: 프론트/백엔드를 별도 프로세스로 분리하지 않고 단일 서버로 배포 가능.
  2. **라우팅 일관성**: 클라이언트 라우팅(`/create` 등) 404를 제거하고 SPA 진입점을 보장.
  3. **운영 명확성**: `/api/*`와 정적 라우트를 명확히 분리해 추후 리버스 프록시 구성도 단순화.
- **구현 요약**:
  - `apps/api`에 `@fastify/static` 의존성 추가.
  - `WEB_DIST_DIR` 환경변수(기본 `../web/dist`) 추가.
  - `GET /*` catch-all에서 파일 존재 시 정적 파일 전달, 미존재 시 `index.html` 반환.
  - `/api*`, `/healthz` 경로는 fallback 대상에서 제외.

## [2026-02-14] 백엔드 env 전략 분리: `NODE_ENV` 기반 `.env.development`/`.env.production` 채택
- **결정**: API 서버 환경변수 파일을 개발/운영으로 분리하고, 런타임에서 `NODE_ENV`에 해당하는 `.env.{NODE_ENV}`를 우선 로드하도록 변경함.
- **이유**:
  1. **운영 안전성**: 개발/운영 키 혼입 리스크를 줄이고 배포 시 설정 실수를 방지.
  2. **협업 효율**: 팀원이 밈플릿 파일(`.env.*.example`)을 기준으로 즉시 필요한 값만 채울 수 있음.
  3. **초기 유연성**: Supabase 키가 비어 있어도 서버 기동/헬스체크가 가능하도록 optional 파싱을 보강.
- **구현 요약**:
  - `server/src/config/env.ts`에서 `.env` + `.env.{NODE_ENV}` 순차 로딩 및 빈 문자열 optional 처리 추가.
  - `server/.env.development.example`, `server/.env.production.example` 추가.
  - 헬스체크 URL을 `GET /healthz`로 추가하고 기존 `GET /api/v1/health`는 유지.

## [2026-02-14] 백엔드 분리 전략 채택: `Fastify + TypeScript + Zod` 스캐폴딩 우선
- **결정**: 기존 React 프론트 구조를 유지하면서 `server/` 독립 패키지로 BFF(API 서버) 골격을 먼저 도입하고, 인증/밈플릿 도메인을 모듈 단위로 분리함.
- **이유**:
  1. **단계적 전환 용이성**: 프론트 전체를 재작성하지 않고 API 경유 방식으로 점진 마이그레이션 가능.
  2. **속도와 구조의 균형**: Nest 대비 보일러플레이트가 적어 MVP 속도가 빠르고, Express 대비 타입/검증 구조를 일찍 강제할 수 있음.
  3. **교체 가능성 확보**: `TemplateRepository` 인터페이스를 선행해 Supabase 의존을 인프라 레이어로 격리함.
- **구현 요약**:
  - `server/src/modules/{auth,templates,health}` 모듈 구조 생성.
  - `zod` 기반 요청 스키마(`CreateTemplateSchema`, `UpdateTemplateSchema`) 추가.
  - 루트 스크립트에 API 실행/빌드 진입점(`dev:api`, `build:api`) 연결.
  - 인증/밈플릿 엔드포인트는 placeholder로 열어두고, 실제 구현은 후속 이슈로 분리.

## [2026-02-14] 텍스트 외곽선 단위를 `px`에서 `강도`로 전환하고 폰트 비례 렌더 적용
- **결정**: 텍스트 레이어의 `strokeWidth` 입력 의미를 고정 px가 아닌 상대 강도 값으로 해석하고, 실제 렌더 선 두께는 최종 폰트 크기에 비례해 계산함.
- **이유**:
  1. **가독성 문제 해소**: 작은 글자에서 `1px` 고정 외곽선이 상대적으로 과도하게 두껍게 보이는 문제를 완화.
  2. **사용자 기대 정합성**: UI의 단위 노출을 `px`에서 제거해 “절대 픽셀” 오해를 방지.
  3. **일관성 확보**: 텍스트 크기 변화에 따라 외곽선도 자연스럽게 비례해 커지고 작아지도록 유지.
- **구현 요약**:
  - `MemePropertyPanel.tsx`: `외곽선 두께 (px)`를 `외곽선 강도`로 변경, 입력 범위/슬라이더를 `0~10`으로 조정.
  - `Textbox.ts`: `ctx.lineWidth`를 `strokeIntensity * finalFontSize * 계수` 기반으로 계산하고 최소/최대 값을 clamp 처리.

## [2026-02-13] 레이어 텍스트 편집 2단 레이아웃 적용(입력폭 확장)
- **결정**: 레이어 리스트의 텍스트 레이어 아이템을 1단 혼합형에서 2단 구조로 변경해, 텍스트 입력칸을 하단 전폭으로 배치함.
- **이유**:
  1. **편집성 개선**: 액션 버튼/컬러피커와 입력칸이 한 줄에 공존해 입력 영역이 과도하게 좁았음.
  2. **가독성 향상**: 상단(메타/액션)과 하단(텍스트 입력) 역할을 분리해 레이어 카드의 정보 밀도를 안정화함.
- **구현 요약**:
  - `MemePropertyPanel.tsx` 레이어 아이템에서 텍스트 입력을 하단 `w-full` 입력필드로 분리.
  - 상단에는 `텍스트 레이어` 라벨과 기존 액션(색상/상세/삭제)을 유지.
  - 입력 필드에 `onClick`/`onKeyDown` 전파 차단을 유지해 편집 중 이벤트 간섭 최소화.

## [2026-02-13] 툴바 컴팩트화 1차 적용 (`이미지/편집/공유`)
- **결정**: 툴바의 높이/패딩/그룹 여백을 1차로 축소해 동일 정보량 대비 세로 점유를 줄임.
- **이유**:
  1. **가시 영역 확보**: 특히 모바일/좁은 화면에서 툴바가 차지하는 높이를 줄여 캔버스/패널 가시 영역을 늘림.
  2. **밀도 개선**: 기능 구조를 바꾸지 않고도 섹션을 더 컴팩트하게 정리 가능.
- **구현 요약**:
  - `MemeToolbar.tsx`의 컨테이너 높이 `h-24 -> h-20`.
  - 버튼 패딩 `py-3/4 -> py-2`, 아이콘 크기 `0.9/1.1 -> 0.85/1`.
  - 그룹 래퍼 `p-1.5/rounded-2xl -> p-1/rounded-xl`.

## [2026-02-13] 회전 핸들(MTR) 히트 테스트 좌표 보정
- **결정**: 회전 핸들의 클릭 판정 좌표 계산에 `scale`을 동일하게 적용해 렌더 위치와 히트 영역을 일치시킴.
- **이유**:
  1. **정합성**: 렌더링은 `-halfH - (30 * scale)`인데 히트 테스트는 `-halfH - 30`을 사용해 스케일 환경에서 불일치가 발생함.
  2. **사용성**: 핸들이 보여도 클릭/드래그가 먹지 않는 체감을 제거해야 함.
- **구현 요약**:
  - `Canvas.ts`의 `findControl`에서 `mtr` 좌표를 `-halfH - (30 * scale)`로 수정.

## [2026-02-13] 리사이즈 UX 표준화: 코너 자유변형(단축키 modifier 스펙 제외)
- **결정**: 코너 핸들의 기본 동작을 비율 고정에서 자유변형으로 전환하고, 엣지 핸들의 단일 축 리사이즈 동작을 유지함. `Shift`/`Alt(Option)` modifier 리사이즈는 현 스펙에서 제외함.
- **이유**:
  1. **사용자 기대 정합성**: 일반 그래픽 편집기 UX와 동일한 기본 규칙(코너 드래그 시 가로/세로 동시 자유 조절)을 제공.
  2. **스코프 명확화**: 단축키 기반 조작까지 포함하면 테스트/호환 범위가 확장되어 이번 라운드 목적(기본 조작 직관성 개선)에 비해 과해짐.
  3. **회귀 최소화**: 기존 회전/고정점 계산 구조를 유지하면서 기본 리사이즈 동작만 정리해 안정적으로 반영.
- **구현 요약**:
  - `Canvas.ts` 리사이즈 계산에서 코너 강제 uniform 로직 제거.
  - 핸들 기준 고정점(anchor) 계산은 기존 구조를 유지해 회전 객체에서도 일관 동작.
  - `Shift`/`Alt(Option)` 기반 리사이즈 분기는 제거해 스펙 외 동작으로 처리.

## [2026-02-13] 줌 모드 제거 및 최대 px 상한 기반 단일 자동 스케일로 단순화
- **결정**: `Fit/100%` 토글을 제거하고, 뷰포트 맞춤 + 최대 표시 변 길이(`800px`) 상한을 동시에 적용하는 단일 자동 비율 스케일로 통합함.
- **이유**:
  1. **UI 단순화**: 이중 모드 전환(`Fit`/`100%`) 없이 한 가지 표시 정책으로 학습 비용을 낮춤.
  2. **표시 안정성**: 작은 원본은 적절히 확대하고, 과도한 확대는 `800px` 상한으로 제한해 편집 가독성을 유지.
  3. **일관성**: 원본 크기와 무관하게 항상 비율 유지(contain) 정책으로 확대/축소 동작을 통일.
- **구현 요약**:
  - `MemeEditor.tsx`: `zoomMode` 상태, `Fit/100%` 버튼, 관련 effect 제거.
  - `MemeCanvas.tsx`: `displayScale = min(viewportScale, 800 / max(intrinsicWidth, intrinsicHeight))`로 계산.
  - 캔버스 CSS 표시 크기는 `Math.floor` 기반으로 유지하여 클리핑 리스크를 계속 억제.

## [2026-02-13] Fit 비클리핑 보장 강화를 위한 floor 계산 적용
- **결정**: `fit` 모드에서 캔버스 CSS 표시 크기를 `round` 대신 `floor`로 계산함.
- **이유**:
  1. **가장자리 안정성**: 반올림으로 인해 1px 초과되어 가로/세로가 잘리는 케이스를 방지.
  2. **사용자 기대 충족**: `Fit`의 의미를 “절대 안 잘림(contain)”으로 일관되게 유지.
- **구현 요약**:
  - `MemeCanvas.tsx`에서 `zoomMode === 'fit'`일 때 `displayWidth/Height`를 `Math.floor(...)`로 계산.

## [2026-02-13] 대형 이미지에서 Fit 미동작 체감 수정 (레이아웃 폭 고정)
- **결정**: 편집 레이아웃의 flex 컨테이너에 `min-w-0`을 적용해 대형 캔버스가 부모 폭을 확장시키지 못하도록 수정함.
- **이유**:
  1. **원인 제거**: `100%` 상태의 큰 캔버스가 컨테이너 폭을 밀어 `fitScale`이 사실상 1로 유지되는 케이스가 있었음.
  2. **동작 보장**: `100% -> Fit` 전환 시 실제 뷰포트 폭 기준으로 축소가 즉시 반영되도록 보장.
- **구현 요약**:
  - `EditorLayout.tsx`, `MemeEditor.tsx`, `MemeCanvas.tsx`의 주요 flex 래퍼에 `min-w-0` 추가.

## [2026-02-13] 이미지 변경 시 Fit 자동 복귀 처리
- **결정**: 배경 이미지 교체로 작업영역 크기(`workspaceSize`)가 바뀌면 줌 모드를 자동으로 `fit`으로 전환함.
- **이유**:
  1. **오동작 체감 방지**: 이전 이미지에서 `100%`를 보고 있던 상태가 새 대형 이미지에 그대로 적용되면 `fit`이 안 되는 것처럼 보임.
  2. **초기 가시성 보장**: 새 이미지는 항상 전체 구도를 먼저 보게 하여 편집 시작점을 안정화.
- **구현 요약**:
  - `MemeEditor.tsx`에서 `workspaceSize`(`width`,`height`) 변경을 감지해 `setZoomMode('fit')` 실행.

## [2026-02-13] 줌 퍼센트 표시 제거 및 Fit 순수 화면맞춤 복원
- **결정**: 상단 줌 퍼센트 텍스트를 제거하고, `Fit` 모드에서 확대 상한 없이 순수 화면맞춤 비율을 사용함.
- **이유**:
  1. **UI 단순화**: 퍼센트 숫자 노출을 줄여 상단 컨트롤 밀도를 낮춤.
  2. **직관성**: `Fit` 선택 시 캔버스가 뷰포트를 최대한 채우는 기대 동작을 일관되게 보장.
- **구현 요약**:
  - `MemeEditor.tsx`: `onZoomPercentChange` 및 퍼센트 텍스트 제거.
  - `MemeCanvas.tsx`: `fitScale`의 가변 상한 로직 제거 후 `min(viewport/image)` 순수 계산 적용.

## [2026-02-13] 줌 UI 복원: Fit/100% 재도입 및 기본 Fit 회귀
- **결정**: Auto Fit-only UI를 되돌리고 `Fit`/`100%` 버튼과 퍼센트 표시를 재도입함. 기본 표시 모드는 `Fit`으로 설정.
- **이유**:
  1. **명시성**: 사용자에게 현재 표시 기준(화면 맞춤/원본)을 명확히 제공.
  2. **조작 단순성**: 최소한의 줌 선택지만 유지해 UI 복잡도는 낮추고 예측 가능성은 확보.
- **구현 요약**:
  - `MemeEditor.tsx`: `zoomMode('fit'|'actual')`, 퍼센트 상태, `Ctrl/Cmd+0` 복귀 핸들러 복원.
  - `MemeCanvas.tsx`: `zoomMode`에 따라 `displayScale`을 `fitScale` 또는 `1`로 적용하고 퍼센트 콜백 재연결.

## [2026-02-13] 줌 UI 제거 및 Auto Fit 전용 정책으로 단순화
- **결정**: 상단의 줌 UI(증감 버튼, 퍼센트 입력)를 제거하고, 화면 표시는 Auto Fit만 사용하도록 정리함.
- **이유**:
  1. **UI 밀도 완화**: 상단 컨트롤의 혼잡도를 줄여 핵심 편집 동선(Undo/Redo, 도구 선택)에 집중.
  2. **일관성**: 수동 줌/자동 줌 상태 전환 복잡도를 줄이고 기본 표시 정책을 단일화.
- **구현 요약**:
  - `MemeEditor.tsx`에서 줌 상태/컨트롤 및 관련 핸들러 제거.
  - `MemeCanvas.tsx`에서 `displayScale`을 Auto Fit 단일 계산으로 고정하고 휠 줌 콜백 제거.

## [2026-02-13] Auto Fit 가변 상한(비율 밴드) 적용
- **결정**: Auto Fit 스케일 상한을 고정값 대신 `rawFitScale`(뷰포트/원본 비율) 밴드에 따라 가변 적용함.
- **이유**:
  1. **대형 원본 보호**: 원본이 큰 경우(`rawFitScale <= 1`)에는 확대를 허용하지 않아 과확대 리스크를 제거.
  2. **소형 원본 가독성**: 원본이 작은 경우에만 제한적으로 자동 확대해 초기 가시성을 개선.
- **구현 요약**:
  - `MemeCanvas.tsx`에서 `rawFitScale` 계산 후 밴드별 상한 적용.
  - 밴드: `1.0~1.25 -> 1.1`, `1.25~1.75 -> 1.25`, `1.75+ -> 1.4`.

## [2026-02-13] Auto Fit 과확대 방지 상한 도입
- **결정**: Auto Fit 계산 결과가 100%를 초과하지 않도록 최대 스케일 상한(`1.0`)을 적용함.
- **이유**:
  1. **예측 가능성**: 작은 원본 이미지가 뷰포트에 맞춰 과도하게 커지는 체감을 줄임.
  2. **안정성**: 기본 표시 모드에서 의도치 않은 확대로 인한 편집 오차를 완화함.
- **구현 요약**:
  - `MemeCanvas.tsx`의 `fitScale` 계산에 `AUTO_FIT_MAX_SCALE = 1` 상한 추가.

## [2026-02-13] 줌 UX 고도화: fit/manual 모델 + 연속 줌 컨트롤 도입
- **결정**: 기존 `Fit/100%` 이진 토글을 `fit/manual` 모델로 확장하고, `- / + / 퍼센트 입력` + `Ctrl/Cmd + Wheel` 연속 줌을 도입함.
- **이유**:
  1. **유려한 조작성**: 고정 모드 전환만으로는 미세 조정이 어려워 편집 흐름이 끊기므로 연속 줌이 필요함.
  2. **예측 가능성**: 현재 배율을 숫자로 직접 제어할 수 있어 작업자가 결과를 빠르게 맞출 수 있음.
  3. **일관성 유지**: `Ctrl/Cmd + 0`은 기존처럼 `Fit` 복귀를 유지해 학습 비용을 낮춤.
- **구현 요약**:
  - `MemeEditor.tsx`: `zoomMode`를 `fit/manual`로 변경하고 `InputNumber` 기반 줌 퍼센트 입력 및 `- / +` 버튼 추가.
  - `MemeCanvas.tsx`: `zoomPercent` prop 기반 수동 표시 스케일 계산, `Ctrl/Cmd + Wheel` 이벤트를 상위 콜백으로 전달.
  - 캔버스 표시 크기 전환에 `200ms` 전환 효과를 부여해 배율 변경 체감을 완화.

## [2026-02-13] 텍스트 선명도 개선을 위한 렌더 스케일(Backing Store) 도입
- **결정**: 캔버스 CSS 표시 배율이 100%를 넘을 때도 텍스트가 흐려지지 않도록, 표시 배율과 `devicePixelRatio`를 반영한 렌더 스케일을 캔버스 백킹 스토어에 적용함.
- **이유**:
  1. **품질 유지**: CSS 확대만으로는 비트맵이 늘어나 텍스트가 흐려지므로, 고해상도 재렌더가 필요함.
  2. **일관성**: Fit/100% 전환 시에도 텍스트 품질 편차를 줄여 사용자 체감 품질을 안정화함.
- **구현 요약**:
  - `Canvas.ts`: `renderScale`, `setRenderScale`, backing store 동기화(`syncBackingStoreSize`) 추가.
  - `render()`에서 `setTransform(renderScale, ...)` 적용해 논리 좌표계는 유지하고 픽셀 밀도만 확장.
  - `MemeCanvas.tsx`에서 `displayScale`과 `devicePixelRatio`를 조합해 `canvasInstance.setRenderScale(...)` 호출.

## [2026-02-13] 텍스트 편집 오버레이 스타일 동기화 강화
- **결정**: 더블클릭 편집 textarea 스타일을 텍스트 객체의 실제 속성(`textAlign`, `lineHeight`, `fontFamily`, `fontWeight`, `fontStyle`)과 동기화함.
- **이유**: 편집 중 시각과 최종 캔버스 렌더가 다르면 품질 저하로 오해되기 쉬우므로, WYSIWYG 정합성을 우선함.

## [2026-02-13] lint 경고 0 기준 복구를 위한 `useMemeEditor` 타입/훅 정리
- **결정**: `useMemeEditor.ts`에서 경고를 임시 비활성화하지 않고, 훅 의존성과 타입 정의를 보강해 `eslint --max-warnings 0` 기준을 직접 만족하도록 수정함.
- **이유**:
  1. **검증 파이프라인 안정화**: 현재 정책상 warning도 실패이므로 lint를 즉시 통과 가능한 상태로 유지해야 함.
  2. **유지보수성**: `any` 캐스팅과 미사용 변수는 기능 확장 시 회귀 리스크를 키우므로 조기 정리 필요.
- **구현 요약**:
  - `undo`/`redo`를 `useCallback`으로 래핑하고 키보드 effect 의존성 배열을 정합하게 조정.
  - 더블클릭/업로드 이벤트 파라미터 타입 정의를 추가해 `any` 제거.
  - 불필요한 `as any` 캐스팅과 미사용 catch 변수를 정리.

## [2026-02-13] 캔버스 표시 정책 개선: Fit 기본 + 100% 토글 도입
- **결정**: 캔버스 표시 모드를 `Fit`(기본)과 `100%`(원본 1:1)로 분리하고, 상단 컨트롤에 토글 버튼/퍼센트 표시를 배치함.
- **이유**:
  1. **예측 가능성**: 사용자가 현재 표시 기준(화면 맞춤 vs 원본 크기)을 명확히 인지할 수 있어 혼란을 줄임.
  2. **작업 효율**: 기본은 `Fit`으로 편집 가시성을 확보하고, 필요할 때만 `100%`로 정밀 확인 가능.
  3. **흐름 유지**: Undo/Redo 인접 영역에 배치해 기존 편집 플로우를 해치지 않음.
- **구현 요약**:
  - `MemeCanvas.tsx`: `Fit`/`100%` 토글, 퍼센트 표시, `Ctrl/Cmd + 0`(Fit 복귀) 단축키 추가.
  - 컨테이너 크기와 원본 크기를 기반으로 표시 스케일을 계산하여 비율을 유지함.

## [2026-02-13] 업로드 이미지 원본 해상도 기준 캔버스 논리 크기 반영
- **결정**: 배경 업로드 시 고정 기준값(`targetBaseSize=1200`) 정규화를 제거하고, `naturalWidth/Height`를 캔버스 논리 크기로 사용함.
- **이유**:
  1. **원본 존중**: 업로드 직후 이미지가 의도보다 과도하게 확대/축소되는 체감을 줄임.
  2. **일관성**: 편집 좌표계와 내보내기 해상도가 원본 기준으로 정렬되어 결과 예측성이 좋아짐.
- **구현 요약**:
  - `useMemeEditor.ts`에서 `setBackgroundImage` 로직을 원본 해상도 기반으로 수정.
  - 배경 객체 스케일은 `1`로 설정하고, 표시 스케일은 뷰 레이어(`MemeCanvas`)에서만 제어.

## [2026-02-13] 화면 배율 독립적 조절점(Constant Size Handles) 구현
- **결정**: 캔버스의 논리적 크기와 상관없이 화면상의 물리적 크기를 일정하게 유지하는 조절점 렌더링 로직을 도입함.
- **이유**:
  1. **조작성(Accessibility)**: 모바일 등 작은 화면에서 캔버스가 축소될 경우 조절점이 너무 작아져 터치/클릭이 불가능해지는 문제 해결.
  2. **시각적 일관성**: 선 두께와 핸들 크기를 일정하게 유지하여 어떤 기기에서도 동일한 UI 품질 제공.
- **구현 방식**: 
  - `getSceneScale()`을 통해 (논리 크기 / 실제 CSS 크기) 배율을 구함.
  - 조절점 렌더링(직사각형, 원, 선 두께) 시 해당 배율을 곱하여 시각적 크기를 역보정함.
  - `handleSize`에도 배율을 적용하여 터치 감지 영역을 충분히 확보함.

## [2026-02-13] 모바일 레이아웃 방식 변경 (Overlay -> Vertical Stack)
- **결정**: 모바일 화면에서 하단 툴바와 슬라이드업 패널(Overlay)을 사용하던 기존 방식을 버리고, 캔버스-툴바-속성패널이 세로로 나열되며 전체 페이지가 스크롤되는 방식으로 변경함.
- **이유**:
  1. **사용성(Usability)**: 오버레이 패널이 열렸을 때 캔버스 영역이 가려지거나 조작이 불편했던 문제를 해결.
  2. **직관성**: 모든 편집 도구와 속성이 한 페이지 내에 나열되어 사용자가 스크롤만으로 모든 기능에 접근 가능함.
  3. **구조적 단순화**: 복잡한 애니메이션 및 고정(fixed) 위치 계산 로직을 제거하여 유지보수성 향상.
- **영향**: 모바일 전용 UI 로직의 대폭 리팩토링 및 레이아웃 컴포넌트의 유연성 확보.

## [2026-02-11] 캔버스 이벤트 핸들링 최적화 및 중복 실행 방지
- **문제**: 모바일/태블릿 환경에서 `touchstart`와 `mousedown`이 연속으로 발생하여 핸들러가 2번 실행되고, React Strict Mode 및 HMR 환경에서 `dispose` 누락으로 인해 리스너가 N배로 누적되는 현상 발생.
- **결정**: 
  1. **이벤트 정규화**: `touchstart` 이벤트 발생 시 `e.preventDefault()`를 호출하여 브라우저의 가상 `mousedown` 이벤트 발생을 차단, 정확히 1번만 실행되도록 보장함.
  2. **리스너 생명주기 관리**: 이벤트 핸들러(`handleDown`, `handleMouseMove`)를 클래스 멤버로 격상하고, `dispose()` 메서드에서 `removeEventListener`를 명시적으로 호출하여 메모리 누수 및 중복 등록을 원천 차단함.
- **이유**: 사용자의 의도치 않은 중복 클릭(더블 액션) 방지 및 개발/운영 환경에서의 안정적인 성능 확보.
- **영향**: 모바일 터치 반응성 개선 및 장시간 사용 시 메모리 점유율 안정화.

## [2026-02-10] 고정 틀(Fixed Container) 기반 텍스트 레이어 시스템 도입
- **결정**: 텍스트 레이어를 내용물(글자 수)에 따라 크기가 변하는 방식이 아닌, 사용자가 지정한 물리적 영역을 유지하는 '고정 틀' 방식으로 전환함.
- **이유**:
  1. **레이아웃 안정성**: 텍스트를 수정하거나 지워도 레이어 영역이 변하지 않아 편집 중인 레이아웃이 무너지지 않음.
  2. **디자인 제어**: 사용자가 미리 텍스트가 들어갈 영역을 정의하고 그 안에서 글자가 노는 방식을 선호함 (포토샵/피그마 방식).
- **상세 구현**:
  - **자동 줄바꿈(Word Wrap)**: 틀의 너비를 넘어가면 자동으로 다음 줄로 텍스트를 배치.
  - **상단 정렬(Top Align)**: 텍스트를 틀의 위쪽부터 채워나감 (세로 중앙 정렬 제거).
  - **리사이즈 로직 차별화**: 텍스트 레이어 리사이즈 시 `scale` 대신 `width/height`를 직접 수정하여 **글씨 크기(fontSize)를 절대적으로 유지**.

## [2026-02-10] 렌더링 시스템 최적화 (Dirty Flag & Async Support)
- **결정**: 매 프레임 캔버스를 지우고 다시 그리는 대신, 변경 사항이 있을 때만 그리도록 `needsRedraw` 플래그를 도입하고 렌더링 루프를 개선함.
- **이유**:
  1. **성능 및 배터리**: 불필요한 GPU/CPU 점유율을 낮춰 브라우저 성능 최적화.
  2. **깜빡임 제거**: 브라우저 화면 갱신 주기(V-Sync)와 캔버스 지우기 시점을 일치시켜 떨림 현상 해결.
  3. **비동기 대응**: 이미지 등 리소스가 로딩 중일 때는 로드가 완료될 때까지 루프가 지속되도록 보강하여 업로드 즉시 화면에 나타나도록 함.
- **구현**: `requestRender()` 메서드를 통해 명시적으로 렌더링을 요청하고, `renderLoop`에서 플래그 확인 후 `render()` 수행.

## [2026-02-07] 편집 모드 통합 및 도구 체계 단순화
- **결정**: 'Base/Meme' 모드 구분을 삭제하고, 모든 편집 도구를 단일 환경으로 통합함. 또한 '도형'과 '브러쉬'를 '지우개'라는 하나의 도구로 합침.
- **이유**:
  1. **단순함(Simplicity)**: 사용자가 모드를 전환해야 하는 인지적 비용을 제거하여 더 빠르고 직관적인 편집 환경 제공.
  2. **명확한 기능 분류**: '가리기'를 위한 모든 행위(도형으로 가리기, 브러쉬로 덧칠하기)를 '지우개'라는 명칭 아래 통합하여 기능의 목적을 명확히 함.
  3. **공간 효율**: 툴바 구성을 5개 핵심 도구로 정예화하여 모바일/데스크탑 모두에서 최적의 가독성 확보.
- **도구 구성**: 이미지, 텍스트, 지우개(도형/브러쉬), 레이어, 공유

## [2026-02-07] 레이어 관리 UI 독립화 및 구조 개선
- **결정**: 레이어 관리 기능을 속성 패널 내부의 하단 고정 섹션(Fixed Section)으로 완전히 분리하고, 상단 속성 영역과 시각적/구조적으로 격리함.
- **이유**:
  1. **명확한 영역 분리**: 도구별 세부 설정(속성)과 전체 레이어 구조(관리)를 별도 영역으로 나누어 인지 부하를 줄임.
  2. **사용성 최적화**: 속성 영역이 길어져도 레이어 관리 섹션은 하단에 고정되거나(Desktop) 정해진 비율을 유지하여(Mobile) 항상 접근 가능하도록 함.
- **변경 사항**:
  - `MemePropertyPanel`: `flex-col` 구조를 도입하여 상단은 속성(Scrollable), 하단은 레이어(Fixed Height 40%)로 분리.
  - `MemeEditor`: 모바일 패널 내부의 중복 스크롤을 제거하여 리팩토링된 패널 레이아웃이 정상 동작하도록 수정.

## [2026-02-07] 레이아웃 여백 통일 및 레이어 섹션 디자인 개선
- **결정**: 상단 헤더, 좌측 툴바, 속성 패널의 좌우 여백을 모두 `px-8` (32px)로 통일하고, 레이어 섹션을 더 명확하게 분리함.
- **이유**:
  1. **시각적 정렬**: 화면 전체의 좌측 라인(로고, 툴바 버튼, 패널 내용)을 일치시켜 안정감 있는 레이아웃 제공.
  2. **강력한 구분**: 레이어 관리 영역에 독립된 헤더와 그림자 효과를 추가하여 '속성 편집'과 '구조 관리'의 차이를 명확히 함.
- **변경 사항**:
  - `MemeToolbar`: 너비를 `w-32`로 확장하고 패딩을 `px-8`로 조정.
  - `MemePropertyPanel`: 모든 섹션의 패딩을 `px-8`로 통일하고 레이어 섹션 디자인 고도화.
  - `MemeEditor`: 툴바 너비 확장에 맞춰 사이드바 전체 너비를 `448px` (8-grid)로 조정.

## [2026-02-07] Vite 설정 오류 수정
- **결정**: `vite.config.ts`에서 실제로 설치되지 않은 `@vitejs/plugin-react-swc` 대신 `package.json`에 명시된 `@vitejs/plugin-react`를 사용하도록 수정함.
- **이유**: 잘못된 플러그인 참조로 인한 빌드 환경의 불일치 해결.

## [2026-02-07] 도형 속성 단순화 및 컬러피커 컴포넌트 분리
- **결정**: '도형(Shapes)' 도구에서 불투명도와 외곽선 두께 조절 기능을 제거하고, `MemePropertyPanel.tsx`에 내장되어 있던 `MemeColorPicker`를 독립 컴포넌트로 분리함.
- **이유**: 
  1. **UX 단순화**: 가리기 용도로 주로 사용되는 도형 도구의 불필요한 속성을 제거하여 사용성을 높임.
  2. **관심사 분리**: 비대해진 `MemePropertyPanel`의 코드 가독성을 높이고, 컬러피커의 재사용성을 확보함.
- **변경 범위**:
  - `src/components/editor/MemeColorPicker.tsx` (신규 생성)
  - `src/components/editor/MemePropertyPanel.tsx` (리팩토링)

## [2026-02-07] 8px 그리드 시스템 엄격 적용 (Strict 8px Grid)
- **결정**: 프로젝트 전반에 남아있던 4px 단위(홀수 배수 제외) 및 12px(3) 등의 비표준 간격을 제거하고, 8px(2), 16px(4), 24px(6) 등 짝수 배수 단위로 통일함.
- **이유**: `gap-1.5` (6px), `py-3` (12px) 등은 8px 그리드 시스템의 리듬감을 저해하고 디자인 일관성을 떨어뜨림. 엄격한 규칙 적용을 통해 유지보수성과 시각적 완성도를 높임.
- **변경 범위**:
  - `MemeToolbar`: 도구 버튼 간격(`gap-1.5` -> `gap-2`) 및 패딩(`py-3` -> `py-4`) 수정.
  - `MemePropertyPanel`: 섹션 간 여백(`mb-3` -> `mb-4`) 및 요소 간격(`gap-3` -> `gap-4`) 수정.
  - `MainHeader`: 로고와 타이틀 간격(`gap-3` -> `gap-4`) 수정.
- **2026-02-07 레이아웃 밀도 최적화**:
  - **결정**: 사용자 피드백에 따라 과도하게 넓은 여백을 전방위적으로 축소.
  - **변경 사항**: 
    - `HomePage`, `MemeCanvas` 패딩 축소 (`p-12` -> `p-8`).
    - `MemeToolbar` 너비 및 간격 축소 (`w-32` -> `w-28`, `gap-8` -> `gap-6`).
    - `MemeEditor` 사이드바 너비 축소 (`448px` -> `400px`) 및 캔버스 가용 영역 확대.
    - `MainHeader` 및 `MemePropertyPanel` 수평 패딩 축소 (`px-8` -> `px-6`).

## [2026-02-07] 모바일 UI/UX 고도화 및 반응형 최적화
- **결정**: 모바일 하단 툴바에 가로 스크롤을 도입하고, 모드 전환 스위처의 너비를 축소하며, Empty State UI 크기를 유동적으로 조절함.
- **이유**:
  1. **가용성 확보**: 모바일의 좁은 너비에서 모든 도구 버튼을 노출하기 위해 스크롤 도입이 필수적임.
  2. **가독성 및 편집성**: 속성 패널이 열렸을 때 캔버스 영역이 극도로 좁아지는 문제를 해결하기 위해 Empty State의 수직 점유율을 낮춤.
  3. **터치 UX**: 툴바 아이템 간격을 8px 그리드 내에서 최적화하여 오동작 방지.

## [2026-02-09] TypeScript 타입 안전성 강화 및 의존성 최적화
- **결정**: `src/types/global.d.ts`에서 `fabric` 모듈을 확장하여 `FabricObject`에 `id`, `name` 속성을 추가하고, `@types/node`를 설치함.
- **이유**: 
  1. **타입 안전성**: Fabric.js의 기본 객체 타입에는 없는 사용자 정의 속성(`id`, `name`)을 안전하게 사용하기 위함.
  2. **환경 설정 정상화**: `tsconfig.node.json`에서 발생하는 `node` 타입 미지정 오류를 해결하여 전체 빌드 파이프라인의 안정성을 확보함.

## [2026-02-09] 레이어 관리 UI 간소화 및 세로형 조절 버튼 도입
- **결정**: 레이어 리스트 아이템의 좌측에 세로형 위/아래(`mdiChevronUp`, `mdiChevronDown`) 버튼을 배치하여 순서 조절 기능을 직관적으로 개선함.
- **이유**: 기존의 4단계(맨앞/앞/뒤/맨뒤) 버튼은 공간을 많이 차지하고 복잡해 보였으나, 단순 위/아래 버튼만으로도 충분한 제어가 가능하며 UI를 더 깔끔하게 유지할 수 있음.

## [2026-02-09] 캔버스 내부 작업 영역(Internal Workspace) 및 경계 제한 도입
- **결정**: 실제 이미지 크기보다 상하좌우 60px 큰 캔버스를 생성하고(`CANVAS_MARGIN`), 객체가 이미지 영역을 벗어나지 못하도록 경계 제한 로직을 추가함.
- **이유**: 
  1. **선택 박스 시인성**: 객체가 이미지 가장자리에 있을 때 선택 테두리와 조절점(Corners)이 캔버스 밖으로 잘리는 문제를 해결하기 위함.
  2. **조작 안정성**: 객체가 작업 영역 밖으로 완전히 사라지는 것을 방지하여 사용자 실수를 최소화함.
  3. **내보내기 최적화**: 다운로드 및 클립보드 복사 시에는 `CANVAS_MARGIN`을 제외한 실제 작업 영역만 크롭(Crop)하여 저장되도록 구현.

## [2026-02-09] 모바일 UI 통합 및 슬림 바(Slim Bar) 제거
- **결정**: 모바일에서 객체 선택 시 나타나던 120px 높이의 '슬림 바'를 제거하고, PC와 동일하게 45vh 높이의 전체 속성 패널을 사용하도록 통합함.
- **이유**: 
  1. **기능성 확보**: 슬림 바에서는 레이어 리스트에 접근하기 어려워 다시 도구 버튼을 눌러야 하는 번거로움이 있었음.
  2. **일관성**: 기기별로 다른 UI 구조를 유지하는 대신, 하나의 패널 내에서 모든 편집과 레이어 관리가 가능하도록 하여 학습 비용을 줄임.
  3. **편집성**: 45vh 높이에서도 캔버스 작업 영역이 충분히 확보되며, 레이어 리스트를 보면서 동시에 속성을 편집하는 것이 더 효율적임.

## [2026-02-09] 배경 이미지 처리 방식 변경 (Background to Layer)
- **결정**: Fabric.js의 `backgroundImage` 속성 대신, 일반 객체(`fabric.Image`)로 생성하여 가장 하위 레이어(index 0)에 배치하고 `selectable: false` 처리함.
- **이유**: 캔버스 확장(`CANVAS_MARGIN`) 시 `backgroundImage`는 중앙 배치가 어렵고 여백 제어가 까다롭지만, 일반 객체로 처리하면 좌표(`left`, `top`) 제어가 용이하고 레이어 시스템 내에서 일관되게 관리할 수 있음.


## [2026-02-07] 툴바 UI 단순화 및 디자인 일관성 강화
- **결정**: `MemeToolbar`의 도구 버튼 디자인을 상단 'Base/Meme' 스위처와 동일한 스타일로 통일하고, 별도의 포인트 인디케이터(바 형태) 제거.
- **이유**: 
  1. **시각적 일관성**: 서로 다른 스타일의 버튼들이 혼재되어 발생하는 시각적 노이즈 제거. 
  2. **미니멀리즘**: 버튼 자체의 배경색 변화와 링(Ring) 효과만으로도 활성 상태를 충분히 인지 가능함.
  3. **공간 효율**: 불필요한 인디케이터 바를 제거하여 레이아웃을 더 깔끔하게 유지.
- **변경 사항**:
  - `SidebarItem`의 패딩 및 간격 조정 (8px 그리드 준수).
  - 인디케이터 바 제거 및 활성 상태 스타일 수정 (`bg-white` + `shadow-sm` + `ring-1 ring-black/5`).
  - 툴바 내부 구분선(Divider) 제거 및 여백 조정.

## [2026-02-07] UI/UX 정교화 및 8px 그리드 시스템 강화 (이전)
- **결정**: `SidebarItem`의 `aspect-square` 속성을 제거하고, 모드 스위처와 유사한 직사각형(Rectangular) 스타일로 변경.
- **이유**: 기존 정사각형 버튼은 툴바 섹션의 크기에 비해 작아 보이고, 상단 탭(Base/Meme)과의 시각적 일관성이 떨어짐. 직사각형 구조를 통해 텍스트와 아이콘의 시각적 무게를 조절.
- **인디케이터**: 단순 배경색 변경만으로는 활성 상태 인지가 부족할 수 있어, 데스크탑은 우측 세로 바, 모바일은 하단 가로 바 형태의 포인트 인디케이터를 추가함. (이후 단순화 과정을 통해 제거됨)

### 1. MemeToolbar 버튼 및 인디케이터 개선
- **결정**: `SidebarItem`의 `aspect-square` 속성을 제거하고, 모드 스위처와 유사한 직사각형(Rectangular) 스타일로 변경.
- **이유**: 기존 정사각형 버튼은 툴바 섹션의 크기에 비해 작아 보이고, 상단 탭(Base/Meme)과의 시각적 일관성이 떨어짐. 직사각형 구조를 통해 텍스트와 아이콘의 시각적 무게를 조절.
- **인디케이터**: 단순 배경색 변경만으로는 활성 상태 인지가 부족할 수 있어, 데스크탑은 우측 세로 바, 모바일은 하단 가로 바 형태의 포인트 인디케이터를 추가함.

### 2. 8px 그리드 시스템 엄격 적용
- **결정**: 모든 Padding, Gap, Width 값을 8px의 배수로 재조정 (예: `420px` -> `416px`, `gap-6` -> `gap-8`).
- **이유**: 디자인 가이드(master_rule_v2.md) 준수 및 UI의 리듬감과 안정성 확보.

## 2026-02-07 이전 기록...

- **결정**: 툴바의 모든 요소를 8px 그리드 시스템에 맞춰 재설계하고, 도구 버튼의 스케일을 모드 스위처와 통일함.
- **이유**: 기존 버튼이 주변 섹션에 비해 작아 시각적 불균형이 있었음. 인디케이터 방식을 수직 바에서 '면(Soft Background) + 선(Ring) + 점(Mobile Dot)' 조합으로 변경하여 정보 전달력과 미적 완성도를 동시에 높임.
- **영향**: 데스크탑/모바일 전반의 사용성 및 시각적 완성도 대폭 향상.

- **결정**: 활성화된 도구 버튼의 스타일을 `bg-blue-600` (반전)에서 `bg-white` + `text-blue-600` + `shadow` + `indicator` 방식으로 변경.
- **이유**: 기존의 강한 파란색 블록 스타일은 가독성을 저해하고 전체적인 UI 톤(Light/Clean)과 충돌함. 현대적인 에디터 UI 컨벤션에 맞춰 보다 부드럽고 명확한 활성화 표시 방식을 채택함.
- **영향**: `MemeToolbar` 내의 모든 도구 버튼 및 상단 모드 전환 탭에 적용되어 일관성 향상.


## 2026-02-04: 기술 스택 선정 및 초기 설정
- **프레임워크**: React 19 (Vite) - 최신 React 기능을 활용한 빠른 개발.
- **UI 라이브러리**: Ant Design (antd) 6.x - 최신 디자인 시스템과 컴포넌트 활용.
- **스타일링**: Tailwind CSS 4.x - Ant Design의 세부 간격 보정 및 유틸리티 기반 스타일링.
- **캔버스 라이브러리**: Fabric.js 7.x - ES Module 기반의 최신 API 활용 (Promise 기반 이미지 로딩 등).

## 2026-02-04: PostCSS 및 Tailwind CSS v4 설정 수정
- **이유**: Tailwind CSS v4에서는 `tailwindcss` 직접 호출 방식이 아닌 `@tailwindcss/postcss` 패키지를 별도로 사용해야 함.
- **조치**: `@tailwindcss/postcss` 설치 및 `postcss.config.js` 플러그인 설정 업데이트.

## 2026-02-04: UI/UX 디자인 고도화
- **레이아웃**: Ant Design의 `Tabs`를 사용하여 배경과 텍스트 설정을 분리, 복잡한 편집 도구를 체계화함.
- **사용성 개선**: `Upload.Dragger`를 통한 직관적인 이미지 업로드, 배경 없을 시 Empty state 가이드 제공.
- **단축키 도입**: 사용자 편의를 위해 `Delete`, `Backspace` 키를 통한 객체 삭제 이벤트 리스너 구현.
- **브랜딩**: `theme.useToken()`을 활용하여 Ant Design의 디자인 토큰(색상, 테두리 반경 등)을 앱 전반에 일관되게 적용.

## 2026-02-04: 반응형 UI 및 디자인 시스템 고도화
- **반응형 캔버스**: 브라우저 창 크기에 따라 캔버스 크기가 동적으로 조절되도록 `ResizeObserver` 패턴 적용 (여백 64px 유지).
- **Empty State 개선**: 이미지가 없을 때의 시각적 불일치를 해결하기 위해 캔버스 영역을 전용 업로드 드롭존으로 대체.
- **디자인 규칙 준수**: `GEMINI.md`의 디자인 규칙(8px 그리드, 큰 여백, 200~300ms 애니메이션)을 적용하여 시각적 완성도 향상.
- **환경 최적화**: `package.json`에 `"type": "module"`을 추가하여 PostCSS 설정 관련 빌드 경고 해결.

## 2026-02-04: 아이콘 시스템 교체 및 UI 폴리싱
- **아이콘 라이브러리 변경**: 기존 Ant Design Icons 대신 **Material Design Icons (MDI)** 도입 (`@mdi/js`, `@mdi/react`).
  - **이유**: 더 현대적인 라인 스타일(SVG Path)과 풍부한 아이콘셋 확보, `lucide-react`와 유사한 깔끔한 룩앤필 제공.
- **레이아웃 개선 (User Feedback 반영)**:
  - **헤더**: 불필요한 장식(박스 로고)을 제거하고 타이포그래피 중심의 미니멀 디자인 적용.
  - **사이드바**: 콘텐츠가 모서리에 붙는 문제를 해결하기 위해 `px-8 py-6` 패딩 적용.
  - **푸터**: 다운로드 버튼을 플로팅 스타일(Floating Style)로 변경하여 심미성 향상.
  - **컴포넌트**: 단순 텍스트 태그를 Ant Design `Tag` 컴포넌트로 교체하여 시스템 통일성 강화.


## 2026-02-04: UI 아키텍처 변경 (Tabs → Toolbar)
- **배경**: 편집 기능(텍스트, 도형, 지우개)이 늘어남에 따라 기존의 상단 2개 탭(배경/텍스트) 구조로는 확장이 어려움.
- **결정**: 좌측에 **세로형 아이콘 툴바**를 배치하고, 선택된 도구에 따라 세부 속성 패널을 보여주는 방식으로 변경.
- **이유**:
  1.  **확장성**: 추후 스티커, 필터 등 새로운 기능 추가 용이.
  2.  **직관성**: 텍스트도 '추가하고 수정하는' 하나의 도구로 인식하여 일관된 UX 제공. 포토샵/피그마 등 표준 그래픽 툴의 패턴을 따름.
  3.  **공간 효율**: 좁은 탭 헤더보다 아이콘 툴바가 공간을 덜 차지하며 세련된 느낌을 줌.

## 2026-02-04: 아이콘 시스템 MDI(Material Design Icons) 채택
- **이유**: Ant Design Icons보다 종류가 다양하고, 범용적인 디자인 언어(Material Design)를 따르므로 툴바 아이콘의 일관성을 유지하기 좋음.

## 2026-02-04: Tailwind CSS 4.0 적용
- **내용**: `postcss` 설정과 `@import "tailwindcss";` 문법을 사용하여 최신 CSS 프레임워크 적용.

## 2026-02-04: 도형 도구 UX 개선
- **문제**: 도형의 대각선 크기 조절이 비율이 고정(Uniform Scaling)되어 자유롭지 않고, 다중 선택 시 개별 제어가 불가능함.
- **해결**:
  1.  **자유 변형(Free Transform)**: `uniformScaling: false` 옵션을 적용하여 대각선 드래그 시 가로/세로 비율을 자유롭게 조절 가능하도록 변경.
  2.  **다중 선택 지원**: `getActiveObjects()`를 활용하여 여러 객체를 선택했을 때도 색상 변경 및 삭제가 일괄 적용되도록 로직 수정.
  3.  **아이콘 교체**: 직관적인 인지를 위해 `Filled` 스타일 대신 `Outline` 스타일(`rectangle-outline`, `circle-outline`) 아이콘 적용.

## 2026-02-04: 도형 도구 명칭 및 UI 개선 (User Feedback 반영)
- **명칭 변경**: '가리기 도구'를 사용자 직관성을 위해 '**도형도구**'로 변경.
- **레이아웃 수정**: `Space` 컴포넌트의 잘못된 속성(`vertical` -> `direction="vertical"`)을 바로잡아 패널 내 요소들이 가로 너비를 가득 채우도록 수정.
- **아이콘 시인성 개선**: 
  - 사각형/원형 아이콘을 기존 Outline 스타일에서 **Filled 스타일**(`mdiSquare`, `mdiCircle`)로 변경.

### 2026-02-04: 도형 도구 UI 레이블 간소화
- **결정 사항**: 도형 도구의 버튼 레이블에서 " 추가" 접미사를 제거하고 하단 설명을 삭제함.
- **이유**: 사용자가 기능을 직관적으로 이해할 수 있으므로 불필요한 텍스트를 줄여 UI를 더 깔끔하게 유지하기 위함. ("사각형 추가" -> "사각형", "원형 추가" -> "원형")
  - 아이콘 크기를 확대(1.5 -> 2.2)하고 브랜드 컬러(Blue)를 적용하여 시각적 강조.
  - 버튼 높이를 키우고(`h-20` -> `h-28`) 둥근 모서리(`rounded-2xl`)를 적용하여 더 전문적인 느낌을 제공.

## 2026-02-04: 스포이드(Eyedropper) 도구 구현 방식 선정
- **결정**: 브라우저 기본 **EyeDropper API** 활용.
- **이유**: 
  1.  **성능**: Canvas의 `getImageData`를 직접 처리하는 것보다 빠르고 정확함.
  2.  **범위**: 브라우저 창 외부나 캔버스 밖의 영역에서도 색상을 추출할 수 있어 UX가 우수함.
  3.  **간결함**: 추가적인 라이브러리 없이 표준 API로 구현 가능.
- **제약**: 일부 브라우저(Firefox 등)에서 지원되지 않을 수 있으나, 현재 타겟 사용 환경(Chrome/Edge)에서는 최적의 선택으로 판단하여 도입함. (비지원 시 alert 처리)

## 2026-02-04: 모바일 최적화 및 반응형 UI 전략 (개선)
- **일체형 폴딩(Integrated Folding) UI**:
  - **결정**: 기존의 팝업 스타일 패널 대신, 하단 툴바 바로 위에서 어코디언처럼 확장되는 구조를 채택.
  - **이유**: 툴바와 패널 사이의 시각적 분절감을 줄이고 하나의 '편집 도구 세트'로서 일체감 있는 UX를 제공하기 위함.
- **자동 폴딩 및 초기 상태 제어**:
  - **결정**: 캔버스 영역 터치 시 패널 자동 닫힘 기능 구현 및 페이지 첫 진입 시 도구 미선택 상태 유지.
  - **이유**: 캔버스 편집 영역을 최대한 확보하고, 사용자에게 불필요한 정보 노출을 최소화하여 집중도 있는 작업 환경 제공.

## 2026-02-04: 공유 및 내보내기 UX 개선
- **'공유' 탭 신설 및 다운로드 버튼 이동**:
  - **결정**: 기존에 속성 패널 하단에 항상 고정되어 있던 '이미지 다운로드' 버튼을 제거하고, 별도의 **'공유(Share)'** 탭을 신설하여 그 안으로 기능을 이동시킴.
  - **이유**: 
    1.  **작업 흐름 분리**: '편집(Editing)'과 '내보내기(Exporting)' 단계를 명확히 분리하여 사용자가 편집 중에는 도구 속성에만 집중할 수 있도록 함.
    2.  **확장성**: 추후 SNS 공유, 링크 복사 등 다양한 내보내기 옵션을 추가할 공간을 미리 확보함.
- **헤더 버전 정보 제거**:
  - **결정**: 상단 헤더에 표시되던 `v1.0.0` 텍스트를 제거함.
  - **이유**: 사용자에게 불필요한 정보를 최소화하여 더욱 심플하고 몰입감 있는 UI(Minimalism)를 제공하기 위함.

## 2026-02-05: Undo/Redo (실행 취소/다시 실행) 기능 구현
- **기술**: Fabric.js의 `toJSON`과 `loadFromJSON` 메서드를 활용한 상태 기반 히스토리 스택.
- **결정**: 메모리 효율을 위해 히스토리 스택 크기를 50개로 제한.
  - **UI**: 
  - **플로팅 컨트롤**: 캔버스 우측 상단에 Undo/Redo 버튼 배치 (PC/모바일 공통 접근성).
  - **단축키**: 표준 단축키인 `Ctrl+Z` (Undo) 및 `Ctrl+Y` / `Ctrl+Shift+Z` (Redo) 지원.

## 2026-02-05: 모바일 터치 사용성 및 레이어 관리 개선
- **문제**: 모바일 환경에서 캔버스 터치 시 스크롤이 발생하여 조작이 어렵고, 작은 핸들 크기로 인해 선택이 불편함. 또한 객체 선택 시 패널이 화면을 가리는 문제 발생.
- **해결**:
    1.  **Touch Action 제어**: 캔버스 컨테이너에 `style={{ touchAction: 'none' }}`을 적용하여 브라우저 기본 스크롤 동작 차단.
    2.  **Fabric.js 핸들 및 선택 영역 최적화**:
        - `cornerSize: 12`: 핸들 시인성 확보.
              - `padding: 20`: 객체 주변 터치 영역(Hit Area)을 대폭 확대하여 선택 용이성 개선.
              - `targetFindTolerance: 15`: 터치 정밀도가 낮은 모바일 환경을 고려하여 선택 허용 오차 범위 확대.
              - `uniformScaling: false`: 대각선 핸들 조작 시 비율 고정 없이 가로/세로를 자유롭게 변형 가능하도록 설정.
              3.  **패널 자동 열림 조건 수정**: `window.innerWidth >= 768` (태블릿/PC)일 때만 객체 선택 시 패널이 자동으로 열리도록 제한.
              4.  **편집 시 패널 닫힘**: 모바일에서 캔버스 터치(`mouse:down`) 시 열려있던 패널을 강제로 닫아 편집 화면 확보.      5.  **선택 해제 로직 보강**: 빈 공간 터치(`selection:cleared`) 시 선택 상태(`activeObject`, `isTextSelected` 등)를 즉시 초기화하여 UI 동기화.
    - **레이어 관리**:
      - **용어 변경**: 사용자 혼란 방지를 위해 '배경'을 '**이미지**'로 변경.
      - **패널 명칭 통일**: 툴바 아이콘 명칭과 일치하도록 속성 패널의 제목을 '내보내기'에서 '**공유**'로 변경.
  - **기능 구현**: Fabric.js v6 API(`bringObjectToFront` 등)를 활용하여 레이어 순서 변경 기능 및 UI 구현.

## 2026-02-05: UX 개선 - 편집 도구 활성화 조건 강화- **문제**: 배경 이미지가 없는 상태에서 텍스트나 도형을 추가하면 캔버스가 보이지 않아 사용자가 혼란스러울 수 있음.
- **결정**: 배경 이미지가 업로드되기 전(`!hasBackground`)에는 **모든 편집 도구(텍스트, 도형, 브러쉬, 공유)를 비활성화(Disabled)** 처리함.
- **효과**: 사용자가 "이미지 업로드"라는 첫 단계를 명확히 인지하고 순차적으로 작업을 진행하도록 유도.

## 2026-02-07: 편집 모드 이원화 및 UI/UX 고도화
- **편집 모드 분리 (Base vs Meme)**:
  - **Base 모드**: 배경 이미지 설정, 도형(가리기용), 브러쉬 등 밈의 '바탕'을 만드는 도구들로 구성.
  - **Meme 모드**: 텍스트 추가 및 최종 결과물 공유 등 실제 밈 생성 단계
  - **도입 배경**: 모든 도구가 한꺼번에 노출될 경우의 복잡도를 낮추고, 텍스트 편집 단계에서 배경이나 도형이 실수로 조작되는 것을 방지하기 위함.
- **레이어 잠금(Layer Locking) 로직**:
  - Meme 모드 진입 시 텍스트(`fabric.IText`)를 제외한 모든 객체의 `selectable` 및 `evented` 속성을 `false`로 설정하여 편집을 제한함.
- **UI 일관성 개선**:
  - 속성 패널 상단에 `ModeBadge`를 추가하여 사용자가 현재 어떤 단계에 있는지 명확히 인지하도록 개선.
  - 모바일 하단 UI에서도 모드 전환이 원활하도록 `MemeToolbar`와 `MemePropertyPanel`의 Props 전달 방식 수정.
- **객체 조작성 향상**:
  - `uniformScaling: false`를 적용하여 모든 객체(텍스트, 도형 등)의 가로/세로 비율을 자유롭게 조절할 수 있도록 변경.

## 2026-02-16: 공개 밈플릿 시작(`shareSlug`) 복원 fallback 추가
- **문제**: 일부 공개 밈플릿에서 `content.objects`의 background image `src`가 비어 있어 `/create?shareSlug=...` 진입 시 캔버스가 비어 보이는 케이스가 발생.
- **결정**:
  - 밈플릿 로드 시 `thumbnailUrl`이 있으면 image 객체의 빈 `src`를 보정한다.
  - image 객체 자체가 없으면 `thumbnailUrl` 기반 background image 객체를 자동 주입한다.
  - 밈플릿 로드 완료 후 기본 활성 도구를 `편집`으로 설정해 초기 UX를 일관화한다.
- **이유**: 저장 시점의 데이터 편차가 있어도 "이 밈플릿 사용" 플로우가 중단 없이 동작하도록 복원 탄력성을 확보하기 위함.

## 2026-02-16: 사용자 네비게이션을 우측 상단 계정 메뉴로 일원화
- **결정**:
  - 상단 글로벌 네비게이션에서는 `홈/생성/밈플릿 목록`만 유지한다.
  - 인증 사용자의 우측 상단 이름 영역을 드롭다운 메뉴로 전환해 `마이페이지`, `내 밈플릿`, `로그아웃`을 제공한다.
  - 별도 `마이페이지(/my)`를 추가해 사용자 정보와 `내 밈플릿 관리` 진입점을 제공한다.
- **이유**: 로그인 관련 액션과 개인 자산(내 밈플릿) 동선을 한 곳으로 모아 탐색 부담을 줄이고, 헤더의 정보 구조를 단순화하기 위함.

## 2026-02-16: 마이 영역 공통 사이드바 레이아웃 도입
- **결정**: `MySectionLayout`을 도입해 `/my`, `/my/templates` 좌측에 동일한 사이드 메뉴(`내 프로필`, `내 밈플릿`)를 배치한다.
- **이유**: 개인 영역 내 이동 경로를 고정해 화면 전환 시 맥락을 유지하고, 이후 설정/결제 등 마이 섹션 확장 시 구조를 재사용하기 위함.

## 2026-02-18: 공유 탭 섹션 스타일 정합화 및 사이드패널 스크롤 보강
- **문제**:
  - 공유 탭에서 `밈플릿 공유`와 `리믹스 게시` 섹션의 시각 스타일이 달라 일관성이 떨어짐.
  - 사이드패널 항목이 많아질 때 스크롤이 발생하지 않는 레이아웃 케이스가 존재함.
- **결정**:
  - `리믹스 게시` 영역을 `밈플릿 공유`와 동일한 카드형 섹션 스타일로 통일.
  - 에디터 레이아웃(`EditorLayout`, `MemeEditor`, `MemePropertyPanel`)에 `min-h-0`을 보강해 패널 내부 `overflow-y-auto`가 안정적으로 동작하도록 수정.
- **이유**:
  1. 공유 탭 정보구조를 같은 수준의 액션 그룹으로 인지시키기 위함.
  2. 데스크톱/모바일 혼합 레이아웃에서 플렉스 항목 최소 높이 제약으로 스크롤이 막히는 문제를 방지하기 위함.
