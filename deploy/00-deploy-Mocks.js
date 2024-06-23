const { network } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network detected! Deploying mocks...")
        const wethAggregator = await deploy("EthAggregator", {
            from: deployer,
            log: true,
            args: [],
        })

        const wbtcAggregator = await deploy("BtcAggregator",{
            from :deployer,
            log: true,
            args: [],
        })
        // console.log(deployer)
        const weth = await deploy("WethMock",{
            from :deployer,
            log: true,
            args: [deployer, BigInt(2000e18).toString()],
        })

        const wbtc = await deploy("WbtcMock",{
            from :deployer,
            log: true,
            args: [deployer, BigInt(2000e18).toString()],
        })

        console.log("Mocks Deployed!")
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        console.log("You are deploying to a local network, you'll need a local network running to interact")
        console.log(
            "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
        )
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    }
}
module.exports.tags = ["all", "mocks", "main"]