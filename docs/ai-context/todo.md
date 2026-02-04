# Memeplate 개발 TODO

## 1단계: UI 구조 리팩토링 [Completed]
- [x] **Layout 구조 변경**: `Sider` 내부를 `Toolbar`(아이콘)와 `Panel`(속성)로 분할
- [x] **State 관리**: `activeTool` 상태 신설 및 탭 전환 로직 대체
- [x] **Design**: 툴바 아이콘 스타일링 (Active 상태 강조, 툴팁 적용)

## 2단계: 신규 도구 구현 [Completed]
- [x] **도형(Shapes) 도구**
  - [x] 사각형/원형 추가 버튼 구현
  - [x] 도형 색상 변경 (ColorPicker)
- [x] **지우개(Eraser) 도구**
  - [x] Fabric.js `EraserBrush` 활성화
  - [x] 지우개 크기 슬라이더 구현
  - [x] 지우개 모드 toggle 로직 (DrawingMode)
- [x] **스포이드(Eyedropper) 도구**
  - [x] ColorPicker 옆에 스포이드 버튼 배치
  - [x] Canvas `getImageData` 또는 `EyeDropper API` 연동
  - [x] 추출한 색상을 현재 선택된 객체(텍스트/도형)에 적용

## 3단계: 기능 안정화 및 테스트
- [ ] 각 도구 간 전환 시 캔버스 상태(Selection, DrawingMode) 동기화 처리
- [ ] Playwright E2E 테스트 (도구 전환 및 UI 렌더링 확인)
