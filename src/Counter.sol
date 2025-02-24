// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import {RemoteCounter, crossChainIncrementPromise} from "./interface/async/RemoteCounter.sol";

import "lib/superchain-async/src/AsyncEnabled.sol";

contract Counter is AsyncEnabled {
    uint256 public number;

    event CrossChainIncrementSuccess(uint256 remoteValue);

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }

    // Cross-chain increment function that will be called on the target chain
    function crossChainIncrement() external async returns (uint256) {
        increment();
        return number;
    }

    // Function to initiate cross-chain increment on another chain
    function incrementOnChain(uint256 targetChainId) external {
        // Get the async proxy for this contract on the target chain
        RemoteCounter remote = RemoteCounter(getAsyncProxy(address(this), targetChainId));
        // Call crossChainIncrement on the remote chain and attach the callback
        remote.crossChainIncrement().then(this.handleRemoteIncrement);
    }

    // Callback function that will be called when the remote increment completes
    function handleRemoteIncrement(uint256 newRemoteValue) external {
        emit CrossChainIncrementSuccess(newRemoteValue);
    }
}
