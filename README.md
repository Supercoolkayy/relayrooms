# Relay Rooms — Playable Replies on Monad

> **A browser-based cooperative puzzle game on Monad.**
> "Here is how we escaped. Replace your part, improve our result, and send it back."

---

## 1. Project Overview & Mechanics

**Relay Rooms** is a social, turn-based cooperative puzzle game designed for Monad. Players solve shared grid puzzle rooms by recording actions for one character while a friend's recorded ghost actions drive the other.

- **Board & Constraints:** $8 \times 8$ grid, 2 characters, strictly bounded to $\le 24$ discrete simulation steps.
- **Actions:** Discrete moves: `UP`, `DOWN`, `LEFT`, `RIGHT`, `WAIT`. Missing trailing actions default to `WAIT`.
- **Dynamic Elements:** Pressure plates and linked doors with a 1-step causal delay. Movement at step $t$ evaluates against the door state at the start of step $t$.
- **The Co-op Trap Dynamic:** When a character finishes (collects objective + steps on their exit), they become *inactive*. **Inactive characters release pressure plates.** If one player rushes to exit while holding a door open for their partner, the door snaps shut!
- **Onchain Verification:** Every run submitted is fully re-simulated in Solidity. Scores and completions are strictly calculated onchain. Scores are never trusted from the frontend.
- **Scoring:** Lower joint finishing step wins ($\max(S_A, S_B)$). Ties broken by the sum of individual finishing steps ($S_A + S_B$).

---

## 2. Live Monad Testnet Deployment

- **Network:** Monad Testnet (Chain ID `10143`)
- **RPC URL:** `https://testnet-rpc.monad.xyz`
- **Contract Address:** [`0xb217a5Da4dBfe6f097e948e22994d440F10719f1`](https://testnet.monadexplorer.com/address/0xb217a5Da4dBfe6f097e948e22994d440F10719f1)
- **Deployer:** `0xB99DF9c70a4bA401CCc32DEBa43393905C80294C`

### Verified Onchain Transactions:
- **Contract Deployment:** [`0xd4b0a44aa8559bbda173e3fa913691f46dcbdefd3e27d1d664d7d52ef54f3bda`](https://testnet.monadexplorer.com/tx/0xd4b0a44aa8559bbda173e3fa913691f46dcbdefd3e27d1d664d7d52ef54f3bda)
- **Room 1 Added:** [`0xc081fc3cb603b74caae06d209d8aa04d9c02aa0fa963e6396e8d1a108a7863ea`](https://testnet.monadexplorer.com/tx/0xc081fc3cb603b74caae06d209d8aa04d9c02aa0fa963e6396e8d1a108a7863ea)
- **Room 2 Added:** [`0x42f741ad7e9be1c169222fe212354c4ff5aa301e513a9eec4d59a5840da455eb`](https://testnet.monadexplorer.com/tx/0x42f741ad7e9be1c169222fe212354c4ff5aa301e513a9eec4d59a5840da455eb)
- **Room 3 Added:** [`0x2cd9cbe06ff78258f93f71cefa1867c0f8db1f68795211cf672bdae784cd1897`](https://testnet.monadexplorer.com/tx/0x2cd9cbe06ff78258f93f71cefa1867c0f8db1f68795211cf672bdae784cd1897)
- **Genesis Run #1:** [`0x55d8646d232dba11ce102f84f22c7086a882eaa304f9147c535ba8680df2e9e6`](https://testnet.monadexplorer.com/tx/0x55d8646d232dba11ce102f84f22c7086a882eaa304f9147c535ba8680df2e9e6)
- **Reply Run #2 (Hop 2):** [`0x6fb82e8cb7f88ebe1625937cf193ad57d2b061c73242daf02c90f2eefa18fb61`](https://testnet.monadexplorer.com/tx/0x6fb82e8cb7f88ebe1625937cf193ad57d2b061c73242daf02c90f2eefa18fb61)
- **Reply Run #3 (Hop 3):** [`0x9b52ebe5f291a3549d08534edd87432c7ec980db55170e8c91d21dcfb820b84b`](https://testnet.monadexplorer.com/tx/0x9b52ebe5f291a3549d08534edd87432c7ec980db55170e8c91d21dcfb820b84b)

---

## 3. Architecture & Monorepo Structure

```text
relayrooms/
├── contracts/                        # Foundry Solidity Project
│   ├── src/
│   │   ├── Verifier.sol              # Pure 24-step simulation library (~40k-71k gas)
│   │   └── RelayRooms.sol            # Onchain registry: rooms, recordings, publishReply()
│   ├── script/
│   │   └── DeployAndSeed.s.sol       # Deployment script seeding Rooms 1, 2, 3 and Genesis Run
│   └── test/
│       └── Verifier.t.sol            # Unit & differential simulation tests
├── packages/
│   ├── core/                         # Canonical Simulation Engine (@relayrooms/core)
│   │   ├── src/
│   │   │   ├── engine.ts             # Deterministic TypeScript mirror of Verifier.sol
│   │   │   ├── types.ts              # Action, Room, StepState schemas
│   │   │   └── rooms.ts              # Authored Rooms 1, 2, and 3
│   │   └── test/
│   │       └── engine.test.js        # Native Node.js test suite (5/5 passing)
│   ├── web/                          # Responsive React + Vite Web Game (@relayrooms/web)
│   │   ├── src/
│   │   │   ├── canvas/GameCanvas.tsx # 60fps HTML5 Canvas with glowing plates, doors, & ghost trails
│   │   │   ├── components/Controls.tsx # Touch D-pad, keyboard (WASD/Arrows), scrubber
│   │   │   ├── components/ComparisonModal.tsx # Victory stats & playable reply generator
│   │   │   └── web3/client.ts        # Direct RPC hydration and Viem wallet integration
│   └── cli/                          # Headless Independent Client (@relayrooms/cli)
│       └── src/reply-runner.ts       # Reads run via RPC, simulates, and submits publishReply
└── package.json                      # pnpm workspace configuration
```

---

## 3. Measured Onchain Gas Costs

All measurements captured from live contract execution on EVM:

| Operation | Gas Used | Description |
| :--- | :---: | :--- |
| **Contract Deployment** | `1,647,358` | Deploys `RelayRooms` registry & bytecode |
| **Room Registration (`addRoom`)** | `101,833` | Bitpacked 8×8 walls, starts, exits, plates & doors |
| **Genesis Run Creation** | `250,461` | Stores 2 recordings + 1 run + pure EVM simulation |
| **Playable Reply (`publishReply`)** | `203,749` | Inherits partner recording, saves new recording + run, re-simulates |
| **Pure Simulation (`Verifier.simulate`)**| `~40,000 - 71,000` | Replays 24 ticks with door timing & collision checks |

---

## 4. Multi-Hop Relay Proof: Live Demo Flow

The game demonstrates true decentralized composability:

```text
[Hop 1: Genesis]
   Deployer creates Genesis Run #1 onchain (Alice A1 + Bob B1) -> Share URL: /#run=1
                                  │
                                  ▼
[Hop 2: Web Browser]
   Player 2 opens /#run=1 -> Hydrates directly from RPC (no backend DB)
   Player 2 replaces Role B with faster moves -> Calls publishReply()
   Generates Run #4 onchain -> Share URL: /#run=4
                                  │
                                  ▼
[Hop 3: Independent Headless CLI]
   Automated client runs:
   node packages/cli/dist/reply-runner.js --contract 0x... --run 4 --role 0
   Loads Run #4 via RPC, replaces Role A, verifies locally, calls publishReply()
   Generates Run #5 onchain!
```

---

## 5. Quickstart & Local Reproduction

### Prerequisites
- Node.js v20+
- pnpm v9+
- Foundry (`forge` and `anvil`)

### 1. Install & Build All Packages
```bash
pnpm install
pnpm --filter @relayrooms/core build
pnpm --filter @relayrooms/cli build
pnpm --filter @relayrooms/web build
```

### 2. Run Test Suites & Differential Correctness Fuzzing
```bash
# TypeScript Simulation Engine Tests
pnpm test:core

# Foundry Solidity Verifier Tests
pnpm test:contracts

# Automated Cross-Engine Differential Fuzzing (100+ random and edge-case sequences)
pnpm test:diff
```

### 3. Automated Monad Testnet Demo Walkthrough
```bash
# Executes 1-command verification against Monad Testnet:
./scripts/demo.sh
```

### 4. Deploy to Vercel
This repository is pre-configured with [`vercel.json`](./vercel.json) for 1-click Vercel deployment:
1. Import this repository (`Supercoolkayy/relayrooms`) into your Vercel dashboard.
2. Vercel automatically detects `vercel.json` and builds `@relayrooms/core` and `@relayrooms/web`.
3. Set root directory to `.` (the monorepo root) and click **Deploy**.
4. The deployed URL will hydrate directly from Monad Testnet via public RPC with zero configuration!

---

## 6. Curated Rooms

1. **Room 1: The Switchback Relay** — Top & bottom chambers divided by laser barriers. Players must swap positions by coordinating pressure plates.
2. **Room 2: Double Cross** — Two interlocking paths with alternating chokepoints.
3. **Room 3: Synchronized Vault** — Tight timing puzzle requiring synchronized movement through the central corridor.
