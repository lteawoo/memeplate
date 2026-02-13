# Memeplate 개발 TODO

## 자체 엔진 기능 고도화 [Completed]
- [x] **컨트롤 인터랙션**
  - [x] 8방향 리사이즈 핸들
  - [x] 회전 핸들 (MTR)
  - [x] 마우스 커서 피드백 (move, resize, crosshair)
- [x] **텍스트 레이어 정립**
  - [x] 자동 줄바꿈 (Word Wrap)
  - [x] 고정 틀(Fixed Container) 방식: 내용 변경 시 크기 유지
  - [x] 리사이즈 시 fontSize 보존 (Scale 대신 Width/Height 조절)
  - [x] 세로 정렬: 상단(Top) 고정
- [x] **렌더링 시스템 최적화**
  - [x] Dirty Flag (`needsRedraw`) 기반 렌더링 루프
  - [x] 비동기 이미지 로딩 대응 (로딩 중 자동 재렌더링)
  - [x] 캔버스 마진 제거 및 좌표계 최적화
  - [x] 이벤트 중복 실행 방지 및 리소스 정리(Cleanup) 로직 구현

## 향후 과제
- [x] **텍스트 더블 클릭 편집 (#29)**
  - [x] `Canvas.ts`: `dblclick` 브라우저 이벤트 리스너 추가 및 커스텀 이벤트 발생
  - [x] `useMemeEditor.ts`: `editingTextId` 상태 및 더블 클릭 핸들러 추가
  - [x] `MemeCanvas.tsx`: 캔버스 상단에 동적 textarea 오버레이 구현
  - [x] 텍스트 스타일(폰트 크기, 정렬 등) 동기화 로직 정교화
- [x] **캔버스 표시/줌 UX 개선 (#30)**
  - [x] `useMemeEditor.ts`: 업로드 시 캔버스 논리 크기를 원본 해상도 기준으로 설정
  - [x] `MemeCanvas.tsx`: `Fit`/`100%` 토글 및 줌 퍼센트 표시 추가
  - [x] `MemeCanvas.tsx`: `Ctrl/Cmd + 0` 단축키로 `Fit` 복귀 지원
  - [x] `MemeEditor.tsx`: `workspaceSize` 전달로 표시 스케일 연동
- [x] **린트 경고 정리 (#33)**
  - [x] `useMemeEditor.ts`: Undo/Redo 키보드 effect 의존성 경고 제거
  - [x] `useMemeEditor.ts`: 이벤트/업로드 파라미터의 `any` 타입 제거
  - [x] `useMemeEditor.ts`: 미사용 에러 변수 정리 및 타입 캐스팅 정리
- [x] **고정 크기 조절점 (#27)**
  - [x] `Canvas.ts`: 화면 배율 역보정 로직 (`getSceneScale`) 도입
  - [x] `Canvas.ts`: `drawControls` 핸들 크기 및 선 두께 보정
  - [x] `Canvas.ts`: `findControl` 터치 영역 배율 대응
- [x] **모바일 레이아웃 개편 (#25)**
  - [x] `MemeEditor.tsx`: 모바일 전용 오버레이(`fixed`) 제거 및 세로 배치 로직 구현
  - [x] `EditorLayout.tsx`: 모바일에서의 `flex-col` 및 `overflow` 속성 조정
  - [x] `MemeCanvas.tsx`: 모바일 스크롤 환경에 맞는 높이 최적화
  - [x] `useMemeEditor.ts`: 패널 상태(`isPanelOpen`) 관련 불필요한 로직 제거
- [ ] **에디터 기능 확장**
  - [ ] 텍스트 영역 클리핑 (틀 밖으로 나가는 글자 숨김)
  - [ ] 다중 선택(Multi-selection) 지원
  - [ ] 그룹화(Grouping) 기능
- [ ] **시스템 고도화**
  - [ ] 웹 워커(Web Worker) 기반 내보내기 처리
  - [ ] Undo/Redo 로직 정밀화
