import test from 'node:test';
import assert from 'node:assert/strict';
import { Action, simulateRoom, ROOM_1 } from '../dist/index.js';

test('Relay Rooms Engine - Blocked by wall becomes WAIT', () => {
  // Start A is at (1,1) = 9. Moving UP goes to (1,0) = 1 (wall).
  const res = simulateRoom(ROOM_1, [Action.UP], [Action.WAIT], 1);
  assert.equal(res.states[1].charA.cell, 9, 'Char A should remain at cell 9 when hitting wall');
});

test('Relay Rooms Engine - Pressure plate delay and activation', () => {
  // Room 1:
  // Start A is at (1,1) = 9.
  // Plate 1 is at (3,1) = 11, controlling Door 1 at (2,3) = 26.
  // Step 1: Char A moves RIGHT to (2,1) = 10. Door 1 is closed.
  // Step 2: Char A moves RIGHT to (3,1) = 11 (Plate 1). Door 1 is closed during move.
  // Step 3: Door 1 is OPEN at start of step 3!
  const res = simulateRoom(
    ROOM_1,
    [Action.RIGHT, Action.RIGHT, Action.WAIT],
    [Action.WAIT, Action.WAIT, Action.WAIT],
    3
  );
  assert.equal(res.states[1].charA.cell, 10);
  assert.equal(res.states[1].openDoors[0], false, 'Door 1 is closed after step 1');
  assert.equal(res.states[2].charA.cell, 11, 'Char A reaches Plate 1 at step 2');
  assert.equal(res.states[2].pressedPlates[0], true, 'Plate 1 is pressed at end of step 2');
  assert.equal(res.states[2].openDoors[0], true, 'Door 1 is open at end of step 2 for step 3');
});

test('Relay Rooms Engine - Exit without objective does not finish', () => {
  const customRoom = {
    ...ROOM_1,
    exitA: 10,       // cell (2,1)
    objectiveA: 50,  // far away
  };
  const res = simulateRoom(customRoom, [Action.RIGHT], [Action.WAIT], 1);
  assert.equal(res.states[1].charA.cell, 10);
  assert.equal(res.states[1].charA.hasObjective, false);
  assert.equal(res.states[1].charA.finished, false, 'Char A should not finish without objective');
});

test('Relay Rooms Engine - Inactive character releases plate', () => {
  // If Char A finishes at cell (2,1) = 10, and plate is also at (2,1) = 10:
  // Char A finishes at step 1 -> becomes inactive.
  // End of step 1: plate is NOT pressed because Char A is inactive.
  // Step 2: door remains closed.
  const customRoom = {
    ...ROOM_1,
    startA: 9,
    objectiveA: 9, // starts with objective
    exitA: 10,     // exit at (2,1) = 10
    links: [
      {
        plateCell: 10, // plate also at (2,1) = 10
        doorCell: 26,
        initiallyOpen: false,
      },
    ],
  };
  const res = simulateRoom(customRoom, [Action.RIGHT, Action.WAIT], [Action.WAIT, Action.WAIT], 2);
  assert.equal(res.states[1].charA.finished, true, 'Char A finished at step 1');
  assert.equal(res.states[1].pressedPlates[0], false, 'Inactive Char A does not press plate');
  assert.equal(res.states[2].openDoors[0], false, 'Door remains closed because Char A is inactive');
});

test('Relay Rooms Engine - Room 1 Cooperative Solution', () => {
  // Solution sequence for Room 1:
  // A starts at (1,1) = 9. Exit A: (6,5) = 46. Obj A: (5,5) = 45.
  // B starts at (1,5) = 41. Exit B: (6,1) = 14. Obj B: (5,1) = 13.
  // Plate 1 at (3,1) = 11 opens Door 1 at (2,3) = 26.
  // Plate 2 at (3,5) = 43 opens Door 2 at (5,3) = 29.

  // Timeline:
  // Step 1:
  //   A: RIGHT -> (2,1)
  //   B: RIGHT -> (2,5)
  // Step 2:
  //   A: RIGHT -> (3,1) [Plate 1!] -> Door 1 (2,3) opens for step 3!
  //   B: RIGHT -> (3,5) [Plate 2!] -> Door 2 (5,3) opens for step 3!
  // Step 3:
  //   A holds Plate 1: WAIT -> (3,1)
  //   B moves UP -> (3,4) (leaving Plate 2, but Door 2 is ALREADY open for step 3!)
  //   Wait! Can A cross Door 2 at step 3? A is at (3,1), Door 2 is at (5,3). A needs 3 moves to get to Door 2!
  // So B should hold Plate 2 until A crosses Door 2!
  // Let's trace:
  // B stays on Plate 2 (3,5) while A walks:
  //   (3,1) -> (4,1) -> (5,1) -> (5,2) -> (5,3) [Door 2] -> (5,4) into bottom room!
  // Once A is safely in bottom room, A steps on Plate 2 (3,5) to hold it for B?
  // No! B needs Door 1 at (2,3) to be open!
  // Who opens Door 1? Plate 1 at (3,1)!
  // If A is holding Plate 1, Door 1 is OPEN for B!
  // So B can cross Door 1 FIRST!

  // Sequence:
  // Step 1:
  //   A -> RIGHT to (2,1)
  //   B -> RIGHT to (2,5)
  // Step 2:
  //   A -> RIGHT to (3,1) [Plate 1] -> Door 1 opens for step 3!
  //   B -> UP to (2,4)
  // Step 3:
  //   A -> WAIT on Plate 1
  //   B -> UP to (2,3) [Crosses Door 1 into top chamber!]
  // Step 4:
  //   A -> WAIT on Plate 1
  //   B -> UP to (2,2)
  // Step 5:
  //   A -> WAIT on Plate 1
  //   B -> RIGHT to (3,2)
  // Step 6:
  //   A -> WAIT on Plate 1
  //   B -> UP to (3,1) [B steps onto Plate 1, overlapping with A!]
  // Step 7:
  //   Now B is holding Plate 1!
  //   Wait, B needs Door 2 or does A need Door 2?
  //   Door 2 at (5,3) allows passage between top and bottom on the right side!
  //   Initially, is Door 2 open or can Door 2 be initially open?
  //   Let's check: Door 2 is controlled by Plate 2 at (3,5).
  //   Wait! If B already crossed into the top chamber, does anyone need Plate 2?
  //   A needs to get into the bottom chamber to reach Objective A at (5,5) and Exit A at (6,5)!
  //   How does A get into the bottom chamber?
  //   Through Door 1 at (2,3) or Door 2 at (5,3)!
  //   If Door 1 at (2,3) is STILL open (because B is standing on Plate 1 at 3,1):
  //   A can just walk through Door 1 down into the bottom chamber!
  //   Look at that:
  //   B holds Plate 1 at (3,1).
  //   A walks: (3,1) -> (2,1) -> (2,2) -> (2,3) [Door 1] -> (2,4) -> (2,5) -> (5,5) [Obj A] -> (6,5) [Exit A]!
  //   And while A does that, B walks from (3,1) -> (4,1) -> (5,1) [Obj B] -> (6,1) [Exit B]!
  //   THEY SWAPPED CHAMBERS THROUGH DOOR 1!

  const actionsA = [
    Action.RIGHT, // 1: to (2,1)
    Action.RIGHT, // 2: to (3,1) [Plate 1]
    Action.WAIT,  // 3: hold Plate 1 for B
    Action.WAIT,  // 4: hold Plate 1 for B
    Action.WAIT,  // 5: hold Plate 1 for B
    Action.WAIT,  // 6: B arrives at (3,1) to relieve A!
    Action.LEFT,  // 7: A leaves Plate 1 -> to (2,1)
    Action.DOWN,  // 8: to (2,2)
    Action.DOWN,  // 9: to (2,3) [Door 1, held open by B!]
    Action.DOWN,  // 10: to (2,4) into bottom room!
    Action.DOWN,  // 11: to (2,5)
    Action.RIGHT, // 12: to (3,5)
    Action.RIGHT, // 13: to (4,5)
    Action.RIGHT, // 14: to (5,5) [Obj A collected!]
    Action.RIGHT, // 15: to (6,5) [Exit A reached & finished!]
  ];

  const actionsB = [
    Action.RIGHT, // 1: to (2,5)
    Action.UP,    // 2: to (2,4)
    Action.UP,    // 3: to (2,3) [crosses Door 1]
    Action.UP,    // 4: to (2,2)
    Action.RIGHT, // 5: to (3,2)
    Action.UP,    // 6: to (3,1) [steps on Plate 1 with A!]
    Action.WAIT,  // 7: holds Plate 1 for A
    Action.WAIT,  // 8: holds Plate 1 for A
    Action.WAIT,  // 9: holds Plate 1 for A (A crosses Door 1)
    Action.RIGHT, // 10: to (4,1)
    Action.RIGHT, // 11: to (5,1) [Obj B collected!]
    Action.RIGHT, // 12: to (6,1) [Exit B reached & finished!]
  ];

  const res = simulateRoom(ROOM_1, actionsA, actionsB, 24);
  assert.equal(res.completed, true, 'Both characters should complete Room 1');
  assert.equal(res.finishStepB, 12, 'Char B finishes at step 12');
  assert.equal(res.finishStepA, 15, 'Char A finishes at step 15');
  assert.equal(res.jointFinishingStep, 15, 'Joint finish is 15');
  assert.equal(res.sumFinishingSteps, 27, 'Sum finish is 27');
});
