import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
    Deposited,
    LeafInserted,
    OwnershipTransferred,
    PoolDied,
    UserOpSponsoredWithNullifier,
    RevenueWithdrawn,
} from "../generated/OneTimeUsePaymaster/OneTimeUsePaymaster";
import {
    processDeposited,
    processLeafInserted,
    processOwnershipTransferred,
    processPoolDied,
    processRevenueWithdrawn,
    createUserOpSponsoredActivity,
} from "./common-handlers";
import { getOrCreatePaymasterContract, createUserOperation, ZERO_BI, ONE_BI } from "./utils";

const CONTRACT_TYPE = "OneTimeUse";

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

// Contract-specific event handler
export function handleUserOpSponsoredWithNullifier(event: UserOpSponsoredWithNullifier): void {
    let paymaster = getOrCreatePaymasterContract(event.address, CONTRACT_TYPE, event.block, event.transaction);

    log.info("{}: UserOp sponsored with nullifier - sender: {}, userOpHash: {}, actualGasCost: {}, nullifier: {}, network: {}", [
        CONTRACT_TYPE,
        event.params.sender.toHexString(),
        event.params.userOpHash.toHexString(),
        event.params.actualGasCost.toString(),
        event.params.nullifierUsed.toString(),
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

    // Create UserOperation entity with nullifier included
    createUserOperation(
        event.params.userOpHash,
        paymaster,
        event.params.sender,
        event.params.actualGasCost,
        event.params.nullifierUsed, // nullifier available directly from event
        event.block,
        event.transaction
    );

    // For OneTimeUse: the entire joining fee is consumed per operation
    // Update paymaster state
    paymaster.totalDeposit = paymaster.totalDeposit.minus(paymaster.joiningAmount);
    paymaster.lastBlock = event.block.number;
    paymaster.lastTimestamp = event.block.timestamp;
    paymaster.save();
}
