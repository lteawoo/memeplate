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
- [ ] **에디터 기능 확장**
  - [ ] 텍스트 영역 클리핑 (틀 밖으로 나가는 글자 숨김)
  - [ ] 다중 선택(Multi-selection) 지원
  - [ ] 그룹화(Grouping) 기능
- [ ] **시스템 고도화**
  - [ ] 웹 워커(Web Worker) 기반 내보내기 처리
  - [ ] Undo/Redo 로직 정밀화