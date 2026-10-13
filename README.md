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

## 2. Architecture & Monorepo Structure

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

### 2. Run Test Suites
```bash
# TypeScript Simulation Engine Tests
pnpm --filter @relayrooms/core test

# Foundry Solidity Verifier Tests
cd contracts && forge test -vvv
```

### 3. Start Local Anvil Node & Deploy
In terminal 1:
```bash
anvil --port 8545
```

In terminal 2:
```bash
cd contracts
forge script script/DeployAndSeed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 4. Launch Web Application
```bash
pnpm --filter @relayrooms/web dev
# Open http://localhost:5173/ in your browser
```

### 5. Run the Independent Headless Client
```bash
node packages/cli/dist/reply-runner.js \
  --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  --run 1 \
  --role 1
```

---

## 6. Curated Rooms

1. **Room 1: The Switchback Relay** — Top & bottom chambers divided by laser barriers. Players must swap positions by coordinating pressure plates.
2. **Room 2: Double Cross** — Two interlocking paths with alternating chokepoints.
3. **Room 3: Synchronized Vault** — Tight timing puzzle requiring synchronized movement through the central corridor.
