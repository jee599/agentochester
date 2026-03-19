// 스프라이트 애니메이션 스테이트머신
// animations.json의 상태 전환 규칙 구현
import type { Player, Ball, PlayerAnimState, BallAnimState } from './types';

// animations.json에서 가져온 프레임 수
const ANIM_FRAME_COUNTS: Record<PlayerAnimState, number> = {
  idle: 1,
  walk: 5,
  jump_prepare: 1,
  jump_up: 5,
  jump_down: 5,
  dive_prepare: 2,
  spike: 1,
  diving: 5,
  lying_down: 5,
};

const ANIM_FRAME_DURATIONS: Record<PlayerAnimState, number> = {
  idle: 0,
  walk: 3,
  jump_prepare: 2,
  jump_up: 2,
  jump_down: 2,
  dive_prepare: 2,
  spike: 4,
  diving: 2,
  lying_down: 3,
};

const ANIM_LOOPS: Record<PlayerAnimState, boolean> = {
  idle: false,
  walk: true,
  jump_prepare: false,
  jump_up: false,
  jump_down: false,
  dive_prepare: false,
  spike: false,
  diving: false,
  lying_down: false,
};

// 허용된 상태 전환 (animations.json stateTransitions 기반)
const VALID_TRANSITIONS: Record<PlayerAnimState, PlayerAnimState[]> = {
  idle: ['walk', 'jump_prepare'],
  walk: ['idle', 'jump_prepare'],
  jump_prepare: ['jump_up'],
  jump_up: ['jump_down', 'spike', 'dive_prepare'],
  jump_down: ['idle', 'lying_down', 'dive_prepare'],
  dive_prepare: ['diving'],
  diving: ['lying_down'],
  spike: ['jump_down'],
  lying_down: ['idle'],
};

const BALL_FRAME_COUNTS: Record<BallAnimState, number> = {
  rotate: 5,
  hyper: 1,
  punch: 1,
  trail: 1,
};

/**
 * 플레이어 애니메이션 상태 전환
 * 유효한 전환인지 검증 후 적용
 */
export function transitionPlayerState(
  player: Player,
  newState: PlayerAnimState,
): boolean {
  if (player.state === newState) return false;

  const allowed = VALID_TRANSITIONS[player.state];
  if (!allowed.includes(newState)) return false;

  player.state = newState;
  player.animFrame = 0;
  player.animTimer = 0;
  return true;
}

/**
 * 플레이어 애니메이션 프레임 진행
 */
export function updatePlayerAnimation(player: Player): void {
  const duration = ANIM_FRAME_DURATIONS[player.state];
  if (duration === 0) return; // 정적 프레임

  player.animTimer++;
  if (player.animTimer >= duration) {
    player.animTimer = 0;
    const maxFrames = ANIM_FRAME_COUNTS[player.state];

    if (player.animFrame < maxFrames - 1) {
      player.animFrame++;
    } else if (ANIM_LOOPS[player.state]) {
      player.animFrame = 0;
    }
    // 루프가 아닌 애니메이션은 마지막 프레임에서 정지
  }
}

/**
 * 물리 상태에 따른 애니메이션 자동 결정
 * 매 프레임 호출 — 물리 엔진 업데이트 후 실행
 */
export function resolvePlayerAnimState(player: Player): void {
  const prev = player.state;

  // lying_down 상태는 애니메이션 완료까지 유지
  if (prev === 'lying_down') {
    const maxFrames = ANIM_FRAME_COUNTS.lying_down;
    const duration = ANIM_FRAME_DURATIONS.lying_down;
    if (player.animFrame < maxFrames - 1 || player.animTimer < duration) {
      return;
    }
    transitionPlayerState(player, 'idle');
    return;
  }

  // spike는 프레임 완료 후 jump_down으로
  if (prev === 'spike') {
    if (player.animTimer >= ANIM_FRAME_DURATIONS.spike) {
      transitionPlayerState(player, 'jump_down');
    }
    return;
  }

  // 다이빙 시퀀스
  if (prev === 'dive_prepare') {
    if (player.animFrame >= ANIM_FRAME_COUNTS.dive_prepare - 1) {
      transitionPlayerState(player, 'diving');
    }
    return;
  }
  if (prev === 'diving') {
    if (player.isGrounded) {
      transitionPlayerState(player, 'lying_down');
    }
    return;
  }

  // 공중 상태
  if (!player.isGrounded) {
    // 다이브 시퀀스 진입 (dive_prepare/diving은 위에서 이미 처리됨)
    if (player.isDiving) {
      transitionPlayerState(player, 'dive_prepare');
      return;
    }

    if (player.vy < 0) {
      // 상승 중
      if (prev === 'idle' || prev === 'walk') {
        // 점프 시작 — jump_prepare 거쳐서 jump_up으로
        transitionPlayerState(player, 'jump_prepare');
      } else if (prev === 'jump_prepare') {
        transitionPlayerState(player, 'jump_up');
      }
    } else if (player.vy >= 0 && prev === 'jump_up') {
      // 하강 전환
      transitionPlayerState(player, 'jump_down');
    }
    return;
  }

  // 지상 상태
  if (prev === 'jump_down') {
    transitionPlayerState(player, 'idle');
    return;
  }

  if (player.vx !== 0) {
    if (prev === 'idle') {
      transitionPlayerState(player, 'walk');
    }
  } else {
    if (prev === 'walk') {
      transitionPlayerState(player, 'idle');
    }
  }
}

/**
 * 공 애니메이션 프레임 진행
 */
export function updateBallAnimation(ball: Ball): void {
  if (ball.state !== 'rotate') return; // 특수 상태는 단일 프레임

  ball.animTimer++;
  if (ball.animTimer >= 2) {
    ball.animTimer = 0;
    ball.animFrame = (ball.animFrame + 1) % BALL_FRAME_COUNTS.rotate;
  }
}

/**
 * 현재 프레임의 스프라이트 키 반환
 * 렌더러에서 사용할 스프라이트 식별자
 */
export function getPlayerSpriteKey(player: Player): string {
  const row = getPlayerSpriteRow(player.state);
  return `pikachu/pikachu_${row}_${player.animFrame}.png`;
}

export function getBallSpriteKey(ball: Ball): string {
  if (ball.state === 'rotate') {
    return `ball/ball_${ball.animFrame}.png`;
  }
  return `ball/ball_${ball.state}.png`;
}

function getPlayerSpriteRow(state: PlayerAnimState): number {
  const rowMap: Record<PlayerAnimState, number> = {
    idle: 0,
    walk: 0,
    jump_prepare: 1,
    jump_up: 1,
    jump_down: 2,
    dive_prepare: 3,
    spike: 4,
    diving: 5,
    lying_down: 6,
  };
  return rowMap[state];
}
