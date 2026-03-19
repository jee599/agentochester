# 피카츄 배구 멀티플레이어 웹 게임 PRD

## 1. Executive Summary

원작 피카츄 배구(1997)의 게임플레이를 웹 브라우저에서 1:1 실시간 대전으로 재현한다. WebSocket 기반 실시간 동기화로 지연 없는 온라인 매치를 제공하고, HTML5 Canvas + 스프라이트 애니메이션으로 원작의 도트 감성을 살린다. MVP는 1:1 온라인 매치, 로비/매칭, 기본 게임 루프(서브→랠리→득점)에 집중한다.

---

## 2. Problem Statement

### 누가 이 문제를 가지고 있는가?
레트로 게임을 좋아하는 20~40대 웹 유저. 설치 없이 브라우저에서 바로 친구와 대전하고 싶은 사람들.

### 문제는 무엇인가?
원작 피카츄 배구는 Windows 로컬 2인 플레이 전용이다. 온라인 대전이 불가능하고, 모던 OS에서 실행이 어렵다. 웹 기반 클론은 존재하지만 대부분 AI 대전 또는 로컬 2P만 지원한다.

### 왜 고통스러운가?
- 친구와 원격으로 플레이할 방법이 없다
- 설치/호환성 문제로 접근성이 낮다
- 기존 웹 클론은 멀티플레이어 미지원

### 근거
- gorisanson/pikachu-volleyball (GitHub, 2.2k stars) — 웹 클론이지만 온라인 대전 미지원
- 레트로 게임 리메이크 트렌드 (Tetris 99, Pac-Man 99 등)
- WebSocket 기반 실시간 게임의 기술적 성숙도

---

## 3. Target Users & Personas

### Primary Persona: 캐주얼 레트로 게이머
- **연령:** 25~40세
- **행동:** 점심시간/퇴근 후 5~10분 짧은 게임 선호
- **기기:** 데스크톱 브라우저 (Chrome, Safari)
- **동기:** 친구와 간단한 대전, 추억의 게임
- **기술 수준:** 게임 설치/설정 없이 URL만 공유해서 바로 플레이

### Secondary Persona: 스트리머/콘텐츠 크리에이터
- 시청자와 간단한 대전 콘텐츠로 활용
- 공유 링크로 즉시 참여 가능한 UX 필요

---

## 4. Strategic Context

### 비즈니스 목표
- jidonglab.com 트래픽 유입 채널 확보
- 웹 게임 개발 포트폴리오 + 빌드 로그 콘텐츠
- WebSocket 실시간 아키텍처 학습 및 레퍼런스

### 왜 지금인가?
- Next.js 기반 대시보드 프로젝트에 게임 모듈을 통합 가능
- WebSocket + Canvas 조합의 기술 스택이 성숙
- 블로그 빌드 로그 소재로 적합

---

## 5. Solution Overview

### 5.1 게임 규칙

#### 코트 구성
- 캔버스 크기: 432×304px (원작 비율)
- 네트: 중앙 X=216, 상단 Y=160 (바닥 Y=244에서 84px 높이)
- 바닥 Y: 244px
- P1 이동 범위: X 32~212 (네트 왼쪽)
- P2 이동 범위: X 220~400 (네트 오른쪽)
- 배경 레이어: 하늘(타일), 산, 구름(애니메이션), 파도, 바닥

#### 캐릭터 물리
| 속성 | 값 |
|------|-----|
| 이동 속도 | 6px/frame |
| 점프 속도 | -16px/frame (초기) |
| 중력 | 1.0px/frame² |
| 충돌 반경 | 32px |
| 크기 | 64×64px |
| 스파이크 파워 | 8px/frame |
| 파워히트 배율 | 1.5x |

#### 공(배구공) 물리
| 속성 | 값 |
|------|-----|
| 중력 | 0.5px/frame² |
| 충돌 반경 | 20px |
| 최대 속도 | 20px/frame |
| 바운스 계수 | 0.7 (바닥), 1.0 (네트/벽) |

#### 서브 (Serve)
1. 득점한 플레이어(또는 게임 시작 시 P1)가 서브
2. 서브 플레이어의 코트 중앙에 공이 생성됨
3. 공은 수직으로 올라간 후 자유낙하
4. 서브 플레이어가 공을 쳐서 상대 코트로 넘겨야 함
5. 서브 실패(자기 코트에 공이 떨어짐) → 상대 득점

#### 리시브 (Receive)
1. 공이 자기 코트로 넘어오면 몸(머리 포함)으로 공을 튕겨냄
2. 캐릭터와 공의 충돌 시 공의 방향이 반사
3. 반사 각도 = 캐릭터 중심에서 공 중심으로의 벡터 방향
4. 터치 횟수 제한 없음 (원작 동일)

#### 스파이크 (Spike)
1. 점프 중 공의 윗부분을 타격하면 스파이크 발동
2. 공에 강한 하향 속도 부여 (vy += spike_power)
3. 스파이크 판정 조건:
   - 캐릭터가 공중에 있을 것 (y < ground_y)
   - 캐릭터 중심이 공 중심보다 위에 있을 것
   - 충돌 발생 시 공에 하향 가속도 추가

#### 득점 규칙
- 공이 상대 코트 바닥에 닿으면 1점
- 공이 자기 코트 바닥에 닿으면 상대 1점
- **승리 조건:** 먼저 15점 달성 (디폴트)
- 서브권: 득점한 플레이어에게 이동

#### 게임 페이즈

| 페이즈 | 설명 | 다음 페이즈 |
|--------|------|-------------|
| `waiting` | 매칭 대기 | `serving` |
| `serving` | 서브 준비 (60프레임 = 1초 대기) | `playing` |
| `playing` | 랠리 중 | `scoring` |
| `scoring` | 득점 연출 (90프레임 = 1.5초) | `serving` / `gameOver` |
| `gameOver` | 15점 선취 시 종료 | `waiting` (재대전) |

#### 게임 루프 (60fps)
```
매 프레임:
  1. 입력 수신 (키보드: ←→↑, powerHit키)
  2. 플레이어 위치 업데이트 (이동, 점프, 중력, 다이브)
  3. 공 위치 업데이트 (중력, 속도, 최대속도 클램핑)
  4. 충돌 판정 (player_ball, ball_net, ball_floor, ball_wall, ball_ceiling)
  5. 득점 판정 + 서브권 이동
  6. 애니메이션 상태 머신 업데이트
  7. phaseTimer 업데이트
  8. 렌더링 (배경 레이어 → 네트 → 그림자 → 공 → 피카츄 → UI)
```

---

### 5.2 네트워크 아키텍처

#### 전체 구조

```
┌──────────┐     WebSocket      ┌──────────────┐     WebSocket      ┌──────────┐
│ Player 1 │ ◄────────────────► │  Game Server  │ ◄────────────────► │ Player 2 │
│ (Client) │                    │  (Authority)  │                    │ (Client) │
└──────────┘                    └──────────────┘                    └──────────┘
     │                                │                                  │
     │  Input: {keys, seq, ts}        │  State: {ball, p1, p2, score}   │
     │ ───────────────────────►       │ ◄──────────────────────────►    │
     │                                │                                  │
     │  State broadcast (16ms)        │  Input: {keys, seq, ts}         │
     │ ◄───────────────────────       │ ◄──────────────────────────     │
```

#### 동기화 모델: Authoritative Server

| 구성 요소 | 역할 |
|-----------|------|
| **Client** | 입력 전송 + 예측 렌더링 (Client-Side Prediction) |
| **Server** | 물리 시뮬레이션 권한 (Single Source of Truth) |
| **Tick Rate** | 60Hz (16.67ms) — 서버 물리 업데이트 주기 |
| **State Broadcast** | 30Hz (33.33ms) — 클라이언트에 상태 전송 주기 |

#### 프로토콜 설계

**Client → Server (Input Packet)**
```typescript
interface ClientInput {
  type: 'input';
  seq: number;         // 시퀀스 번호 (입력 순서 보장)
  keys: {
    left: boolean;
    right: boolean;
    up: boolean;       // 점프
    powerHit: boolean; // 파워 히트 (스파이크)
  };
  timestamp: number;   // 클라이언트 타임스탬프
}
```

**Server → Client (State Packet)**
```typescript
interface ServerStatePacket {
  type: 'state';
  seq: number;          // 서버 틱 번호
  ball: { x: number; y: number; vx: number; vy: number };
  players: [
    { x: number; y: number; vy: number; state: PlayerAnimState },
    { x: number; y: number; vy: number; state: PlayerAnimState }
  ];
  score: [number, number];
  servingPlayer: 0 | 1;
  phase: GamePhase;
  lastInputSeq: [number, number]; // 각 플레이어의 마지막 처리된 입력 seq
}

type PlayerAnimState = 'idle' | 'walk' | 'jump_prepare' | 'jump_up'
  | 'jump_down' | 'dive_prepare' | 'spike' | 'diving' | 'lying_down';

type GamePhase = 'waiting' | 'serving' | 'playing' | 'scoring' | 'gameOver';
```

**매칭/로비 메시지**
```typescript
// 방 생성
interface CreateRoom { type: 'createRoom'; }
// 방 참가
interface JoinRoom { type: 'joinRoom'; roomId: string; }
// 방 상태
interface RoomState {
  type: 'roomState';
  roomId: string;
  players: string[];
  status: 'waiting' | 'ready' | 'playing';
}
```

#### 지연 보상 (Lag Compensation)

1. **Client-Side Prediction**: 클라이언트는 입력 즉시 로컬에서 예측 이동. 서버 상태 수신 시 보정.
2. **Input Buffer**: 서버는 각 클라이언트의 입력을 버퍼에 저장, 틱마다 소비.
3. **State Interpolation**: 클라이언트는 2개의 서버 상태 사이를 보간하여 부드러운 렌더링.
4. **Reconciliation**: `lastInputSeq`를 기반으로 클라이언트가 미처리 입력을 재적용.

#### 연결 관리

| 이벤트 | 처리 |
|--------|------|
| 연결 끊김 | 5초 대기 후 자동 재연결 시도 (최대 3회) |
| 재연결 성공 | 서버가 현재 게임 상태 전송, 클라이언트 동기화 |
| 재연결 실패 | 상대 승리 처리, 게임 종료 |
| 비정상 지연 (>300ms) | 클라이언트에 경고 표시 |

---

### 5.3 스프라이트/사운드 리소스 목록

> **상태:** 모든 리소스 수급 완료. `public/assets/` 디렉토리에 배치됨.

#### 스프라이트 에셋 (수급 완료)

| 리소스 | 파일명 | 크기 | 설명 |
|--------|--------|------|------|
| 메인 스프라이트시트 | `images/sprite_sheet.png` | 104.7KB | 모든 캐릭터/공/배경/UI 스프라이트 통합 |
| 스프라이트 메타데이터 | `images/sprite_sheet.json` | 16KB | TexturePacker JSON 포맷, 프레임 좌표/크기 정의 |
| 애니메이션 정의 | `animations.json` | — | 상태별 프레임 시퀀스, 전환 규칙, 물리 상수 |
| 아이콘 | `images/IDI_PIKAICON-0.png` | 240B | 브라우저 탭 아이콘 |

#### 스프라이트시트 구성 (sprite_sheet.json 기반)

```
스프라이트시트 내 카테고리:
├── pikachu/          # 캐릭터 프레임 (64×64px 단위)
│   ├── pikachu_0_*   # idle(1) + walk(5프레임)
│   ├── pikachu_1_*   # jump_prepare(1) + jump_up(5프레임)
│   ├── pikachu_2_*   # jump_down(5프레임)
│   ├── pikachu_3_*   # dive_prepare(2프레임)
│   ├── pikachu_4_*   # spike(1프레임)
│   ├── pikachu_5_*   # diving(5프레임)
│   └── pikachu_6_*   # lying_down(5프레임)
├── ball/             # 공 프레임 (40×40px 단위)
│   ├── ball_0~4      # rotate(5프레임, 루프)
│   ├── ball_hyper     # 파워 스파이크 비주얼
│   ├── ball_punch     # 펀치 후 비주얼
│   └── ball_trail     # 속도 잔상 이펙트
├── objects/          # 배경/코트 오브젝트
│   ├── sky_blue       # 하늘 타일 (16×16, repeat)
│   ├── mountain       # 산맥 배경 (432×64)
│   ├── cloud          # 구름 (48×24, 애니메이션)
│   ├── wave           # 파도 (16×32, repeat-x)
│   ├── ground_*       # 바닥 타일 (red/yellow, 16×16)
│   ├── net_pillar*    # 네트 기둥 (8×8, 높이 56px)
│   └── shadow         # 그림자 (32×8)
├── number/           # 점수 숫자 (32×32px, 0~9)
├── messages/         # UI 메시지
│   ├── common/       # ready, game_end, sachisoft
│   ├── ja/           # 일본어 (game_start, fight, title, ...)
│   └── ko/           # 한국어 (game_start, fight, title, ...)
└── sitting_pikachu   # 타이틀 화면 앉은 피카츄 (104×104)
```

#### 애니메이션 상태 머신 (구현 완료)

```
피카츄 상태 전환 그래프:
idle ──► walk ──► idle
  │               │
  └──► jump_prepare ◄──┘
           │
           ▼
       jump_up ──► spike ──► jump_down
           │                    │
           └──► dive_prepare    ▼
                    │        idle / lying_down
                    ▼
                 diving ──► lying_down ──► idle

공 애니메이션 상태:
├── rotate: 비행 중 회전 (5프레임 루프)
├── hyper:  파워 스파이크 비주얼
├── punch:  펀치 후 이펙트
└── trail:  고속 이동 잔상
```

#### 사운드 에셋 (수급 완료)

| 리소스 | 파일명 | 포맷 | 용도 |
|--------|--------|------|------|
| 공 바운스 | `ballbounce` | WAV + M4A | 공이 바닥/벽/네트에 닿을 때 |
| 파워히트 | `powerhit` | WAV + M4A | 스파이크/강타 시 |
| 피 | `pi` | WAV + M4A | 캐릭터 음성 (짧은 울음) |
| 피카 | `pika` | WAV + M4A | 캐릭터 음성 (일반 히트) |
| 피카츄 | `pikachu` | WAV + M4A | 캐릭터 음성 (스파이크) |
| 피피카츄 | `pipikachu` | WAV + M4A | 캐릭터 음성 (승리) |
| 츄 | `chu` | WAV + M4A | 캐릭터 음성 (패배) |
| BGM | `bgm.mp3` | MP3 | 배경 음악 (1.9MB, 루프) |

**포맷 전략:** WAV(원본 품질) + M4A(Safari 호환)으로 이중 제공. BGM만 MP3.
**총 에셋 크기:** ~2.2MB (sprite_sheet 104KB + sounds ~2.1MB)

---

## 6. Success Metrics

### Primary Metric
**동시 접속 매치 수** — 하루 평균 동시 진행 매치 수
- 목표: 출시 4주 후 일 평균 10매치 이상

### Secondary Metrics
| 지표 | 목표 |
|------|------|
| 매치 완주율 | 80% (중도 이탈 없이 15점까지 완주) |
| 평균 매치 시간 | 2~5분 |
| 재방문율 (7일) | 30% |
| 평균 레이턴시 | < 100ms (국내 기준) |

### Guardrail Metrics
- 서버 크래시율: 0%
- 비정상 연결 끊김율: < 5%

---

## 7. User Stories & Requirements

### Epic Hypothesis
피카츄 배구 온라인 대전을 제공하면 레트로 게임 팬들이 반복 방문하고, 블로그/SNS 공유를 통해 자연 유입이 발생할 것이다.

### User Stories

**Story 1: 방 생성 및 공유**
> 유저로서, 방을 만들고 링크를 친구에게 공유해서 바로 대전을 시작하고 싶다.

수락 기준:
- [ ] "방 만들기" 클릭 시 고유 roomId 생성
- [ ] 공유 가능한 URL 생성 (예: `/game?room=abc123`)
- [ ] URL을 열면 자동으로 해당 방에 입장
- [ ] 2명 입장 시 3초 카운트다운 후 게임 시작

**Story 2: 실시간 1:1 대전**
> 유저로서, 상대와 실시간으로 피카츄 배구를 플레이하고 싶다.

수락 기준:
- [ ] 키보드 입력(←→↑)으로 캐릭터 조작
- [ ] 공의 물리 시뮬레이션이 원작과 유사하게 동작
- [ ] 서브 → 랠리 → 득점 루프가 정상 작동
- [ ] 점수판이 실시간 업데이트
- [ ] 15점 선취 시 승패 결과 화면 표시

**Story 3: 스파이크 공격**
> 유저로서, 점프 중 공을 강하게 내리쳐서 상대가 받기 어려운 공격을 하고 싶다.

수락 기준:
- [ ] 점프 상태에서 공 상단 접촉 시 스파이크 발동
- [ ] 스파이크 시 공에 강한 하향 속도 부여
- [ ] 스파이크 전용 애니메이션 재생
- [ ] 스파이크 전용 사운드 재생

**Story 4: 매치 재시작**
> 유저로서, 게임이 끝난 후 같은 상대와 바로 재대전하고 싶다.

수락 기준:
- [ ] 게임 종료 화면에서 "다시 하기" 버튼 표시
- [ ] 양쪽 모두 수락 시 점수 초기화 후 새 매치 시작
- [ ] 한쪽이 나가면 대기 화면으로 복귀

**Story 5: 연결 끊김 복구**
> 유저로서, 네트워크가 잠깐 끊겨도 게임이 유지되길 원한다.

수락 기준:
- [ ] 연결 끊김 시 "재연결 중..." 오버레이 표시
- [ ] 5초 내 재연결 시 게임 상태 복원
- [ ] 재연결 실패 시 상대 승리 처리

### 기술 제약사항
- 브라우저: Chrome 90+, Safari 15+, Firefox 90+ (데스크톱)
- 모바일은 MVP에서 제외 (터치 컨트롤 미지원)
- 서버: Node.js + ws 라이브러리 (또는 Socket.IO)
- 클라이언트: Next.js + HTML5 Canvas

---

## 8. Out of Scope (MVP 제외)

**MVP에 포함하지 않는 것:**

| 항목 | 제외 이유 |
|------|----------|
| AI 대전 (싱글플레이) | 멀티플레이에 집중. AI 로직은 별도 페이즈 |
| 랭킹/리더보드 | 인증 시스템 필요. MVP 이후 |
| 관전 모드 | 2인 대전 안정화 우선 |
| 모바일 터치 컨트롤 | 데스크톱 키보드 조작 우선 |
| 커스텀 캐릭터 스킨 | 기본 피카츄 2종으로 시작 |
| 음성 채팅 | 외부 도구(Discord 등) 활용 |
| 매치메이킹 (랜덤 상대) | 방 링크 공유 방식 우선 |
| 리플레이/녹화 | 게임 상태 저장 복잡도 높음 |
| 토너먼트/대회 모드 | MVP 이후 확장 |

---

## 9. Dependencies & Risks

### Dependencies
| 의존성 | 상태 | 비고 |
|--------|------|------|
| WebSocket 서버 인프라 | ⚠️ 배포 필요 | Vercel은 WebSocket 미지원 → 별도 서버 필요 (Railway, Fly.io 등) |
| 스프라이트 에셋 | ✅ 완료 | `sprite_sheet.png` + `sprite_sheet.json` (원작 리소스 기반) |
| 사운드 에셋 | ✅ 완료 | WAV+M4A 이중 포맷 7종 + BGM (원작 사운드) |
| 애니메이션 정의 | ✅ 완료 | `animations.json` — 상태 머신, 프레임 시퀀스, 전환 규칙 |
| Next.js 기존 프로젝트 통합 | ✅ 완료 | `/game` 라우트, `app/game/page.tsx` |
| ws 라이브러리 | ✅ 설치됨 | `ws@8.19.0` in package.json |

### Risks & Mitigations
| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| WebSocket 서버 비용 | 중 | 무료 티어 활용 (Fly.io 무료 VM), 동시 접속 제한 |
| 레이턴시 (해외 유저) | 중 | 국내 유저 타겟 우선, 리전 확장은 이후 |
| 원작 저작권 이슈 | 높 | 오리지널 스프라이트 사용 금지. 자체 픽셀 아트 제작 또는 "피카츄풍" 오리지널 캐릭터 |
| Canvas 성능 (저사양) | 낮 | 432×304 소규모 캔버스, 부하 적음 |
| 치트/핵 | 중 | Authoritative Server 모델로 서버가 판정 권한 보유 |

---

## 10. Open Questions

| 질문 | 현재 상태 | 결정 필요 시점 |
|------|----------|---------------|
| 캐릭터를 피카츄 그대로 할지, 오리지널 캐릭터로 할지? | 저작권 리스크로 오리지널 캐릭터 권장 | 디자인 착수 전 |
| WebSocket 서버를 어디에 배포할지? (Fly.io vs Railway vs 자체 VPS) | 미정 | 개발 착수 전 |
| 점수 상한을 15점으로 할지 사용자 설정 가능하게 할지? | MVP는 15점 고정 | MVP 이후 |
| BGM을 자체 제작할지 무료 에셋을 사용할지? | 무료 에셋 우선 | 에셋 수급 단계 |
| 게임 캔버스를 대시보드 내 임베드할지 별도 전체 화면으로 할지? | `/game` 별도 페이지 권장 | UI 설계 단계 |

---

## 11. MVP 범위 정의

### MVP에 포함되는 것

```
MVP Scope
├── 로비
│   ├── 방 생성 (roomId 발급)
│   ├── 방 참가 (URL 링크)
│   └── 대기 화면 (상대 접속 대기)
├── 게임 플레이
│   ├── 1:1 실시간 대전
│   ├── 캐릭터 조작 (←→↑ + 파워히트)
│   ├── 공 물리 시뮬레이션
│   ├── 서브/리시브/스파이크
│   ├── 충돌 판정 (캐릭터↔공, 공↔네트/벽/바닥)
│   ├── 득점 및 점수판
│   └── 15점 선취 승리
├── 네트워크
│   ├── WebSocket 실시간 통신
│   ├── Authoritative Server 물리 시뮬레이션
│   ├── Client-Side Prediction
│   ├── State Interpolation
│   └── 연결 끊김 복구 (5초)
├── UI
│   ├── 메인 화면 (방 만들기/참가)
│   ├── 게임 화면 (Canvas + 점수판)
│   ├── 결과 화면 (승/패 + 재대전)
│   └── 연결 상태 표시
├── 에셋
│   ├── 캐릭터 스프라이트 2종
│   ├── 공/네트/배경 스프라이트
│   └── 기본 SFX 6종 (hit, spike, bounce, score, win, lose)
└── 인프라
    ├── Next.js 클라이언트 (Vercel)
    └── WebSocket 서버 (Fly.io 또는 Railway)
```

### 개발 페이즈

| 페이즈 | 내용 | 산출물 | 상태 |
|--------|------|--------|------|
| Phase 1 | 로컬 게임 엔진 | Canvas 렌더링 + 물리(`physics.ts`) + 충돌(`collision.ts`) + 스코어링(`scoring.ts`) | ✅ 완료 |
| Phase 2 | WebSocket 서버 | 방 생성/참가, 상태 동기화, Authoritative Server | ✅ 구현됨 (`sync.ts`, `network-client.ts`) |
| Phase 3 | 네트워크 통합 | Client-Side Prediction, 보간, 재연결 | ✅ 구현됨 |
| Phase 4 | UI/UX + 에셋 | 로비 화면, 결과 화면, 스프라이트/사운드 적용 | ✅ 에셋 수급 완료, 렌더러/사운드매니저 구현 |
| Phase 5 | QA + 배포 | 테스트(충돌/네트워크/성능/E2E), 프로덕션 배포 | 🔲 진행 중 |

### 구현 현황

```
구현 완료 파일:
├── src/game/
│   ├── engine.ts           # 게임 시뮬레이션 엔진 (6.2KB)
│   ├── physics.ts          # 물리 계산 (3.6KB)
│   ├── collision.ts        # 충돌 판정 (5.7KB)
│   ├── animation.ts        # 애니메이션 상태 머신 (5.2KB)
│   ├── scoring.ts          # 득점 로직 (1.4KB)
│   ├── sync.ts             # 네트워크 동기화/재조정 (6.1KB)
│   ├── constants.ts        # 게임 상수 (1.6KB)
│   ├── types.ts            # TypeScript 타입 정의 (2.6KB)
│   └── client/
│       ├── GameCanvas.tsx   # React Canvas 컴포넌트 (6.7KB)
│       ├── game-client.ts   # 클라이언트 오케스트레이션 (8.0KB)
│       ├── renderer.ts      # Canvas 렌더링 (6.2KB)
│       ├── input-manager.ts # 키보드 입력 처리 (2.4KB)
│       ├── network-client.ts# WebSocket 클라이언트 (4.8KB)
│       ├── sound-manager.ts # 오디오 재생 (2.7KB)
│       └── sprite-loader.ts # 스프라이트시트 로딩 (3.0KB)
├── app/game/page.tsx        # 게임 페이지 라우트
├── tests/
│   ├── physics/collision.test.ts      # 충돌 판정 테스트
│   ├── network/websocket.test.ts      # 네트워크 동기화 테스트
│   ├── performance/input-latency.test.ts # 입력 레이턴시 테스트
│   └── e2e/two-player.test.ts         # 2인 플레이 E2E 테스트
└── public/assets/           # 에셋 (스프라이트시트 + 사운드 15개)
```

---

*Last updated: 2026-03-19 (v2 — 구현 현황 반영, 에셋 목록 실제 파일 기준 갱신)*
