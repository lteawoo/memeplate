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
  - [x] 텍스트, 도형, 지우개, 배경을 동등한 '도구'로 격상
 - [x] **고급 편집 도구 구현 (완료)**
  - [x] **도형(가리기) 도구**: 사각형/원형 추가 (텍스트 가리기 용도)
    - [x] 아이콘 개선 (Outline 스타일) 및 자유 변형(Aspect Ratio unlock) 지원
    - [x] 다중 객체 선택 시 일괄 제어(색상 변경, 삭제) 기능 추가
  - [x] **지우개 도구**: Fabric.js EraserBrush 활용  - [x] **스포이드 도구**: 캔버스 색상 추출 및 적용

## 다음 작업
- [ ] 툴바 UI 구현 및 패널 분리
- [ ] 각 도구별 기능(Shape, Eraser, Eyedropper) 로직 작성
- [ ] Playwright를 이용한 기능 검증