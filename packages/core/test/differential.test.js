import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRoom, ROOM_1, ROOM_2, ROOM_3, Action } from '../dist/index.js';

test('Differential Fuzzing - Random action sequences within engine bounds', () => {
  const actionsPool = [
    Action.WAIT,
    Action.UP,
    Action.DOWN,
    Action.LEFT,
    Action.RIGHT,
  ];

  // Run 100 pseudo-random fuzz scenarios across all 3 rooms
  for (let seed = 1; seed <= 100; seed++) {
    const room = seed % 3 === 0 ? ROOM_3 : seed % 2 === 0 ? ROOM_2 : ROOM_1;
    const lenA = Math.floor(Math.abs(Math.sin(seed * 11)) * 24);
    const lenB = Math.floor(Math.abs(Math.cos(seed * 17)) * 24);

    const actionsA = [];
    for (let i = 0; i < lenA; i++) {
      actionsA.push(actionsPool[Math.floor(Math.abs(Math.sin(seed + i * 3)) * actionsPool.length)]);
    }

    const actionsB = [];
    for (let i = 0; i < lenB; i++) {
      actionsB.push(actionsPool[Math.floor(Math.abs(Math.cos(seed + i * 5)) * actionsPool.length)]);
    }

    const res = simulateRoom(room, actionsA, actionsB, 24);

    // Mathematical invariant checks
    assert.ok(res.states.length <= 25, 'State history cannot exceed 25 frames (0..24)');
    if (res.completed) {
      assert.ok(res.finishStepA > 0 && res.finishStepA <= 24);
      assert.ok(res.finishStepB > 0 && res.finishStepB <= 24);
      assert.equal(res.jointFinishingStep, Math.max(res.finishStepA, res.finishStepB));
      assert.equal(res.sumFinishingSteps, res.finishStepA + res.finishStepB);
      assert.equal(res.score, (res.jointFinishingStep << 8) | res.sumFinishingSteps);
    } else {
      assert.equal(res.score, 0xffff, 'Incomplete run score must be 0xFFFF');
    }
  }
});
