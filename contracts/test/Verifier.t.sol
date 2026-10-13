// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Verifier} from "../src/Verifier.sol";
import {RelayRooms} from "../src/RelayRooms.sol";

contract RelayRoomsTest is Test {
    RelayRooms public relayRooms;
    Verifier.RoomData public room1;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        relayRooms = new RelayRooms();

        // Setup Room 1 matching ROOM_1 in TypeScript:
        // Grid:
        // 0: ########
        // 1: #......#
        // 2: #......#
        // 3: ##.##.## -> Door 1 at (2,3) = 26, Door 2 at (5,3) = 29
        // 4: #......#
        // 5: #......#
        // 6: #......#
        // 7: ########

        uint64 walls = 0;
        // Outer boundaries:
        // row 0: 0..7
        for (uint8 x = 0; x < 8; x++) walls |= uint64(1) << x;
        // row 7: 56..63
        for (uint8 x = 0; x < 8; x++) walls |= uint64(1) << (56 + x);
        // col 0: 0, 8, 16, 24, 32, 40, 48, 56
        for (uint8 y = 0; y < 8; y++) walls |= uint64(1) << (y * 8);
        // col 7: 7, 15, 23, 31, 39, 47, 55, 63
        for (uint8 y = 0; y < 8; y++) walls |= uint64(1) << (y * 8 + 7);

        // Row 3 inner walls: ##.##.##
        // x=1 (25), x=3 (27), x=4 (28), x=6 (30) are walls!
        // (x=2 is 26 Door 1, x=5 is 29 Door 2)
        walls |= uint64(1) << 25;
        walls |= uint64(1) << 27;
        walls |= uint64(1) << 28;
        walls |= uint64(1) << 30;

        uint8[4] memory plateCells = [uint8(11), uint8(43), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doorCells = [uint8(26), uint8(29), uint8(0xFF), uint8(0xFF)];

        room1 = Verifier.RoomData({
            rulesVersion: 1,
            startA: 9,      // (1,1)
            startB: 41,     // (1,5)
            objectiveA: 45, // (5,5)
            objectiveB: 13, // (5,1)
            exitA: 46,      // (6,5)
            exitB: 14,      // (6,1)
            walls: walls,
            plateCells: plateCells,
            doorCells: doorCells,
            initialDoorMask: 0
        });

        relayRooms.addRoom(room1);
    }

    function testSimulateRoom1Directly() public view {
        // Actions from TypeScript unit test:
        // A: RIGHT(4), RIGHT(4), WAIT(0)*4, LEFT(3), DOWN(2), DOWN(2), DOWN(2), DOWN(2), RIGHT(4), RIGHT(4), RIGHT(4), RIGHT(4)
        bytes memory actionsA = hex"040400000000030202020204040404";
        // B: RIGHT(4), UP(1), UP(1), UP(1), RIGHT(4), UP(1), WAIT(0)*3, RIGHT(4), RIGHT(4), RIGHT(4)
        bytes memory actionsB = hex"040101010401000000040404";

        Verifier.SimResult memory res = Verifier.simulate(room1, actionsA, actionsB);
        assertTrue(res.completed, "Simulation should complete");
        assertEq(res.finishStepB, 12, "Finish step B should be 12");
        assertEq(res.finishStepA, 15, "Finish step A should be 15");
        assertEq(res.jointFinishingStep, 15, "Joint finish step should be 15");
        assertEq(res.sumFinishingSteps, 27, "Sum finishing steps should be 27");
        assertEq(res.score, (uint16(15) << 8) | uint16(27), "Score calculation matches");
    }

    function testPublishGenesisAndReply() public {
        bytes memory actionsA = hex"040400000000030202020204040404";
        bytes memory actionsB = hex"040101010401000000040404";

        // 1. Genesis run by owner
        uint32 run1Id = relayRooms.createGenesisRun(1, actionsA, actionsB);
        assertEq(run1Id, 1);

        RelayRooms.Run memory run1 = relayRooms.getRun(1);
        assertEq(run1.finishStepA, 15);
        assertEq(run1.finishStepB, 12);
        assertEq(run1.parentRunId, 0);

        // 2. Bob publishes a reply, keeping Alice's actionsA, but replacing Role B
        // Can Bob do it with same or faster moves?
        // Let's pass the same actionsB as a valid reply:
        vm.prank(bob);
        uint32 run2Id = relayRooms.publishReply(1, 1, actionsB);
        assertEq(run2Id, 2);

        RelayRooms.Run memory run2 = relayRooms.getRun(2);
        assertEq(run2.parentRunId, 1);
        assertEq(run2.submitter, bob);
        assertEq(run2.recordingAId, run1.recordingAId, "Should inherit Alice's recording");
        assertEq(run2.recordingBId, 3, "Should have Bob's new recording");

        // 3. Alice can then reply to run 2, replacing Role A
        vm.prank(alice);
        uint32 run3Id = relayRooms.publishReply(2, 0, actionsA);
        assertEq(run3Id, 3);
        RelayRooms.Run memory run3 = relayRooms.getRun(3);
        assertEq(run3.parentRunId, 2);
        assertEq(run3.submitter, alice);
    }

    function testCannotPublishIncompleteRun() public {
        bytes memory actionsA = hex"04"; // Only 1 step
        bytes memory actionsB = hex"04";

        vm.expectRevert(RelayRooms.RunIncomplete.selector);
        relayRooms.createGenesisRun(1, actionsA, actionsB);
    }
}
