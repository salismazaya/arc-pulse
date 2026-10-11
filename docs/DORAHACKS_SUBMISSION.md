# ArcPulse — DoraHacks Submission Kit

This document provides ready-to-submit answers and copy for the **DoraHacks Arc Microgrants** application form, tailored specifically to Arc's architectural strengths and the grant's evaluation criteria.

---

## 1. Project Basic Information

- **Project Name:** ArcPulse
- **Tagline / One-Liner:** Verifiable FX & Asset Oracle for Programmable Money and Sub-Second Settlement on Arc L1.
- **Category / Track:** Infrastructure / Developer Tooling / Real-World Financial Integration
- **GitHub Repository:** https://github.com/salismazaya/arc-pulse
- **Deployed Contracts (Arc Mainnet - Chain ID 5042):**
  - **ArcPulseOracle:** `0xC7184A427Dabb853b2820a2D03f2268087cC058a` ([Explorer Link](https://explorer.arc.io/address/0xC7184A427Dabb853b2820a2D03f2268087cC058a))
  - **ArcInvoiceConverter (Consumer Showcase):** `0x80C8F31A0b8F0bd16174b421Ab9f8D2dcB187dcd` ([Explorer Link](https://explorer.arc.io/address/0x80C8F31A0b8F0bd16174b421Ab9f8D2dcB187dcd))
- **Live Demo / Web Interface:** https://arc-pulse-oracle.netlify.app/
- **Interactive Documentation:** https://arc-pulse-oracle.netlify.app/docs.html

---

## 2. Project Vision & Mission (Vision Statement)

### Vision
To establish **ArcPulse** as the primary financial telemetry and foreign exchange (FX) oracle layer for Circle’s Arc L1, enabling decentralized commerce, global treasury management, and real-world asset settlement denominated in native USDC.

### The Problem
Arc L1 is engineered by Circle as a purpose-built blockchain for programmable commerce, cross-border payments, and institutional stablecoin utility with deterministic sub-second finality. However, real-world commerce does not operate in a single currency. Global businesses price goods, payroll, and physical invoices in regional fiat currencies (IDR, EUR, GBP, SGD, JPY) and traditional commodities (Gold/XAU).

Currently, smart contracts deploying on Arc face a critical cold-start dilemma: **there is no native, low-latency FX oracle available on Arc Mainnet** that bridges real-world exchange rates to Arc's native 18-decimal USDC economics. Without reliable exchange rate primitives, automated merchant checkout dApps, cross-border payroll routers, and FX hedging protocols cannot function.

### The Solution: ArcPulse
**ArcPulse** bridges this infrastructure gap with an end-to-end, gas-optimized data feed network built specifically for Arc:
1. **Curated Cross-Border Feeds:** 9 live feeds encompassing key international commerce corridors (USD/IDR, EUR/USD, GBP/USD, SGD/USD, JPY/USD), core digital liquidity (BTC, ETH, SOL), and tokenized commodities (XAU/USD).
2. **Arc-Native Gas Optimization:** Utilizing compressed batch updates (`batchUpdateRates`) that drastically amortize gas overhead across feeds, fully compliant with Arc’s 20 Gwei gas floor.
3. **Consumer Verification dApp:** Rather than stopping at the data layer, ArcPulse includes `ArcInvoiceConverter`—a battle-tested consumer contract demonstrating sub-second, multi-currency invoice checkout and automated overpayment refunds in native USDC.
4. **Developer-First Accessibility:** Full Chainlink `IAggregatorV3`-compatible interface mapping, allowing any existing EVM protocol to integrate ArcPulse with zero friction.

---

## 3. Detailed Project Description (What We Look For Criteria)

### A. How ArcPulse Leverages Arc L1 Architecture
- **Native USDC Gas & Value Settlement:** Arc utilizes USDC as both its gas token and the native transfer unit (`1 USDC = 10^18 wei`). ArcPulse contracts natively handle decimal precision translations between 8-decimal oracle answers and 18-decimal native USDC amounts without truncation error.
- **Sub-Second Finality:** Oracle updates and invoice settlements take immediate advantage of Arc’s high-throughput consensus, enabling point-of-sale checkout speeds without pending confirmation lag.
- **EVM Osaka / Cancun Compatibility:** Built with modern Solidity compilation targets and strict memory layout patterns.

### B. What Makes ArcPulse Unique?
- **Forex & Settlement Focus:** Unlike standard DeFi oracles that prioritize volatile altcoin tokens, ArcPulse directly aligns with Circle's strategic mission: **global payments**. Southeast Asian and European corridors (SGD, IDR, EUR) are prioritized for cross-border merchant operations.
- **Live & Verifiable on Mainnet:** Not a theoretical slide deck or testnet prototype—both the oracle core and consumer contracts are deployed, funded, and actively updated on **Arc Mainnet (Chain ID: 5042)**.
- **Dual-Mode Portability:** The repository natively supports seamless multi-network toggle between Arc Mainnet and Arc Testnet for builders and integration testing.

---

## 4. Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│           Off-Chain Relayer (Bun / TypeScript)         │
│  - Multi-source price aggregation (Binance, Forex API) │
│  - Anomaly & stale data filtering                      │
│  - Deviation threshold & heartbeat triggers            │
└───────────────────────────┬────────────────────────────┘
                            │ Batch Tx (Gas Optimized)
                            ▼
┌────────────────────────────────────────────────────────┐
│           ArcPulseOracle (Arc Mainnet: 0xC718...)      │
│  - Access-controlled relayer whitelist                │
│  - 8-decimal precision storage                         │
│  - Chainlink IAggregatorV3 compatibility               │
└───────────────────────────┬────────────────────────────┘
                            │ On-Chain Feed Query
                            ▼
┌────────────────────────────────────────────────────────┐
│        ArcInvoiceConverter (Arc Mainnet: 0x80C8...)    │
│  - Dynamic fiat-to-USDC conversion math               │
│  - Sub-second payment settlement & refund logic        │
│  - Real-world merchant invoice issuance                │
└────────────────────────────────────────────────────────┘
```

---

## 5. Roadmap & Grant Utilization ($500 USDC)

The $500 USDC microgrant will be utilized 100% for infrastructure sustainment and network expansion:

- **Phase 1 (Completed):**
  - Architecture design, testnet validation, and successful deployment to Arc Mainnet.
  - Active relayer daemon pipeline with 9 initial FX, crypto, and commodity feeds.
  - Consumer showcase (`ArcInvoiceConverter`) and documentation suite.
- **Phase 2 (Grant Funded — Next 30 Days):**
  - **Relayer Gas Bank:** Funding long-term relayer heartbeat transactions on Arc Mainnet across 20+ feeds.
  - **Decentralized Multi-Signer Consensus:** Transitioning single relayer keys to a threshold multi-signature (TSS) relayer network to eliminate single points of failure.
  - **SDK Release:** Publishing `@arc-pulse/sdk` on npm for instant 1-line integration by frontend builders on Arc.
- **Phase 3 (Next 60 Days):**
  - Pyth / EIP-712 style pull-oracle model for zero-storage gas consumption on demand.
  - Expansion to Latin America (BRL, MXN) and African (NGN, KES) payment corridors.

---

## 6. DoraHacks Form Quick Q&A (Copy-Paste Ready)

### Q: Project Description (Short)
> ArcPulse is a verifiable foreign exchange (FX) and asset oracle deployed live on Arc Mainnet (Chain ID 5042). It provides sub-second price feeds for international currency corridors (USD/IDR, EUR/USD, GBP/USD, SGD/USD, JPY/USD), crypto assets, and commodities with full 18-decimal native USDC settlement mechanics for dApps and merchants.

### Q: What problem does your project solve?
> Circle's Arc L1 is designed for programmable finance and global commerce, yet it lacks native on-chain FX rate feeds required for real-world merchant invoicing and multi-currency settlement. ArcPulse solves this by delivering low-latency, verifiable price feeds and a production-ready invoice settlement contract on Arc Mainnet.

### Q: Why Arc?
> Arc is uniquely positioned with USDC as its native gas and settlement currency, sub-second deterministic finality, and institutional payment rails. ArcPulse builds the foundational price feed layer necessary for cross-border enterprise adoption on Arc.

### Q: Contract Addresses
> - ArcPulseOracle: `0xC7184A427Dabb853b2820a2D03f2268087cC058a` (Arc Mainnet)  
> - ArcInvoiceConverter: `0x80C8F31A0b8F0bd16174b421Ab9f8D2dcB187dcd` (Arc Mainnet)
