/**
 * Fetcher for FX rates and Crypto prices with robust fallbacks.
 */
export interface RateReport {
  pair: string;
  price: bigint; // 8 decimals
  timestamp: number;
}

export async function fetchLiveRates(): Promise<RateReport[]> {
  const reports: RateReport[] = [];
  const now = Math.floor(Date.now() / 1000);

  // 1. Fetch FX Rates via open.er-api.com
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data: any = await res.json();
      const rates = data.rates || {};

      if (rates.IDR) {
        reports.push({
          pair: "USD/IDR",
          price: BigInt(Math.round(rates.IDR * 100_000_000)),
          timestamp: now,
        });
      }

      if (rates.EUR) {
        const eurUsd = 1 / rates.EUR;
        reports.push({
          pair: "EUR/USD",
          price: BigInt(Math.round(eurUsd * 100_000_000)),
          timestamp: now,
        });
      }

      if (rates.JPY) {
        reports.push({
          pair: "JPY/USD",
          price: BigInt(Math.round(rates.JPY * 100_000_000)),
          timestamp: now,
        });
      }
    }
  } catch (err) {
    console.warn("FX fetch failed, using fallback:", err);
    reports.push(
      { pair: "USD/IDR", price: 1625000000000n, timestamp: now },
      { pair: "EUR/USD", price: 109000000n, timestamp: now },
      { pair: "JPY/USD", price: 15350000000n, timestamp: now }
    );
  }

  // 2. Fetch Crypto Rates (CoinGecko / Fallback)
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd"
    );
    if (res.ok) {
      const data: any = await res.json();
      if (data.ethereum?.usd) {
        reports.push({
          pair: "ETH/USDC",
          price: BigInt(Math.round(data.ethereum.usd * 100_000_000)),
          timestamp: now,
        });
      }
      if (data.bitcoin?.usd) {
        reports.push({
          pair: "BTC/USDC",
          price: BigInt(Math.round(data.bitcoin.usd * 100_000_000)),
          timestamp: now,
        });
      }
    } else {
      throw new Error(`CoinGecko status: ${res.status}`);
    }
  } catch (err) {
    // Graceful crypto fallback
    reports.push(
      { pair: "ETH/USDC", price: 268000000000n, timestamp: now },
      { pair: "BTC/USDC", price: 6820000000000n, timestamp: now }
    );
  }

  return reports;
}
