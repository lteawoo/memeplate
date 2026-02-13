# 프로젝트 상태 (Status)

## 현재 진행 상황
- [x] 프로젝트 초기화 (Vite + React 19 + TS)
- [x] UI/UX 고도화 (Ant Design 6 + Tailwind CSS 4)
- [x] UI 구조 리팩토링 (완료)
- [x] 모바일 사용성 개선 (Mobile UX)
- [x] Fabric.js 제거 및 자체 엔진 전환 (완료)
- [x] **자체 엔진 고도화 및 텍스트 레이어 개념 정립 (완료)**
- [x] **모바일 레이아웃 개편 (완료 - 이슈 #25)**
- [x] **고정 크기 조절점 구현 (완료 - 이슈 #27)**
- [x] **텍스트 더블 클릭 편집 기능 구현 (완료 - 이슈 #29)**
  - [x] Canvas 이벤트 시스템에 dblclick 추가
  - [x] HTML Textarea 기반 편집 UI 구현
  - [x] 텍스트 실시간 동기화 및 편집 상태 관리
  - [x] 화면 배율 역계산 로직 추가
  - [x] 조절점 렌더링 및 클릭 영역 보정
  - [x] 모바일 세로 스택 레이아웃 구현
  - [x] 폴딩 패널 로직 제거 및 스크롤 최적화
- [x] **캔버스 줌 UX(Fit/100%) 및 원본 크기 존중 표시 개선 (완료 - 이슈 #30)**
  - [x] 업로드 이미지의 논리 캔버스 크기를 원본 해상도 기준으로 반영
  - [x] 상단 컨트롤에 `Fit`/`100%` 토글 및 퍼센트 표시 추가
  - [x] `Ctrl/Cmd + 0` 단축키로 Fit 복귀 지원
- [x] **린트 경고 제거 및 lint 통과 복구 (완료 - 이슈 #33)**
  - [x] `useMemeEditor.ts`의 `react-hooks/exhaustive-deps` 경고 제거
  - [x] `useMemeEditor.ts`의 `no-explicit-any` 경고 제거
  - [x] `useMemeEditor.ts`의 `no-unused-vars` 경고 제거

## 다음 작업
- [ ] 텍스트 레이어 영역 클리핑(Clipping) 처리
- [ ] 레이어 스타일 상세 설정 (그림자, 외곽선 고도화)
- [ ] 성능 최적화 (Dirty Rect 알고리즘 도입 검토)
- [ ] 단축키(Hotkeys) 지원 확대 (`Ctrl/Cmd + 0` 외 편집 단축키 확장)
