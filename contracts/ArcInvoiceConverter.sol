// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ArcPulseOracle.sol";

/**
 * @title ArcInvoiceConverter
 * @notice Showcase dApp consuming ArcPulseOracle.
 * Demonstrates real-world fiat invoice settlement using native Arc USDC (18 decimals).
 */
contract ArcInvoiceConverter {
    ArcPulseOracle public immutable oracle;
    address public owner;

    enum RateDirection {
        FIAT_PER_USD, // e.g. USD/IDR: rate is 15800 IDR per 1 USD
        USD_PER_FIAT  // e.g. EUR/USD: rate is 1.08 USD per 1 EUR
    }

    struct SupportedCurrency {
        bytes32 feedId;
        RateDirection direction;
        bool enabled;
    }

    mapping(string => SupportedCurrency) public currencies;

    event CurrencyConfigured(string currency, bytes32 indexed feedId, RateDirection direction);
    event InvoiceSettled(
        bytes32 indexed invoiceId,
        address indexed payer,
        string currency,
        uint256 fiatUnits,
        uint256 usdcPaidNative
    );

    error UnsupportedCurrency();
    error InsufficientPayment(uint256 required, uint256 provided);
    error ZeroAddress();

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    constructor(address _oracle) {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = ArcPulseOracle(_oracle);
        owner = msg.sender;
    }

    function configureCurrency(
        string calldata currency,
        bytes32 feedId,
        RateDirection direction
    ) external onlyOwner {
        currencies[currency] = SupportedCurrency({
            feedId: feedId,
            direction: direction,
            enabled: true
        });
        emit CurrencyConfigured(currency, feedId, direction);
    }

    /**
     * @notice Calculate native USDC (18 decimals) required to settle fiat amount.
     * @param currency Currency code (e.g. "IDR", "EUR")
     * @param fiatUnits Normal integer amount of fiat (e.g. 158500 IDR, 50 EUR)
     */
    function calculateRequiredUsdc(
        string calldata currency,
        uint256 fiatUnits
    ) public view returns (uint256 requiredUsdcWei, int256 rate) {
        SupportedCurrency memory config = currencies[currency];
        if (!config.enabled) revert UnsupportedCurrency();

        (int256 price, uint8 decimals) = oracle.getLatestPrice(config.feedId);
        require(price > 0, "Invalid oracle price");
        rate = price;

        uint256 scale = 10 ** decimals;

        if (config.direction == RateDirection.FIAT_PER_USD) {
            // Price is IDR per 1 USD (e.g. 15800 * 10^8)
            // USDC (18 dec) = (fiatUnits * scale / price) * 10^18
            requiredUsdcWei = (fiatUnits * scale * 1e18) / uint256(price);
        } else {
            // Price is USD per 1 EUR (e.g. 1.08 * 10^8)
            // USDC (18 dec) = (fiatUnits * price / scale) * 10^18
            requiredUsdcWei = (fiatUnits * uint256(price) * 1e18) / scale;
        }
    }

    /**
     * @notice Settle an invoice using native Arc USDC.
     */
    function settleInvoice(
        bytes32 invoiceId,
        string calldata currency,
        uint256 fiatUnits
    ) external payable returns (uint256 usdcCost) {
        (uint256 requiredWei, ) = calculateRequiredUsdc(currency, fiatUnits);
        if (msg.value < requiredWei) {
            revert InsufficientPayment(requiredWei, msg.value);
        }

        // Refund any excess native USDC back to payer
        uint256 excess = msg.value - requiredWei;
        if (excess > 0) {
            (bool refundOk, ) = payable(msg.sender).call{value: excess}("");
            require(refundOk, "Refund failed");
        }

        emit InvoiceSettled(invoiceId, msg.sender, currency, fiatUnits, requiredWei);
        return requiredWei;
    }

    function withdrawFunds(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Zero recipient");
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "Withdraw failed");
    }

    receive() external payable {}
}
