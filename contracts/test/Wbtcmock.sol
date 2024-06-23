// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// mock class using ERC20
contract WbtcMock is ERC20 {

  constructor(address initialAccount, uint256 initialBalance)ERC20("WBTC","WBTC") {
    _mint(initialAccount, initialBalance);
  }

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }

  function burn(address account, uint256 amount) public {
    _burn(account, amount);
  }
}