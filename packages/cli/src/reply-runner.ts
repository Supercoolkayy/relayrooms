#!/usr/bin/env node
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  Hex,
  hexToBytes,
  bytesToHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ROOMS, simulateRoom, Action } from '@relayrooms/core';

const RELAY_ROOMS_ABI = parseAbi([
  'function getRun(uint32 runId) external view returns ((uint32 roomId, uint32 recordingAId, uint32 recordingBId, uint32 parentRunId, uint8 finishStepA, uint8 finishStepB, uint16 score, address submitter, uint40 timestamp))',
  'function getRecording(uint32 recordingId) external view returns ((uint32 roomId, uint8 role, address author, bytes actions))',
  'function totalRuns() external view returns (uint32)',
  'function publishReply(uint32 parentRunId, uint8 roleToReplace, bytes calldata newActions) external returns (uint32 newRunId)',
  'event RunPublished(uint32 indexed runId, uint32 indexed roomId, uint32 indexed parentRunId, uint16 score, address submitter)',
]);

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string, fallback: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const rpcUrl = getArg('rpc', process.env.RPC_URL || 'http://127.0.0.1:8545');
  const contractAddress = getArg('contract', process.env.CONTRACT_ADDRESS || '') as Hex;
  const parentRunId = parseInt(getArg('run', '1'), 10);
  const roleToReplace = parseInt(getArg('role', '1'), 10) as 0 | 1;
  const privateKey = (getArg(
    'privateKey',
    process.env.PRIVATE_KEY ||
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' // Anvil account #1
  )) as Hex;

  if (!contractAddress) {
    console.error('Error: Please provide --contract <address> or set CONTRACT_ADDRESS');
    process.exit(1);
  }

  console.log('=== Relay Rooms Independent Client ===');
  console.log(`Connecting to RPC: ${rpcUrl}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Parent Run ID: ${parentRunId}`);
  console.log(`Role to Replace: ${roleToReplace === 0 ? 'Role A (Char A)' : 'Role B (Char B)'}`);

  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  console.log(`Authorized Submitter: ${account.address}`);

  // 1. Fetch parent run
  console.log(`Fetching parent run #${parentRunId}...`);
  const parentRun = await publicClient.readContract({
    address: contractAddress,
    abi: RELAY_ROOMS_ABI,
    functionName: 'getRun',
    args: [parentRunId],
  });

  console.log(`Parent Run Info:
  - Room ID: ${parentRun.roomId}
  - Score: ${parentRun.score} (Joint: ${Math.max(parentRun.finishStepA, parentRun.finishStepB)}, Sum: ${parentRun.finishStepA + parentRun.finishStepB})
  - Finish A: Step ${parentRun.finishStepA}
  - Finish B: Step ${parentRun.finishStepB}
  - Submitter: ${parentRun.submitter}`);

  // 2. Fetch counterparty recording
  const inheritedRecId = roleToReplace === 0 ? parentRun.recordingBId : parentRun.recordingAId;
  const counterpartyRecording = await publicClient.readContract({
    address: contractAddress,
    abi: RELAY_ROOMS_ABI,
    functionName: 'getRecording',
    args: [inheritedRecId],
  });

  console.log(`Inherited Recording #${inheritedRecId} from ${counterpartyRecording.author}`);

  // 3. Prepare replacement actions
  // If specific action hex passed in --actions, use it; otherwise use default test solution
  const customActionsHex = getArg('actions', '');
  let newActionsBytes: Uint8Array;

  if (customActionsHex) {
    newActionsBytes = hexToBytes(customActionsHex as Hex);
  } else {
    // Default demonstration replacement actions:
    if (roleToReplace === 1) {
      // Role B standard solution
      newActionsBytes = new Uint8Array([
        Action.RIGHT,
        Action.UP,
        Action.UP,
        Action.UP,
        Action.RIGHT,
        Action.UP,
        Action.WAIT,
        Action.WAIT,
        Action.WAIT,
        Action.RIGHT,
        Action.RIGHT,
        Action.RIGHT,
      ]);
    } else {
      // Role A standard solution
      newActionsBytes = new Uint8Array([
        Action.RIGHT,
        Action.RIGHT,
        Action.WAIT,
        Action.WAIT,
        Action.WAIT,
        Action.WAIT,
        Action.LEFT,
        Action.DOWN,
        Action.DOWN,
        Action.DOWN,
        Action.DOWN,
        Action.RIGHT,
        Action.RIGHT,
        Action.RIGHT,
        Action.RIGHT,
      ]);
    }
  }

  // 4. Local simulation verification using @relayrooms/core
  const roomDef = ROOMS.find((r) => r.id === parentRun.roomId);
  if (!roomDef) {
    console.error(`Room ID ${parentRun.roomId} not recognized locally`);
    process.exit(1);
    return;
  }

  const actionsA = roleToReplace === 0 ? newActionsBytes : hexToBytes(counterpartyRecording.actions as Hex);
  const actionsB = roleToReplace === 1 ? newActionsBytes : hexToBytes(counterpartyRecording.actions as Hex);

  console.log('\nRunning local simulation verification...');
  const localSim = simulateRoom(roomDef, actionsA, actionsB);

  if (!localSim.completed) {
    console.error('Local verification failed: Run did not reach completion!');
    process.exit(1);
  }

  console.log(`Local simulation verified!
  - New Finish A: Step ${localSim.finishStepA}
  - New Finish B: Step ${localSim.finishStepB}
  - New Score: ${localSim.score} (Joint: ${localSim.jointFinishingStep}, Sum: ${localSim.sumFinishingSteps})`);

  // Score comparison
  const parentJoint = Math.max(parentRun.finishStepA, parentRun.finishStepB);
  const newJoint = localSim.jointFinishingStep;
  if (newJoint < parentJoint) {
    console.log(`🚀 IMPROVEMENT: Faster by ${parentJoint - newJoint} steps!`);
  } else if (newJoint === parentJoint) {
    console.log('⚖️ EQUAL: Same joint speed.');
  } else {
    console.log(`⚠️ SLOWER: Took ${newJoint - parentJoint} more steps.`);
  }

  // 5. Submit onchain transaction
  console.log('\nBroadcasting publishReply transaction...');
  const hash = await walletClient.writeContract({
    chain: null,
    address: contractAddress,
    abi: RELAY_ROOMS_ABI,
    functionName: 'publishReply',
    args: [parentRunId, roleToReplace, bytesToHex(newActionsBytes)],
  });

  console.log(`Transaction sent: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber} (Gas used: ${receipt.gasUsed})`);

  // Check new total runs
  const newTotal = await publicClient.readContract({
    address: contractAddress,
    abi: RELAY_ROOMS_ABI,
    functionName: 'totalRuns',
  });

  console.log(`\n🎉 New Run Published! Run ID: #${newTotal}`);
  console.log(`Direct Replay Link: http://localhost:5173/#run=${newTotal}`);
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
