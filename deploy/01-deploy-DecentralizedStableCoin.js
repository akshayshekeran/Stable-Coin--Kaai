const {developmentChains}= require("../helper-config")
const {verify} = require("../utils/verify")
module.exports= async({getNamedAccounts,deployments})=>{
    const {deploy,log}=deployments;
    const {deployer}= await getNamedAccounts();
    console.log("---------------------------------------------")
    const decentrailzedStableCoin = await deploy("DecentralizedStableCoin",{
        from :deployer,
        args : [],
        log :true,
    })
    
    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(decentrailzedStableCoin.address,[])
    }
}

module.exports.tags = ["all", "DecentralizedStableCoin"]