// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./DecentralizedStableCoin.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/*
 * @title DecentralizedStableCoin
 * @author Akshay
 * This contract is designed to maintain 1 token == 1 Usd
 * Collateral: Exogenous (ETH & BTC)
 * Minting: Algorithmic
 * Our KAAI is overcollateralized. Hence, value of collateral > value of KAAI
 */
contract KAAIEngine is ReentrancyGuard {
    //error
    error DSCEngine__moreThanZero();
    error DSCEngine__lengthNotMatched();
    error DSCEngine__tokenNotAllowed();
    error DSCEngine__transferFailed();
    error DSCEngine__lessThanMinHealthFactor();
    error DSCEngine__mintFailed();
    error DSCEngine__healthFactorIsFine();

    //constants
    uint256 private constant PRECISION = 1e18;
    uint256 private constant ADDITIONAL_FEED_PRECISION = 1e10;
    uint256 private constant LIQUIDATION_THRESHOLD = 50;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18;
    uint256 private constant LIQUIDATION_BONUS = 10;
    uint256 private constant LIQUIDATION_PRECISION = 100;

    //state variable
    //prettier-ignore
    mapping(address user => mapping(address token => uint256 amount))private s_collateralDeposit;
    mapping(address token => address priceFeed) private s_priceFeeds;
    mapping(address user => uint256 kaaiToMint) private s_kaaiMinted;
    address[] private s_collateralTokens;
    DecentralizedStableCoin private immutable i_kaai;

    //events
    event collateralDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event collateralRedeemed(
        address indexed user,
        uint256 amount,
        address indexed token
    );

    //modifiers
    modifier moreThanZero(uint256 amount) {
        if (amount == 0) {
            revert DSCEngine__moreThanZero();
        }
        _;
    }
    modifier isTokenAllowed(address token) {
        if (s_priceFeeds[token] == address(0)) {
            revert DSCEngine__tokenNotAllowed();
        }
        _;
    }

    //Constructor
    constructor(
        address[] memory tokenAddress,
        address[] memory priceFeedAddress,
        address KAAIAddress
    ) {
        if (tokenAddress.length != priceFeedAddress.length) {
            revert DSCEngine__lengthNotMatched();
        }
        for (uint256 i = 0; i < tokenAddress.length; i++) {
            s_priceFeeds[tokenAddress[i]] = priceFeedAddress[i];
        }
        i_kaai = DecentralizedStableCoin(KAAIAddress);
        s_collateralTokens = tokenAddress;
    }

    //external functions
    function depositCollateralandMintKaai(
        address tokenCollateralAddress,
        uint256 amountCollateral,
        uint256 kaaiToMint
    ) external {
        depositCollateral(tokenCollateralAddress, amountCollateral);
        mintKaai(kaaiToMint);
    }

    function depositCollateral(
        address tokenCollateralAddress,
        uint256 amountCollateral
    )
        public
        moreThanZero(amountCollateral)
        isTokenAllowed(tokenCollateralAddress)
        nonReentrant
    {
        s_collateralDeposit[msg.sender][tokenCollateralAddress] =
            s_collateralDeposit[msg.sender][tokenCollateralAddress] +
            amountCollateral;
        emit collateralDeposited(
            msg.sender,
            tokenCollateralAddress,
            amountCollateral
        );
        bool success = ERC20(tokenCollateralAddress).transferFrom(
            msg.sender,
            address(this),
            amountCollateral
        );
        if (!success) {
            revert DSCEngine__transferFailed();
        }
    }

    function redeemCollateralForKaai(
        address tokenCollateralAddress,
        uint256 amountCollateral,
        uint256 amountKaaiToBurn
    ) external {
        _burnKaai(amountKaaiToBurn, msg.sender, msg.sender);
        _redeemCollateral(msg.sender, msg.sender,tokenCollateralAddress, amountCollateral);
        revertIfHealthFactorBroken(msg.sender);
    }

    //in order to redeem collateral:
    // 1. health factor must be over 1 after collateral pulled

    function redeemCollateral(
        address tokenCollateralAddress,
        uint256 amountCollateral
    ) public moreThanZero(amountCollateral) nonReentrant {
        _redeemCollateral(
            msg.sender,
            msg.sender,
            tokenCollateralAddress,
            amountCollateral
        );
        revertIfHealthFactorBroken(msg.sender);
    }

    function mintKaai(uint256 kaaiToMint) public moreThanZero(kaaiToMint) {
        s_kaaiMinted[msg.sender] += kaaiToMint;
        revertIfHealthFactorBroken(msg.sender);
        bool minted = i_kaai.mint(msg.sender, kaaiToMint);
        if (minted == false) {
            revert DSCEngine__mintFailed();
        }
    }

    function burnKaai(uint256 amount) public moreThanZero(amount) {
        _burnKaai(amount, msg.sender, msg.sender);
        revertIfHealthFactorBroken(msg.sender);
    }

    function liquidate(
        address collateral,
        uint256 debtToCover,
        address user
    ) external moreThanZero(debtToCover) nonReentrant {
        uint256 startingUserHealthFactor = _healthFactor(user);
        if (startingUserHealthFactor >= MIN_HEALTH_FACTOR) {
            revert DSCEngine__healthFactorIsFine();
        }
        uint256 tokenAmountInWei = getTokenAmountFromUsd(
            collateral,
            debtToCover
        );
        //we are giving 10% bonus
        uint256 bonusCollateral = (tokenAmountInWei * LIQUIDATION_BONUS) /
            LIQUIDATION_PRECISION;
        console.log("liqui:",tokenAmountInWei);
        console.log("bonus:",bonusCollateral);
        _redeemCollateral(
            user,
            msg.sender,
            collateral,
            tokenAmountInWei + bonusCollateral
        );
        _burnKaai(debtToCover, user, msg.sender);
        revertIfHealthFactorBroken(msg.sender);
    }

    //private, internal & view functions
    function getAccountInformation(
        address user
    )
        private
        view
        returns (uint256 totalKaaiMinted, uint256 collateralDepositedInUsd)
    {
        totalKaaiMinted = s_kaaiMinted[user];
        collateralDepositedInUsd = getCollateralValue(user);
    }

    function _burnKaai(
        uint256 amount,
        address forWhomToBurn,
        address liquidator
    ) private {
        s_kaaiMinted[forWhomToBurn] -= amount;
        bool success = i_kaai.transferFrom(liquidator, address(this), amount);
        if (!success) {
            revert DSCEngine__transferFailed();
        }
        i_kaai.burn(amount);
    }

    function _redeemCollateral(
        address from,
        address to,
        address tokenCollateralAddress,
        uint256 amountCollateral
    ) private moreThanZero(amountCollateral){
        console.log("hey",amountCollateral);
        console.log("hee",s_collateralDeposit[from][tokenCollateralAddress]);
        s_collateralDeposit[from][tokenCollateralAddress] -= amountCollateral;
        emit collateralRedeemed(from, amountCollateral, tokenCollateralAddress);
        bool success = ERC20(tokenCollateralAddress).transfer(
            to,
            amountCollateral
        );
        if (!success) {
            revert DSCEngine__transferFailed();
        }
    }

    function _healthFactor(address user) private view returns (uint256) {
        (
            uint256 totalKaaiMinted,
            uint256 collateralDepositedInUsd
        ) = getAccountInformation(user);
        if(totalKaaiMinted == 0) return type(uint256).max;
        uint256 collateralAdjustedForThreshold = (collateralDepositedInUsd *
            LIQUIDATION_THRESHOLD) / 100;
        return ((collateralAdjustedForThreshold * PRECISION) / totalKaaiMinted);
    }

    function revertIfHealthFactorBroken(address user) internal view {
        uint256 healthFactor = _healthFactor(user);
        console.log("healthFactor:",healthFactor);
        if (healthFactor < MIN_HEALTH_FACTOR) {
            revert DSCEngine__lessThanMinHealthFactor();
        }
    }

    function getCollateralValue(
        address user
    ) public view returns (uint256 collateralValue) {
        for (uint256 i = 0; i < s_collateralTokens.length; i++) {
            address token = s_collateralTokens[i];
            uint256 amount = s_collateralDeposit[user][token];

            collateralValue += getUsdValue(token, amount);
        }
    }

    function getTokenAmountFromUsd(
        address token,
        uint256 usdAmountInWei
    ) public view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            s_priceFeeds[token]
        );
        (, int256 price, , , ) = priceFeed.latestRoundData();
        // $100e18 USD Debt
        // 1 ETH = 2000 USD
        // The returned value from Chainlink will be 2000 * 1e8
        // Most USD pairs have 8 decimals, so we will just pretend they all do
        return ((usdAmountInWei * PRECISION) /
            (uint256(price) * ADDITIONAL_FEED_PRECISION));
    }

    function getUsdValue(
        address token,
        uint256 amount
    ) public view returns (uint256 amountInUsd) {
        // prettier-ignore
        (,int answer,,,) = AggregatorV3Interface(s_priceFeeds[token]).latestRoundData();
        amountInUsd =
            (uint256(answer) * (ADDITIONAL_FEED_PRECISION) * amount) /
            PRECISION;
        // amountInUsd with precision of 1e18
    }

    function getPrecision() external pure returns (uint256) {
        return PRECISION;
    }

    function getAdditionalFeedPrecision() external pure returns (uint256) {
        return ADDITIONAL_FEED_PRECISION;
    }

    function getLiquidationThreshold() external pure returns (uint256) {
        return LIQUIDATION_THRESHOLD;
    }

    function getLiquidationBonus() external pure returns (uint256) {
        return LIQUIDATION_BONUS;
    }
    function getCollateralDeposit(address token) external view returns(uint256){
        return s_collateralDeposit[msg.sender][token];
    }
    function getLiquidationPrecision() external pure returns (uint256) {
        return LIQUIDATION_PRECISION;
    }

    function getMinHealthFactor() external pure returns (uint256) {
        return MIN_HEALTH_FACTOR;
    }

    function getCollateralTokens() external view returns (address[] memory) {
        return s_collateralTokens;
    }

    function getKaai() external view returns (address) {
        return address(i_kaai);
    }

    function getCollateralTokenPriceFeed(
        address token
    ) external view returns (address) {
        return s_priceFeeds[token];
    }

    function getHealthFactor(address user) external view returns (uint256) {
        return _healthFactor(user);
    }
}
