import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { fetchLiveRates } from "./fetcher";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const deployedInfoPath = path.join(__dirname, "../../deployed_contracts.json");
if (!fs.existsSync(deployedInfoPath)) {
  console.error("deployed_contracts.json not found! Please run deploy script first.");
  process.exit(1);
}

const allConfigs = JSON.parse(fs.readFileSync(deployedInfoPath, "utf-8"));

// Determine active network from CLI args or .env
let networkKey = process.env.NETWORK || "arcMainnet";
const netArgIdx = process.argv.indexOf("--network");
if (netArgIdx !== -1 && process.argv[netArgIdx + 1]) {
  networkKey = process.argv[netArgIdx + 1];
}

const networkConfig = allConfigs[networkKey];
if (!networkConfig) {
  console.error(`Invalid network '${networkKey}'. Available: ${Object.keys(allConfigs).join(", ")}`);
  process.exit(1);
}

const rpcUrl =
  networkKey === "arcMainnet"
    ? process.env.ARC_MAINNET_RPC_URL || networkConfig.rpcUrl
    : process.env.ARC_TESTNET_RPC_URL || networkConfig.rpcUrl;

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  console.error("DEPLOYER_PRIVATE_KEY is missing in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// Oracle minimal ABI
const oracleAbi = [
  "function latestRoundData(bytes32 feedId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function batchUpdateRates(bytes32[] calldata feedIds, int256[] calldata prices, uint256 timestamp) external",
  "function updateRate(bytes32 feedId, int256 price, uint256 timestamp) external",
];

const oracle = new ethers.Contract(networkConfig.oracle, oracleAbi, wallet);
const deviationThreshold = parseFloat(process.env.DEVIATION_THRESHOLD_PCT || "0.05");
const intervalMs = parseInt(process.env.RELAYER_INTERVAL_MS || "60000", 10);

async function runRelayerSync() {
  console.log(`[${new Date().toISOString()}] [${networkConfig.name}] Fetching live market rates...`);
  const liveRates = await fetchLiveRates();

  if (liveRates.length === 0) {
    console.warn("No rates fetched. Skipping cycle.");
    return;
  }

  const feedsToUpdate: { feedId: string; price: bigint; pair: string }[] = [];

  for (const report of liveRates) {
    const meta = networkConfig.feeds[report.pair];
    if (!meta) continue;

    try {
      const onChainData = await oracle.latestRoundData(meta.feedId);
      const onChainPrice = BigInt(onChainData[1]);
      const diff = report.price > onChainPrice ? report.price - onChainPrice : onChainPrice - report.price;
      const deviationPct = Number((diff * 10000n) / (onChainPrice || 1n)) / 100;

      console.log(
        `Feed: ${report.pair} | Live: ${report.price} | On-Chain: ${onChainPrice} | Dev: ${deviationPct.toFixed(2)}%`
      );

      if (deviationPct >= deviationThreshold || onChainPrice === 0n) {
        feedsToUpdate.push({
          feedId: meta.feedId,
          price: report.price,
          pair: report.pair,
        });
      }
    } catch (err: any) {
      console.warn(`Error reading round data for ${report.pair}:`, err.message);
    }
  }

  if (feedsToUpdate.length > 0) {
    console.log(`Submitting batch update for ${feedsToUpdate.length} feeds on ${networkConfig.name}...`);
    const feedIds = feedsToUpdate.map((f) => f.feedId);
    const prices = feedsToUpdate.map((f) => f.price);
    const timestamp = Math.floor(Date.now() / 1000);

    const tx = await oracle.batchUpdateRates(feedIds, prices, timestamp, {
      gasPrice: 20000000000n, // 20 Gwei min floor on Arc
    });
    console.log(`Relayer TX Broadcast: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Batch update confirmed in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed}`);
  } else {
    console.log("No feeds exceeded deviation threshold. On-chain data is fresh.");
  }
}

async function main() {
  console.log("==========================================");
  console.log(`ArcPulse Relayer Daemon Starting`);
  console.log(`Network: ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Relayer address: ${wallet.address}`);
  console.log(`Oracle contract: ${networkConfig.oracle}`);
  console.log(`Deviation Threshold: ${deviationThreshold}%`);
  console.log("==========================================");

  const isOnce = process.argv.includes("--once");

  if (isOnce) {
    await runRelayerSync();
  } else {
    await runRelayerSync();
    setInterval(async () => {
      try {
        await runRelayerSync();
      } catch (err) {
        console.error("Error during relayer cycle:", err);
      }
    }, intervalMs);
  }
}

main().catch((err) => {
  console.error("Relayer failure:", err);
  process.exit(1);
});
