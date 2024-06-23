const networkConfig = {
    31337: {
        name: "localhost",
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        mintFee: "10000000000000000", // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas
    },
    // Price Feed Address, values can be obtained at https://docs.chain.link/data-feeds/price-feeds/addresses
    11155111: {
        name: "sepolia",
        wethUsdPriceFeed: "0x694aa1769357215de4fac081bf1f309adc325306", // ETH / USD
        wbtcUsdPriceFeed: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
        weth: "0xdd13e55209fd76afe204dbda4007c227904f0a81",
        wbtc: "0x92f3b59a79bff5dc60c0d59ea13a44d082b2bdfc",
        kaai: "0x7390cE074def913A5CfC543E17366BC85cDfFa17"
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};
