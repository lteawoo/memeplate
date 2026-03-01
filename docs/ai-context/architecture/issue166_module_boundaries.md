# #166 모듈 경계 문서 (상세/에디터 리팩터링)

## 목표
- 상세 페이지와 에디터 훅에서 데이터 로딩, 액션 핸들링, 프레젠테이션 경계를 분리한다.
- 기능 스펙 변경 없이 구조만 정리해 회귀 리스크를 낮춘다.

## 분리 결과

### 1) 템플릿 상세
- 프레젠테이션: `apps/web/src/pages/TemplateShareDetailPage.tsx`
  - 화면 렌더링과 UI 컴포넌트 조합만 담당
- 데이터/액션: `apps/web/src/features/template-detail/hooks/useTemplateShareDetail.ts`
  - 상세 로드, 연관 리믹스 로드, 조회수 증가, 좋아요, 공유, 관리(수정/삭제/공개상태) 담당

### 2) 리믹스 상세
- 프레젠테이션: `apps/web/src/pages/ImageShareDetailPage.tsx`
  - 화면 렌더링, 댓글/답글 렌더 구조 담당
- 데이터/액션: `apps/web/src/features/remix-detail/hooks/useImageShareDetail.ts`
  - 상세 로드, 연관 리믹스 로드, 조회수 증가, 좋아요, 공유, 댓글/답글 등록, 수정 모달 액션 담당

### 3) 에디터 훅
- 오케스트레이션: `apps/web/src/hooks/useMemeEditor.ts`
  - 캔버스 초기화, 오브젝트 조작, 저장/게시 흐름을 연결
- 히스토리 책임: `apps/web/src/hooks/meme-editor/useEditorHistory.ts`
  - Undo/Redo 스택, 히스토리 저장(debounce), 단축키 처리 담당
- 줌 책임: `apps/web/src/hooks/meme-editor/useEditorZoom.ts`
  - 줌 상태/단축키(`Cmd/Ctrl + +|-|0`) 처리 담당

## 경계 원칙
- 페이지 파일은 렌더링 중심으로 유지하고, API 호출/상태 전이는 훅으로 이동한다.
- 서브 훅은 단일 책임(예: 히스토리, 줌)만 담당한다.
- 기존 URL/상태 계약/토스트 문구는 유지한다.

## 검증
- `pnpm --filter memeplate-web lint`
- `pnpm --filter memeplate-web build`

## 후속 권장
- `useTemplateShareDetail`, `useImageShareDetail` 내부를 도메인 단위(좋아요/댓글/관리/공유)로 2차 분리하면 변경 영향 추적이 더 쉬워진다.
