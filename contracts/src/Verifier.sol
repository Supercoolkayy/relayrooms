// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Verifier {
    uint8 internal constant WAIT = 0;
    uint8 internal constant UP = 1;
    uint8 internal constant DOWN = 2;
    uint8 internal constant LEFT = 3;
    uint8 internal constant RIGHT = 4;

    uint8 internal constant MAX_STEPS = 24;
    uint8 internal constant BOARD_SIZE = 8;
    uint8 internal constant TOTAL_CELLS = 64;

    struct RoomData {
        uint8 rulesVersion;
        uint8 startA;
        uint8 startB;
        uint8 objectiveA;
        uint8 objectiveB;
        uint8 exitA;
        uint8 exitB;
        uint64 walls;          // bit i is 1 if cell i is a wall
        uint8[4] plateCells;   // 0xFF if unused
        uint8[4] doorCells;    // 0xFF if unused
        uint8 initialDoorMask; // bit i is 1 if door i is initially open
    }

    struct SimResult {
        bool completed;
        uint8 finishStepA;
        uint8 finishStepB;
        uint8 jointFinishingStep;
        uint8 sumFinishingSteps;
        uint16 score;
    }

    function computeDoors(
        RoomData memory room,
        uint8 cellA,
        uint8 cellB,
        bool finA,
        bool finB
    ) internal pure returns (uint8 doorsMask) {
        doorsMask = room.initialDoorMask;
        for (uint8 i = 0; i < 4; i++) {
            uint8 pCell = room.plateCells[i];
            if (pCell == 0xFF) continue;
            bool platePressed = (!finA && cellA == pCell) || (!finB && cellB == pCell);
            if (platePressed) {
                doorsMask ^= uint8(1 << i);
            }
        }
    }

    function resolveMove(
        RoomData memory room,
        uint8 currentCell,
        uint8 action,
        uint8 doorsMask
    ) internal pure returns (uint8) {
        uint8 x = currentCell % BOARD_SIZE;
        uint8 y = currentCell / BOARD_SIZE;

        if (action == UP) {
            if (y == 0) return currentCell;
            y -= 1;
        } else if (action == DOWN) {
            if (y >= BOARD_SIZE - 1) return currentCell;
            y += 1;
        } else if (action == LEFT) {
            if (x == 0) return currentCell;
            x -= 1;
        } else if (action == RIGHT) {
            if (x >= BOARD_SIZE - 1) return currentCell;
            x += 1;
        } else {
            return currentCell; // WAIT
        }

        uint8 target = y * BOARD_SIZE + x;

        // Wall bitmask check
        if ((room.walls & (uint64(1) << target)) != 0) {
            return currentCell;
        }

        // Doors check
        for (uint8 i = 0; i < 4; i++) {
            if (room.doorCells[i] == target) {
                bool isOpen = (doorsMask & (uint8(1) << i)) != 0;
                if (!isOpen) {
                    return currentCell;
                }
            }
        }

        return target;
    }

    function simulate(
        RoomData memory room,
        bytes memory actionsA,
        bytes memory actionsB
    ) internal pure returns (SimResult memory res) {
        uint8 cellA = room.startA;
        uint8 cellB = room.startB;
        bool hasObjA = (cellA == room.objectiveA);
        bool hasObjB = (cellB == room.objectiveB);
        bool finA = (hasObjA && cellA == room.exitA);
        bool finB = (hasObjB && cellB == room.exitB);
        uint8 finishStepA = 0;
        uint8 finishStepB = 0;

        uint8 currentDoors = computeDoors(room, cellA, cellB, finA, finB);

        for (uint8 step = 1; step <= MAX_STEPS; step++) {
            if (finA && finB) {
                break;
            }

            uint8 actA = (step - 1 < actionsA.length) ? uint8(actionsA[step - 1]) : WAIT;
            uint8 actB = (step - 1 < actionsB.length) ? uint8(actionsB[step - 1]) : WAIT;

            if (!finA) {
                cellA = resolveMove(room, cellA, actA, currentDoors);
            }
            if (!finB) {
                cellB = resolveMove(room, cellB, actB, currentDoors);
            }

            if (!hasObjA && cellA == room.objectiveA) {
                hasObjA = true;
            }
            if (!hasObjB && cellB == room.objectiveB) {
                hasObjB = true;
            }

            if (!finA && hasObjA && cellA == room.exitA) {
                finA = true;
                finishStepA = step;
            }
            if (!finB && hasObjB && cellB == room.exitB) {
                finB = true;
                finishStepB = step;
            }

            currentDoors = computeDoors(room, cellA, cellB, finA, finB);
        }

        res.completed = finA && finB;
        res.finishStepA = finishStepA;
        res.finishStepB = finishStepB;
        res.jointFinishingStep = finishStepA > finishStepB ? finishStepA : finishStepB;
        res.sumFinishingSteps = finishStepA + finishStepB;
        res.score = res.completed
            ? (uint16(res.jointFinishingStep) << 8) | uint16(res.sumFinishingSteps)
            : 0xFFFF;
    }
}
