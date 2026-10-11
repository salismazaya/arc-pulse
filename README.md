# ArcPulse

> Verifiable FX & Asset Oracle with Sub-Second Settlement on Arc L1  
> Built for the DoraHacks Arc Microgrants program.

---

## Overview

Arc is Circle's Layer-1 EVM blockchain purpose-built for programmable money, utilizing native USDC as the gas token with sub-second deterministic finality.

Smart contracts managing global commerce and payments on Arc require reliable real-world foreign exchange (FX) rates (USD/IDR, EUR/USD, JPY/USD, GBP/USD, SGD/USD), digital asset prices, and commodity benchmarks. 

**ArcPulse** provides a lightweight, gas-compliant oracle infrastructure tailored to Arc's Osaka EVM baseline and 18-decimal native gas economics.

---

## Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| **ArcPulseOracle** | `0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8` | [Explorer Link](https://explorer.testnet.arc.io/address/0x0E5A4f7C4CDAA2C1cc240EeF69f9eedD925Fafc8) |
| **ArcInvoiceConverter** | `0xB400Fc27D7124C3A95cB1b63e5e5F6c1f9D0F894` | [Explorer Link](https://explorer.testnet.arc.io/address/0xB400Fc27D7124C3A95cB1b63e5e5F6c1f9D0F894) |

### Active Feeds (8 Decimals)
- **USD / IDR:** `0x27be29a97b92db0e31ca03433d2ea3070a6b370258fa5d1f0c302514746955a9`
- **EUR / USD:** `0xa9226449042e36bf6865099eec57482aa55e3ad026c315a0e4a692b776c318ca`
- **GBP / USD:** `0xfd121bde813a3463e16ad2a4ea4103a6a122fbe2cdb07a80d4d293be07bb29fa`
- **SGD / USD:** `0x4909a26556c00e7b0acb9de75e2f886741f5f71099ee8c785d89bf5e9473a8e9`
- **JPY / USD:** `0xf9e627ddbdb060c1c9126daeb9addcd1d1ce7d49dbb540e2677f1c572bc8d195`
- **BTC / USDC:** `0x9282eb09b844791118907b4cb066e6f9d167435f2382166b9e3594bcb4072bde`
- **ETH / USDC:** `0x7ea41243798f304c9efd5c2e0c82a273090146c4718014ecc8570eb373df2b78`
- **SOL / USDC:** `0x8c150dc41be8440d68c984f2397e7bebbdd5bf5a41f46cc17a0cc9e2e7817e44`
- **XAU / USD:** `0x85de9facb9f703cb8b77bca3163eb0ad1780f77bf724319b6e5c67b12837e086`

---

## Developer Integration

Detailed code examples for Solidity, Ethers.js, and Viem are documented in [docs/INTEGRATION.md](docs/INTEGRATION.md).

```solidity
interface IArcPulseOracle {
    function latestRoundData(bytes32 feedId) external view returns (
        uint80 roundId, int256 answer, uint256 startedAt,
        uint256 updatedAt, uint80 answeredInRound
    );
}
```

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npx hardhat test

# 3. Run automated relayer
bun run relayer/src/index.ts --once

# 4. Run local dashboard
python3 -m http.server 3344 --directory web
```

---

## License
MIT License.
