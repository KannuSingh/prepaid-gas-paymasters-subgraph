import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
    Deposited,
    LeafInserted,
    OwnershipTransferred,
    PoolDied,
    UserOpSponsored,
    NullifierConsumed,
    RevenueWithdrawn,
} from "../generated/CacheEnabledGasLimitedPaymaster/CacheEnabledGasLimitedPaymaster";
import { UserOperation } from "../generated/schema";
import {
    processDeposited,
    processLeafInserted,
    processOwnershipTransferred,
    processPoolDied,
    processRevenueWithdrawn,
    createUserOpSponsoredActivity,
} from "./common-handlers";
import { getOrCreatePaymasterContract, createUserOperation, generateEntityId, ZERO_BI, ONE_BI } from "./utils";

const CONTRACT_TYPE = "CacheEnabledGasLimited";

// Common event handlers using shared logic
export function handleDeposited(event: Deposited): void {
    processDeposited(event.address, event.params._depositor, event.params._commitment, CONTRACT_TYPE, event.block, event.transaction);
}

export function handleLeafInserted(event: LeafInserted): void {
    processLeafInserted(event.address, event.params._index, event.params._leaf, event.params._root, CONTRACT_TYPE, event.block, event.transaction);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    processOwnershipTransferred(event.address, event.params.previousOwner, event.params.newOwner, CONTRACT_TYPE, event.block, event.transaction);
}

export function handlePoolDied(event: PoolDied): void {
    processPoolDied(event.address, CONTRACT_TYPE, event.block, event.transaction);
}

export function handleRevenueWithdrawn(event: RevenueWithdrawn): void {
    processRevenueWithdrawn(event.address, event.params.withdrawAddress, event.params.amount, CONTRACT_TYPE, event.block, event.transaction);
}

// Contract-specific event handlers
export function handleUserOpSponsored(event: UserOpSponsored): void {
    let paymaster = getOrCreatePaymasterContract(event.address, CONTRACT_TYPE, event.block, event.transaction);

    log.info("{}: UserOp sponsored - sender: {}, userOpHash: {}, actualGasCost: {}, network: {}", [
        CONTRACT_TYPE,
        event.params.sender.toHexString(),
        event.params.userOpHash.toHexString(),
        event.params.actualGasCost.toString(),
        paymaster.network,
    ]);

    // Create USER_OP_SPONSORED activity
    createUserOpSponsoredActivity(
        paymaster,
        event.params.sender,
        event.params.userOpHash,
        event.params.actualGasCost,
        event.block,
        event.transaction
    );

    // Create UserOperation entity (nullifier will be set by NullifierConsumed event)
    createUserOperation(
        event.params.userOpHash,
        paymaster,
        event.params.sender,
        event.params.actualGasCost,
        ZERO_BI, // nullifier placeholder - will be updated by NullifierConsumed
        event.block,
        event.transaction
    );

    // Update paymaster state
    paymaster.totalDeposit = paymaster.totalDeposit.minus(event.params.actualGasCost);
    paymaster.lastBlock = event.block.number;
    paymaster.lastTimestamp = event.block.timestamp;
    paymaster.save();
}

export function handleNullifierConsumed(event: NullifierConsumed): void {
    let paymaster = getOrCreatePaymasterContract(event.address, CONTRACT_TYPE, event.block, event.transaction);

    log.info("{}: Nullifier consumed - userOpHash: {}, nullifier: {}, gasUsed: {}, index: {}, network: {}", [
        CONTRACT_TYPE,
        event.params.userOpHash.toHexString(),
        event.params.nullifier.toString(),
        event.params.gasUsed.toString(),
        event.params.index.toString(),
        paymaster.network,
    ]);

    // Find and update the corresponding UserOperation
    let network = paymaster.network;
    let userOpId = generateEntityId(network, event.params.userOpHash.toHexString());
    let userOp = UserOperation.load(userOpId);

    if (userOp != null) {
        // Update with nullifier information
        userOp.nullifier = event.params.nullifier;
        userOp.save();

        log.info("{}: Updated UserOperation {} with nullifier {}", [
            CONTRACT_TYPE,
            event.params.userOpHash.toHexString(),
            event.params.nullifier.toString(),
        ]);
    } else {
        log.warning("{}: Could not find UserOperation for nullifier consumption - userOpHash: {}", [
            CONTRACT_TYPE,
            event.params.userOpHash.toHexString(),
        ]);
    }

    // Update paymaster timestamps
    paymaster.lastBlock = event.block.number;
    paymaster.lastTimestamp = event.block.timestamp;
    paymaster.save();
}
