// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Verifier} from "../src/Verifier.sol";
import {RelayRooms} from "../src/RelayRooms.sol";

contract DeployAndSeed is Script {
    function buildRoom1() internal pure returns (Verifier.RoomData memory) {
        uint64 walls = 0;
        // Outer boundaries
        for (uint8 x = 0; x < 8; x++) {
            walls |= uint64(1) << x;          // row 0
            walls |= uint64(1) << (56 + x);   // row 7
        }
        for (uint8 y = 0; y < 8; y++) {
            walls |= uint64(1) << (y * 8);    // col 0
            walls |= uint64(1) << (y * 8 + 7);// col 7
        }
        // Row 3 walls: ##.##.##
        walls |= uint64(1) << 25;
        walls |= uint64(1) << 27;
        walls |= uint64(1) << 28;
        walls |= uint64(1) << 30;

        uint8[4] memory plates = [uint8(11), uint8(43), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doors = [uint8(26), uint8(29), uint8(0xFF), uint8(0xFF)];

        return Verifier.RoomData({
            rulesVersion: 1,
            startA: 9,      // (1,1)
            startB: 41,     // (1,5)
            objectiveA: 45, // (5,5)
            objectiveB: 13, // (5,1)
            exitA: 46,      // (6,5)
            exitB: 14,      // (6,1)
            walls: walls,
            plateCells: plates,
            doorCells: doors,
            initialDoorMask: 0
        });
    }

    function buildRoom2() internal pure returns (Verifier.RoomData memory) {
        uint64 walls = 0;
        // Outer boundaries
        for (uint8 x = 0; x < 8; x++) {
            walls |= uint64(1) << x;
            walls |= uint64(1) << (56 + x);
        }
        for (uint8 y = 0; y < 8; y++) {
            walls |= uint64(1) << (y * 8);
            walls |= uint64(1) << (y * 8 + 7);
        }
        // Inner walls
        walls |= uint64(1) << 11; walls |= uint64(1) << 12;
        walls |= uint64(1) << 25; walls |= uint64(1) << 27; walls |= uint64(1) << 28; walls |= uint64(1) << 30;
        walls |= uint64(1) << 33; walls |= uint64(1) << 35; walls |= uint64(1) << 36; walls |= uint64(1) << 38;
        walls |= uint64(1) << 51; walls |= uint64(1) << 52;

        uint8[4] memory plates = [uint8(19), uint8(44), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doors = [uint8(26), uint8(37), uint8(0xFF), uint8(0xFF)];

        return Verifier.RoomData({
            rulesVersion: 1,
            startA: 9,      // (1,1)
            startB: 54,     // (6,6)
            objectiveA: 22, // (6,2)
            objectiveB: 41, // (1,5)
            exitA: 14,      // (6,1)
            exitB: 49,      // (1,6)
            walls: walls,
            plateCells: plates,
            doorCells: doors,
            initialDoorMask: 0
        });
    }

    function buildRoom3() internal pure returns (Verifier.RoomData memory) {
        uint64 walls = 0;
        // Outer boundaries
        for (uint8 x = 0; x < 8; x++) {
            walls |= uint64(1) << x;
            walls |= uint64(1) << (56 + x);
        }
        for (uint8 y = 0; y < 8; y++) {
            walls |= uint64(1) << (y * 8);
            walls |= uint64(1) << (y * 8 + 7);
        }
        // Inner barriers
        walls |= uint64(1) << 11; walls |= uint64(1) << 19;
        walls |= uint64(1) << 44; walls |= uint64(1) << 52;

        uint8[4] memory plates = [uint8(33), uint8(30), uint8(0xFF), uint8(0xFF)];
        uint8[4] memory doors = [uint8(27), uint8(36), uint8(0xFF), uint8(0xFF)];

        return Verifier.RoomData({
            rulesVersion: 1,
            startA: 17,     // (1,2)
            startB: 46,     // (6,5)
            objectiveA: 13, // (5,1)
            objectiveB: 50, // (2,6)
            exitA: 14,      // (6,1)
            exitB: 49,      // (1,6)
            walls: walls,
            plateCells: plates,
            doorCells: doors,
            initialDoorMask: 0
        });
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) // Anvil default account #0
        );

        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Deploying RelayRooms ===");
        RelayRooms relayRooms = new RelayRooms();
        console.log("RelayRooms deployed at:", address(relayRooms));

        // 1. Add Room 1
        uint32 r1 = relayRooms.addRoom(buildRoom1());
        console.log("Room 1 registered with ID:", r1);

        // 2. Add Room 2
        uint32 r2 = relayRooms.addRoom(buildRoom2());
        console.log("Room 2 registered with ID:", r2);

        // 3. Add Room 3
        uint32 r3 = relayRooms.addRoom(buildRoom3());
        console.log("Room 3 registered with ID:", r3);

        // 4. Create Genesis Run for Room 1
        bytes memory actionsA = hex"040400000000030202020204040404";
        bytes memory actionsB = hex"040101010401000000040404";

        uint32 genesisRunId = relayRooms.createGenesisRun(1, actionsA, actionsB);
        console.log("Genesis Run for Room 1 created with ID:", genesisRunId);

        vm.stopBroadcast();
    }
}
