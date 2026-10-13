// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Verifier} from "../src/Verifier.sol";

contract DifferentialFuzzTest is Test {
    Verifier.RoomData internal room1;

    function setUp() public {
        uint64 walls = 0;
        for (uint8 x = 0; x < 8; x++) {
            walls |= uint64(1) << x;
            walls |= uint64(1) << (56 + x);
        }
        for (uint8 y = 0; y < 8; y++) {
            walls |= uint64(1) << (y * 8);
            walls |= uint64(1) << (y * 8 + 7);
        }
        walls |= uint64(1) << 25;
        walls |= uint64(1) << 27;
        walls |= uint64(1) << 28;
        walls |= uint64(1) << 30;

        uint8[4] memory plates = [uint8(11), uint8(43), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doors = [uint8(26), uint8(29), uint8(0xFF), uint8(0xFF)];

        room1 = Verifier.RoomData({
            rulesVersion: 1,
            startA: 9,
            startB: 41,
            objectiveA: 45,
            objectiveB: 13,
            exitA: 46,
            exitB: 14,
            walls: walls,
            plateCells: plates,
            doorCells: doors,
            initialDoorMask: 0
        });
    }

    /// @notice Fuzz test that simulation never panics or exceeds 24 steps
    function testFuzz_SimulationBounds(bytes calldata randomA, bytes calldata randomB) public view {
        // Truncate to maximum 24 steps
        bytes memory actA = randomA.length > 24 ? randomA[:24] : randomA;
        bytes memory actB = randomB.length > 24 ? randomB[:24] : randomB;

        Verifier.SimResult memory res = Verifier.simulate(room1, actA, actB);

        if (res.completed) {
            assertTrue(res.finishStepA > 0 && res.finishStepA <= 24, "finishStepA must be in 1..24");
            assertTrue(res.finishStepB > 0 && res.finishStepB <= 24, "finishStepB must be in 1..24");
            assertEq(res.jointFinishingStep, res.finishStepA > res.finishStepB ? res.finishStepA : res.finishStepB);
            assertEq(res.sumFinishingSteps, res.finishStepA + res.finishStepB);
            assertEq(res.score, (uint16(res.jointFinishingStep) << 8) | uint16(res.sumFinishingSteps));
        } else {
            assertEq(res.score, 0xFFFF, "Incomplete run must score 0xFFFF");
        }
    }

    /// @notice Test that empty actions result in wait in place
    function test_EmptyActionsWaitInPlace() public view {
        bytes memory emptyA = "";
        bytes memory emptyB = "";

        Verifier.SimResult memory res = Verifier.simulate(room1, emptyA, emptyB);
        assertFalse(res.completed, "Empty run cannot complete");
        assertEq(res.finishStepA, 0);
        assertEq(res.finishStepB, 0);
    }

    /// @notice Test that invalid action numbers (> 4) are treated as WAIT safely
    function test_InvalidActionsTreatedAsWait() public view {
        bytes memory invalidA = hex"FFFEFDFCFB";
        bytes memory invalidB = hex"8081828384";

        Verifier.SimResult memory res = Verifier.simulate(room1, invalidA, invalidB);
        assertFalse(res.completed);
    }
}
