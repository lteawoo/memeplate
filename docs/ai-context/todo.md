# Memeplate 개발 TODO

## 1단계: UI 구조 리팩토링 [Completed]
- [x] **Layout 구조 변경**: `Sider` 내부를 `Toolbar`(아이콘)와 `Panel`(속성)로 분할
- [x] **State 관리**: `activeTool` 상태 신설 및 탭 전환 로직 대체
- [x] **Design**: 툴바 아이콘 스타일링 (Active 상태 강조, 툴팁 적용)

## 2단계: 신규 도구 구현 [Completed]
- [x] **도형도구(Shapes)**
  - [x] 사각형/원형 추가 버튼 구현 (UI 고도화 완료)
  - [x] UI 레이블 간소화 (설명 삭제 및 "사각형", "원형"으로 표기)
  - [x] 도형 색상 변경 (ColorPicker)
  - [x] 레이아웃 피팅 및 아이콘 시인성 개선
- [x] **브러쉬(Brush) 도구**
  - [x] Fabric.js `PencilBrush` 활성화 및 색상 연동
  - [x] 브러쉬 크기 슬라이더 구현
  - [x] 브러쉬 모드 toggle 로직 (DrawingMode)
- [x] **스포이드(Eyedropper) 도구**
  - [x] ColorPicker 옆에 스포이드 버튼 배치
  - [x] EyeDropper API 연동을 통한 색상 추출 및 적용

## 3단계: 기능 고도화 및 테스트
- [x] 각 도구 간 전환 시 캔버스 상태(Selection, DrawingMode) 동기화 처리
- [ ] 레이어 순서(Z-index) 관리 기능 추가
- [ ] Playwright E2E 테스트 (도구 전환 및 UI 렌더링 확인)
- [ ] 단축키(Undo/Redo) 지원 검토

## 4단계: 코드 리팩토링 및 컴포넌트 분리
- [ ] **레이아웃 및 구조 분리**: `MemeEditor.tsx`의 거대한 `return` 문을 주요 레이아웃 단위(`EditorLayout`, `MainHeader`, `EditorSider`, `CanvasArea`)로 분할
- [ ] **로직 분리 (Custom Hooks)**: Fabric.js 캔버스 초기화, 객체 조작, 도구별 기능 로직을 `useMemeCanvas` 등의 훅으로 추출
- [ ] **컴포넌트 단위 분리**:
  - [ ] `MemeToolbar`: 좌측 세로 아이콘 툴바 영역
  - [ ] `MemePanelContainer`: 선택된 도구에 따른 속성 패널(Background, Text, Shapes, Brush) 분리
  - [ ] `MemeCanvas`: 캔버스 렌더링 및 Empty State 영역
- [ ] **공통 UI 컴포넌트 정리**: `MemeColorPicker` 등을 별도 파일로 분리하여 재사용성 확보

