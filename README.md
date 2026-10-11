# ⚡ ArcPulse

> **High-Frequency FX & Asset Oracle with Sub-Second Settlement on Arc L1**  
> Built for the **DoraHacks Arc Microgrants** program.

---

## 🌟 Overview
**Arc** is Circle's Layer-1 EVM blockchain purpose-built for programmable money, utilizing native **USDC** as the gas token with sub-second deterministic finality. 

In global payments and cross-border commerce, smart contracts require fast, verifiable real-world foreign exchange (FX) rates (such as USD/IDR, EUR/USD, JPY/USD) and crypto asset prices. **ArcPulse** provides a lightweight, gas-optimized oracle infrastructure tailored to Arc's unique Osaka EVM baseline and 18-decimal native gas economics.

### Key Features
- **Arc L1 Native Economics:** Configured for Arc's strict 20 Gwei mempool floor and native 18-decimal USDC accounting.
- **AggregatorV3 Compatibility:** Implements familiar standard oracle interfaces (`latestRoundData`) for seamless developer adoption.
- **Automated Relayer Daemon:** TypeScript/Bun service monitoring price deviations across global FX and crypto markets, executing batch updates on-chain.
- **Interactive Consumer dApp:** Includes `ArcInvoiceConverter`, enabling real-time fiat-denominated merchant invoice settlement in native Arc USDC.

---

## 📜 Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| **ArcPulseOracle** | `0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8` | [View on Arc Explorer](https://explorer.testnet.arc.io/address/0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8) |
| **ArcInvoiceConverter** | `0xB400Fc27D7124C3A95cB1b63e5e5F6c1f9D0F894` | [View on Arc Explorer](https://explorer.testnet.arc.io/address/0xB400Fc27D7124C3A95cB1b63e5e5F6c1f9D0F894) |

### Active Data Feeds (8 Decimals)
- **USD / IDR:** `0x27be29a97b92db0e31ca03433d2ea3070a6b370258fa5d1f0c302514746955a9`
- **EUR / USD:** `0xa9226449042e36bf6865099eec57482aa55e3ad026c315a0e4a692b776c318ca`
- **JPY / USD:** `0xf9e627ddbdb060c1c9126daeb9addcd1d1ce7d49dbb540e2677f1c572bc8d195`
- **ETH / USDC:** `0x7ea41243798f304c9efd5c2e0c82a273090146c4718014ecc8570eb373df2b78`
- **BTC / USDC:** `0x9282eb09b844791118907b4cb066e6f9d167435f2382166b9e3594bcb4072bde`

---

## 🏗️ Architecture

```
                 [ External APIs / Market Feeds ]
                               │
                               ▼
                    [ ArcPulse Relayer ]
                 (TypeScript / Bun Daemon)
                               │
            Batch updates (gasPrice >= 20 Gwei)
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │        ArcPulseOracle.sol (Arc L1)           │
        │  - Feed Registry & Round Management          │
        │  - AggregatorV3 latestRoundData()            │
        └──────────────────────┬───────────────────────┘
                               │
                       Queries on-chain
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │      ArcInvoiceConverter.sol (Consumer)      │
        │  - Fiat to native USDC conversion            │
        │  - Instant invoice settlement                │
        └──────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
```bash
npx hardhat test
```

### 3. Deploy to Arc Testnet
```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

### 4. Run Relayer Daemon
```bash
bun run relayer/src/index.ts --once
# or run continuously:
bun run relayer/src/index.ts
```

### 5. Launch Web UI
```bash
cd web
python3 -m http.server 3344
# Open http://localhost:3344 in your browser
```

---

## 🛡️ License
MIT License. Built with ❤️ for the Circle Arc ecosystem.
