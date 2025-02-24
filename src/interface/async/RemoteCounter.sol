// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface crossChainIncrementPromise {
    function then(function(uint256) external) external;
}

interface RemoteCounter {
    function crossChainIncrement() external returns (crossChainIncrementPromise);
}
