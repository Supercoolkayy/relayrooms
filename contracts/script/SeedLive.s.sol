// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Verifier} from "../src/Verifier.sol";
import {RelayRooms} from "../src/RelayRooms.sol";

contract SeedLive is Script {
    address constant LIVE_CONTRACT = 0xb217a5Da4dBfe6f097e948e22994d440F10719f1;

    function buildRoom1() internal pure returns (Verifier.RoomData memory) {
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

        return Verifier.RoomData({
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

    function buildRoom2() internal pure returns (Verifier.RoomData memory) {
        uint64 walls = 0;
        for (uint8 x = 0; x < 8; x++) {
            walls |= uint64(1) << x;
            walls |= uint64(1) << (56 + x);
        }
        for (uint8 y = 0; y < 8; y++) {
            walls |= uint64(1) << (y * 8);
            walls |= uint64(1) << (y * 8 + 7);
        }
        walls |= uint64(1) << 11; walls |= uint64(1) << 12;
        walls |= uint64(1) << 25; walls |= uint64(1) << 27; walls |= uint64(1) << 28; walls |= uint64(1) << 30;
        walls |= uint64(1) << 33; walls |= uint64(1) << 35; walls |= uint64(1) << 36; walls |= uint64(1) << 38;
        walls |= uint64(1) << 51; walls |= uint64(1) << 52;

        uint8[4] memory plates = [uint8(19), uint8(44), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doors = [uint8(26), uint8(37), uint8(0xFF), uint8(0xFF)];

        return Verifier.RoomData({
            rulesVersion: 1,
            startA: 9,
            startB: 54,
            objectiveA: 22,
            objectiveB: 41,
            exitA: 14,
            exitB: 49,
            walls: walls,
            plateCells: plates,
            doorCells: doors,
            initialDoorMask: 0
        });
    }

    function buildRoom3() internal pure returns (Verifier.RoomData memory) {
        uint64 walls = 0;
        for (uint8 x = 0; x < 8; x++) {
            walls |= uint64(1) << x;
            walls |= uint64(1) << (56 + x);
        }
        for (uint8 y = 0; y < 8; y++) {
            walls |= uint64(1) << (y * 8);
            walls |= uint64(1) << (y * 8 + 7);
        }
        walls |= uint64(1) << 11; walls |= uint64(1) << 19;
        walls |= uint64(1) << 44; walls |= uint64(1) << 52;

        uint8[4] memory plates = [uint8(33), uint8(30), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doors = [uint8(27), uint8(36), uint8(0xFF), uint8(0xFF)];

        return Verifier.RoomData({
            rulesVersion: 1,
            startA: 17,
            startB: 46,
            objectiveA: 13,
            objectiveB: 50,
            exitA: 14,
            exitB: 49,
            walls: walls,
            plateCells: plates,
            doorCells: doors,
            initialDoorMask: 0
        });
    }

    function run() external {
        RelayRooms relayRooms = RelayRooms(LIVE_CONTRACT);

        vm.startBroadcast();

        console.log("Seeding rooms on:", LIVE_CONTRACT);
        uint32 r1 = relayRooms.addRoom(buildRoom1());
        console.log("Room 1 added with ID:", r1);

        uint32 r2 = relayRooms.addRoom(buildRoom2());
        console.log("Room 2 added with ID:", r2);

        uint32 r3 = relayRooms.addRoom(buildRoom3());
        console.log("Room 3 added with ID:", r3);

        bytes memory actionsA = hex"040400000000030202020204040404";
        bytes memory actionsB = hex"040101010401000000040404";

        uint32 genesisRunId = relayRooms.createGenesisRun(1, actionsA, actionsB);
        console.log("Genesis Run 1 created with ID:", genesisRunId);

        vm.stopBroadcast();
    }
}
