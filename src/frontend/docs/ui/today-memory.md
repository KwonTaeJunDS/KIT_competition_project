# `/today` UI Memory v3

## 목적
- `/today` 디자인 결정을 대화 로그가 아니라 문서로 잠근다.
- 반복되는 실수와 방향 흔들림을 줄인다.
- 이후 `/today` 수정은 이 문서를 먼저 확인한 뒤 진행한다.
- 이 문서는 현재 레이아웃을 유지하면서도 인상을 `현대적 학습 OS -> 흐름 중심 역사 UI -> 기록층`으로 바꾸기 위한 구현 기준서다.

## Source Of Truth
- 기준 프론트: `src/frontend`
- 확인 주소: `http://localhost:4000/today`
- `3000` 루트 프론트는 더 이상 기준으로 사용하지 않는다.

## 화면 정체성
- `/today`는 할 일 대시보드가 아니다.
- `/today`는 `오늘 먼저 정리해야 할 시대 흐름을 보여주는 한국사 학습 데스크`다.
- 가장 중요한 정의:
  - `위에서는 판단하고, 아래에서는 기록을 더듬는다.`

## 최상위 잠금 원칙
1. 한 화면에는 `Primary Era`가 하나만 존재한다.
2. 상단은 끝까지 현대적이어야 한다.
3. 아래로 갈수록 화려해지지 않고 더 오래되고 더 조용해져야 한다.
4. 한국성은 장식이 아니라 `위계 / 분절 / 축 / 기록성 / 여백`으로 만든다.
5. 텍스트보다 먼저 레이아웃과 표면에서 한국사 느낌이 나야 한다.
6. 사용자가 느껴야 하는 변화는 `정보 증가`보다 `시간의 깊이 증가`다.

## 핵심 전환
- 이전: 정보 카드 UI
- 잠근 목표: `시대를 통과하는 UI`

스크롤의 의미는 아래와 같다.
- 위: 오늘 무엇을 할지 결정
- 중간: 흐름과 연결 정리
- 아래: 기록과 구조 축적

## 현재 잠긴 구조
1. `Hero Stage`
2. `Era Rail`
3. `Learning Flow Strip`
4. `Broken Chains`
5. `Notes Rail`

## 섹션별 역할

### Hero Stage
- 역할: 오늘의 판단과 첫 행동 제시
- 인상: 가장 현대적, 가장 깨끗함
- 유지 요소:
  - 중심 시대명
  - 한 줄 서사
  - 우선 작업량
  - 강한 CTA 1개
  - 약한 CTA 1개
- 현재 잠금 CTA:
  - `복습 시작`
  - `연결 보기`
- 금지:
  - 과한 전통 디테일
  - 재질 설명 문구 남발
  - 많은 보조 메타
  - 흐름 판단과 관계없는 감성 문장

### Era Rail
- 역할: 전체 시대 속 오늘 위치 확인
- 인상: 시간축이 처음 등장하는 구간
- 유지 요소:
  - 전체 축
  - 중심 시대 1개
  - 연결 시대 최대 2개
  - 나머지는 ghost level
- 금지:
  - 버튼 리스트처럼 보이기
  - 모든 시대를 같은 강도로 보이기
  - 장식형 노드 남발

### Learning Flow Strip
- 역할: 복습 -> 새 문제 -> 다음 연결의 순서 제시
- 인상: 카드 3개가 아니라 하나의 흐름
- 현재 잠금 CTA:
  - `복습 시작`
  - `새 문제 풀기`
  - `{다음 시대}로 이어 보기` 또는 `오답 보기`
- 금지:
  - `자세히 보기`
  - 일반 SaaS 카드 3개처럼 따로 노는 인상
  - 떠오르는 hover

### Broken Chains
- 역할: 가장 한국사다운 핵심 영역
- 인상: 작은 역사 구조도 / 의궤형 도설 기록판
- 유지 요소:
  - `Chain 01` 같은 folio 메타
  - 연결 사슬이 제목보다 더 중요함
  - 시험 축은 하단 주석으로 처리
  - 내부 guide line 허용
- 금지:
  - pill형 노드
  - 일반 정보 카드처럼 보이는 제목 중심 구조
  - 과한 배지

### Notes Rail
- 역할: 기록층, 주석층
- 인상: 카드보다 기록 메모에 가까움
- 유지 요소:
  - 대표 유물
  - 시험 포인트
  - 자주 같이 보는 흐름
  - 다음 연결
- 금지:
  - 메인 Hero보다 더 강한 시선
  - 화려한 색
  - 무거운 대시보드 인상

## 세로 전이 레이어 잠금

### Layer A — Hero Zone
- 역할:
  - 오늘의 판단
  - 상단 Hero
  - 핵심 CTA
  - 주요 수치
- 상태:
  - 가장 현대적
  - 가장 선명
  - 장식 최소
  - texture opacity `0`

### Layer B — Era Rail Zone
- 역할:
  - 시간축 등장
  - 연결의 시작
  - 오늘 위치 확인
- 상태:
  - 시대축과 연결선 존재감 증가
  - 포인트 라인 중요도 상승
  - divider visibility 증가
  - texture opacity `0.01 ~ 0.015`

### Layer C — Flow + Chain Zone
- 역할:
  - 학습 흐름
  - 끊긴 연결
  - 가장 한국사다운 중심 구간
- 상태:
  - 연결과 인과가 주인공
  - 내부 구조선과 기록선 허용
  - 표면이 더 무광화
  - texture opacity `0.02 ~ 0.03`

### Layer D — Notes Rail Zone
- 역할:
  - 시험 메모
  - 다음 연결
  - 보조 기록
- 상태:
  - 가장 오래된 느낌
  - 가장 조용한 색
  - 가장 기록물 같은 인상
  - texture opacity `0.04 ~ 0.05`

## Tailwind/CSS 구현 토큰 잠금

### Color Tokens
#### Background
- `bg-app-top`: `#0B0C0F`
- `bg-app-mid`: `#0E1013`
- `bg-app-flow`: `#101115`
- `bg-app-bottom`: `#121116`

#### Surface
- `surface-hero`: `#15161B`
- `surface-rail`: `#17181E`
- `surface-flow`: `#17171C`
- `surface-notes`: `#16161A`

#### Text
- `text-primary`: `#F3EFE6`
- `text-secondary`: `#B8B2A7`
- `text-tertiary`: `#8F8A80`
- `text-caption`: `rgba(243,239,230,0.48)`

#### Border
- `border-hero`: `rgba(255,255,255,0.16)`
- `border-mid`: `rgba(255,255,255,0.12)`
- `border-low`: `rgba(255,255,255,0.08)`

#### Era Accent
- 고려: `#6E8F89`
- 조선전기: `#C5AE72`
- 조선후기: `#8B6A44`
- 일제강점기: `#A44949`
- 현대: `#5A7FA6`

### Radius Tokens
- `radius-stage`: `20px`
- `radius-card`: `16px`
- `radius-annotation`: `14px`
- `radius-chip`: `999px`

### Spacing Tokens
- `space-stage`: `28px`
- `space-card`: `20px`
- `space-flow`: `18px`
- `space-note`: `16px`
- `space-micro`: `10px`

### Texture Opacity Tokens
- `texture-none`: `0`
- `texture-rail`: `0.01`
- `texture-flow`: `0.02`
- `texture-chain`: `0.03`
- `texture-notes`: `0.045`

### Motion Tokens
- `duration-soft`: `180ms`
- `duration-mid`: `220ms`
- `ease-ui`: `cubic-bezier(0.22, 1, 0.36, 1)`

원칙:
- spring 느낌 금지
- scale 최소화
- border / tint / marker 반응 중심

## 카드 스타일 세로 전이 규칙

### Radius
- Hero: `20px`
- Era Rail: `18px`
- Flow Strip: `16px`
- Broken Chains: `16px`
- Notes: `14~16px`

### Border
- 상단: 가장 선명
- 중단: 선명하지만 조금 부드러움
- 하단: 더 얇고 덜 인공적

권장 알파:
- Hero border: `rgba(255,255,255,0.16)`
- Middle border: `rgba(255,255,255,0.12)`
- Bottom border: `rgba(255,255,255,0.08)`

### Surface
- 상단: 가장 깨끗한 무광
- 중단: 덜 디지털한 무광
- 하단: 따뜻하고 건조한 무광

금지:
- 글래스모피즘
- 블러
- 고광택

### Divider
- 상단: 거의 없음
- 중단: 얇은 연결선 등장
- 하단: 문서형 분절선 증가

### Texture
- 상단: `0`
- Era Rail: `0.01`
- Flow Strip: `0.02`
- Broken Chains: `0.03`
- Notes Rail: `0.045`

기준:
- 질감은 보여야 하는 것이 아니라 `완전히 디지털은 아니네` 정도여야 한다.

## 빈 공간 장치 잠금

### Ghost Axis
- 페이지 왼쪽 14~18% 지점에 얕은 세로 시간축을 둔다.
- Hero에서는 거의 안 보이고 아래로 갈수록 조금 더 느껴져야 한다.

### Segmented Rules
- 직선 divider 대신 분절 리듬을 사용한다.
- 기본 리듬:
  - `12px line / 8px gap / 28px line / 10px gap / 12px line`
- 적용 위치:
  - Era Rail 하단
  - Broken Chains 카드 내부 구획
  - Notes Rail 상단

### Margin Captions
- 10~11px 크기의 작은 주석 캡션을 허용한다.
- 예:
  - `시간축`
  - `흐름`
  - `연결`
  - `기록층`
- 규칙:
  - opacity 낮게
  - 메인보다 절대 튀지 않게
  - 도설 주석처럼 보여야 함

### Eave Shadow
- 섹션 하단에 아주 얕은 그림자감 허용
- 해석은 처마 직접 묘사가 아니라 `처마가 드리운 그림자감`
- 적용:
  - Hero 하단
  - Era Rail 하단
  - Flow Strip 하단
- Notes Rail에서는 거의 없어야 한다.

### Archive Grain
- 하단 구간에만 가장 미세한 잔흔 질감을 깐다.
- 금지:
  - 한지 텍스처 사진
  - 종이 이미지
  - 박물관 벽지 같은 배경

## 전통 요소 번역 원칙

### 한옥
- 직역 금지
- UI 번역:
  - Hero = 진입
  - Era Rail = 마당
  - Flow Strip = 대청
  - Broken Chains = 안쪽 기록
  - Notes Rail = 서고

### 고려청자
- 화려함이 아니라 은은한 정교함으로 해석
- active line, 얇은 곡선 underline, 부드러운 연결선에만 반영

### 조선 백자
- pure white 금지
- 따뜻한 백색 텍스트 사용
- 여백과 정렬의 품위로 해석

### 의궤
- `끊긴 연결`은 일반 카드가 아니라 작은 도설형 기록판으로 해석
- 연결 사슬이 본문보다 앞서야 함

### 단청
- 단청 표면 금지
- 기능적 강조 체계로만 번역
- 강한 포인트는 Hero CTA, active node 같은 높은 위계에만 허용

## Tailwind 클래스 전략 잠금

### 페이지 루트
- 역할:
  - 세로 전이와 배경층을 한 번에 관리
- 권장 구조:
  - `relative min-h-screen`
  - `overflow-x-hidden`
  - 배경은 상단에서 하단으로 어두워지는 레이어드 gradient
- pseudo strategy:
  - `::before`: ghost axis + depth veil 일부
  - `::after`: 하단 archive veil + notes texture fade

### Ghost Axis
- 위치: `left-[14%]`
- 폭: `1px`
- 상단 opacity 거의 0
- 중단부터 보이기 시작
- 하단에서 조금 더 진해짐

### Segmented Rule
- 일반 border-bottom 대신 별도 rule element 사용
- 기본 리듬:
  - `12px / 8px / 28px / 10px / 12px`

### Eave Shadow
- `Hero`, `Era Rail`, `Flow Strip` 하단에 아주 얕게 허용
- `Notes Rail`에는 거의 쓰지 않음

## 섹션별 구현 기준

### Hero Stage
- 유지:
  - 오늘의 판단
  - 중심 시대
  - 한 줄 서사
  - 핵심 설명
  - 수치 4개
  - CTA 2개
- 스타일:
  - 가장 깨끗한 표면
  - 가장 선명한 보더
  - texture 없음
  - 하단에 얕은 eave shadow
- 꼭 바꿀 것:
  - `흑백 문서·적색 경고` 같은 설명형 메타 금지
  - Hero에서 전통 느낌을 텍스트로 말하지 않기

### Era Rail
- 목표:
  - 버튼 모음이 아니라 축 + 노드 + 연결 시대 강조
- 규칙:
  - 중심 시대 1개, 연결 시대 2개만 강하게
  - 나머지는 ghost 처리
  - segmented rule 1개
  - active node underline은 완전 직선 금지

### Learning Flow Strip
- 목표:
  - strip 하나 위에 01 / 02 / 03 셀이 올라간 흐름
- 규칙:
  - `자세히 보기` 금지
  - strip 전체가 하나의 띠처럼 보이게
  - hover는 떠오르지 않고 border/marker만 반응

### Broken Chains
- 목표:
  - 페이지에서 가장 한국사다운 메인 구간
- 규칙:
  - 제목보다 연결 사슬을 크게
  - node를 pill이나 박스로 감싸지 않음
  - thin guide line 위에 텍스트 노드 구조
  - 시험 축은 하단 주석 모듈
  - `Chain 01` 같은 folio label 허용

### Notes Rail
- 목표:
  - 카드가 아니라 기록 여백
- 규칙:
  - 대표 유물 / 시험 포인트 / 자주 같이 보는 흐름 / 다음 연결을 짧은 기록 주석처럼 처리
  - 메인보다 반드시 조용하게

## 현재 적용된 장치
- `Ghost Axis`
- `Segmented Rules`
- `Margin Captions`
- `Archive Grain`
- `Chain folio`

## 현재 적용 상태

### 이미 적용됨
- `4000`만 기준으로 작업
- Hero CTA 간소화
- Flow Strip CTA 간소화
- `자세히 보기` 제거
- `Broken Chains`에 `Chain 01` folio 메타 도입
- 좌측 ghost axis와 레이어별 depth 장치 추가
- 하단으로 갈수록 기록선, 주석, 잔흔이 조금씩 증가

### 아직 더 보강할 것
1. `Broken Chains`의 node를 더 도설형으로 정리
2. `Notes Rail`을 더 기록 여백처럼 축소 정리
3. `Hero`와 `Era Rail` 사이 eave shadow를 더 자연스럽게 보정
4. 스크롤 위치에 따라 axis / grain / guide opacity를 미세 조정

## Before / After 체크

### Hero
- Before:
  - 정보는 좋지만 평범한 카드형
- After:
  - 가장 현대적이고 가장 세련된 무대

### Era Rail
- Before:
  - 시대 버튼 나열 느낌
- After:
  - 축 + 노드 + 연결 구조

### Flow Strip
- Before:
  - 카드 3개
- After:
  - 하나의 띠 위에 3개 흐름 셀

### Broken Chains
- Before:
  - 카드형 오답 리스트 느낌
- After:
  - 역사 구조도 / 도설판 / 기록 연결 인상

### Notes Rail
- Before:
  - 보조 카드 모음
- After:
  - 기록 여백 / 사료 주석 / 하단 축적층

## 인터랙션 잠금

### 상단
- hover: border 강화 + 아주 약한 tint
- scale 없음
- shadow 거의 없음

### 중단
- hover: left rail 강조 + 캡션 선명도 상승
- 연결선이 조금 더 또렷해짐

### 하단
- hover: underline 또는 margin marker 우선 반응
- 카드 전체가 뜨지 않음
- 문서를 집어보는 느낌

### 스크롤 반응
- texture가 움직이면 안 된다.
- opacity만 아주 천천히 증가해야 한다.
- ghost axis도 조금 더 보이는 정도까지만 허용한다.

## QA 체크리스트
- [ ] 위는 현대적이고 아래는 기록적으로 느껴지는가
- [ ] 아래로 갈수록 화려하지 않고 오래되어 보이는가
- [ ] 빈 공간이 그냥 비어 있지 않고 의미를 가지는가
- [ ] Hero는 전통 장식 없이도 품위가 느껴지는가
- [ ] 첫 CTA가 가장 명확한가
- [ ] Era Rail은 버튼 모음처럼 보이지 않는가
- [ ] Flow Strip은 3개 카드가 아니라 하나의 흐름처럼 보이는가
- [ ] Broken Chains는 제목보다 연결 사슬이 먼저 보이는가
- [ ] Notes Rail은 메인과 경쟁하지 않는가

## 반복 금지 목록
- 다시 어두운 검정 대시보드로 회귀하지 말 것
- 기와/한지/단청을 직접 이미지나 패턴으로 쓰지 말 것
- `Primary Era`가 여러 개처럼 보이게 만들지 말 것
- 같은 의미의 중심 시대 메시지를 여러 섹션에서 반복하지 말 것
- `끊긴 연결`을 다시 pill 카드 목록처럼 되돌리지 말 것
- 하단 Notes 영역을 메인 카드처럼 강조하지 말 것
- 전통성을 문장으로만 설명하려고 하지 말 것
- 아래로 갈수록 화려하게 만들지 말 것
- 질감이 눈에 띄게 보이게 만들지 말 것

## 구현 우선순위
1. 루트 세로 전이 배경 + ghost axis 적용
2. Hero / Era Rail 표면 구분
3. Flow Strip을 strip처럼 재구성
4. Broken Chains를 도설형으로 리디자인
5. Notes Rail을 기록 주석형으로 정리
6. margin captions / segmented rules / eave shadow 미세 조정

## 작업 규칙
- `/today` 수정 전에는 이 문서를 먼저 확인한다.
- 이 문서와 충돌하는 변경은 하지 않는다.
- 새로운 방향 전환이 필요하면 먼저 이 문서를 갱신하고 그 다음 UI를 수정한다.

## 최종 잠금 문장
이 페이지의 전통성은 `문양, 배경 이미지, 붓글씨`에서 오지 않는다.

대신 아래 다섯 가지에서 온다.
- 세로 깊이
- 무광 표면
- 얇은 선의 분절
- 기록 같은 여백
- 아래로 갈수록 짙어지는 축적감

즉 `/today`는 `정보를 보여주는 카드 화면`이 아니라, `한국사를 구조로 읽게 만드는 세로 기록 데스크`가 되어야 한다.
