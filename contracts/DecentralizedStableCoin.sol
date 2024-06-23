// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// Layout of Contract:
// version
// imports
// interfaces, libraries, contracts
// errors
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// view & pure functions

/*
 * @title DecentralizedStableCoin
 * @author Akshay
 * This contract is just the ERC20 implementation of our stablecoin system. This contract is governed by KAAIEngine.
 * Minting: Algorithmic
 * Collateral: Exogenous (ETH & BTC)
 */
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DecentralizedStableCoin is ERC20Burnable, Ownable {
    error DecentralizedStableCoin__mustBeAboveZero();
    error DecentralizedStableCoin__burnAmountMustExceedsBalance();
    error DecentralizedStableCoin__zeroAddress();

    constructor() ERC20("DecentralizedStableCoin", "KAAI"){}

    function burn(uint256 _amount) public override onlyOwner {
        uint256 balance = balanceOf(msg.sender);
        if (_amount <= 0) {
            revert DecentralizedStableCoin__mustBeAboveZero();
        }
        if (balance < _amount) {
            revert DecentralizedStableCoin__burnAmountMustExceedsBalance();
        }
        super.burn(_amount);
    }

    function mint(
        address _to,
        uint256 _amount
    ) external onlyOwner returns (bool) {
        if(_to ==address(0)){
            revert DecentralizedStableCoin__zeroAddress();
        }
        if(_amount<=0)
        {
            revert DecentralizedStableCoin__mustBeAboveZero();
        }
        _mint(_to,_amount);
        return true;
    }
}
