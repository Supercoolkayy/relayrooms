// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Verifier} from "./Verifier.sol";

contract RelayRooms {
    struct Recording {
        uint32 roomId;
        uint8 role;        // 0 = Role A, 1 = Role B
        address author;
        bytes actions;     // max 24 actions
    }

    struct Run {
        uint32 roomId;
        uint32 recordingAId;
        uint32 recordingBId;
        uint32 parentRunId; // 0 for genesis / initial run
        uint8 finishStepA;
        uint8 finishStepB;
        uint16 score;
        address submitter;
        uint40 timestamp;
    }

    address public owner;
    uint32 public roomCount;

    mapping(uint32 => Verifier.RoomData) public rooms;
    Recording[] public recordings;
    Run[] public runs;

    event RoomAdded(uint32 indexed roomId, uint8 rulesVersion);
    event RecordingCreated(uint32 indexed recordingId, uint32 indexed roomId, uint8 role, address indexed author);
    event RunPublished(
        uint32 indexed runId,
        uint32 indexed roomId,
        uint32 indexed parentRunId,
        uint16 score,
        address submitter
    );

    error Unauthorized();
    error RoomNotFound();
    error RunNotFound();
    error InvalidRole();
    error ActionsExceedLimit();
    error RunIncomplete();
    error InvalidActionValue();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        // Push dummy at index 0 so IDs are 1-indexed
        recordings.push(Recording({
            roomId: 0,
            role: 0,
            author: address(0),
            actions: ""
        }));
        runs.push(Run({
            roomId: 0,
            recordingAId: 0,
            recordingBId: 0,
            parentRunId: 0,
            finishStepA: 0,
            finishStepB: 0,
            score: 0,
            submitter: address(0),
            timestamp: 0
        }));
    }

    function addRoom(Verifier.RoomData calldata room) external onlyOwner returns (uint32 roomId) {
        roomCount++;
        roomId = roomCount;
        rooms[roomId] = room;
        emit RoomAdded(roomId, room.rulesVersion);
    }

    function getRoom(uint32 roomId) external view returns (Verifier.RoomData memory) {
        if (roomId == 0 || roomId > roomCount) revert RoomNotFound();
        return rooms[roomId];
    }

    function getRecording(uint32 recordingId) external view returns (Recording memory) {
        require(recordingId < recordings.length, "Invalid recordingId");
        return recordings[recordingId];
    }

    function getRun(uint32 runId) external view returns (Run memory) {
        require(runId < runs.length, "Invalid runId");
        return runs[runId];
    }

    function totalRuns() external view returns (uint32) {
        return uint32(runs.length - 1);
    }

    function validateActions(bytes calldata actions) internal pure {
        if (actions.length > Verifier.MAX_STEPS) revert ActionsExceedLimit();
        for (uint256 i = 0; i < actions.length; i++) {
            if (uint8(actions[i]) > 4) revert InvalidActionValue();
        }
    }

    function createGenesisRun(
        uint32 roomId,
        bytes calldata actionsA,
        bytes calldata actionsB
    ) external onlyOwner returns (uint32 runId) {
        if (roomId == 0 || roomId > roomCount) revert RoomNotFound();
        validateActions(actionsA);
        validateActions(actionsB);

        Verifier.SimResult memory res = Verifier.simulate(rooms[roomId], actionsA, actionsB);
        if (!res.completed) revert RunIncomplete();

        uint32 recAId = uint32(recordings.length);
        recordings.push(Recording({
            roomId: roomId,
            role: 0,
            author: msg.sender,
            actions: actionsA
        }));
        emit RecordingCreated(recAId, roomId, 0, msg.sender);

        uint32 recBId = uint32(recordings.length);
        recordings.push(Recording({
            roomId: roomId,
            role: 1,
            author: msg.sender,
            actions: actionsB
        }));
        emit RecordingCreated(recBId, roomId, 1, msg.sender);

        runId = uint32(runs.length);
        runs.push(Run({
            roomId: roomId,
            recordingAId: recAId,
            recordingBId: recBId,
            parentRunId: 0,
            finishStepA: res.finishStepA,
            finishStepB: res.finishStepB,
            score: res.score,
            submitter: msg.sender,
            timestamp: uint40(block.timestamp)
        }));

        emit RunPublished(runId, roomId, 0, res.score, msg.sender);
    }

    function publishReply(
        uint32 parentRunId,
        uint8 roleToReplace, // 0 for Role A, 1 for Role B
        bytes calldata newActions
    ) external returns (uint32 newRunId) {
        if (parentRunId == 0 || parentRunId >= runs.length) revert RunNotFound();
        if (roleToReplace > 1) revert InvalidRole();
        validateActions(newActions);

        Run storage parent = runs[parentRunId];
        uint32 roomId = parent.roomId;
        Verifier.RoomData memory room = rooms[roomId];

        bytes memory actionsA;
        bytes memory actionsB;
        uint32 recAId;
        uint32 recBId;

        uint32 newRecId = uint32(recordings.length);
        recordings.push(Recording({
            roomId: roomId,
            role: roleToReplace,
            author: msg.sender,
            actions: newActions
        }));
        emit RecordingCreated(newRecId, roomId, roleToReplace, msg.sender);

        if (roleToReplace == 0) {
            recAId = newRecId;
            recBId = parent.recordingBId;
            actionsA = newActions;
            actionsB = recordings[recBId].actions;
        } else {
            recAId = parent.recordingAId;
            recBId = newRecId;
            actionsA = recordings[recAId].actions;
            actionsB = newActions;
        }

        Verifier.SimResult memory res = Verifier.simulate(room, actionsA, actionsB);
        if (!res.completed) revert RunIncomplete();

        newRunId = uint32(runs.length);
        runs.push(Run({
            roomId: roomId,
            recordingAId: recAId,
            recordingBId: recBId,
            parentRunId: parentRunId,
            finishStepA: res.finishStepA,
            finishStepB: res.finishStepB,
            score: res.score,
            submitter: msg.sender,
            timestamp: uint40(block.timestamp)
        }));

        emit RunPublished(newRunId, roomId, parentRunId, res.score, msg.sender);
    }
}
