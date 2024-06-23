// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";

contract EthAggregator is MockV3Aggregator {
    constructor() MockV3Aggregator(8, 2000e8) {}
}
