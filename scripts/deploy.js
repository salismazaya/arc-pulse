const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`Starting deployment on network: ${network.name}`);
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatUnits(balance, 18)} USDC`);

  // 1. Deploy ArcPulseOracle
  console.log("\n1. Deploying ArcPulseOracle...");
  const OracleFactory = await ethers.getContractFactory("ArcPulseOracle");
  const oracle = await OracleFactory.deploy({
    gasPrice: 20000000000n, // 20 Gwei min floor
  });
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`ArcPulseOracle deployed at: ${oracleAddress}`);

  // 2. Register standard feeds
  console.log("\n2. Registering Feeds...");
  const feeds = [
    { name: "USD/IDR", decimals: 8, direction: 0, initialRate: 1585000000000n }, // 15,850 IDR/USD
    { name: "EUR/USD", decimals: 8, direction: 1, initialRate: 108500000n },       // 1.085 USD/EUR
    { name: "JPY/USD", decimals: 8, direction: 0, initialRate: 15200000000n },     // 152.00 JPY/USD
    { name: "ETH/USDC", decimals: 8, direction: 1, initialRate: 265000000000n },   // $2,650
    { name: "BTC/USDC", decimals: 8, direction: 1, initialRate: 6750000000000n },  // $67,500
  ];

  const registeredFeedData = {};

  for (const f of feeds) {
    const tx = await oracle.registerFeed(f.name, f.decimals, { gasPrice: 20000000000n });
    await tx.wait();
    const feedId = ethers.keccak256(ethers.toUtf8Bytes(f.name));
    registeredFeedData[f.name] = {
      feedId: feedId,
      decimals: f.decimals,
      direction: f.direction,
    };
    console.log(`Registered ${f.name} -> Feed ID: ${feedId}`);

    // Initial update rate
    const now = Math.floor(Date.now() / 1000);
    const updateTx = await oracle.updateRate(feedId, f.initialRate, now, { gasPrice: 20000000000n });
    await updateTx.wait();
    console.log(`Set initial rate for ${f.name}: ${f.initialRate.toString()}`);
  }

  // 3. Deploy ArcInvoiceConverter (Consumer demo)
  console.log("\n3. Deploying ArcInvoiceConverter...");
  const ConverterFactory = await ethers.getContractFactory("ArcInvoiceConverter");
  const converter = await ConverterFactory.deploy(oracleAddress, {
    gasPrice: 20000000000n,
  });
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
    const tx = await converter.configureCurrency(c.code, feedId, c.dir, { gasPrice: 20000000000n });
    await tx.wait();
    console.log(`Configured ${c.code} (${c.pair}) in Converter`);
  }

  // 5. Save deployed addresses & ABIs
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
  console.log("Ready for Arc Testnet testing!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
