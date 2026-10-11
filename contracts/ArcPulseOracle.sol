// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ArcPulseOracle
 * @notice High-speed, lightweight FX and crypto price oracle tailored for Arc L1.
 * Supports authorized relayer updates with sub-second finality.
 */
contract ArcPulseOracle {
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 timestamp;
    }

    struct FeedInfo {
        string description;
        uint8 decimals;
        bool active;
        uint80 latestRoundId;
    }

    address public owner;
    mapping(address => bool) public authorizedRelayers;

    // Feed identifier -> Feed metadata
    mapping(bytes32 => FeedInfo) public feeds;
    // Feed identifier -> roundId -> RoundData
    mapping(bytes32 => mapping(uint80 => RoundData)) public feedRounds;

    event RelayerStatusChanged(address indexed relayer, bool authorized);
    event FeedRegistered(bytes32 indexed feedId, string description, uint8 decimals);
    event FeedUpdated(bytes32 indexed feedId, uint80 indexed roundId, int256 answer, uint256 timestamp);

    error Unauthorized();
    error FeedNotFound();
    error InvalidAnswer();
    error StaleTimestamp();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedRelayers[msg.sender] = true;
        emit RelayerStatusChanged(msg.sender, true);
    }

    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerStatusChanged(relayer, authorized);
    }

    function registerFeed(string calldata pairName, uint8 _decimals) external onlyOwner returns (bytes32) {
        bytes32 feedId = keccak256(abi.encodePacked(pairName));
        feeds[feedId] = FeedInfo({
            description: pairName,
            decimals: _decimals,
            active: true,
            latestRoundId: 0
        });
        emit FeedRegistered(feedId, pairName, _decimals);
        return feedId;
    }

    function updateRate(bytes32 feedId, int256 price, uint256 timestamp) public onlyRelayer {
        FeedInfo storage info = feeds[feedId];
        if (!info.active) revert FeedNotFound();
        if (price <= 0) revert InvalidAnswer();

        uint80 newRoundId = info.latestRoundId + 1;
        if (info.latestRoundId > 0) {
            RoundData storage prev = feedRounds[feedId][info.latestRoundId];
            if (timestamp < prev.timestamp) revert StaleTimestamp();
        }

        info.latestRoundId = newRoundId;
        feedRounds[feedId][newRoundId] = RoundData({
            roundId: newRoundId,
            answer: price,
            timestamp: timestamp
        });

        emit FeedUpdated(feedId, newRoundId, price, timestamp);
    }

    function batchUpdateRates(
        bytes32[] calldata feedIds,
        int256[] calldata prices,
        uint256 timestamp
    ) external onlyRelayer {
        require(feedIds.length == prices.length, "Length mismatch");
        for (uint256 i = 0; i < feedIds.length; i++) {
            updateRate(feedIds[i], prices[i], timestamp);
        }
    }

    function latestRoundData(bytes32 feedId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        FeedInfo storage info = feeds[feedId];
        if (!info.active || info.latestRoundId == 0) revert FeedNotFound();

        uint80 rId = info.latestRoundId;
        RoundData storage r = feedRounds[feedId][rId];
        return (rId, r.answer, r.timestamp, r.timestamp, rId);
    }

    function getLatestPrice(bytes32 feedId) external view returns (int256 price, uint8 decimals) {
        FeedInfo storage info = feeds[feedId];
        if (!info.active || info.latestRoundId == 0) revert FeedNotFound();
        RoundData storage r = feedRounds[feedId][info.latestRoundId];
        return (r.answer, info.decimals);
    }

    function getFeedDetails(bytes32 feedId) external view returns (
        string memory description,
        uint8 decimals,
        bool active,
        uint80 latestRoundId,
        int256 latestPrice,
        uint256 latestTimestamp
    ) {
        FeedInfo storage info = feeds[feedId];
        RoundData storage r = feedRounds[feedId][info.latestRoundId];
        return (
            info.description,
            info.decimals,
            info.active,
            info.latestRoundId,
            r.answer,
            r.timestamp
        );
    }
}
