const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArcPulse Oracle & Invoice Converter Suite", function () {
  let oracle, converter;
  let owner, relayer, user;
  const IDR_FEED = ethers.keccak256(ethers.toUtf8Bytes("USD/IDR"));
  const EUR_FEED = ethers.keccak256(ethers.toUtf8Bytes("EUR/USD"));

  beforeEach(async function () {
    [owner, relayer, user] = await ethers.getSigners();

    // 1. Deploy Oracle
    const OracleFactory = await ethers.getContractFactory("ArcPulseOracle");
    oracle = await OracleFactory.deploy();
    await oracle.waitForDeployment();

    // 2. Authorize relayer
    await oracle.setRelayer(relayer.address, true);

    // 3. Register feeds
    await oracle.registerFeed("USD/IDR", 8);
    await oracle.registerFeed("EUR/USD", 8);

    // 4. Deploy Invoice Converter
    const ConverterFactory = await ethers.getContractFactory("ArcInvoiceConverter");
    converter = await ConverterFactory.deploy(await oracle.getAddress());
    await converter.waitForDeployment();

    // 5. Configure currencies in Converter:
    // IDR: FIAT_PER_USD (direction = 0)
    await converter.configureCurrency("IDR", IDR_FEED, 0);
    // EUR: USD_PER_FIAT (direction = 1)
    await converter.configureCurrency("EUR", EUR_FEED, 1);
  });

  describe("Oracle Feed Management", function () {
    it("Should allow relayer to update feed price", async function () {
      const now = Math.floor(Date.now() / 1000);
      const idrRate = 1580000000000n; // 15,800.00 (8 decimals)

      await expect(oracle.connect(relayer).updateRate(IDR_FEED, idrRate, now))
        .to.emit(oracle, "FeedUpdated")
        .withArgs(IDR_FEED, 1, idrRate, now);

      const round = await oracle.latestRoundData(IDR_FEED);
      expect(round.roundId).to.equal(1);
      expect(round.answer).to.equal(idrRate);
      expect(round.updatedAt).to.equal(now);
    });

    it("Should reject unauthorized price updates", async function () {
      const now = Math.floor(Date.now() / 1000);
      await expect(
        oracle.connect(user).updateRate(IDR_FEED, 1580000000000n, now)
      ).to.be.revertedWithCustomError(oracle, "Unauthorized");
    });

    it("Should support batch updating rates", async function () {
      const now = Math.floor(Date.now() / 1000);
      const rates = [1585000000000n, 108000000n]; // 15,850 IDR & 1.08 EUR

      await oracle.connect(relayer).batchUpdateRates([IDR_FEED, EUR_FEED], rates, now);

      const idrRound = await oracle.latestRoundData(IDR_FEED);
      const eurRound = await oracle.latestRoundData(EUR_FEED);

      expect(idrRound.answer).to.equal(1585000000000n);
      expect(eurRound.answer).to.equal(108000000n);
    });
  });

  describe("Invoice Settlement (Consumer Demo)", function () {
    beforeEach(async function () {
      const now = Math.floor(Date.now() / 1000);
      // Set IDR: 15,800 IDR per 1 USD
      await oracle.connect(relayer).updateRate(IDR_FEED, 1580000000000n, now);
      // Set EUR: 1.08 USD per 1 EUR
      await oracle.connect(relayer).updateRate(EUR_FEED, 108000000n, now);
    });

    it("Should accurately calculate required native USDC (18 decimals) for IDR", async function () {
      // 158,000 IDR should equal exactly 10 USDC (10 * 10^18 wei)
      const fiatAmount = 158000n;
      const [requiredUsdc] = await converter.calculateRequiredUsdc("IDR", fiatAmount);
      expect(requiredUsdc).to.equal(ethers.parseUnits("10", 18));
    });

    it("Should accurately calculate required native USDC (18 decimals) for EUR", async function () {
      // 50 EUR @ 1.08 = 54 USDC (54 * 10^18 wei)
      const fiatAmount = 50n;
      const [requiredUsdc] = await converter.calculateRequiredUsdc("EUR", fiatAmount);
      expect(requiredUsdc).to.equal(ethers.parseUnits("54", 18));
    });

    it("Should settle invoice and refund excess payment", async function () {
      const invoiceId = ethers.keccak256(ethers.toUtf8Bytes("INV-001"));
      const fiatAmount = 158000n; // 10 USDC
      const payAmount = ethers.parseUnits("12", 18); // User pays 12 USDC

      const userBalBefore = await ethers.provider.getBalance(user.address);

      const tx = await converter.connect(user).settleInvoice(invoiceId, "IDR", fiatAmount, {
        value: payAmount,
      });
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const userBalAfter = await ethers.provider.getBalance(user.address);
      const contractBal = await ethers.provider.getBalance(await converter.getAddress());

      // Contract should keep 10 USDC
      expect(contractBal).to.equal(ethers.parseUnits("10", 18));
      // User only lost 10 USDC + gasSpent
      expect(userBalBefore - userBalAfter - gasSpent).to.equal(ethers.parseUnits("10", 18));
    });
  });
});
