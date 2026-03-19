// 게임 엔진 public API
export { COURT, PHYSICS, SCORING, TIMING } from './constants';
export { createInitialState, startGame, gameTick, restartMatch, getStateSnapshot } from './engine';
export { updatePlayer, updateBall, bounceWalls, resetBallForServe, resetPlayersForServe, checkBallGroundContact } from './physics';
export { checkPlayerBallCollision, resolvePlayerBallCollision, checkBallNetCollision, resolveBallNetCollision, checkBallFloorCollision, resolveBallFloorCollision, processCollisions } from './collision';
export { processScoring, checkWinCondition, resetScore } from './scoring';
export { transitionPlayerState, resolvePlayerAnimState, updatePlayerAnimation, updateBallAnimation, getPlayerSpriteKey, getBallSpriteKey } from './animation';
export { createInputBuffer, bufferInput, consumeInput, createPredictionState, recordPrediction, reconcile, createInterpolationState, pushServerState, interpolate, buildStatePacket, createConnectionHealth, updateConnectionHealth } from './sync';
export type * from './types';
