const { network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-config");
const { verify } = require("../utils/verify");


module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let ethUsdPriceFeedAddress, btcUsdPriceFeedAddress;
    let wethAddress, wbtcAddress, kaaiAddress, tokenAddress, priceFeedAddress;

    if (chainId == 31337) {
        const weth = await deployments.get("WethMock");
        const wbtc = await deployments.get("WbtcMock");
        const kaai = await deployments.get("DecentralizedStableCoin");
        const wethUsdPriceFeed = await deployments.get("EthAggregator");
        const wbtcUsdPriceFeed = await deployments.get("BtcAggregator");

        kaaiAddress = kaai.address;
        wethAddress = weth.address;
        wbtcAddress = wbtc.address;
        ethUsdPriceFeedAddress = wethUsdPriceFeed.address;
        btcUsdPriceFeedAddress = wbtcUsdPriceFeed.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].wethUsdPriceFeed;
        btcUsdPriceFeedAddress = networkConfig[chainId].wbtcUsdPriceFeed;
        wethAddress = networkConfig[chainId].weth;
        wbtcAddress = networkConfig[chainId].wbtc;
        kaaiAddress = networkConfig[chainId].kaai;
    }
    tokenAddress = [wbtcAddress, wethAddress];
    console.log(tokenAddress)
    priceFeedAddress = [btcUsdPriceFeedAddress, ethUsdPriceFeedAddress];
    console.log(priceFeedAddress)
    console.log(kaaiAddress)
    const arguments = [tokenAddress, priceFeedAddress, kaaiAddress];
    const KAAIEngine = await deploy("KAAIEngine", {
        from: deployer,
        args: arguments,
        log: true,
    });
    // const kaaiContract = await ethers.getContractAt(
    //     "DecentralizedStableCoin",
    //     kaaiAddress
    // );
    // await kaaiContract.transferOwnership(KAAIEngine.address);
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(KAAIEngine.address, arguments);
    }
};

module.exports.tags = ["all", "KAAIEngine"];
