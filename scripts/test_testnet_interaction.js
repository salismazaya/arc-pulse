const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployedInfo = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../deployed_contracts.json"), "utf8")
  );

  const [signer] = await ethers.getSigners();
  console.log(`Testing with account: ${signer.address}`);

  const oracle = await ethers.getContractAt("ArcPulseOracle", deployedInfo.oracle, signer);
  const converter = await ethers.getContractAt("ArcInvoiceConverter", deployedInfo.converter, signer);

  // 1. Check Oracle Feeds
  console.log("\n--- Checking On-Chain Oracle Feeds ---");
  for (const [name, meta] of Object.entries(deployedInfo.feeds)) {
    const round = await oracle.latestRoundData(meta.feedId);
    console.log(`Feed: ${name} | Round: ${round.roundId} | Answer: ${round.answer} | Updated: ${new Date(Number(round.updatedAt) * 1000).toLocaleTimeString()}`);
  }

  // 2. Query Invoice Calculation
  console.log("\n--- Querying Invoice Conversion ---");
  const testIdrAmount = 158500n; // Rp 158,500 -> should be 10 USDC
  const [requiredUsdc, rate] = await converter.calculateRequiredUsdc("IDR", testIdrAmount);
  console.log(`Invoice: Rp ${testIdrAmount} @ Rate ${rate / 100000000n} IDR/USD`);
  console.log(`Required Native USDC: ${ethers.formatUnits(requiredUsdc, 18)} USDC`);

  // 3. Settle Invoice on Arc Testnet
  console.log("\n--- Settling Invoice On-Chain ---");
  const invoiceId = ethers.keccak256(ethers.toUtf8Bytes("TESTNET-INV-" + Date.now()));
  const tx = await converter.settleInvoice(invoiceId, "IDR", testIdrAmount, {
    value: requiredUsdc,
    gasPrice: 20000000000n, // 20 Gwei min floor
  });
  console.log(`Tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Tx confirmed in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed}`);

  const contractBal = await ethers.provider.getBalance(deployedInfo.converter);
  console.log(`Converter Contract Balance: ${ethers.formatUnits(contractBal, 18)} USDC`);
  console.log("\nAll Arc Testnet live interactions verified successfully! 🚀");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
