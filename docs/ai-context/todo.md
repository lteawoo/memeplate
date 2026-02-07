# Memeplate 개발 TODO

## 1단계: UI 구조 리팩토링 [Completed]
- [x] **Layout 구조 변경**: `Sider` 내부를 `Toolbar`(아이콘)와 `Panel`(속성)로 분할
- [x] **State 관리**: `activeTool` 상태 신설 및 탭 전환 로직 대체
- [x] **Design**: 툴바 아이콘 스타일링 (Active 상태 강조, 툴팁 적용)

## 2단계: 신규 도구 구현 [Completed]
- [x] **도형도구(Shapes)**
  - [x] 사각형/원형 추가 버튼 구현 (UI 고도화 완료)
  - [x] UI 레이블 간소화 (설명 삭제 및 "사각형", "원형"으로 표기)
  - [x] 도형 색상 변경 (ColorPicker 컴포넌트 분리 완료)
  - [x] 도형 속성 단순화 (불투명도, 외곽선 두께 제거)
  - [x] 레이아웃 피팅 및 아이콘 시인성 개선
- [x] **브러쉬(Brush) 도구**
  - [x] Fabric.js `PencilBrush` 활성화 및 색상 연동
  - [x] 브러쉬 크기 슬라이더 구현
  - [x] 브러쉬 모드 toggle 로직 (DrawingMode)
- [x] **스포이드(Eyedropper) 도구**
  - [x] ColorPicker 옆에 스포이드 버튼 배치
  - [x] EyeDropper API 연동을 통한 색상 추출 및 적용

## 3단계: 기능 고도화 및 테스트 [In Progress]
- [x] 각 도구 간 전환 시 캔버스 상태(Selection, DrawingMode) 동기화 처리
- [x] **Undo/Redo (실행 취소/다시 실행) 기능**
  - [x] History Stack 로직 (JSON 기반)
  - [x] 키보드 단축키 연결
  - [x] UI 버튼 구현 (Floating Control)
- [ ] 레이어 순서(Z-index) 관리 기능 추가
- [ ] Playwright E2E 테스트 (도구 전환 및 UI 렌더링 확인)

## 4단계: 코드 리팩토링 및 컴포넌트 분리 [Completed]

- [x] **레이아웃 및 구조 분리**: `MemeEditor.tsx`의 거대한 `return` 문을 주요 레이아웃 단위(`EditorLayout`, `MainHeader`, `EditorSider`, `CanvasArea`)로 분할

- [x] **컴포넌트 단위 분리**:

  - [x] `MemeToolbar`: 좌측 세로 아이콘 툴바 영역 (모바일 대응 완료)

  - [x] `MemePropertyPanel`: 선택된 도구에 따른 속성 패널 분리

  - [x] `MemeCanvas`: 캔버스 렌더링 및 Empty State 영역

- [x] **공통 UI 컴포넌트 정리**: `MemeColorPicker`를 별도 파일로 분리하여 재사용성 확보 (Issue #6)

- [x] **타입 및 린트 정리**: `any` 타입 제거 및 ESLint 규칙 준수



## 5단계: 모바일 최적화 및 UX 개선 [Completed]

- [x] **반응형 레이아웃**: 모바일/데스크탑 분기 처리 (`flex-col` vs `flex-row`)

- [x] **네비게이션**: 모바일 헤더 햄버거 메뉴 구현
  - [x] PC 뷰에서 햄버거 버튼 숨김 처리
  - [x] 모바일 Drawer 메뉴 정렬 및 스타일 개선

- [x] **하단 탭바 & 폴딩 UI**: 모바일 환경에서 툴바 하단 배치 및 **일체형 폴딩(Expansion)** UI 구현 (시각적 검증 완료)

- [x] **사용성 개선**: 캔버스 터치 시 패널 자동 닫힘 및 초기 진입 시 패널 숨김 처리 (시각적 검증 완료)

- [x] **캔버스 최적화**: 모바일 화면 너비에 맞춘 캔버스 리사이징 로직 추가



## 6단계: 기능 고도화 및 테스트
- [x] AI 실행 환경 가이드 작성 (AGENTS.md)
- [x] **공유/내보내기 UX 개선**:
  - [x] '공유' 탭 신설 및 다운로드 버튼 이동
  - [x] 상단 헤더 버전 정보 제거 (Minimal Design)
  - [x] **내보내기 옵션 확장**: PNG, JPG, WEBP, PDF 포맷 선택 지원
  - [x] **클립보드 지원**: 이미지 복사 기능 추가
  - [x] **사용성 개선 (Fix)**: 
    - [x] 캔버스 내부 조작 시에는 패널 유지
    - [x] 캔버스 외부(배경) 터치 시에는 패널 닫힘 (Robust Interaction)
  - [x] **UI 단순화**: 불필요한 설명 텍스트 제거하고 즉시 기능 제공
  - [x] **UX 개선**: 이미지 업로드 전 편집 도구(텍스트, 도형, 브러쉬, 공유) 비활성화
- [x] **편집 모드 이원화 (Base / Meme)**:
  - [x] 모드별 도구 분리 및 툴바 UI 업데이트
  - [x] 캔버스 객체 잠금 로직 구현
  - [x] 속성 패널 내 모드 표시용 Badge 추가
- [x] 레이어 순서(Z-index) 관리 기능 추가
- [x] **Undo/Redo 지원**: Ctrl+Z/Y 단축키 및 버튼 추가
- [x] **UI/UX 정교화 (Design Polish)**:
  - [x] 8px 그리드 시스템 전면 적용 및 레이아웃 여백 재조정
  - [x] MemeToolbar 버튼 디자인 단순화 및 모드 스위처와 일관성 통합
  - [x] 불필요한 인디케이터 제거 및 8px 그리드 시스템 최적화
  - [x] **8px 그리드 시스템 엄격 적용 (Fix)**: Tailwind 홀수 단위(3, 1.5 등) 제거 및 짝수 단위(2, 4 등)로 전면 교체
  - [x] PropertyPanel 내부 섹션 간격 및 컴포넌트 크기 최적화
