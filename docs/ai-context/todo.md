memeplate 개발 TODO (Fabric.js 기반)

1단계: 환경 구성 및 기본 레이아웃
[x] Project Init: Vite + React + Tailwind CSS 세팅
[x] Main UI: Ant Design Layout 기반 고도화된 편집기 레이아웃 구현
[x] Main UI: 반응형 디자인 및 Empty State 고도화
[x] Main UI: 아이콘 교체(MDI) 및 패딩/레이아웃 폴리싱
[ ] Main UI: 템플릿 앨범형 그리드(Masonry) 레이아웃 구현

2단계: Fabric.js 편집기 핵심 구현
[x] Canvas Init: useRef를 이용해 Fabric Canvas 인스턴스 초기화 및 메모리 해제(Cleanup) 로직 작성
[x] Image Drop: 배경 이미지 업로드 및 URL 로드, 컨테이너 비례 크기 최적화
[x] Meme Text: 
  - [x] 클릭 시 캔버스 중앙에 편집 가능한 텍스트(fabric.IText) 추가
  - [x] 밈 표준 스타일 적용 (Impact 폰트 + 흰색 글씨 + 검정색 두꺼운 외곽선)
[x] Object Control: 텍스트 드래그, 크기 조절, 회전 기능 활성화

3단계: 편집 디테일 및 기능 확장
[x] Text Styling UI: 탭 메뉴를 통한 폰트 크기, 색상, 외곽선 두께 조절 패널
[x] Delete Action: Delete/Backspace 키 및 UI 버튼을 통한 객체 삭제 로직
[ ] Sticker Support: 간단한 이모지나 스티커 이미지를 캔버스 위에 추가하는 기능
[ ] Layer Control: 객체의 앞/뒤 순서를 조절하는 기능

4단계: 이미지 생성 및 공유
[x] Image Export: canvas.toDataURL()을 이용해 편집된 결과물을 이미지로 추출
[x] Download: 생성된 이미지를 브라우저에서 바로 다운로드
[ ] Clipboard: 추출된 이미지를 클립보드에 바로 복사하는 기능 (선택 사항)

5단계: 데이터 연결 및 배포
[ ] Mock Data: 템플릿 이미지 경로와 태그가 담긴 templates.json 작성
[ ] Deployment: Vercel 등을 통한 배포 및 모바일 브라우저 동작 테스트