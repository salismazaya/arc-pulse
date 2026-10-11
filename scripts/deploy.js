const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`Starting deployment on network: ${network.name}`);
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatUnits(balance, 18)} USDC`);

  const gasPrice = 20000000000n; // 20 Gwei Arc mempool floor

  // 1. Deploy ArcPulseOracle
  console.log("\n1. Deploying ArcPulseOracle...");
  const OracleFactory = await ethers.getContractFactory("ArcPulseOracle");
  const oracle = await OracleFactory.deploy({ gasPrice });
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`ArcPulseOracle deployed at: ${oracleAddress}`);

  // 2. Register all 9 feeds
  console.log("\n2. Registering Feeds...");
  const feeds = [
    { name: "USD/IDR", decimals: 8, direction: 0, initialRate: 1788906334400n, tag: "Forex" },
    { name: "EUR/USD", decimals: 8, direction: 1, initialRate: 112052602n, tag: "Forex" },
    { name: "GBP/USD", decimals: 8, direction: 1, initialRate: 132288606n, tag: "Forex" },
    { name: "SGD/USD", decimals: 8, direction: 1, initialRate: 78082482n, tag: "Forex" },
    { name: "JPY/USD", decimals: 8, direction: 0, initialRate: 15828726500n, tag: "Forex" },
    { name: "BTC/USDC", decimals: 8, direction: 1, initialRate: 8300300000000n, tag: "Crypto" },
    { name: "ETH/USDC", decimals: 8, direction: 1, initialRate: 250053000000n, tag: "Crypto" },
    { name: "SOL/USDC", decimals: 8, direction: 1, initialRate: 10935000000n, tag: "Crypto" },
    { name: "XAU/USD", decimals: 8, direction: 1, initialRate: 271240000000n, tag: "Commodity RWA" },
  ];

  const registeredFeedData = {};
  const feedIds = [];
  const initialPrices = [];

  for (const f of feeds) {
    const tx = await oracle.registerFeed(f.name, f.decimals, { gasPrice });
    await tx.wait();
    const feedId = ethers.keccak256(ethers.toUtf8Bytes(f.name));
    registeredFeedData[f.name] = {
      feedId: feedId,
      decimals: f.decimals,
      direction: f.direction,
      tag: f.tag,
    };
    feedIds.push(feedId);
    initialPrices.push(f.initialRate);
    console.log(`Registered ${f.name} -> ${feedId}`);
  }

  // Batch update initial rates
  console.log("\nBatch updating initial prices on-chain...");
  const now = Math.floor(Date.now() / 1000);
  const batchTx = await oracle.batchUpdateRates(feedIds, initialPrices, now, { gasPrice });
  await batchTx.wait();
  console.log("Initial rates updated successfully!");

  // 3. Deploy ArcInvoiceConverter (Consumer demo)
  console.log("\n3. Deploying ArcInvoiceConverter...");
  const ConverterFactory = await ethers.getContractFactory("ArcInvoiceConverter");
  const converter = await ConverterFactory.deploy(oracleAddress, { gasPrice });
  await converter.waitForDeployment();
  const converterAddress = await converter.getAddress();
  console.log(`ArcInvoiceConverter deployed at: ${converterAddress}`);

  // 4. Configure currencies in Converter
  console.log("\n4. Configuring currencies in ArcInvoiceConverter...");
  const cfgCurrencies = [
    { code: "IDR", pair: "USD/IDR", dir: 0 },
    { code: "EUR", pair: "EUR/USD", dir: 1 },
    { code: "JPY", pair: "JPY/USD", dir: 0 },
  ];

  for (const c of cfgCurrencies) {
    const feedId = registeredFeedData[c.pair].feedId;
    const tx = await converter.configureCurrency(c.code, feedId, c.dir, { gasPrice });
    await tx.wait();
    console.log(`Configured ${c.code} (${c.pair})`);
  }

  // 5. Save deployed addresses
  const deployedInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    oracle: oracleAddress,
    converter: converterAddress,
    feeds: registeredFeedData,
    timestamp: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "../deployed_contracts.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployedInfo, null, 2));
  console.log(`\nDeployment details saved to ${outputPath}`);
  console.log(`Deployment on Arc ${network.name} COMPLETE!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
