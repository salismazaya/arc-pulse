const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployedInfoPath = path.join(__dirname, "../deployed_contracts.json");
  const deployedInfo = JSON.parse(fs.readFileSync(deployedInfoPath, "utf8"));

  const [deployer] = await ethers.getSigners();
  console.log(`Registering new feeds using deployer: ${deployer.address}`);

  const oracle = await ethers.getContractAt("ArcPulseOracle", deployedInfo.oracle, deployer);

  const newFeeds = [
    { name: "SOL/USDC", decimals: 8, direction: 1, initialRate: 10931000000n, prefix: "$", suffix: "" },    // $109.31
    { name: "GBP/USD", decimals: 8, direction: 1, initialRate: 132280000n, prefix: "£", suffix: "" },      // $1.3228
    { name: "SGD/USD", decimals: 8, direction: 1, initialRate: 78080000n, prefix: "S$", suffix: "" },       // $0.7808
    { name: "XAU/USD", decimals: 8, direction: 1, initialRate: 271050000000n, prefix: "$", suffix: "/oz" }, // $2,710.50
  ];

  const now = Math.floor(Date.now() / 1000);

  for (const f of newFeeds) {
    console.log(`\nRegistering ${f.name}...`);
    const tx = await oracle.registerFeed(f.name, f.decimals, { gasPrice: 20000000000n });
    await tx.wait();

    const feedId = ethers.keccak256(ethers.toUtf8Bytes(f.name));
    console.log(`Registered! Feed ID: ${feedId}`);

    const updateTx = await oracle.updateRate(feedId, f.initialRate, now, { gasPrice: 20000000000n });
    await updateTx.wait();
    console.log(`Set rate for ${f.name}: ${f.initialRate.toString()}`);

    // Simpan ke meta
    deployedInfo.feeds[f.name] = {
      feedId: feedId,
      decimals: f.decimals,
      direction: f.direction,
      prefix: f.prefix,
      suffix: f.suffix
    };
  }

  // Update deployed_contracts.json
  fs.writeFileSync(deployedInfoPath, JSON.stringify(deployedInfo, null, 2));
  console.log(`\nUpdated ${deployedInfoPath} with new feeds!`);
}

main().catch((err) => {
  console.error("Error adding feeds:", err);
  process.exitCode = 1;
});
