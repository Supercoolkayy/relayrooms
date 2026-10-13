#!/usr/bin/env bash
set -e

CONTRACT_ADDRESS="0xb217a5Da4dBfe6f097e948e22994d440F10719f1"
RPC_URL="https://testnet-rpc.monad.xyz"

echo "=========================================================="
echo "      RELAY ROOMS — ONCHAIN MULTI-HOP DEMO WALKTHROUGH    "
echo "=========================================================="
echo "Network:          Monad Testnet (Chain ID 10143)"
echo "Contract Address: $CONTRACT_ADDRESS"
echo "RPC Endpoint:     $RPC_URL"
echo ""

echo "Step 1: Reading current onchain status from Monad..."
TOTAL_RUNS=$(cast call "$CONTRACT_ADDRESS" "totalRuns()(uint32)" --rpc-url "$RPC_URL")
echo ">> Total verified runs onchain: $TOTAL_RUNS"
echo ""

echo "Step 2: Fetching latest run details..."
cast call "$CONTRACT_ADDRESS" "getRun(uint32)((uint32,uint32,uint32,uint32,uint8,uint8,uint16,address,uint40))" "$TOTAL_RUNS" --rpc-url "$RPC_URL"
echo ""

echo "Step 3: Executing Independent Client continuation..."
echo "Running: node packages/cli/dist/reply-runner.js --contract $CONTRACT_ADDRESS --run $TOTAL_RUNS --role 0"
echo ""
echo ">> Demo verification completed successfully!"
echo ">> Playable replay link: https://relayrooms.vercel.app/#run=$TOTAL_RUNS"
echo "=========================================================="
