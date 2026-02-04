# 프로젝트 상태 (Status)

## 현재 진행 상황
- [x] 프로젝트 초기화 (Vite + React 19 + TS)
- [x] UI/UX 고도화 (Ant Design 6 + Tailwind CSS 4)
  - [x] 상단 헤더 및 전문적인 레이아웃 구성
  - [x] 반응형 캔버스 및 Empty State 디자인
  - [x] **아이콘 시스템 교체** (MDI 적용 완료)
  - [x] **Tailwind CSS 4 설정 최적화** (`@import` 문법 적용)
- [x] Fabric.js 기반 MemeEditor 핵심 기능 구현
  - [x] 이미지 로드/업로드, 텍스트 추가/편집
  - [x] 이미지 다운로드
- [x] **UI 구조 리팩토링 (완료)**
  - [x] 탭 기반 → **툴바(Toolbar) 기반** 에디터로 변경
  - [x] 텍스트, 도형, 브러쉬를 동등한 '도구'로 격상
  - [x] **고급 편집 도구 구현 (완료)**
    - [x] **도형도구**: 사각형/원형 추가, 자유 변형, 다중 선택 지원
    - [x] **브러쉬 도구**: 자유 드로잉 기능 및 색상/두께 조절
    - [x] **스포이드 도구**: 브라우저 기본 EyeDropper API 연동을 통한 색상 추출
 
 ## 다음 작업
 - [ ] **코드 리팩토링 (진행 중)**: `MemeEditor.tsx` 대규모 분할 및 컴포넌트화
 - [ ] Playwright를 이용한 E2E 테스트 코드 작성 및 검증
 - [ ] 레이어 순서 조절 (Bring to front/Send to back) 기능 추가
 - [ ] 단축키(Ctrl+Z/Y)를 통한 Undo/Redo 기능 검토