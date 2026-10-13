import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseAbi,
  type Hex,
  hexToBytes,
  bytesToHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0xb217a5Da4dBfe6f097e948e22994d440F10719f1') as Hex;

export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz';

export const RELAY_ROOMS_ABI = parseAbi([
  'function getRun(uint32 runId) external view returns ((uint32 roomId, uint32 recordingAId, uint32 recordingBId, uint32 parentRunId, uint8 finishStepA, uint8 finishStepB, uint16 score, address submitter, uint40 timestamp))',
  'function getRecording(uint32 recordingId) external view returns ((uint32 roomId, uint8 role, address author, bytes actions))',
  'function totalRuns() external view returns (uint32)',
  'function publishReply(uint32 parentRunId, uint8 roleToReplace, bytes calldata newActions) external returns (uint32 newRunId)',
  'event RunPublished(uint32 indexed runId, uint32 indexed roomId, uint32 indexed parentRunId, uint16 score, address submitter)',
]);

export const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

export async function fetchRunFromChain(runId: number) {
  try {
    const run = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: RELAY_ROOMS_ABI,
      functionName: 'getRun',
      args: [runId],
    });

    const [recA, recB] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: RELAY_ROOMS_ABI,
        functionName: 'getRecording',
        args: [run.recordingAId],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: RELAY_ROOMS_ABI,
        functionName: 'getRecording',
        args: [run.recordingBId],
      }),
    ]);

    return {
      run,
      actionsA: Array.from(hexToBytes(recA.actions as Hex)),
      actionsB: Array.from(hexToBytes(recB.actions as Hex)),
    };
  } catch (err) {
    console.warn(`Could not fetch run #${runId} from chain:`, err);
    return null;
  }
}

export async function submitPublishReply(params: {
  parentRunId: number;
  roleToReplace: 0 | 1;
  actions: number[];
}): Promise<number> {
  const actionsHex = bytesToHex(new Uint8Array(params.actions));

  // 1. If browser wallet (window.ethereum) is available, use it
  if (typeof window !== 'undefined' && (window as unknown as { ethereum?: unknown }).ethereum) {
    try {
      const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const walletClient = createWalletClient({
          account: accounts[0] as Hex,
          transport: custom(ethereum),
        });

        const hash = await walletClient.writeContract({
          chain: null,
          address: CONTRACT_ADDRESS,
          abi: RELAY_ROOMS_ABI,
          functionName: 'publishReply',
          args: [params.parentRunId, params.roleToReplace, actionsHex],
        });

        await publicClient.waitForTransactionReceipt({ hash });
        const total = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: RELAY_ROOMS_ABI,
          functionName: 'totalRuns',
        });
        return Number(total);
      }
    } catch (e) {
      console.warn('Injected wallet write failed, falling back to local provider:', e);
    }
  }

  // 2. Direct RPC fallback using Anvil account #2 for friction-free testing
  const fallbackAccount = privateKeyToAccount(
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' // Anvil account #2
  );
  const fallbackWallet = createWalletClient({
    account: fallbackAccount,
    transport: http(RPC_URL),
  });

  const hash = await fallbackWallet.writeContract({
    chain: null,
    address: CONTRACT_ADDRESS,
    abi: RELAY_ROOMS_ABI,
    functionName: 'publishReply',
    args: [params.parentRunId, params.roleToReplace, actionsHex],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  const total = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: RELAY_ROOMS_ABI,
    functionName: 'totalRuns',
  });
  return Number(total);
}
