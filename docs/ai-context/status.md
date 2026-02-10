# 프로젝트 상태 (Status)

## 현재 진행 상황
- [x] 프로젝트 초기화 (Vite + React 19 + TS)
- [x] UI/UX 고도화 (Ant Design 6 + Tailwind CSS 4)
- [x] UI 구조 리팩토링 (완료)
- [x] 모바일 사용성 개선 (Mobile UX)
- [x] Fabric.js 제거 및 자체 엔진 전환 (완료)
- [x] **자체 엔진 고도화 및 텍스트 레이어 개념 정립 (완료)**
  - [x] 8방향 리사이즈 및 회전(MTR) 핸들 구현
  - [x] 마우스 커서 인터랙션 (상황별 커서 변경)
  - [x] **텍스트 레이어 '고정 틀(Fixed Container)' 개념 적용**
    - [x] 자동 줄바꿈(Word Wrap) 구현
    - [x] 리사이즈 시 글자 크기 유지 (Direct Dimension 조절)
    - [x] 상단 정렬(Top Align) 적용
  - [x] 렌더링 최적화 (Dirty Flag 방식 도입, 깜빡임 해결)
  - [x] 캔버스 여백(Margin) 제거 및 1:1 이미지 매칭

## 다음 작업
- [ ] 텍스트 레이어 영역 클리핑(Clipping) 처리
- [ ] 레이어 스타일 상세 설정 (그림자, 외곽선 고도화)
- [ ] 성능 최적화 (Dirty Rect 알고리즘 도입 검토)
- [ ] 단축키(Hotkeys) 지원 확대