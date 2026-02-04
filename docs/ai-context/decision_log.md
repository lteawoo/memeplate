# 결정 로그 (Decision Log)

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


