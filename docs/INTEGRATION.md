# ArcPulse Integration Guide

This guide explains how to consume live price feeds from **ArcPulseOracle** inside smart contracts on Arc L1 and in frontend or backend applications.

---

## 1. Network & Contract Addresses

| Parameter | Arc Mainnet |
| :--- | :--- |
| **Chain ID** | `5042` (`0x13b2`) |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` |
| **Explorer** | `https://explorer.arc.io` |
| **ArcPulseOracle** | `0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8` |
| **ArcInvoiceConverter** | `0xB400Fc27D7124C3A95cB1b63e5e5F6c1f9D0F894` |
| **Mempool Floor** | 20 Gwei (`20000000000` wei) |

> **Important Arc Rule:** Every transaction broadcast to Arc must specify a gas price of at least **20 Gwei**. Transactions below 20 Gwei are dropped by the mempool without an on-chain receipt.

---

## 2. Active Feed Identifiers (8 Decimals)

Feed IDs are derived from `keccak256(bytes(pairName))`. All reported prices use **8 decimals** (e.g., `15,800.00` is represented as `1580000000000`).

| Pair | Type | Feed ID (`bytes32`) | Representation |
| :--- | :--- | :--- | :--- |
| **USD/IDR** | Forex | `0x27be29a97b92db0e31ca03433d2ea3070a6b370258fa5d1f0c302514746955a9` | IDR per 1 USD |
| **EUR/USD** | Forex | `0xa9226449042e36bf6865099eec57482aa55e3ad026c315a0e4a692b776c318ca` | USD per 1 EUR |
| **GBP/USD** | Forex | `0xfd121bde813a3463e16ad2a4ea4103a6a122fbe2cdb07a80d4d293be07bb29fa` | USD per 1 GBP |
| **SGD/USD** | Forex | `0x4909a26556c00e7b0acb9de75e2f886741f5f71099ee8c785d89bf5e9473a8e9` | USD per 1 SGD |
| **JPY/USD** | Forex | `0xf9e627ddbdb060c1c9126daeb9addcd1d1ce7d49dbb540e2677f1c572bc8d195` | JPY per 1 USD |
| **BTC/USDC** | Crypto | `0x9282eb09b844791118907b4cb066e6f9d167435f2382166b9e3594bcb4072bde` | USDC per 1 BTC |
| **ETH/USDC** | Crypto | `0x7ea41243798f304c9efd5c2e0c82a273090146c4718014ecc8570eb373df2b78` | USDC per 1 ETH |
| **SOL/USDC** | Crypto | `0x8c150dc41be8440d68c984f2397e7bebbdd5bf5a41f46cc17a0cc9e2e7817e44` | USDC per 1 SOL |
| **XAU/USD** | RWA | `0x85de9facb9f703cb8b77bca3163eb0ad1780f77bf724319b6e5c67b12837e086` | USD per 1 Troy Oz Gold |

---

## 3. Smart Contract Integration (Solidity)

### Minimal Interface
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IArcPulseOracle {
    function latestRoundData(bytes32 feedId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );

    function getLatestPrice(bytes32 feedId) external view returns (
        int256 price,
        uint8 decimals
    );
}
```

### Example: Reading Price in a Consumer Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IArcPulseOracle.sol";

contract PaymentRouter {
    IArcPulseOracle public immutable oracle;
    bytes32 public constant IDR_FEED = 0x27be29a97b92db0e31ca03433d2ea3070a6b370258fa5d1f0c302514746955a9;

    constructor(address _oracle) {
        oracle = IArcPulseOracle(_oracle);
    }

    function getIdrRate() external view returns (int256 rate, uint256 lastUpdated) {
        (, int256 price, , uint256 updatedAt, ) = oracle.latestRoundData(IDR_FEED);
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < 3600, "Stale price");
        return (price, updatedAt);
    }

    /// Calculate required Arc native USDC (18 decimals) for an IDR invoice
    function calculateUsdcForIdr(uint256 idrAmount) external view returns (uint256 usdcWei) {
        (int256 rate, uint8 decimals) = oracle.getLatestPrice(IDR_FEED);
        require(rate > 0, "Invalid rate");
        // rate is 8 decimals (e.g. 1585000000000 = 15,850 IDR / USD)
        // native USDC is 18 decimals
        usdcWei = (idrAmount * (10 ** decimals) * 1e18) / uint256(rate);
    }
}
```

---

## 4. Frontend & Backend Integration (TypeScript / JavaScript)

### Reading with Ethers.js (v6)
```typescript
import { ethers } from "ethers";

const RPC_URL = "https://rpc.mainnet.arc.io";
const ORACLE_ADDRESS = "0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8";
const IDR_FEED_ID = "0x27be29a97b92db0e31ca03433d2ea3070a6b370258fa5d1f0c302514746955a9";

const ABI = [
  "function latestRoundData(bytes32 feedId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getLatestPrice(bytes32 feedId) external view returns (int256 price, uint8 decimals)"
];

async function getLiveFeed() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const oracle = new ethers.Contract(ORACLE_ADDRESS, ABI, provider);

  const [price, decimals] = await oracle.getLatestPrice(IDR_FEED_ID);
  const humanPrice = Number(price) / (10 ** Number(decimals));

  console.log(`Live USD/IDR Rate: ${humanPrice.toLocaleString()}`);
}

getLiveFeed();
```

### Reading with Viem
```typescript
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http("https://rpc.mainnet.arc.io"),
});

const ORACLE_ADDRESS = "0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8";
const IDR_FEED_ID = "0x27be29a97b92db0e31ca03433d2ea3070a6b370258fa5d1f0c302514746955a9";

const oracleAbi = [
  {
    name: "getLatestPrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "feedId", type: "bytes32" }],
    outputs: [
      { name: "price", type: "int256" },
      { name: "decimals", type: "uint8" },
    ],
  },
] as const;

async function run() {
  const [price, decimals] = await client.readContract({
    address: ORACLE_ADDRESS,
    abi: oracleAbi,
    functionName: "getLatestPrice",
    args: [IDR_FEED_ID],
  });

  console.log("Raw Price:", price.toString(), "Decimals:", decimals);
}

run();
```

---

## 5. Settlement Math & Decimals on Arc

Arc has a dual-decimal model:
- **Native USDC (`msg.value`):** 18 decimals (`1 USDC = 10^18 wei`).
- **ERC-20 USDC (`0x3600000000000000000000000000000000000000`):** 6 decimals (`1 USDC = 10^6 units`).

When writing settlement or pool math:
- To convert fiat to **Native USDC (18 decimals)**:
  $$\text{Native USDC Wei} = \frac{\text{Fiat Amount} \times 10^{\text{decimals}} \times 10^{18}}{\text{Rate}}$$
- To convert to **ERC-20 USDC (6 decimals)**, scale by $10^6$ instead of $10^{18}$.
